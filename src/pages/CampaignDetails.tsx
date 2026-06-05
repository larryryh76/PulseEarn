import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  TrendingUp,
  Clock,
  ArrowLeft,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  Target
} from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Task } from '../types';

const CampaignDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { submitTask, getTaskStatus } = useTasks();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proof, setProof] = useState('');

  useEffect(() => {
    const fetchTask = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'tasks', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setTask({ id: snap.id, ...snap.data() } as Task);
        } else {
          toast.error("Campaign not found");
          navigate('/tasks');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id, navigate]);

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
         <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    </MainLayout>
  );

  if (!task) return null;

  const { status } = getTaskStatus(task);
  const isLocked = task.minLevel && (userData?.level || 1) < task.minLevel;
  const isPending = status === 'pending';
  const isCompleted = status === 'completed';
  const isCooldown = status === 'cooldown';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isLocked || isCooldown || isCompleted || isPending) return;

    if (task.verificationType === 'proof' && !proof) {
       return toast.error("Please provide the required proof.");
    }

    setIsSubmitting(true);
    try {
      const result = await submitTask(task.id, proof);
      if (result.success) {
        if (task.verificationType === 'automated') {
          toast.success(`+${task.rewardAmount} PTS Secured`, { icon: '⚡' });
        } else {
          toast.success('Mission proof logged for audit');
        }
      } else {
        toast.error(result.error || 'Action failed');
      }
    } catch (err) {
      toast.error('System sync error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
        <Link to="/tasks" className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors mb-12 group text-xs font-bold uppercase tracking-widest">
           <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
           Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Info */}
          <div className="lg:col-span-8 space-y-12">
             <section className="relative rounded-[3rem] overflow-hidden border border-white/5 bg-white/[0.01]">
                <div className="aspect-[21/9] relative">
                   {task.campaignArtwork ? (
                      <img src={task.campaignArtwork} alt="" className="w-full h-full object-cover opacity-60" />
                   ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/30 to-background" />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                </div>
                <div className="p-8 md:p-12 -mt-20 relative">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-[1.25rem] bg-background border border-white/10 flex items-center justify-center shadow-2xl">
                         <Target size={32} className="text-primary" />
                      </div>
                      <div className="flex flex-col gap-1">
                         <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{task.title}</h1>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{task.category}</span>
                            <div className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">{task.platform}</span>
                         </div>
                      </div>
                   </div>

                   <p className="text-lg text-white/60 leading-relaxed font-medium mb-12">
                      {task.description}
                   </p>

                   <div className="space-y-8">
                      <div>
                         <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white mb-6 flex items-center gap-3">
                            <div className="w-6 h-px bg-primary" />
                            Mission Instructions
                         </h3>
                         <div className="prose prose-invert max-w-none">
                            <p className="text-text-secondary leading-loose">
                               {task.instructions}
                            </p>
                         </div>
                      </div>

                      {task.proofRequirements && (
                         <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5">
                            <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Proof Requirements</h4>
                            <p className="text-sm text-white/60 leading-relaxed font-medium">{task.proofRequirements}</p>
                         </div>
                      )}
                   </div>
                </div>
             </section>
          </div>

          {/* Sidebar - Actions & Stats */}
          <div className="lg:col-span-4 space-y-6">
             <div className="system-card space-y-8">
                <div className="space-y-6">
                   <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Base Reward</p>
                      <div className="flex items-center gap-2">
                         <Zap size={16} className="text-primary" />
                         <span className="text-xl font-mono font-bold">{task.rewardAmount.toLocaleString()} PTS</span>
                      </div>
                   </div>
                   <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Growth Bonus</p>
                      <div className="flex items-center gap-2">
                         <TrendingUp size={16} className="text-accent" />
                         <span className="text-xl font-mono font-bold">+{task.xpReward} XP</span>
                      </div>
                   </div>
                   <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Verification</p>
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-white/5 px-2 py-1 rounded">{task.verificationType}</span>
                   </div>
                </div>

                <div className="h-px bg-white/5" />

                <div className="space-y-4">
                   {isCompleted ? (
                      <div className="p-6 rounded-2xl bg-success/5 border border-success/10 text-center">
                         <CheckCircle2 size={32} className="text-success mx-auto mb-3" />
                         <p className="text-sm font-bold text-success uppercase tracking-widest">Campaign Completed</p>
                      </div>
                   ) : isPending ? (
                      <div className="p-6 rounded-2xl bg-warning/5 border border-warning/10 text-center">
                         <Clock size={32} className="text-warning mx-auto mb-3 animate-pulse" />
                         <p className="text-sm font-bold text-warning uppercase tracking-widest">Verification Pending</p>
                      </div>
                   ) : isLocked ? (
                      <div className="p-6 rounded-2xl bg-danger/5 border border-danger/10 text-center">
                         <Lock size={32} className="text-danger mx-auto mb-3" />
                         <p className="text-sm font-bold text-danger uppercase tracking-widest">Requires Level {task.minLevel}</p>
                      </div>
                   ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                         {task.actionUrl && (
                            <a
                              href={task.actionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-5 rounded-2xl bg-white text-black font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-white/90 transition-all shadow-xl"
                            >
                               Perform Action <ExternalLink size={14} />
                            </a>
                         )}

                         {task.verificationType === 'proof' && (
                            <div className="space-y-2">
                               <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">Submission Proof (URL)</label>
                               <input
                                 value={proof}
                                 onChange={e => setProof(e.target.value)}
                                 placeholder="https://imgur.com/..."
                                 className="w-full"
                                 required
                               />
                            </div>
                         )}

                         <button
                           type="submit"
                           disabled={isSubmitting}
                           className="w-full py-5 rounded-2xl bg-primary text-white font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                         >
                            {isSubmitting ? (
                               <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                               <>Complete Submission <ChevronRight size={14} /></>
                            )}
                         </button>
                      </form>
                   )}
                </div>
             </div>

             <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 flex flex-col items-center text-center">
                <AlertCircle size={24} className="text-white/20 mb-4" />
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Platform Notice</h4>
                <p className="text-[10px] text-white/20 leading-relaxed font-medium">
                   All submissions are subject to manual audit. Fraudulent activity will result in immediate account termination.
                </p>
             </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CampaignDetails;
