import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseDocumentTitle } from '../../components/psemine/pseCore';
import { PseAuthFrame } from '../../components/psemine/PseAuthFrame';
import { PseLoader } from '../../components/psemine/PseLoader';
import { mapAuthError } from '../../utils/errors';

/**
 * PSEmine authentication — the product's sign-in family.
 *
 * PRESENTATION REBUILT; BEHAVIOUR UNCHANGED. Every call, guard, side effect and
 * navigation below is the implementation that already shipped:
 *
 *   • sign-up with an optional referral code (from ?ref=, surfaced before submit)
 *   • sign-in, Google sign-in (a dismissed popup is a dismissal, not an error),
 *     password reset, verification resend with a cooldown, the explicit access
 *     gate (`enablePSEmine`), and the protected route that preserves the intended
 *     destination in `returnTo`, requires a verified identity, explains missing
 *     access, and only then applies the onboarding gate.
 *
 * WHAT CHANGED, AND WHY
 *   • PLANE. These surfaces render on the product's own plane — always dark
 *     graphite, whatever the application theme is (see src/styles/psemine.css
 *     and src/styles/psemine-auth.css), so a sign-in page is unmistakably part
 *     of the same product as the landing page rather than a page of the console.
 *   • CONTENT. Nothing about the campaign, the tools, capacity, referrals or
 *     earnings appears on any authentication surface. A sign-in page explains
 *     itself and nothing else.
 *   • ORDER. The primary action, then whatever qualifies it (the password reset
 *     link, or the terms line), then the provider divider, then the alternate
 *     provider. The exception someone must read belongs above the divider, not
 *     after an unrelated button.
 *   • FORM QUALITY. Real financial-product controls: plain labels, 48px fields,
 *     a password visibility control, an invalid state per field, the error
 *     printed under the field it belongs to, focus moved to the first invalid
 *     field, and a busy state on the primary action.
 *   • VALIDATION. The same two rules the previous implementation enforced
 *     (display name ≥ 2 characters, password ≥ 8 characters) render against
 *     their own fields instead of as one banner. The pre-flight checks and their
 *     order are unchanged — an invalid form still never reaches the provider.
 */

/* ── Small inline glyphs. Meaningful only: password visibility. ───────────── */

const EyeGlyph: React.FC<{ off?: boolean }> = ({ off = false }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M2.5 10S5.5 4.75 10 4.75 17.5 10 17.5 10 14.5 15.25 10 15.25 2.5 10 2.5 10Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    {off && <path d="M4 16.5 16 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
  </svg>
);

/**
 * Password quality, computed from the real input and rendered only once there
 * is one. Four bands on one rail: a band is reported, never a score, and the
 * rail is `aria-hidden` because the sentence below already says the same thing
 * in words — a screen reader should not hear it twice.
 */
const STRENGTH_STEPS = ['Weak', 'Fair', 'Good', 'Strong'] as const;

const StrengthMeter: React.FC<{ label: string }> = ({ label }) => {
  const step = Math.max(1, STRENGTH_STEPS.indexOf(label as (typeof STRENGTH_STEPS)[number]) + 1);
  return (
    <div className="mt-2.5" aria-live="polite">
      <span className="pse-meter" data-step={step} aria-hidden="true">
        <span style={{ width: `${(step / STRENGTH_STEPS.length) * 100}%` }} />
      </span>
      <p className="pse-small mt-2">
        Password quality: <span className="pse-strong">{label}</span>
      </p>
    </div>
  );
};

/** The tick inside the agreement control. Drawn, never a font glyph. */
const CheckGlyph: React.FC = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.4 4.6 8.5 9.5 3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * An agreement control, not decoration.
 *
 * The control is a real checkbox that gates submission, its name is the sentence
 * beside it (so the agreement is announced rather than the word "checkbox"), and
 * the sentence carries the documents themselves — the terms a person accepts are
 * readable at the moment they accept them rather than only after signing in.
 */
const Agreement: React.FC<{
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  /** The checkbox itself, so an invalid submit can move focus onto it. */
  controlRef?: React.RefObject<HTMLInputElement | null>;
  children: React.ReactNode;
}> = ({ id, checked, onChange, error, controlRef, children }) => (
  <div className="pse-check" data-invalid={error ? 'true' : undefined}>
    <label className="pse-check-control" htmlFor={id}>
      <input
        ref={controlRef}
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        aria-labelledby={`${id}-text`}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
      />
      <span className="pse-check-box" aria-hidden="true">
        <CheckGlyph />
      </span>
    </label>
    <span className="pse-check-text" id={`${id}-text`}>
      {children}
    </span>
    {error && (
      <p className="pse-field-error pse-check-error" id={`${id}-error`} role="alert">
        {error}
      </p>
    )}
  </div>
);

/**
 * A labelled field with its own error slot. The error is rendered directly under
 * the control it belongs to and is referenced by `aria-describedby`, because a
 * single banner at the top of a form is the most common reason a person cannot
 * tell which field is wrong.
 */
const Field: React.FC<{
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ id, label, hint, error, children }) => (
  <div className="pse-field">
    <label className="pse-label" htmlFor={id}>
      {label}
      {hint && <span className="pse-label-hint">{hint}</span>}
    </label>
    {children}
    {error && (
      <p className="pse-field-error" id={`${id}-error`} role="alert">
        {error}
      </p>
    )}
  </div>
);

