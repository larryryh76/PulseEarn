import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import {
  Users,
  Share2,
  Copy,
  TrendingUp,
  UserPlus,
  Trophy,
  ArrowRight,
  Shield,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';

const Invite: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) return null;

  const copyInvite = () => {
    const inviteLink = `${window.location.origin}/signup?ref=${userData.referralCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied!');
  };

  const inviteStats = [
    { label: 'Referrals', val: '0', icon: Users, color: 'text-primary' },
    { label: 'Earnings', val: '0 PTS', icon: Zap, color: 'text-yellow-500' },
    { label: 'Bonus', val: '+0%', icon: TrendingUp, color: 'text-green-500' },
  ];

  const referralSteps = [
    { title: 'Share Code', desc: 'Invite friends to PulseEarn.', icon: Share2 },
    { title: 'They Join', desc: 'They create an account.', icon: UserPlus },
    { title: 'Earn Points', desc: 'Get 10% of their rewards.', icon: Trophy },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Invite Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-0 border-white/[0.05] bg-gradient-to-br from-[#0D0D12] to-[#12121A] overflow-hidden relative rounded-3xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full -mr-16 -mt-16" />

            <div className="p-6 md:p-10 relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-widest">
                  <Users size={12} />
                  Referral Program
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">Grow Your Network,<br />Earn Passive Points.</h1>
                <p className="text-white/40 text-xs md:text-sm max-w-md leading-relaxed">
                  Earn 10% of all rewards collected by people you invite.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                   <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                     <div className="flex flex-col">
                       <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Your Code</span>
                       <span className="text-sm font-mono font-bold text-white">{userData.referralCode}</span>
                     </div>
                     <button onClick={copyInvite} className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-lg active:scale-95 transition-all">
                       <Copy size={14} className="text-white" />
                     </button>
                   </div>
                   <button onClick={copyInvite} className="px-6 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2">
                     <Share2 size={14} />
                     Share Link
                   </button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Referral Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {inviteStats.map((stat, i) => (
            <Card key={i} className="p-5 border-white/[0.03] bg-white/[0.01] flex items-center gap-4 rounded-2xl">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.05]", stat.color.replace('text-', 'bg-') + '/10')}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{stat.label}</p>
                <p className="text-lg font-mono font-bold text-white">{stat.val}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* How it works */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-white/20 rounded-full" />
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {referralSteps.map((step, i) => (
              <div key={i} className="flex gap-4 md:flex-col md:items-start">
                 <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-primary shrink-0">
                   <step.icon size={20} />
                 </div>
                 <div className="space-y-1">
                   <h3 className="font-bold text-sm">{step.title}</h3>
                   <p className="text-white/40 text-xs font-medium leading-relaxed">{step.desc}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* List Placeholder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary/40 rounded-full" />
              <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Your Referrals</h2>
            </div>
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Active: 0</span>
          </div>
          <Card className="p-10 border-white/[0.03] bg-white/[0.01] flex flex-col items-center justify-center text-center gap-3 rounded-2xl">
             <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/10">
               <Shield size={24} />
             </div>
             <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">No referrals yet</p>
             <button onClick={copyInvite} className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
               Share Your Link
               <ArrowRight size={12} />
             </button>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Invite;
