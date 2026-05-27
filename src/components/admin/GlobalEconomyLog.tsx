import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import CardPremium from '../ui/Card';
import {
  Clock,
  User,
  Hash,
  AlertCircle,
  FileText
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white/40">
            <FileText size={20} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Monetary Ledger</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-white">Ecosystem Audit Log</h1>
        </div>

        <div className="flex items-center gap-4 px-4 py-2 rounded border border-white/5 bg-white/[0.01]">
           <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Live Feed</span>
           <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      </div>

      <CardPremium className="p-0 overflow-hidden bg-black border-white/[0.05] rounded-xl">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Execution Timestamp</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Transaction Nonce</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Account Subject</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Operation Type</th>
                     <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 text-right">Delta (PTS)</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-white/[0.02] transition-all">
                       <td className="p-6">
                          <div className="flex items-center gap-3 text-white/40">
                             <Clock size={12} className="text-white/20" />
                             <span className="text-[11px] font-mono tracking-tight">{tx.executedAt?.toDate().toLocaleString()}</span>
                          </div>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-2">
                             <Hash size={12} className="text-primary/30" />
                             <span className="text-[11px] font-mono text-white/50">{tx.id.slice(0, 20)}...</span>
                          </div>
                       </td>
                       <td className="p-6">
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center border border-white/5">
                                <User size={10} className="text-white/40" />
                             </div>
                             <span className="text-[11px] font-bold text-white/70">{tx.userId.slice(0, 12)}</span>
                          </div>
                       </td>
                       <td className="p-6">
                          <span className={cn(
                             "px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-widest border transition-colors",
                             tx.type === 'prediction_entry' ? 'bg-orange-500/5 text-orange-500/80 border-orange-500/10' :
                             tx.type === 'daily_reward' ? 'bg-success/5 text-success/80 border-success/10' :
                             'bg-white/5 text-white/40 border-white/10'
                          )}>
                             {tx.type.replace(/_/g, ' ')}
                          </span>
                       </td>
                       <td className="p-6 text-right">
                          <div className={cn(
                             "inline-flex items-center justify-end gap-1.5 font-mono font-bold text-[12px]",
                             tx.amount >= 0 ? "text-success" : "text-primary"
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
      </CardPremium>

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
