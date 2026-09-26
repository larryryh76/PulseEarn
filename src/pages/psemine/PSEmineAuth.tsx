import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseDocumentTitle } from '../../components/psemine/pse';
import { PSELogo } from '../../components/psemine/PSEBrand';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour } from '../../components/psemine/pse';
import { mapAuthError } from '../../utils/errors';

/** Campaign facts shown on signup. */
const CampaignLedgerStrip: React.FC = () => {
  const tools = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <section aria-labelledby="campaign-schedule-heading">
      <h2 id="campaign-schedule-heading">Campaign schedule</h2>
      <dl>
        <div><dt>Duration</dt><dd>{PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days</dd></div>
        <div><dt>Accounting</dt><dd>GBP — fixed hourly rates</dd></div>
        <div><dt>Payment</dt><dd>BNB · BNB Smart Chain</dd></div>
        <div><dt>Peak capacity</dt><dd>{gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}</dd></div>
      </dl>
      <h3>Tools from</h3>
      <ul>
        {tools.slice(0, 3).map(t => (
          <li key={t.id}>{t.name} · {gbp(t.purchasePriceGBP)} · {gbpHour(t.hourlyRateGBP).replace('/hour', '/hr')}</li>
        ))}
      </ul>
    </section>
  );
};

const AuthShell: React.FC<{ children: React.ReactNode; quote: string; points: string[]; showLedger?: boolean }> = ({
  children, quote, points, showLedger,
}) => (
  <main>
    <aside aria-label="PSEmine campaign information">
      <Link to="/mine" aria-label="PSEmine home"><PSELogo size={32} withWordmark /></Link>
      <p>{quote}</p>
      <ul>
        {points.map(p => <li key={p}>{p}</li>)}
      </ul>
      {showLedger && <CampaignLedgerStrip />}
      <p>90-day campaign · GBP accounting · BNB Smart Chain settlement</p>
    </aside>
    <section aria-label="Account access">
      {children}
    </section>
  </main>
);

function PasswordInput({ id, value, onChange, placeholder, autoComplete, minLength = 8 }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? 'Hide password' : 'Show password'}
      </button>
    </>
  );
}

function SubmitBtn({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Please wait…' : label}
    </button>
  );
}

function GoogleBtn({ pending, label, onClick }: { pending: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={pending}>
      {pending ? 'Please wait…' : label}
    </button>
  );
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert">{message}</p>;
}

function FormSuccess({ message }: { message: string }) {
  return <p role="status">{message}</p>;
}

function Divider({ label }: { label?: string }) {
  return (
    <div>
      <hr />
      {label && <p>{label}</p>}
    </div>
  );
}

/** Password strength is informational; the server still enforces its own rules. */
function strengthOf(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (/[A-Z]/.test(pw)) score += 25;
  if (/[0-9]/.test(pw)) score += 25;
  if (/[^A-Za-z0-9]/.test(pw)) score += 25;
  if (score <= 25) return { score, label: 'Weak' };
  if (score <= 50) return { score, label: 'Fair' };
  if (score <= 75) return { score, label: 'Good' };
  return { score, label: 'Strong' };
}

