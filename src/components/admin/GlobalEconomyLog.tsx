import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
  Clock,
  User,
  Hash,
  AlertCircle,
  Database
} from 'lucide-react';
import { cn } from '../../utils';

const GlobalEconomyLog: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Note: In a production app, use collectionGroup query
    // For this build, we'll monitor the system_claims (idempotency layer) for a global view
    const q = query(collection(db, 'system_claims'), orderBy('executedAt', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div className="space-y-10 pb-20 animate-in">

      {/* Dense Operational Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Database size={20} className="text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pr-10 border-r border-white/10">Financial Infrastructure</h2>
            <div className="flex items-center gap-2 pl-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest">Auth Ledger Active</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Global Audit Ledger</h1>
          <p className="text-sm text-white/40 font-medium">Immutable record of all ecosystem monetary flows and point mutations.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center gap-8">
              <div className="flex flex-col">
                 <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Active Stream</span>
                 <span className="text-xs font-mono font-bold text-emerald-400">CONNECTING...</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col">
                 <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Ledger Version</span>
                 <span className="text-xs font-mono font-bold text-white/60">5.0.0-PRO</span>
              </div>
           </div>
        </div>
      </div>

      {/* High-Density Audit Table */}
      <div className="bg-[#08080a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Execution Timestamp</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Transaction Nonce</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Subject Entity</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Protocol Operation</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Settlement (PTS)</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-3 text-white/40">
                             <Clock size={14} className="text-primary/40" />
                             <span className="text-xs font-mono tracking-tight font-bold group-hover:text-white transition-colors">{tx.executedAt?.toDate().toLocaleString()}</span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                             <Hash size={12} className="text-white/10 group-hover:text-primary transition-colors" />
                             <span className="text-xs font-mono text-white/30 group-hover:text-white/60 transition-colors">{tx.id}</span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/20 transition-all">
                                <User size={14} className="text-white/20 group-hover:text-primary transition-colors" />
                             </div>
                             <span className="text-xs font-bold text-white/70 group-hover:text-white">{tx.userId.slice(0, 12)}...</span>
                          </div>
                       </td>
                       <td className="px-8 py-6">
                          <span className={cn(
                             "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
                             tx.type === 'prediction_entry' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                             tx.type === 'daily_reward' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                             'bg-white/5 text-white/40 border-white/10 group-hover:border-white/20'
                          )}>
                             {tx.type.replace(/_/g, ' ')}
                          </span>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <div className={cn(
                             "inline-flex items-center justify-end gap-1.5 font-mono font-black text-sm",
                             tx.amount >= 0 ? "text-emerald-400" : "text-primary"
                          )}>
                             {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>

            {transactions.length === 0 && (
              <div className="p-24 text-center">
                 <AlertCircle className="mx-auto text-white/[0.02] mb-6" size={48} />
                 <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">Ledger state: empty</p>
              </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-6 rounded-xl border border-white/5 bg-black">
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] mb-4">Integrity Guarantee</p>
            <p className="text-[11px] text-white/40 leading-relaxed italic">
               All transactions are processed through the Atomic Point Engine v5.0 and recorded in this immutable audit trail.
            </p>
         </div>
         <div className="md:col-span-2 p-6 rounded-xl border border-white/5 bg-black flex items-center justify-between">
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Global Payout Velocity</p>
               <p className="text-[20px] font-bold text-white">Nominal</p>
            </div>
            <div className="h-8 w-32 bg-white/5 rounded relative overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-around px-2">
                  {[40, 70, 45, 90, 65, 80, 50, 60].map((h, i) => (
                    <div key={i} className="w-1.5 bg-primary/20 rounded-t" style={{ height: `${h}%` }} />
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default GlobalEconomyLog;
