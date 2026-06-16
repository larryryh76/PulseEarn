import * as React from "react";
import {
  ShieldCheck,
  User,
  Zap,
  Clock,
  ExternalLink,
  CheckCircle
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { SubtaskStatus } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';

const OpsValidation: React.FC = () => {
  const [claims, setClaims] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<SubtaskStatus>('PENDING');

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
      console.error("[OpsValidation] Sync Failure:", error);
      setLoading(false);
    });

    return unsubscribe;
  }, [filter]);

  const handleReview = async (claimId: string, status: SubtaskStatus) => {
    const loadingToast = toast.loading('Updating validation status...');
    try {
      const claimRef = doc(db, 'task_claims', claimId);
      const claimSnap = await getDoc(claimRef);

      if (!claimSnap.exists()) {
        toast.dismiss(loadingToast);
        return toast.error("Claim not found");
      }

      const claimData = claimSnap.data();

      if (status === 'APPROVED') {
        const taskRef = doc(db, 'tasks', claimData.taskId);
        const taskSnap = await getDoc(taskRef);

        if (!taskSnap.exists()) {
          toast.dismiss(loadingToast);
          return toast.error("Task not found");
        }

        const taskData = taskSnap.data();
        const { PointTransactionEngine } = await import('../../../engines/points/PointTransactionEngine');

        const result = await PointTransactionEngine.execute({
          userId: claimData.userId,
          amount: taskData.rewardAmount || 0,
          type: 'task_reward',
          source: `Approved: ${taskData.title}`,
          claimId: `val_${claimId}`,
          xpReward: taskData.xpReward || 50,
          referenceId: claimData.taskId
        });

        if (!result.success) {
          toast.dismiss(loadingToast);
          return toast.error(`Failed to grant reward: ${result.error}`);
        }
      }

      await updateDoc(claimRef, {
        validationState: status,
        resolvedAt: serverTimestamp(),
        reviewedBy: 'ADMIN_HUB'
      });

      toast.dismiss(loadingToast);
      toast.success(`Claim ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Failed to update claim status");
    }
  };

  return (
    <div className="space-y-12">
       {/* COMMAND HEADER */}
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Verification Desk</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Administrative review and reward authorization for user contribution evidence.</p>
          </div>

          <div className="flex bg-surface-bright p-1 rounded-xl border border-border">
             {(['PENDING', 'APPROVED', 'REJECTED'] as SubtaskStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
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

       {/* VALIDATION QUEUE */}
       <div className="space-y-4">
          {loading ? (
             [1,2,3,4].map(i => <div key={i} className="h-32 bg-surface-bright border border-border rounded-2xl animate-pulse" />)
          ) : claims.length > 0 ? (
             claims.map((claim) => (
                <div key={claim.id} className="p-8 rounded-[2rem] bg-surface border border-border hover:border-border-bright transition-all group relative overflow-hidden shadow-2xl">
                   <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary/50 group-hover:text-primary transition-all shadow-inner">
                            <User size={24} />
                         </div>
                         <div>
                            <div className="flex items-center gap-3 mb-2">
                               <h3 className="font-mono text-sm font-bold text-text-primary uppercase tracking-tighter">{claim.userId.slice(0, 24)}</h3>
                               <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded border border-primary/20">Identified</span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                               <div className="flex items-center gap-2 text-indigo-400">
                                  <Zap size={12} />
                                  {claim.taskId}
                               </div>
                               <div className="w-1 h-1 rounded-full bg-surface-accent" />
                               <div className="flex items-center gap-2 text-text-tertiary">
                                  <Clock size={12} />
                                  {claim.createdAt?.toDate?.()?.toLocaleString()}
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="flex-1 lg:max-w-md">
                         <div className="p-5 rounded-2xl bg-surface-bright border border-border shadow-inner">
                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-3">Submission Details</p>
                            {claim.submittedProof ? (
                               <div className="flex items-center justify-between">
                                  {claim.submittedProof.startsWith('http') ? (
                                     <div className="flex items-center gap-4 w-full">
                                        <img src={claim.submittedProof} alt="" className="w-12 h-12 rounded-xl object-cover border border-border-bright" />
                                        <div className="min-w-0 flex-1">
                                           <p className="text-[10px] text-text-secondary font-mono truncate mb-1">IMAGE_ATTACHMENT</p>
                                           <a href={claim.submittedProof} target="_blank" rel="noreferrer" className="text-[10px] font-black text-primary hover:underline uppercase flex items-center gap-2">
                                              <ExternalLink size={12} /> View Original
                                           </a>
                                        </div>
                                     </div>
                                  ) : (
                                     <p className="text-xs font-mono text-text-secondary truncate">{claim.submittedProof}</p>
                                  )}
                               </div>
                            ) : (
                               <p className="text-[10px] font-black text-text-tertiary/50 uppercase tracking-widest italic">No proof available</p>
                            )}
                         </div>
                      </div>

                      <div className="flex items-center gap-3">
                         {claim.validationState === 'PENDING' ? (
                            <>
                               <button
                                 onClick={() => handleReview(claim.id, 'REJECTED')}
                                 className="px-8 py-4 rounded-xl bg-danger/10 text-danger text-[10px] font-black uppercase tracking-[0.2em] hover:bg-danger/20 transition-all border border-danger/20"
                               >
                                  Reject
                               </button>
                               <button
                                 onClick={() => handleReview(claim.id, 'APPROVED')}
                                 className="px-8 py-4 rounded-xl bg-primary text-text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 italic"
                               >
                                  Approve
                               </button>
                            </>
                         ) : (
                            <div className={cn(
                               "px-8 py-4 rounded-xl border font-black text-[10px] uppercase tracking-[0.3em] italic",
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
             <div className="py-40 text-center border border-dashed border-border-bright rounded-[3rem] bg-surface opacity-40">
                <CheckCircle size={48} className="mx-auto text-success/40 mb-6" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Desk Neutral</h3>
                <p className="text-[10px] font-mono text-text-tertiary/50 uppercase tracking-widest mt-2">No ingress signals requiring administrative action</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default OpsValidation;
