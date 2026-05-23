import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleProtocolError = (error: any) => {
    const code = error.code || '';
    if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return 'Incorrect credentials. Node access denied.';
    }
    if (code === 'auth/user-disabled') return 'Account node has been suspended.';
    if (code === 'auth/too-many-requests') return 'Too many failed attempts. Protocol locked.';
    return 'Authentication failure. Please verify network status.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      return toast.error('Required parameters missing.');
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      toast.success('Secure session established.');
      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(handleProtocolError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Background Depth */}
        <div className="absolute inset-0 -z-10">
           <div className="absolute top-1/4 right-1/4 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-[140px]" />
           <div className="absolute bottom-1/4 left-1/4 w-[30rem] h-[30rem] bg-secondary/5 rounded-full blur-[140px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full"
        >
          <div className="glass-card p-12 rounded-[3rem] border-white/[0.08] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

            <div className="flex flex-col items-center text-center mb-12">
               <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(0,112,255,0.2)]">
                  <LogIn className="text-primary" size={40} />
               </div>
               <h1 className="text-5xl font-bold mb-4 tracking-tight">Welcome Back</h1>
               <p className="text-white/40 text-lg font-medium">Continue your journey into the Pulse ecosystem.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 mb-10">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-2">Node Identifier (Email)</label>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="node@protocol.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl pl-14 pr-5 py-5 text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-2">
                   <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Access Key (Password)</label>
                   <button type="button" className="text-[9px] font-bold text-primary hover:text-accent uppercase tracking-widest transition-colors">Lost Code?</button>
                </div>
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl pl-14 pr-5 py-5 text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-6 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,112,255,0.25)] text-sm uppercase tracking-[0.2em] font-bold" disabled={isSubmitting} glow>
                {isSubmitting ? 'Verifying Session...' : 'Access Ecosystem Wallet'}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </form>

            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex gap-4 text-left mb-10">
               <AlertCircle className="text-primary shrink-0 mt-0.5" size={18} />
               <p className="text-[11px] text-primary/70 leading-relaxed font-bold uppercase tracking-tight">
                 Session integrity monitored by institutional-grade protocol protection.
               </p>
            </div>

            <div className="flex flex-col gap-6 items-center">
              <p className="text-white/40 text-sm font-medium">
                New node identity? <Link to="/signup" className="text-primary hover:text-accent transition-colors font-bold ml-1">Register</Link>
              </p>
              <div className="pt-8 border-t border-white/[0.05] w-full text-center">
                <Link to="/" className="text-white/20 hover:text-white transition-colors text-xs font-bold uppercase tracking-[0.3em]">Return to Protocol Home</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Login;
