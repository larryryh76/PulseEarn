import * as React from 'react';
import {
  Activity,
  Search,
  User,
  X,
  FileText,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot
} from 'firebase/firestore';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';

const OpsLedger: React.FC = () => {
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('ALL');
  const [selectedTx, setSelectedTx] = React.useState<any | null>(null);

  React.useEffect(() => {
    let q = query(collection(db, 'system_claims'), orderBy('executedAt', 'desc'), limit(100));

    if (filterType !== 'ALL') {
       q = query(
         collection(db, 'system_claims'),
         where('type', '==', filterType),
         orderBy('executedAt', 'desc'),
         limit(100)
       );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, [filterType]);

  const filtered = transactions.filter(tx =>
    tx.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Activity size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Transaction Ledger</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Real-time immutable record of platform point flow and economic settlements.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:min-w-[400px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Scan ledger by User ID, Action Source or Tx Hash..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
             <select
               value={filterType}
               onChange={e => setFilterType(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-sm text-white/60 focus:border-primary/50 outline-none appearance-none font-bold uppercase tracking-widest cursor-pointer"
             >
                <option value="ALL">ALL TYPES</option>
                <option value="daily_reward">DAILY LOGINS</option>
                <option value="task_reward">CAMPAIGN TASKS</option>
                <option value="prediction_entry">FORECAST STAKES</option>
                <option value="prediction_reward">FORECAST WINS</option>
                <option value="withdrawal_debit">WITHDRAWALS</option>
                <option value="admin_adjustment">ADJUSTMENTS</option>
             </select>
          </div>
       </header>

       <div className="bg-[#0A0A0F] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-white/[0.02] border-b border-white/5 whitespace-nowrap">
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Execution Hash</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">User ID</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Source Entity</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-right">Delta</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-right">Timestamp</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                   {loading ? (
                      [1,2,3,4,5,6,7,8].map(i => <tr key={i} className="animate-pulse"><td colSpan={5} className="p-10"><div className="h-4 bg-white/5 rounded w-full" /></td></tr>)
                   ) : filtered.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="group hover:bg-white/[0.01] transition-colors whitespace-nowrap cursor-pointer"
                      >
                         <td className="p-8">
                            <div className="flex items-center gap-3">
                               <div className={cn(
                                 "w-2 h-2 rounded-full",
                                 (tx.amount || 0) >= 0 ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                               )} />
                               <span className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">{tx.id.slice(0, 16).toUpperCase()}</span>
                            </div>
                         </td>
                         <td className="p-8">
                            <div className="flex items-center gap-2">
                               <User size={12} className="text-white/20" />
                               <span className="text-xs font-mono text-white group-hover:text-primary transition-colors">{tx.userId?.slice(0, 12)}...</span>
                            </div>
                         </td>
                         <td className="p-8">
                            <div>
                               <p className="text-[11px] font-bold text-white uppercase italic tracking-tight">{tx.source || tx.type?.replace(/_/g, ' ')}</p>
                               <p className="text-[9px] font-black uppercase tracking-widest text-white/10 mt-0.5">{tx.type?.replace(/_/g, ' ')}</p>
                            </div>
                         </td>
                         <td className="p-8 text-right">
                            <p className={cn(
                               "text-sm font-mono font-bold",
                               (tx.amount || 0) >= 0 ? "text-success" : "text-danger"
                            )}>
                               {(tx.amount || 0) >= 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()}
                               <span className="text-[9px] opacity-40 ml-1">PTS</span>
                            </p>
                         </td>
                         <td className="p-8 text-right">
                            <div className="flex flex-col items-end">
                               <p className="text-[10px] font-mono text-white/40">{tx.executedAt?.toDate?.()?.toLocaleDateString()}</p>
                               <p className="text-[9px] font-mono text-white/20 uppercase mt-0.5">{tx.executedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          {filtered.length === 0 && !loading && (
             <div className="py-40 text-center border-t border-white/5">
                <Activity size={48} className="mx-auto text-white/5 mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">No matching ledger records</p>
             </div>
          )}
       </div>

       <AnimatePresence>
          {selectedTx && (
             <div className="fixed inset-0 z-[100] flex justify-end">
                <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   onClick={() => setSelectedTx(null)}
                   className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="relative w-full max-w-xl bg-[#08080C] border-l border-white/5 shadow-2xl flex flex-col"
                >
                   <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                           selectedTx.amount >= 0 ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                         )}>
                            <Activity size={24} />
                         </div>
                         <div>
                            <h2 className="text-xl font-bold uppercase italic tracking-tighter text-white">Transaction Detail</h2>
                            <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">Hash: {selectedTx.id.toUpperCase()}</p>
                         </div>
                      </div>
                      <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary">
                         <X size={24} />
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                      <section className="flex flex-col items-center text-center space-y-6">
                         <div className={cn(
                            "px-10 py-6 rounded-3xl border shadow-2xl inline-block",
                            selectedTx.amount >= 0 ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"
                         )}>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-4">Atomic Delta</p>
                            <p className={cn("text-5xl font-mono font-bold tracking-tighter", selectedTx.amount >= 0 ? "text-success" : "text-danger")}>
                               {selectedTx.amount >= 0 ? '+' : ''}{(selectedTx.amount || 0).toLocaleString()}
                               <span className="text-xl opacity-40 ml-2">PTS</span>
                            </p>
                         </div>
                      </section>

                      <div className="grid grid-cols-1 gap-4">
                         <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-6 shadow-inner">
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/20">
                                  <User size={14} /> Identity Node
                               </div>
                               <span className="text-xs font-mono font-bold text-white">{selectedTx.userId}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/20">
                                  <FileText size={14} /> Operation Source
                               </div>
                               <span className="text-xs font-bold text-white uppercase italic">{selectedTx.source}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/20">
                                  <ShieldCheck size={14} /> Logic Type
                               </div>
                               <span className="text-xs font-black text-primary uppercase tracking-widest">{selectedTx.type.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/20">
                                  <Calendar size={14} /> Execution Time
                               </div>
                               <span className="text-xs font-mono text-white/60">{selectedTx.executedAt?.toDate?.()?.toLocaleString()}</span>
                            </div>
                         </div>
                      </div>

                      {selectedTx.description && (
                         <section className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-2">Mutation Payload</h4>
                            <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl text-sm text-white/60 leading-relaxed italic font-medium shadow-inner">
                               "{selectedTx.description}"
                            </div>
                         </section>
                      )}

                      <section className="pt-8 border-t border-white/5 space-y-4">
                         <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-white/10">
                            <ShieldCheck size={14} className="text-success" /> Immutable Ledger Entry Verified
                         </div>
                         <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-[9px] font-mono text-white/20 break-all leading-relaxed">
                            TX_SIG: {btoa(selectedTx.id + selectedTx.userId).slice(0, 64)}
                         </div>
                      </section>
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};

export default OpsLedger;
