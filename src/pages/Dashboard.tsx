import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Wallet,
  ChevronRight,
  ArrowUpRight,
  Target,
  BarChart3,
  Users,
  TrendingUp,
  Flame,
  LayoutGrid,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton';
import { getXpProgress } from '../utils/progression';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { CardPremium } from '../components/ui/PremiumModules';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { activities, loading: tasksLoading } = useTasks();
  const { marketData, globalData, loading: cryptoLoading } = useCryptoData();
  const navigate = useNavigate();

  const loading = tasksLoading || cryptoLoading;

  if (loading && !marketData.length) return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
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
      <div className="space-y-8 pb-10">

        {/* SECTION 1: CLEAN WALLET HERO */}
        <section>
          <CardPremium className="p-0 border-white/[0.05] bg-[#0A0A0F] relative overflow-hidden rounded-[2rem]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(0,112,255,0.1),transparent_70%)] pointer-events-none" />

            <div className="relative p-6 md:p-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="space-y-6 w-full">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                       <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em]">Ecosystem Online</p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tighter">
                        {userData.points.toLocaleString()}
                      </h1>
                      <span className="text-primary font-bold text-lg tracking-widest uppercase opacity-40">PTS</span>
                    </div>
                    <p className="text-xl font-medium text-white/40 font-mono tracking-tight">
                      ≈ {formatUSD(PTS_TO_USD(userData.points))}
                    </p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">Daily Earnings</span>
                      <span className="text-success font-bold text-xl flex items-center gap-1.5 mt-1">
                        <TrendingUp size={18} />
                        +{userData.totalEarnedToday || 0}
                      </span>
                    </div>
                    <div className="w-[1px] h-10 bg-white/5" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Current Rank</span>
                      <span className="text-white font-bold text-xl mt-1 flex items-center gap-2">
                         Lvl {userData.level}
                         <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">ELITE</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Level Progress */}
                <div className="w-full md:w-64 space-y-3 bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Next Reward Level</span>
                    <span className="text-base font-mono font-bold text-primary">{Math.round(xp.progress)}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xp.progress}%` }}
                      className="h-full bg-gradient-to-r from-primary to-accent"
                    />
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-bold text-white/10 uppercase tracking-widest">
                    <span>LEVEL {userData.level}</span>
                    <span>{Math.round(xp.currentLevelXp)} / {xp.requiredXp} XP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/[0.05] bg-white/[0.01]">
              {[
                { label: 'Tasks', icon: Zap, href: '/tasks', color: 'text-primary' },
                { label: 'Predict', icon: Target, href: '/predict', color: 'text-accent' },
                { label: 'Portfolio', icon: Wallet, href: '/wallet', color: 'text-success' },
                { label: 'Invite', icon: Users, href: '/referrals', color: 'text-white' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.href)}
                  className="flex flex-col items-center justify-center p-4 md:p-6 border-r last:border-r-0 border-white/[0.05] hover:bg-white/[0.03] transition-all gap-2 group"
                >
                  <div className={cn("p-2 rounded-xl bg-white/5 transition-transform group-hover:scale-110", action.color)}>
                    <action.icon size={20} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/30 group-hover:text-white transition-colors">{action.label}</span>
                </button>
              ))}
            </div>
          </CardPremium>
        </section>

        {/* SECTION 2: LIVE ECOSYSTEM PULSE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Market Feed Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <BarChart3 size={16} className="text-primary" />
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Market Overview</h3>
              </div>
              {globalData && (
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">BTC Dom:</span>
                       <span className="text-[11px] font-mono font-bold text-primary">{globalData.market_cap_percentage.btc.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Eth Gas:</span>
                       <span className="text-[11px] font-mono font-bold text-success">24 Gwei</span>
                    </div>
                 </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[btc, eth].map((coin) => (
                <div key={coin?.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all group cursor-pointer overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-6 opacity-[0.02] group-hover:scale-110 transition-transform duration-700">
                      <TrendingUp size={60} />
                   </div>
                   <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img src={coin?.image} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 p-1" alt="" />
                        <div>
                           <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{coin?.name}</p>
                           <p className="text-base font-bold text-white font-mono">{coin ? formatUSD(coin.current_price) : '---'}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1",
                        (coin?.price_change_percentage_24h || 0) >= 0 ? "text-success bg-success/10 border border-success/20" : "text-danger bg-danger/10 border border-danger/20"
                      )}>
                        {(coin?.price_change_percentage_24h || 0) >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {coin?.price_change_percentage_24h?.toFixed(1)}%
                      </div>
                   </div>
                   <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full", (coin?.price_change_percentage_24h || 0) >= 0 ? "bg-success/40" : "bg-danger/40")} style={{ width: '60%' }} />
                   </div>
                </div>
              ))}
            </div>

            {/* Trending assets */}
            <div className="bg-[#0A0A0F] border border-white/[0.05] rounded-3xl overflow-hidden shadow-2xl relative">
               <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
               <div className="p-5 border-b border-white/[0.05] flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                     <Flame size={14} className="text-orange-500" />
                     <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.15em]">Trending Assets</h4>
                  </div>
                  <Link to="/predict" className="text-[9px] font-bold text-primary uppercase tracking-[0.15em] hover:text-accent transition-colors flex items-center gap-1.5 group">
                     Explore <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
               </div>
               <div className="divide-y divide-white/[0.03] relative z-10">
                  {marketData.slice(2, 7).map((coin) => (
                    <div key={coin.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                             <img src={coin.image} className="w-full h-full object-contain" alt={coin.symbol} />
                          </div>
                          <div>
                             <p className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{coin.name}</p>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{coin.symbol}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-sm font-bold text-white font-mono">{formatUSD(coin.current_price)}</p>
                          <p className={cn(
                             "text-[10px] font-bold uppercase tracking-tight mt-0.5",
                             coin.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
                          )}>{coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Activity Column */}
          <div className="lg:col-span-4 space-y-6">
             <div className="flex items-center gap-3 px-1">
                <LayoutGrid size={16} className="text-accent" />
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Recent Activity</h3>
             </div>

             <div className="space-y-4">
                <CardPremium className="p-0 border-white/[0.05] overflow-hidden rounded-3xl">
                   <div className="p-4 border-b border-white/[0.05] bg-white/[0.01]">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Transaction Log</h4>
                         <ShieldCheck size={12} className="text-success opacity-40" />
                      </div>
                   </div>
                   <div className="divide-y divide-white/[0.03]">
                      {activities.length === 0 ? (
                        <div className="p-10 text-center text-white/10 text-[10px] font-bold uppercase tracking-widest">
                           No recent syncs
                        </div>
                      ) : activities.slice(0, 4).map((activity) => (
                        <div key={activity.id} className="p-5 hover:bg-white/[0.02] transition-all group relative">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   activity.points > 0 ? "bg-success" : "bg-primary"
                                 )} />
                                 <div>
                                    <p className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">{activity.type}</p>
                                    <p className="text-[8px] text-white/20 font-bold uppercase mt-1 tracking-tighter">
                                       {activity.timestamp ? activity.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending...'} • ID: {activity.id.slice(0, 8)}
                                    </p>
                                 </div>
                              </div>
                              <span className={cn(
                                "text-[12px] font-mono font-bold",
                                activity.points > 0 ? "text-success" : "text-white/40"
                              )}>
                                {activity.points > 0 ? `+${activity.points}` : activity.points}
                              </span>
                           </div>
                        </div>
                      ))}
                   </div>
                   <Link to="/me" className="flex items-center justify-center py-4 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] group border-t border-white/[0.05]">
                      Access Ledger <ChevronRight size={12} className="ml-2 group-hover:translate-x-1 transition-transform" />
                   </Link>
                </CardPremium>

                {/* Portfolio Status Card */}
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0A0A0F] to-transparent border border-white/[0.05] relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-2xl">
                         <ShieldCheck size={24} className="text-primary animate-pulse" />
                      </div>
                      <h4 className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">Ecosystem Health</h4>
                      <p className="text-xl font-bold text-white tracking-tighter mb-4">OPTIMIZED</p>
                      <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-white/5">
                         <div className="text-left">
                            <p className="text-[8px] font-bold text-white/20 uppercase">Status</p>
                            <p className="text-xs font-bold text-success">Secure</p>
                         </div>
                         <div className="text-right">
                            <p className="text-[8px] font-bold text-white/20 uppercase">Assets</p>
                            <p className="text-xs font-bold text-white">Live</p>
                         </div>
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
