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
  ShieldCheck,
  Info,
  ChevronRight,
  X
} from 'lucide-react';
import MediaUploader from '../components/admin/MediaUploader';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

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
      {/* PROFESSIONAL HERO SECTION */}
      <div className="relative pt-32 pb-20 overflow-hidden bg-[#050507]">
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
          <div className="lg:col-span-8 space-y-16">
            {/* OVERVIEW SECTION */}
            <section className="p-10 rounded-[3rem] bg-[#0A0A0F] border border-white/5 relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                 <Info size={160} />
              </div>
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,106,210,0.5)]" />
                   <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Campaign Intel</h2>
                </div>
                <p className="text-lg text-text-secondary leading-relaxed font-medium">
                   {campaign.description}
                </p>
                <div className="flex items-center gap-6 pt-10 border-t border-white/5">
                   <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-white/20" />
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Expiration: {campaign.endDate ? campaign.endDate.toDate().toLocaleDateString() : 'Continuous'}</span>
                   </div>
                   <div className="w-1 h-1 rounded-full bg-white/5" />
                   <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-success/40" />
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Audited Assets</span>
                   </div>
                </div>
              </div>
            </section>

            {/* COMPACT TASKS LIST SECTION */}
            <section className="space-y-8">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,106,210,0.5)]" />
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Operation Vectors</h2>
                  </div>
                  <span className="text-[10px] font-mono text-white/20 font-bold uppercase">{tasks.length} Sub-Processes Identified</span>
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
                          isCompleted ? "bg-success/[0.02] border-success/10" : "bg-[#0A0A0F] border-white/5 hover:border-primary/20 shadow-lg"
                        )}
                      >
                         <div className="flex items-center gap-5 min-w-0">
                            <div className={cn(
                              "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                              isCompleted ? "bg-success/5 border-success/20 text-success" : "bg-white/[0.02] border-white/5 text-primary"
                            )}>
                               {isCompleted ? <CheckCircle2 size={20} /> : <Zap size={20} />}
                            </div>
                            <div className="min-w-0">
                               <h3 className={cn(
                                 "text-sm font-bold uppercase tracking-tight italic transition-colors",
                                 isCompleted ? "text-success/60" : "text-white group-hover:text-primary"
                               )}>{task.title}</h3>
                               <div className="flex items-center gap-3 mt-1.5">
                                  <div className="flex items-center gap-1.5">
                                     <Zap size={10} className="text-primary" />
                                     <span className="text-[10px] font-mono font-bold text-white/40">+{task.rewardAmount}</span>
                                  </div>
                                  <div className="w-0.5 h-0.5 rounded-full bg-white/10" />
                                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{task.verificationType}</span>
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
                               <ChevronRight size={14} className="text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            )}
                         </div>
                      </div>
                    );
                  })}
               </div>
            </section>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit space-y-8">
             <div className="p-10 rounded-[3.5rem] bg-[#0A0A0F] border border-white/5 text-center space-y-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] border-t-white/10">
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

      {/* TASK DETAIL DRAWER */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-[#08080C] border-l border-white/5 shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold uppercase italic tracking-tighter text-white">Task Protocol</h2>
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest mt-1">Ref: {selectedTask.id.slice(0, 16).toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                <section className="space-y-6">
                  <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 shadow-inner">
                    <h3 className="text-xl font-bold text-white uppercase italic tracking-tight mb-4">{selectedTask.title}</h3>
                    <p className="text-sm text-text-tertiary leading-relaxed font-medium">
                      {selectedTask.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center shadow-inner">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Point Bounty</p>
                      <p className="text-xl font-mono font-bold text-success">+{selectedTask.rewardAmount}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center shadow-inner">
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Progression</p>
                      <p className="text-xl font-mono font-bold text-primary">+{selectedTask.xpReward} XP</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(94,106,210,0.5)]" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Execution Requirement</h4>
                  </div>

                  <div className="space-y-6">
                    {selectedTask.actionUrl && (
                      <a
                        href={selectedTask.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-primary text-white p-6 rounded-[2rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
                      >
                        <div className="flex items-center gap-4">
                          <ExternalLink size={20} />
                          <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Open Protocol Terminal</span>
                        </div>
                        <ChevronRight size={18} />
                      </a>
                    )}

                    <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] space-y-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">Ingress Payload</label>
                        <div className="bg-black/40 rounded-2xl border border-white/5 overflow-hidden shadow-inner">
                          {selectedTask.verificationType === 'proof' ? (
                             <MediaUploader
                                label="Upload Identity Evidence"
                                value={proof[selectedTask.id]}
                                onChange={(url) => setProof(prev => ({ ...prev, [selectedTask.id]: url }))}
                                path={`proofs/${currentUser!.uid}`}
                             />
                          ) : selectedTask.verificationType === 'link' ? (
                             <div className="relative group">
                                <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={16} />
                                <input
                                   type="url"
                                   value={proof[selectedTask.id] || ''}
                                   onChange={(e) => setProof(prev => ({ ...prev, [selectedTask.id]: e.target.value }))}
                                   placeholder="https://source.evidence/..."
                                   className="w-full bg-transparent border-0 px-14 py-6 text-sm font-mono font-bold text-white focus:outline-none transition-all placeholder:text-white/5"
                                />
                             </div>
                          ) : (
                             <textarea
                               value={proof[selectedTask.id] || ''}
                               onChange={(e) => setProof(prev => ({ ...prev, [selectedTask.id]: e.target.value }))}
                               placeholder={selectedTask.proofRequirements || "Enter required submission details..."}
                               className="w-full bg-transparent border-0 px-8 py-6 text-sm font-medium text-white focus:outline-none transition-all min-h-[120px] resize-none placeholder:text-white/5"
                             />
                          )}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleSubmit(selectedTask.id)}
                        isLoading={submittingTaskId === selectedTask.id}
                        disabled={!proof[selectedTask.id]?.trim() || claims[selectedTask.id]?.validationState === 'PENDING' || claims[selectedTask.id]?.validationState === 'APPROVED'}
                        variant="primary"
                        className="w-full h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl group italic"
                      >
                        {claims[selectedTask.id]?.validationState === 'PENDING' ? 'Processing Signal...' : claims[selectedTask.id]?.validationState === 'APPROVED' ? 'Vector Finalized' : 'Authorize Provision'}
                        {!claims[selectedTask.id] && <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />}
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="pt-8 border-t border-white/5 space-y-4">
                   <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-white/10">
                      <ShieldCheck size={14} className="text-success/40" /> Verified Governance Protocol
                   </div>
                   <p className="text-[9px] text-white/10 leading-relaxed font-medium">By submitting proof, you authorize the administrative node to audit your activity for logic compliance.</p>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default CampaignDetails;
