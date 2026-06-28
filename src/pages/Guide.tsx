import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Target,
  TrendingUp,
  ShieldCheck,
  Users,
  Compass,
  ArrowUpRight,
  MousePointer2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';

const Guide: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      title: 'Complete Quests',
      desc: 'Engage with community and sponsored tasks to earn Pulse Points and XP immediately.',
      icon: Target,
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    {
      title: 'Market Forecasts',
      desc: 'Predict price movements of top assets. Accuracy yields high-multiplier rewards.',
      icon: TrendingUp,
      color: 'text-success',
      bg: 'bg-success/10'
    },
    {
      title: 'Level Up',
      desc: 'Accumulate XP to unlock higher withdrawal limits and premium forecast markets.',
      icon: Zap,
      color: 'text-warning',
      bg: 'bg-warning/10'
    },
    {
      title: 'Invite Friends',
      desc: 'Grow the network and receive a permanent bonus for every active referral.',
      icon: Users,
      color: 'text-accent',
      bg: 'bg-accent/10'
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-32 pb-24 px-4 md:px-6">
       <div className="max-w-4xl mx-auto space-y-20">

          {/* HERO BRIEFING */}
          <header className="space-y-6 text-center">
             <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-bright border border-border shadow-xl mb-4"
             >
                <Compass size={14} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary">Mission Briefing</span>
             </motion.div>
             <motion.h1
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-4xl md:text-6xl font-bold tracking-tighter uppercase italic text-text-primary leading-none"
             >
                Welcome to <span className="text-primary">PulseEarn</span>
             </motion.h1>
             <motion.p
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 }}
               className="text-sm md:text-lg text-text-secondary max-w-2xl mx-auto font-medium leading-relaxed opacity-70"
             >
                PulseEarn is a high-performance rewards terminal. Every interaction contributes to your progression and asset accumulation.
             </motion.p>
          </header>

          {/* SYSTEM ARCHITECTURE */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {sections.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                  className="p-8 rounded-[2rem] bg-surface border border-border group hover:border-primary/30 transition-all shadow-2xl relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                      <s.icon size={120} />
                   </div>
                   <div className="relative z-10 space-y-4">
                      <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center ${s.color} shadow-lg`}>
                         <s.icon size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-text-primary uppercase italic tracking-tight">{s.title}</h3>
                      <p className="text-sm text-text-tertiary leading-relaxed font-medium">{s.desc}</p>
                   </div>
                </motion.div>
             ))}
          </section>

          {/* INTEGRITY SECTION */}
          <section className="p-10 md:p-16 rounded-[3rem] bg-surface-bright/50 border border-border shadow-inner text-center space-y-10 relative overflow-hidden">
             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-center gap-3 text-success">
                   <ShieldCheck size={20} />
                   <h2 className="text-[11px] font-black uppercase tracking-[0.4em]">Integrity Enforced</h2>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-text-primary uppercase tracking-tighter italic">Secure Participation</h2>
                <p className="text-sm text-text-tertiary max-w-xl mx-auto leading-relaxed font-medium">
                   Every reward issuance is subject to internal auditing to ensure platform solvency and integrity.
                   PulseEarn operates on a 1,000 PTS = $1 conversion standard. Payouts are manually reviewed and processed by our compliance team.
                </p>
             </div>

             <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full sm:w-auto px-12 py-5 rounded-2xl shadow-xl font-black uppercase tracking-[0.2em] text-[10px] group italic"
                >
                   Initialize Dashboard <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </Button>
                <button
                  onClick={() => navigate('/tasks')}
                  className="w-full sm:w-auto px-12 py-5 rounded-2xl bg-surface-bright border border-border-bright text-text-primary font-black uppercase tracking-widest text-[10px] hover:bg-surface-accent transition-all flex items-center justify-center gap-2"
                >
                   <MousePointer2 size={14} /> Start Earning
                </button>
             </div>
          </section>

          <footer className="pt-10 border-t border-border flex justify-center opacity-20">
             <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[1em]">SYSTEM_VERSION_5.0_PRO</p>
          </footer>
       </div>
    </div>
  );
};

export default Guide;
