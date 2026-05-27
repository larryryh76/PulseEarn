import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Users,
  Share2,
  Copy,
  TrendingUp,
  UserPlus,
  Trophy,
  ArrowRight,
  Zap,
  Globe,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

const Invite: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) return null;

  const copyInvite = () => {
    const inviteLink = `${window.location.origin}/signup?ref=${userData.referralCode}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Invite link copied');
  };

  const inviteStats = [
    { label: 'Network Size', val: userData.stats?.referralsCount || '0', icon: Users },
    { label: 'Growth Yield', val: '0 PTS', icon: Zap },
    { label: 'Ecosystem Bonus', val: '+0%', icon: TrendingUp },
  ];

  const referralSteps = [
    { title: 'Invite Friends', desc: 'Share your unique identity code.', icon: Share2 },
    { title: 'They Join', desc: 'Friends create their account.', icon: UserPlus },
    { title: 'Earn Rewards', desc: 'Receive 10% of their earnings.', icon: Trophy },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-32">

        {/* HEADER: GROWTH PERFORMANCE */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
           <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                 <Globe size={16} />
                 <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Network Performance</p>
              </div>
              <div className="space-y-1">
                 <h1 className="text-display text-white">Expand.</h1>
                 <p className="text-2xl font-medium text-white/30 tracking-tight uppercase">
                    Build your rewards network.
                 </p>
              </div>
           </div>

           <div className="w-full md:w-80">
              <div className="surface-2 p-6 space-y-4">
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Referral Identity</p>
                    <p className="text-2xl font-mono font-bold text-white tracking-tighter leading-none">{userData.referralCode}</p>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={copyInvite} className="btn-primary flex-1 h-11 flex items-center justify-center gap-2">
                       <Copy size={14} />
                       <span>Copy Link</span>
                    </button>
                    <button onClick={copyInvite} className="btn-secondary w-12 h-11 flex items-center justify-center p-0">
                       <Share2 size={16} />
                    </button>
                 </div>
              </div>
           </div>
        </header>

        {/* PERFORMANCE MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {inviteStats.map((stat, i) => (
             <div key={i} className="surface-1 p-8 interactive group">
                <div className="flex items-center gap-6">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <stat.icon size={22} />
                   </div>
                   <div className="space-y-1">
                      <p className="text-2xl font-mono font-bold text-white tracking-tighter">{stat.val}</p>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{stat.label}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* GROWTH STRATEGY & LOG */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
           <div className="lg:col-span-8 space-y-8">
              <div className="px-2">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Growth Strategy</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {referralSteps.map((step, i) => (
                  <div key={i} className="surface-1 p-8 space-y-6">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20">
                      <step.icon size={20} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-[15px] font-bold text-white uppercase tracking-tight leading-none">{step.title}</h4>
                      <p className="text-[11px] text-white/30 font-medium uppercase tracking-tighter leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-1 p-8 md:p-10 space-y-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full -mr-32 -mt-32" />
                 <div className="flex justify-between items-end relative z-10">
                    <div className="space-y-2">
                       <h4 className="text-2xl font-bold text-white uppercase tracking-tight">Milestones</h4>
                       <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Network Rewards Scaling</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-primary uppercase">Tier 1 ACTIVE</span>
                 </div>
                 <div className="space-y-5 relative z-10">
                    <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                       <div className="h-full w-[5%] bg-primary" />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-white/10 uppercase tracking-widest">
                       <span>0 Invites</span>
                       <span className="text-white/30">10 invites required for Tier 2</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-8">
              <div className="px-2">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Performance Log</p>
              </div>
              <div className="surface-2 p-10 flex flex-col items-center justify-center text-center gap-8 min-h-[400px]">
                 <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/5">
                   <BarChart3 size={32} />
                 </div>
                 <div className="space-y-3">
                   <p className="text-xl font-bold text-white uppercase tracking-tight leading-none">Registry Empty</p>
                   <p className="text-[11px] text-white/20 font-bold uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">Network activity signals will appear here.</p>
                 </div>
                 <button onClick={copyInvite} className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.4em] hover:underline">
                   Initiate Invite <ArrowRight size={14} />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Invite;
