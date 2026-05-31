import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Transaction } from '../types';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Download,
  ShieldCheck,
  Zap,
  ExternalLink,
  History,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';

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
    if (activeFilter === 'ADJUSTMENTS') return tx.type === 'admin_adjustment' || tx.type === 'penalty' || tx.type === 'AI_SYSTEM_CORRECTION';
    return true;
  });

  if (!userData) return null;

  return (
    <DashboardLayout>
      <div className="max-w-[1200px] mx-auto space-y-12 pb-24 animate-in">

        {/* FINTECH HEADER: Balance focused */}
        <section className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-[3rem] p-12 lg:p-16 text-center space-y-10">
           <div className="absolute inset-0 v2-gradient-bg opacity-30 pointer-events-none" />

           <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-center gap-2 text-primary">
                 <ShieldCheck size={16} />
                 <span className="text-[10px] font-black uppercase tracking-[0.4em]">Verified Ledger</span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/20">Total Account Balance</p>
              <div className="flex items-baseline justify-center gap-4">
                 <h1 className="text-7xl md:text-9xl font-bold font-mono tracking-tighter text-white leading-none">
                    {userData.points.toLocaleString()}
                 </h1>
                 <span className="text-2xl md:text-3xl font-bold text-white/20 uppercase tracking-widest">PTS</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-2xl font-medium text-white/40 tracking-tight">
                 <span>≈ {formatUSD(PTS_TO_USD(userData.points))}</span>
              </div>
           </div>

           <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
              <button
                onClick={() => toast.success("Withdrawal gateway opening soon")}
                className="px-10 py-5 bg-white text-black rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-white/90 active:scale-95 transition-all flex items-center gap-3"
              >
                 <CreditCard size={18} />
                 Redeem Rewards
              </button>
              <button
                onClick={() => toast.error("Export service temporarily offline")}
                className="px-8 py-5 bg-white/[0.03] border border-white/10 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 active:scale-95 transition-all flex items-center gap-3"
              >
                 <Download size={18} />
                 Export History
              </button>
           </div>
        </section>

        {/* MAIN LEDGER COMPOSITION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

           {/* LEDGER STREAM (8 cols) */}
           <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                    <History size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Transaction History</h3>
                 </div>
                 <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/5">
                    {(['ALL', 'REWARDS', 'ADJUSTMENTS'] as const).map(f => (
                       <button
                          key={f}
                          onClick={() => setActiveFilter(f)}
                          className={cn(
                             "px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                             activeFilter === f ? "bg-white/5 text-white shadow-sm" : "text-white/20 hover:text-white/40"
                          )}
                       >
                          {f}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/[0.03]">
                 {loading ? (
                    [1,2,3,4,5].map(i => <div key={i} className="h-20 bg-white/[0.01] animate-pulse" />)
                 ) : filteredTransactions.length === 0 ? (
                    <div className="py-32 text-center space-y-4">
                       <History size={48} className="mx-auto opacity-5" />
                       <p className="text-[10px] font-black opacity-20 uppercase tracking-[0.3em]">No transaction records found</p>
                    </div>
                 ) : filteredTransactions.map(tx => (
                    <div key={tx.id} className="p-6 px-10 flex items-center justify-between hover:bg-white/[0.01] transition-all group">
                       <div className="flex items-center gap-6">
                          <div className={cn(
                             "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                             tx.amount > 0 ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-500" : "bg-rose-500/5 border-rose-500/10 text-rose-500"
                          )}>
                             {tx.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                          </div>
                          <div>
                             <p className="text-base font-bold text-white/90 group-hover:text-white transition-colors">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                             <div className="flex items-center gap-3 mt-1">
                                <p className="text-[10px] font-bold uppercase text-white/20">{tx.source}</p>
                                <div className="w-1 h-1 rounded-full bg-white/5" />
                                <p className="text-[9px] font-mono text-white/10 uppercase">
                                   {tx.timestamp instanceof Timestamp ? tx.timestamp.toDate().toLocaleDateString() : 'Processing'}
                                </p>
                             </div>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={cn(
                             "text-xl font-bold font-mono tracking-tight",
                             tx.amount > 0 ? "text-emerald-400" : "text-rose-400"
                          )}>
                             {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                          </p>
                          <p className="text-[8px] font-black text-white/10 uppercase tracking-widest mt-0.5">Verified</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* WALLET INSIGHTS (4 cols) */}
           <div className="lg:col-span-4 space-y-10">

              <div className="v2-stat-card p-10 space-y-8">
                 <div className="flex items-center gap-3">
                    <TrendingUp size={20} className="text-emerald-500" />
                    <h4 className="text-sm font-bold uppercase tracking-widest">Earnings Insight</h4>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">All-Time Rewards</p>
                       <p className="text-3xl font-mono font-bold text-white">+{userData.stats?.totalEarnings.toLocaleString() || 0}</p>
                    </div>
                    <div className="h-px bg-white/5 w-full" />
                    <div className="space-y-1">
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Settled Transactions</p>
                       <p className="text-3xl font-mono font-bold text-white">{transactions.length}</p>
                    </div>
                 </div>
              </div>

              <div className="p-10 border border-white/5 rounded-[2.5rem] bg-white/[0.01] space-y-8">
                 <div className="flex items-center gap-3 text-primary">
                    <Zap size={20} />
                    <h4 className="text-sm font-bold uppercase tracking-widest">Account Limits</h4>
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-3">
                       <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-white/20">Daily Earning Limit</span>
                          <span className="text-primary">{Math.min(100, (userData.totalEarnedToday / 5000 * 100)).toFixed(0)}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                             initial={{ width: 0 }}
                             animate={{ width: `${Math.min(100, (userData.totalEarnedToday / 5000 * 100))}%` }}
                             className="h-full bg-primary shadow-[0_0_15px_rgba(0,102,255,0.4)]"
                          />
                       </div>
                    </div>
                    <button
                      onClick={() => toast.success("Limit increase request logged")}
                      className="w-full btn-secondary text-[10px] py-4 group"
                    >
                       Request Higher Limit
                    </button>
                 </div>
              </div>

              <div className="p-8 border border-white/5 rounded-[2.5rem] space-y-4">
                 <div className="flex items-center gap-2 text-white/20">
                    <ExternalLink size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Policy References</span>
                 </div>
                 <p className="text-xs text-white/30 leading-relaxed font-medium">
                    Redemption is subject to manual review and verification of all task completions. PulseEarn preserves an immutable audit trail for every point mutation.
                 </p>
              </div>

           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
