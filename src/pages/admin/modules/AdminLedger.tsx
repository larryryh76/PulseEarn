import * as React from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Search,
  AlertCircle
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';

const AdminLedger = () => {
  const [txs, setTxs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(
      collection(db, 'system_claims'),
      orderBy('executedAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setTxs(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })));
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Ledger fetch failed:", err);
      setError("Unable to load transaction data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredTxs = txs.filter((tx: any) =>
    tx.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Ledger</h1>
          <p className="text-text-secondary text-sm font-medium">Real-time global record of all economic injections and settlements.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by UID or Type..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
            />
          </div>
        </div>
      </header>

      {error ? (
        <div className="p-12 text-center bg-danger/5 border border-danger/20 rounded-[3rem] text-danger flex flex-col items-center gap-4">
           <AlertCircle size={40} />
           <p className="font-bold uppercase tracking-widest text-sm">{error}</p>
        </div>
      ) : (
        <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Reference</th>
                  <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Type</th>
                  <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-right">Magnitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {loading ? (
                  [1,2,3,4,5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={3} className="p-8"><div className="h-4 bg-white/5 rounded w-full" /></td>
                    </tr>
                  ))
                ) : filteredTxs.length > 0 ? (
                  filteredTxs.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-8">
                        <p className="text-xs font-mono text-white/40 group-hover:text-primary transition-colors">{tx.id}</p>
                      </td>
                      <td className="p-8">
                         <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center",
                              tx.amount >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                            )}>
                               {tx.amount >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-widest">{tx.type?.replace('_', ' ')}</span>
                         </div>
                      </td>
                      <td className="p-8 text-right">
                        <p className={cn("text-sm font-mono font-bold", tx.amount >= 0 ? "text-success" : "text-danger")}>
                          {tx.amount >= 0 ? '+' : ''}{tx.amount?.toLocaleString()} <span className="text-[9px] opacity-40">PTS</span>
                        </p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-24 text-center">
                      <Activity size={48} className="mx-auto text-white/5 mb-6" />
                      <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">No transactions available.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLedger;
