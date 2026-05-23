import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

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
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] border-white/[0.08] text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_20px_rgba(0,112,255,0.2)]">
             <LogIn className="text-primary" size={32} />
          </div>

          <h1 className="text-4xl font-bold mb-4 tracking-tight">Access Terminal</h1>
          <p className="text-white/40 mb-10 text-sm font-medium">Synchronize your node with the PulseEarn grid.</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8 text-left">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Node Identifier (Email)</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  placeholder="node@protocol.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                 <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Auth Code</label>
                 <button type="button" className="text-[9px] font-bold text-primary hover:underline uppercase tracking-widest">Lost Code?</button>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-6 py-5 rounded-2xl shadow-[0_15px_30px_rgba(0,112,255,0.2)]" disabled={isSubmitting} glow>
              {isSubmitting ? 'Verifying Session...' : 'Establish Connection'}
            </Button>
          </form>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3 text-left mb-8">
             <AlertCircle className="text-primary shrink-0" size={16} />
             <p className="text-[10px] text-primary/60 leading-relaxed font-bold uppercase tracking-tight">
               By accessing the terminal, you agree to the PulseEarn protocol security standards.
             </p>
          </div>

          <div className="flex flex-col gap-4 items-center">
            <p className="text-white/40 text-[13px] font-medium">
              New node identity? <Link to="/signup" className="text-primary hover:underline font-bold">Register</Link>
            </p>
            <div className="pt-6 border-t border-white/[0.05] w-full">
              <Link to="/" className="text-white/20 hover:text-white transition-colors text-xs font-bold uppercase tracking-[0.2em]">Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Login;
