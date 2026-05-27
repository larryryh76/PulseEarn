import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Wallet,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  TrendingDown,
  Activity,
  Plus,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton';
import { getXpProgress } from '../utils/progression';
import { PTS_TO_USD, formatUSD } from '../utils/finance';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { activities, loading: tasksLoading } = useTasks();
  const { marketData, loading: cryptoLoading } = useCryptoData();
  const navigate = useNavigate();

  const loading = tasksLoading || cryptoLoading;

  if (loading && !marketData.length) return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <Skeleton className="h-[200px] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Skeleton className="h-40 rounded-2xl" />
           <Skeleton className="h-40 rounded-2xl" />
           <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </DashboardLayout>
  );

  if (!userData) return null;

  const xp = getXpProgress(userData.xp || 0);
  const btc = marketData.find(c => c.id === 'bitcoin');
  const eth = marketData.find(c => c.id === 'ethereum');

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-24">

        {/* HEADER AREA */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
           <div className="space-y-1">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Operational Overview</p>
              <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back, {userData.username}</h1>
           </div>
           <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/wallet')}
                className="btn-secondary h-11 flex items-center gap-2"
              >
                 <Wallet size={16} />
                 <span>Ledger</span>
              </button>
              <button
                onClick={() => navigate('/referrals')}
                className="btn-primary h-11 flex items-center gap-2"
              >
                 <Plus size={16} />
                 <span>Invite</span>
              </button>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

           {/* LEFT: FINANCIAL CORE */}
           <div className="lg:col-span-8 space-y-8">

              {/* PRIMARY BALANCE SURFACE */}
              <div className="surface-2 p-8 md:p-12 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                 <div className="relative z-10 space-y-10">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Available Balance</p>
                       <div className="flex items-baseline gap-4">
                          <h2 className="text-6xl md:text-7xl font-bold tracking-tighter text-white">
                             {userData.points.toLocaleString()}
                          </h2>
                          <span className="text-xl font-bold text-white/20 uppercase tracking-widest font-mono">PTS</span>
                       </div>
                       <p className="text-lg font-medium text-white/40 tracking-tight font-mono">
                          ≈ {formatUSD(PTS_TO_USD(userData.points))}
                       </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-white/[0.04]">
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">24h Earning</p>
                          <div className="flex items-center gap-2 text-success font-bold text-xl">
                             <TrendingUp size={16} />
                             <span>+{userData.totalEarnedToday || 0}</span>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Account Tier</p>
                          <div className="flex items-center gap-2">
                             <span className="text-xl font-bold text-white">Lvl {userData.level}</span>
                             <div className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-bold tracking-widest uppercase">Elite</div>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Active Streak</p>
                          <div className="flex items-center gap-2 text-orange-500 font-bold text-xl">
                             <Zap size={16} />
                             <span>{userData.streak || 0} Days</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* MARKET PULSE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[btc, eth].map((coin) => (
                   <div key={coin?.id} className="surface-1 p-6 interactive flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] p-2 flex items-center justify-center">
                            <img src={coin?.image} className="w-full h-full object-contain grayscale opacity-60 group-hover:grayscale-0 transition-all" alt="" />
                         </div>
                         <div>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{coin?.symbol}/USDT</p>
                            <p className="text-lg font-bold text-white font-mono tracking-tight">{coin ? formatUSD(coin.current_price) : '---'}</p>
                         </div>
                      </div>
                      <div className={cn(
                        "flex flex-col items-end",
                        (coin?.price_change_percentage_24h || 0) >= 0 ? "text-success" : "text-danger"
                      )}>
                         <div className="flex items-center gap-1 text-[13px] font-bold">
                            {(coin?.price_change_percentage_24h || 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {coin?.price_change_percentage_24h?.toFixed(2)}%
                         </div>
                      </div>
                   </div>
                 ))}
              </div>

              {/* TRENDING ASSETS LIST */}
              <div className="surface-1 overflow-hidden">
                 <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <BarChart3 size={16} className="text-white/20" />
                       <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Market Signal</h3>
                    </div>
                    <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest">Real-time Feed</span>
                 </div>
                 <div className="divide-y divide-white/[0.04]">
                    {marketData.slice(2, 6).map((coin) => (
                      <div key={coin.id} className="px-6 py-4 flex items-center justify-between interactive">
                         <div className="flex items-center gap-4">
                            <img src={coin.image} className="w-6 h-6 grayscale opacity-40" alt="" />
                            <div>
                               <p className="text-[13px] font-bold text-white tracking-tight uppercase">{coin.symbol}/USDT</p>
                               <p className="text-[10px] font-medium text-white/20 uppercase">{coin.name}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[14px] font-bold text-white font-mono">{formatUSD(coin.current_price)}</p>
                            <p className={cn(
                               "text-[11px] font-bold",
                               coin.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
                            )}>{coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* RIGHT: OPERATIONAL FEED */}
           <div className="lg:col-span-4 space-y-8">

              {/* PROGRESS SURFACE */}
              <div className="surface-1 p-6 space-y-6">
                 <div className="flex justify-between items-end">
                    <div className="space-y-1">
                       <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">Next Tier</h4>
                       <p className="text-2xl font-bold text-white tracking-tight leading-none">{Math.round(xp.progress)}%</p>
                    </div>
                    <p className="text-[10px] font-mono text-primary font-bold">{Math.round(xp.currentLevelXp)} / {xp.requiredXp} XP</p>
                 </div>
                 <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xp.progress}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="h-full bg-primary"
                    />
                 </div>
              </div>

              {/* ACTIVITY LOG */}
              <div className="surface-1 overflow-hidden h-[500px] flex flex-col">
                 <div className="px-6 py-5 border-b border-white/[0.04] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <Activity size={16} className="text-white/20" />
                       <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Operational Log</h3>
                    </div>
                    <ShieldCheck size={14} className="text-white/10" />
                 </div>
                 <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] custom-scrollbar bg-black/[0.1]">
                    {activities.length === 0 ? (
                      <div className="py-20 text-center space-y-4">
                         <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">Audit Trail Empty</p>
                      </div>
                    ) : activities.slice(0, 10).map((activity) => (
                      <div key={activity.id} className="p-5 flex items-center justify-between group interactive">
                         <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-1 h-6 rounded-full",
                              activity.points > 0 ? "bg-primary/40" : "bg-white/10"
                            )} />
                            <div>
                               <p className="text-[12px] font-bold text-white/70 uppercase tracking-tight group-hover:text-white transition-colors">{activity.type.replace(/_/g, ' ')}</p>
                               <p className="text-[9px] text-white/20 font-mono uppercase tracking-tighter mt-0.5">
                                  {activity.timestamp ? activity.timestamp.toDate().toLocaleTimeString() : '---'}
                               </p>
                            </div>
                         </div>
                         <span className={cn(
                           "text-sm font-mono font-bold",
                           activity.points > 0 ? "text-primary" : "text-white/20"
                         )}>
                           {activity.points > 0 ? `+${activity.points}` : activity.points}
                         </span>
                      </div>
                    ))}
                 </div>
                 <button
                  onClick={() => navigate('/me')}
                  className="w-full flex items-center justify-center py-4 bg-white/[0.01] hover:bg-white/[0.02] transition-all text-[10px] font-bold text-white/20 hover:text-white uppercase tracking-[0.3em] group border-t border-white/[0.04]"
                 >
                    Full Audit View <ArrowRight size={12} className="ml-2 group-hover:translate-x-1 transition-transform" />
                 </button>
              </div>

              {/* INTEGRITY STATUS */}
              <div className="surface-1 p-6 space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/20 flex items-center justify-center text-success shadow-sm">
                       <ShieldCheck size={18} />
                    </div>
                    <div className="space-y-0.5">
                       <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Security Status</p>
                       <p className="text-[13px] font-bold text-white uppercase">Operational Integrity Verified</p>
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
