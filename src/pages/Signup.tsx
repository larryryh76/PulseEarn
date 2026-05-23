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
    if (code === 'auth/email-already-in-use') return 'This email is already registered.';
    if (code === 'auth/weak-password') return 'Password is too weak. Please use a stronger one.';
    if (code === 'auth/invalid-email') return 'Invalid email address.';
    if (code === 'auth/network-request-failed') return 'Network error. Please check your connection.';
    return 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !username) {
      return toast.error('Please fill in all required fields.');
    }

    try {
      setIsSubmitting(true);
      await signup(email, password, username, referralCode);
      toast.success('Welcome to PulseEarn!');
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
          className="max-w-md w-full"
        >
          <div className="glass-card p-8 md:p-10 rounded-3xl border-white/[0.08] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent" />

            <div className="flex flex-col items-center text-center mb-8">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-xl">
                  <UserPlus className="text-primary" size={32} />
               </div>
               <h1 className="text-3xl font-bold mb-2 tracking-tight">Join PulseEarn</h1>
               <p className="text-white/40 text-sm font-medium">Start your journey and earn rewards</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mb-8">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/30 ml-1">Display Name</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="CryptoMaster"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/30 ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-white/30 ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                   <label className="block text-[9px] font-bold uppercase tracking-widest text-white/30">Invite Code</label>
                   <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Optional</span>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors">
                    <ShieldCheck size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="PULSE-XXXX"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-mono"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full py-4 rounded-xl shadow-lg text-xs uppercase tracking-widest font-bold" disabled={isSubmitting} glow>
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </form>

            <div className="flex flex-col gap-6 items-center">
              <p className="text-white/40 text-xs font-medium">
                Already have an account? <Link to="/login" className="text-primary hover:text-accent transition-colors font-bold ml-1">Log in</Link>
              </p>
              <div className="pt-6 border-t border-white/[0.05] w-full text-center">
                <Link to="/" className="text-white/20 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest">Back to Home</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
};

export default Signup;
