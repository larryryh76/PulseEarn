import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Share2,
  Wallet
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
      <div className="max-w-[1400px] mx-auto space-y-8 pb-24 animate-in">

        {/* Integrated Terminal Header: Identity & Balance */}
        <section className="relative overflow-hidden bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 md:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 rounded-[1.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-bold shadow-2xl shadow-primary/20">
                    {userData.level}
                 </div>
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                       <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Pulse-Core Active</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Ecosystem Terminal</h1>
                    <p className="text-sm text-white/40 font-medium">Operator: {userData.username}</p>
                 </div>
              </div>

              <div className="flex flex-wrap items-center gap-8 pt-2">
                 <div className="space-y-2">
                    <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Clearance Progress</p>
                    <div className="flex items-center gap-4">
                       <div className="w-40 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${xp.progress}%` }}
                            className="h-full bg-primary shadow-[0_0_15px_rgba(0,102,255,0.4)]"
                          />
                       </div>
                       <span className="text-[10px] font-mono font-bold text-white/60">{Math.round(xp.progress)}%</span>
                    </div>
                 </div>
                 <div className="w-px h-10 bg-white/5 hidden sm:block" />
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Operational Streak</p>
                    <div className="flex items-center gap-2 text-orange-500">
                       <Flame size={18} fill="currentColor" className="drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                       <span className="text-xl font-mono font-bold">{userData.streak} DAYS</span>
                    </div>
                 </div>
              </div>
           </div>

           <div className="relative z-10 flex flex-col items-start lg:items-end gap-2 bg-white/[0.02] lg:bg-transparent p-6 lg:p-0 rounded-3xl border border-white/5 lg:border-none">
              <p className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Available Liquidity</p>
              <div className="flex items-baseline gap-3">
                 <h2 className="text-6xl md:text-7xl font-bold font-mono tracking-tighter text-glow">
                    {userData.points.toLocaleString()}
                 </h2>
                 <span className="text-xl md:text-2xl font-bold text-white/20 uppercase">PTS</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-white/40">
                 <span>≈ {formatUSD(PTS_TO_USD(userData.points))}</span>
                 <div className="w-1 h-1 rounded-full bg-white/10" />
                 <span className="text-emerald-500/60 uppercase tracking-tighter">Verified Assets</span>
              </div>
           </div>

           {/* Decorative Background Element */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.02] pointer-events-none">
              <Zap size={400} className="mx-auto" />
           </div>
        </section>

        {/* Primary Command Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

           {/* Left Column: Operations & Performance (8 cols) */}
           <div className="lg:col-span-8 space-y-8">

              {/* Secondary Stats Strip */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                       <TrendingUp size={80} />
                    </div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-4">7D Authorized Yield</span>
                    <div className="flex items-baseline gap-3">
                       <h2 className="text-4xl font-bold font-mono tracking-tighter text-emerald-400">
                          +{summary?.weeklyEarnings.toLocaleString()}
                       </h2>
                       <span className="text-xs font-bold text-emerald-500/40 uppercase">PTS</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-emerald-500/60 uppercase tracking-[0.2em]">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                       Positive Velocity
                    </div>
                 </div>

                 <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                       <Share2 size={80} />
                    </div>
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-4">Network Influence</span>
                    <div className="flex items-baseline gap-3">
                       <h2 className="text-4xl font-bold font-mono tracking-tighter">
                          {userData.stats?.referralsCount || 0}
                       </h2>
                       <span className="text-xs font-bold text-white/20 uppercase">Agents</span>
                    </div>
                    <p className="mt-4 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Verified Affiliates</p>
                 </div>
              </div>

              {/* Centralized Operation Logs */}
              <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                 <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                       <Activity size={16} className="text-primary" />
                       <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-white/60">Operation Logs</h3>
                    </div>
                    <Link to="/me" className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2">
                       View Full Ledger
                    </Link>
                 </div>

                 <div className="divide-y divide-white/[0.03]">
                    {summary?.recentActivities.length === 0 ? (
                       <div className="p-20 text-center text-white/20 text-sm font-medium italic">
                          System standby. No operational records in current buffer.
                       </div>
                    ) : summary?.recentActivities.map((act) => (
                       <div key={act.id} className="p-6 px-8 hover:bg-white/[0.01] transition-all flex items-center justify-between gap-6 group">
                          <div className="flex items-center gap-6">
                             <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:border-primary/20 transition-all shrink-0">
                                <Clock size={16} />
                             </div>
                             <div>
                                <p className="text-base font-bold text-white/80 group-hover:text-white transition-colors line-clamp-1">{act.description}</p>
                                <p className="text-[10px] font-bold uppercase text-white/20 tracking-widest mt-0.5">{act.type.replace(/_/g, ' ')}</p>
                             </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className={`text-lg font-bold font-mono ${act.points > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                                {act.points > 0 ? `+${act.points}` : act.points}
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Right Column: Intelligence Feed & Deployment (4 cols) */}
           <div className="lg:col-span-4 space-y-8">

              {/* Intelligence Feed (Market) */}
              <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                       <BarChart3 size={16} className="text-primary" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Intelligence Feed</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                       <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Live</span>
                    </div>
                 </div>
                 <div className="p-4 space-y-1">
                    {marketData.slice(0, 6).map(coin => (
                       <div key={coin.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/[0.03] transition-all group">
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <img src={coin.image} alt="" className="w-full h-full object-contain" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white/80">{coin.symbol.toUpperCase()}</p>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{coin.name}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-bold font-mono text-white/60">{formatUSD(coin.current_price)}</p>
                             <p className={`text-[10px] font-bold font-mono ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
                 <Link to="/tasks" className="block p-5 text-center border-t border-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 hover:text-primary hover:bg-primary/5 transition-all">
                    Access Forecast Terminal
                 </Link>
              </div>

              {/* Deployment Center (Quick Actions) */}
              <div className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] space-y-6">
                 <span className="text-[10px] font-bold uppercase text-white/20 tracking-[0.2em]">Deployment Center</span>
                 <div className="grid grid-cols-2 gap-4">
                    <Link to="/tasks" className="flex flex-col items-center gap-4 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all group">
                       <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Zap size={24} fill="currentColor" className="opacity-80" />
                       </div>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-center leading-tight">Execute Missions</span>
                    </Link>
                    <Link to="/wallet" className="flex flex-col items-center gap-4 p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all group">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                          <Wallet size={24} />
                       </div>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-center leading-tight">Wallet Control</span>
                    </Link>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
