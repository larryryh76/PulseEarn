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
    toast.success('Invite link copied to clipboard!');
  };

  const inviteStats = [
    { label: 'Squad Members', val: '0', icon: Users, color: 'text-primary' },
    { label: 'Total Earnings', val: '0 PTS', icon: Zap, color: 'text-yellow-500' },
    { label: 'Squad Yield', val: '+0%', icon: TrendingUp, color: 'text-green-500' },
  ];

  const referralSteps = [
    { title: 'Share Code', desc: 'Send your unique link to your squad.', icon: Share2 },
    { title: 'Friends Join', desc: 'They complete their first mission.', icon: UserPlus },
    { title: 'Earn Pulse', desc: 'Get 10% of all their task rewards.', icon: Trophy },
  ];

  return (
    <DashboardLayout>
      {/* Invite Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-0 border-white/[0.05] bg-gradient-to-br from-[#0D0D12] to-[#12121A] overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-20 -mt-20" />

          <div className="p-10 relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-6">
                <Users size={12} />
                Squad Program
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-4 leading-[1.1]">Grow Your Squad,<br />Earn passive Pulse.</h1>
              <p className="text-white/40 text-sm max-w-md leading-relaxed mb-8">
                Build your network on PulseEarn and get rewarded for every mission your referrals complete. No limits.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                 <div className="flex-1 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Your Code</span>
                     <span className="text-sm font-mono font-bold text-white">{userData.referralCode}</span>
                   </div>
                   <button onClick={copyInvite} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_5px_15px_rgba(0,112,255,0.3)]">
                     <Copy size={16} className="text-white" />
                   </button>
                 </div>
                 <button onClick={copyInvite} className="px-8 py-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/[0.08] transition-all flex items-center justify-center gap-2">
                   <Share2 size={16} />
                   Invite Friends
                 </button>
              </div>
            </div>

            <div className="hidden lg:flex w-72 h-72 rounded-[3rem] bg-white/[0.02] border border-white/[0.05] relative items-center justify-center">
               <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
               <Users size={120} className="text-white/[0.03]" />
               <motion.div
                 animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                 transition={{ duration: 4, repeat: Infinity }}
                 className="absolute top-1/4 left-1/4 w-12 h-12 rounded-2xl bg-primary border border-white/20 flex items-center justify-center shadow-2xl"
               >
                 <UserPlus size={24} className="text-white" />
               </motion.div>
               <motion.div
                 animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }}
                 transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
                 className="absolute bottom-1/4 right-1/4 w-16 h-16 rounded-[1.5rem] bg-accent border border-white/20 flex items-center justify-center shadow-2xl"
               >
                 <Zap size={32} className="text-white" />
               </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {inviteStats.map((stat, i) => (
          <Card key={i} className="p-6 border-white/[0.03] bg-white/[0.01] flex items-center gap-5">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/[0.05]", stat.color.replace('text-', 'bg-') + '/10')}>
              <stat.icon size={24} className={stat.color} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-mono font-bold text-white">{stat.val}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-1.5 h-5 bg-white/20 rounded-full" />
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Squad Mechanics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {referralSteps.map((step, i) => (
            <div key={i} className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
               <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-primary">
                 <step.icon size={24} />
               </div>
               <div>
                 <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                 <p className="text-white/40 text-sm font-medium">{step.desc}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Squad List Placeholder */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary/40 rounded-full" />
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Your Squad</h2>
          </div>
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Active: 0</span>
        </div>
        <Card className="p-10 border-white/[0.03] bg-white/[0.01] flex flex-col items-center justify-center text-center gap-4">
           <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/10 mb-2">
             <Shield size={32} />
           </div>
           <p className="text-sm font-bold text-white/40 uppercase tracking-widest">No squad members yet</p>
           <p className="text-xs text-white/20 max-w-[200px]">Invite your first squad member to start earning passive pulse.</p>
           <button onClick={copyInvite} className="mt-4 flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest hover:underline">
             Share Link
             <ArrowRight size={14} />
           </button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Invite;
