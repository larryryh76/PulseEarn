import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Wallet,
  Activity,
  Globe,
  Shield,
  ChevronRight,
  ArrowUpRight,
  Target,
  BarChart3,
  Users,
  Trophy,
  History,
  TrendingUp,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { useNavigate, Link } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton';
import { getXpProgress } from '../utils/progression';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { CardPremium, MarketWidget } from '../components/ui/PremiumModules';

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
          <CardPremium className="p-0 border-white/[0.05] bg-gradient-to-br from-[#0A0A0F] to-[#030305]">
            <div className="relative p-8 md:p-12">
              <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                <svg viewBox="0 0 1000 200" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M0 150 Q 150 140, 300 160 T 600 120 T 1000 80 L 1000 200 L 0 200 Z" fill="url(#hero-fill)" />
                  <defs>
                    <linearGradient id="hero-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0070ff" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#0070ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">Current Balance</p>
                    <div className="flex items-baseline gap-3">
                      <h1 className="text-6xl md:text-7xl font-bold text-white tracking-tight">
                        {userData.points.toLocaleString()}
                      </h1>
                      <span className="text-primary font-bold text-2xl">PTS</span>
                    </div>
                    <p className="text-xl font-medium text-white/60">
                      ≈ {formatUSD(PTS_TO_USD(userData.points))}
                    </p>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">24h Earning</span>
                      <span className="text-success font-bold text-lg flex items-center gap-1">
                        <ArrowUpRight size={16} />
                        +{userData.totalEarnedToday || 0}
                      </span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Level</span>
                      <span className="text-white font-bold text-lg">Lvl {userData.level}</span>
                    </div>
                  </div>
                </div>

                {/* Level Progress */}
                <div className="w-full md:w-64 space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">XP Progression</span>
                    <span className="text-[10px] font-bold text-primary">{Math.round(xp.progress)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xp.progress}%` }}
                      className="h-full bg-primary shadow-[0_0_15px_rgba(0,112,255,0.4)]"
                    />
                  </div>
                  <p className="text-[10px] text-white/20 text-right uppercase font-bold tracking-tighter">
                    {Math.round(xp.currentLevelXp)} / {xp.requiredXp} XP
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/[0.05]">
              {[
                { label: 'Tasks', icon: Zap, href: '/tasks', color: 'text-primary' },
                { label: 'Predict', icon: Target, href: '/predict', color: 'text-accent' },
                { label: 'Withdraw', icon: Wallet, href: '/withdraw', color: 'text-success' },
                { label: 'Invite', icon: Users, href: '/referrals', color: 'text-white' },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.href)}
                  className="flex flex-col items-center justify-center p-6 border-r last:border-r-0 border-white/[0.05] hover:bg-white/[0.02] transition-colors gap-2 group"
                >
                  <div className={cn("p-2 rounded-xl bg-white/5 transition-transform group-hover:scale-110", action.color)}>
                    <action.icon size={20} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white">{action.label}</span>
                </button>
              ))}
            </div>
          </CardPremium>
        </section>

        {/* SECTION 2: LIVE MARKET & ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-white/20" />
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Real-time Market Data</h3>
              </div>
              {globalData && (
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                       <span className="text-[9px] font-bold text-white/20 uppercase">BTC Dominance:</span>
                       <span className="text-[10px] font-bold text-primary">{globalData.market_cap_percentage.btc.toFixed(1)}%</span>
                    </div>
                 </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CardPremium className="p-5 flex items-center justify-between border-white/[0.05] bg-[#0A0A0F]">
                 <div className="flex items-center gap-4">
                    <img src={btc?.image} className="w-10 h-10 rounded-full" alt="BTC" />
                    <div>
                       <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Bitcoin</p>
                       <p className="text-lg font-bold text-white">{btc ? formatUSD(btc.current_price) : '---'}</p>
                    </div>
                 </div>
                 <div className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1",
                    (btc?.price_change_percentage_24h || 0) >= 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"
                 )}>
                    {(btc?.price_change_percentage_24h || 0) >= 0 ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />}
                    {btc?.price_change_percentage_24h?.toFixed(2)}%
                 </div>
              </CardPremium>

              <CardPremium className="p-5 flex items-center justify-between border-white/[0.05] bg-[#0A0A0F]">
                 <div className="flex items-center gap-4">
                    <img src={eth?.image} className="w-10 h-10 rounded-full" alt="ETH" />
                    <div>
                       <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Ethereum</p>
                       <p className="text-lg font-bold text-white">{eth ? formatUSD(eth.current_price) : '---'}</p>
                    </div>
                 </div>
                 <div className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1",
                    (eth?.price_change_percentage_24h || 0) >= 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"
                 )}>
                    {(eth?.price_change_percentage_24h || 0) >= 0 ? <TrendingUp size={12} /> : <ArrowDownRight size={12} />}
                    {eth?.price_change_percentage_24h?.toFixed(2)}%
                 </div>
              </CardPremium>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MarketWidget label="User Success" value="64.2%" change="+2.1%" isPositive={true} icon={<Activity size={18} />} />
              <MarketWidget label="Network Load" value="Optimal" icon={<Globe size={18} />} />
              <MarketWidget label="Leaderboard" value="#142" icon={<Trophy size={18} />} />
              <MarketWidget label="System Auth" value="Verified" icon={<Shield size={18} />} />
            </div>

            {/* Trending assets */}
            <div className="bg-[#0A0A0F] border border-white/[0.05] rounded-3xl overflow-hidden">
               <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Trending Assets</h4>
                  <Link to="/market" className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">View All Market</Link>
               </div>
               <div className="divide-y divide-white/[0.03]">
                  {marketData.slice(2, 6).map((coin) => (
                    <div key={coin.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                       <div className="flex items-center gap-3">
                          <img src={coin.image} className="w-8 h-8 rounded-full" alt={coin.symbol} />
                          <div>
                             <p className="text-xs font-bold text-white">{coin.name}</p>
                             <p className="text-[9px] font-bold text-white/20 uppercase">{coin.symbol}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-bold text-white">{formatUSD(coin.current_price)}</p>
                          <p className={cn(
                             "text-[9px] font-bold uppercase",
                             coin.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
                          )}>{coin.price_change_percentage_24h.toFixed(2)}%</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-2 px-1">
                <History size={16} className="text-white/20" />
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Recent Activity</h3>
             </div>

             <CardPremium className="p-0 border-white/[0.05]">
                <div className="divide-y divide-white/[0.03]">
                   {activities.length === 0 ? (
                     <div className="p-10 text-center text-white/10 text-[10px] font-bold uppercase tracking-widest">
                        No recent operations
                     </div>
                   ) : activities.slice(0, 5).map((activity) => (
                     <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors group">
                        <div className="flex items-center gap-3">
                           <div className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             activity.points > 0 ? "bg-success" : "bg-primary"
                           )} />
                           <div>
                              <p className="text-xs font-bold text-white/80 group-hover:text-white transition-colors">{activity.type}</p>
                              <p className="text-[9px] text-white/20 font-bold uppercase mt-0.5">
                                 {activity.timestamp ? activity.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending...'}
                              </p>
                           </div>
                        </div>
                        <span className={cn(
                          "text-[11px] font-bold",
                          activity.points > 0 ? "text-success" : "text-white/40"
                        )}>
                          {activity.points > 0 ? `+${activity.points}` : activity.points} PTS
                        </span>
                     </div>
                   ))}
                </div>
                <Link to="/me" className="flex items-center justify-center p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-[9px] font-bold text-white/20 uppercase tracking-widest group">
                   View Audit Ledger
                   <ChevronRight size={10} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Link>
             </CardPremium>

             {/* Network Stats Card */}
             <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/5 to-transparent border border-white/[0.05] space-y-4">
                <div className="flex items-center gap-2 text-primary">
                   <Zap size={14} />
                   <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Protocol Health</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Status</p>
                      <p className="text-xs font-bold text-success">Operational</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Latency</p>
                      <p className="text-xs font-bold text-white">42ms</p>
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
