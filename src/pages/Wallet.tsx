import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction } from '../types';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Download,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'REWARDS' | 'ADJUSTMENTS'>('ALL');

  useEffect(() => {
    if (!userData?.uid) return;
    const q = query(collection(db, 'users', userData.uid, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, snap => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoading(false);
    });
  }, [userData?.uid]);

  const filteredTransactions = transactions.filter(tx => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'REWARDS') return tx.type.includes('reward') || tx.type.includes('bonus');
    if (activeFilter === 'ADJUSTMENTS') return tx.type === 'admin_adjustment' || tx.type === 'penalty';
    return true;
  });

  if (!userData) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-10 pb-24 animate-in">

        {/* Financial Authority Header */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
           <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,102,255,0.5)]" />
                 <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">System Assets</h2>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Wallet Control</h1>
              <p className="text-base text-white/40 max-w-xl leading-relaxed">
                 Secure authoritative ledger for your ecosystem capital. All transactions are signed and verified by the Pulse-Core financial engine.
              </p>
           </div>

           <div className="flex flex-wrap items-center gap-4 relative z-10">
              <button
                onClick={() => toast.error("Ledger Export: Authorization Pending")}
                className="px-6 py-3.5 bg-white/[0.03] border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/[0.05] transition-all flex items-center gap-2"
              >
                 <Download size={14} />
                 Export Ledger
              </button>
              <button
                onClick={() => toast.error("Gateway Offline: Minimum 10,000 PTS required")}
                className="px-8 py-4 bg-primary text-white rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                 Withdrawal Gateway
              </button>
           </div>

           <WalletIcon size={300} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.01] pointer-events-none" />
        </section>

        {/* Main Wallet Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

           {/* Left Deck: Balance & Ledger (7 cols) */}
           <div className="lg:col-span-7 space-y-10">

              {/* Premium Balance Visualization */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-primary/10 via-primary/[0.02] to-transparent border border-primary/20 rounded-[3rem] p-12 relative overflow-hidden group shadow-2xl"
              >
                 <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                    <WalletIcon size={180} />
                 </div>

                 <div className="relative z-10 space-y-10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
                          <ShieldCheck size={12} className="text-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary">Protected Asset Node</span>
                       </div>
                       <Zap size={24} className="text-primary opacity-30" />
                    </div>

                    <div className="space-y-4">
                       <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/20">Liquid Authority</p>
                       <div className="flex items-baseline gap-4">
                          <h2 className="text-7xl md:text-8xl font-bold font-mono tracking-tighter text-glow leading-none">
                             {userData.points.toLocaleString()}
                          </h2>
                          <span className="text-2xl md:text-3xl font-bold text-white/20 uppercase tracking-tighter">PTS</span>
                       </div>
                       <div className="flex items-center gap-3 text-2xl font-bold text-white/40 tracking-tighter">
                          <span>≈ {formatUSD(PTS_TO_USD(userData.points))}</span>
                          <span className="text-xs uppercase text-white/10 tracking-[0.2em] font-medium pt-2">Operational Estimate</span>
                       </div>
                    </div>

                    <div className="pt-10 border-t border-white/5 grid grid-cols-2 md:grid-cols-3 gap-8">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase text-white/20 tracking-[0.2em]">All-Time Yield</p>
                          <p className="text-xl font-bold font-mono text-emerald-400">+{userData.stats?.totalEarnings.toLocaleString() || 0}</p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase text-white/20 tracking-[0.2em]">Settled Tx</p>
                          <p className="text-xl font-bold font-mono text-white/60">{transactions.length}</p>
                       </div>
                    </div>
                 </div>
              </motion.div>

              {/* Enhanced Transaction Ledger */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                       <Activity size={18} className="text-primary" />
                       <h3 className="text-xl font-bold tracking-tight uppercase">Audit Ledger</h3>
                    </div>
                    <div className="flex items-center gap-2 bg-white/[0.03] p-1 rounded-xl border border-white/10">
                       {(['ALL', 'REWARDS', 'ADJUSTMENTS'] as const).map(f => (
                          <button
                             key={f}
                             onClick={() => setActiveFilter(f)}
                             className={cn(
                                "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                activeFilter === f ? "bg-white/10 text-white shadow-lg" : "text-white/20 hover:text-white/40"
                             )}
                          >
                             {f}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-1">
                    {loading ? (
                       [1,2,3,4].map(i => <div key={i} className="h-16 rounded-2xl bg-white/[0.01] animate-pulse mb-2" />)
                    ) : filteredTransactions.length === 0 ? (
                       <div className="py-20 text-center glass-panel rounded-[2rem] border-white/5">
                          <p className="text-sm font-bold opacity-20 uppercase tracking-widest">No matching ledger entries</p>
                       </div>
                    ) : filteredTransactions.map(tx => (
                       <div key={tx.id} className="fintech-ledger-row px-4 group hover:bg-white/[0.03]">
                          <div className="flex items-center gap-4">
                             <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center border",
                                tx.amount > 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                             )}>
                                {tx.amount > 0 ? <ArrowDownLeft size={16} className="text-emerald-500" /> : <ArrowUpRight size={16} className="text-rose-500" />}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white/90 group-hover:text-primary transition-colors">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                                <p className="text-[10px] font-bold uppercase text-white/20 mt-0.5">{tx.source}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <p className={cn(
                                "text-sm font-bold font-mono",
                                tx.amount > 0 ? "text-emerald-400" : "text-rose-400"
                             )}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                             </p>
                             <p className="text-[9px] font-bold text-white/20 uppercase">
                                {tx.timestamp instanceof Timestamp ? tx.timestamp.toDate().toLocaleDateString() : 'Pending'}
                             </p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Policy & State Context (5 cols) */}
           <div className="lg:col-span-5 space-y-8">

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                 <div className="flex items-center gap-3">
                    <Info size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Policy Governance</h4>
                 </div>
                 <div className="space-y-4">
                    {[
                       { label: 'Minimum Withdrawal', value: '10,000 PTS', icon: Zap },
                       { label: 'Audit Duration', value: '24 - 48 Hours', icon: Clock },
                       { label: 'Network Clearance', value: 'Verified Agent', icon: ShieldCheck },
                    ].map((item, i) => (
                       <div key={i} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl group hover:border-primary transition-all">
                          <div className="flex items-center gap-3">
                             <item.icon size={14} className="text-white/20 group-hover:text-primary transition-colors" />
                             <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{item.label}</span>
                          </div>
                          <span className="text-xs font-bold text-white/80">{item.value}</span>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 bg-primary/[0.02]">
                 <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold">Yield Velocity</h4>
                    <RefreshCw size={14} className="text-primary/40 animate-spin-slow" />
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-3">
                       <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-white/20">Daily Cap Utilization</span>
                          <span className="text-primary">{Math.min(100, (userData.totalEarnedToday / 5000 * 100)).toFixed(0)}%</span>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(100, (userData.totalEarnedToday / 5000 * 100))}%` }}
                             className="h-full bg-primary shadow-[0_0_15px_rgba(0,112,255,0.4)]"
                          />
                       </div>
                       <p className="text-[10px] font-bold text-white/30 text-right uppercase tracking-tighter">
                          {userData.totalEarnedToday.toLocaleString()} / 5,000 PTS AUTHORIZED
                       </p>
                    </div>

                    <button
                      onClick={() => toast.success("Capacity Request Logged")}
                      className="w-full btn-secondary text-[10px] py-4 group"
                    >
                       <div className="flex items-center justify-center gap-2">
                          <span>Request Capacity Increase</span>
                          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                       </div>
                    </button>
                 </div>
              </div>

              <div className="p-8 border border-white/[0.05] rounded-[2.5rem] bg-white/[0.01]">
                 <div className="flex items-center gap-3 mb-4">
                    <ExternalLink size={16} className="text-white/20" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Authoritative References</span>
                 </div>
                 <div className="space-y-2">
                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                       All ledger entries are immutable and signed by the Pulse-core engine. Payouts are subject to verification of task completion authenticity.
                    </p>
                 </div>
              </div>

           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
