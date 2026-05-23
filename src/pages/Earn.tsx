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
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { useNavigate } from 'react-router-dom';

const Earn: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  if (!userData) return null;

  const featuredOpportunities = [
    {
      title: 'Daily Check-in',
      desc: 'Keep your streak alive for bigger rewards',
      reward: 'Points Ready',
      icon: Star,
      color: 'text-primary',
      bg: 'bg-primary/10',
      status: 'Ready'
    },
    {
      title: 'Task Center',
      desc: 'Complete missions to earn points',
      reward: 'Earn Now',
      icon: Zap,
      color: 'text-accent',
      bg: 'bg-accent/10',
      status: 'Unlocked'
    },
  ];

  const multipliers = [
    { label: 'Referral Bonus', val: '+10%', icon: Star, color: 'text-yellow-500' },
    { label: 'Streak Bonus', val: '+5%', icon: Zap, color: 'text-orange-500' },
    { label: 'Loyalty Bonus', val: '+2%', icon: Crown, color: 'text-primary' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-10 pb-10">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-0 border-white/[0.05] bg-gradient-to-br from-[#0D0D12] to-[#1A1A26] overflow-hidden relative group rounded-3xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.15),transparent_70%)]" />

            <div className="p-8 md:p-12 relative z-10 text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg mb-6">
                <Crown className="text-primary" size={28} />
              </div>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Rewards Center</h1>
              <p className="text-white/40 text-xs md:text-sm max-w-lg mb-8 leading-relaxed">
                Boost your daily earnings with streaks, referrals, and exclusive bonuses.
              </p>

              <div className="grid grid-cols-3 gap-4 md:gap-8 w-full max-w-xl border-t border-white/[0.05] pt-8">
                {multipliers.map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <m.icon size={16} className={m.color} />
                    <span className="text-lg font-mono font-bold text-white">{m.val}</span>
                    <span className="text-[8px] md:text-[9px] font-bold uppercase text-white/20 tracking-widest">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Featured Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Offers</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredOpportunities.map((opp, i) => (
              <Card key={i} onClick={() => navigate('/tasks')} className="p-5 md:p-6 border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] transition-all group cursor-pointer relative overflow-hidden rounded-3xl">
                 <div className="flex flex-col gap-4 relative z-10">
                   <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.05]", opp.bg)}>
                     <opp.icon className={opp.color} size={20} />
                   </div>

                   <div>
                     <h3 className="font-bold text-base md:text-lg mb-0.5">{opp.title}</h3>
                     <p className="text-[10px] text-white/30 font-medium uppercase tracking-wide">{opp.desc}</p>
                   </div>

                   <div className="flex items-center justify-between mt-1 pt-4 border-t border-white/[0.03]">
                     <div className="flex flex-col">
                       <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Available</span>
                       <span className={cn("text-sm font-mono font-bold", opp.color)}>{opp.reward}</span>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-primary transition-all">
                       <ChevronRight size={14} className="text-white/20 group-hover:text-white" />
                     </div>
                   </div>
                 </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Boost Banner */}
        <Card className="p-6 md:p-8 border-primary/20 bg-primary/[0.02] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden rounded-3xl">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_100%,rgba(0,112,255,0.05),transparent_50%)]" />
           <div className="flex items-center gap-5 relative z-10">
             <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/40">
               <Zap className="text-primary" size={24} />
             </div>
             <div>
               <h3 className="text-xl font-bold mb-1 tracking-tight">Boost Your Earnings</h3>
               <p className="text-white/40 text-[11px] font-medium max-w-md">Complete the liquidity challenge to double your points on all tasks.</p>
             </div>
           </div>
           <button
             onClick={() => navigate('/tasks')}
             className="w-full md:w-auto px-6 py-3 rounded-xl bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2"
           >
             Get Started
             <ArrowUpRight size={14} />
           </button>
        </Card>

        {/* Grid Placeholder */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1 h-4 bg-white/10 rounded-full" />
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Coming Soon</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Video Tasks', icon: Star, color: 'text-yellow-500' },
              { label: 'Surveys', icon: Gift, color: 'text-purple-500' },
              { label: 'Games', icon: Zap, color: 'text-primary' },
              { label: 'Staking', icon: TrendingUp, color: 'text-accent' }
            ].map((item, i) => (
              <Card key={i} className="p-5 flex flex-col items-center justify-center gap-3 text-center opacity-40 grayscale border-white/[0.03] bg-white/[0.01] rounded-2xl">
                 <item.icon size={20} className={item.color} />
                 <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{item.label}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Earn;
