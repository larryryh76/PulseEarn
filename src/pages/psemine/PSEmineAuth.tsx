import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/PSEMineAuthContext';
import { PSEMineLogo } from '../../components/psemine/PSEMineLogo';
import { mapAuthError } from '../../utils/errors';
import toast from 'react-hot-toast';

export const PSEmineAuth: React.FC<{ mode?: 'login' | 'signup' }> = ({ mode = 'login' }) => {
  const isSignup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = usePSEMineAuth();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password || (isSignup && !username)) return toast.error('Complete the required fields.');
    setPending(true);
    try {
      if (isSignup) await signup(email, password, username, new URLSearchParams(location.search).get('ref') || undefined);
      else await login(email, password);
      navigate('/mine/dashboard');
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally { setPending(false); }
  };

  return <main className="psemine-auth min-h-screen px-5 py-8 sm:px-8">
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center lg:justify-between lg:gap-20">
      <section className="hidden max-w-sm lg:block">
        <PSEMineLogo size={46} />
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">90-day capacity campaign</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-text-primary">A quieter way to build earning capacity.</h1>
        <p className="mt-5 text-sm leading-6 text-text-secondary">Manage tools, campaign accruals and settlement from one focused PSEmine account.</p>
      </section>
      <section className="w-full max-w-md border border-border bg-surface p-6 shadow-2xl sm:p-9">
        <div className="mb-8 lg:hidden"><PSEMineLogo size={38} /></div>
        <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">PSEmine access</p><h2 className="mt-2 text-2xl font-semibold text-text-primary">{isSignup ? 'Create your account' : 'Welcome back'}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{isSignup ? 'Start with a secure campaign account.' : 'Continue to your mining console.'}</p></div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {isSignup && <label className="flex flex-col gap-2 text-xs font-semibold text-text-secondary">Display name<input value={username} onChange={e => setUsername(e.target.value)} className="psemine-input" placeholder="Your name" /></label>}
          <label className="flex flex-col gap-2 text-xs font-semibold text-text-secondary">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="psemine-input" placeholder="you@example.com" /></label>
          <label className="flex flex-col gap-2 text-xs font-semibold text-text-secondary">Password<div className="relative"><Lock className="absolute left-3 top-3.5 text-text-tertiary" size={16} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="psemine-input pl-10 pr-10" placeholder="Your password" /><button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-3 text-text-tertiary" aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
          {!isSignup && <Link to="/mine/forgot-password" className="self-end text-xs text-primary hover:underline">Forgot password?</Link>}
          <button disabled={pending} className="psemine-btn-primary mt-2 w-full py-3">{pending ? 'Please wait…' : isSignup ? 'Create PSEmine account' : 'Sign in'} <ArrowRight size={15} /></button>
        </form>
        <div className="mt-7 flex items-center justify-between border-t border-border pt-6 text-xs text-text-secondary"><span>{isSignup ? 'Already registered?' : 'New to PSEmine?'}</span><Link className="font-semibold text-primary hover:underline" to={isSignup ? '/mine/login' : '/mine/signup'}>{isSignup ? 'Sign in' : 'Create account'}</Link></div>
        <div className="mt-6 flex items-center gap-2 text-xs text-text-tertiary"><ShieldCheck size={15} className="text-secondary" /> Firebase-secured account access</div>
      </section>
    </div>
  </main>;
};

export const PSEmineForgotPassword: React.FC = () => {
  const { resetPassword } = usePSEMineAuth(); const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  return <main className="psemine-auth flex min-h-screen items-center justify-center px-5"><section className="w-full max-w-md border border-border bg-surface p-7 sm:p-9"><PSEMineLogo size={38} /><h1 className="mt-10 text-2xl font-semibold text-text-primary">Reset your password</h1><p className="mt-2 text-sm leading-6 text-text-secondary">We will send a secure reset link to your account email.</p>{sent ? <div className="mt-6 border border-success/30 bg-success/10 p-4 text-sm text-success">Check your inbox for the reset link.</div> : <form className="mt-7 flex flex-col gap-4" onSubmit={async e => { e.preventDefault(); await resetPassword(email); setSent(true); }}><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="psemine-input" placeholder="you@example.com" /><button className="psemine-btn-primary py-3">Send reset link</button></form>}<Link className="mt-7 inline-block text-xs text-primary hover:underline" to="/mine/login">Back to sign in</Link></section></main>;
};

export const PSEmineProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => { const { currentUser, loading } = usePSEMineAuth(); if (loading) return <div className="psemine-loader-screen"><PSEMineLogo size={48} /><span>Restoring secure session…</span></div>; if (!currentUser) return <NavigateToLogin />; return <>{children}</>; };
const NavigateToLogin = () => { const navigate = useNavigate(); React.useEffect(() => { navigate('/mine/login', { replace: true }); }, [navigate]); return null; };
export default PSEmineAuth;
