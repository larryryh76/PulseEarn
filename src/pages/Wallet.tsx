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
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

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
      <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        {/* Header section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Financial Terminal</h2>
            <h1 className="text-4xl font-bold tracking-tight">System Wallet</h1>
            <p className="text-sm text-white/40">Secure authoritative ledger for your ecosystem assets.</p>
          </div>

          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all">
                <Download size={14} />
                Export Ledger
             </button>
             <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all">
                Withdraw Assets
             </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left: Main Balance Card */}
           <div className="lg:col-span-2 space-y-8">
              <div className="glass-card p-10 rounded-[3rem] border-white/[0.05] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                    <WalletIcon size={180} />
                 </div>

                 <div className="flex items-start justify-between">
                    <div className="space-y-4 relative z-10">
                       <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full w-fit">
                          <ShieldCheck size={12} className="text-primary" />
                          <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Protected Assets</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-2">Available Balance</p>
                          <div className="flex items-baseline gap-3">
                             <h2 className="text-6xl font-bold font-mono tracking-tighter">{userData.points.toLocaleString()}</h2>
                             <span className="text-xl font-bold text-white/20 uppercase tracking-widest">PTS</span>
                          </div>
                          <p className="text-lg font-bold text-white/40 mt-1 uppercase tracking-tighter">
                             ≈ {formatUSD(PTS_TO_USD(userData.points))}
                          </p>
                       </div>
                    </div>

                    <div className="hidden md:flex flex-col items-end gap-2 text-right">
                       <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-1">Total Yield</p>
                          <p className="text-xl font-bold font-mono text-emerald-400">+{userData.stats?.totalEarnings.toLocaleString() || 0}</p>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12 relative z-10 pt-8 border-t border-white/5">
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                       <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Locked Rewards</p>
                       <p className="text-base font-bold font-mono">0.00 <span className="text-[10px] text-white/20">PTS</span></p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                       <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Pending Audit</p>
                       <p className="text-base font-bold font-mono text-amber-500">0.00 <span className="text-[10px] text-white/20">PTS</span></p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                       <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Total Withdrawn</p>
                       <p className="text-base font-bold font-mono">{userData.totalWithdrawn?.toLocaleString() || '0.00'} <span className="text-[10px] text-white/20">PTS</span></p>
                    </div>
                 </div>
              </div>

              {/* Transaction Ledger */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                          <Clock size={16} className="text-white/40" />
                       </div>
                       <h3 className="text-lg font-bold tracking-tight">Audit Ledger</h3>
                    </div>

                    <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                       {(['ALL', 'REWARDS', 'ADJUSTMENTS'] as const).map(f => (
                          <button
                             key={f}
                             onClick={() => setActiveFilter(f)}
                             className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                                activeFilter === f ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'
                             }`}
                          >
                             {f}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div className="glass-card border-white/[0.05] rounded-[2rem] overflow-hidden">
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/20">Execution</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/20">Source System</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/20 text-right">Settlement</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {loading ? (
                                [1,2,3].map(i => (
                                   <tr key={i} className="animate-pulse">
                                      <td colSpan={3} className="px-6 py-8 h-16 bg-white/[0.01]" />
                                   </tr>
                                ))
                             ) : filteredTransactions.map(tx => (
                                <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                   <td className="px-6 py-5">
                                      <div className="flex items-center gap-4">
                                         <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                                            tx.amount > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
                                         }`}>
                                            {tx.amount > 0 ? <ArrowDownLeft size={18} className="text-emerald-500" /> : <ArrowUpRight size={18} className="text-rose-500" />}
                                         </div>
                                         <div>
                                            <p className="text-sm font-bold text-white/90">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                               <span className="text-[9px] font-bold uppercase text-white/20 tracking-tighter">ID: {tx.id.substring(0, 10)}</span>
                                               <span className="w-1 h-1 rounded-full bg-white/10" />
                                               <span className="text-[9px] font-mono text-white/20">
                                                  {tx.timestamp instanceof Timestamp ? tx.timestamp.toDate().toLocaleString() : 'Processing'}
                                               </span>
                                            </div>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-6 py-5">
                                      <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-white/30 uppercase tracking-widest group-hover:text-white/60 transition-colors">
                                         {tx.source}
                                      </span>
                                   </td>
                                   <td className="px-6 py-5 text-right">
                                      <p className={`text-base font-bold font-mono ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                         {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                      </p>
                                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">PTS SECURED</p>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                    {!loading && filteredTransactions.length === 0 && (
                       <div className="p-20 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">No matching ledger entries found</p>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           {/* Right: Insights & Actions */}
           <div className="space-y-8">
              <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
                 <div className="flex items-center gap-3">
                    <Info size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Withdrawal Policy</h4>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Zap size={14} className="text-white/40" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Minimum Threshold</p>
                          <p className="text-sm font-bold mt-1">10,000 PTS</p>
                       </div>
                    </div>
                    <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <Clock size={14} className="text-white/40" />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Processing Cycle</p>
                          <p className="text-sm font-bold mt-1">24 - 48 Hours Audit</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                    <p className="text-[10px] font-medium text-amber-500/80 leading-relaxed">
                       Withdrawals are subject to manual security audit and verification of task completion authenticity.
                    </p>
                 </div>
              </div>

              <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
                 <div className="flex items-center justify-between">
                    <h4 className="text-base font-bold">Reward Velocity</h4>
                    <RefreshCw size={14} className="text-white/20 animate-spin-slow" />
                 </div>
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                          <span className="text-white/20">Daily Cap Usage</span>
                          <span className="text-primary">{(userData.totalEarnedToday / 5000 * 100).toFixed(0)}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                             initial={{ width: 0 }}
                             animate={{ width: `${userData.totalEarnedToday / 5000 * 100}%` }}
                             className="h-full bg-primary"
                          />
                       </div>
                       <p className="text-[9px] font-bold text-white/20 text-right uppercase tracking-tighter">
                          {userData.totalEarnedToday.toLocaleString()} / 5,000 PTS
                       </p>
                    </div>

                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl group cursor-pointer hover:border-primary transition-all">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <ShieldCheck size={14} className="text-primary" />
                             <span className="text-xs font-bold">Redeemable Items</span>
                          </div>
                          <ChevronRight size={14} className="text-white/20 group-hover:text-primary transition-all" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;
