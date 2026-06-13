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
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';
import { formatUSD } from '../../../utils/finance';
import { WithdrawalRequest } from '../../../types';
import toast from 'react-hot-toast';

const OpsWithdrawals: React.FC = () => {
  const [requests, setRequests] = React.useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<WithdrawalRequest['status']>('PENDING');
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(
      collection(db, 'withdrawals'),
      where('status', '==', filter),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
      setLoading(false);
    }, (err) => {
       console.error("[OpsWithdrawals] Sync Failure:", err);
       setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  const handleAction = async (id: string, status: WithdrawalRequest['status'], userId: string) => {
    const loadingToast = toast.loading('Executing settlement sequence...');
    try {
      const updateData: any = {
        status,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (status === 'PAID') {
         updateData.paidAt = serverTimestamp();
         await updateDoc(doc(db, 'users', userId), {
            totalWithdrawn: increment(requests.find(r => r.id === id)?.amountPoints || 0)
         });
      }

      if (status === 'REJECTED') {
         const req = requests.find(r => r.id === id);
         if (req) {
            const { PointTransactionEngine } = await import('../../../engines/points/PointTransactionEngine');
            await PointTransactionEngine.execute({
               userId,
               amount: req.amountPoints,
               type: 'admin_adjustment',
               source: 'Withdrawal Terminated',
               claimId: `rev_${id}`,
               description: `System reversal for rejected settlement #${id.slice(0,8)}`,
               bypassLock: true
            });
         }
      }

      await updateDoc(doc(db, 'withdrawals', id), updateData);
      toast.dismiss(loadingToast);
      toast.success(`Settlement status: ${status}`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Settlement Authority Refused");
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
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Withdrawal Desk</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Strategic asset settlement management and user payout authorization.</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
             {['PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={cn(
                    "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    filter === s ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-white/20 hover:text-white"
                  )}
                >
                   {s}
                </button>
             ))}
          </div>
       </header>

       {/* QUEUE TABLE */}
       <div className="bg-[#0A0A0F] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 bg-white/[0.01]">
             <div className="relative group w-full md:w-96">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Scan queue by Email or Wallet..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
                />
             </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-white/[0.02] border-b border-white/5 whitespace-nowrap">
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Target Identity</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Asset Value</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Destination Node</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-right">Ops</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                   {loading ? (
                      [1,2,3,4].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="p-12"><div className="h-4 bg-white/5 rounded w-full" /></td></tr>)
                   ) : filtered.map((req) => (
                      <tr key={req.id} className="group hover:bg-white/[0.01] transition-colors whitespace-nowrap">
                         <td className="p-8">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/10">
                                  <User size={18} />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-white uppercase italic">{req.username}</p>
                                  <p className="text-[10px] font-mono text-white/20 mt-1 uppercase tracking-widest">{req.userEmail}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-8">
                            <div>
                               <p className="text-sm font-mono font-bold text-white">{req.amountPoints.toLocaleString()} PTS</p>
                               <p className="text-[9px] font-black uppercase tracking-widest text-success mt-1 italic">{formatUSD(req.amountUSD)} VALUATION</p>
                            </div>
                         </td>
                         <td className="p-8">
                            <div className="space-y-1.5">
                               <p className="text-[10px] font-mono text-white/40 uppercase tracking-tighter truncate max-w-[200px]">{req.walletAddress}</p>
                               <div className="flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(0,102,255,1)]" />
                                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">{req.network}</span>
                               </div>
                            </div>
                         </td>
                         <td className="p-8 text-right">
                            <div className="flex justify-end gap-3 translate-x-4 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all">
                               {req.status === 'PENDING' && (
                                  <>
                                     <button
                                       onClick={() => handleAction(req.id, 'REJECTED', req.userId)}
                                       className="p-3 bg-danger/10 text-danger rounded-xl hover:bg-danger/20 transition-all border border-danger/20"
                                       title="Reject Settlement"
                                     >
                                        <XCircle size={18} />
                                     </button>
                                     <button
                                       onClick={() => handleAction(req.id, 'APPROVED', req.userId)}
                                       className="p-3 bg-success/10 text-success rounded-xl hover:bg-success/20 transition-all border border-success/20 shadow-lg shadow-success/10"
                                       title="Authorize Payout"
                                     >
                                        <CheckCircle size={18} />
                                     </button>
                                  </>
                               )}
                               {req.status === 'APPROVED' && (
                                  <button
                                    onClick={() => handleAction(req.id, 'PAID', req.userId)}
                                    className="px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 italic"
                                  >
                                     Confirm Payout
                                  </button>
                               )}
                               {req.status === 'PAID' && (
                                  <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/20 italic">
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
             <div className="py-40 text-center border-t border-white/5 opacity-40">
                <CreditCard size={48} className="mx-auto text-white/5 mb-6" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Queue Clear</h3>
                <p className="text-[10px] font-mono text-white/10 uppercase tracking-widest mt-2">No active settlement requests identified</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default OpsWithdrawals;
