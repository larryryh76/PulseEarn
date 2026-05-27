import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  ShieldCheck,
  Lock,
  Flame,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp as TrendingIcon,
  Plus,
  CreditCard as CardIcon,
  Globe,
  Activity,
  ArrowDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction } from '../types';

const minWithdraw = 10000;

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'config'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);

  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(collection(db, 'users', userData.uid, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, snap => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoadingHistory(false);
    });
  }, [userData?.uid]);

  if (!userData) return null;

  const currentPoints = userData.points;
  const usdValue = PTS_TO_USD(currentPoints);
  const progress = Math.min(100, (currentPoints / minWithdraw) * 100);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-32">

        {/* HEADER: FINANCIAL IDENTITY */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
           <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Liquid Balance</p>
              </div>
              <div className="space-y-1">
                 <div className="flex items-baseline gap-4">
                    <h1 className="text-display text-white">{currentPoints.toLocaleString()}</h1>
                    <span className="text-xl font-bold text-white/10 uppercase tracking-widest font-mono leading-none">PTS</span>
                 </div>
                 <p className="text-2xl font-medium text-white/20 tracking-tight font-mono">
                    ≈ {formatUSD(usdValue)}
                 </p>
              </div>
           </div>

           <div className="flex items-center gap-4 w-full md:w-auto">
              <button
                onClick={() => setIsLockedModalOpen(true)}
                className="btn-primary flex-1 md:flex-none h-12 px-8 flex items-center justify-center gap-2"
              >
                 <span>Redeem</span>
                 <ArrowUpRight size={16} />
              </button>
              <button
                onClick={() => navigate('/tasks')}
                className="btn-secondary flex-1 md:flex-none h-12 px-8 flex items-center justify-center gap-2"
              >
                 <span>Marketplace</span>
                 <Plus size={16} />
              </button>
           </div>
        </header>

        {/* RESTRAINED TAB NAVIGATION */}
        <div className="flex border-b border-white/[0.04] overflow-x-auto no-scrollbar">
           {[
             { id: 'overview', label: 'Overview' },
             { id: 'ledger', label: 'Audit Ledger' },
             { id: 'config', label: 'Redemption Config' },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={cn(
                 "px-8 py-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap",
                 activeTab === tab.id ? "text-white" : "text-white/20 hover:text-white/40"
               )}
             >
               {tab.label}
               {activeTab === tab.id && (
                 <motion.div layoutId="walletTabIndicator" className="absolute bottom-0 left-8 right-8 h-px bg-primary" />
               )}
             </button>
           ))}
        </div>

        <AnimatePresence mode="wait">
           {activeTab === 'overview' && (
             <motion.div
               key="overview"
               initial={{ opacity: 0, y: 8 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -8 }}
               className="grid grid-cols-1 lg:grid-cols-12 gap-8"
             >
                {/* PROGRESS & METRICS */}
                <div className="lg:col-span-8 space-y-8">
                   <div className="surface-2 p-10 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full -mr-32 -mt-32 transition-opacity duration-1000 group-hover:opacity-100 opacity-50" />

                      <div className="flex flex-col md:flex-row justify-between items-end mb-12 relative z-10">
                         <div className="space-y-4">
                            <div className="flex items-center gap-2 text-primary">
                               <Sparkles size={16} />
                               <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Next Redemption Cycle</h4>
                            </div>
                            <p className="text-3xl font-bold text-white tracking-tight uppercase">Clearance Progress</p>
                         </div>
                         <div className="text-right">
                            <span className="text-5xl font-mono font-bold text-white leading-none">{Math.round(progress)}%</span>
                            <p className="text-[10px] font-bold text-white/20 uppercase mt-2 tracking-widest">{currentPoints.toLocaleString()} / {minWithdraw.toLocaleString()} PTS</p>
                         </div>
                      </div>

                      <div className="relative h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: `${progress}%` }}
                           transition={{ duration: 1.5, ease: "circOut" }}
                           className="h-full bg-primary"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="surface-1 p-8 space-y-6">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-orange-500">
                               <Flame size={18} />
                               <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Activity Streak</span>
                            </div>
                            <span className="text-lg font-bold text-white font-mono">{userData.streak || 0}D</span>
                         </div>
                         <p className="text-[12px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">Maintain consistent activity to scale your ecosystem multiplier up to <span className="text-white">2.5x</span>.</p>
                      </div>

                      <div className="surface-1 p-8 space-y-6">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-accent">
                               <TrendingIcon size={18} />
                               <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Daily Yield</span>
                            </div>
                            <span className="text-lg font-bold text-success font-mono">+{userData.totalEarnedToday || 0}</span>
                         </div>
                         <p className="text-[12px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">Real-time reward processing is active. System health is currently <span className="text-success font-bold uppercase">Optimal</span>.</p>
                      </div>
                   </div>
                </div>

                {/* SIDEBAR: ACCOUNT INTEGRITY */}
                <div className="lg:col-span-4 space-y-8">
                   <div className="surface-1 p-8 space-y-10 group interactive">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                         <ShieldCheck size={24} />
                      </div>
                      <div className="space-y-3">
                         <h4 className="text-lg font-bold text-white uppercase tracking-tight">Integrity Rating</h4>
                         <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase tracking-tighter">Your account has cleared all automated compliance audits for the current cycle.</p>
                      </div>
                      <div className="pt-8 border-t border-white/[0.04] space-y-4">
                         <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-white/20">Security Grade</span>
                            <span className="text-success font-mono">AAA+</span>
                         </div>
                         <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                            <span className="text-white/20">Auth Status</span>
                            <span className="text-success font-mono tracking-tighter">VERIFIED</span>
                         </div>
                      </div>
                   </div>

                   <div className="surface-1 p-8 space-y-6">
                      <h5 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Yield Analytics</h5>
                      <div className="space-y-5">
                         <div className="flex justify-between items-center">
                            <span className="text-[12px] font-medium text-white/40 uppercase">Marketplace</span>
                            <span className="text-[13px] font-bold text-white">+{userData.stats?.tasksCompleted || 0}</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[12px] font-medium text-white/40 uppercase">Referral Bonus</span>
                            <span className="text-[13px] font-bold text-white">+{userData.stats?.referralsCount || 0}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
           )}

           {activeTab === 'ledger' && (
             <motion.div
               key="ledger"
               initial={{ opacity: 0, y: 8 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -8 }}
               className="space-y-4"
             >
                <div className="surface-1 overflow-hidden">
                   <div className="px-8 py-5 border-b border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Activity size={16} className="text-white/20" />
                         <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Immutable Audit Ledger</h4>
                      </div>
                      <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">Last 50 Entries</span>
                   </div>

                   <div className="divide-y divide-white/[0.03]">
                      {loadingHistory ? (
                         <div className="py-24 text-center space-y-4">
                            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Accessing Ledger Core...</p>
                         </div>
                      ) : transactions.length === 0 ? (
                         <div className="py-24 text-center space-y-4">
                            <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.4em]">Audit Trail Empty</p>
                         </div>
                      ) : (
                        transactions.map((tx) => (
                          <div key={tx.id} className="px-8 py-6 flex items-center justify-between interactive group">
                             <div className="flex items-center gap-8">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300",
                                  tx.amount > 0 ? "bg-success/5 border-success/10 text-success" : "bg-white/[0.03] border-white/[0.05] text-white/30"
                                )}>
                                   {tx.amount > 0 ? <TrendingIcon size={20} /> : <ArrowDownLeft size={20} />}
                                </div>
                                <div>
                                   <h4 className="text-lg font-bold text-white tracking-tight group-hover:text-primary transition-colors">{tx.source}</h4>
                                   <div className="flex items-center gap-4 mt-1">
                                      <span className="text-[10px] font-mono text-white/20 uppercase">
                                         {tx.timestamp?.toDate().toLocaleString()}
                                      </span>
                                      <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest px-2 py-0.5 rounded border border-white/[0.05]">{tx.type.replace('_', ' ')}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className={cn(
                                   "text-xl font-mono font-bold",
                                   tx.amount > 0 ? "text-success" : "text-white/40"
                                )}>
                                   {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                </p>
                             </div>
                          </div>
                        ))
                      )}
                   </div>
                </div>
             </motion.div>
           )}

           {activeTab === 'config' && (
             <motion.div
               key="config"
               initial={{ opacity: 0, y: 8 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -8 }}
               className="grid grid-cols-1 md:grid-cols-2 gap-8"
             >
                <div className="surface-1 p-10 space-y-8">
                   <div className="space-y-3">
                      <h4 className="text-2xl font-bold text-white tracking-tight uppercase">Settlement</h4>
                      <p className="text-[12px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">Define your preferred method for reward conversion.</p>
                   </div>
                   <div className="space-y-4">
                      <div className="p-6 surface-2 interactive group flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <CardIcon size={18} className="text-white/20 group-hover:text-primary transition-colors" />
                            <span className="text-[13px] font-bold text-white/80">Internal Balance Transfer</span>
                         </div>
                         <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Active</span>
                      </div>
                      <div className="p-6 border border-white/[0.04] rounded-2xl flex items-center justify-between opacity-40">
                         <div className="flex items-center gap-4">
                            <Globe size={18} className="text-white/50" />
                            <span className="text-[13px] font-bold text-white/80">External Bank Settle</span>
                         </div>
                         <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Locked</span>
                      </div>
                   </div>
                </div>

                <div className="bg-danger/5 border border-danger/10 rounded-[2.5rem] p-10 space-y-8">
                   <div className="space-y-3">
                      <h4 className="text-2xl font-bold text-danger tracking-tight uppercase">Security</h4>
                      <p className="text-[12px] text-danger/40 leading-relaxed font-medium uppercase tracking-tight">Compliance protocols protect your financial integrity.</p>
                   </div>
                   <div className="space-y-6">
                      <div className="flex items-start gap-4">
                         <ShieldAlert size={18} className="text-danger shrink-0 mt-1" />
                         <div>
                            <p className="text-[13px] font-bold text-white/90">Identity Protection</p>
                            <p className="text-[11px] text-white/30 leading-relaxed mt-1">Multi-signature verification is required for all high-velocity redemptions.</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-4">
                         <Lock size={18} className="text-danger shrink-0 mt-1" />
                         <div>
                            <p className="text-[13px] font-bold text-white/90">Manual Review Cycle</p>
                            <p className="text-[11px] text-white/30 leading-relaxed mt-1">Settlements over 50,000 PTS require a 48-hour manual audit phase.</p>
                         </div>
                      </div>
                   </div>
                </div>
             </motion.div>
           )}
        </AnimatePresence>

      </div>

      {/* ISOLATED MINIMALIST MODAL */}
      <AnimatePresence>
        {isLockedModalOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLockedModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
              <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.98, opacity: 0 }} className="relative w-full max-w-md bg-surface-1 border border-border-strong rounded-[2.5rem] p-12 overflow-hidden shadow-2xl text-center space-y-10">
                 <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20 mx-auto">
                    <Lock size={32} />
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-3xl font-bold text-white tracking-tight uppercase leading-none">Threshold Required</h3>
                    <p className="text-[13px] text-white/40 leading-relaxed max-w-[240px] mx-auto font-medium uppercase tracking-tight">
                       Consolidate <span className="text-white font-bold">{minWithdraw.toLocaleString()} PTS</span> to authorize a redemption request.
                    </p>
                 </div>
                 <div className="space-y-3">
                    <button onClick={() => navigate('/tasks')} className="btn-primary w-full h-12 shadow-none">
                       Visit Marketplace
                    </button>
                    <button onClick={() => setIsLockedModalOpen(false)} className="btn-ghost w-full">
                       Abort Request
                    </button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Wallet;