export const PSEmineAuth: React.FC<{ mode?: 'login' | 'signup' }> = ({ mode = 'login' }) => {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, signInWithGoogle, currentUser, isVerified, userData } = usePSEMineAuth();

  usePseDocumentTitle(isSignup ? 'Create account' : 'Sign in');

  const params = new URLSearchParams(location.search);
  const refFromQuery = params.get('ref') || undefined;
  const returnTo = params.get('returnTo') || undefined;

  const strength = useMemo(() => strengthOf(password), [password]);

  useEffect(() => {
    if (!currentUser) return;
    if (!isVerified) { navigate('/mine/verify-email', { replace: true }); return; }
    const entitlemented = userData?.productAccess?.psemine === true;
    if (entitlemented && userData?.onboardingCompleted === false) {
      navigate('/mine/guide/onboarding', { replace: true });
      return;
    }
    navigate(returnTo || '/mine/dashboard', { replace: true });
  }, [currentUser, isVerified, userData, navigate, returnTo]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (isSignup && username.trim().length < 2) { setFormError('Choose a display name (2+ characters).'); return; }
    if (password.length < 8) { setFormError('Password must be at least 8 characters.'); return; }
    setPending(true);
    try {
      if (isSignup) await signup(email.trim(), password, username.trim(), refFromQuery);
      else await login(email.trim(), password);
    } catch (error) {
      setFormError(mapAuthError(error));
    } finally { setPending(false); }
  };

  const google = async () => {
    setFormError(null);
    setGooglePending(true);
    try {
      await signInWithGoogle(refFromQuery);
    } catch (error: unknown) {
      const code = (error as { code?: string } | null)?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      setFormError(mapAuthError(error));
    } finally { setGooglePending(false); }
  };

  return (
    <AuthShell
      showLedger={isSignup}
      quote="A quieter way to build earning capacity."
      points={[
        '90-day campaign with GBP-denominated capacity',
        'On-chain payment verification on BNB Smart Chain',
        'Ledger-backed balances settled after the campaign ends',
      ]}
    >
      <p>{isSignup ? 'Create your PSEmine account' : 'Welcome back'}</p>
      <h1>{isSignup ? 'Start your campaign' : 'Sign in to PSEmine'}</h1>
      <p>
        {isSignup
          ? refFromQuery
            ? 'You were invited — the referral code is applied to this account automatically.'
            : 'One account for tools, capacity, and settlement.'
          : 'Continue to your mining console.'}
      </p>

      {refFromQuery && isSignup && (
        <p>Referral applied: <code>{refFromQuery}</code></p>
      )}

      {formError && <FormError message={formError} />}

      <section>
        <GoogleBtn
          pending={googlePending}
          label={isSignup ? 'Sign up with Google' : 'Sign in with Google'}
          onClick={() => void google()}
        />
        <p>
          {isSignup
            ? 'Google accounts skip the password and email-verification steps. Existing accounts keep their current access.'
            : 'Use the same Google identity you signed up with — no second account is created.'}
        </p>
      </section>

      <Divider label="or use email" />

      <form onSubmit={submit} noValidate>
        {isSignup && (
          <label htmlFor="signup-display-name">
            Display name — shown to referrals
            <input id="signup-display-name" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="How you'll appear" autoComplete="nickname" required />
          </label>
        )}
        <label htmlFor="auth-email">
          Email
          <input id="auth-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" required />
        </label>
        <div>
          <label htmlFor="auth-password">
            Password{isSignup ? ' — minimum 8 characters' : ''}
          </label>
          <PasswordInput id="auth-password" value={password} onChange={setPassword}
            autoComplete={isSignup ? 'new-password' : 'current-password'} />
        </div>

        {isSignup && password.length > 0 && (
          <div aria-live="polite">
            <p>Password strength: {strength.label}</p>
          </div>
        )}

        {!isSignup && <p><Link to="/mine/forgot-password">Forgot password?</Link></p>}
        <SubmitBtn pending={pending} label={isSignup ? 'Create account' : 'Sign in'} />
      </form>

      <p>
        {isSignup ? 'Already have an account?' : 'New to PSEmine?'}{' '}
        <Link to={isSignup ? '/mine/login' : '/mine/signup'}>
          {isSignup ? 'Sign in' : 'Create account'}
        </Link>
      </p>

      {isSignup && (
        <p>
          By creating an account you agree to the <Link to="/terms">Terms</Link>
          {' '}and <Link to="/privacy">Privacy Policy</Link>.
          PSEmine is a separate product from PulseEarn; this account is shared, the product access is not.
        </p>
      )}

      <p>Secured authentication · your session stays on this device</p>
    </AuthShell>
  );
};

export const PSEmineForgotPassword: React.FC = () => {
  usePseDocumentTitle('Reset password');
  const { resetPassword } = usePSEMineAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try { await resetPassword(email.trim()); setSent(true); }
    catch (err) { setError(mapAuthError(err)); }
    finally { setPending(false); }
  };

  return (
    <AuthShell
      quote="Account recovery, handled carefully."
      points={['Reset links are single-use and expire', 'Your balances and tools are untouched by a reset']}
    >
      <p>Account recovery</p>
      <h1>Reset your password</h1>
      <p>We’ll email a secure reset link to your account address.</p>

      {sent ? (
        <section aria-labelledby="reset-sent-heading">
          <h2 id="reset-sent-heading">Check your inbox</h2>
          <p>
            A reset link was sent to <strong>{email}</strong>.
            It expires shortly, so use it soon.
          </p>
          <p><Link to="/mine/login">Back to sign in</Link></p>
          <button type="button" onClick={() => setSent(false)}>Use a different email</button>
        </section>
      ) : (
        <form onSubmit={submit}>
          {error && <FormError message={error} />}
          <label htmlFor="reset-email">
            Email
            <input id="reset-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" />
          </label>
          <SubmitBtn pending={pending} label="Send reset link" />
          <p><Link to="/mine/login">Back to sign in</Link></p>
        </form>
      )}
    </AuthShell>
  );
};