/* ═══════════════════ SIGN IN / CREATE ACCOUNT ═══════════════════ */

type FieldErrors = { username?: string; email?: string; password?: string; terms?: string };

export const PSEmineAuth: React.FC<{ mode?: 'login' | 'signup' }> = ({ mode = 'login' }) => {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  /**
   * The explicit agreement, held for the sign-up form only.
   *
   * It gates submission: an account cannot be created without it, so it is not a
   * decorative formality. It is NOT sent anywhere, because the account model has
   * no field for it — see the note on the control below.
   */
  const [agreed, setAgreed] = useState(false);
  const termsRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
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

  /** Clears one field's error as soon as the person edits it. */
  const clearField = (key: keyof FieldErrors) =>
    setFieldErrors(prev => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Same rules, same order as before — only the presentation differs now.
    const next: FieldErrors = {};
    if (isSignup && username.trim().length < 2) next.username = 'Choose a display name (2+ characters).';
    if (!email.trim()) next.email = 'Enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (isSignup && !agreed) next.terms = 'Accept the Terms of Service and the Privacy Policy to create an account.';

    if (next.username || next.email || next.password || next.terms) {
      setFieldErrors(next);
      const first = next.username ? usernameRef : next.email ? emailRef : next.password ? passwordRef : termsRef;
      first.current?.focus();
      return;
    }

    setFieldErrors({});
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
      title={isSignup ? 'Create your account' : 'Sign in'}
      lede={
        isSignup
          ? 'Set up your PSEmine account. It takes a moment, and nothing is charged.'
          : 'Enter your email and password to continue.'
      }
      footer={
        <p className="pse-small flex flex-wrap items-center gap-x-1.5">
          <span>{isSignup ? 'Already have an account?' : 'New to PSEmine?'}</span>
          {/* A standalone navigation action, not an inline prose link — so it
              keeps a real 44px target rather than the inline exception. */}
          <Link
            to={isSignup ? '/mine/login' : '/mine/signup'}
            className="pse-link inline-flex min-h-[44px] items-center"
          >
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      }
    >
      <div className="space-y-5">
        {refFromQuery && isSignup && (
          <p className="pse-notice" data-tone="good">
            <span>
              <span className="pse-notice-title">Referral code applied.</span> Code{' '}
              <span className="pse-figure">{refFromQuery}</span> will be recorded on this account at sign-up.
            </span>
          </p>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          {isSignup && (
            <Field
              id="pse-signup-username"
              label="Display name"
              hint="2 characters or more"
              error={fieldErrors.username}
            >
              <input
                ref={usernameRef}
                id="pse-signup-username"
                className="pse-input"
                value={username}
                onChange={e => { setUsername(e.target.value); clearField('username'); }}
                placeholder="How you'll appear"
                autoComplete="nickname"
                aria-invalid={fieldErrors.username ? true : undefined}
                aria-describedby={fieldErrors.username ? 'pse-signup-username-error' : undefined}
                required
              />
            </Field>
          )}

          <Field id="pse-auth-email" label="Email" error={fieldErrors.email}>
            <input
              ref={emailRef}
              id="pse-auth-email"
              className="pse-input"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); clearField('email'); }}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? 'pse-auth-email-error' : undefined}
              required
            />
          </Field>

          <Field
            id="pse-auth-password"
            label="Password"
            hint={isSignup ? 'Minimum 8 characters' : undefined}
            error={fieldErrors.password}
          >
            <span className="pse-input-wrap">
              <input
                ref={passwordRef}
                id="pse-auth-password"
                className="pse-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); clearField('password'); }}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby={fieldErrors.password ? 'pse-auth-password-error' : undefined}
                required
                minLength={8}
              />
              <button
                type="button"
                className="pse-input-toggle"
                onClick={() => setShowPassword(v => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeGlyph off={showPassword} />
              </button>
            </span>
          </Field>

          {isSignup && password.length > 0 && <StrengthMeter label={strength} />}

          {isSignup && (
            <Agreement
              id="pse-signup-terms"
              controlRef={termsRef}
              checked={agreed}
              onChange={v => { setAgreed(v); clearField('terms'); }}
              error={fieldErrors.terms}
            >
              I agree to the PSEmine{' '}
              <Link to="/mine/terms" className="pse-link">
                Terms of Service
              </Link>
              , and I acknowledge the{' '}
              <Link to="/mine/privacy" className="pse-link">
                Privacy Policy
              </Link>{' '}
              and the{' '}
              <Link to="/mine/risk" className="pse-link">
                Risk Disclosure
              </Link>
              .
            </Agreement>
          )}

          {formError && (
            <p className="pse-notice" data-tone="danger" role="alert">
              <span className="pse-notice-title">{formError}</span>
            </p>
          )}

          <button type="submit" className="pse-btn pse-btn--lg pse-btn--block" disabled={pending} aria-busy={pending}>
            {pending ? 'Working…' : isSignup ? 'Create account' : 'Sign in'}
          </button>

          {isSignup && (
            <p className="pse-small">
              Creating an account is free and charges nothing. Buying a unit is a separate decision you make later, and{' '}
              <Link to="/mine/purchase-terms" className="pse-link">
                the Purchase Terms
              </Link>{' '}
              set out how that works.
            </p>
          )}

          {!isSignup && (
            <p className="text-center">
              <Link to="/mine/forgot-password" className="pse-link inline-flex min-h-[44px] items-center text-sm">
                Forgot your password?
              </Link>
            </p>
          )}
        </form>

        <p className="pse-auth-or">or</p>

        <button
          type="button"
          onClick={() => void google()}
          disabled={googlePending}
          className="pse-btn pse-btn--secondary pse-btn--lg pse-btn--block"
        >
          {googlePending ? 'Waiting for Google…' : isSignup ? 'Sign up with Google' : 'Continue with Google'}
        </button>
      </div>
    </PseAuthFrame>
  );
};

