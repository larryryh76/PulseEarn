import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Gift, Zap, ShieldCheck, ChevronRight, Star, Trophy, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '../utils';

const Earn: React.FC = () => {
  const [claiming, setClaiming] = useState<string | null>(null);

  const missions = [
    {
      id: 'm1',
      title: 'Market Intelligence Audit',
      desc: 'Analyze and verify high-fidelity market data signals for 5 consecutive sessions.',
      reward: '500',
      difficulty: 'Standard',
      progress: 60,
      icon: Zap,
      color: 'text-primary'
    },
    {
      id: 'm2',
      title: 'Validator Sequence',
      desc: 'Complete 10 successful point settlements within the institutional ecosystem.',
      reward: '1,200',
      difficulty: 'Advanced',
      progress: 20,
      icon: ShieldCheck,
      color: 'text-emerald-500'
    },
    {
      id: 'm3',
      title: 'Network Expansion',
      desc: 'Onboard 3 new verified operators to the PulseEarn reward infrastructure.',
      reward: '2,500',
      difficulty: 'Elite',
      progress: 0,
      icon: Star,
      color: 'text-amber-500'
    }
  ];

  const handleClaim = (id: string) => {
    setClaiming(id);
    setTimeout(() => {
      setClaiming(null);
      toast.success('Mission sequence initialized');
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/[0.05] pb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(0,102,255,0.5)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Yield Optimization Active</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight uppercase">Mission Terminal</h1>
            <p className="text-sm text-white/40 font-medium">Execute high-velocity sequences to authorize point distributions.</p>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest mb-1">Daily Cap</p>
              <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
                <div className="h-full w-2/3 bg-primary" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest mb-1">Active Multiplier</p>
              <p className="text-xl font-mono font-bold text-primary">1.25x</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Active Missions */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy size={18} className="text-primary" />
                <h3 className="text-xl font-bold uppercase tracking-tight">Priority Missions</h3>
              </div>
              <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">3 Missions Available</span>
            </div>

            <div className="space-y-6">
              {missions.map((mission) => (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-panel p-8 rounded-[2.5rem] group hover:bg-white/[0.02] transition-all border-white/5"
                >
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className={cn(
                      "w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0 border border-white/5 group-hover:border-primary/20 transition-all bg-white/[0.01]",
                      mission.color
                    )}>
                      <mission.icon size={32} />
                    </div>

                    <div className="flex-grow space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-lg font-bold text-white uppercase tracking-tight">{mission.title}</h4>
                            <span className={cn(
                              "px-2.5 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest border",
                              mission.difficulty === 'Elite' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                              mission.difficulty === 'Advanced' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                              "bg-primary/10 border-primary/20 text-primary"
                            )}>{mission.difficulty}</span>
                          </div>
                          <p className="text-[11px] text-white/40 uppercase font-medium leading-relaxed max-w-md">{mission.desc}</p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-2xl font-mono font-bold text-white">+{mission.reward}</p>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">EST. YIELD (PTS)</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-4">
                        <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                          <span className="text-white/20">Operational Progress</span>
                          <span className="text-white">{mission.progress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${mission.progress}%` }}
                            className={cn("h-full", mission.color.replace('text', 'bg'))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                       <Button
                        variant="outline"
                        size="sm"
                        className="md:w-auto w-full"
                        onClick={() => handleClaim(mission.id)}
                        disabled={claiming === mission.id}
                       >
                         {claiming === mission.id ? 'INITIALIZING...' : 'EXECUTE MISSION'}
                       </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar Intel */}
          <div className="lg:col-span-4 space-y-8">
            <div className="glass-panel p-8 rounded-[2.5rem] space-y-8">
              <div className="flex items-center gap-3 text-primary">
                <Gift size={18} />
                <h4 className="font-bold text-base uppercase tracking-tight">Daily Settlement</h4>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-4">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Next Distribution In</p>
                  <p className="text-3xl font-mono font-bold text-white tracking-widest">14:22:05</p>
                  <div className="flex items-center justify-center gap-4 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                    <Clock size={12} />
                    Network Stable
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Yield Breakdown</p>
                  {[
                    { label: 'Base Reward', value: '850 PTS' },
                    { label: 'Streak Bonus', value: '125 PTS' },
                    { label: 'Elite Multiplier', value: 'x1.25' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                      <span className="text-[11px] font-medium text-white/40 uppercase">{item.label}</span>
                      <span className="text-xs font-mono font-bold text-white/80">{item.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-4">
                    <span className="text-xs font-bold text-primary uppercase tracking-widest">Total Forecast</span>
                    <span className="text-lg font-mono font-bold text-primary">1,218 PTS</span>
                  </div>
                </div>

                <Button className="w-full" variant="outline">SETTLEMENT HISTORY</Button>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] bg-primary/[0.02] border-primary/10">
              <div className="flex items-center gap-3 text-primary mb-6">
                <ShieldCheck size={18} />
                <h4 className="font-bold text-base uppercase tracking-tight">Security Protocol</h4>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase mb-6">
                All mission settlements are verified by the institutional consensus engine. Tampering or automated execution will result in account suspension.
              </p>
              <div className="flex items-center gap-3 text-[10px] font-bold text-primary uppercase tracking-widest group cursor-pointer">
                Read Operational Guidance
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Earn;
