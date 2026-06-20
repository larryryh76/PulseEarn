import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskClaim, Campaign } from '../types';
import {
  Clock,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  Users,
  Zap,
  Target,
  ShieldCheck,
  Info,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../utils';
import { CampaignEngine } from '../engines/tasks/CampaignEngine';
import TaskDetailDrawer from '../components/TaskDetailDrawer';

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [claims, setClaims] = useState<Record<string, TaskClaim>>({});
  const [loading, setLoading] = useState(true);
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [proof, setProof] = useState<Record<string, string>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);


  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id || !currentUser) return;

      try {
        // 0. Auto-Join Campaign Participation
        await CampaignEngine.joinCampaign(currentUser.uid, id);

        const docRef = doc(db, 'campaigns', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const campData = { id: docSnap.id, ...docSnap.data() } as Campaign;
          setCampaign(campData);

          // Fetch Tasks for this campaign
          const tasksQ = query(collection(db, 'tasks'), where('campaignId', '==', id));
          const tasksSnap = await getDocs(tasksQ);
          const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
          setTasks(tasksData);

          // Fetch Claims for these tasks
          if (tasksData.length > 0) {
            const taskIds = tasksData.map(t => t.id);
            const claimsQ = query(
              collection(db, 'task_claims'),
              where('userId', '==', currentUser.uid),
              where('taskId', 'in', taskIds)
            );
            const claimsSnap = await getDocs(claimsQ);
            const claimsMap: Record<string, TaskClaim> = {};
            claimsSnap.docs.forEach(d => {
              const claim = { id: d.id, ...d.data() } as TaskClaim;
              claimsMap[claim.taskId] = claim;
            });
            setClaims(claimsMap);
          }
        } else {
          toast.error('Campaign not found');
          navigate('/tasks');
        }
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast.error('Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id, currentUser, navigate]);

  const handleSubmit = async (taskId: string) => {
    if (!currentUser || submittingTaskId) return;
    const taskProof = proof[taskId];
    if (!taskProof?.trim()) return toast.error('Please provide proof of completion');

    setSubmittingTaskId(taskId);
    try {
      const task = tasks.find(t => t.id === taskId);
      const claimData = {
        userId: currentUser!.uid,
        taskId: taskId,
        campaignId: campaign?.id,
        providerId: task?.providerId || 'system',
        validationState: 'PENDING',
        completionState: 'IN_PROGRESS',
        rewardTransactionId: null,
        xpGranted: task?.xpReward || 0,
        fraudFlags: [],
        submittedProof: taskProof,
        adminFeedback: null,
        reviewedBy: null,
        createdAt: serverTimestamp(),
        resolvedAt: null,
        metadata: {
          taskTitle: task?.title,
          userEmail: currentUser.email,
          username: userData?.username || 'Anonymous'
        }
      };

      const docRef = await addDoc(collection(db, 'task_claims'), claimData);
      toast.success('Proof submitted for validation.');
      setClaims(prev => ({ ...prev, [taskId]: { id: docRef.id, ...claimData } as any }));
    } catch (error) {
      console.error('Subtask error:', error);
      toast.error('Failed to submit proof');
    } finally {
      setSubmittingTaskId(null);
    }
  };

  if (loading) return (
    <>
      <div className="pt-32 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-8" />
        <p className="text-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">Loading...</p>
      </div>
    </>
  );

  if (!campaign) return null;

  return (
    <>
      <div className="bg-background transition-colors duration-300">
      {/* PROFESSIONAL HERO SECTION */}
      <div className="relative pt-24 md:pt-32 pb-16 md:pb-20 overflow-hidden">
         <div className="absolute inset-0 -z-10">
            {campaign.bannerUrl ? (
               <img src={campaign.bannerUrl} alt="" className="w-full h-full object-cover opacity-20 blur-2xl scale-110" />
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/0 via-[#050507]/80 to-[#050507]" />
         </div>

         <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-2 text-text-tertiary hover:text-primary transition-colors mb-8 md:mb-12 group"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Tasks</span>
            </button>

            <div className="space-y-6 md:space-y-8">
               <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">{campaign.category}</span>
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">Active</span>
               </div>

               <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-text-primary leading-none uppercase">
                  {campaign.name}
               </h1>

               <div className="flex flex-wrap items-center gap-8 pt-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-surface-accent border border-border flex items-center justify-center text-primary">
                        <Zap size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">Prize Pool</p>
                        <p className="text-xl font-mono font-bold text-text-primary">{(campaign.totalPrizePool || 0)?.toLocaleString()} <span className="text-[10px] text-primary">PTS</span></p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-surface-accent border border-border flex items-center justify-center text-success">
                        <Target size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">Tasks</p>
                        <p className="text-xl font-mono font-bold text-text-primary">{tasks.length}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-surface-accent border border-border flex items-center justify-center text-accent">
                        <Users size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">Participants</p>
                        <p className="text-xl font-mono font-bold text-text-primary">{(campaign.participantsCount || 0)?.toLocaleString()}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-5xl pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16">
          <div className="lg:col-span-8 space-y-16">
            {/* OVERVIEW SECTION */}
            <section className="p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] bg-surface border border-border relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                 <Info size={160} />
              </div>
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,106,210,0.5)]" />
                   <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">Campaign Details</h2>
                </div>
                <p className="text-lg text-text-secondary leading-relaxed font-medium">
                   {campaign.description}
                </p>
                <div className="flex items-center gap-6 pt-10 border-t border-border">
                   <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-text-tertiary" />
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Expiration: {campaign.endDate ? campaign.endDate.toDate().toLocaleDateString() : 'Continuous'}</span>
                   </div>
                   <div className="w-1 h-1 rounded-full bg-surface-bright" />
                   <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-success/40" />
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Audited Assets</span>
                   </div>
                </div>
              </div>
            </section>

            {/* COMPACT TASKS LIST SECTION */}
            <section className="space-y-8">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,106,210,0.5)]" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">Available Tasks</h2>
                  </div>
                  <span className="text-[10px] font-mono text-text-tertiary font-bold uppercase">{tasks.length} Steps Found</span>
               </div>

               <div className="grid grid-cols-1 gap-3">
                  {tasks.map((task) => {
                    const claim = claims[task.id];
                    const isPending = claim?.validationState === 'PENDING';
                    const isCompleted = claim?.validationState === 'APPROVED';

                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          "group p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-6",
                          isCompleted ? "bg-success/[0.02] border-success/10" : "bg-surface border-border hover:border-primary/20 shadow-lg"
                        )}
                      >
                         <div className="flex items-center gap-5 min-w-0">
                            <div className={cn(
                              "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                              isCompleted ? "bg-success/5 border-success/20 text-success" : "bg-surface-bright border-border text-primary"
                            )}>
                               {isCompleted ? <CheckCircle2 size={20} /> : <Zap size={20} />}
                            </div>
                            <div className="min-w-0">
                               <h3 className={cn(
                                 "text-sm font-bold uppercase tracking-tight italic transition-colors",
                                 isCompleted ? "text-success/60" : "text-text-primary group-hover:text-primary"
                               )}>{task.title}</h3>
                               <div className="flex items-center gap-3 mt-1.5">
                                  <div className="flex items-center gap-1.5">
                                     <Zap size={10} className="text-primary" />
                                     <span className="text-[10px] font-mono font-bold text-text-secondary">+{task.rewardAmount}</span>
                                  </div>
                                  <div className="w-0.5 h-0.5 rounded-full bg-surface-accent" />
                                  <span className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">{task.verificationType}</span>
                               </div>
                            </div>
                         </div>

                         <div className="flex items-center gap-4 shrink-0">
                            {isCompleted ? (
                               <div className="px-3 py-1 rounded-lg bg-success/10 text-success text-[8px] font-black uppercase tracking-widest">
                                  Closed
                               </div>
                            ) : isPending ? (
                               <div className="px-3 py-1 rounded-lg bg-warning/5 text-warning/40 text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                                  <Clock size={10} className="animate-pulse" />
                                  Review
                               </div>
                            ) : (
                               <ChevronRight size={14} className="text-text-tertiary/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            )}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </section>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit space-y-8">
             <div className="p-10 rounded-[3.5rem] bg-surface border border-border text-center space-y-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] border-t-white/10">
                <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-primary/5">
                  <ShieldCheck size={36} className="text-primary" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-bold uppercase tracking-tighter text-text-primary">Status</h3>
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{campaign.active ? 'Active' : 'Ended'}</p>
                </div>

                <div className="pt-8 border-t border-border space-y-6">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-text-tertiary">Progress</span>
                    <span className="text-text-primary">{Object.values(claims).filter(c => c.validationState === 'APPROVED').length} / {tasks.length}</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-bright rounded-full overflow-hidden p-0.5 border border-border">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(94,106,210,0.4)]"
                      style={{ width: `${(Object.values(claims).filter(c => c.validationState === 'APPROVED').length / Math.max(tasks.length, 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-surface-bright rounded-2xl p-6 text-left space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Sponsor</span>
                      <span className="text-[10px] font-bold text-text-primary uppercase tracking-widest">{campaign.sponsorName || 'PulseEarn'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Launched</span>
                      <span className="text-[10px] font-mono font-bold text-text-primary uppercase">{campaign.startDate?.toDate().toLocaleDateString()}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* TASK DETAIL DRAWER */}
      <TaskDetailDrawer
         isOpen={!!selectedTask}
         onClose={() => setSelectedTask(null)}
         task={selectedTask}
         claim={selectedTask ? claims[selectedTask.id] : undefined}
         onAction={async () => { await handleSubmit(selectedTask!.id); }}
         isSubmitting={submittingTaskId === selectedTask?.id}
         proofValue={selectedTask ? (proof[selectedTask.id] || '') : ''}
         setProofValue={(val) => selectedTask && setProof(prev => ({ ...prev, [selectedTask.id]: val }))}
      />
      </div>
    </>
  );
};

export default CampaignDetails;
