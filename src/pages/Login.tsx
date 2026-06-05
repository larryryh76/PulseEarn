import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import Button from '../components/ui/Button';
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

  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

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
          <div className="glass-card p-8 md:p-12 rounded-[2.5rem] border-white/[0.08] shadow-2xl relative overflow-hidden">
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
                    <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">Welcome Back</h1>
                    <p className="text-white/40 text-sm font-medium">Sign in to your PulseEarn account</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Email</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center px-1">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Password</label>
                         <button
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-[10px] font-bold text-primary hover:text-accent uppercase tracking-widest transition-colors"
                         >
                            Forgot Password?
                         </button>
                      </div>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-12 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold mt-2" disabled={isSubmitting} glow>
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
                    <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">Reset Password</h1>
                    <p className="text-white/40 text-sm font-medium">Enter your email to receive a reset link</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Email</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold mt-2" disabled={isSubmitting} glow>
                      {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
                    </Button>

                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="w-full text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-widest transition-colors py-2"
                    >
                      Back to Sign In
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 pt-8 border-t border-white/[0.05] space-y-6">
              <div className="flex items-center justify-center gap-2 text-white/20">
                 <ShieldCheck size={16} className="text-success/40" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Your connection is secure</span>
              </div>

              <div className="flex flex-col gap-4 items-center">
                <p className="text-white/40 text-xs font-medium">
                  Don't have an account? <Link to="/signup" className="text-primary hover:text-accent transition-colors font-bold ml-1">Create Account</Link>
                </p>
                <Link to="/" className="text-white/20 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">Back to Home</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Login;
