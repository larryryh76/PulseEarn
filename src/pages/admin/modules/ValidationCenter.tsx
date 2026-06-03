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
  getDocs
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { TaskClaim, SubmissionStatus, Task } from '../../../types';
import { ShieldCheck, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';
import toast from 'react-hot-toast';
import { cn } from '../../../utils';

const ValidationCenter = () => {
  const [claims, setClaims] = useState<(TaskClaim & { task?: Task })[]>([]);
  const [filter, setFilter] = useState<SubmissionStatus | 'ALL'>('PENDING');

  useEffect(() => {
    const q = query(
      collection(db, 'task_claims'),
      where('validationState', '==', filter === 'ALL' ? undefined : filter),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    // Note: Firestore doesn't support where(== undefined), so we adjust query if ALL
    const finalQuery = filter === 'ALL'
       ? query(collection(db, 'task_claims'), orderBy('createdAt', 'desc'), limit(50))
       : q;

    const unsub = onSnapshot(finalQuery, async (snap) => {
      const claimsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskClaim));

      // Fetch task details for context
      const enriched = await Promise.all(claimsData.map(async (claim) => {
         const taskSnap = await getDocs(query(collection(db, 'tasks'), where('id', '==', claim.taskId)));
         return { ...claim, task: !taskSnap.empty ? taskSnap.docs[0].data() as Task : undefined };
      }));

      setClaims(enriched);
    });

    return unsub;
  }, [filter]);

  const handleReview = async (claim: TaskClaim & { task?: Task }, status: SubmissionStatus) => {
    try {
       if (status === 'APPROVED' && claim.task) {
          const result = await PointTransactionEngine.execute({
             userId: claim.userId,
             amount: claim.task.rewardAmount,
             type: 'task_reward',
             source: `Validation Approved: ${claim.task.title}`,
             claimId: `manual_${claim.id}`,
             xpReward: claim.task.xpReward,
             referenceId: claim.taskId
          });
          if (!result.success) throw new Error(result.error);
       }

       await updateDoc(doc(db, 'task_claims', claim.id), {
          validationState: status,
          resolvedAt: serverTimestamp(),
          reviewedBy: 'ADMIN_OPERATOR'
       });

       await updateDoc(doc(db, 'users', claim.userId, 'user_tasks', claim.taskId), {
          status: status === 'APPROVED' ? 'completed' : 'rejected',
          lastCompleted: status === 'APPROVED' ? serverTimestamp() : null
       });

       toast.success(`Claim ${status.toLowerCase()}`);
    } catch (err: any) {
       toast.error(err.message || "Operation failed");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Validation Center</h1>
          <p className="text-text-secondary text-sm">Review proof of execution and authorize reward release.</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
           {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map(s => (
             <button
               key={s}
               onClick={() => setFilter(s as any)}
               className={cn(
                 "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                 filter === s ? "bg-primary text-white shadow-lg" : "text-text-secondary hover:text-white"
               )}
             >
               {s}
             </button>
           ))}
        </div>
      </header>

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
           <thead>
              <tr className="bg-white/5 border-b border-white/10">
                 <th className="p-6 data-label">Operator / Mission</th>
                 <th className="p-6 data-label">Proof Assets</th>
                 <th className="p-6 data-label text-right">Settlement</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
              {claims.map(claim => (
                <tr key={claim.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-6">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                           <ShieldCheck size={20} className="text-primary" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-white mb-0.5">{claim.task?.title || 'Unknown Mission'}</p>
                           <p className="text-[10px] font-mono text-text-secondary uppercase">UID: {claim.userId.slice(0, 12)}</p>
                        </div>
                     </div>
                  </td>
                  <td className="p-6">
                     {claim.submittedProof ? (
                        <a href={claim.submittedProof} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">
                           <ExternalLink size={12} /> View Submission
                        </a>
                     ) : (
                        <span className="text-[10px] text-white/20 italic uppercase tracking-widest">No assets attached</span>
                     )}
                  </td>
                  <td className="p-6 text-right">
                     {claim.validationState === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                           <button onClick={() => handleReview(claim, 'REJECTED')} className="p-2.5 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 transition-all"><XCircle size={18} /></button>
                           <button onClick={() => handleReview(claim, 'APPROVED')} className="p-2.5 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-all"><CheckCircle2 size={18} /></button>
                        </div>
                     ) : (
                        <span className={cn("badge-system", claim.validationState === 'APPROVED' ? 'text-success border-success/20' : 'text-danger border-danger/20')}>
                           {claim.validationState}
                        </span>
                     )}
                  </td>
                </tr>
              ))}
           </tbody>
        </table>

        {claims.length === 0 && (
           <div className="py-40 text-center">
              <CheckCircle2 size={48} className="mx-auto text-white/5 mb-6" />
              <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em]">Queue Clear // No Pending Validations</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default ValidationCenter;
