import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  Users,
  ShieldCheck,
  Globe,
  ArrowUpRight,
  BrainCircuit
} from 'lucide-react';
import CardPremium from '../ui/Card';
import { EconomyMonitor } from '../../engines/points/EconomyMonitor';

const EcosystemIntelligence: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    EconomyMonitor.getEcosystemSnapshot().then(setStats);
  }, []);

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-primary">
          <BrainCircuit size={24} />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Official Overview</h2>
        </div>
        <h1 className="text-4xl font-bold tracking-tighter">Ecosystem Intelligence</h1>
      </div>

      {/* TOP METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                 <TrendingUp size={24} />
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold">
                 <ArrowUpRight size={12} />
                 +12.4%
              </div>
           </div>
           <p className="text-4xl font-bold tracking-tight mb-2">
              {stats?.totalCirculation.toLocaleString() || '0'}
           </p>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Circulating Pulse</p>
        </CardPremium>

        <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                 <Users size={24} />
              </div>
           </div>
           <p className="text-4xl font-bold tracking-tight mb-2">
              {stats?.totalUsers || '0'}
           </p>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Active Entities</p>
        </CardPremium>

        <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                 <Globe size={24} />
              </div>
           </div>
           <p className="text-4xl font-bold tracking-tight mb-2">
              98.2%
           </p>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Ecosystem Stability</p>
        </CardPremium>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
            <div className="flex items-center gap-3 mb-8">
               <Activity size={20} className="text-primary" />
               <h3 className="text-sm font-bold uppercase tracking-widest">Growth Velocity</h3>
            </div>
            <div className="h-48 flex items-end gap-3 px-2">
               {[40, 70, 45, 90, 65, 30, 85, 50, 75, 40, 60, 80].map((h, i) => (
                 <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-1 bg-gradient-to-t from-primary/5 to-primary/30 rounded-t-xl border-t border-x border-primary/10"
                 />
               ))}
            </div>
            <div className="flex justify-between mt-6 text-[9px] font-bold text-white/20 uppercase tracking-widest px-1">
               <span>User Onboarding</span>
               <span>Monetary Expansion</span>
            </div>
         </CardPremium>

         <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
            <div className="flex items-center gap-3 mb-8">
               <ShieldCheck size={20} className="text-success" />
               <h3 className="text-sm font-bold uppercase tracking-widest">System Status</h3>
            </div>
            <div className="space-y-6">
               {[
                 { name: 'Transaction Engine', status: 'Optimal', load: '12%' },
                 { name: 'Security System', status: 'Scanning', load: '45%' },
                 { name: 'Market Data', status: 'Synced', load: '2%' },
                 { name: 'Task Validation', status: 'Optimal', load: '8%' }
               ].map((system, i) => (
                 <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center gap-4">
                       <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                       <p className="text-xs font-bold text-white/80">{system.name}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-white/40 uppercase">{system.status}</p>
                       <p className="text-[9px] font-mono text-primary/60">{system.load} LOAD</p>
                    </div>
                 </div>
               ))}
            </div>
         </CardPremium>
      </div>
    </div>
  );
};

export default EcosystemIntelligence;
