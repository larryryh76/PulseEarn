import * as React from "react";
import {
  CheckCircle,
  XCircle,
  Search
} from 'lucide-react';
import {
  collection,
  query,
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

const AdminWithdrawals = () => {
  const [requests, setRequests] = React.useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<WithdrawalRequest['status']>('PENDING');
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(
      collection(db, 'withdrawals'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as WithdrawalRequest)));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAction = async (id: string, status: WithdrawalRequest['status'], userId: string) => {
    try {
      const updateData: any = {
        status,
        processedAt: serverTimestamp()
      };

      if (status === 'PAID') {
         updateData.paidAt = serverTimestamp();
         // Update user's lifetime withdrawn
         await updateDoc(doc(db, 'users', userId), {
            totalWithdrawn: increment(requests.find(r => r.id === id)?.amountPoints || 0)
         });
      }

      if (status === 'REJECTED') {
         // Revert the points to user balance
         const req = requests.find(r => r.id === id);
         if (req) {
            const { PointTransactionEngine } = await import('../../../engines/points/PointTransactionEngine');
            await PointTransactionEngine.execute({
               userId,
               amount: req.amountPoints,
               type: 'admin_adjustment',
               source: 'Withdrawal Reversal',
               claimId: `rev_${id}`,
               description: `Refund for rejected withdrawal #${id.slice(0,8)}`
            });
         }
      }

      await updateDoc(doc(db, 'withdrawals', id), updateData);
      toast.success(`Withdrawal ${status.toLowerCase()}`);
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const filtered = requests.filter(r =>
    (filter === r.status || (filter === 'PAID' && r.status === 'PAID')) &&
    (r.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) || r.walletAddress.includes(searchTerm))
  );

  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Withdrawals</h1>
          <p className="text-text-secondary text-sm font-medium">Manage user settlement requests and payout status.</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
          {['PENDING', 'APPROVED', 'REJECTED', 'PAID'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === s ? "bg-primary text-white" : "text-white/40 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by Email or Address..."
          className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-[2rem] animate-pulse" />)
        ) : filtered.length > 0 ? (
          <>
            {/* Desktop View */}
            <div className="hidden lg:block bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5">
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-text-secondary">User</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Amount</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Destination</th>
                    <th className="p-6 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="p-6">
                        <p className="font-bold text-white">{req.username}</p>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">{req.userEmail}</p>
                      </td>
                      <td className="p-6">
                        <p className="text-sm font-mono font-bold text-white">{req.amountPoints.toLocaleString()} PTS</p>
                        <p className="text-[10px] text-success font-bold uppercase tracking-widest mt-0.5">{formatUSD(req.amountUSD)}</p>
                      </td>
                      <td className="p-6">
                        <p className="text-[10px] text-white/60 font-mono truncate max-w-[200px]">{req.walletAddress}</p>
                        <p className="text-[9px] text-primary font-bold uppercase mt-0.5 tracking-widest">{req.network}</p>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {req.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleAction(req.id, 'REJECTED', req.userId)} className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger/20 transition-all"><XCircle size={16} /></button>
                              <button onClick={() => handleAction(req.id, 'APPROVED', req.userId)} className="p-2 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-all"><CheckCircle size={16} /></button>
                            </>
                          )}
                          {req.status === 'APPROVED' && (
                            <button onClick={() => handleAction(req.id, 'PAID', req.userId)} className="px-4 py-2 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all">Mark Paid</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="lg:hidden space-y-4">
              {filtered.map((req) => (
                <div key={req.id} className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-white">{req.username}</p>
                      <p className="text-[10px] text-white/40 font-mono">{req.userEmail}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border",
                      req.status === 'PAID' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                    )}>
                      {req.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-4">
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Points</p>
                      <p className="text-sm font-mono font-bold">{req.amountPoints.toLocaleString()} PTS</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4">
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Value</p>
                      <p className="text-sm font-bold text-success">{formatUSD(req.amountUSD)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 rounded-2xl">
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Destination ({req.network})</p>
                    <p className="text-[10px] font-mono text-white/60 break-all">{req.walletAddress}</p>
                  </div>

                  {req.status !== 'PAID' && req.status !== 'REJECTED' && (
                    <div className="flex gap-3 pt-2">
                       {req.status === 'PENDING' && (
                         <>
                           <button onClick={() => handleAction(req.id, 'REJECTED', req.userId)} className="flex-1 py-4 bg-danger/10 text-danger rounded-xl text-[10px] font-bold uppercase tracking-widest">Reject</button>
                           <button onClick={() => handleAction(req.id, 'APPROVED', req.userId)} className="flex-1 py-4 bg-success/10 text-success rounded-xl text-[10px] font-bold uppercase tracking-widest">Approve</button>
                         </>
                       )}
                       {req.status === 'APPROVED' && (
                         <button onClick={() => handleAction(req.id, 'PAID', req.userId)} className="w-full py-4 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest">Mark as Paid</button>
                       )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
             <CheckCircle size={48} className="mx-auto text-white/5 mb-6" />
             <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">No settlement requests</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminWithdrawals;
