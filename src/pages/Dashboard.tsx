import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Wallet,
  ArrowUpRight,
  Target,
  BarChart3,
  Users,
  TrendingUp,
  LayoutGrid,
  ShieldCheck,
  TrendingDown,
  ChevronRight,
  Activity,
  Globe,
  Plus
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
  const { marketData, loading: cryptoLoading } = useCryptoData();
  const navigate = useNavigate();

  const loading = tasksLoading || cryptoLoading;

  if (loading && !marketData.length) return (
    <DashboardLayout>
      <div className="space-y-10">
        <Skeleton className="h-[400px] rounded-[2.5rem]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Skeleton className="h-48 rounded-3xl" />
           <Skeleton className="h-48 rounded-3xl" />
           <Skeleton className="h-48 rounded-3xl" />
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
      <div className="space-y-12 pb-24">

        {/* PREMIUM ACCOUNT HERO */}
        <section>
          <div className="relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-accent/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
             <CardPremium className="p-0 border-white/10 bg-black relative overflow-hidden rounded-[2.5rem] shadow-2xl">
               {/* Ambient Background */}
               <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32" />

               <div className="relative p-8 md:p-14">
                 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">

                   <div className="space-y-8 w-full lg:max-w-2xl">
                     <div className="space-y-3">
                       <div className="flex items-center gap-3">
                          <div className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 flex items-center gap-1.5">
                             <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                             <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Verified Account</span>
                          </div>
                          <span className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em]">Live Session</span>
                       </div>
                       <h2 className="text-white/40 text-lg font-medium tracking-tight">Consolidated Balance</h2>
                       <div className="flex items-baseline gap-4">
                         <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tighter leading-[0.85]">
                           {userData.points.toLocaleString()}
                         </h1>
                         <span className="text-primary font-bold text-2xl tracking-[0.2em] uppercase opacity-40 font-mono">PTS</span>
                       </div>
                       <p className="text-2xl font-medium text-white/30 font-mono tracking-tight pt-2">
                         ≈ {formatUSD(PTS_TO_USD(userData.points))}
                       </p>
                     </div>

                     <div className="flex flex-wrap items-center gap-12">
                       <div className="space-y-1">
                         <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">Market Performance</span>
                         <div className="flex items-center gap-2 text-success font-bold text-2xl">
                           <TrendingUp size={20} />
                           <span>+{userData.totalEarnedToday || 0}</span>
                         </div>
                       </div>
                       <div className="w-px h-10 bg-white/10 hidden md:block" />
                       <div className="space-y-1">
                         <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.2em]">Protocol clearance</span>
                         <div className="flex items-center gap-3">
                            <span className="text-white font-bold text-2xl">Lvl {userData.level}</span>
                            <div className="px-2 py-0.5 rounded bg-white text-black text-[9px] font-bold tracking-widest uppercase">ELITE</div>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Radial Progress Component */}
                   <div className="relative w-full lg:w-72 aspect-square flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90 scale-90" viewBox="0 0 100 100">
                         <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/5" />
                         <motion.circle
                           cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4"
                           strokeDasharray="282.7"
                           initial={{ strokeDashoffset: 282.7 }}
                           animate={{ strokeDashoffset: 282.7 - (282.7 * xp.progress / 100) }}
                           transition={{ duration: 1.5, ease: "circOut" }}
                           className="text-primary drop-shadow-[0_0_8px_rgba(0,102,255,0.4)]"
                         />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-1">
                         <span className="text-[11px] font-bold text-white/20 uppercase tracking-[0.3em]">Next Tier</span>
                         <span className="text-4xl font-bold text-white tracking-tighter">{Math.round(xp.progress)}%</span>
                         <span className="text-[10px] font-mono text-primary font-bold">{Math.round(xp.currentLevelXp)} / {xp.requiredXp} XP</span>
                      </div>
                   </div>
                 </div>
               </div>

               {/* Integrated Tab Navigation */}
               <div className="flex border-t border-white/5 bg-white/[0.01]">
                 {[
                   { label: 'Market Missions', icon: Zap, href: '/tasks' },
                   { label: 'Execution Hub', icon: Target, href: '/predict' },
                   { label: 'Settlement Ledger', icon: Wallet, href: '/wallet' },
                   { label: 'Invite Protocol', icon: Users, href: '/referrals' },
                 ].map((action, i) => (
                   <button
                     key={i}
                     onClick={() => navigate(action.href)}
                     className="flex-1 flex items-center justify-center gap-3 p-8 border-r last:border-r-0 border-white/5 hover:bg-white/[0.03] transition-all group"
                   >
                     <action.icon size={18} className="text-white/20 group-hover:text-primary transition-colors" />
                     <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white transition-colors">{action.label}</span>
                   </button>
                 ))}
               </div>
             </CardPremium>
          </div>
        </section>

        {/* SECTION 2: ECOSYSTEM PULSE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Real-time Market Column */}
          <div className="lg:col-span-7 space-y-10">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <Globe size={18} className="text-primary" />
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Global Market Signal</h3>
              </div>
              <div className="flex items-center gap-6">
                 <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                    <motion.div animate={{ x: [-100, 100] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} className="h-full w-1/2 bg-primary/40" />
                 </div>
                 <span className="text-[10px] font-bold text-success uppercase tracking-widest animate-pulse">Syncing...</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[btc, eth].map((coin) => (
                <motion.div
                  key={coin?.id}
                  whileHover={{ y: -4 }}
                  className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/10 hover:border-primary/40 transition-all group relative overflow-hidden"
                >
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                           <img src={coin?.image} className="w-full h-full object-contain" alt="" />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{coin?.name}</p>
                           <p className="text-xl font-bold text-white font-mono tracking-tight">{coin ? formatUSD(coin.current_price) : '---'}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border",
                        (coin?.price_change_percentage_24h || 0) >= 0 ? "text-success bg-success/5 border-success/10" : "text-danger bg-danger/5 border-danger/10"
                      )}>
                        {(coin?.price_change_percentage_24h || 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {coin?.price_change_percentage_24h?.toFixed(2)}%
                      </div>
                   </div>

                   {/* Mini Sparkline Simulation */}
                   <div className="flex items-end gap-1 h-12">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex-1 rounded-t-sm transition-all duration-1000",
                            (coin?.price_change_percentage_24h || 0) >= 0 ? "bg-success/20 group-hover:bg-success/40" : "bg-danger/20 group-hover:bg-danger/40"
                          )}
                          style={{ height: `${Math.random() * 100}%` }}
                        />
                      ))}
                   </div>
                </motion.div>
              ))}
            </div>

            {/* Premium Asset List */}
            <div className="bg-black border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
               <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                     <BarChart3 size={18} className="text-accent" />
                     <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Trending Liquidity</h4>
                  </div>
                  <Link to="/predict" className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] hover:underline flex items-center gap-2 group">
                     Explore <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Link>
               </div>
               <div className="divide-y divide-white/5">
                  {marketData.slice(2, 8).map((coin) => (
                    <div key={coin.id} className="px-8 py-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer group">
                       <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex items-center justify-center group-hover:scale-110 transition-transform">
                             <img src={coin.image} className="w-full h-full object-contain" alt={coin.symbol} />
                          </div>
                          <div>
                             <p className="text-base font-bold text-white tracking-tight group-hover:text-primary transition-colors uppercase">{coin.symbol}/USDT</p>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{coin.name}</p>
                          </div>
                       </div>
                       <div className="text-right space-y-1">
                          <p className="text-base font-bold text-white font-mono">{formatUSD(coin.current_price)}</p>
                          <p className={cn(
                             "text-[11px] font-bold tracking-tight",
                             coin.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
                          )}>{coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* Activity & Operational Status Column */}
          <div className="lg:col-span-5 space-y-10">
             <div className="flex items-center gap-3 px-2">
                <Activity size={18} className="text-accent" />
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Operational Flow</h3>
             </div>

             <div className="space-y-6">
                <CardPremium className="p-0 border-white/10 bg-black overflow-hidden rounded-[2rem] shadow-2xl">
                   <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Activity Audit</h4>
                      <ShieldCheck size={14} className="text-primary opacity-40" />
                   </div>
                   <div className="divide-y divide-white/5">
                      {activities.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                           <LayoutGrid className="mx-auto text-white/5" size={40} />
                           <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">No recorded signals</p>
                        </div>
                      ) : activities.slice(0, 6).map((activity) => (
                        <div key={activity.id} className="p-6 hover:bg-white/[0.02] transition-all group relative">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-5">
                                 <div className={cn(
                                   "w-1.5 h-8 rounded-full transition-all",
                                   activity.points > 0 ? "bg-primary group-hover:bg-primary shadow-[0_0_10px_rgba(0,102,255,0.4)]" : "bg-white/5 group-hover:bg-white/20"
                                 )} />
                                 <div>
                                    <p className="text-[13px] font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">{activity.type.replace(/_/g, ' ')}</p>
                                    <p className="text-[10px] text-white/20 font-bold uppercase mt-1 tracking-widest font-mono">
                                       {activity.timestamp ? activity.timestamp.toDate().toLocaleTimeString() : '---'} • REF_{activity.id.slice(0, 6)}
                                    </p>
                                 </div>
                              </div>
                              <span className={cn(
                                "text-lg font-mono font-bold",
                                activity.points > 0 ? "text-success" : "text-white/20"
                              )}>
                                {activity.points > 0 ? `+${activity.points}` : activity.points}
                              </span>
                           </div>
                        </div>
                      ))}
                   </div>
                   <button onClick={() => navigate('/me')} className="w-full flex items-center justify-center py-6 bg-white/[0.01] hover:bg-white/[0.03] transition-all text-[11px] font-bold text-white/20 hover:text-white uppercase tracking-[0.4em] group border-t border-white/5">
                      Enter Security Vault <ChevronRight size={14} className="ml-3 group-hover:translate-x-1 transition-transform" />
                   </button>
                </CardPremium>

                {/* Status Console */}
                <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-[#0A0A12] to-black border border-white/10 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                   <div className="relative z-10 space-y-8">
                      <div className="flex flex-col items-center text-center space-y-4">
                         <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                            <ShieldCheck size={32} className="text-primary animate-pulse" />
                         </div>
                         <div className="space-y-1">
                            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.3em]">Protocol Status</h4>
                            <p className="text-2xl font-bold text-white tracking-tighter uppercase leading-none">Healthy & Optimized</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Idempotency</p>
                            <p className="text-sm font-bold text-success uppercase">Verified</p>
                         </div>
                         <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Network</p>
                            <p className="text-sm font-bold text-white uppercase">Mainnet</p>
                         </div>
                      </div>

                      <button className="w-full py-4 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-[0.3em] shadow-xl hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-3">
                         Quick Sync <Plus size={14} />
                      </button>
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
