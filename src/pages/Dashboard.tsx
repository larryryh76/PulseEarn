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
  Activity,
  Share2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  BarChart2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';

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
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Loading Command Center</p>
          </div>
       </div>
    </DashboardLayout>
  );

  const xp = getXpProgress(userData.xp || 0);

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-12 pb-24 animate-in">

        {/* COMMAND CENTER HEADER: Unified composition */}
        <section className="relative p-1 bg-white/[0.03] border border-white/10 rounded-[2.5rem] overflow-hidden group">
           <div className="absolute inset-0 v2-gradient-bg pointer-events-none" />

           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-10 items-center">
              {/* Profile & Level */}
              <div className="lg:col-span-4 space-y-6">
                 <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-[2rem] bg-surface border-4 border-black/40 overflow-hidden shadow-2xl relative">
                       <img src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`} alt="" className="w-full h-full object-cover" />
                       <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                    <div>
                       <h1 className="text-3xl font-bold tracking-tight mb-1">{userData.username}</h1>
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Verified Account</span>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-white/20">LVL {userData.level} Progress</span>
                       <span className="text-primary">{Math.round(xp.progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                       <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${xp.progress}%` }}
                          className="h-full bg-primary shadow-[0_0_15px_rgba(0,102,255,0.4)]"
                       />
                    </div>
                 </div>
              </div>

              {/* Main Balance */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center text-center space-y-2 border-y lg:border-y-0 lg:border-x border-white/5 py-8 lg:py-0">
                 <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/20">Total Balance</p>
                 <div className="flex items-baseline gap-3">
                    <h2 className="text-7xl font-bold font-mono tracking-tighter text-glow leading-none">
                       {userData.points.toLocaleString()}
                    </h2>
                    <span className="text-2xl font-bold text-white/20 uppercase tracking-widest">PTS</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm font-medium text-white/40">
                    <span>≈ {formatUSD(PTS_TO_USD(userData.points))}</span>
                 </div>
              </div>

              {/* Quick Summary Stats */}
              <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Streak</p>
                    <div className="flex items-center gap-2 text-orange-500">
                       <Flame size={16} fill="currentColor" />
                       <span className="text-xl font-mono font-bold">{userData.streak} Days</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Referrals</p>
                    <div className="flex items-center gap-2 text-white/80">
                       <Share2 size={16} />
                       <span className="text-xl font-mono font-bold">{userData.stats?.referralsCount || 0}</span>
                    </div>
                 </div>
                 <div className="col-span-2 pt-4">
                    <Link to="/wallet" className="w-full btn-secondary flex items-center justify-center gap-2 text-[10px] py-3 group">
                       View Wallet Ledger
                       <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                 </div>
              </div>
           </div>
        </section>

        {/* PRIMARY OPS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

           {/* LEFT DECK: Activity & Performance (7 cols) */}
           <div className="lg:col-span-7 space-y-10">

              {/* Real-Time Market Intelligence */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                       <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Live Market Signals</h3>
                    </div>
                    <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Powered by CoinGecko</div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {marketData.slice(0, 4).map(coin => (
                       <div key={coin.id} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:border-primary/20 transition-all group flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-black/40 p-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <img src={coin.image} alt="" className="w-full h-full object-contain" />
                             </div>
                             <div>
                                <p className="font-bold text-white/90">{coin.symbol.toUpperCase()}</p>
                                <p className="text-[10px] font-bold text-white/20 uppercase">{coin.name}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-sm font-bold font-mono">{formatUSD(coin.current_price)}</p>
                             <div className={cn(
                                "flex items-center justify-end gap-1 text-[10px] font-bold font-mono mt-0.5",
                                coin.price_change_percentage_24h >= 0 ? "text-emerald-500" : "text-rose-500"
                             )}>
                                {coin.price_change_percentage_24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>

              {/* Performance Timeline */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                       <Activity size={18} className="text-primary" />
                       <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Activity Ledger</h3>
                    </div>
                    <Link to="/me" className="text-[10px] font-bold text-primary hover:text-white transition-colors uppercase tracking-widest">Full History</Link>
                 </div>

                 <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/[0.03]">
                    {summary?.recentActivities.length === 0 ? (
                       <div className="p-20 text-center text-white/10 text-sm font-medium italic">
                          No activity recorded in the current session buffer.
                       </div>
                    ) : summary?.recentActivities.map((act) => (
                       <div key={act.id} className="p-6 px-10 hover:bg-white/[0.01] transition-all flex items-center justify-between gap-6 group">
                          <div className="flex items-center gap-6">
                             <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:border-primary/20 transition-all">
                                <Clock size={18} />
                             </div>
                             <div>
                                <p className="text-base font-bold text-white/80 group-hover:text-white transition-colors line-clamp-1">{act.description}</p>
                                <p className="text-[10px] font-bold uppercase text-white/20 tracking-[0.2em] mt-0.5">{act.type.replace(/_/g, ' ')}</p>
                             </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className={cn("text-lg font-bold font-mono", act.points > 0 ? "text-emerald-400" : "text-white/40")}>
                                {act.points > 0 ? `+${act.points}` : act.points}
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* RIGHT DECK: Task Market & Actions (5 cols) */}
           <div className="lg:col-span-5 space-y-10">

              {/* Active Earning Opportunities */}
              <div className="glass-panel p-10 rounded-[3rem] border-primary/10 bg-primary/[0.01] space-y-8 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <Zap size={150} className="text-primary" />
                 </div>

                 <div className="space-y-2 relative z-10">
                    <h3 className="text-xl font-bold tracking-tight">Active Earning Hub</h3>
                    <p className="text-sm text-white/40 font-medium">Verified tasks from ecosystem partners awaiting deployment.</p>
                 </div>

                 <div className="space-y-4 relative z-10">
                    <div className="p-6 rounded-3xl bg-black/40 border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                             <TrendingUp size={24} />
                          </div>
                          <div>
                             <p className="font-bold text-white/90">Market Prediction</p>
                             <p className="text-[10px] font-bold text-white/20 uppercase">Forecast asset direction</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400 font-mono">+250 PTS</p>
                       </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-black/40 border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
                       <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                             <Share2 size={24} />
                          </div>
                          <div>
                             <p className="font-bold text-white/90">Invite Friends</p>
                             <p className="text-[10px] font-bold text-white/20 uppercase">Expand your network</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-bold text-emerald-400 font-mono">+500 PTS</p>
                       </div>
                    </div>
                 </div>

                 <Link to="/tasks" className="w-full btn-primary flex items-center justify-center gap-3 py-4 group">
                    <span className="font-black uppercase tracking-widest text-xs">Enter Task Marketplace</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                 </Link>
              </div>

              {/* Ecosystem Health Summary */}
              <div className="p-8 border border-white/5 rounded-[2.5rem] space-y-8 bg-white/[0.01]">
                 <div className="flex items-center gap-3">
                    <BarChart2 size={18} className="text-primary" />
                    <h4 className="text-base font-bold">System Summary</h4>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">7D Accumulation</p>
                          <p className="text-2xl font-mono font-bold text-emerald-400">+{summary?.weeklyEarnings.toLocaleString()}</p>
                       </div>
                       <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <TrendingUp size={20} />
                       </div>
                    </div>

                    <div className="flex items-center justify-between pb-6 border-b border-white/5">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Pending Verification</p>
                          <p className="text-2xl font-mono font-bold text-white/60">{summary?.pendingRewards || 0}</p>
                       </div>
                       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                          <ShieldCheck size={20} />
                       </div>
                    </div>

                    <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Active Forecasts</p>
                          <p className="text-2xl font-mono font-bold text-white/60">{summary?.activePredictions || 0}</p>
                       </div>
                       <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                          <Zap size={20} />
                       </div>
                    </div>
                 </div>
              </div>

           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
