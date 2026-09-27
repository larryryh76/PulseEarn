import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PseAuthFrame } from '../../components/psemine/PseAuthFrame';
import { PseLoader } from '../../components/psemine/PseLoader';
import { mapAuthError } from '../../utils/errors';

/**
 * PSEmine authentication — the product's sign-in family.
 *
 * One frame (PseAuthFrame) for sign in, sign up, password reset, email
 * verification and the access gate, so the surfaces read as one product. Every
 * behaviour below is UNCHANGED from the implementation that preceded the design
 * rebuild; this file is presentation only:
 *
 *   • sign-up with an optional referral code (from ?ref=, surfaced before submit)
 *   • sign-in, Google sign-in (a dismissed popup is a dismissal, not an error),
 *     password reset, verification resend with a cooldown, the explicit access
 *     gate (`enablePSEmine`), and the protected route that preserves the intended
 *     destination in `returnTo`, requires a verified identity, explains missing
 *     product access, and only then applies the onboarding gate.
 *
 * COPY RULE: the surfaces speak about the product, never about the system. No
 * architecture, no account-relationship explanations, no internal terminology.
 */

/** Password strength: computed from the real input, never displayed when empty. */
const STRENGTH_STEPS = ['Weak', 'Fair', 'Good', 'Strong'] as const;