/* ═══════════════════ PASSWORD RECOVERY ═══════════════════ */
export const PSEmineForgotPassword: React.FC = () => {
  usePseDocumentTitle('Reset password');
  const { resetPassword } = usePSEMineAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const emailRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldError('Enter a valid email address.');
      emailRef.current?.focus();
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try { await resetPassword(email.trim()); setSent(true); }
    catch (err) { setError(mapAuthError(err)); }
    finally { setPending(false); }
  };

  return (
    <PseAuthFrame
      title="Reset your password"
      lede="We'll email a secure link to the address on your account. The link is single-use and expires, so open it soon after it arrives."
      footer={
        <p className="pse-small">
          <Link to="/mine/login" className="pse-link inline-flex min-h-[44px] items-center">
            Back to sign in
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <p className="pse-notice" data-tone="good">
            <span>
              <span className="pse-notice-title">Check your inbox.</span> We sent a reset link to{' '}
              <span className="pse-figure">{email}</span> — including spam. Follow it to choose a new password.
            </span>
          </p>
          <button type="button" className="pse-btn pse-btn--secondary pse-btn--lg pse-btn--block" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="pse-reset-email" label="Email" error={fieldError}>
            <input
              ref={emailRef}
              id="pse-reset-email"
              className="pse-input"
              type="email"
              required
              value={email}
              onChange={e => { setEmail(e.target.value); if (fieldError) setFieldError(undefined); }}
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'pse-reset-email-error' : undefined}
            />
          </Field>

          {error && (
            <p className="pse-notice" data-tone="danger" role="alert">
              <span className="pse-notice-title">{error}</span>
            </p>
          )}

          <button type="submit" className="pse-btn pse-btn--lg pse-btn--block" disabled={pending} aria-busy={pending}>
            {pending ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </PseAuthFrame>
  );
};

