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
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
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
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchContent = async () => {
      if (!id || !currentUser) return;

      try {
        // Try fetching campaign first
        const campRef = doc(db, 'campaigns', id);
        const campSnap = await getDoc(campRef);

        if (campSnap.exists()) {
          const campData = { id: campSnap.id, ...campSnap.data() } as Campaign;
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
          // If not a campaign, try fetching as a standalone task
          const taskRef = doc(db, 'tasks', id);
          const taskSnap = await getDoc(taskRef);

          if (taskSnap.exists()) {
            const taskData = { id: taskSnap.id, ...taskSnap.data() } as Task;
            setTasks([taskData]);

            // Create a virtual campaign for standalone task display
            setCampaign({
              id: taskData.id,
              name: taskData.title,
              description: taskData.description,
              category: taskData.category,
              type: taskData.type,
              bannerUrl: taskData.campaignArtwork || '',
              totalPrizePool: taskData.rewardAmount,
              taskIds: [taskData.id],
              active: taskData.active,
              status: taskData.status as any,
              visibility: 'PUBLIC'
            } as any);

            // Fetch Claims for this task
            const claimsQ = query(collection(db, 'task_claims'), where('userId', '==', currentUser.uid), where('taskId', '==', taskData.id));
            const claimsSnap = await getDocs(claimsQ);
            if (!claimsSnap.empty) {
               const claim = { id: claimsSnap.docs[0].id, ...claimsSnap.docs[0].data() } as TaskClaim;
               setClaims({ [taskData.id]: claim });
            }
          } else {
            toast.error('Campaign or Task not found');
            navigate('/tasks');
          }
        }
      } catch (error) {
        console.error('Error fetching campaign:', error);
        toast.error('Failed to load campaign details');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, currentUser, navigate]);

  const handleSubmit = async (taskId: string) => {
    if (!currentUser || submittingTaskId) return;
    const task = tasks.find(t => t.id === taskId);
    const taskProof = proof[taskId];

    if (task?.submissionType !== 'NONE' && task?.submissionType !== 'AUTOMATIC' && !taskProof?.trim()) {
      return toast.error('Please provide proof of completion');
    }

    setSubmittingTaskId(taskId);
    try {
      const task = tasks.find(t => t.id === taskId);
      const claimData = {
        userId: currentUser.uid,
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
        <p className="text-text-tertiary text-[10px] font-bold uppercase tracking-[0.2em]">Synchronizing Campaign Data...</p>
      </div>
    </MainLayout>
  );

  if (!campaign) return null;

  return (
    <MainLayout>
      <div className="relative pt-24 pb-12 overflow-hidden border-b border-border">
         <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
            {campaign.bannerUrl ? (
               <img src={campaign.bannerUrl} alt="" className="w-full h-full object-cover blur-3xl scale-110" />
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent" />
            )}
            <div className="absolute inset-0 bg-background/80" />
         </div>

         <div className="container mx-auto px-6 max-w-7xl">
            <button
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors mb-12 group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Marketplace Discovery</span>
            </button>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
               <div className="space-y-4">
                     <div className="flex items-center gap-3">
                     <span className="badge-system badge-primary">{campaign.category}</span>
                        <div className="h-1 w-1 rounded-full bg-white/10" />
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{campaign.type} Protocol</span>
                  </div>
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                     {campaign.name}
                  </h1>
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                           {campaign.sponsorLogoUrl ? (
                              <img src={campaign.sponsorLogoUrl} alt="" className="w-5 h-5 rounded" />
                           ) : (
                              <Target size={14} className="text-primary" />
                           )}
                           <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{campaign.sponsorName || 'PulseEarn'}</span>
                        </div>
                     </div>
               </div>

               <div className="flex flex-wrap items-center gap-4">
                  <div className="system-card-compact bg-background/40 backdrop-blur-md border-white/5 py-4 px-8 min-w-[160px]">
                        <p className="data-label">Points Award</p>
                     <p className="text-3xl font-bold text-white tracking-tighter">+{(campaign.totalPrizePool || 0)?.toLocaleString()} <span className="text-[10px] font-mono text-primary uppercase ml-1">PTS</span></p>
                  </div>
                  <div className="system-card-compact bg-background/40 backdrop-blur-md border-white/5 py-4 px-8 min-w-[120px]">
                        <p className="data-label">Task Count</p>
                     <p className="text-3xl font-bold text-white tracking-tighter">{campaign.taskIds?.length || 0}</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="container mx-auto px-6 max-w-7xl pt-16 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-8 space-y-16">
            <section className="space-y-8">
               <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-2xl font-bold tracking-tight">Campaign Overview</h2>
               </div>
               <p className="text-lg text-text-secondary leading-relaxed font-medium">
                  {campaign.description}
               </p>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Calendar, label: 'Starts', value: campaign.startDate ? (campaign.startDate?.toDate?.()?.toLocaleDateString() || "N/A") : 'N/A' },
                    { icon: Calendar, label: 'Ends', value: campaign.endDate ? (campaign.endDate?.toDate?.()?.toLocaleDateString() || "N/A") : 'Ongoing' },
                    { icon: Users, label: 'Participants', value: (campaign.participantsCount || 0)?.toLocaleString() },
                  ].map((meta, i) => (
                    <div key={i} className="system-card-compact flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                          <meta.icon size={18} className="text-text-tertiary" />
                       </div>
                       <div>
                          <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest leading-none mb-1">{meta.label}</p>
                          <p className="text-xs font-bold text-white uppercase">{meta.value}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </section>

            <section className="space-y-8">
               <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-2xl font-bold tracking-tight">Campaign Tasks</h2>
               </div>

               <div className="space-y-6">
                  {tasks.map((task) => {
                    const claim = claims[task.id];
                    const isPending = claim?.validationState === 'PENDING';
                    const isCompleted = claim?.validationState === 'APPROVED';

                    return (
                      <Card key={task.id} className={cn(
                        "bg-surface-bright/30 border-white/5 p-8 transition-all",
                        isCompleted && "border-success/20 bg-success/[0.02]"
                      )}>
                        <div className="flex flex-col md:flex-row justify-between gap-8">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                                {task.platform === 'TWITTER' ? <Zap size={18} /> : <Zap size={18} />}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">{task.title}</h3>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">+{task.rewardAmount} PTS • +{task.xpReward} XP</p>
                              </div>
                            </div>
                            <p className="text-sm text-text-secondary font-medium leading-relaxed">
                              {task.description}
                            </p>

                           {!isCompleted && (
                             <div className="flex flex-wrap gap-4 pt-2">
                               {task.actionUrl && (
                                 <a
                                   href={task.actionUrl}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary/20 transition-all"
                                 >
                                   Complete Task <ExternalLink size={12} />
                                 </a>
                               )}
                               {task.platform === 'PREDICTION' && (
                                 <button
                                   onClick={() => navigate('/predictions')}
                                   className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-widest hover:bg-accent/20 transition-all"
                                 >
                                   Go to Predictions <Zap size={12} />
                                 </button>
                               )}
                             </div>
                           )}
                          </div>

                          <div className="w-full md:w-80 space-y-4">
                            {isCompleted ? (
                              <div className="h-full flex items-center justify-center gap-3 p-4 bg-success/10 border border-success/20 rounded-2xl text-success">
                                <CheckCircle2 size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest">Verified</span>
                              </div>
                            ) : isPending ? (
                              <div className="h-full flex flex-col items-center justify-center gap-3 p-4 bg-warning/5 border border-warning/10 rounded-2xl text-warning/60">
                                <Clock size={20} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">In Review</span>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {task.submissionType === 'SCREENSHOT' ? (
                                  <div className="space-y-3">
                                     <div className={cn(
                                       "w-full aspect-video rounded-xl border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center p-4 relative overflow-hidden group",
                                       proof[task.id] && "border-success/20 bg-success/[0.02]"
                                     )}>
                                        {proof[task.id] ? (
                                          <>
                                            <img src={proof[task.id]} alt="Proof" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                               <button onClick={() => setProof(prev => ({ ...prev, [task.id]: '' }))} className="p-2 bg-danger rounded-lg text-white"><Zap size={14} className="rotate-45" /></button>
                                            </div>
                                          </>
                                        ) : (
                                          <label className="flex flex-col items-center gap-2 cursor-pointer">
                                             <input
                                               type="file"
                                               className="hidden"
                                               accept="image/*"
                                               onChange={async (e) => {
                                                  const file = e.target.files?.[0];
                                                  if (!file) return;
                                                  setIsUploading(prev => ({ ...prev, [task.id]: true }));
                                                  try {
                                                    const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
                                                    const { storage } = await import('../firebase/config');
                                                    const fileName = `${currentUser?.uid}_${task.id}_${Date.now()}`;
                                                    const storageRef = ref(storage, `proofs/${fileName}`);
                                                    const uploadTask = uploadBytesResumable(storageRef, file);

                                                    uploadTask.on('state_changed', null, (err) => {
                                                      console.error(err);
                                                      toast.error('Upload failed');
                                                      setIsUploading(prev => ({ ...prev, [task.id]: false }));
                                                    }, async () => {
                                                      const url = await getDownloadURL(uploadTask.snapshot.ref);
                                                      setProof(prev => ({ ...prev, [task.id]: url }));
                                                      setIsUploading(prev => ({ ...prev, [task.id]: false }));
                                                      toast.success('Screenshot uploaded');
                                                    });
                                                  } catch (err) {
                                                    console.error(err);
                                                    setIsUploading(prev => ({ ...prev, [task.id]: false }));
                                                  }
                                               }}
                                             />
                                             <Zap size={24} className="text-white/20" />
                                             <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest text-center">Tap to Upload Screenshot</span>
                                          </label>
                                        )}
                                        {isUploading[task.id] && (
                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                             <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                          </div>
                                        )}
                                     </div>
                                  </div>
                                ) : task.submissionType === 'LINK' ? (
                                  <input
                                    type="url"
                                    value={proof[task.id] || ''}
                                    onChange={(e) => setProof(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    placeholder="Enter Submission Link..."
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-medium text-white focus:outline-none focus:border-primary transition-all"
                                  />
                                ) : task.submissionType === 'TEXT' ? (
                                  <textarea
                                    value={proof[task.id] || ''}
                                    onChange={(e) => setProof(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    placeholder="Enter proof or evidence..."
                                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-xs font-medium text-white focus:outline-none focus:border-primary transition-all min-h-[80px] resize-none"
                                  />
                                ) : task.submissionType === 'AUTOMATIC' ? (
                                  <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center">
                                     <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Automatic Tracking Active</p>
                                  </div>
                                ) : null}

                                <Button
                                  onClick={() => handleSubmit(task.id)}
                                  isLoading={submittingTaskId === task.id}
                                  disabled={task.submissionType !== 'NONE' && task.submissionType !== 'AUTOMATIC' && !proof[task.id]?.trim()}
                                  className="w-full py-3 text-[10px]"
                                >
                                  {task.submissionType === 'AUTOMATIC' ? 'Verify Completion' : 'Submit Proof'}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
               </div>
            </section>
          </div>

          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit space-y-8">
             <Card className="border-white/5 bg-white/[0.01] p-10 rounded-[2.5rem] text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 border border-primary/20 rounded-[2rem] flex items-center justify-center mx-auto">
                  <Target size={32} className="text-primary" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-xl font-bold uppercase tracking-tight">Campaign Status</h3>
                   <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.15em]">{campaign.active ? 'Accepting Subtasks' : 'Closed'}</p>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-text-tertiary">Tasks Completed</span>
                    <span className="text-white">{Object.values(claims).filter(c => c.validationState === 'APPROVED').length} / {tasks.length}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${(Object.values(claims).filter(c => c.validationState === 'APPROVED').length / tasks.length) * 100}%` }}
                    />
                  </div>
                </div>
             </Card>

          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CampaignDetails;
