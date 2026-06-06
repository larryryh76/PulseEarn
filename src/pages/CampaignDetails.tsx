import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { Task, TaskClaim } from '../types';
import {
  Clock,
  ShieldCheck,
  ExternalLink,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proof, setProof] = useState('');
  const [existingClaim, setExistingClaim] = useState<TaskClaim | null>(null);

  useEffect(() => {
    const fetchTask = async () => {
      if (!id || !currentUser) return;

      try {
        const docRef = doc(db, 'tasks', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setTask({ id: docSnap.id, ...docSnap.data() } as Task);

          const claimsRef = collection(db, 'task_claims');
          const q = query(claimsRef, where('taskId', '==', id), where('userId', '==', currentUser.uid));
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
            setExistingClaim({ id: querySnap.docs[0].id, ...querySnap.docs[0].data() } as TaskClaim);
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

    fetchTask();
  }, [id, currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !task || submitting) return;
    if (!proof.trim()) return toast.error('Please provide proof of completion');

    setSubmitting(true);
    try {
      const claimData = {
        userId: currentUser.uid,
        taskId: task.id,
        providerId: task.providerId || 'system',
        validationState: 'PENDING',
        completionState: 'IN_PROGRESS',
        rewardTransactionId: null,
        xpGranted: task.xpReward,
        fraudFlags: [],
        submittedProof: proof,
        adminFeedback: null,
        reviewedBy: null,
        createdAt: serverTimestamp(),
        resolvedAt: null,
        metadata: {
          taskTitle: task.title,
          userEmail: currentUser.email,
          username: userData?.username || 'Anonymous'
        }
      };

      const docRef = await addDoc(collection(db, 'task_claims'), claimData);
      toast.success('Campaign proof submitted for validation.');
      setExistingClaim({ id: docRef.id, ...claimData } as any);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit proof');
    } finally {
      setSubmitting(false);
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

  if (!task) return null;

  const isLocked = task.minLevel && (userData?.level || 1) < task.minLevel;
  const isPending = existingClaim?.validationState === 'PENDING';
  const isCompleted = existingClaim?.validationState === 'APPROVED';

  return (
    <MainLayout>
      {/* IMMERSIVE HEADER */}
      <div className="relative pt-24 pb-12 overflow-hidden border-b border-border">
         <div className="absolute inset-0 -z-10 overflow-hidden opacity-30">
            {task.campaignArtwork ? (
               <img src={task.campaignArtwork} alt="" className="w-full h-full object-cover blur-3xl scale-110" />
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
                  <div className="flex items-center gap-2">
                     <span className="badge-system badge-primary">{task.category}</span>
                     <span className="text-text-tertiary text-xs">•</span>
                     <span className="text-text-tertiary text-[10px] font-bold uppercase tracking-widest">{task.platform}</span>
                  </div>
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                     {task.title}
                  </h1>
               </div>

               <div className="flex flex-wrap items-center gap-4">
                  <div className="system-card-compact bg-background/40 backdrop-blur-md border-white/5 py-4 px-8 min-w-[160px]">
                     <p className="data-label">Expected Reward</p>
                     <p className="text-3xl font-bold text-white tracking-tighter">+{task.rewardAmount} <span className="text-[10px] font-mono text-primary uppercase ml-1">PTS</span></p>
                  </div>
                  <div className="system-card-compact bg-background/40 backdrop-blur-md border-white/5 py-4 px-8 min-w-[120px]">
                     <p className="data-label">Experience</p>
                     <p className="text-3xl font-bold text-white tracking-tighter">+{task.xpReward} <span className="text-[10px] font-mono text-primary uppercase ml-1">XP</span></p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="container mx-auto px-6 max-w-7xl pt-16 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          {/* CAMPAIGN INFRASTRUCTURE */}
          <div className="lg:col-span-8 space-y-16">
            <section className="space-y-8">
               <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
               </div>
               <p className="text-lg text-text-secondary leading-relaxed font-medium">
                  {task.description}
               </p>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: Clock, label: 'Execution Time', value: task.estimatedTime || '5 Minutes' },
                    { icon: Calendar, label: 'Expiry Date', value: task.endDate ? task.endDate.toDate().toLocaleDateString() : 'Permanent' },
                    { icon: Layers, label: 'Verification', value: task.verificationType },
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
                  <h2 className="text-2xl font-bold tracking-tight">Execution Instructions</h2>
               </div>

               <Card className="bg-surface-bright/30 border-white/5 p-10 space-y-8">
                  <div className="space-y-6">
                    {task.instructions ? (
                      <div className="text-text-secondary text-base leading-relaxed whitespace-pre-wrap font-medium">
                        {task.instructions}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-text-tertiary italic py-8 border border-dashed border-border rounded-2xl justify-center">
                         <AlertCircle size={18} />
                         No specialized instructions provided for this campaign.
                      </div>
                    )}
                  </div>

                  {task.actionUrl && (
                    <a
                      href={task.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition-all shadow-xl shadow-white/5 group"
                    >
                      Execute External Action
                      <ExternalLink size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                  )}
               </Card>
            </section>

            {task.proofRequirements && (
               <section className="space-y-8">
                  <div className="flex items-center gap-3">
                     <div className="w-1 h-6 bg-primary rounded-full" />
                     <h2 className="text-2xl font-bold tracking-tight">Verification Guidelines</h2>
                  </div>
                  <div className="p-8 border border-border rounded-[2rem] bg-surface/30">
                     <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                           <ShieldCheck size={20} className="text-primary" />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Operator Note</p>
                           <p className="text-sm text-text-secondary leading-relaxed font-medium">
                              {task.proofRequirements}
                           </p>
                        </div>
                     </div>
                  </div>
               </section>
            )}
          </div>

          {/* SUBMISSION INTERFACE */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit space-y-8">
             <Card className="border-primary/20 bg-primary/[0.02] p-10 rounded-[2.5rem]">
                <AnimatePresence mode="wait">
                  {isLocked ? (
                    <motion.div
                      key="locked"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center space-y-6"
                    >
                      <div className="w-20 h-20 bg-danger/10 border border-danger/20 rounded-[2rem] flex items-center justify-center mx-auto">
                        <Lock size={32} className="text-danger" />
                      </div>
                      <div className="space-y-2">
                         <h3 className="text-xl font-bold">Execution Restricted</h3>
                         <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.15em]">Requires Level {task.minLevel} Authorization</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>Elevate Rank</Button>
                    </motion.div>
                  ) : isCompleted ? (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center space-y-6"
                    >
                      <div className="w-20 h-20 bg-success/10 border border-success/20 rounded-[2rem] flex items-center justify-center mx-auto">
                        <CheckCircle2 size={32} className="text-success" />
                      </div>
                      <div className="space-y-2">
                         <h3 className="text-xl font-bold">Campaign Finalized</h3>
                         <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.15em]">Rewards Successfully Settled</p>
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => navigate('/tasks')}>Discover More</Button>
                    </motion.div>
                  ) : isPending ? (
                    <motion.div
                      key="pending"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center space-y-6"
                    >
                      <div className="w-20 h-20 bg-warning/10 border border-warning/20 rounded-[2rem] flex items-center justify-center mx-auto">
                        <Clock size={32} className="text-warning" />
                      </div>
                      <div className="space-y-2">
                         <h3 className="text-xl font-bold">In Validation</h3>
                         <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.15em]">Manual Audit in Progress</p>
                      </div>
                      <div className="pt-8 border-t border-white/5 text-left space-y-4">
                         <div className="flex items-center gap-2">
                            <Info size={14} className="text-text-tertiary" />
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Active Submission</p>
                         </div>
                         <p className="text-xs text-text-secondary italic line-clamp-3 p-4 bg-background/40 rounded-xl border border-white/5">
                            {existingClaim?.submittedProof}
                         </p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="active"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      onSubmit={handleSubmit}
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <label className="data-label flex items-center gap-2">
                          <Send size={12} />
                          Submission Proof
                        </label>
                        <textarea
                          value={proof}
                          onChange={(e) => setProof(e.target.value)}
                          placeholder="Provide the required URL, ID, or completion text..."
                          className="w-full bg-background border border-border rounded-2xl px-5 py-5 text-sm font-medium text-white focus:outline-none focus:border-primary transition-all min-h-[160px] resize-none"
                        />
                        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                           <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
                           <p className="text-[11px] text-primary/80 font-semibold leading-relaxed">
                              Verification cycles take 12-24 hours. Inaccurate submissions result in immediate rejection.
                           </p>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        isLoading={submitting}
                        disabled={!proof.trim()}
                        className="w-full h-16"
                      >
                        Submit For Validation
                        {!submitting && <ChevronRight size={18} />}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
             </Card>

             <div className="system-card-compact bg-surface/30 p-6 flex items-center gap-4 border-dashed">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                   <ShieldCheck size={20} className="text-text-tertiary" />
                </div>
                <p className="text-[11px] text-text-tertiary font-bold uppercase tracking-widest leading-relaxed">
                   Rewards are protected by multi-vector fraud detection.
                </p>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CampaignDetails;
