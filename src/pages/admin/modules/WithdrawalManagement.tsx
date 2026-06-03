import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  updateDoc,
  doc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Wallet, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../../utils';
import { formatUSD, PTS_TO_USD } from '../../../utils/finance';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';

const WithdrawalManagement = () => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    // Payout queue: Transactions of type withdrawal_debit that are PENDING
    const q = query(
      collection(db, 'system_claims'),
      where('type', '==', 'withdrawal_debit'),
      orderBy('executedAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleAction = async (claim: any, action: 'APPROVE' | 'REJECT') => {
    try {
      // 1. Update Claim Status
      await updateDoc(doc(db, 'system_claims', claim.id), {
        adminStatus: action,
        reviewedAt: serverTimestamp(),
        reviewedBy: 'ADMIN_OPERATOR'
      });

      // 2. Audit Log
      await setDoc(doc(collection(db, 'system_audit')), {
        action: `WITHDRAWAL_${action}`,
        targetId: claim.id,
        userId: claim.userId,
        amount: claim.amount,
        timestamp: serverTimestamp(),
        performedBy: 'ADMIN_OPERATOR'
      });

      // 3. If Rejected, Refund Points
      if (action === 'REJECT') {
         await PointTransactionEngine.execute({
            userId: claim.userId,
            amount: Math.abs(claim.amount),
            type: 'referral_reversal', // Using as point return
            source: 'Withdrawal Rejection Refund',
            claimId: `refund_${claim.id}`,
            description: `Refund for rejected payout: ${claim.id}`
         });
      }

      toast.success(`Withdrawal ${action.toLowerCase()}d`);
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Withdrawal Management</h1>
        <p className="text-text-secondary text-sm">Review and finalize operator payout requests.</p>
      </header>

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
           <thead>
              <tr className="bg-white/5 border-b border-white/10">
                 <th className="p-6 data-label">Operator</th>
                 <th className="p-6 data-label">Amount</th>
                 <th className="p-6 data-label">Status</th>
                 <th className="p-6 data-label text-right">Actions</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-6">
                     <p className="text-xs font-mono text-white/60 mb-1">{req.userId}</p>
                     <p className="text-[9px] text-white/20 uppercase tracking-widest">{req.executedAt?.toDate().toLocaleString()}</p>
                  </td>
                  <td className="p-6">
                     <p className="text-sm font-mono font-bold text-danger">{req.amount.toLocaleString()} PT</p>
                     <p className="text-[10px] text-white/20">~ {formatUSD(PTS_TO_USD(req.amount))}</p>
                  </td>
                  <td className="p-6">
                     <span className={cn("badge-system",
                        req.adminStatus === 'APPROVE' ? 'text-success border-success/20' :
                        req.adminStatus === 'REJECT' ? 'text-danger border-danger/20' :
                        'text-warning border-warning/20'
                     )}>
                        {req.adminStatus || 'PENDING'}
                     </span>
                  </td>
                  <td className="p-6 text-right">
                     {!req.adminStatus && (
                        <div className="flex justify-end gap-2">
                           <button onClick={() => handleAction(req, 'REJECT')} className="p-2.5 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-all" title="Reject & Refund"><XCircle size={18} /></button>
                           <button onClick={() => handleAction(req, 'APPROVE')} className="p-2.5 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-all" title="Approve Payout"><CheckCircle2 size={18} /></button>
                        </div>
                     )}
                  </td>
                </tr>
              ))}
           </tbody>
        </table>

        {requests.length === 0 && (
           <div className="py-40 text-center text-white/10">
              <Wallet size={48} className="mx-auto mb-6" />
              <p className="text-xs font-bold uppercase tracking-widest">Payout Queue Empty</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalManagement;
