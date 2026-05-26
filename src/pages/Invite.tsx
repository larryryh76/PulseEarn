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
  Zap,
  Globe,
  PieChart,
  BarChart3
} from 'lucide-react';
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
    { label: 'Network Size', val: userData.stats?.referralsCount || '0', icon: Users, color: 'text-primary' },
    { label: 'Growth Rewards', val: '0 PTS', icon: Zap, color: 'text-primary' },
    { label: 'Ecosystem Bonus', val: '+0%', icon: TrendingUp, color: 'text-primary' },
  ];

  const referralSteps = [
    { title: 'Invite Friends', desc: 'Share your unique invite link.', icon: Share2 },
    { title: 'They Join', desc: 'Friends create their account.', icon: UserPlus },
    { title: 'Earn Rewards', desc: 'Receive 10% of their earnings.', icon: Trophy },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-16 pb-32">

        {/* GROWTH PERFORMANCE HERO */}
        <section>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-accent/10 rounded-[3rem] blur-2xl opacity-30" />
            <Card className="p-0 border-white/10 bg-black overflow-hidden relative rounded-[3rem] shadow-2xl">
               <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/[0.03] blur-[120px] rounded-full -mr-32" />

               <div className="p-10 md:p-16 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
                  <div className="space-y-8 flex-1">
                     <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.3em]">
                        <Globe size={14} />
                        Growth Performance Center
                     </div>
                     <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white uppercase leading-[0.85]">
                        Build Your <br />
                        <span className="text-white/20">Network.</span>
                     </h1>
                     <p className="text-white/40 text-lg font-medium tracking-tight max-w-md leading-relaxed uppercase">
                        Grow the PulseEarn ecosystem and earn persistent rewards on every mission your network completes.
                     </p>
                  </div>

                  <div className="w-full lg:w-[450px] space-y-6">
                     <div className="p-10 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-8 relative overflow-hidden group/card">
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                        <div className="space-y-2 relative z-10">
                           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Your Referral ID</p>
                           <p className="text-4xl font-mono font-bold text-white tracking-tighter">{userData.referralCode}</p>
                        </div>
                        <div className="flex gap-4 relative z-10">
                           <button onClick={copyInvite} className="flex-1 py-5 rounded-2xl bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-3">
                              <Copy size={16} /> Copy Link
                           </button>
                           <button onClick={copyInvite} className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                              <Share2 size={20} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </Card>
          </div>
        </section>

        {/* PERFORMANCE MATRIX */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {inviteStats.map((stat, i) => (
            <div key={i} className="p-10 rounded-[2.5rem] bg-black border border-white/5 flex items-center gap-8 group hover:border-primary/40 transition-all shadow-xl">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/[0.02] border border-white/5 text-primary shadow-2xl group-hover:scale-110 transition-transform">
                <stat.icon size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-mono font-bold text-white tracking-tighter">{stat.val}</p>
                <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.3em]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* GROWTH STRATEGY */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           <div className="lg:col-span-8 space-y-10">
              <div className="flex items-center gap-3 px-2">
                 <PieChart size={18} className="text-primary" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Growth Strategy</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {referralSteps.map((step, i) => (
                  <div key={i} className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-6 hover:bg-white/[0.02] transition-colors">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                      <step.icon size={26} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-lg font-bold text-white uppercase tracking-tight leading-none">{step.title}</h4>
                      <p className="text-[11px] text-white/30 font-bold uppercase tracking-tighter leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Milestone Visualization (Placeholder for now) */}
              <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-[#0A0A12] to-black border border-white/5 space-y-8">
                 <div className="flex justify-between items-end">
                    <div className="space-y-2">
                       <h4 className="text-2xl font-bold text-white uppercase tracking-tight">Growth Milestones</h4>
                       <p className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Network Rewards Escalation</p>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-primary uppercase">Tier 1 Active</span>
                 </div>
                 <div className="space-y-6">
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full w-[10%] bg-primary shadow-[0_0_15px_rgba(0,102,255,0.4)]" />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-white/10 uppercase tracking-widest">
                       <span>0 Referrals</span>
                       <span className="text-white/30">10 Referrals Required</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-4 space-y-10">
              <div className="flex items-center gap-3 px-2">
                 <BarChart3 size={18} className="text-primary" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Performance Log</h3>
              </div>
              <Card className="p-10 border-white/5 bg-black rounded-[2.5rem] flex flex-col items-center justify-center text-center gap-8 min-h-[400px] shadow-2xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full translate-y-32" />
                 <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/5 relative z-10">
                   <Shield size={40} />
                 </div>
                 <div className="space-y-3 relative z-10">
                   <p className="text-xl font-bold text-white uppercase tracking-tight leading-none">Activity Log Empty</p>
                   <p className="text-[11px] text-white/20 font-bold uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">Network activity will appear here once your invites join.</p>
                 </div>
                 <button onClick={copyInvite} className="relative z-10 flex items-center gap-3 text-primary font-bold text-[10px] uppercase tracking-[0.4em] pt-4 group">
                   Invite Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                 </button>
              </Card>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Invite;
