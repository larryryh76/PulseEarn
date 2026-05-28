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
      <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in">

        {/* Financial Authority Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.05] pb-10">
           <div className="space-y-1">
              <h2 className="section-label pr-10">Financial Command</h2>
              <h1 className="text-4xl font-bold tracking-tight">System Assets</h1>
              <p className="text-sm text-white/40">Secure authoritative ledger for your ecosystem capital.</p>
           </div>

           <div className="flex items-center gap-3">
              <button className="btn-secondary flex items-center gap-2">
                 <Download size={14} />
                 Statements
              </button>
              <button className="btn-primary flex items-center gap-2 px-8">
                 Withdrawal Gateway
              </button>
           </div>
        </section>

        {/* Apple Wallet Style Balance Deck */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

           <div className="lg:col-span-7 space-y-12">
              <motion.div
                whileHover={{ y: -5 }}
                className="bg-gradient-to-br from-primary/20 via-primary/5 to-surface border border-white/10 rounded-[3rem] p-12 relative overflow-hidden group shadow-2xl"
              >
                 <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:opacity-10 transition-opacity">
                    <WalletIcon size={200} />
                 </div>

                 <div className="relative z-10 space-y-10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                          <ShieldCheck size={12} className="text-primary" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Protected Account</span>
                       </div>
                       <Zap size={24} className="text-primary opacity-20" />
                    </div>

                    <div className="space-y-2">
                       <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Authorized Balance</p>
                       <div className="flex items-baseline gap-3">
                          <h2 className="text-7xl font-bold font-mono tracking-tighter text-glow">{userData.points.toLocaleString()}</h2>
                          <span className="text-2xl font-bold text-white/20">PTS</span>
                       </div>
                       <p className="text-xl font-bold text-white/40 tracking-tighter">
                          ≈ {formatUSD(PTS_TO_USD(userData.points))}
                       </p>
                    </div>

                    <div className="pt-10 border-t border-white/5 flex items-center gap-10">
                       <div>
                          <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest mb-1">Total Yield</p>
                          <p className="text-lg font-bold font-mono text-emerald-400">+{userData.stats?.totalEarnings.toLocaleString() || 0}</p>
                       </div>
                       <div className="w-px h-8 bg-white/5" />
                       <div>
                          <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest mb-1">Weekly Delta</p>
                          <p className="text-lg font-bold font-mono text-white/60">0.0%</p>
                       </div>
                    </div>
                 </div>
              </motion.div>

              {/* Transaction Ledger */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight">Audit Ledger</h3>
                    <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                       {(['ALL', 'REWARDS', 'ADJUSTMENTS'] as const).map(f => (
                          <button
                             key={f}
                             onClick={() => setActiveFilter(f)}
                             className={cn(
                                "px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                activeFilter === f ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40"
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

                    <button className="w-full btn-secondary text-[10px] py-4 group">
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
