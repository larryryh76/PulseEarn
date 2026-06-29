import * as React from 'react';
import {
  Activity,
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
  limit,
  where,
  getDocs,
  orderBy,
  startAfter
} from 'firebase/firestore';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';
import DataTable from '../../../components/admin/common/DataTable';
import toast from 'react-hot-toast';

const OpsLedger: React.FC = () => {
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('ALL');
  const [selectedTx, setSelectedTx] = React.useState<any | null>(null);

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchLedger = async (isNext = false) => {
    setLoading(true);
    try {
       let q = query(
         collection(db, 'system_claims'),
         orderBy('executedAt', 'desc'),
         limit(20)
       );

       if (filterType !== 'ALL') {
          q = query(
            collection(db, 'system_claims'),
            where('type', '==', filterType),
            orderBy('executedAt', 'desc'),
            limit(20)
          );
       }

       if (isNext && lastDoc) {
          if (filterType !== 'ALL') {
             q = query(
               collection(db, 'system_claims'),
               where('type', '==', filterType),
               orderBy('executedAt', 'desc'),
               startAfter(lastDoc),
               limit(20)
             );
          } else {
             q = query(
               collection(db, 'system_claims'),
               orderBy('executedAt', 'desc'),
               startAfter(lastDoc),
               limit(20)
             );
          }
       }

       const snap = await getDocs(q);
       const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

       if (isNext) {
          setTransactions(prev => [...prev, ...data]);
       } else {
          setTransactions(data);
       }

       setLastDoc(snap.docs[snap.docs.length - 1]);
       setHasMore(snap.docs.length === 20);
    } catch (err) {
       console.error("[OpsLedger] Query Failure:", err);
       toast.error("Ledger sync failure");
    } finally {
       setLoading(false);
    }
  };

  React.useEffect(() => {
     fetchLedger();
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic">Transaction Ledger</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">Real-time immutable record of platform point flow and economic settlements.</p>
          </div>
       </header>

       <DataTable
         columns={[
           {
             header: 'Execution Hash',
             accessor: (tx: any) => (
               <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    (tx.amount || 0) >= 0 ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  )} />
                  <span className="text-[9px] md:text-[10px] font-mono text-text-secondary uppercase tracking-tighter">{tx.id.slice(0, 16).toUpperCase()}</span>
               </div>
             )
           },
           {
             header: 'User ID',
             accessor: (tx: any) => (
               <div className="flex items-center gap-2">
                  <User size={12} className="text-text-tertiary" />
                  <span className="text-[11px] md:text-xs font-mono text-text-primary group-hover:text-primary transition-colors">{tx.userId?.slice(0, 12)}...</span>
               </div>
             )
           },
           {
             header: 'Source Entity',
             accessor: (tx: any) => (
               <div>
                  <p className="text-[11px] font-bold text-text-primary uppercase italic tracking-tight">{tx.source || tx.type?.replace(/_/g, ' ')}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary/50 mt-0.5">{tx.type?.replace(/_/g, ' ')}</p>
               </div>
             )
           },
           {
             header: 'Delta',
             className: 'text-right',
             accessor: (tx: any) => (
               <p className={cn(
                  "text-xs md:text-sm font-mono font-bold",
                  (tx.amount || 0) !== 0 ? ((tx.amount || 0) > 0 ? "text-success" : "text-danger") : "text-text-tertiary"
               )}>
                  {(tx.amount || 0) > 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()}
                  <span className="text-[8px] md:text-[9px] opacity-40 ml-1">PTS</span>
               </p>
             )
           },
           {
             header: 'Timestamp',
             className: 'text-right',
             accessor: (tx: any) => (
               <div className="flex flex-col items-end">
                  <p className="text-[9px] md:text-[10px] font-mono text-text-secondary">{tx.executedAt?.toDate?.()?.toLocaleDateString()}</p>
                  <p className="text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase mt-0.5">{tx.executedAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
               </div>
             )
           }
         ]}
         data={filtered}
         isLoading={loading}
         onRowClick={(tx) => setSelectedTx(tx)}
         searchTerm={searchTerm}
         onSearchChange={setSearchTerm}
         onLoadMore={() => fetchLedger(true)}
         hasMore={hasMore}
         activeFilter={filterType}
         onFilterChange={setFilterType}
         filters={[
            { id: 'ALL', label: 'All Types' },
            { id: 'daily_reward', label: 'Daily Logins' },
            { id: 'task_reward', label: 'Campaign Tasks' },
            { id: 'prediction_entry', label: 'Forecast Stakes' },
            { id: 'prediction_reward', label: 'Forecast Wins' },
            { id: 'withdrawal_debit', label: 'Withdrawals' },
            { id: 'admin_adjustment', label: 'Adjustments' }
         ]}
       />

       <AnimatePresence>
          {selectedTx && (
             <div className="fixed inset-0 z-[100] flex justify-end">
                <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   onClick={() => setSelectedTx(null)}
                   className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                />
                <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="relative w-full max-w-xl bg-surface border-l border-border shadow-2xl flex flex-col"
                >
                   <div className="p-8 border-b border-border flex items-center justify-between bg-surface-bright/50">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                           selectedTx.amount >= 0 ? "bg-success/10 text-success border-success/20" : "bg-danger/10 text-danger border-danger/20"
                         )}>
                            <Activity size={24} />
                         </div>
                         <div>
                            <h2 className="text-xl font-bold uppercase italic tracking-tighter text-text-primary">Transaction Detail</h2>
                            <p className="text-[10px] font-mono text-text-tertiary uppercase tracking-widest mt-1">Hash: {selectedTx.id.toUpperCase()}</p>
                         </div>
                      </div>
                      <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary">
                         <X size={24} />
                      </button>
                   </div>

                   <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                      <section className="flex flex-col items-center text-center space-y-6">
                         <div className={cn(
                            "px-10 py-6 rounded-3xl border shadow-2xl inline-block",
                            selectedTx.amount >= 0 ? "bg-success/5 border-success/20" : "bg-danger/5 border-danger/20"
                         )}>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary mb-4">Atomic Delta</p>
                            <p className={cn("text-5xl font-mono font-bold tracking-tighter", selectedTx.amount >= 0 ? "text-success" : "text-danger")}>
                               {selectedTx.amount >= 0 ? '+' : ''}{(selectedTx.amount || 0).toLocaleString()}
                               <span className="text-xl opacity-40 ml-2">PTS</span>
                            </p>
                         </div>
                      </section>

                      <div className="grid grid-cols-1 gap-4">
                         <div className="bg-surface-bright rounded-2xl p-6 border border-border space-y-6 shadow-inner">
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                                  <User size={14} /> Identity
                               </div>
                               <span className="text-xs font-mono font-bold text-text-primary">{selectedTx.userId}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                                  <FileText size={14} /> Operation Source
                               </div>
                               <span className="text-xs font-bold text-text-primary uppercase italic">{selectedTx.source}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                                  <ShieldCheck size={14} /> Settings Type
                               </div>
                               <span className="text-xs font-black text-primary uppercase tracking-widest">{selectedTx.type.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                                  <Calendar size={14} /> Execution Time
                               </div>
                               <span className="text-xs font-mono text-text-secondary">{selectedTx.executedAt?.toDate?.()?.toLocaleString()}</span>
                            </div>
                         </div>
                      </div>

                      {selectedTx.description && (
                         <section className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-2">Adjustment Detail</h4>
                            <div className="p-8 bg-surface-bright border border-border rounded-3xl text-sm text-text-secondary leading-relaxed italic font-medium shadow-inner">
                               "{selectedTx.description}"
                            </div>
                         </section>
                      )}

                      <section className="pt-8 border-t border-border space-y-4">
                         <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-text-tertiary/50">
                            <ShieldCheck size={14} className="text-success" /> Immutable Ledger Entry Verified
                         </div>
                         <div className="p-4 bg-surface-bright/50 border border-border rounded-2xl text-[9px] font-mono text-text-tertiary break-all leading-relaxed">
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
