import React, { useState, useEffect } from 'react';
import { EconomyMonitor } from '../../engines/points/EconomyMonitor';
import CardPremium from '../ui/Card';
import {
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ShieldAlert,
  PieChart,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

const EconomyIntelligence: React.FC = () => {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    EconomyMonitor.getEcosystemSnapshot().then(setStats);
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Monetary Policy</h2>
        <h1 className="text-3xl font-bold">Economy Intelligence</h1>
      </div>

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
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Total Pulse Supply</p>
        </CardPremium>

        <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
                 <Activity size={24} />
              </div>
           </div>
           <p className="text-4xl font-bold tracking-tight mb-2">
              {stats?.velocity24h.toLocaleString() || '0'}
           </p>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">24H Earning Volume</p>
        </CardPremium>

        <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
           <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary">
                 <Wallet size={24} />
              </div>
           </div>
           <p className="text-4xl font-bold tracking-tight mb-2">
              {stats?.averageBalance.toFixed(0) || '0'}
           </p>
           <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Average User Balance</p>
        </CardPremium>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
            <div className="flex items-center gap-3 mb-8">
               <ShieldAlert size={20} className="text-orange-500" />
               <h3 className="text-sm font-bold uppercase tracking-widest">Risk Analysis</h3>
            </div>
            <div className="space-y-6">
               <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[11px] font-bold text-white/80 uppercase">Inflation Risk</p>
                     <p className="text-[10px] text-white/30">Based on reward velocity vs user growth</p>
                  </div>
                  <span className="text-[10px] font-bold text-success uppercase">Optimal</span>
               </div>
               <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[11px] font-bold text-white/80 uppercase">Liquidity Target</p>
                     <p className="text-[10px] text-white/30">Ecosystem point-to-value ratio</p>
                  </div>
                  <span className="text-[10px] font-bold text-primary uppercase">Balanced</span>
               </div>
            </div>
         </CardPremium>

         <CardPremium className="p-8 bg-[#0A0A15] border-white/[0.05]">
            <div className="flex items-center gap-3 mb-8">
               <PieChart size={20} className="text-primary" />
               <h3 className="text-sm font-bold uppercase tracking-widest">Earning Distribution</h3>
            </div>
            <div className="h-32 flex items-end gap-2 px-2">
               {[40, 70, 45, 90, 65, 30, 85, 50, 75, 40].map((h, i) => (
                 <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className="flex-1 bg-gradient-to-t from-primary/10 to-primary/40 rounded-t-lg border-x border-t border-primary/20"
                 />
               ))}
            </div>
            <div className="flex justify-between mt-4 text-[9px] font-bold text-white/20 uppercase tracking-widest">
               <span>Mon</span>
               <span>Wed</span>
               <span>Fri</span>
               <span>Sun</span>
            </div>
         </CardPremium>
      </div>
    </div>
  );
};

export default EconomyIntelligence;