export const PSEmineVerifyEmail: React.FC = () => {
  usePseDocumentTitle('Verify email');
  const { currentUser, isVerified, sendVerification, logout } = usePSEMineAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVerified) navigate('/mine/guide', { replace: true });
  }, [isVerified, navigate]);

  const resend = async () => {
    setPending(true);
    setError(null);
    try {
      await sendVerification();
      setResentAt(Date.now());
      setNotice('Verification email sent.');
    } catch (err) {
      setError(mapAuthError(err));
    } finally { setPending(false); }
  };

  if (!currentUser) return <Navigate to="/mine/login" replace />;

  const cooldown = resentAt ? Math.max(0, 45 - Math.floor((Date.now() - resentAt) / 1000)) : 0;

  return (
    <AuthShell
      quote="One quick check before the console opens."
      points={['Verification protects balances and payouts', 'Payouts require a verified email — enforced server-side']}
    >
      <p>Secure account setup</p>
      <h1>Verify your email</h1>
      <p>We sent a verification link to <strong>{currentUser.email}</strong>. Open it, then return here.</p>

      <section aria-labelledby="verification-steps-heading">
        <h2 id="verification-steps-heading">Three steps</h2>
        <ol>
          <li>Open the email and click the verification link.</li>
          <li>Return to this page — it advances automatically.</li>
          <li>Nothing happened? Re-check below.</li>
        </ol>
      </section>

      {(notice || error) && (error ? <FormError message={error} /> : <FormSuccess message={notice || ''} />)}

      <div>
        <button type="button" disabled={pending || cooldown > 0} onClick={() => void resend()}>
          {pending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
        </button>
        <button type="button" onClick={() => window.location.reload()}>I’ve verified my email</button>
      </div>

      <button
        type="button"
        onClick={async () => { await logout(); navigate('/mine/login', { replace: true }); }}
      >
        Sign out
      </button>
    </AuthShell>
  );
};

/** Separate-product access explanation and account enrollment actions. */
const PSEmineAccessGate: React.FC = () => {
  const { userData, currentUser, enablePSEmine, logout } = usePSEMineAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enable = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await enablePSEmine();
      if (!res.success) setError(res.message || 'PSEmine could not be enabled for this account.');
    } finally { setPending(false); }
  };

  const other = async () => {
    await logout();
    navigate('/mine/login', { replace: true });
  };

  return (
    <main>
      <Link to="/mine" aria-label="PSEmine home"><PSELogo size={32} withWordmark /></Link>
      <section aria-labelledby="access-gate-heading">
        <h1 id="access-gate-heading">PSEmine isn’t enabled for this account</h1>
        <p>Signed in as {currentUser?.email}</p>

        <p>
          PSEmine and PulseEarn share one sign-in identity but are separate products, and product access is
          explicit. This account does not currently have PSEmine access.
          {userData?.productAccess?.pulseearn ? ' It is enrolled in PulseEarn only.' : ' No product is currently enrolled on it.'}
        </p>

        {error && <FormError message={error} />}

        <section>
          <h2>Enabling PSEmine</h2>
          <p>
            Enabling creates your PSEmine mining account on this identity (zeroed balances, no purchases, no
            charges) and records an audit entry. The backend grants access — the app cannot grant it by itself.
          </p>
        </section>

        <button type="button" onClick={() => void enable()} disabled={pending}>
          {pending ? 'Please wait…' : 'Enable PSEmine for this account'}
        </button>
        <button type="button" onClick={() => void other()}>Use another account</button>

        <p><Link to="/mine/guide">Read how PSEmine works</Link></p>
        <p><Link to="/help">Contact support</Link></p>
      </section>
    </main>
  );
};

export const PSEmineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading, isVerified, hasPSEmineAccess } = usePSEMineAuth();
  const location = useLocation();

  if (loading) {
    return <main><p role="status" aria-live="polite">Restoring secure session</p></main>;
  }

  if (!currentUser) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/mine/login?returnTo=${returnTo}`} replace />;
  }

  if (!isVerified) return <Navigate to="/mine/verify-email" replace />;

  if (!hasPSEmineAccess) return <PSEmineAccessGate />;

  const onboardingPath = location.pathname === '/mine/guide/onboarding';
  if (userData && userData.onboardingCompleted === false && !onboardingPath) {
    return <Navigate to="/mine/guide/onboarding" replace />;
  }

  return <>{children}</>;
};

export default PSEmineAuth;