const StrengthMeter: React.FC<{ label: string }> = ({ label }) => {
  const step = Math.max(1, STRENGTH_STEPS.indexOf(label as (typeof STRENGTH_STEPS)[number]) + 1);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="pse-meter" aria-hidden="true">
        <span style={{ width: `${(step / STRENGTH_STEPS.length) * 100}%` }} />
      </div>
      <p className="pse-small">
        Password strength: <span className="pse-strong">{label}</span>
      </p>
    </div>
  );
};

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

  // Session restore: route completed sessions to their next step. Access is NOT
  // judged here — the protected route owns that decision so an account without
  // PSEmine access gets an explanation, not a silent redirect.
  useEffect(() => {
    if (!currentUser) return;
    if (!isVerified) { navigate('/mine/verify-email', { replace: true }); return; }
    const entitled = userData?.productAccess?.psemine === true;
    if (entitled && userData?.onboardingCompleted === false) {
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
    <PseAuthFrame
      title={isSignup ? 'Create your PSEmine account' : 'Sign in to PSEmine'}
      lede={
        isSignup
          ? refFromQuery
            ? 'Your referral code is applied to this account automatically. It is recorded at sign-up and qualifies when the conditions are met — nothing is credited in advance.'
            : 'One account for mining tools, capacity, campaign earnings and payout.'
          : 'Continue to your mining console: tools, capacity, accrual and settlement.'
      }
      footer={
        <div className="space-y-3">
          <p className="pse-body">
            {isSignup ? 'Already have an account? ' : 'New to PSEmine? '}
            <Link to={isSignup ? '/mine/login' : '/mine/signup'} className="pse-link">
              {isSignup ? 'Sign in' : 'Create account'}
            </Link>
          </p>
          {!isSignup && (
            <p className="pse-small">
              <Link to="/mine/forgot-password" className="pse-link inline-flex min-h-[44px] items-center">
                Forgot your password?
              </Link>
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {refFromQuery && isSignup && (
          <p className="pse-notice" data-tone="good">
            <span>
              <span className="pse-notice-title">Referral applied.</span> Code{' '}
              <span className="pse-figure">{refFromQuery}</span> — recorded on this account at sign-up.
            </span>
          </p>
        )}

        <button
          type="button"
          onClick={() => void google()}
          disabled={googlePending}
          className="pse-btn pse-btn-quiet pse-btn-block"
        >
          {googlePending ? 'Waiting for Google…' : isSignup ? 'Sign up with Google' : 'Sign in with Google'}
        </button>
        <p className="pse-small">
          {isSignup
            ? 'Google accounts skip the password and email-verification steps. Existing accounts keep their current access.'
            : 'Use the same Google identity you signed up with — no second account is created.'}
        </p>

        <p className="pse-auth-alt">or use email</p>

        <form onSubmit={submit} className="space-y-4" noValidate>
          {isSignup && (
            <div>
              <label className="pse-field-label" htmlFor="pse-signup-username">
                Display name
                <span className="pse-field-hint">Shown to referrals</span>
              </label>
              <input
                id="pse-signup-username"
                className="pse-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="How you'll appear"
                autoComplete="nickname"
                required
              />
            </div>
          )}

          <div>
            <label className="pse-field-label" htmlFor="pse-auth-email">
              Email
            </label>
            <input
              id="pse-auth-email"
              className="pse-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="pse-field-label" htmlFor="pse-auth-password">
              Password
              {isSignup && <span className="pse-field-hint">Minimum 8 characters</span>}
            </label>
            <input
              id="pse-auth-password"
              className="pse-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={8}
            />
            {isSignup && password.length > 0 && (
              <div className="mt-3">
                <StrengthMeter label={strength} />
              </div>
            )}
          </div>

          {formError && (
            <p className="pse-notice" data-tone="danger" role="alert">
              <span className="pse-notice-title">{formError}</span>
            </p>
          )}

          <button type="submit" className="pse-btn pse-btn-block" disabled={pending}>
            {pending ? 'Working…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {isSignup && (
          <p className="pse-small">
            By creating an account you agree to the <Link to="/terms" className="pse-link">Terms</Link> and{' '}
            <Link to="/privacy" className="pse-link">Privacy Policy</Link>. Nothing is taken from your wallet until you
            choose a tool and pay for it yourself.
          </p>
        )}
      </div>
    </PseAuthFrame>
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
    <PseAuthFrame
      title="Reset your password"
      lede="We email a secure reset link to the address on the account. The link is single-use and expires, so open it soon after it arrives."
      footer={
        <p className="pse-small">
          <Link to="/mine/login" className="pse-link">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <p className="pse-notice" data-tone="good">
            <span>
              <span className="pse-notice-title">Reset link sent.</span> Check{' '}
              <span className="pse-figure">{email}</span> — including spam — then follow the link to choose a new
              password.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="pse-btn pse-btn-quiet" onClick={() => setSent(false)}>
              Use a different email
            </button>
            <Link to="/mine/login" className="pse-btn pse-btn-ink">
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="pse-field-label" htmlFor="pse-reset-email">
              Email
            </label>
            <input
              id="pse-reset-email"
              className="pse-input"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {error && (
            <p className="pse-notice" data-tone="danger" role="alert">
              <span className="pse-notice-title">{error}</span>
            </p>
          )}

          <button type="submit" className="pse-btn pse-btn-block" disabled={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </PseAuthFrame>
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
    <PseAuthFrame
      title="Verify your email"
      lede={
        <>
          A verified address is required before any account record is read. We sent a link to{' '}
          <span className="pse-figure">{currentUser.email}</span>; this page advances by itself once the address is
          verified.
        </>
      }
      footer={
        <button
          type="button"
          className="pse-small pse-link bg-transparent border-0 p-0"
          onClick={async () => { await logout(); navigate('/mine/login', { replace: true }); }}
        >
          Sign out and use another account
        </button>
      }
    >
      <div className="space-y-4">
        <ol className="space-y-2 pse-body">
          <li>
            <span className="pse-strong">1.</span> Open the verification email and follow the link.
          </li>
          <li>
            <span className="pse-strong">2.</span> Come back to this page — it advances on its own once the address is
            reported as verified.
          </li>
          <li>
            <span className="pse-strong">3.</span> If nothing happened, resend the email below.
          </li>
        </ol>

        {error ? (
          <p className="pse-notice" data-tone="danger" role="alert">
            <span className="pse-notice-title">{error}</span>
          </p>
        ) : notice ? (
          <p className="pse-notice" data-tone="good">
            <span>{notice}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="pse-btn" onClick={() => void resend()} disabled={pending || cooldown > 0}>
            {pending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
          </button>
          <button type="button" className="pse-btn pse-btn-quiet" onClick={() => window.location.reload()}>
            I&apos;ve verified my email
          </button>
        </div>
      </div>
    </PseAuthFrame>
  );
};

/* ═══════════════════ ACCESS GATE ═══════════════════ */

/**
 * "PSEmine isn't enabled for this account" — a REAL product state, not an error.
 * Deliberately distinct from authentication failure, a refused operation, a
 * service outage and a network failure: nothing has failed and nothing was
 * unreachable.
 *
 * The copy states the state and the single next action. It does not explain how
 * accounts or access are arranged internally.
 */
const PSEmineAccessGate: React.FC = () => {
  const { currentUser, enablePSEmine, logout } = usePSEMineAuth();
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
    <PseAuthFrame
      variant="embedded"
      title="PSEmine isn't enabled for this account"
      lede={
        <>
          Signed in as <span className="pse-figure">{currentUser?.email}</span>. PSEmine is not switched on for this
          account yet, and it stays off until you turn it on here.
        </>
      }
      footer={
        <p className="pse-small">
          <Link to="/mine/guide" className="pse-link">
            How PSEmine works
          </Link>
          {' · '}
          <Link to="/help" className="pse-link">
            Contact support
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="pse-panel pse-panel-body space-y-2">
          <p className="pse-h3">What enabling does</p>
          <p className="pse-small">
            It opens your PSEmine mining account: zeroed balances, no purchases, no charges, and an activity entry
            recording that it was opened. Nothing further happens until you choose a tool yourself.
          </p>
          <ul className="pse-small">
            <li>· No wallet is connected and no payment is requested.</li>
            <li>· Nothing is charged from your wallet until you buy a tool.</li>
          </ul>
        </div>

        {error && (
          <p className="pse-notice" data-tone="danger" role="alert">
            <span className="pse-notice-title">{error}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="pse-btn" onClick={() => void enable()} disabled={pending}>
            {pending ? 'Enabling…' : 'Enable PSEmine for this account'}
          </button>
          <button type="button" className="pse-btn pse-btn-quiet" onClick={() => void other()} disabled={pending}>
            Use another account
          </button>
        </div>
      </div>
    </PseAuthFrame>
  );
};

/* ═══════════════════ PROTECTED ROUTE GATE ═══════════════════ */
export const PSEmineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading, isVerified, hasPSEmineAccess } = usePSEMineAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="pse pse-wrap">
        <PseLoader variant="page" stage="session" />
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

  // 3. Signed in, verified, no PSEmine access → state it and offer the one action.
  //    This check runs before onboarding so an account without access is never
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
