import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getXpProgress } from '../utils/progression';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { DashboardEngine, DashboardSummary } from '../engines/dashboard/DashboardEngine';
import {
  Zap,
  TrendingUp,
  Clock,
  Flame,
  BarChart3,
  Activity,
  ChevronUp
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { marketData } = useCryptoData();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData) {
      DashboardEngine.getSummary(userData)
        .then(res => {
          setSummary(res);
          setLoading(false);
        })
        .catch(err => {
          console.error("Dashboard initialization failure:", err);
          setLoading(false);
        });
    }
  }, [userData]);

  if (!userData || loading) return (
    <DashboardLayout>
       <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
             <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Establishing Authority</p>
          </div>
       </div>
    </DashboardLayout>
  );

  const xp = getXpProgress(userData.xp || 0);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in">
        {/* Authoritative Header */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/[0.05] pb-10">
           <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">System Operational</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Ecosystem Command</h1>
              <p className="text-sm text-white/40 font-medium">Authoritative intelligence for {userData.username}</p>
           </div>

           <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                 <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest mb-1">XP Progress</span>
                 <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold">{Math.round(xp.progress)}%</span>
                    <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div
                         initial={{ width: 0 }}
                         animate={{ width: `${xp.progress}%` }}
                         className="h-full bg-primary"
                       />
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Modular Intelligence Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

           {/* Primary Assets & Performance (8 cols) */}
           <div className="lg:col-span-8 space-y-12">

              {/* Asset Composition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                       <Zap size={80} />
                    </div>
                    <span className="section-label">Pulse Capital</span>
                    <div className="mt-4 flex items-baseline gap-2">
                       <h2 className="text-4xl font-bold font-mono tracking-tighter">{userData.points.toLocaleString()}</h2>
                       <span className="text-xs font-bold text-white/20 uppercase tracking-widest">PTS</span>
                    </div>
                    <p className="text-lg font-bold text-white/40 mt-1 uppercase tracking-tighter">
                       ≈ {formatUSD(PTS_TO_USD(userData.points))}
                    </p>
                 </div>

                 <div className="glass-panel p-8 rounded-[2.5rem] flex flex-col justify-between group">
                    <div>
                       <span className="section-label">7D Performance</span>
                       <div className="mt-4 flex items-baseline gap-2">
                          <h2 className="text-4xl font-bold font-mono tracking-tighter text-emerald-400">+{summary?.weeklyEarnings.toLocaleString()}</h2>
                          <span className="text-xs font-bold text-emerald-500/50 uppercase tracking-widest">PTS</span>
                       </div>
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">
                       <TrendingUp size={14} />
                       Outperforming Benchmark
                    </div>
                 </div>
              </div>

              {/* Engagement Timeline */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Activity size={18} className="text-primary" />
                       <h3 className="text-xl font-bold tracking-tight">Audit Timeline</h3>
                    </div>
                    <button className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors">Full History</button>
                 </div>

                 <div className="space-y-2">
                    {summary?.recentActivities.map((act) => (
                       <div key={act.id} className="fintech-ledger-row px-4 bg-white/[0.01]">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40">
                                <Clock size={16} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white/80">{act.description}</p>
                                <p className="text-[9px] font-bold uppercase text-white/20 tracking-[0.1em]">{act.type.replace(/_/g, ' ')}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className={`text-sm font-bold font-mono ${act.points > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                                {act.points > 0 ? `+${act.points}` : act.points}
                             </p>
                             <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">PTS</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Contextual Intelligence (4 cols) */}
           <div className="lg:col-span-4 space-y-8">

              {/* Market Watch */}
              <div className="glass-panel rounded-[2.5rem] overflow-hidden">
                 <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <BarChart3 size={14} className="text-primary" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Market Signals</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                       <ChevronUp size={12} />
                       Live
                    </div>
                 </div>
                 <div className="p-4 space-y-1">
                    {marketData.slice(0, 5).map(coin => (
                       <div key={coin.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.03] transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                             <img src={coin.image} alt="" className="w-6 h-6 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                             <div>
                                <p className="text-xs font-bold text-white/80">{coin.symbol.toUpperCase()}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase">{coin.name}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold font-mono text-white/60">{formatUSD(coin.current_price)}</p>
                             <p className={`text-[8px] font-bold font-mono ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {coin.price_change_percentage_24h.toFixed(2)}%
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Network Context */}
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                 <span className="section-label">Ecosystem Identity</span>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Clearance</span>
                       <span className="text-xs font-bold text-primary">LVL {userData.level}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Loyalty Streak</span>
                       <div className="flex items-center gap-2">
                          <Flame size={14} className="text-orange-500" />
                          <span className="text-xs font-bold">{userData.streak} Days</span>
                       </div>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Network Size</span>
                       <span className="text-xs font-bold">{userData.stats?.referralsCount || 0} Affiliates</span>
                    </div>
                 </div>
                 <div className="pt-6 border-t border-white/[0.05]">
                    <button className="w-full btn-secondary text-[10px]">Customize Presence</button>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