/* ═══════════════════ EMAIL VERIFICATION ═══════════════════ */
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
          We sent a verification link to <span className="pse-figure">{currentUser.email}</span>. Open it, and this page
          will continue on its own.
        </>
      }
      footer={
        <button
          type="button"
          className="pse-small pse-link bg-transparent border-0 p-0"
          onClick={async () => { await logout(); navigate('/mine/login', { replace: true }); }}
        >
          Use a different account
        </button>
      }
    >
      <div className="space-y-4">
        {error ? (
          <p className="pse-notice" data-tone="danger" role="alert">
            <span className="pse-notice-title">{error}</span>
          </p>
        ) : notice ? (
          <p className="pse-notice" data-tone="good">
            <span>{notice}</span>
          </p>
        ) : null}

        <div className="space-y-2">
          <button
            type="button"
            className="pse-btn pse-btn--lg pse-btn--block"
            onClick={() => window.location.reload()}
          >
            I&apos;ve verified my email
          </button>
          <button
            type="button"
            className="pse-btn pse-btn--secondary pse-btn--lg pse-btn--block"
            onClick={() => void resend()}
            disabled={pending || cooldown > 0}
            aria-busy={pending}
          >
            {pending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
          </button>
        </div>

        <p className="pse-small">
          Nothing arrived? Check the spam folder, then resend — the link is valid for a limited time.
        </p>
      </div>
    </PseAuthFrame>
  );
};

/* ═══════════════════ ACCESS GATE ═══════════════════ */

/**
 * "PSEmine isn't enabled for this account" — a REAL product state, not an error.
 * Deliberately distinct from an authentication failure, a refused operation, a
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
          {/* The public page, not the console's guide: this account has no
              PSEmine access yet, so the console's own surfaces are exactly what
              it cannot open. The explanation it is looking for is public. */}
          <Link to="/mine" className="pse-link">
            How PSEmine works
          </Link>
          {' · '}
          <Link to="/mine/support" className="pse-link">
            Contact support
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        <div className="pse-card">
          <div className="pse-card-body space-y-2">
            <p className="pse-h3">What enabling does</p>
            <p className="pse-small">
              It opens your PSEmine account: zeroed balances, no purchases, no charges, and an activity entry recording
              that it was opened. Nothing further happens until you choose to buy something yourself.
            </p>
          </div>
        </div>

        {error && (
          <p className="pse-notice" data-tone="danger" role="alert">
            <span className="pse-notice-title">{error}</span>
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            className="pse-btn pse-btn--lg pse-btn--block"
            onClick={() => void enable()}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? 'Enabling…' : 'Enable PSEmine'}
          </button>
          <button
            type="button"
            className="pse-btn pse-btn--secondary pse-btn--lg pse-btn--block"
            onClick={() => void other()}
            disabled={pending}
          >
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

  // This loader renders INSIDE the console shell, so it follows the console's
  // theme rather than the public plane: the plane marks which surface you are
  // on (see src/styles/psemine.css), and this one is already the console.
  if (loading) {
    return (
      <div className="pse pse-surface flex min-h-[60vh] items-center justify-center">
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
