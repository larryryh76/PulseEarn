import React, { useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import Button from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ShieldCheck, User, Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <div className="min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Background Depth */}
        <div className="absolute inset-0 -z-10">
           <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
           <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
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
                  <UserPlus className="text-primary" size={40} />
               </div>
               <h1 className="text-5xl font-bold mb-4 tracking-tight">Create Account</h1>
               <p className="text-white/40 text-lg font-medium">Join the Pulse ecosystem and start earning rewards.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 mb-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-2">Display Name</label>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="CryptoMaster"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl pl-14 pr-5 py-5 text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-2">
                     <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Invite Code</label>
                     <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Optional</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                      <ShieldCheck size={18} />
                    </div>
                    <input
                      type="text"
                      placeholder="PULSE-XXXX"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl pl-14 pr-5 py-5 text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.04] transition-all font-mono placeholder:font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-2">Network Endpoint (Email)</label>
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
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-2">Access Key (Password)</label>
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
                {isSubmitting ? 'Registering Node...' : 'Start Earning Rewards'}
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </form>

            <div className="flex flex-col gap-6 items-center">
              <p className="text-white/40 text-sm font-medium">
                Already have an account? <Link to="/login" className="text-primary hover:text-accent transition-colors font-bold ml-1">Log in</Link>
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

export default Signup;
