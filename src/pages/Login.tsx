import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/ButtonLegacy';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { mapAuthError } from '../utils/errors';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'forgot'>('login');

  const { login, resetPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      setIsSubmitting(true);
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error: any) {
      // Fix #3: Catch and display Google auth errors with friendly messages
      let message = 'An unexpected error occurred.';
      if (error.code === 'auth/unauthorized-domain') {
        message = 'Google login is temporarily unavailable. Use email instead.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in window closed. Please try again.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Check your connection and retry.';
      } else {
        message = mapAuthError(error);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'forgot') {
      if (!email) return toast.error('Please enter your email address.');
      setIsSubmitting(true);
      try {
        await resetPassword(email);
        toast.success('Password reset link sent to your email.');
        setAuthMode('login');
      } catch (error: any) {
        toast.error(mapAuthError(error));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!email || !password) {
      return toast.error('Please fill in all fields.');
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      // Post-login destination is handled by AuthContext and App route guards
      navigate('/dashboard');
    } catch (error: any) {
      console.error("[Login] Auth Error:", error.code, error.message);
      toast.error(mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Background depth */}
        <div className="absolute inset-0 -z-10">
           <div className="absolute top-1/4 right-1/4 w-[35rem] h-[30rem] bg-primary/10 rounded-full blur-[160px]" />
           <div className="absolute bottom-1/4 left-1/4 w-[35rem] h-[30rem] bg-accent/5 rounded-full blur-[160px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="glass-card p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

            <AnimatePresence mode="wait">
              {authMode === 'login' ? (
                <motion.div
                  key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-xl">
                        <LogIn className="text-primary" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight text-text-primary">Welcome Back</h1>
                    <p className="text-text-secondary text-sm font-medium">Sign in to your PulseEarn account</p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-100 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
                      Continue with Google
                    </button>

                    <div className="relative flex items-center justify-center py-2">
                       <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                       <span className="relative px-4 bg-surface text-[10px] font-black text-text-tertiary uppercase tracking-widest">Or Secure Login</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Email</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-surface-bright border border-border-bright rounded-xl pl-12 pr-4 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30">Password</label>
                         <button
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-[10px] font-bold text-primary hover:text-accent uppercase tracking-widest transition-colors"
                         >
                            Forgot Password?
                         </button>
                      </div>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-surface-bright border border-border-bright rounded-xl pl-12 pr-12 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold mt-2" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                           <Loader2 className="animate-spin" size={16} />
                           Signing In...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                           Sign In
                           <ArrowRight size={16} />
                        </div>
                      )}
                    </Button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="forgot-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex flex-col items-center text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-xl">
                        <AlertCircle className="text-primary" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight text-text-primary">Reset Password</h1>
                    <p className="text-text-secondary text-sm font-medium">Enter your email to receive a reset link</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Email</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-surface-bright border border-border-bright rounded-xl pl-12 pr-4 py-4 text-sm text-text-primary focus:outline-none focus:border-primary/50 transition-all font-medium"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold mt-2" disabled={isSubmitting}>
                      {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="w-full text-[10px] font-bold text-text-primary/30 hover:text-text-primary uppercase tracking-widest transition-colors py-2"
                    >
                      Back to Sign In
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 pt-8 border-t border-border-bright space-y-6">
              <div className="flex items-center justify-center gap-2 text-text-tertiary">
                 <ShieldCheck size={16} className="text-success/40" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Your connection is secure</span>
              </div>

              <div className="flex flex-col gap-4 items-center">
                <p className="text-text-secondary text-xs font-medium">
                  Don't have an account? <Link to="/signup" className="text-primary hover:text-accent transition-colors font-bold ml-1">Create Account</Link>
                </p>
                <Link to="/" className="text-text-tertiary hover:text-text-primary transition-colors text-[10px] font-bold uppercase tracking-widest">Back to Home</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Login;
