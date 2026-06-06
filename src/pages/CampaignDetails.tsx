import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { Task, TaskClaim } from '../types';
import {
  Zap,
  Clock,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

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

          // Check for existing claims in global collection
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

      toast.success('Proof submitted successfully! Awaiting verification.');
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
      <div className="pt-32 px-6 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-text-secondary text-xs font-bold uppercase tracking-widest">Loading Campaign...</p>
      </div>
    </MainLayout>
  );

  if (!task) return null;

  const isLocked = task.minLevel && (userData?.level || 1) < task.minLevel;
  const isPending = existingClaim?.validationState === 'PENDING';
  const isCompleted = existingClaim?.validationState === 'APPROVED';

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Back to Marketplace</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-7 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                  <ShieldCheck size={24} className="text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{task.category}</p>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{task.title}</h1>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="text-text-secondary leading-relaxed text-lg font-medium">
                  {task.description}
                </p>
              </div>
            </motion.div>

            {/* Instruction Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="system-card p-8 space-y-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Info size={16} className="text-primary" />
                Execution Instructions
              </h3>

              <div className="space-y-4">
                {task.instructions ? (
                  <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                    {task.instructions}
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm italic">No specific requirements listed.</p>
                )}
              </div>

              {task.actionUrl && (
                <a
                  href={task.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-white text-[11px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Visit External Platform
                  <ExternalLink size={14} />
                </a>
              )}
            </motion.div>
          </div>

          {/* Submission Sidebar */}
          <div className="lg:col-span-5 space-y-6">
             {/* Reward Summary */}
             <div className="system-card p-8 border-primary/20 bg-primary/[0.02]">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-6">Campaign Rewards</p>
                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-text-secondary text-xs font-bold uppercase">Points</span>
                      <span className="text-2xl font-bold text-white tracking-tighter">+{task.rewardAmount} PTS</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-text-secondary text-xs font-bold uppercase">Experience</span>
                      <span className="text-lg font-bold text-primary tracking-tighter">+{task.xpReward} XP</span>
                   </div>
                </div>
             </div>

             {/* Action State */}
             <div className="system-card p-8">
                <AnimatePresence mode="wait">
                  {isLocked ? (
                    <motion.div
                      key="locked"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center space-y-4"
                    >
                      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={24} className="text-red-500" />
                      </div>
                      <h3 className="text-lg font-bold">Campaign Locked</h3>
                      <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Requires Level {task.minLevel} to participate</p>
                    </motion.div>
                  ) : isCompleted ? (
                    <motion.div
                      key="completed"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center space-y-4"
                    >
                      <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={24} className="text-green-500" />
                      </div>
                      <h3 className="text-lg font-bold">Rewards Claimed</h3>
                      <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">You have successfully completed this campaign</p>
                    </motion.div>
                  ) : isPending ? (
                    <motion.div
                      key="pending"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center space-y-4"
                    >
                      <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock size={24} className="text-orange-500" />
                      </div>
                      <h3 className="text-lg font-bold">Verification Pending</h3>
                      <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Our operators are reviewing your submission</p>
                      <div className="pt-4 border-t border-white/5 text-left">
                         <p className="text-[10px] font-bold text-white/20 uppercase mb-2">Your Submission</p>
                         <p className="text-xs text-text-secondary italic line-clamp-3">{existingClaim?.submittedProof}</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="active"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      onSubmit={handleSubmit}
                      className="space-y-6"
                    >
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                          <Send size={12} />
                          Submission Proof
                        </label>
                        <textarea
                          value={proof}
                          onChange={(e) => setProof(e.target.value)}
                          placeholder="Paste your link or confirmation ID here..."
                          className="w-full bg-background border border-border rounded-xl px-4 py-4 text-sm font-medium text-white focus:outline-none focus:border-primary transition-colors min-h-[120px] resize-none"
                        />
                        <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/10 rounded-xl">
                           <AlertCircle size={14} className="text-primary shrink-0 mt-0.5" />
                           <p className="text-[10px] text-primary/80 font-medium leading-relaxed">
                              Verification usually takes 12-24 hours. Ensure your proof is accurate to avoid rejection.
                           </p>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || !proof.trim()}
                        className="w-full py-4 rounded-xl bg-white text-black font-bold text-[11px] uppercase tracking-widest hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl flex items-center justify-center gap-3"
                      >
                        {submitting ? 'Submitting...' : 'Submit Execution Proof'}
                        {!submitting && <ArrowLeft className="rotate-180" size={16} />}
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
             </div>

             {/* Safety Note */}
             <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-surface border border-border">
                <Zap size={16} className="text-orange-500" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Rewards are settled atomically</span>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CampaignDetails;
