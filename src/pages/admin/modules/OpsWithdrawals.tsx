import * as React from "react";
import {
  CreditCard,
  User,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  collection,
  query,
  where,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  limit,
  orderBy,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { formatUSD } from '../../../utils/finance';
import { WithdrawalRequest } from '../../../types';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';
import DataTable from '../../../components/admin/common/DataTable';

const OpsWithdrawals: React.FC = () => {
  const [requests, setRequests] = React.useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<WithdrawalRequest['status']>('PENDING');
  const [searchTerm, setSearchTerm] = React.useState('');

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchWithdrawals = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'withdrawals'),
        where('status', '==', filter),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'withdrawals'),
          where('status', '==', filter),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest));

      if (isNext) {
        setRequests(prev => [...prev, ...data]);
      } else {
        setRequests(data);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error("[OpsWithdrawals] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchWithdrawals();
  }, [filter]);

  const handleAction = async (id: string, status: WithdrawalRequest['status'], userId: string) => {
    const loadingToast = toast.loading('Updating withdrawal status...');
    try {
      const req = requests.find(r => r.id === id);
      if (!req) throw new Error("WITHDRAWAL_REQUEST_NOT_FOUND");

      if (status === 'APPROVED' || status === 'PAID') {
         const claimId = (req as any).claimId;
         if (!claimId) throw new Error("DEBIT_VERIFICATION_FAILED: No claim ID associated with request.");

         const claimRef = doc(db, 'system_claims', claimId);
         const claimSnap = await getDoc(claimRef);
         if (!claimSnap.exists()) {
            throw new Error("DEBIT_VERIFICATION_FAILED: No matching system claim found.");
         }
      }

      const updateData: any = {
        status,
        processedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (status === 'PAID') {
         const res = await PointTransactionEngine.execute({
            userId,
            amount: 0,
            type: 'withdrawal_finalized' as any,
            source: 'Withdrawal Payout',
            claimId: `paid_${id}`,
            metadata: { withdrawalId: id, amount: req.amountPoints },
            bypassLock: true
         });
         if (!res.success) throw new Error(res.error);
         updateData.paidAt = serverTimestamp();
      }

      if (status === 'REJECTED') {
         if (req) {
            await PointTransactionEngine.execute({
               userId,
               amount: req.amountPoints,
               type: 'admin_adjustment',
               source: 'Withdrawal Rejected',
               claimId: `rev_${id}`,
               description: `PTS reversal for rejected withdrawal #${id.slice(0,8)}`,
               bypassLock: true
            });
         }
      }

      await updateDoc(doc(db, 'withdrawals', id), updateData);

      const notifRef = doc(collection(db, 'users', userId, 'notifications'));
      if (status === 'APPROVED') {
        await setDoc(notifRef, {
          type: 'withdrawal_approved',
          title: 'Withdrawal Approved',
          description: `Your withdrawal request #${id.slice(0,8)} has been approved and is being processed.`,
          withdrawalId: id,
          timestamp: serverTimestamp(),
          read: false
        });
      } else if (status === 'PAID') {
        await setDoc(notifRef, {
          type: 'withdrawal_paid',
          title: 'Withdrawal Paid',
          description: `Your withdrawal request #${id.slice(0,8)} has been finalized and sent.`,
          withdrawalId: id,
          timestamp: serverTimestamp(),
          read: false
        });
      } else if (status === 'REJECTED') {
        await setDoc(notifRef, {
          type: 'withdrawal_rejected',
          title: 'Withdrawal Rejected',
          description: `Your withdrawal request #${id.slice(0,8)} was rejected. Points have been returned to your balance.`,
          withdrawalId: id,
          timestamp: serverTimestamp(),
          read: false
        });
      }

      toast.dismiss(loadingToast);
      toast.success(`Withdrawal ${status.toLowerCase()}`);
      fetchWithdrawals(); // Refresh
    } catch (err) {
      console.error('[OpsWithdrawals] Update error:', err);
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
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Withdrawal Management</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Manage and process user withdrawal requests and payouts.</p>
          </div>
       </header>

       <DataTable
         columns={[
           {
             header: 'User',
             accessor: (req: WithdrawalRequest) => (
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary/50 group-hover:text-primary transition-colors">
                     <User size={18} />
                  </div>
                  <div>
                  <p className="text-xs md:text-sm font-bold text-text-primary uppercase italic leading-none mb-1">{req.username}</p>
                  <p className="text-[9px] md:text-[10px] font-mono text-text-tertiary uppercase tracking-widest">{req.userEmail}</p>
                  </div>
               </div>
             )
           },
           {
             header: 'Amount',
             accessor: (req: WithdrawalRequest) => (
               <div>
                  <p className="text-xs md:text-sm font-mono font-bold text-text-primary">{req.amountPoints.toLocaleString()} PTS</p>
                  <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-success mt-1 italic">{formatUSD(req.amountUSD)}</p>
               </div>
             )
           },
           {
             header: 'Destination',
             accessor: (req: WithdrawalRequest) => (
               <div className="space-y-1.5">
                  <p className="text-[9px] md:text-[10px] font-mono text-text-secondary uppercase tracking-tighter truncate max-w-[200px]">{req.walletAddress}</p>
                  <div className="flex items-center gap-2">
                     <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_5px_rgba(0,102,255,1)]" />
                     <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary">{req.network}</span>
                  </div>
               </div>
             )
           },
           {
             header: 'Actions',
             className: 'text-right',
             accessor: (req: WithdrawalRequest) => (
               <div className="flex justify-end gap-3 group-hover:translate-x-0 transition-all w-full lg:w-auto" onClick={e => e.stopPropagation()}>
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
             )
           }
         ]}
         data={filtered}
         isLoading={loading}
         searchTerm={searchTerm}
         onSearchChange={setSearchTerm}
         searchPlaceholder="Scan queue by Email or Wallet..."
         onLoadMore={() => fetchWithdrawals(true)}
         hasMore={hasMore}
         activeFilter={filter}
         onFilterChange={(f) => setFilter(f as any)}
         filters={[
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'PAID', label: 'Paid' }
         ]}
       />
    </div>
  );
};

export default OpsWithdrawals;
