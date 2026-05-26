import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  ShieldCheck,
  Lock,
  Flame,
  History as HistoryIcon,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp as TrendingIcon,
  Plus,
  CreditCard as CardIcon,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import Card from '../components/ui/Card';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction } from '../types';

const minWithdraw = 10000;

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'hub' | 'ledger' | 'payout'>('hub');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);

  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(collection(db, 'users', userData.uid, 'transactions'), orderBy('timestamp', 'desc'), limit(25));
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
      <div className="max-w-6xl mx-auto space-y-16 pb-32">

        {/* PREMIUM BALANCE HEADER */}
        <section className="relative pt-10">
           <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.08),transparent_70%)]" />
           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Available Balance</span>
                 </div>
                 <div className="space-y-2">
                    <h1 className="text-8xl md:text-9xl font-bold tracking-tighter text-white drop-shadow-2xl leading-[0.85]">
                       {currentPoints.toLocaleString()}
                    </h1>
                    <div className="flex items-center gap-4">
                       <p className="text-3xl md:text-4xl font-medium text-white/20 tracking-tight font-mono">
                          ≈ {formatUSD(usdValue)}
                       </p>
                       <div className="px-3 py-1 rounded-lg bg-success/10 border border-success/20 text-success text-[10px] font-bold uppercase tracking-widest">
                          Secured
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                 <button
                  onClick={() => setIsLockedModalOpen(true)}
                  className="flex-1 lg:flex-none px-10 py-5 rounded-2xl bg-white text-black font-bold text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center gap-3"
                 >
                    Redeem <ArrowUpRight size={16} />
                 </button>
                 <button
                  onClick={() => navigate('/tasks')}
                  className="flex-1 lg:flex-none px-10 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                 >
                    Marketplace <Plus size={16} />
                 </button>
              </div>
           </div>
        </section>

        {/* FINANCIAL TABS */}
        <section className="space-y-12">
           <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar">
              {[
                { id: 'hub', label: 'Reward Overview' },
                { id: 'ledger', label: 'Audit Ledger' },
                { id: 'payout', label: 'Redemption Config' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-10 py-6 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative whitespace-nowrap",
                    activeTab === tab.id ? "text-primary" : "text-white/20 hover:text-white/40"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="walletTabLine" className="absolute bottom-0 left-8 right-8 h-[1px] bg-primary shadow-[0_0_15px_rgba(0,102,255,0.8)]" />
                  )}
                </button>
              ))}
           </div>

           <AnimatePresence mode="wait">
              {activeTab === 'hub' && (
                <motion.div
                  key="hub"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-10"
                >
                   {/* Growth Matrix */}
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="lg:col-span-8 space-y-10">
                         {/* Large Progress visualization */}
                         <div className="p-10 rounded-[2.5rem] bg-black border border-white/10 relative overflow-hidden group shadow-2xl">
                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="flex flex-col md:flex-row justify-between items-end mb-10 relative z-10">
                               <div className="space-y-3">
                                  <div className="flex items-center gap-3 text-primary">
                                     <Sparkles size={18} />
                                     <h4 className="text-[11px] font-bold uppercase tracking-[0.3em]">Payout Milestone</h4>
                                  </div>
                                  <p className="text-3xl font-bold text-white tracking-tighter uppercase">Clearance Progress</p>
                               </div>
                               <span className="text-5xl font-mono font-bold text-white leading-none">{Math.round(progress)}%</span>
                            </div>

                            <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                               <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: `${progress}%` }}
                                 transition={{ duration: 1.5, ease: "circOut" }}
                                 className="h-full bg-gradient-to-r from-primary via-accent to-primary rounded-full shadow-[0_0_20px_rgba(0,102,255,0.4)]"
                               />
                            </div>

                            <div className="flex justify-between items-center mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                               <span>{currentPoints.toLocaleString()} PTS COLLECTED</span>
                               <span className="text-white/10 font-mono tracking-tighter">THRESHOLD: {minWithdraw.toLocaleString()}</span>
                            </div>
                         </div>

                         {/* Status Cards */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-6 hover:border-white/10 transition-colors">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 text-orange-500">
                                     <Flame size={20} />
                                     <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Streak Factor</span>
                                  </div>
                                  <span className="text-lg font-bold text-white">{userData.streak || 0}D</span>
                               </div>
                               <p className="text-[12px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">Maintain consistency to increase your global reward multiplier up to <span className="text-white font-bold">2.5x</span>.</p>
                            </div>

                            <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-6 hover:border-white/10 transition-colors">
                               <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 text-accent">
                                     <TrendingIcon size={20} />
                                     <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Daily Activity</span>
                                  </div>
                                  <span className="text-lg font-bold text-success">+{userData.totalEarnedToday || 0}</span>
                               </div>
                               <p className="text-[12px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">Your account activity is being processed at <span className="text-success font-bold">Optimal Speed</span>. Last update detected 2m ago.</p>
                            </div>
                         </div>
                      </div>

                      {/* Right Detail Pillar */}
                      <div className="lg:col-span-4 space-y-8">
                         <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 space-y-8 group">
                            <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-2xl group-hover:scale-110 transition-transform">
                               <ShieldCheck size={28} />
                            </div>
                            <div className="space-y-2">
                               <h4 className="text-xl font-bold text-white uppercase tracking-tight">Account Verification</h4>
                               <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase tracking-tighter">Your account is fully verified and in good standing.</p>
                            </div>
                            <div className="pt-6 border-t border-white/5 space-y-4">
                               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-white/20">Security Grade</span>
                                  <span className="text-success font-mono">AAA+</span>
                               </div>
                               <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                  <span className="text-white/20">Compliance</span>
                                  <span className="text-success font-mono">PASSED</span>
                               </div>
                            </div>
                         </div>

                         <Card className="p-8 border-white/5 bg-white/[0.01] space-y-6 rounded-[2rem]">
                            <h5 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Account Summary</h5>
                            <div className="space-y-4">
                               <div className="flex justify-between text-sm font-medium">
                                  <span className="text-white/40">Market Rewards</span>
                                  <span className="text-white">---</span>
                               </div>
                               <div className="flex justify-between text-sm font-medium">
                                  <span className="text-white/40">Marketplace Yield</span>
                                  <span className="text-white">+{userData.stats?.tasksCompleted || 0}</span>
                               </div>
                               <div className="flex justify-between text-sm font-medium">
                                  <span className="text-white/40">Referral Bonus</span>
                                  <span className="text-white">+{userData.stats?.referralsCount || 0}</span>
                               </div>
                            </div>
                         </Card>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'ledger' && (
                <motion.div
                  key="ledger"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                   <Card className="p-0 border-white/10 bg-black overflow-hidden rounded-[2.5rem] shadow-2xl">
                      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                         <div className="flex items-center gap-3">
                            <HistoryIcon size={18} className="text-primary" />
                            <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Transaction Audit Log</h4>
                         </div>
                         <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">Immutable Record</span>
                      </div>

                      <div className="divide-y divide-white/5">
                         {loadingHistory ? (
                            <div className="py-32 flex flex-col items-center justify-center space-y-4">
                               <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                               <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Authorizing Data Signal...</p>
                            </div>
                         ) : transactions.length === 0 ? (
                            <div className="py-32 text-center space-y-6">
                               <HistoryIcon size={48} className="mx-auto text-white/5" />
                               <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.5em]">Ledger is empty</p>
                            </div>
                         ) : (
                           transactions.map((tx) => (
                             <div key={tx.id} className="p-8 flex items-center justify-between hover:bg-white/[0.01] transition-all group border-l-2 border-transparent hover:border-primary">
                                <div className="flex items-center gap-8">
                                   <div className={cn(
                                     "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all",
                                     tx.amount > 0 ? "bg-success/5 border-success/10 text-success" : "bg-primary/5 border-primary/10 text-primary"
                                   )}>
                                      {tx.amount > 0 ? <Plus size={24} /> : <TrendingIcon size={24} />}
                                   </div>
                                   <div>
                                      <h4 className="text-lg font-bold text-white tracking-tight group-hover:text-primary transition-colors">{tx.source}</h4>
                                      <div className="flex items-center gap-4 mt-1">
                                         <span className="text-[10px] font-mono text-white/20 uppercase">
                                            {tx.timestamp?.toDate().toLocaleString()}
                                         </span>
                                         <span className="text-[10px] font-bold text-white/10 uppercase tracking-widest px-2 py-0.5 rounded border border-white/5">{tx.type.replace('_', ' ')}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="text-right space-y-1">
                                   <p className={cn(
                                      "text-xl font-mono font-bold",
                                      tx.amount > 0 ? "text-success" : "text-white/40"
                                   )}>
                                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                   </p>
                                   <div className="flex items-center justify-end gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Verified</span>
                                   </div>
                                </div>
                             </div>
                           ))
                         )}
                      </div>
                   </Card>
                </motion.div>
              )}

              {activeTab === 'payout' && (
                <motion.div
                  key="payout"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-10"
                >
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-8">
                         <div className="space-y-3">
                            <h4 className="text-2xl font-bold text-white tracking-tight uppercase">Settlement Method</h4>
                            <p className="text-[12px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">Configure how you receive your converted rewards.</p>
                         </div>

                         <div className="space-y-4">
                            {[
                               { label: 'Direct Wallet Transfer', icon: CardIcon, status: 'Active' },
                               { label: 'Exchange Settlement', icon: Globe, status: 'Setup Required' }
                            ].map((item, i) => (
                               <div key={i} className="p-6 rounded-2xl bg-black border border-white/5 flex items-center justify-between group cursor-pointer hover:border-primary/50 transition-all">
                                  <div className="flex items-center gap-5">
                                     <item.icon size={20} className="text-white/20 group-hover:text-primary transition-colors" />
                                     <span className="text-[13px] font-bold text-white/80">{item.label}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{item.status}</span>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="p-10 rounded-[2.5rem] bg-danger/5 border border-danger/10 space-y-8">
                         <div className="space-y-3">
                            <h4 className="text-2xl font-bold text-danger tracking-tight uppercase">Account Protection</h4>
                            <p className="text-[12px] text-danger/40 leading-relaxed font-medium uppercase tracking-tight">Multi-layer verification protects your rewards and data.</p>
                         </div>
                         <div className="space-y-4">
                            <div className="flex items-start gap-5">
                               <ShieldAlert size={20} className="text-danger shrink-0 mt-1" />
                               <div>
                                  <p className="text-[13px] font-bold text-white/90">Fraud Prevention</p>
                                  <p className="text-[11px] text-white/30 leading-relaxed mt-1">Attempts to manipulate data will result in immediate account restriction.</p>
                               </div>
                            </div>
                            <div className="flex items-start gap-5">
                               <Lock size={20} className="text-danger shrink-0 mt-1" />
                               <div>
                                  <p className="text-[13px] font-bold text-white/90">Withdrawal Delay</p>
                                  <p className="text-[11px] text-white/30 leading-relaxed mt-1">High-value transfers require a 48h manual verification cycle.</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </section>

      </div>

      {/* ISOLATED MINIMALIST MODAL */}
      <AnimatePresence>
        {isLockedModalOpen && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLockedModalOpen(false)} className="absolute inset-0 bg-black/95 backdrop-blur-3xl" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-black border border-white/10 rounded-[3rem] p-12 overflow-hidden shadow-2xl">
                 <div className="absolute top-0 right-0 p-12 opacity-5">
                    <Lock size={180} />
                 </div>
                 <div className="relative z-10 text-center space-y-10">
                    <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-2xl">
                       <Lock size={40} />
                    </div>
                    <div className="space-y-4">
                       <h3 className="text-4xl font-bold text-white tracking-tighter uppercase">Threshold Not Met</h3>
                       <p className="text-[14px] text-white/40 leading-relaxed max-w-sm mx-auto font-medium uppercase tracking-tight">
                          You need at least <span className="text-white font-bold">{minWithdraw.toLocaleString()} PTS</span> to authorize a redemption request.
                       </p>
                    </div>
                    <div className="pt-4 flex flex-col gap-4">
                       <button onClick={() => navigate('/tasks')} className="w-full py-5 rounded-2xl bg-white text-black font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-white/90 transition-all shadow-xl">
                          Visit Marketplace
                       </button>
                       <button onClick={() => setIsLockedModalOpen(false)} className="w-full py-5 rounded-2xl bg-transparent text-white/20 font-bold text-[11px] uppercase tracking-[0.3em] hover:text-white transition-all">
                          Abort Request
                       </button>
                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Wallet;
