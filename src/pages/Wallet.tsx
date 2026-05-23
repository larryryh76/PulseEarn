import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  ShieldCheck,
  Zap,
  Lock,
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
  ArrowUpRight,
  TrendingUp as TrendingIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { getXpProgress } from '../utils/progression';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction } from '../types';

const Wallet: React.FC = () => {
  const { userData } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'withdraw'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!userData?.uid) return;

    const q = query(
      collection(db, 'users', userData.uid, 'transactions'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      setTransactions(txData);
      setLoadingHistory(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  if (!userData) return null;

  const minWithdraw = 10000;
  const currentPoints = userData.points;
  const usdValue = PTS_TO_USD(currentPoints);
  const progress = Math.min(100, (currentPoints / minWithdraw) * 100);
  const pointsRemaining = Math.max(0, minWithdraw - currentPoints);
  const xp = getXpProgress(userData.xp || 0);

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
                   <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest px-1">Pulse Rewards Wallet</span>
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
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1.5">Reward Level</span>
                      <span className="text-sm font-bold text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                         LVL {userData.level}
                      </span>
                   </div>
                   <div className="w-px h-10 bg-white/5" />
                   <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1.5">Streak Status</span>
                      <span className="text-sm font-bold text-orange-500 uppercase bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20 flex items-center gap-1.5">
                         <Flame size={14} /> {userData.streak || 0} Days
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
                               <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mt-1">Reward Balance</p>
                            </div>
                         </div>
                         <div className="text-left md:text-right">
                            <p className="text-4xl font-mono font-bold text-white tracking-tighter">{currentPoints.toLocaleString()} <span className="text-lg text-white/20">PTS</span></p>
                            <p className="text-sm font-bold text-success mt-1 tracking-widest uppercase flex items-center md:justify-end gap-2">
                               <CheckCircle2 size={14} />
                               {formatUSD(usdValue)} Value
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
                            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Earning Velocity</h4>
                         </div>
                         <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">+{userData.totalEarnedToday || 0}</span>
                            <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">PTS Earned Today</span>
                         </div>
                         <div className="pt-2 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                               <span className="text-white/20">Progress to Daily Goal</span>
                               <span className="text-primary">{Math.min(100, Math.round((userData.totalEarnedToday || 0) / 200 * 100))}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.min(100, (userData.totalEarnedToday || 0) / 200 * 100)}%` }}
                                 className="h-full bg-primary"
                               />
                            </div>
                         </div>
                      </div>

                      <div className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] space-y-4 hover:border-white/10 transition-colors">
                         <div className="flex items-center gap-3">
                            <TrendingIcon size={18} className="text-accent" />
                            <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Lifetime Progression</h4>
                         </div>
                         <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{userData.xp || 0}</span>
                            <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Total XP</span>
                         </div>
                         <div className="pt-2 flex flex-col gap-2">
                            <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                               <span className="text-white/20">XP to Next Level</span>
                               <span className="text-accent">{Math.round(xp.progress)}%</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                               <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${xp.progress}%` }}
                                 className="h-full bg-accent"
                               />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Loyalty Program Info */}
                   <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <ShieldCheck size={24} />
                         </div>
                         <div>
                            <h4 className="text-sm font-bold text-white">Account Security Status</h4>
                            <p className="text-[11px] text-white/40 font-medium uppercase tracking-tighter">Your account is in good standing. Maintain activity to increase your level.</p>
                         </div>
                      </div>
                      <div className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                         Verified Member
                      </div>
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
                   {loadingHistory ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4">
                         <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                         <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Loading Activity...</p>
                      </div>
                   ) : transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
                         <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/10">
                            <HistoryIcon size={32} />
                         </div>
                         <div className="space-y-1">
                            <p className="text-sm font-bold text-white">No activity yet</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Complete missions to earn points</p>
                         </div>
                      </div>
                   ) : (
                     transactions.map((tx) => (
                       <div key={tx.id} className="p-5 rounded-[2rem] bg-white/[0.01] border border-white/[0.03] flex items-center justify-between group hover:bg-white/[0.03] transition-all relative overflow-hidden">
                          <div className="flex items-center gap-4">
                             <div className={cn(
                               "w-11 h-11 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl",
                               tx.type === 'prediction_reward' ? "bg-primary/5 text-primary" :
                               tx.type === 'task_reward' ? "bg-accent/5 text-accent" :
                               tx.type === 'daily_reward' ? "bg-orange-500/5 text-orange-500" :
                               tx.type === 'referral_bonus' ? "bg-success/5 text-success" : "bg-white/5 text-white/40"
                             )}>
                                {tx.type === 'prediction_reward' ? <Target size={20} /> :
                                 tx.type === 'task_reward' ? <Zap size={20} /> :
                                 tx.type === 'daily_reward' ? <Flame size={20} /> : <Trophy size={20} />}
                             </div>
                             <div>
                                <p className="text-[14px] font-bold text-white tracking-tight">{tx.source}</p>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                      {tx.timestamp instanceof Date ? tx.timestamp.toLocaleDateString() :
                                       tx.timestamp?.toDate().toLocaleDateString()}
                                   </span>
                                   <span className="w-1 h-1 rounded-full bg-white/10" />
                                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{tx.type.replace('_', ' ')}</span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className={cn(
                                "text-base font-mono font-bold",
                                tx.amount > 0 ? "text-success" : "text-danger"
                             )}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} PTS
                             </p>
                             <div className="flex items-center justify-end gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Settled</span>
                             </div>
                          </div>
                       </div>
                     ))
                   )}
                   {transactions.length > 0 && (
                     <Button variant="outline" className="w-full py-5 rounded-[1.5rem] border-dashed border-white/10 hover:border-primary/50 text-[10px] text-white/20 hover:text-primary uppercase tracking-widest mt-6">
                        <HistoryIcon size={16} className="mr-2" /> View Full History
                     </Button>
                   )}
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
                               <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest">Reward Eligibility & Security Check</p>
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
                               <span>Standard Tier</span>
                               <span className="text-white/40">{currentPoints.toLocaleString()} / {minWithdraw.toLocaleString()} PTS</span>
                               <span className="text-success/40">Ready to unlock</span>
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
                               <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Eligibility Check</h4>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {[
                                 { label: 'Points Balance Threshold', val: '10,000 PTS', met: currentPoints >= 10000 },
                                 { label: 'Reward Level Requirement', val: 'Level 1+', met: userData.level >= 1 },
                                 { label: 'Email Verification', val: 'Verified', met: true },
                                 { label: 'Security Review', val: 'Passed', met: !userData.isFlagged }
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
                                  <p className="text-[11px] font-bold text-white/80 uppercase tracking-widest">Verified Payouts</p>
                                  <p className="text-[10px] text-white/30 leading-relaxed mt-1">Direct payout to your provided payment method or wallet.</p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="p-8 rounded-[2.5rem] bg-danger/5 border border-danger/10 space-y-6">
                         <div className="space-y-2">
                            <h4 className="text-lg font-bold text-danger tracking-tight flex items-center gap-2">
                               <ShieldAlert size={20} />
                               Account Protection
                            </h4>
                            <p className="text-[11px] text-danger/40 leading-relaxed font-medium uppercase tracking-tight">Security protocols monitored by Pulse Core.</p>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-start gap-4">
                               <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0 border border-danger/20">
                                  <AlertTriangle size={16} className="text-danger" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-danger/80 uppercase tracking-widest">Anti-Fraud Verification</p>
                                  <p className="text-[10px] text-danger/40 leading-relaxed mt-1">Manipulating missions results in permanent account suspension.</p>
                               </div>
                            </div>
                            <div className="flex items-start gap-4">
                               <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0 border border-danger/20">
                                  <Lock size={16} className="text-danger" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-danger/80 uppercase tracking-widest">Withdrawal Hold</p>
                                  <p className="text-[10px] text-danger/40 leading-relaxed mt-1">Suspicious activity triggers a security review period.</p>
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
