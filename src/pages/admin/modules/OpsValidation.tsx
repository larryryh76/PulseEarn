import * as React from "react";
import {
  ShieldCheck,
  User,
  Zap,
  Clock,
  ExternalLink
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  where,
  limit,
  doc,
  writeBatch,
  getDoc,
  serverTimestamp,
  orderBy,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { SubtaskStatus } from '../../../types';
import { cn } from '../../../utils';
import toast from 'react-hot-toast';
import { PointTransactionEngine } from '../../../engines/points/PointTransactionEngine';
import { VerificationEngine } from '../../../engines/system/VerificationEngine';
import DataTable from '../../../components/admin/common/DataTable';

const OpsValidation: React.FC = () => {
  const [claims, setClaims] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<SubtaskStatus>('PENDING');

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchClaims = async (isNext = false) => {
    setLoading(true);
    try {
       let q = query(
         collection(db, 'task_claims'),
         where('validationState', '==', filter),
         orderBy('createdAt', 'desc'),
         limit(20)
       );

       if (isNext && lastDoc) {
          q = query(
             collection(db, 'task_claims'),
             where('validationState', '==', filter),
             orderBy('createdAt', 'desc'),
             startAfter(lastDoc),
             limit(20)
          );
       }

       const snap = await getDocs(q);
       const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

       if (isNext) {
          setClaims(prev => [...prev, ...data]);
       } else {
          setClaims(data);
       }

       setLastDoc(snap.docs[snap.docs.length - 1]);
       setHasMore(snap.docs.length === 20);
    } catch (err) {
       console.error("[OpsValidation] Fetch Failure:", err);
    } finally {
       setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClaims();
  }, [filter]);

  const handleReview = async (claimId: string, status: SubtaskStatus) => {
    const loadingToast = toast.loading('Updating validation status...');
    try {
      let rejectionReason = '';
      if (status === 'REJECTED') {
        rejectionReason = window.prompt('Please enter a rejection reason:') || 'Submission did not meet requirements';
      }

      const action = status === 'APPROVED' ? 'APPROVE' : 'REJECT';
      const reviewRes = await VerificationEngine.reviewClaim(claimId, action, rejectionReason);

      if (reviewRes.success) {
        toast.dismiss(loadingToast);
        toast.success(`Claim ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`);
        fetchClaims(); // Refresh
        return;
      }

      // Fallback for offline/client direct batch mode if API endpoint is unreachable
      console.warn("[OpsValidation] API review failed, falling back to direct engine write:", reviewRes.error);
      const claimRef = doc(db, 'task_claims', claimId);

      if (status === 'APPROVED') {
        const claimSnap = await getDoc(claimRef);
        if (!claimSnap.exists()) throw new Error("CLAIM_NOT_FOUND");
        const claimData = claimSnap.data();

        const taskRef = doc(db, 'tasks', claimData.taskId);
        const taskSnap = await getDoc(taskRef);
        if (!taskSnap.exists()) throw new Error("TASK_NOT_FOUND");
        const taskData = taskSnap.data();

        const rewardResult = await PointTransactionEngine.execute({
          userId: claimData.userId,
          amount: taskData.rewardAmount || 0,
          type: 'task_reward',
          source: taskData.title,
          claimId: `val_${claimId}`,
          taskClaimId: claimId,
          xpReward: taskData.xpReward || 50,
          referenceId: claimData.taskId,
          metadata: {
            campaignId: taskData.campaignId || null,
            campaignName: taskData.campaignName || 'Community',
            category: taskData.category || 'CUSTOM',
            verificationType: taskData.verificationType || 'manual',
            completedAt: claimData.createdAt
          }
        });

        if (!rewardResult.success) {
          toast.dismiss(loadingToast);
          return toast.error(`Failed to grant reward: ${rewardResult.error}`);
        }

        const batch = writeBatch(db);
        batch.update(claimRef, {
          validationState: 'APPROVED',
          completionState: 'COMPLETED',
          status: 'APPROVED',
          resolvedAt: serverTimestamp(),
          reviewedBy: 'ADMIN_HUB'
        });
        const userTaskRef = doc(db, 'users', claimData.userId, 'user_tasks', claimData.taskId);
        batch.set(userTaskRef, {
          taskId: claimData.taskId,
          userId: claimData.userId,
          status: 'completed',
          lastCompleted: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        await batch.commit();
      } else {
        const claimSnap = await getDoc(claimRef);
        const claimData = claimSnap.data();
        if (!claimData) throw new Error("CLAIM_DATA_NOT_FOUND");

        const batch = writeBatch(db);

        batch.update(claimRef, {
          validationState: status,
          resolvedAt: serverTimestamp(),
          reviewedBy: 'ADMIN_HUB',
          rejectionReason
        });

        const userTaskRef = doc(db, 'users', claimData.userId, 'user_tasks', claimData.taskId);
        batch.update(userTaskRef, {
          status: 'available',
          updatedAt: serverTimestamp()
        });

        await batch.commit();
      }

      toast.dismiss(loadingToast);
      toast.success(`Claim ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`);
      fetchClaims(); // Refresh
    } catch (err: any) {
      console.error("[OpsValidation] Review Error:", err);
      toast.dismiss(loadingToast);
      toast.error(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Verification Desk</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Administrative review and reward authorization for user contribution evidence.</p>
          </div>
       </header>

       <DataTable
         columns={[
           {
             header: 'User & Task',
             accessor: (claim: any) => (
               <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary/50 group-hover:text-primary transition-all shadow-inner shrink-0">
                     <User size={24} />
                  </div>
                  <div className="min-w-0">
                     <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5 md:mb-2">
                        <h3 className="font-mono text-[11px] md:text-sm font-bold text-text-primary uppercase tracking-tighter truncate max-w-[120px] md:max-w-none">
                           {claim.metadata?.username || claim.userId.slice(0, 16)}
                        </h3>
                     </div>
                     <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[8px] md:text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex items-center gap-1.5 md:gap-2 text-indigo-400 truncate max-w-[150px]">
                           <Zap size={10} className="md:w-3 md:h-3" />
                           {claim.metadata?.taskTitle || claim.taskId}
                        </div>
                     </div>
                  </div>
               </div>
             )
           },
           {
             header: 'Submission',
             className: 'max-w-md',
             accessor: (claim: any) => (
               <div className="p-4 rounded-2xl bg-surface-bright border border-border shadow-inner">
                  {claim.submittedProof ? (
                     <div className="flex items-center justify-between">
                        {claim.submittedProof.startsWith('http') ? (
                           <div className="flex items-center gap-3 md:gap-4 w-full">
                              <img src={claim.submittedProof} alt="" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover border border-border-bright shrink-0" />
                              <div className="min-w-0 flex-1">
                                 <p className="text-[9px] md:text-[10px] text-text-secondary font-mono truncate mb-0.5 md:mb-1">IMAGE_ATTACHMENT</p>
                                 <a href={claim.submittedProof} target="_blank" rel="noreferrer" className="text-[9px] md:text-[10px] font-black text-primary hover:underline uppercase flex items-center gap-1.5 md:gap-2">
                                    <ExternalLink size={10} className="md:w-3 md:h-3" /> View Original
                                 </a>
                              </div>
                           </div>
                        ) : (
                           <p className="text-[11px] md:text-xs font-mono text-text-secondary truncate">{claim.submittedProof}</p>
                        )}
                     </div>
                  ) : (
                     <p className="text-[10px] font-black text-text-tertiary/50 uppercase tracking-widest italic">No proof available</p>
                  )}
               </div>
             )
           },
           {
             header: 'Date',
             accessor: (claim: any) => (
               <div className="flex items-center gap-1.5 md:gap-2 text-text-tertiary text-[10px] font-bold uppercase tracking-widest">
                  <Clock size={10} className="md:w-3 md:h-3" />
                  {claim.createdAt?.toDate?.()?.toLocaleDateString()}
               </div>
             )
           },
           {
             header: 'Actions',
             className: 'text-right',
             accessor: (claim: any) => (
               <div className="flex items-center justify-end gap-3 w-full lg:w-auto" onClick={e => e.stopPropagation()}>
                  {claim.validationState === 'PENDING' ? (
                     <>
                        <button
                          onClick={() => handleReview(claim.id, 'REJECTED')}
                          className="flex-1 lg:flex-none px-6 md:px-8 py-2 rounded-xl bg-danger/10 text-danger text-[9px] font-black uppercase tracking-[0.2em] hover:bg-danger/20 transition-all border border-danger/20"
                        >
                           Reject
                        </button>
                        <button
                          onClick={() => handleReview(claim.id, 'APPROVED')}
                          className="flex-1 lg:flex-none px-6 md:px-8 py-2 rounded-xl bg-primary text-text-primary text-[9px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 italic"
                        >
                           Approve
                        </button>
                     </>
                  ) : (
                     <div className={cn(
                        "w-full lg:w-auto px-6 py-2 rounded-xl border font-black text-[9px] uppercase tracking-[0.3em] italic text-center",
                        claim.validationState === 'APPROVED' ? "bg-success/5 text-success border-success/20" : "bg-danger/5 text-danger border-danger/20"
                     )}>
                        {claim.validationState}
                     </div>
                  )}
               </div>
             )
           }
         ]}
         data={claims}
         isLoading={loading}
         onLoadMore={() => fetchClaims(true)}
         hasMore={hasMore}
         activeFilter={filter}
         onFilterChange={(f) => setFilter(f as any)}
         filters={[
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' }
         ]}
       />
    </div>
  );
};

export default OpsValidation;
