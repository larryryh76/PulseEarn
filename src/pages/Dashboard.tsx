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
  ChevronUp,
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
      <div className="max-w-6xl mx-auto space-y-10 pb-24 animate-in">
        {/* Authoritative Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-2">
           <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">System Live</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Overview</h1>
              <p className="text-sm text-white/40 font-medium">Welcome back, {userData.username}</p>
           </div>

           <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-1.5 pr-4 rounded-2xl">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {userData.level}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Level Progress</span>
                    <div className="flex items-center gap-3">
                       <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${xp.progress}%` }}
                            className="h-full bg-primary"
                          />
                       </div>
                       <span className="text-[10px] font-mono font-bold">{Math.round(xp.progress)}%</span>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Primary Command Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

           {/* High-Level Stats (Across full width on top) */}
           <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel p-6 rounded-3xl border-white/[0.05] group">
                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-2">Total Balance</span>
                 <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-bold font-mono tracking-tighter">{userData.points.toLocaleString()}</h2>
                    <span className="text-[10px] font-bold text-white/20 uppercase">PTS</span>
                 </div>
                 <p className="text-xs font-bold text-white/40 mt-1">≈ {formatUSD(PTS_TO_USD(userData.points))}</p>
              </div>

              <div className="glass-panel p-6 rounded-3xl border-white/[0.05]">
                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-2">7D Growth</span>
                 <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-bold font-mono tracking-tighter text-emerald-400">+{summary?.weeklyEarnings.toLocaleString()}</h2>
                    <span className="text-[10px] font-bold text-emerald-500/40 uppercase">PTS</span>
                 </div>
                 <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest">
                    <TrendingUp size={12} />
                    Active
                 </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl border-white/[0.05]">
                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-2">Daily Streak</span>
                 <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold font-mono tracking-tighter">{userData.streak}</h2>
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                       <Flame size={16} fill="currentColor" />
                    </div>
                 </div>
                 <p className="text-xs font-bold text-white/40 mt-1 uppercase tracking-tighter">Consecutive Days</p>
              </div>

              <div className="glass-panel p-6 rounded-3xl border-white/[0.05]">
                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block mb-2">Referrals</span>
                 <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold font-mono tracking-tighter">{userData.stats?.referralsCount || 0}</h2>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                       <Share2 size={16} />
                    </div>
                 </div>
                 <p className="text-xs font-bold text-white/40 mt-1 uppercase tracking-tighter">Network Size</p>
              </div>
           </div>

           {/* Secondary column grid */}
           <div className="lg:col-span-8 space-y-6">

              {/* Activity Timeline */}
              <div className="glass-panel rounded-3xl border-white/[0.05] overflow-hidden">
                 <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                       <Activity size={14} className="text-primary" />
                       <h3 className="text-xs font-bold tracking-widest uppercase text-white/60">Activity Log</h3>
                    </div>
                    <Link to="/profile" className="text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors">View All</Link>
                 </div>

                 <div className="divide-y divide-white/[0.02]">
                    {summary?.recentActivities.length === 0 ? (
                       <div className="p-12 text-center text-white/20 text-xs font-medium italic">No recent activity detected.</div>
                    ) : summary?.recentActivities.map((act) => (
                       <div key={act.id} className="p-4 px-6 hover:bg-white/[0.01] transition-colors flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                             <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/30 shrink-0">
                                <Clock size={14} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white/80 line-clamp-1">{act.description}</p>
                                <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">{act.type.replace(/_/g, ' ')}</p>
                             </div>
                          </div>
                          <div className="text-right shrink-0">
                             <p className={`text-sm font-bold font-mono ${act.points > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                                {act.points > 0 ? `+${act.points}` : act.points}
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Market Context Area */}
           <div className="lg:col-span-4 space-y-6">
              {/* Live Market Signals */}
              <div className="glass-panel rounded-3xl border-white/[0.05] overflow-hidden">
                 <div className="p-5 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-2">
                       <BarChart3 size={14} className="text-primary" />
                       <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Market Signals</span>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase tracking-widest">Live</div>
                 </div>
                 <div className="p-3 space-y-1">
                    {marketData.slice(0, 5).map(coin => (
                       <div key={coin.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/[0.02] transition-colors group">
                          <div className="flex items-center gap-3">
                             <div className="w-6 h-6 grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                <img src={coin.image} alt="" className="w-full h-full object-contain" />
                             </div>
                             <div>
                                <p className="text-xs font-bold text-white/80">{coin.symbol.toUpperCase()}</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase">{coin.name}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold font-mono text-white/60">{formatUSD(coin.current_price)}</p>
                             <p className={`text-[8px] font-bold font-mono ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
                 <Link to="/tasks" className="block p-4 text-center border-t border-white/[0.03] text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-primary hover:bg-primary/5 transition-all">
                    Start Forecasting
                 </Link>
              </div>

              {/* Quick Actions */}
              <div className="glass-panel p-6 rounded-3xl border-white/[0.05] space-y-4">
                 <span className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Ecosystem Actions</span>
                 <div className="grid grid-cols-2 gap-3">
                    <Link to="/tasks" className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/20 hover:bg-primary/5 transition-all group">
                       <Zap size={20} className="text-primary group-hover:scale-110 transition-transform" />
                       <span className="text-[9px] font-bold uppercase tracking-widest">Earn</span>
                    </Link>
                    <Link to="/wallet" className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all group">
                       <Wallet className="text-emerald-500 group-hover:scale-110 transition-transform" />
                       <span className="text-[9px] font-bold uppercase tracking-widest">Wallet</span>
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
