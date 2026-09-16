import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, User as UserIcon, RefreshCcw, LogOut, CheckCircle2 } from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSELogo } from '../../components/psemine/pse';
import { mapAuthError } from '../../utils/errors';
import toast from 'react-hot-toast';

/* ── Shared brand panel ─────────────────────────────────────────────── */
const BrandPanel: React.FC<{ quote: string; points: string[] }> = ({ quote, points }) => (
  <div className="hidden lg:flex lg:w-[42%] lg:shrink-0 lg:flex-col lg:justify-between lg:border-r lg:p-12"
    style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
    <PSELogo size={34} withWordmark />
    <div>
      <p className="pse-lead max-w-sm font-medium" style={{ color: 'var(--pse-text)' }}>{quote}</p>
      <ul className="mt-8 space-y-3">
        {points.map(p => (
          <li key={p} className="flex items-center gap-2.5 pse-caption">
            <span className="pse-dot" style={{ background: 'var(--pse-blue)' }} />{p}
          </li>
        ))}
      </ul>
    </div>
    <p className="pse-micro">90-day campaign · GBP accounting · BNB Smart Chain settlement</p>
  </div>
);

const AuthShell: React.FC<{ children: React.ReactNode; quote: string; points: string[] }> = ({ children, quote, points }) => (
  <main className="pse-scope flex min-h-screen" style={{ background: 'var(--pse-bg)' }}>
    <BrandPanel quote={quote} points={points} />
    <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">{children}</div>
    </div>
  </main>
);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="pse-caption mb-1.5 flex items-baseline justify-between font-medium" style={{ color: 'var(--pse-text-2)' }}>
        {label}
        {hint && <span className="pse-micro">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function PasswordInput({ value, onChange, placeholder, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoComplete?: string;
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
        minLength={8}
      />
      {/* FIX 8: 44px hit area; icon size unchanged */}
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

const Spinner: React.FC = () => (
  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
);

/* ═══════════════════ LOGIN / SIGNUP ═══════════════════ */
export const PSEmineAuth: React.FC<{ mode?: 'login' | 'signup' }> = ({ mode = 'login' }) => {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, currentUser, isVerified, userData } = usePSEMineAuth();

  const refFromQuery = new URLSearchParams(location.search).get('ref') || undefined;

  // Session restore: route completed sessions to their next step.
  useEffect(() => {
    if (!currentUser) return;
    if (!isVerified) { navigate('/mine/verify-email', { replace: true }); return; }
    if (userData?.productAccess?.psemine !== true) { navigate('/mine/dashboard', { replace: true }); return; }
    if (userData && userData.onboardingCompleted === false) { navigate('/mine/guide', { replace: true }); return; }
    navigate('/mine/dashboard', { replace: true });
  }, [currentUser, isVerified, userData, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup && username.trim().length < 2) { toast.error('Choose a display name (2+ characters).'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setPending(true);
    try {
      if (isSignup) await signup(email.trim(), password, username.trim(), refFromQuery);
      else await login(email.trim(), password);
      // Navigation happens in the session-restore effect above.
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally { setPending(false); }
  };

  return (
    <AuthShell
      quote="A quieter way to build earning capacity."
      points={[
        '90-day campaign with GBP-denominated capacity',
        'On-chain payment verification on BNB Smart Chain',
        'Ledger-backed balances settled after the campaign ends',
      ]}
    >
      <div className="mb-8 lg:hidden"><PSELogo size={34} withWordmark /></div>
      <p className="pse-eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</p>
      <h1 className="pse-h2 mt-2">{isSignup ? 'Start your campaign' : 'Sign in to PSEmine'}</h1>
      <p className="pse-caption mt-2">
        {isSignup
          ? refFromQuery ? 'You were invited — your referral code is applied automatically.' : 'One account for tools, capacity, and settlement.'
          : 'Continue to your mining console.'}
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-4" noValidate>
        {isSignup && (
          <Field label="Display name">
            <div className="relative">
              <UserIcon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
              <input value={username} onChange={e => setUsername(e.target.value)} className="pse-input pl-10"
                placeholder="How you'll appear to referrals" autoComplete="nickname" required />
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
      <div className="mt-6 flex items-center gap-2 pse-micro">
        <ShieldCheck size={14} style={{ color: 'var(--pse-cyan)' }} />
        Secured authentication · your session stays on this device
      </div>
    </AuthShell>
  );
};

/* ═══════════════════ FORGOT PASSWORD ═══════════════════ */
export const PSEmineForgotPassword: React.FC = () => {
  const { resetPassword } = usePSEMineAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    try { await resetPassword(email.trim()); setSent(true); }
    catch (error) { toast.error(mapAuthError(error)); }
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
      <p className="pse-caption mt-2">We'll email a secure reset link to your account address.</p>

      {sent ? (
        <div className="pse-card mt-8 p-6 text-center">
          <CheckCircle2 size={22} className="mx-auto" style={{ color: 'var(--pse-success)' }} />
          <p className="pse-h3 mt-3">Check your inbox</p>
          <p className="pse-caption mt-1.5">A reset link was sent to <span className="font-medium" style={{ color: 'var(--pse-text)' }}>{email}</span>.</p>
          <Link to="/mine/login" className="pse-btn pse-btn-secondary pse-btn-sm mt-5">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <Field label="Email">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="pse-input" placeholder="you@example.com" autoComplete="email" />
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
  const { currentUser, isVerified, sendVerification, logout } = usePSEMineAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [resentAt, setResentAt] = useState<number | null>(null);

  // Auto-advance once Firebase reports the verified flag (after the user clicks
  // the email link and returns; the page refreshes auth state automatically).
  useEffect(() => {
    if (isVerified) navigate('/mine/guide', { replace: true });
  }, [isVerified, navigate]);

  const resend = async () => {
    setPending(true);
    try {
      await sendVerification();
      setResentAt(Date.now());
      toast.success('Verification email sent.');
    } catch (error) {
      toast.error(mapAuthError(error));
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

      <div className="pse-card mt-8 p-5">
        <div className="flex items-start gap-3">
          <Mail size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold">Steps</p>
            <ol className="pse-caption mt-1.5 list-decimal space-y-1 pl-4">
              <li>Open the email and click the verification link.</li>
              <li>Return to this page — it advances automatically.</li>
              <li>If nothing happens, press “I've verified” to re-check.</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button type="button" disabled={pending || cooldown > 0} onClick={resend}
          className="pse-btn pse-btn-secondary w-full justify-center py-3">
          <RefreshCcw size={14} className={pending ? 'animate-spin' : ''} />
          {pending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
        </button>
        <button type="button" onClick={() => window.location.reload()} className="pse-btn pse-btn-primary w-full justify-center py-3">
          I've verified my email
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

/* ═══════════════════ PROTECTED ROUTE GATE ═══════════════════ */
export const PSEmineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData, loading, isVerified } = usePSEMineAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="pse-scope flex min-h-screen items-center justify-center" style={{ background: 'var(--pse-bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <PSELogo size={40} />
          <Spinner />
          <p className="pse-micro">Restoring secure session…</p>
        </div>
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/mine/login" replace state={{ from: location.pathname }} />;
  if (!isVerified) return <Navigate to="/mine/verify-email" replace />;
  const onboardingPath = location.pathname === '/mine/guide/onboarding';
  if (userData && userData.onboardingCompleted === false && !onboardingPath) {
    return <Navigate to="/mine/guide/onboarding" replace />;
  }
  return <>{children}</>;
};

export default PSEmineAuth;
