import * as React from "react";
import {
  CreditCard,
  Search,
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
  limit
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';
import { formatUSD } from '../../../utils/finance';
import { WithdrawalRequest } from '../../../types';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';

const OpsWithdrawals: React.FC = () => {
  const [requests, setRequests] = React.useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<WithdrawalRequest['status']>('PENDING');
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(
      collection(db, 'withdrawals'),
      where('status', '==', filter),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest));
      data.sort((a, b) => {
         const timeA = (a.createdAt as any)?.toMillis?.() || 0;
         const timeB = (b.createdAt as any)?.toMillis?.() || 0;
         return timeB - timeA;
      });
      setRequests(data);
      setLoading(false);
    }, (err) => {
       console.error("[OpsWithdrawals] Sync Failure:", err);
       setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  const handleAction = async (id: string, status: WithdrawalRequest['status'], userId: string) => {
    const loadingToast = toast.loading('Updating withdrawal status...');
    try {
      const updateData: any = {
        status,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (status === 'PAID') {
         // Priority 2: Standardized Withdrawal Mutation
         // Use the PointTransactionEngine for atomic accounting and side effects
         const req = requests.find(r => r.id === id);
         if (req) {
            const res = await PointTransactionEngine.execute({
               userId,
               amount: 0, // Points already debited at request time
               type: 'withdrawal_finalized' as any,
               source: 'Withdrawal Payout',
               claimId: `paid_${id}`,
               metadata: { withdrawalId: id, amount: req.amountPoints },
               bypassLock: true
            });
            if (!res.success) throw new Error(res.error);
         }
         updateData.paidAt = serverTimestamp();
      }

      if (status === 'REJECTED') {
         const req = requests.find(r => r.id === id);
         if (req) {
            await PointTransactionEngine.execute({
               userId,
               amount: req.amountPoints,
               type: 'admin_adjustment',
               source: 'Withdrawal Rejected',
               claimId: `rev_${id}`,
               description: `Points reversal for rejected withdrawal #${id.slice(0,8)}`,
               bypassLock: true
            });
         }
      }

      await updateDoc(doc(db, 'withdrawals', id), updateData);
      toast.dismiss(loadingToast);
      toast.success(`Withdrawal ${status.toLowerCase()}`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to update withdrawal status");
    }
  };

  const filtered = requests.filter(r =>
    r.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       {/* COMMAND HEADER */}
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Withdrawal Management</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Manage and process user withdrawal requests and payouts.</p>
          </div>

          <div className="flex bg-surface-bright p-1 rounded-xl border border-border">
             {['PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={cn(
                    "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === s ? "bg-primary text-text-primary shadow-lg shadow-primary/20" : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                   {s}
                </button>
             ))}
          </div>
       </header>

       {/* QUEUE TABLE */}
       <div className="bg-surface border border-border rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-border bg-surface-bright/50">
             <div className="relative group w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Scan queue by Email or Wallet..."
                  className="w-full bg-surface-bright border border-border-bright rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
             <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
                <thead>
                   <tr className="bg-surface-bright border-b border-border whitespace-nowrap">
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">User</th>
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Amount</th>
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Destination</th>
                      <th className="p-6 md:p-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary text-right">Actions</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                   {loading ? (
                      [1,2,3,4].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="p-12"><div className="h-4 bg-surface-bright rounded w-full" /></td></tr>)
                   ) : filtered.map((req) => (
                      <tr key={req.id} className="group hover:bg-surface-bright/50 transition-colors whitespace-nowrap">
                         <td className="p-6 md:p-8">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary/50 group-hover:text-primary transition-colors">
                                  <User size={18} />
                               </div>
                               <div>
                               <p className="text-xs md:text-sm font-bold text-text-primary uppercase italic leading-none mb-1">{req.username}</p>
                               <p className="text-[9px] md:text-[10px] font-mono text-text-tertiary uppercase tracking-widest">{req.userEmail}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-6 md:p-8">
                            <div>
                               <p className="text-xs md:text-sm font-mono font-bold text-text-primary">{req.amountPoints.toLocaleString()} PTS</p>
                               <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-success mt-1 italic">{formatUSD(req.amountUSD)}</p>
                            </div>
                         </td>
                         <td className="p-6 md:p-8">
                            <div className="space-y-1.5">
                               <p className="text-[9px] md:text-[10px] font-mono text-text-secondary uppercase tracking-tighter truncate max-w-[200px]">{req.walletAddress}</p>
                               <div className="flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(0,102,255,1)]" />
                                  <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary">{req.network}</span>
                               </div>
                            </div>
                         </td>
                         <td className="p-6 md:p-8 text-right">
                            <div className="flex justify-end gap-3 translate-x-4 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all w-full lg:w-auto">
                               {req.status === 'PENDING' && (
                                  <>
                                     <button
                                       onClick={() => handleAction(req.id, 'REJECTED', req.userId)}
                                       className="flex-1 lg:flex-none p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger/20 transition-all border border-danger/20 flex items-center justify-center"
                                       title="Reject Withdrawal"
                                     >
                                        <XCircle size={18} />
                                     </button>
                                     <button
                                       onClick={() => handleAction(req.id, 'APPROVED', req.userId)}
                                       className="flex-1 lg:flex-none p-3 bg-success/10 text-success rounded-xl hover:bg-success/20 transition-all border border-success/20 shadow-lg shadow-success/10 flex items-center justify-center"
                                       title="Approve Withdrawal"
                                     >
                                        <CheckCircle size={18} />
                                     </button>
                                  </>
                               )}
                               {req.status === 'APPROVED' && (
                                  <button
                                    onClick={() => handleAction(req.id, 'PAID', req.userId)}
                                    className="flex-1 lg:flex-none px-6 py-3 bg-primary text-text-primary text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 italic"
                                  >
                                     Confirm Payout
                                  </button>
                               )}
                               {req.status === 'PAID' && (
                                  <div className="flex-1 lg:flex-none px-6 py-3 bg-surface-bright border border-border-bright rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-text-tertiary italic text-center">
                                     Settlement Closed
                                  </div>
                               )}
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          {filtered.length === 0 && !loading && (
             <div className="py-40 text-center border-t border-border opacity-40">
                <CreditCard size={48} className="mx-auto text-text-primary/5 mb-6" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Queue Clear</h3>
                <p className="text-[10px] font-mono text-text-tertiary/50 uppercase tracking-widest mt-2">No active settlement requests identified</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default OpsWithdrawals;
