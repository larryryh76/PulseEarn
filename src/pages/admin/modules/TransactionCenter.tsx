import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Transaction } from '../../../types';
import { Activity, Search, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { cn } from '../../../utils';
import { formatUSD, PTS_TO_USD } from '../../../utils/finance';

const TransactionCenter = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Audit-grade ledger pulls from global system_claims as mirror of all injections
    const q = query(collection(db, 'system_claims'), orderBy('executedAt', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      setTxs(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Audit Ledger</h1>
          <p className="text-text-secondary text-sm">Real-time monitoring of all economic injections and settlements.</p>
        </div>
        <div className="relative w-80">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
           <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by UID or Claim ID..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all"
           />
        </div>
      </header>

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
           <thead>
              <tr className="bg-white/5 border-b border-white/10">
                 <th className="p-6 data-label">Protocol Vector</th>
                 <th className="p-6 data-label">Operator identity</th>
                 <th className="p-6 data-label">Payload</th>
                 <th className="p-6 data-label text-right">Timestamp</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
              {txs.map(tx => (
                <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-6">
                     <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-white/5", tx.amount > 0 ? "text-success" : "text-danger")}>
                           {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{tx.type}</span>
                     </div>
                  </td>
                  <td className="p-6">
                     <p className="text-xs font-mono text-white/60">{tx.userId.slice(0, 16)}...</p>
                  </td>
                  <td className="p-6">
                     <p className={cn("text-sm font-mono font-bold", tx.amount > 0 ? "text-success" : "text-danger")}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} PT
                     </p>
                     <p className="text-[9px] text-white/20 uppercase tracking-tighter mt-0.5">~ {formatUSD(PTS_TO_USD(tx.amount))}</p>
                  </td>
                  <td className="p-6 text-right text-[10px] font-mono text-text-secondary uppercase">
                     {(tx as any).executedAt?.toDate().toLocaleString()}
                  </td>
                </tr>
              ))}
           </tbody>
        </table>

        {txs.length === 0 && (
           <div className="py-40 text-center text-white/10">
              <Activity size={48} className="mx-auto mb-6" />
              <p className="text-xs font-bold uppercase tracking-widest">Transaction Flow Pending...</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default TransactionCenter;
