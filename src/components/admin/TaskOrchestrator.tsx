import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import {
  collection,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  increment
} from 'firebase/firestore';
import {
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../utils';
import toast from 'react-hot-toast';
import { TaskSubmission } from '../../types';

const TaskOrchestrator: React.FC = () => {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'taskSubmissions'),
      where('status', '==', filter),
      orderBy('submittedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as TaskSubmission)));
    });

    return () => unsub();
  }, [filter]);

  const handleReview = async (submission: TaskSubmission, status: 'approved' | 'rejected', feedback?: string) => {
    try {
      const subRef = doc(db, 'taskSubmissions', submission.id);
      await updateDoc(subRef, {
        status,
        adminFeedback: feedback || '',
        reviewedAt: new Date(),
      });

      if (status === 'approved') {
        const userRef = doc(db, 'users', submission.userId);
        await updateDoc(userRef, {
          points: increment(submission.rewardPoints),
          xp: increment(submission.rewardXp)
        });
      }

      toast.success(`Submission ${status}`);
    } catch (e) {
      toast.error('Review operation failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Mission Moderator</h1>
           <p className="text-white/40 text-sm mt-1">Review and verify manual proof submissions.</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex bg-[#0A0A0F] border border-white/[0.05] rounded-xl p-1">
              {(['pending', 'approved', 'rejected'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                    filter === s ? "bg-primary text-white" : "text-white/20 hover:text-white"
                  )}
                >
                  {s}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
           <input
             type="text"
             placeholder="Search by User ID or Task ID..."
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             className="w-full bg-[#0A0A0F] border border-white/[0.05] rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-primary/50 outline-none transition-all"
           />
        </div>

        {submissions.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-white/5 rounded-[2.5rem]">
             <ShieldCheck className="mx-auto text-white/5 mb-4" size={48} />
             <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">Queue Cleared</p>
          </div>
        ) : (
          <div className="space-y-4">
             {submissions.filter(s => s.userId.includes(searchTerm) || s.taskId.includes(searchTerm)).map(sub => (
               <Card key={sub.id} className="bg-[#0A0A0F] border-white/[0.05] p-6 hover:bg-white/[0.01] transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                     <div className="flex gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
                           <Clock size={24} className="text-white/20" />
                        </div>
                        <div>
                           <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold text-white">Task: {sub.taskId.slice(0, 8)}...</h3>
                              <span className="px-2 py-0.5 rounded bg-white/5 text-[8px] font-bold text-white/40 uppercase">User: {sub.userId.slice(0, 8)}</span>
                           </div>
                           <p className="text-[11px] text-white/40 font-medium mb-4">Submitted: {sub.submittedAt?.toDate().toLocaleString()}</p>

                           <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-10">
                              <div>
                                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Proof Provided</p>
                                 <p className="text-xs font-mono text-primary break-all">{sub.proofData}</p>
                              </div>
                              {sub.proofData && (
                                <a href={sub.proofData} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-white/5 hover:bg-primary/20 transition-all text-white/40 hover:text-primary">
                                   <ExternalLink size={14} />
                                </a>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                        <div className="flex items-center gap-4 mr-6 pr-6 border-r border-white/5">
                           <div className="text-right">
                              <p className="text-[9px] font-bold text-white/20 uppercase">Reward</p>
                              <p className="text-xs font-bold text-primary">+{sub.rewardPoints} PTS</p>
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-bold text-white/20 uppercase">Protocol</p>
                              <p className="text-xs font-bold text-accent">+{sub.rewardXp} XP</p>
                           </div>
                        </div>

                        {sub.status === 'pending' ? (
                          <>
                             <button
                               onClick={() => handleReview(sub, 'rejected')}
                               className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all"
                             >
                                <XCircle size={14} /> Decline
                             </button>
                             <button
                               onClick={() => handleReview(sub, 'approved')}
                               className="w-full sm:w-auto px-6 py-3 rounded-xl bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:scale-105 active:scale-95 transition-all"
                             >
                                <CheckCircle size={14} /> Verify Proof
                             </button>
                          </>
                        ) : (
                          <div className={cn(
                             "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest border",
                             sub.status === 'approved' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                          )}>
                             {sub.status}
                          </div>
                        )}
                     </div>
                  </div>
               </Card>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskOrchestrator;
