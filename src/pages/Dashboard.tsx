import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getXpProgress } from '../utils/progression';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { DashboardEngine, DashboardSummary } from '../engines/dashboard/DashboardEngine';
import { Timestamp } from 'firebase/firestore';
import {
  Zap,
  TrendingUp,
  Shield,
  History,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Award,
  Flame
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { marketData } = useCryptoData();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userData) {
      DashboardEngine.getSummary(userData).then(res => {
        setSummary(res);
        setLoading(false);
      });
    }
  }, [userData]);

  if (!userData || loading) return (
    <DashboardLayout>
       <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
             <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">Syncing Command Center</p>
          </div>
       </div>
    </DashboardLayout>
  );

  const xp = getXpProgress(userData.xp || 0);

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">System Dashboard</h2>
            <h1 className="text-4xl font-bold tracking-tight">Welcome back, {userData.username}</h1>
            <p className="text-sm text-white/40">Real-time ecosystem summary for your authorized account.</p>
          </div>

          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                <div className="px-4 py-2 bg-primary/10 rounded-xl border border-primary/20">
                   <div className="flex items-center gap-2">
                      <Flame size={14} className="text-orange-500" fill="currentColor" />
                      <span className="text-xs font-bold">{userData.streak} Day Streak</span>
                   </div>
                </div>
                <div className="px-4 py-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer">
                   <div className="flex items-center gap-2">
                      <Shield size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-widest text-white/40">Verified</span>
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                 <Zap size={100} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-4">Pulse Balance</p>
              <div className="flex items-end gap-2">
                 <h2 className="text-3xl font-bold font-mono tracking-tighter">{userData.points.toLocaleString()}</h2>
                 <span className="text-xs font-bold text-primary pb-1">PTS</span>
              </div>
              <p className="text-[11px] font-bold text-white/40 mt-2 uppercase tracking-tighter">≈ {formatUSD(PTS_TO_USD(userData.points))}</p>
           </div>

           <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] group">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-4">Account Yield (7D)</p>
              <div className="flex items-end gap-2">
                 <h2 className="text-3xl font-bold font-mono tracking-tighter text-emerald-400">+{summary?.weeklyEarnings.toLocaleString()}</h2>
                 <span className="text-xs font-bold text-emerald-500/50 pb-1">PTS</span>
              </div>
              <div className="flex items-center gap-1 mt-2">
                 <ArrowUpRight size={14} className="text-emerald-400" />
                 <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Earning at Peak Performance</span>
              </div>
           </div>

           <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-4">Clearance Status</p>
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-3xl font-bold font-mono tracking-tighter">LVL {userData.level}</h2>
                 <Award size={24} className="text-primary opacity-50" />
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-3">
                 <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: `${xp.progress}%` }}
                   className="h-full bg-primary shadow-[0_0_10px_rgba(0,112,255,0.5)]"
                 />
              </div>
              <p className="text-[9px] font-bold text-white/20 mt-2 uppercase tracking-widest">
                {Math.round(xp.requiredXp - xp.currentLevelXp)} XP TO NEXT CLEARANCE
              </p>
           </div>

           <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-4">Growth Network</p>
              <div className="flex items-end gap-2">
                 <h2 className="text-3xl font-bold font-mono tracking-tighter">{userData.stats?.referralsCount || 0}</h2>
                 <span className="text-xs font-bold text-white/20 pb-1 uppercase">Affiliates</span>
              </div>
              <div className="flex items-center gap-2 mt-4">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                       <div key={i} className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#050507] overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + (userData.uid || '')}`} alt="avatar" />
                       </div>
                    ))}
                 </div>
                 <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Expanding Network</span>
              </div>
           </div>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Activity Matrix */}
           <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                       <History size={16} className="text-white/40" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">Recent Activity Log</h3>
                 </div>
                 <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/60 transition-colors flex items-center gap-1">
                    View Full Audit <ChevronRight size={12} />
                 </button>
              </div>

              <div className="space-y-3">
                 {summary?.recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-5 glass-card border-white/[0.03] rounded-2xl hover:bg-white/[0.02] transition-all group">
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                             activity.points > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'
                          }`}>
                             <Zap size={18} className={activity.points > 0 ? 'text-emerald-500' : 'text-white/40'} />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-white/90">{activity.description}</p>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-bold uppercase text-white/20 tracking-tighter">{activity.type.replace(/_/g, ' ')}</span>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[9px] font-mono text-white/20">
                                   {activity.timestamp instanceof Timestamp ? activity.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Processing'}
                                </span>
                             </div>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className={`text-sm font-bold font-mono ${activity.points > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                             {activity.points > 0 ? `+${activity.points}` : activity.points}
                          </span>
                       </div>
                    </div>
                 ))}
                 {!summary?.recentActivities.length && (
                    <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-white/10">No recent operational logs identified</p>
                    </div>
                 )}
              </div>
           </div>

           {/* Market Matrix */}
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    <TrendingUp size={16} className="text-white/40" />
                 </div>
                 <h3 className="text-lg font-bold tracking-tight">Market Signals</h3>
              </div>

              <div className="glass-card border-white/[0.05] rounded-[2.5rem] overflow-hidden">
                 <div className="p-6 space-y-4">
                    {marketData.slice(0, 4).map(coin => (
                       <div key={coin.id} className="flex items-center justify-between group cursor-pointer hover:translate-x-1 transition-transform">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
                                <img src={coin.image} alt={coin.name} className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
                             </div>
                             <div>
                                <p className="text-xs font-bold text-white/80">{coin.name}</p>
                                <p className="text-[9px] font-bold text-white/20 uppercase">{coin.symbol}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold font-mono text-white/90">{formatUSD(coin.current_price)}</p>
                             <p className={`text-[9px] font-bold font-mono ${coin.price_change_percentage_24h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
                 <button className="w-full py-4 bg-white/5 border-t border-white/5 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:bg-white/[0.08] hover:text-white/60 transition-all">
                    Access Prediction Terminal
                 </button>
              </div>

              {/* Quick Summary Widgets */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="glass-card p-5 rounded-3xl border-white/[0.03]">
                    <div className="flex items-center gap-2 mb-3">
                       <Clock size={12} className="text-primary" />
                       <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Active Forecasts</span>
                    </div>
                    <p className="text-xl font-bold font-mono">{summary?.activePredictions || 0}</p>
                 </div>
                 <div className="glass-card p-5 rounded-3xl border-white/[0.03]">
                    <div className="flex items-center gap-2 mb-3">
                       <Shield size={12} className="text-amber-500" />
                       <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Pending Audit</span>
                    </div>
                    <p className="text-xl font-bold font-mono">{summary?.pendingRewards || 0}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
