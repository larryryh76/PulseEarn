import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { Task, TaskClaim, Campaign } from '../types';
import {
  Clock,
  ExternalLink,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  Users,
  Zap,
  Target,
  Link as LinkIcon,
  BarChart3,
  ShieldCheck,
  Info,
  TrendingUp,
  ChevronRight
} from 'lucide-react';
import MediaUploader from '../components/admin/MediaUploader';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { cn } from '../utils';

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

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id || !currentUser) return;

      try {
        // 0. Auto-Join Campaign Participation
        const { CampaignEngine } = await import('../engines/tasks/CampaignEngine');
        await CampaignEngine.joinCampaign(currentUser.uid, id);

        const docRef = doc(db, 'campaigns', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const campData = { id: docSnap.id, ...docSnap.data() } as Campaign;
          setCampaign(campData);

          // Fetch Tasks for this campaign
          if (campData.taskIds?.length > 0) {
            const tasksQ = query(collection(db, 'tasks'), where('id', 'in', campData.taskIds));
            const tasksSnap = await getDocs(tasksQ);
            const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
            setTasks(tasksData);

            // Fetch Claims for these tasks
            const claimsQ = query(collection(db, 'task_claims'), where('userId', '==', currentUser.uid), where('taskId', 'in', campData.taskIds));
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
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-8" />
        <p className="text-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">Loading...</p>
      </div>
    </MainLayout>
  );

  if (!campaign) return null;

  return (
    <MainLayout>
      {/* IMPROVED HERO SECTION */}
      <div className="relative pt-32 pb-20 overflow-hidden">
         <div className="absolute inset-0 -z-10">
            {campaign.bannerUrl ? (
               <img src={campaign.bannerUrl} alt="" className="w-full h-full object-cover opacity-20 blur-2xl scale-110" />
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-[#050507]/0 via-[#050507]/80 to-[#050507]" />
         </div>

         <div className="container mx-auto px-6 max-w-5xl">
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors mb-12 group"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Tasks</span>
            </button>

            <div className="space-y-8">
               <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest">{campaign.category}</span>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Active</span>
               </div>

               <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white leading-none uppercase">
                  {campaign.name}
               </h1>

               <div className="flex flex-wrap items-center gap-8 pt-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-primary">
                        <Zap size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-0.5">Prize Pool</p>
                        <p className="text-xl font-mono font-bold text-white">{(campaign.totalPrizePool || 0)?.toLocaleString()} <span className="text-[10px] text-primary">PTS</span></p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-success">
                        <Target size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-0.5">Tasks</p>
                        <p className="text-xl font-mono font-bold text-white">{campaign.taskIds?.length || 0}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-accent">
                        <Users size={20} />
                     </div>
                     <div>
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-0.5">Participants</p>
                        <p className="text-xl font-mono font-bold text-white">{(campaign.participantsCount || 0)?.toLocaleString()}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="container mx-auto px-6 max-w-5xl pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-8 space-y-20">
            {/* OVERVIEW SECTION */}
            <section className="space-y-8">
               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Details</span>
                  <div className="h-px flex-1 bg-white/[0.03]" />
               </div>
               <div className="p-10 rounded-[3rem] bg-[#0A0A0F] border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-700">
                     <Info size={160} />
                  </div>
                  <p className="text-lg text-text-secondary leading-relaxed font-medium relative z-10">
                     {campaign.description}
                  </p>
                  <div className="flex items-center gap-6 mt-10 pt-10 border-t border-white/5 relative z-10">
                     <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-white/20" />
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Ends: {campaign.endDate ? campaign.endDate.toDate().toLocaleDateString() : 'Continuous'}</span>
                     </div>
                  </div>
               </div>
            </section>

            {/* TASKS LIST SECTION */}
            <section className="space-y-8">
               <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Tasks</span>
                  <div className="h-px flex-1 bg-white/[0.03]" />
               </div>

               <div className="space-y-4">
                  {tasks.map((task) => {
                    const claim = claims[task.id];
                    const isPending = claim?.validationState === 'PENDING';
                    const isCompleted = claim?.validationState === 'APPROVED';

                    return (
                      <div key={task.id} className={cn(
                        "rounded-[2rem] border transition-all overflow-hidden",
                        isCompleted ? "bg-success/[0.01] border-success/10" : "bg-[#08080C] border-white/5 shadow-xl"
                      )}>
                         <div className="p-6 sm:p-8 space-y-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                               <div className="flex items-center gap-5">
                                  <div className={cn(
                                    "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 shadow-inner",
                                    isCompleted ? "bg-success/5 border-success/20 text-success" : "bg-white/[0.02] border-white/10 text-primary"
                                  )}>
                                     <Zap size={20} />
                                  </div>
                                  <div className="min-w-0">
                                     <h3 className="text-lg font-bold text-white uppercase tracking-tight truncate italic">{task.title}</h3>
                                     <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1">
                                           <Zap size={10} className="text-primary" />
                                           <span className="text-[11px] font-mono font-bold text-white">+{task.rewardAmount}</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-white/5" />
                                        <div className="flex items-center gap-1">
                                           <TrendingUp size={10} className="text-accent" />
                                           <span className="text-[11px] font-mono font-bold text-white">+{task.xpReward} XP</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-white/5" />
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{task.verificationType}</span>
                                     </div>
                                  </div>
                               </div>

                               {isCompleted ? (
                                  <div className="self-start sm:self-center px-4 py-1.5 rounded-lg bg-success/10 border border-success/20 text-success flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                     <CheckCircle2 size={14} />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Completed</span>
                                  </div>
                               ) : isPending ? (
                                  <div className="self-start sm:self-center px-4 py-1.5 rounded-lg bg-warning/5 border border-warning/10 text-warning/60 flex items-center gap-2">
                                     <Clock size={14} className="animate-pulse" />
                                     <span className="text-[9px] font-black uppercase tracking-widest">Pending Review</span>
                                  </div>
                               ) : null}
                            </div>

                            <p className="text-sm text-text-tertiary leading-relaxed font-medium pl-5 border-l-2 border-primary/20 italic">
                               {task.description}
                            </p>

                            {!isCompleted && !isPending && (
                               <div className="pt-8 border-t border-white/5 space-y-8">
                                  {task.actionUrl && (
                                     <div className="flex items-center justify-between bg-white/[0.01] p-5 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                           <Info size={14} className="text-primary/40" />
                                           <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Execution Link</p>
                                        </div>
                                        <a
                                          href={task.actionUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-[9px] font-black text-white bg-white/5 hover:bg-white/10 transition-all uppercase tracking-widest px-5 py-2.5 rounded-xl border border-white/10"
                                        >
                                          Start Session <ExternalLink size={12} />
                                        </a>
                                     </div>
                                  )}

                                  <div className="space-y-5">
                                     <div className="flex items-center gap-3 px-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,106,210,0.5)]" />
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Evidence Submission</p>
                                     </div>

                                     <div className="bg-[#050507] rounded-2xl border border-white/5 overflow-hidden">
                                        {task.verificationType === 'proof' ? (
                                           <div className="p-1">
                                              <MediaUploader
                                                 label="Upload Secure Proof"
                                                 value={proof[task.id]}
                                                 onChange={(url) => setProof(prev => ({ ...prev, [task.id]: url }))}
                                                 path={`proofs/${currentUser!.uid}`}
                                              />
                                           </div>
                                        ) : task.verificationType === 'link' ? (
                                           <div className="relative group">
                                              <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={16} />
                                              <input
                                                 type="url"
                                                 value={proof[task.id] || ''}
                                                 onChange={(e) => setProof(prev => ({ ...prev, [task.id]: e.target.value }))}
                                                 placeholder="https://source.evidence/..."
                                                 className="w-full bg-transparent border-0 px-14 py-5 text-sm font-mono font-bold text-white focus:outline-none transition-all placeholder:text-white/5"
                                              />
                                           </div>
                                        ) : task.verificationType === 'prediction' ? (
                                           <div onClick={() => navigate('/predictions')} className="p-8 text-center cursor-pointer group hover:bg-white/[0.02] transition-all">
                                              <BarChart3 size={32} className="mx-auto text-primary/40 mb-3 group-hover:text-primary group-hover:scale-110 transition-all" />
                                              <p className="text-[10px] font-black text-white/40 group-hover:text-white uppercase tracking-[0.2em]">Open Forecasting Ledger</p>
                                           </div>
                                        ) : (
                                           <textarea
                                             value={proof[task.id] || ''}
                                             onChange={(e) => setProof(prev => ({ ...prev, [task.id]: e.target.value }))}
                                             placeholder={task.proofRequirements || "Enter required submission details..."}
                                             className="w-full bg-transparent border-0 px-6 py-5 text-sm font-medium text-white focus:outline-none transition-all min-h-[120px] resize-none placeholder:text-white/5"
                                           />
                                        )}
                                     </div>

                                     {task.verificationType !== 'prediction' && task.verificationType !== 'referral' && (
                                        <Button
                                          onClick={() => handleSubmit(task.id)}
                                          isLoading={submittingTaskId === task.id}
                                          disabled={!proof[task.id]?.trim()}
                                          variant="primary"
                                          className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl group"
                                        >
                                          Submit for Review <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                                        </Button>
                                     )}
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </section>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit space-y-8">
             <div className="p-10 rounded-[3rem] bg-[#0A0A0F] border border-white/5 text-center space-y-8 shadow-2xl shadow-black">
                <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg shadow-primary/5">
                  <ShieldCheck size={36} className="text-primary" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-bold uppercase tracking-tighter text-white">Status</h3>
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{campaign.active ? 'Active' : 'Ended'}</p>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-6">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-white/20">Progress</span>
                    <span className="text-white">{Object.values(claims).filter(c => c.validationState === 'APPROVED').length} / {tasks.length}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(94,106,210,0.4)]"
                      style={{ width: `${(Object.values(claims).filter(c => c.validationState === 'APPROVED').length / Math.max(tasks.length, 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white/[0.02] rounded-2xl p-6 text-left space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Sponsor</span>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">{campaign.sponsorName || 'PulseEarn'}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Launched</span>
                      <span className="text-[10px] font-mono font-bold text-white uppercase">{campaign.startDate?.toDate().toLocaleDateString()}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CampaignDetails;
