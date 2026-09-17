import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, User as UserIcon, RefreshCcw,
  LogOut, CheckCircle2, AlertTriangle, ShieldX, LifeBuoy, KeyRound, Wand2,
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSELogo, Field, PSELoading, usePseDocumentTitle } from '../../components/psemine/pse';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour } from '../../components/psemine/pse';
import { mapAuthError } from '../../utils/errors';
import { cn } from '../../utils';

/** Official Google "G" mark (brand-accurate, four-color). */
const GoogleG: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
    <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
  </svg>
);

const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn('h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white', className)} />
);

/* ═══════════════════ Shared auth shell ═══════════════════ */

/** Ledger strip: the campaign facts, in the same visual language as the console. */
const CampaignLedgerStrip: React.FC = () => {
  const tools = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <div className="pse-card overflow-hidden">
      <div className="border-b px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
        <p className="pse-eyebrow">Campaign schedule</p>
      </div>
      <dl className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
        {[
          ['Duration', `${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} days`],
          ['Accounting', 'GBP — fixed hourly rates'],
          ['Payment', 'BNB · BNB Smart Chain'],
          ['Peak capacity', gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-5 py-2.5">
            <dt className="pse-micro">{k}</dt>
            <dd className="pse-caption pse-num font-semibold" style={{ color: 'var(--pse-text)' }}>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
        <p className="pse-eyebrow mb-2">Tools from</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {tools.slice(0, 3).map(t => (
            <span key={t.id} className="pse-micro">
              {t.name} · <span className="pse-num" style={{ color: 'var(--pse-blue)' }}>{gbp(t.purchasePriceGBP)}</span>
              {' · '}<span className="pse-num">{gbpHour(t.hourlyRateGBP).replace('/hour', '/hr')}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const AuthShell: React.FC<{ children: React.ReactNode; quote: string; points: string[]; showLedger?: boolean }> = ({
  children, quote, points, showLedger,
}) => (
  <main className="pse-scope flex min-h-screen" style={{ background: 'var(--pse-bg)' }}>
    <aside className="hidden lg:flex lg:w-[44%] lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:p-12"
      style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
      <Link to="/mine" aria-label="PSEmine home"><PSELogo size={34} withWordmark /></Link>
      <div className="max-w-sm">
        <p className="pse-lead font-medium" style={{ color: 'var(--pse-text)' }}>{quote}</p>
        <ul className="mt-7 space-y-3">
          {points.map(p => (
            <li key={p} className="flex items-start gap-2.5 pse-caption">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
              {p}
            </li>
          ))}
        </ul>
        {showLedger && <div className="mt-8"><CampaignLedgerStrip /></div>}
      </div>
      <p className="pse-micro">90-day campaign · GBP accounting · BNB Smart Chain settlement</p>
    </aside>
    <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  </main>
);

function PasswordInput({ value, onChange, placeholder, autoComplete, minLength = 8 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="pse-input pl-10 pr-11"
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg"
        style={{ color: 'var(--pse-text-3)' }}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function SubmitBtn({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" disabled={pending} className="pse-btn pse-btn-primary w-full justify-center py-3">
      {pending ? <Spinner /> : <>{label} <ArrowRight size={14} /></>}
    </button>
  );
}

function GoogleBtn({ pending, label, onClick }: { pending: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={pending}
      className="pse-btn pse-btn-secondary w-full justify-center gap-2.5 py-3"
      style={{ background: 'var(--pse-inset, #12161d)' }}>
      {pending ? <Spinner /> : <><GoogleG size={16} /> {label}</>}
    </button>
  );
}

/** Inline, role-announced error line (no dialog, no layout jump). */
function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border px-3.5 py-2.5"
      style={{ borderColor: 'rgba(240,68,56,0.35)', background: 'rgba(240,68,56,0.08)' }}>
      <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-danger)' }} />
      <p className="pse-caption" style={{ color: 'var(--pse-danger)' }}>{message}</p>
    </div>
  );
}

/** Inline success line (used by recovery/verification flows). */
function FormSuccess({ message }: { message: string }) {
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border px-3.5 py-2.5"
      style={{ borderColor: 'rgba(46,206,132,0.32)', background: 'rgba(46,206,132,0.08)' }}>
      <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
      <p className="pse-caption" style={{ color: 'var(--pse-success)' }}>{message}</p>
    </div>
  );
}

function Divider({ label }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1" style={{ background: 'var(--pse-line)' }} />
      {label && <span className="pse-micro" style={{ color: 'var(--pse-text-3)' }}>{label}</span>}
      <span className="h-px flex-1" style={{ background: 'var(--pse-line)' }} />
    </div>
  );
}

/** Password strength — informational only; the server still enforces its own rules. */
function strengthOf(pw: string): { score: number; label: string; tone: string } {
  let score = 0;
  if (pw.length >= 8) score += 25;
  if (/[A-Z]/.test(pw)) score += 25;
  if (/[0-9]/.test(pw)) score += 25;
  if (/[^A-Za-z0-9]/.test(pw)) score += 25;
  if (score <= 25) return { score, label: 'Weak', tone: 'var(--pse-danger)' };
  if (score <= 50) return { score, label: 'Fair', tone: 'var(--pse-warning)' };
  if (score <= 75) return { score, label: 'Good', tone: 'var(--pse-blue)' };
  return { score, label: 'Strong', tone: 'var(--pse-success)' };
}

/* ═══════════════════ LOGIN / SIGNUP ═══════════════════ */
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

  // PSEmine owns the document title on its own auth routes too (they render
  // outside PSEMineShell, which sets it for the rest of the product).
  usePseDocumentTitle(isSignup ? 'Create account' : 'Sign in');

  const params = new URLSearchParams(location.search);
  const refFromQuery = params.get('ref') || undefined;
  const returnTo = params.get('returnTo') || undefined;

  const strength = useMemo(() => strengthOf(password), [password]);

  // Session restore: route completed sessions to their next step. Entitlement
  // is NOT judged here — the protected route owns that decision so a
  // non-enrolled account gets an explanation, not a silent redirect.
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
      // Navigation happens in the session-restore effect above.
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
      // A closed popup is a normal dismissal — not an error state.
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
      <div className="mb-8 lg:hidden"><PSELogo size={34} withWordmark /></div>
      <p className="pse-eyebrow">{isSignup ? 'Create your PSEmine account' : 'Welcome back'}</p>
      <h1 className="pse-h2 mt-2">{isSignup ? 'Start your campaign' : 'Sign in to PSEmine'}</h1>
      <p className="pse-caption mt-2">
        {isSignup
          ? refFromQuery
            ? 'You were invited — the referral code is applied to this account automatically.'
            : 'One account for tools, capacity, and settlement.'
          : 'Continue to your mining console.'}
      </p>

      {refFromQuery && isSignup && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border px-3.5 py-2.5"
          style={{ borderColor: 'rgba(139,124,246,0.32)', background: 'rgba(139,124,246,0.08)' }}>
          <Wand2 size={14} style={{ color: 'var(--pse-purple)' }} />
          <p className="pse-micro" style={{ color: 'var(--pse-purple)' }}>
            Referral applied: <span className="pse-mono">{refFromQuery}</span>
          </p>
        </div>
      )}

      {formError && <div className="mt-4"><FormError message={formError} /></div>}

      <div className="mt-6">
        <GoogleBtn
          pending={googlePending}
          label={isSignup ? 'Sign up with Google' : 'Sign in with Google'}
          onClick={() => void google()}
        />
        <p className="pse-micro mt-2">
          {isSignup
            ? 'Google accounts skip the password and email-verification steps. Existing accounts keep their current access.'
            : 'Use the same Google identity you signed up with — no second account is created.'}
        </p>
      </div>

      <Divider label="or use email" />

      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {isSignup && (
          <Field label="Display name" hint="Shown to referrals">
            <div className="relative">
              <UserIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
              <input value={username} onChange={e => setUsername(e.target.value)} className="pse-input pl-10"
                placeholder="How you'll appear" autoComplete="nickname" required />
            </div>
          </Field>
        )}
        <Field label="Email">
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="pse-input pl-10"
              placeholder="you@example.com" autoComplete="email" required />
          </div>
        </Field>
        <Field label="Password" hint={isSignup ? 'Minimum 8 characters' : undefined}>
          <PasswordInput value={password} onChange={setPassword}
            autoComplete={isSignup ? 'new-password' : 'current-password'} />
        </Field>

        {isSignup && password.length > 0 && (
          <div aria-live="polite">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="pse-micro">Password strength</span>
              <span className="pse-micro font-semibold" style={{ color: strength.tone }}>{strength.label}</span>
            </div>
            <div className="pse-meter">
              <div className="pse-meter-fill" style={{ width: `${Math.max(8, strength.score)}%`, background: strength.tone }} />
            </div>
          </div>
        )}

        {!isSignup && (
          <div className="flex justify-end">
            <Link to="/mine/forgot-password" className="pse-caption font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
              Forgot password?
            </Link>
          </div>
        )}
        <SubmitBtn pending={pending} label={isSignup ? 'Create account' : 'Sign in'} />
      </form>

      <div className="mt-7 flex items-center justify-between border-t pt-6" style={{ borderColor: 'var(--pse-line)' }}>
        <span className="pse-caption">{isSignup ? 'Already have an account?' : 'New to PSEmine?'}</span>
        <Link className="pse-caption font-semibold hover:underline" style={{ color: 'var(--pse-blue)' }}
          to={isSignup ? '/mine/login' : '/mine/signup'}>
          {isSignup ? 'Sign in' : 'Create account'}
        </Link>
      </div>

      {isSignup && (
        <p className="pse-micro mt-5">
          By creating an account you agree to the <Link to="/terms" className="underline hover:text-[#F2F4F7]">Terms</Link>
          {' '}and <Link to="/privacy" className="underline hover:text-[#F2F4F7]">Privacy Policy</Link>.
          PSEmine is a separate product from PulseEarn; this account is shared, the product access is not.
        </p>
      )}

      <div className="mt-6 flex items-center gap-2 pse-micro">
        <ShieldCheck size={14} style={{ color: 'var(--pse-cyan)' }} />
        Secured authentication · your session stays on this device
      </div>
    </AuthShell>
  );
};

/* ═══════════════════ FORGOT PASSWORD ═══════════════════ */
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
      <div className="mb-8 lg:hidden"><PSELogo size={34} withWordmark /></div>
      <p className="pse-eyebrow">Account recovery</p>
      <h1 className="pse-h2 mt-2">Reset your password</h1>
      <p className="pse-caption mt-2">We&apos;ll email a secure reset link to your account address.</p>

      {sent ? (
        <div className="pse-card mt-7 p-6 text-center">
          <CheckCircle2 size={22} className="mx-auto" style={{ color: 'var(--pse-success)' }} />
          <p className="pse-h3 mt-3">Check your inbox</p>
          <p className="pse-caption mt-1.5">
            A reset link was sent to <span className="font-medium" style={{ color: 'var(--pse-text)' }}>{email}</span>.
            It expires shortly, so use it soon.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Link to="/mine/login" className="pse-btn pse-btn-secondary pse-btn-sm justify-center">Back to sign in</Link>
            <button type="button" onClick={() => setSent(false)} className="pse-btn pse-btn-ghost pse-btn-sm justify-center">
              Use a different email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
          {error && <FormError message={error} />}
          <Field label="Email">
            <div className="relative">
              <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="pse-input pl-10" placeholder="you@example.com" autoComplete="email" />
            </div>
          </Field>
          <SubmitBtn pending={pending} label="Send reset link" />
          <Link to="/mine/login" className="pse-caption text-center font-medium hover:underline" style={{ color: 'var(--pse-text-2)' }}>
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
};

/* ═══════════════════ VERIFY EMAIL ═══════════════════ */
export const PSEmineVerifyEmail: React.FC = () => {
  usePseDocumentTitle('Verify email');
  const { currentUser, isVerified, sendVerification, logout } = usePSEMineAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-advance once Firebase reports the verified flag.
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
      <div className="mb-8 lg:hidden"><PSELogo size={34} withWordmark /></div>
      <p className="pse-eyebrow">Secure account setup</p>
      <h1 className="pse-h2 mt-2">Verify your email</h1>
      <p className="pse-caption mt-2">
        We sent a verification link to <span className="font-medium" style={{ color: 'var(--pse-text)' }}>{currentUser.email}</span>.
        Open it, then return here.
      </p>

      <div className="pse-card mt-7 p-5">
        <p className="pse-eyebrow mb-3">Three steps</p>
        <ol className="space-y-3">
          {[
            'Open the email and click the verification link.',
            'Return to this page — it advances automatically.',
            'Nothing happened? Re-check below.',
          ].map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span className={cn('pse-step', i === 0 ? 'pse-step-active' : '')}>{i + 1}</span>
              <p className="pse-caption">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {(notice || error) && (
        <div className="mt-4">{error ? <FormError message={error} /> : <FormSuccess message={notice || ''} />}</div>
      )}

      <div className="mt-5 flex flex-col gap-3">
        <button type="button" disabled={pending || cooldown > 0} onClick={() => void resend()}
          className="pse-btn pse-btn-secondary w-full justify-center py-3">
          <RefreshCcw size={14} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
        </button>
        <button type="button" onClick={() => window.location.reload()} className="pse-btn pse-btn-primary w-full justify-center py-3">
          <CheckCircle2 size={14} /> I&apos;ve verified my email
        </button>
      </div>

      <button
        type="button"
        onClick={async () => { await logout(); navigate('/mine/login', { replace: true }); }}
        className="mt-7 flex items-center gap-2 pse-caption font-medium hover:underline"
        style={{ color: 'var(--pse-text-2)' }}
      >
        <LogOut size={13} /> Sign out
      </button>
    </AuthShell>
  );
};

/* ═══════════════════ ENTITLEMENT GATE ═══════════════════ */

/**
 * "PSEmine isn't enabled for this account" — a REAL product state, not an
 * error. It is deliberately distinct from:
 *   • authentication failure  → the user is signed in, verified, and identified
 *   • backend failure         → no backend call has failed
 *   • network failure         → nothing was unreachable
 *   • temporary outage        → nothing is transient here
 *
 * Product access is explicit: this account was created for PulseEarn (or was
 * never enrolled). The user can enable PSEmine for THIS account, sign in with
 * the enrolled account, or contact support.
 */
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
      // On success the identities listener updates productAccess and this gate
      // re-renders straight into the console — no reload, no second account.
    } finally { setPending(false); }
  };

  const other = async () => {
    await logout();
    navigate('/mine/login', { replace: true });
  };

  return (
    <div className="pse-scope flex min-h-screen items-center justify-center px-5 py-14" style={{ background: 'var(--pse-bg)' }}>
      <div className="w-full max-w-lg">
        <Link to="/mine" className="mb-8 inline-flex"><PSELogo size={32} withWordmark /></Link>
        <div className="pse-card overflow-hidden">
          <div className="flex items-start gap-3.5 border-b px-6 py-5" style={{ borderColor: 'var(--pse-line)' }}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
              style={{ borderColor: 'rgba(139,124,246,0.32)', background: 'rgba(139,124,246,0.10)' }}>
              <ShieldX size={19} style={{ color: 'var(--pse-purple)' }} />
            </div>
            <div>
              <h1 className="pse-h3">PSEmine isn&apos;t enabled for this account</h1>
              <p className="pse-micro mt-1">
                Signed in as <span style={{ color: 'var(--pse-text-2)' }}>{currentUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            <p className="pse-caption">
              PSEmine and PulseEarn share one sign-in identity but are separate products, and product access is
              explicit. This account does not currently have PSEmine access.
              {userData?.productAccess?.pulseearn ? ' It is enrolled in PulseEarn only.' : ' No product is currently enrolled on it.'}
            </p>

            {error && <FormError message={error} />}

            <div className="pse-inset p-3.5">
              <p className="pse-eyebrow">Enabling PSEmine</p>
              <p className="pse-micro mt-1.5">
                Enabling creates your PSEmine mining account on this identity (zeroed balances, no purchases, no
                charges) and records an audit entry. The backend grants access — the app cannot grant it by itself.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={() => void enable()} disabled={pending} className="pse-btn pse-btn-primary flex-1 justify-center py-3">
                {pending ? <Spinner /> : <>Enable PSEmine for this account <ArrowRight size={14} /></>}
              </button>
              <button type="button" onClick={() => void other()} className="pse-btn pse-btn-secondary justify-center py-3">
                Use another account
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--pse-line)' }}>
              <Link to="/mine/guide" className="pse-micro inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--pse-blue)' }}>
                <KeyRound size={12} /> Read how PSEmine works
              </Link>
              <Link to="/help" className="pse-micro inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--pse-text-2)' }}>
                <LifeBuoy size={12} /> Contact support
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════ PROTECTED ROUTE GATE ═══════════════════ */
export const PSEmineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading, isVerified, hasPSEmineAccess } = usePSEMineAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="pse-scope" style={{ background: 'var(--pse-bg)' }}>
        <div className="pse-section pt-6 md:pt-8">
          <PSELoading skeleton label="Restoring secure session" />
        </div>
      </div>
    );
  }

  // 1. Not signed in → sign in, preserving the intended destination.
  if (!currentUser) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/mine/login?returnTo=${returnTo}`} replace />;
  }

  // 2. Identity exists but is unverified → verification step.
  if (!isVerified) return <Navigate to="/mine/verify-email" replace />;

  // 3. Signed in, verified, NOT enrolled → explain entitlement (never a 500).
  //    This check runs before onboarding so a PulseEarn-only account is never
  //    pushed through PSEmine onboarding.
  if (!hasPSEmineAccess) return <PSEmineAccessGate />;

  // 4. Enrolled → onboarding gate.
  const onboardingPath = location.pathname === '/mine/guide/onboarding';
  if (userData && userData.onboardingCompleted === false && !onboardingPath) {
    return <Navigate to="/mine/guide/onboarding" replace />;
  }

  return <>{children}</>;
};

export default PSEmineAuth;
