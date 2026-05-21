import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import {
  TrendingUp,
  Zap,
  Crown,
  Gift,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Star,
  Timer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';

const Earn: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) return null;

  const featuredOpportunities = [
    {
      title: 'Yield Multiplier x1.5',
      desc: 'Boost all task rewards for 24 hours',
      reward: 'Boost Active',
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
      status: 'Active'
    },
    {
      title: 'Watch & Earn Pro',
      desc: 'Watch premium streams for high yield',
      reward: '+250 PTS',
      icon: Timer,
      color: 'text-accent',
      bg: 'bg-accent/10',
      status: 'Unlocked'
    },
  ];

  const multipliers = [
    { label: 'Referral Bonus', val: '+10%', icon: Star, color: 'text-yellow-500' },
    { label: 'Streak Bonus', val: '+5%', icon: Zap, color: 'text-orange-500' },
    { label: 'Level Bonus', val: '+2%', icon: Crown, color: 'text-primary' },
  ];

  return (
    <DashboardLayout>
      {/* "Money Room" Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-0 border-white/[0.05] bg-gradient-to-br from-[#0D0D12] to-[#1A1A26] overflow-hidden relative group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.15),transparent_70%)]" />

          <div className="p-10 relative z-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(0,112,255,0.2)] mb-6">
              <Crown className="text-primary" size={32} />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">The Reward Hub</h1>
            <p className="text-white/40 text-sm max-w-lg mb-10 leading-relaxed">
              Scale your Pulse holdings with premium earning opportunities and ecosystem multipliers.
            </p>

            <div className="grid grid-cols-3 gap-8 w-full max-w-2xl border-t border-white/[0.05] pt-10">
              {multipliers.map((m, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <m.icon size={18} className={m.color} />
                  <span className="text-xl font-mono font-bold text-white">{m.val}</span>
                  <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Featured Opportunities */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Featured Opportunities</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featuredOpportunities.map((opp, i) => (
            <Card key={i} className="p-6 border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] transition-all group cursor-pointer relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                 <opp.icon size={80} className={opp.color} />
               </div>

               <div className="flex flex-col gap-5 relative z-10">
                 <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.05]", opp.bg)}>
                   <opp.icon className={opp.color} size={24} />
                 </div>

                 <div>
                   <h3 className="font-bold text-lg mb-1">{opp.title}</h3>
                   <p className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{opp.desc}</p>
                 </div>

                 <div className="flex items-center justify-between mt-2 pt-5 border-t border-white/[0.03]">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Expected Reward</span>
                     <span className={cn("text-base font-mono font-bold", opp.color)}>{opp.reward}</span>
                   </div>
                   <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-primary transition-all">
                     <ChevronRight size={18} className="text-white/20 group-hover:text-white" />
                   </div>
                 </div>
               </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Boosted Earning Section */}
      <div className="mb-12">
        <Card className="p-8 border-primary/20 bg-primary/[0.02] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(0,112,255,0.1),transparent_50%)]" />
           <div className="flex items-center gap-6 relative z-10">
             <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border-2 border-primary/40 shadow-[0_0_20px_rgba(0,112,255,0.3)]">
               <Zap className="text-primary animate-pulse" size={32} />
             </div>
             <div>
               <h3 className="text-2xl font-bold mb-2 tracking-tight">Ecosystem Boost</h3>
               <p className="text-white/40 text-sm font-medium">Join the Pulse Protocol Liquidity task to earn 2x multipliers on all social tasks.</p>
             </div>
           </div>
           <button className="px-8 py-3 rounded-2xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_10px_30px_rgba(0,112,255,0.4)] relative z-10 flex items-center gap-2">
             Activate Boost
             <ArrowUpRight size={16} />
           </button>
        </Card>
      </div>

      {/* Rewards Grid Placeholder */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-white/10 rounded-full" />
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Monetization Center</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Ads Reveal', icon: ShieldCheck, color: 'text-green-500' },
            { label: 'Survey Flow', icon: Gift, color: 'text-purple-500' },
            { label: 'Social Sync', icon: Zap, color: 'text-primary' },
            { label: 'Pulse Staking', icon: TrendingUp, color: 'text-accent' }
          ].map((item, i) => (
            <Card key={i} className="p-6 flex flex-col items-center justify-center gap-4 text-center group cursor-not-allowed opacity-40 grayscale border-white/[0.03] bg-white/[0.01]">
               <item.icon size={24} className={item.color} />
               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{item.label}</p>
               <span className="text-[8px] font-bold text-white/20 bg-white/5 px-2 py-0.5 rounded uppercase">Coming Soon</span>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Earn;
