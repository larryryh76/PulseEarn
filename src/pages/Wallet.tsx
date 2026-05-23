import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  ShieldCheck,
  Zap,
  Lock,
  TrendingUp,
  CreditCard,
  Info,
  AlertTriangle,
  Flame,
  Target,
  Trophy,
  History as HistoryIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { getXpProgress } from '../utils/progression';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const { isConnected } = useAccount();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'withdraw'>('overview');

  if (!userData) return null;

  const minWithdraw = 10000;
  const currentPoints = userData.points;
  const usdValue = PTS_TO_USD(currentPoints);
  const progress = Math.min(100, (currentPoints / minWithdraw) * 100);
  const pointsRemaining = Math.max(0, minWithdraw - currentPoints);
  const xp = getXpProgress(userData.xp || 0);

  const transactions = [
    { id: 'tx1', type: 'prediction', label: 'Market Forecast Win', amount: '+925', date: '2h ago', status: 'completed' },
    { id: 'tx2', type: 'mission', label: 'TikTok Ecosystem Like', amount: '+50', date: '5h ago', status: 'completed' },
    { id: 'tx3', type: 'streak', label: '5-Day Streak Bonus', amount: '+200', date: '1d ago', status: 'completed' },
    { id: 'tx4', type: 'referral', label: 'Node Referral Bonus', amount: '+1,000', date: '2d ago', status: 'completed' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-32 space-y-8 px-4">

        {/* PREMIUM ECONOMY HERO */}
        <ErrorBoundary name="WalletHero">
          <section className="relative pt-12 pb-8">
             <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_40%,rgba(0,112,255,0.1),transparent_70%)]" />

             <div className="flex flex-col items-center text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                   <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest px-1">Ecosystem Rewards Wallet</span>
                </div>

                <div className="relative group cursor-default">
                   {/* Level Ring Container */}
                   <div className="absolute inset-0 -m-12 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity duration-700">
                      <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                         <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-white/5" />
                         <motion.circle
                           cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5"
                           strokeDasharray="301.59"
                           initial={{ strokeDashoffset: 301.59 }}
                           animate={{ strokeDashoffset: 301.59 - (301.59 * xp.progress / 100) }}
                           transition={{ duration: 2, ease: "circOut" }}
                           className="text-primary"
                         />
                      </svg>
                   </div>

                   <div className="space-y-1 relative z-10">
                      <h1 className="text-7xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-[0_0_30px_rgba(0,112,255,0.3)]">
                         {currentPoints.toLocaleString()}
                      </h1>
                      <p className="text-2xl md:text-3xl font-medium text-white/40 tracking-tight">
                         ≈ {formatUSD(usdValue)}
                      </p>
                   </div>
                </div>

                <div className="flex items-center gap-8 pt-4">
                   <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1.5">Growth Velocity</span>
                      <span className="text-sm font-bold text-success flex items-center gap-1.5 bg-success/5 px-2.5 py-1 rounded-lg border border-success/10">
                         <TrendingUp size={14} /> +12.4%
                      </span>
                   </div>
                   <div className="w-px h-10 bg-white/5" />
                   <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1.5">Ecosystem Status</span>
                      <span className="text-sm font-bold text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                         LVL {userData.level}
                      </span>
                   </div>
                </div>

                <div className="pt-8">
                   <Button
                    onClick={() => setActiveTab('withdraw')}
                    glow
                    size="lg"
                    className="px-12 py-5 rounded-2xl text-xs font-bold uppercase tracking-[0.2em]"
                   >
                      <CreditCard size={18} className="mr-3" />
                      Withdraw Pulse
                   </Button>
                </div>
             </div>
          </section>
        </ErrorBoundary>

        {/* NAVIGATION TABS */}
        <section>
           <div className="flex border-b border-white/[0.05] mb-8 overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: 'Reward Hub' },
                { id: 'history', label: 'Ecosystem Activity' },
                { id: 'withdraw', label: 'Withdrawal Portal' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                    activeTab === tab.id ? "text-primary" : "text-white/20 hover:text-white/40"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="walletTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                  )}
                </button>
              ))}
           </div>

           <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                   {/* Main Asset Card */}
                   <Card className="p-8 md:p-10 border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent rounded-[2.5rem] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700">
                         <Zap size={160} className="text-primary" />
                      </div>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                         <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                               <Zap size={32} />
                            </div>
                            <div>
                               <h3 className="text-2xl font-bold tracking-tight">Pulse Points</h3>
                               <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-1">Primary Ecosystem Token</p>
                            </div>
                         </div>
                         <div className="text-left md:text-right">
                            <p className="text-4xl font-mono font-bold text-white tracking-tighter">{currentPoints.toLocaleString()} <span className="text-lg text-white/20">PTS</span></p>
                            <p className="text-sm font-bold text-success mt-1 tracking-widest uppercase flex items-center md:justify-end gap-2">
                               <CheckCircle2 size={14} />
                               {formatUSD(usdValue)} Verified
                            </p>
                         </div>
                      </div>
                   </Card>

                   {/* Withdrawal Progress Summary */}
                   <div
                    onClick={() => setActiveTab('withdraw')}
                    className="p-8 rounded-[2.5rem] bg-[#0A0A0F] border border-white/[0.05] hover:bg-white/[0.02] transition-all cursor-pointer relative overflow-hidden group"
                   >
                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-end mb-4 relative z-10">
                         <div className="space-y-1">
                            <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Withdrawal Eligibility</h4>
                            <p className="text-xl font-bold text-white">Unlock Progress</p>
                         </div>
                         <span className="text-2xl font-mono font-bold text-primary">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5 relative z-10">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: `${progress}%` }}
                           className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_15px_rgba(0,112,255,0.4)]"
                         />
                      </div>
                      <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-4 text-center relative z-10">
                         {pointsRemaining.toLocaleString()} PTS remaining until withdrawal threshold
                      </p>
                   </div>

                   {/* Status & Metrics */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] space-y-4 hover:border-white/10 transition-colors">
                         <div className="flex items-center gap-3">
                            <Flame size={18} className="text-orange-500" />
                            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Earning Rate</h4>
                         </div>
                         <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">+{userData.totalEarnedToday || 0}</span>
                            <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Points Today</span>
                         </div>
                         <div className="pt-2 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                               <span className="text-white/20">Streak Multiplier</span>
                               <span className="text-primary">x1.2</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-primary w-[60%]" />
                            </div>
                         </div>
                      </div>

                      <div className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] space-y-4 hover:border-white/10 transition-colors">
                         <div className="flex items-center gap-3">
                            <Target size={18} className="text-accent" />
                            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Forecast Precision</h4>
                         </div>
                         <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">74%</span>
                            <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Efficiency</span>
                         </div>
                         <div className="pt-2 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                               <span className="text-white/20">Global Rank</span>
                               <span className="text-accent">TOP 5%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <div className="h-full bg-accent w-[85%]" />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* External Bridge Info */}
                   <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <ShieldCheck size={24} />
                         </div>
                         <div>
                            <h4 className="text-sm font-bold text-white">Protocol Verification Status</h4>
                            <p className="text-[11px] text-white/40 font-medium uppercase tracking-tighter">Identity node is active and synchronized with the Mainnet bridge.</p>
                         </div>
                      </div>
                      <ConnectButton />
                   </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                   {transactions.map((tx) => (
                     <div key={tx.id} className="p-5 rounded-[2rem] bg-white/[0.01] border border-white/[0.03] flex items-center justify-between group hover:bg-white/[0.03] transition-all relative overflow-hidden">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-11 h-11 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl",
                             tx.type === 'prediction' ? "bg-primary/5 text-primary" :
                             tx.type === 'mission' ? "bg-accent/5 text-accent" :
                             tx.type === 'streak' ? "bg-orange-500/5 text-orange-500" : "bg-success/5 text-success"
                           )}>
                              {tx.type === 'prediction' ? <Target size={20} /> :
                               tx.type === 'mission' ? <Zap size={20} /> :
                               tx.type === 'streak' ? <Flame size={20} /> : <Trophy size={20} />}
                           </div>
                           <div>
                              <p className="text-[14px] font-bold text-white tracking-tight">{tx.label}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{tx.date}</span>
                                 <span className="w-1 h-1 rounded-full bg-white/10" />
                                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{tx.type} event</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-base font-mono font-bold text-success">{tx.amount} PTS</p>
                           <div className="flex items-center justify-end gap-1.5 mt-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{tx.status}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                   <Button variant="outline" className="w-full py-5 rounded-[1.5rem] border-dashed border-white/10 hover:border-primary/50 text-[10px] text-white/20 hover:text-primary uppercase tracking-widest mt-6">
                      <HistoryIcon size={16} className="mr-2" /> View Archive Activity
                   </Button>
                </motion.div>
              )}

              {activeTab === 'withdraw' && (
                <motion.div
                  key="withdraw"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                   {/* Payout Milestone Card */}
                   <Card className="p-8 md:p-10 rounded-[2.5rem] bg-gradient-to-br from-[#0A0A0F] to-[#161622] border-white/[0.05] relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-[0.02]">
                         <Lock size={160} />
                      </div>

                      <div className="relative z-10 space-y-10">
                         <div className="flex justify-between items-start">
                            <div className="space-y-2">
                               <h3 className="text-3xl font-bold tracking-tight">Withdrawal Portal</h3>
                               <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Protocol Eligibility & Security Check</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[80px]">
                               <span className="text-2xl font-mono font-bold text-primary block">{Math.round(progress)}%</span>
                               <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Ready</span>
                            </div>
                         </div>

                         <div className="space-y-4">
                            <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5 relative">
                               <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${progress}%` }}
                                 className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full shadow-[0_0_20px_rgba(0,112,255,0.4)]"
                               />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 px-1">
                               <span>Genesis Node</span>
                               <span className="text-white/40">{currentPoints.toLocaleString()} / {minWithdraw.toLocaleString()} PTS</span>
                               <span className="text-success/40">Payout Readiness</span>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 space-y-2 group hover:bg-white/[0.04] transition-colors">
                               <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Required Points</p>
                               <p className="text-2xl font-mono font-bold text-white tracking-tighter">{pointsRemaining.toLocaleString()}</p>
                            </div>
                            <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 space-y-2 group hover:bg-white/[0.04] transition-colors">
                               <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Estimated Unlock</p>
                               <p className="text-2xl font-mono font-bold text-white tracking-tighter">~{Math.ceil(pointsRemaining / 150)} Days</p>
                            </div>
                            <div className="p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/5 space-y-2 group hover:bg-white/[0.04] transition-colors text-success">
                               <p className="text-[10px] font-bold text-success/30 uppercase tracking-widest">Est. Payout</p>
                               <p className="text-2xl font-mono font-bold tracking-tighter">{formatUSD(PTS_TO_USD(currentPoints))}</p>
                            </div>
                         </div>

                         <div className="space-y-6">
                            <div className="flex items-center gap-3 px-1">
                               <ShieldCheck size={18} className="text-primary" />
                               <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Ecosystem Eligibility Protocol</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {[
                                 { label: 'Network Balance Threshold', val: '10,000 PTS', met: currentPoints >= 10000 },
                                 { label: 'Node Activity History', val: 'Verified', met: true },
                                 { label: 'Fraud Prevention Scan', val: 'Passed', met: true },
                                 { label: 'External Wallet Sync', val: isConnected ? 'Connected' : 'Pending', met: isConnected }
                               ].map((req, i) => (
                                 <div key={i} className="flex items-center justify-between p-5 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.03] group hover:bg-white/[0.03] transition-colors">
                                    <span className="text-[12px] font-medium text-white/50">{req.label}</span>
                                    <div className="flex items-center gap-3">
                                       <span className={cn("text-[10px] font-bold uppercase tracking-widest", req.met ? "text-success" : "text-white/20")}>{req.val}</span>
                                       {req.met ? <CheckCircle2 size={14} className="text-success shadow-[0_0_10px_rgba(34,197,94,0.3)]" /> : <Clock size={14} className="text-white/10" />}
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         <div className="pt-4 space-y-4">
                            <Button
                              glow
                              className="w-full py-6 rounded-2xl text-[12px] font-bold uppercase tracking-[0.3em]"
                              disabled={currentPoints < minWithdraw}
                            >
                               {currentPoints < minWithdraw ? (
                                  <div className="flex items-center gap-2">
                                     <Lock size={16} />
                                     Withdrawal Threshold Not Met
                                  </div>
                               ) : 'Initialize Payout Authorization'}
                            </Button>
                            <p className="text-[10px] text-white/20 text-center font-bold uppercase tracking-widest">
                               Payouts are batched and settled within 24-48 hours.
                            </p>
                         </div>
                      </div>
                   </Card>

                   {/* Information & Security */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-8 rounded-[2.5rem] bg-[#0A0A0F] border border-white/[0.05] space-y-6">
                         <div className="space-y-2">
                            <h4 className="text-lg font-bold tracking-tight flex items-center gap-2">
                               <Info size={20} className="text-primary" />
                               Payout Logic
                            </h4>
                            <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">Understanding our distribution ensures ecosystem sustainability.</p>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-start gap-4">
                               <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                  <Trophy size={16} className="text-yellow-500" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">1,000 PTS = $1.00 USD</p>
                                  <p className="text-[10px] text-white/30 leading-relaxed mt-1">Earnings are settled in verified digital assets (USDT/BTC).</p>
                               </div>
                            </div>
                            <div className="flex items-start gap-4">
                               <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                                  <Sparkles size={16} className="text-primary" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Institutional Yield</p>
                                  <p className="text-[10px] text-white/30 leading-relaxed mt-1">Direct payout to your synchronized blockchain wallet.</p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="p-8 rounded-[2.5rem] bg-danger/5 border border-danger/10 space-y-6">
                         <div className="space-y-2">
                            <h4 className="text-lg font-bold text-danger tracking-tight flex items-center gap-2">
                               <ShieldAlert size={20} />
                               Node Protection
                            </h4>
                            <p className="text-[11px] text-danger/40 leading-relaxed font-medium uppercase tracking-tight">Security protocols monitored by Ecosystem AI.</p>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-start gap-4">
                               <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0 border border-danger/20">
                                  <AlertTriangle size={16} className="text-danger" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-danger/80 uppercase tracking-widest">Anti-Fraud Verification</p>
                                  <p className="text-[10px] text-danger/40 leading-relaxed mt-1">Manipulating missions results in permanent node forfeiture.</p>
                               </div>
                            </div>
                            <div className="flex items-start gap-4">
                               <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0 border border-danger/20">
                                  <Lock size={16} className="text-danger" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-danger/80 uppercase tracking-widest">Compliance Lock</p>
                                  <p className="text-[10px] text-danger/40 leading-relaxed mt-1">Suspicious activity triggers a 7-day administrative review window.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Earning Suggestions */}
                   <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-white/[0.02] to-transparent border border-white/[0.05] space-y-6">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Growth Acceleration</h4>
                         <span className="text-[10px] font-bold text-primary uppercase">Trending</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {[
                           { label: 'Referral Race', desc: 'Invite 3 friends for a +1,500 PTS bonus.', icon: Trophy },
                           { label: 'Prediction Streak', desc: 'Win 5 forecasts in a row for 2x yield.', icon: Target }
                         ].map((tip, i) => (
                           <div key={i} className="p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 flex items-center gap-4 group hover:border-primary/50 transition-colors cursor-pointer">
                              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 group-hover:text-primary transition-colors">
                                 <tip.icon size={20} />
                              </div>
                              <div>
                                 <p className="text-[12px] font-bold text-white">{tip.label}</p>
                                 <p className="text-[10px] text-white/30 mt-0.5">{tip.desc}</p>
                              </div>
                              <ArrowUpRight size={14} className="ml-auto text-white/10 group-hover:text-primary transition-all" />
                           </div>
                         ))}
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </section>

      </div>
    </DashboardLayout>
  );
};

export default Wallet;
