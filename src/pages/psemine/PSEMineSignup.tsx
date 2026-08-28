import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, User, Mail, Lock, Zap, ArrowRight, Eye, EyeOff, Loader2, Pickaxe } from 'lucide-react';
import { motion } from 'framer-motion';
import { mapAuthError } from '../../utils/errors';

export const PSEMineSignup: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setFormData(prev => ({ ...prev, referralCode: ref }));
    }
  }, [searchParams]);

  const passwordStrength = useMemo(() => {
    const pass = formData.password;
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password) {
      return toast.error('Please fill in all required fields.');
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match.');
    }
    if (passwordStrength < 50) {
      return toast.error('Please use a stronger password.');
    }

    try {
      setIsSubmitting(true);
      // PSEmine explicit product access: pulseearn: false, psemine: true
      await signup(
        formData.email,
        formData.password,
        formData.username,
        formData.referralCode,
        { pulseearn: false, psemine: true }
      );
      toast.success('PSEmine account created! Deploy your capacity nodes now.');
      navigate('/mine/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(mapAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsSubmitting(true);
      const ref = searchParams.get('ref') || undefined;
      await signInWithGoogle(ref, { pulseearn: false, psemine: true });
      toast.success('PSEmine account created!');
      navigate('/mine/dashboard');
    } catch (error: any) {
      let message = 'An unexpected error occurred.';
      if (error.code === 'auth/unauthorized-domain') {
        message = 'Google login is temporarily unavailable. Use email instead.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in window closed. Please try again.';
      } else {
        message = mapAuthError(error);
      }
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex items-center justify-center px-6 py-20 relative overflow-hidden font-sans">
      {/* Background ambient light */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[35rem] h-[30rem] bg-blue-600/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[30rem] bg-cyan-500/5 rounded-full blur-[160px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-[#0D131F] border border-blue-500/20 p-8 md:p-12 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-blue-950/40">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-600" />

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4 text-blue-400 shadow-lg shadow-blue-500/20">
              <Pickaxe size={32} />
            </div>
            <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase bg-cyan-950/60 border border-cyan-800/40 px-3 py-1 rounded-full mb-3">
              90-Day Campaign Portal
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Create PSEmine Account</h1>
            <p className="text-slate-400 text-xs mt-1">Initialize your 90-day campaign capacity node</p>
          </div>

          <div className="space-y-4 mb-6">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-slate-900 border border-slate-700/60 hover:border-slate-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4" />
              Sign up with Google
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
              <span className="relative px-3 bg-[#0D131F] text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Or Email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-400 ml-1">Username</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="username"
                  placeholder="Miner Call-sign"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-400 ml-1">Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-400 ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-12 pr-12 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repeat password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium placeholder:text-slate-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-400">Referral Code</label>
                <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest">Optional</span>
              </div>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <ShieldCheck size={18} />
                </div>
                <input
                  type="text"
                  name="referralCode"
                  placeholder="PULSE-XXXX"
                  value={formData.referralCode}
                  onChange={handleChange}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-mono uppercase placeholder:normal-case placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Initializing Node...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Initialize PSEmine Profile
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center space-y-3">
            <p className="text-slate-400 text-xs">
              Already registered for PSEmine?{' '}
              <Link to="/login" className="text-cyan-400 font-bold hover:underline">
                Sign In
              </Link>
            </p>
            <div>
              <Link to="/mine" className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-widest">
                Return to PSEmine Overview
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
