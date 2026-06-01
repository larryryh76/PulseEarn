import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  User as UserIcon,
  Settings,
  ShieldCheck,
  Mail,
  MapPin,
  Calendar,
  LogOut,
  TrendingUp,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { loading } = useTasks();
  const [hasCopied, setHasCopied] = useState(false);

  const copyReferral = () => {
    if (!userData?.referralCode) return;
    navigator.clipboard.writeText(userData.referralCode);
    setHasCopied(true);
    toast.success('Referral code copied');
    setTimeout(() => setHasCopied(false), 2000);
  };

  if (loading) return <MainLayout><div className="pt-32 px-6 max-w-4xl mx-auto animate-pulse">
    <div className="w-32 h-32 rounded-full bg-white/5 mx-auto mb-8" />
    <div className="h-8 w-64 bg-white/5 mx-auto rounded" />
  </div></MainLayout>;

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative inline-block mb-6"
          >
            <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 p-1">
              <div className="w-full h-full rounded-[1.8rem] bg-surface overflow-hidden border border-border">
                <img
                  src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-success text-black p-1.5 rounded-full border-4 border-background">
              <ShieldCheck size={16} />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl mb-2"
          >
            {userData?.username || 'Operator'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="data-label text-text-secondary"
          >
            Level {userData?.level || 1} System Member
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Account Details */}
          <section className="system-card">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <UserIcon size={16} />
              Identity Signals
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-text-secondary" />
                  <span className="text-xs text-text-secondary font-medium">Email</span>
                </div>
                <span className="text-xs font-bold text-white">{userData?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-text-secondary" />
                  <span className="text-xs text-text-secondary font-medium">Registered</span>
                </div>
                <span className="text-xs font-bold text-white">{userData?.createdAt?.toDate().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-text-secondary" />
                  <span className="text-xs text-text-secondary font-medium">Region</span>
                </div>
                <span className="badge-system">Global</span>
              </div>
            </div>
          </section>

          {/* Referral System */}
          <section className="system-card bg-primary/5 border-primary/20">
            <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
              <Share2 size={16} />
              Growth Signal
            </h2>
            <p className="text-xs text-text-secondary mb-8">Share your deployment code and earn 1,000 PTS for every new operator onboarded.</p>

            <div className="relative group">
              <input
                readOnly
                value={userData?.referralCode || 'NOT_GEN'}
                className="w-full bg-black/40 border-border pr-12 font-mono text-sm tracking-wider"
              />
              <button
                onClick={copyReferral}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
              >
                {hasCopied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-border/50 flex justify-between items-baseline">
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Successful Invites</p>
                <p className="text-2xl font-mono font-bold text-white mt-1">{userData?.stats?.referralsCount || 0}</p>
              </div>
              <TrendingUp size={24} className="text-primary opacity-40" />
            </div>
          </section>
        </div>

        {/* Global Settings Preview */}
        <section className="system-card mb-12">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
            <Settings size={16} />
            System Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl">
              <div>
                <p className="text-sm font-medium">Notification Feed</p>
                <p className="text-[10px] text-text-secondary uppercase mt-1">Real-time mission alerts</p>
              </div>
              <div className="w-10 h-6 bg-primary rounded-full relative p-1 cursor-pointer">
                <div className="absolute right-1 top-1 bottom-1 w-4 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl">
              <div>
                <p className="text-sm font-medium">Performance Analytics</p>
                <p className="text-[10px] text-text-secondary uppercase mt-1">Anonymous telemetry</p>
              </div>
              <div className="w-10 h-6 bg-primary rounded-full relative p-1 cursor-pointer">
                <div className="absolute right-1 top-1 bottom-1 w-4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <div className="flex justify-center pt-8 border-t border-border">
          <button
            onClick={() => { logout(); }}
            className="flex items-center gap-2 px-8 py-3 text-danger border border-danger/20 rounded-xl hover:bg-danger/5 transition-all font-bold text-[11px] uppercase tracking-[0.2em]"
          >
            <LogOut size={16} />
            Terminate Session
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
