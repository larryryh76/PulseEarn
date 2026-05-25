import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import CardPremium from '../ui/Card';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  User,
  Hash,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../utils';

const GlobalEconomyLog: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Note: In a production app, use collectionGroup query
    // For this build, we'll monitor the system_claims (idempotency layer) for a global view
    const q = query(collection(db, 'system_claims'), orderBy('executedAt', 'desc'), limit(30));
    return onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Monetary Ledger</h2>
        <h1 className="text-3xl font-bold">Global Economy Log</h1>
      </div>

      <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                     <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-white/30">Timestamp</th>
                     <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-white/30">Claim ID / Nonce</th>
                     <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-white/30">Entity</th>
                     <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-white/30">Type</th>
                     <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-white/30 text-right">Delta</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/[0.02]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-white/[0.01] transition-colors">
                       <td className="p-5">
                          <div className="flex items-center gap-3 text-white/40">
                             <Clock size={12} />
                             <span className="text-[10px] font-mono">{tx.executedAt?.toDate().toLocaleTimeString()}</span>
                          </div>
                       </td>
                       <td className="p-5">
                          <div className="flex items-center gap-2">
                             <Hash size={12} className="text-primary/40" />
                             <span className="text-[10px] font-mono text-white/60">{tx.id.slice(0, 16)}...</span>
                          </div>
                       </td>
                       <td className="p-5">
                          <div className="flex items-center gap-2 text-white/80">
                             <User size={12} className="text-white/20" />
                             <span className="text-[11px] font-bold">{tx.userId.slice(0, 8)}</span>
                          </div>
                       </td>
                       <td className="p-5">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] font-bold uppercase text-white/40">
                             {tx.type}
                          </span>
                       </td>
                       <td className="p-5 text-right">
                          <div className={cn(
                             "flex items-center justify-end gap-1.5 font-mono font-bold text-xs",
                             tx.amount >= 0 ? "text-success" : "text-primary"
                          )}>
                             {tx.amount >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                             {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>

            {transactions.length === 0 && (
              <div className="p-20 text-center space-y-4">
                 <AlertCircle className="mx-auto text-white/5" size={40} />
                 <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.3em]">No historical transactions detected</p>
              </div>
            )}
         </div>
      </CardPremium>
    </div>
  );
};

export default GlobalEconomyLog;
