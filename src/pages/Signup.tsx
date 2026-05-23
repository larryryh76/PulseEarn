import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, User, Mail, Lock, UserPlus } from 'lucide-react';

const Signup: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleProtocolError = (error: any) => {
    const code = error.code || '';
    if (code === 'auth/email-already-in-use') return 'This email node is already registered.';
    if (code === 'auth/weak-password') return 'Security magnitude insufficient. Use a stronger password.';
    if (code === 'auth/invalid-email') return 'Invalid endpoint address (Email).';
    if (code === 'auth/network-request-failed') return 'Oracle sync failed. Check your network.';
    return 'Protocol error detected. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !username) {
      return toast.error('Required parameters missing.');
    }

    try {
      setIsSubmitting(true);
      await signup(email, password, username, referralCode);
      toast.success('Node successfully registered to PulseEarn!');
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
      <div className="min-h-[90vh] flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] border-white/[0.08] text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />

          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-[0_0_20px_rgba(0,112,255,0.2)]">
             <UserPlus className="text-primary" size={32} />
          </div>

          <h1 className="text-4xl font-bold mb-4 tracking-tight">Initialize Node</h1>
          <p className="text-white/40 mb-10 text-sm font-medium">Join the PulseEarn ecosystem to begin extraction.</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-8 text-left">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Alias</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="CryptoMaster"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Endpoint (Email)</label>
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
              <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-1">Auth Code (Password)</label>
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

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                 <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Invite Token</label>
                 <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">(Optional)</span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                  <ShieldCheck size={18} />
                </div>
                <input
                  type="text"
                  placeholder="PULSE-XXXXXX"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-primary/50 transition-all font-mono placeholder:font-sans"
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-6 py-5 rounded-2xl shadow-[0_15px_30px_rgba(0,112,255,0.2)]" disabled={isSubmitting} glow>
              {isSubmitting ? 'Registering Node...' : 'Initialize Session'}
            </Button>
          </form>

          <div className="flex flex-col gap-4 items-center">
            <p className="text-white/40 text-[13px] font-medium">
              Existing node session? <Link to="/login" className="text-primary hover:underline font-bold">Login</Link>
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

export default Signup;
