import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseDocumentTitle } from '../../components/psemine/pseCore';
import {
  PseButton, PseField, PseInput, PseLoading, PseNotice, PseSection,
} from '../../components/psemine/PseBasics';
import { mapAuthError } from '../../utils/errors';

/**
 * PSEmine authentication — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The designed auth surface (split ledger shell, campaign strip, strength meter)
 * was purged in `refactor(psemine): purge legacy design implementation`. Every
 * behaviour is unchanged: sign-up with a referral code, sign-in, Google sign-in,
 * password reset, email verification with resend cooldown, the explicit
 * entitlement gate (`enablePSEmine`), and the protected route that preserves the
 * intended destination in `returnTo`, requires a verified identity, explains
 * missing product access, and only then applies the onboarding gate.
 */

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

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score <= 25 ? 'Weak' : score <= 50 ? 'Fair' : score <= 75 ? 'Good' : 'Strong';
  }, [password]);

  // Session restore: route completed sessions to their next step. Entitlement is
  // NOT judged here — the protected route owns that decision so a non-enrolled
  // account gets an explanation, not a silent redirect.
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
    <main className="mx-auto w-full max-w-md space-y-6 p-4 py-10 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-text-primary">
          {isSignup ? 'Create your PSEmine account' : 'Sign in to PSEmine'}
        </h1>
        <p className="text-sm text-text-secondary">
          {isSignup
            ? refFromQuery
              ? 'You were invited — the referral code is applied to this account automatically.'
              : 'One account for tools, capacity and settlement.'
            : 'Continue to your mining console.'}
        </p>
        <p className="text-sm">
          <Link to="/mine" className="underline">About PSEmine</Link>
        </p>
      </header>

      {refFromQuery && isSignup && (
        <PseNotice>Referral applied: <span className="font-mono text-xs">{refFromQuery}</span></PseNotice>
      )}
      {formError && <PseNotice tone="danger">{formError}</PseNotice>}

      <PseButton onClick={() => void google()} disabled={googlePending} className="w-full">
        {googlePending ? 'Waiting for Google…' : isSignup ? 'Sign up with Google' : 'Sign in with Google'}
      </PseButton>
      <p className="text-xs text-text-tertiary">
        {isSignup
          ? 'Google accounts skip the password and email-verification steps. Existing accounts keep their current access.'
          : 'Use the same Google identity you signed up with — no second account is created.'}
      </p>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {isSignup && (
          <PseField label="Display name" hint="Shown to referrals" htmlFor="pse-signup-username">
            <PseInput
              id="pse-signup-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="How you'll appear"
              autoComplete="nickname"
              required
            />
          </PseField>
        )}
        <PseField label="Email" htmlFor="pse-auth-email">
          <PseInput
            id="pse-auth-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </PseField>
        <PseField label="Password" hint={isSignup ? 'Minimum 8 characters' : undefined} htmlFor="pse-auth-password">
          <PseInput
            id="pse-auth-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            required
            minLength={8}
          />
        </PseField>

        {isSignup && password.length > 0 && (
          <p className="text-xs text-text-tertiary" aria-live="polite">Password strength: {strength}</p>
        )}

        {!isSignup && (
          <p className="text-sm">
            <Link to="/mine/forgot-password" className="underline">Forgot password?</Link>
          </p>
        )}

        <PseButton type="submit" disabled={pending} className="w-full">
          {pending ? 'Working…' : isSignup ? 'Create account' : 'Sign in'}
        </PseButton>
      </form>

      <p className="text-sm text-text-secondary">
        {isSignup ? 'Already have an account? ' : 'New to PSEmine? '}
        <Link to={isSignup ? '/mine/login' : '/mine/signup'} className="underline">
          {isSignup ? 'Sign in' : 'Create account'}
        </Link>
      </p>

      {isSignup && (
        <p className="text-xs text-text-tertiary">
          By creating an account you agree to the <Link to="/terms" className="underline">Terms</Link> and{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>. PSEmine is a separate product from
          PulseEarn: the account is shared, the product access is not.
        </p>
      )}
    </main>
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
    <main className="mx-auto w-full max-w-md space-y-6 p-4 py-10 sm:p-6">
      <h1 className="text-xl font-semibold text-text-primary">Reset your password</h1>
      <p className="text-sm text-text-secondary">We&apos;ll email a secure reset link to your account address.</p>

      {sent ? (
        <PseSection title="Check your inbox">
          <p className="text-sm text-text-secondary">
            A reset link was sent to <span className="font-mono text-xs">{email}</span>. It expires shortly, so use it soon.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/mine/login" className="text-sm underline">Back to sign in</Link>
            <PseButton onClick={() => setSent(false)}>Use a different email</PseButton>
          </div>
        </PseSection>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <PseNotice tone="danger">{error}</PseNotice>}
          <PseField label="Email" htmlFor="pse-reset-email">
            <PseInput
              id="pse-reset-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </PseField>
          <PseButton type="submit" disabled={pending} className="w-full">
            {pending ? 'Sending…' : 'Send reset link'}
          </PseButton>
          <p className="text-sm"><Link to="/mine/login" className="underline">Back to sign in</Link></p>
        </form>
      )}
    </main>
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
    <main className="mx-auto w-full max-w-md space-y-6 p-4 py-10 sm:p-6">
      <h1 className="text-xl font-semibold text-text-primary">Verify your email</h1>
      <p className="text-sm text-text-secondary">
        We sent a verification link to <span className="font-mono text-xs">{currentUser.email}</span>. Open it, then
        return here — this page advances automatically once the identity is verified.
      </p>

      <PseSection title="If nothing happened">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-text-secondary">
          <li>Open the email and click the verification link.</li>
          <li>Return to this page.</li>
          <li>Re-check below, or resend the verification email.</li>
        </ol>
      </PseSection>

      {error ? <PseNotice tone="danger">{error}</PseNotice> : notice ? <PseNotice>{notice}</PseNotice> : null}

      <div className="flex flex-wrap gap-2">
        <PseButton onClick={() => void resend()} disabled={pending || cooldown > 0}>
          {pending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
        </PseButton>
        <PseButton onClick={() => window.location.reload()}>I&apos;ve verified my email</PseButton>
        <PseButton onClick={async () => { await logout(); navigate('/mine/login', { replace: true }); }}>Sign out</PseButton>
      </div>
    </main>
  );
};

