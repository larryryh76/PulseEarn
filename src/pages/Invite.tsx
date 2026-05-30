import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Users,
  Share2,
  Copy,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Zap,
  ShieldCheck,
  Award,
  History,
  UserPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils';

const Invite: React.FC = () => {
  const { userData } = useAuth();
  const [copied, setCopying] = useState(false);

  if (!userData) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userData.referralCode);
    setCopying(true);
    toast.success('Referral code authorized to clipboard');
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in">

        {/* Growth Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.05] pb-10">
           <div className="space-y-1">
              <h2 className="section-label">Referral System</h2>
              <h1 className="text-4xl font-bold tracking-tight text-glow">Network Expansion</h1>
              <p className="text-sm text-white/40 font-medium max-w-md pr-12">
                 Scale the PulseEarn ecosystem by onboarding verified participants and secure tiered yield rewards.
              </p>
           </div>

           <div className="flex items-center gap-4">
              <div className="px-5 py-3 glass-panel rounded-2xl flex items-center gap-3">
                 <Award size={16} className="text-primary" />
                 <span className="text-[10px] font-bold uppercase tracking-widest">Growth Tier: Genesis</span>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

           {/* Referral Command Center (8 cols) */}
           <div className="lg:col-span-8 space-y-10">

              {/* Code Generation Card */}
              <div className="glass-panel p-10 rounded-[3rem] border-white/10 relative overflow-hidden group shadow-2xl">
                 <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                    <UserPlus size={160} />
                 </div>

                 <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                          <Share2 size={20} />
                       </div>
                       <h3 className="text-xl font-bold tracking-tight">Authority Link</h3>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch gap-4">
                       <div className="flex-1 bg-black/40 border border-white/5 rounded-[2rem] px-8 py-6 flex items-center justify-between group/code hover:border-primary/30 transition-colors">
                          <div>
                             <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-1">Unique Identifier</p>
                             <p className="text-2xl font-bold font-mono tracking-wider">{userData.referralCode}</p>
                          </div>
                          <ShieldCheck size={24} className="text-emerald-500 opacity-20" />
                       </div>
                       <button
                         onClick={copyToClipboard}
                         className="btn-primary flex items-center justify-center gap-3 px-10 rounded-[2rem]"
                       >
                          {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                          <span className="font-black">Copy Code</span>
                       </button>
                    </div>

                    <p className="text-xs text-white/30 font-medium leading-relaxed max-w-xl">
                       Distribute your unique authorization code to potential participants. Both entities will receive yield distributions upon successful account activation and mission completion.
                    </p>
                 </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'Total Affiliates', val: userData.stats?.referralsCount || 0, icon: Users, color: 'primary' },
                   { label: 'Pending Rewards', val: '0 PTS', icon: Zap, color: 'primary' },
                   { label: 'Network Conversion', val: '0.0%', icon: TrendingUp, color: 'emerald-500' },
                 ].map((stat, i) => (
                    <div key={i} className="glass-panel p-8 rounded-[2.5rem] space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{stat.label}</span>
                          <stat.icon size={16} className={cn(stat.color === 'primary' ? 'text-primary' : 'text-emerald-500', 'opacity-50')} />
                       </div>
                       <h2 className="text-3xl font-bold font-mono tracking-tighter">{stat.val}</h2>
                    </div>
                 ))}
              </div>

              {/* Referral Timeline */}
              <div className="space-y-6 pt-6">
                 <div className="flex items-center justify-between pr-4">
                    <div className="flex items-center gap-3">
                       <History size={18} className="text-primary" />
                       <h3 className="text-xl font-bold tracking-tight">Onboarding Logs</h3>
                    </div>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors">Export Logs</button>
                 </div>

                 <div className="p-16 text-center glass-panel rounded-[3rem] border-white/5 border-dashed">
                    <Users size={48} className="mx-auto mb-6 opacity-5" />
                    <h4 className="text-lg font-bold opacity-30">No Network History Identified</h4>
                    <p className="text-sm opacity-10 mt-2">Deploy your authority code to begin expanding your network.</p>
                 </div>
              </div>
           </div>

           {/* Rewards Logic sidebar (4 cols) */}
           <div className="lg:col-span-4 space-y-10">

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-8">
                 <div className="flex items-center gap-3 pr-10">
                    <Zap size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Yield Structure</h4>
                 </div>

                 <div className="space-y-6">
                    {[
                      { step: '01', title: 'Invite Agent', desc: 'Distribute your code to new ecosystem participants.' },
                      { step: '02', title: 'Verification', desc: 'Referee completes account authorization and security setup.' },
                      { step: '03', title: 'Activation', desc: 'Distribution released after referee completes 5 marketplace missions.' }
                    ].map((step, i) => (
                       <div key={i} className="flex gap-4 group">
                          <span className="text-xl font-black font-mono text-primary/20 group-hover:text-primary transition-colors">{step.step}</span>
                          <div className="space-y-1">
                             <h5 className="text-sm font-bold text-white/80">{step.title}</h5>
                             <p className="text-xs text-white/40 leading-relaxed pr-4 font-medium">{step.desc}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 bg-emerald-500/[0.01] border-emerald-500/10">
                 <h4 className="text-base font-bold text-emerald-500/80">Tiered Growth Program</h4>
                 <div className="space-y-4">
                    <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-3">
                       <p className="text-xs font-medium text-white/50 leading-relaxed">
                          Onboard 10+ participants to unlock <span className="text-emerald-400 font-bold">Elite Growth Tier</span>: +25% bonus on all referral yield distributions.
                       </p>
                       <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest pt-2">
                          <span className="text-emerald-500">Progress</span>
                          <span className="text-white/20">0 / 10</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/40 w-0" />
                       </div>
                    </div>

                    <button className="w-full btn-secondary py-4 group">
                       <div className="flex items-center justify-center gap-2 text-[10px]">
                          <span>Program Documentation</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                       </div>
                    </button>
                 </div>
              </div>

           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Invite;
