import * as React from "react";
import {
  ExternalLink,
  CheckCircle,
  User,
  Zap,
  Clock
} from 'lucide-react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';
import { SubmissionStatus } from '../../../types';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';

const AdminValidation = () => {
  const [claims, setClaims] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<SubmissionStatus>('PENDING');

  React.useEffect(() => {
    const q = query(
      collection(db, 'task_claims'),
      where('validationState', '==', filter),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setClaims(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Claims fetch failed:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  const handleReview = async (claimId: string, status: SubmissionStatus) => {
    try {
      const claimRef = doc(db, 'task_claims', claimId);
      const claimSnap = await getDoc(claimRef);

      if (!claimSnap.exists()) {
        toast.error("Claim not found");
        return;
      }

      const claimData = claimSnap.data();

      if (status === 'APPROVED') {
        // Find task to get reward amount
        const taskRef = doc(db, 'tasks', claimData.taskId);
        const taskSnap = await getDoc(taskRef);

        if (!taskSnap.exists()) {
          toast.error("Origin task not found");
          return;
        }

        const taskData = taskSnap.data();

        // Award points via Transaction Engine
        const result = await PointTransactionEngine.execute({
          userId: claimData.userId,
          amount: taskData.rewardAmount || 0,
          type: 'task_reward',
          source: `Verification Approved: ${taskData.title}`,
          claimId: `val_${claimId}`,
          xpReward: taskData.xpReward || 50,
          referenceId: claimData.taskId
        });

        if (!result.success) {
          toast.error(`Transaction failed: ${result.error}`);
          return;
        }
      }

      await updateDoc(claimRef, {
        validationState: status,
        resolvedAt: serverTimestamp(),
        reviewedBy: 'ADMIN_OPERATIONS'
      });

      toast.success(`Claim ${status.toLowerCase()} successfully`);
    } catch (err) {
      console.error("Validation review error:", err);
      toast.error("Validation update failed");
    }
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Approvals</h1>
          <p className="text-text-secondary text-sm font-medium">Review and approve user submissions for reward distribution.</p>
        </div>
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
          {(['PENDING', 'APPROVED', 'REJECTED'] as SubmissionStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                filter === s ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-[2rem] animate-pulse" />)
        ) : claims.length > 0 ? (
          claims.map((claim) => (
            <div key={claim.id} className="bg-white/[0.01] border border-white/5 rounded-[2rem] p-6 sm:p-8 hover:border-white/10 transition-all group relative overflow-hidden">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="flex items-start gap-4 sm:gap-6">
                     <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                        <User className="text-white/20" size={20} />
                     </div>
                     <div>
                        <div className="flex items-center gap-3 mb-2">
                           <h3 className="font-mono text-sm font-bold text-white">{claim.userId}</h3>
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">User</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                           <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-tighter">
                              <Zap size={14} />
                              {claim.taskId}
                           </div>
                           <div className="w-1 h-1 rounded-full bg-white/10" />
                           <div className="flex items-center gap-2 text-white/40 font-medium">
                              <Clock size={14} />
                              {claim.createdAt?.toDate?.() ? (claim.createdAt?.toDate?.()?.toLocaleString() || "N/A") : 'N/A'}
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 lg:max-w-md">
                     <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Submitted Proof</p>
                        {claim.submittedProof ? (
                           <div className="flex items-center justify-between">
                              {claim.submittedProof.startsWith('http') ? (
                                <div className="flex items-center gap-4 w-full">
                                  <img src={claim.submittedProof} alt="Proof" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-white/40 truncate mb-1">Asset Reference</p>
                                    <a href={claim.submittedProof} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-primary hover:underline uppercase shrink-0">
                                       <ExternalLink size={12} />
                                       Inspect Asset
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-white/60 truncate">{claim.submittedProof}</p>
                              )}
                           </div>
                        ) : (
                           <p className="text-xs text-white/20 italic">No proof assets provided</p>
                        )}
                     </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
                    {claim.validationState === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => handleReview(claim.id, 'REJECTED')}
                          className="flex-1 lg:flex-none px-6 py-4 rounded-xl bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-danger/20 transition-all border border-danger/20"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleReview(claim.id, 'APPROVED')}
                          className="flex-1 lg:flex-none px-6 py-4 rounded-xl bg-success text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-success/90 transition-all shadow-lg shadow-success/20"
                        >
                          Approve
                        </button>
                      </>
                    ) : (
                      <div className={cn(
                        "px-8 py-4 rounded-xl border font-bold text-[10px] uppercase tracking-[0.2em]",
                        claim.validationState === 'APPROVED' ? "bg-success/5 text-success border-success/20" : "bg-danger/5 text-danger border-danger/20"
                      )}>
                        {claim.validationState}
                      </div>
                    )}
                  </div>
               </div>
            </div>
          ))
        ) : (
          <div className="py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
             <CheckCircle size={48} className="mx-auto text-success/20 mb-6" />
             <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-2">Queue Clear</h3>
             <p className="text-xs text-white/20">No pending submissions require review.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminValidation;