/* ═══════════════════ ENTITLEMENT GATE ═══════════════════ */

/**
 * "PSEmine isn't enabled for this account" — a REAL product state, not an error.
 * It is deliberately distinct from authentication failure, backend failure,
 * network failure and a temporary outage: nothing has failed and nothing was
 * unreachable. Product access is explicit.
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
    <main className="mx-auto w-full max-w-lg space-y-5 p-4 py-14 sm:p-6">
      <h1 className="text-xl font-semibold text-text-primary">PSEmine isn&apos;t enabled for this account</h1>
      <p className="text-sm text-text-secondary">
        Signed in as <span className="font-mono text-xs">{currentUser?.email}</span>. PSEmine and PulseEarn share one
        sign-in identity but are separate products, and product access is explicit. This account does not currently
        have PSEmine access.
        {userData?.productAccess?.pulseearn ? ' It is enrolled in PulseEarn only.' : ' No product is currently enrolled on it.'}
      </p>

      {error && <PseNotice tone="danger">{error}</PseNotice>}

      <PseSection title="Enabling PSEmine">
        <p className="text-sm text-text-secondary">
          Enabling creates your PSEmine mining account on this identity (zeroed balances, no purchases, no charges) and
          records an audit entry. The backend grants access — the app cannot grant it by itself.
        </p>
        <div className="flex flex-wrap gap-2">
          <PseButton onClick={() => void enable()} disabled={pending}>{pending ? 'Working…' : 'Enable PSEmine for this account'}</PseButton>
          <PseButton onClick={() => void other()}>Use another account</PseButton>
        </div>
      </PseSection>

      <p className="text-sm">
        <Link to="/mine/guide" className="underline">Read how PSEmine works</Link> ·{' '}
        <Link to="/help" className="underline">Contact support</Link>
      </p>
    </main>
  );
};

/* ═══════════════════ PROTECTED ROUTE GATE ═══════════════════ */
export const PSEmineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading, isVerified, hasPSEmineAccess } = usePSEMineAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseLoading label="Restoring secure session" />
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
