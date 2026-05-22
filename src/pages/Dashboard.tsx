import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Wallet,
  Activity,
  Globe,
  Shield,
  Layers,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Target,
  BarChart3,
  Users
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
  const { activities, loading } = useTasks();
  const navigate = useNavigate();

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-6">
        <Skeleton className="h-[400px] rounded-[3rem]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    </DashboardLayout>
  );

  if (!userData) return null;

  const xp = getXpProgress(userData.xp || 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {/* SECTION 1: THE COMMAND CENTER HERO */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>

          <CardPremium variant="deep" className="p-0 border-white/[0.08] bg-[#050507]/90 min-h-[450px]">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <svg viewBox="0 0 1000 400" className="w-full h-full" preserveAspectRatio="none">
                <motion.path
                  d="M0 200 Q 250 100 500 200 T 1000 200"
                  fill="none"
                  stroke="url(#hero-grad)"
                  strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, d: ["M0 200 Q 250 100 500 200 T 1000 200", "M0 200 Q 250 300 500 200 T 1000 200", "M0 200 Q 250 100 500 200 T 1000 200"] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                />
                <defs>
                  <linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0070ff" />
                    <stop offset="100%" stopColor="#00f2ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="relative z-10 p-8 md:p-14 h-full flex flex-col justify-between">
              <div className="flex flex-col md:flex-row justify-between items-start gap-10">

                {/* Left: Financial Hub */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Protocol Live: Node {userData.uid.slice(0, 4)}
                  </div>

                  <div className="space-y-1">
                    <p className="text-white/30 text-xs font-bold uppercase tracking-[0.3em]">Institutional Portfolio</p>
                    <div className="flex items-baseline gap-4">
                      <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-7xl md:text-8xl font-financial text-white tracking-tighter"
                      >
                        {userData.points.toLocaleString()}
                      </motion.h1>
                      <span className="text-primary text-3xl font-financial opacity-50">PTS</span>
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      className="text-2xl font-financial text-white"
                    >
                      ≈ {formatUSD(PTS_TO_USD(userData.points))}
                    </motion.p>
                  </div>

                  <div className="flex items-center gap-6 pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">24H Yield</span>
                      <span className="text-success text-financial text-lg flex items-center gap-1">
                        <ArrowUpRight size={16} />
                        +{userData.totalEarnedToday || 0}
                      </span>
                    </div>
                    <div className="w-[1px] h-8 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Clearance</span>
                      <span className="text-white/80 text-financial text-lg">Level {userData.level}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Operational XP Hub */}
                <div className="relative w-full md:w-auto flex justify-center md:justify-end">
                   <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90 transform">
                         <circle
                            cx="50%" cy="50%" r="45%"
                            className="stroke-white/[0.03] fill-none"
                            strokeWidth="4"
                         />
                         <motion.circle
                            cx="50%" cy="50%" r="45%"
                            className="stroke-primary fill-none"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="100"
                            initial={{ strokeDashoffset: 100 }}
                            animate={{ strokeDashoffset: 100 - xp.progress }}
                            transition={{ duration: 2, ease: "easeOut" }}
                         />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                         <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest leading-none mb-2">Progression</span>
                         <span className="text-4xl font-financial text-white">{Math.round(xp.progress)}%</span>
                         <span className="text-[10px] font-mono text-white/40 mt-1 uppercase">{Math.round(xp.currentLevelXp)} / {xp.requiredXp} XP</span>
                      </div>

                      {/* Floating Indicator */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 pointer-events-none"
                      >
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 bg-primary rounded-full shadow-[0_0_15px_#0070ff]" />
                      </motion.div>
                   </div>
                </div>
              </div>

              {/* Bottom Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
                {[
                  { label: 'Oracle Prediction', icon: Target, href: '/predict', color: 'text-primary' },
                  { label: 'Asset Bridge', icon: Wallet, href: '/withdraw', color: 'text-accent' },
                  { label: 'Node Missions', icon: Zap, href: '/tasks', color: 'text-secondary' },
                  { label: 'Network Squad', icon: Users, href: '/referrals', color: 'text-white' },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(action.href)}
                    className="group/action flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl bg-white/5 group-hover/action:bg-white/10 transition-colors", action.color)}>
                        <action.icon size={18} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white">{action.label}</span>
                    </div>
                    <ArrowRight size={14} className="text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </CardPremium>
        </section>

        {/* SECTION 2: SECTOR INTEL GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Market Intelligence */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full shadow-[0_0_10px_#0070ff]" />
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">Protocol Market Intelligence</h3>
              </div>
              <span className="text-[10px] font-mono text-white/20 uppercase">Real-time Feed</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CardPremium className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-white font-bold text-lg">BTC Oracle Strength</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Current Sentiment</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/20 text-primary">
                    <Activity size={20} />
                  </div>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "74%" }}
                    className="h-full bg-primary shadow-[0_0_10px_#0070ff]"
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase">
                  <span className="text-success">Bullish 74%</span>
                  <span className="text-danger">Bearish 26%</span>
                </div>
              </CardPremium>

              <CardPremium className="bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-white font-bold text-lg">Network Hashrate</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">System Efficiency</p>
                  </div>
                  <div className="p-2 rounded-lg bg-accent/20 text-accent">
                    <Globe size={20} />
                  </div>
                </div>
                <div className="flex items-end gap-1 h-8">
                  {[40, 70, 45, 90, 65, 80, 55, 75, 40, 85].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: i * 0.05 }}
                      className="flex-1 bg-accent/40 rounded-t-sm"
                    />
                  ))}
                </div>
                <p className="text-[10px] font-bold text-white/40 mt-4 uppercase text-right tracking-widest">Optimized 99.8%</p>
              </CardPremium>
            </div>

            {/* Sector Intel Widgets */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MarketWidget label="Pulse Dominance" value="42.5%" change="+1.2%" isPositive={true} icon={<BarChart3 size={18} />} />
              <MarketWidget label="Yield Multiplier" value="x2.4" icon={<Zap size={18} />} />
              <MarketWidget label="Liquidity Cap" value="$4.2M" icon={<Shield size={18} />} />
              <MarketWidget label="Active Nodes" value="12,402" change="+14" isPositive={true} icon={<Layers size={18} />} />
            </div>
          </div>

          {/* Right Sidebar: Protocol Feed */}
          <div className="space-y-6">
             <div className="flex items-center gap-2 px-2">
                <div className="w-1 h-4 bg-white/20 rounded-full" />
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">Protocol Events</h3>
             </div>

             <CardPremium variant="standard" className="p-0 border-white/[0.03]">
                <div className="divide-y divide-white/[0.03]">
                   {activities.length === 0 ? (
                     <div className="p-12 text-center text-white/10 text-[10px] font-bold uppercase tracking-[0.2em]">
                        Standby for network activity...
                     </div>
                   ) : activities.slice(0, 6).map((activity) => (
                     <div key={activity.id} className="p-5 flex items-start gap-4 hover:bg-white/[0.01] transition-colors group">
                        <div className={cn(
                          "mt-1 w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px]",
                          activity.points > 0 ? "bg-success shadow-success/50" : "bg-primary shadow-primary/50"
                        )} />
                        <div className="flex-1">
                           <div className="flex justify-between items-start">
                              <p className="text-xs font-bold text-white/90 group-hover:text-white transition-colors">{activity.type}</p>
                              <span className={cn(
                                "text-[10px] font-financial",
                                activity.points > 0 ? "text-success" : "text-white/40"
                              )}>
                                {activity.points > 0 ? `+${activity.points}` : activity.points} PTS
                              </span>
                           </div>
                           <p className="text-[9px] text-white/20 font-bold uppercase mt-1">
                              {activity.timestamp ? activity.timestamp.toDate().toLocaleTimeString() : 'Awaiting confirmation...'}
                           </p>
                        </div>
                     </div>
                   ))}
                </div>
                <Link to="/me" className="flex items-center justify-center p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] group">
                   Full Audit Ledger
                   <ChevronRight size={10} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
             </CardPremium>

             {/* System Integrity Module */}
             <div className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                   <Shield size={12} className="text-success" />
                   Security Protocol V4.2
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                   End-to-end encryption active. All protocol actions are immutable and stored on-chain. Multi-sig verification enabled for bridge transfers.
                </p>
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
