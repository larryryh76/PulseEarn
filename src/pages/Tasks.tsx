import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  CheckCircle2,
  Search,
  TrendingUp,
  Award,
  Trophy,
  Target,
  Sparkles,
  X,
  Share2,
  Calendar,
  Flame,
  Shield,
  Clock,
  Star,
  ChevronRight,
  ArrowUpRight,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { SystemTaskEngine } from '../engines/tasks/SystemTaskEngine';
import { TaskEngine } from '../engines/tasks/TaskEngine';
import TaskDetailDrawer from '../components/TaskDetailDrawer';

const TaskIcon = ({ category, size = 20, className = "" }: { category: string, size?: number, className?: string }) => {
  switch (category) {
    case 'WELCOME': return <Sparkles size={size} className={cn("text-primary", className)} />;
    case 'REFERRAL': return <Share2 size={size} className={cn("text-blue-400", className)} />;
    case 'PREDICTION': return <TrendingUp size={size} className={cn("text-success", className)} />;
    case 'LEVEL': return <Trophy size={size} className={cn("text-warning", className)} />;
    case 'SOCIAL': return <Award size={size} className={cn("text-indigo-400", className)} />;
    case 'DAILY': return <Calendar size={size} className={cn("text-orange-400", className)} />;
    case 'STREAK': return <Flame size={size} className={cn("text-danger", className)} />;
    case 'EDUCATION': return <BookOpen size={size} className={cn("text-blue-500", className)} />;
    case 'EVENTS': return <Target size={size} className={cn("text-purple-400", className)} />;
    case 'SPONSORED': return <Zap size={size} className={cn("text-yellow-400", className)} />;
    default: return <Target size={size} className={cn("text-primary", className)} />;
  }
};

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { tasks, campaigns, systemTasks, subtasks, unifiedHistory, loading } = useTasks();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'SPONSORED' | 'CHALLENGES'>('ALL');
  const [view, setView] = useState<'AVAILABLE' | 'COMPLETED'>('AVAILABLE');

  useEffect(() => {
    if (location.state?.view) {
      setView(location.state.view);
    }
  }, [location.state]);
  const [selectedTask, setSelectedMarketTask] = useState<any | null>(null);
  const [selectedTaskProof, setSelectedTaskProof] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  useEffect(() => {
    if (location.state?.highlightId) {
       const mission = systemTasks.find(m => m.id === location.state.highlightId);
       if (mission) {
          if (mission.progress?.status === 'CLAIMED') {
             setSelectedHistoryItem({ ...mission, type: 'MISSION' });
             setView('COMPLETED');
          } else {
             setSelectedMarketTask({ ...mission, type: 'CHALLENGE' });
             setView('AVAILABLE');
          }
       }
    }

    // Support direct selection via navigation state (e.g., from Dashboard)
    if (location.state?.selectedTask) {
       setSelectedMarketTask({ ...location.state.selectedTask, type: 'TASK' });
    }
  }, [location.state, systemTasks]);

  const activeCampaigns = campaigns.filter(c =>
    c.active && (filter === 'ALL' || c.category === filter as any)
  );

  const activeMissions = systemTasks.filter(m =>
    (filter === 'ALL' || filter === 'CHALLENGES') &&
    (!m.progress || m.progress.status !== 'CLAIMED')
  );

  const availableStandaloneTasks = tasks.filter(t =>
    !t.campaignId &&
    (filter === 'ALL' || t.category === filter as any)
  );

  const handleClaimMission = async (taskId: string) => {
    if (!currentUser) return;
    setClaimingId(taskId);
    try {
      const result = await SystemTaskEngine.claimReward(currentUser.uid, taskId);
      if (result.success) {
        toast.success('Reward Claimed!', { icon: '🎁' });
        setSelectedMarketTask(null);
      } else {
        toast.error(result.error || 'Claim failed');
      }
    } catch (err) {
      toast.error('System error during claim');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return (
    <>
      <div className="pt-32 px-6 max-w-5xl mx-auto space-y-8">
        <div className="h-10 w-48 bg-surface-accent rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 bg-surface-bright rounded-xl animate-pulse" />)}
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="bg-background transition-colors duration-300">
      {/* HISTORY DETAIL MODAL */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedHistoryItem(null)}
               className="absolute inset-0 bg-background/90 backdrop-blur-xl"
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-lg bg-surface border border-border-bright rounded-[2rem] shadow-premium overflow-hidden flex flex-col"
             >
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-bright/50">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success shadow-lg">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary leading-none mb-1">Task Details</p>
                        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.15em]">SECURED</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedHistoryItem(null)} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                      <X size={18} />
                   </button>
                </div>

                <div className="p-8 space-y-8">
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-text-tertiary mb-1">
                         <Clock size={10} className="text-primary/40" />
                         <span className="text-[9px] font-bold uppercase tracking-widest">
                            {(selectedHistoryItem.resolvedAt || selectedHistoryItem.claimedAt)?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'RECENT'}
                         </span>
                         <span className="text-text-tertiary/50">•</span>
                         <CheckCircle2 size={10} className="text-success/40" />
                         <span className="text-[9px] font-bold uppercase tracking-widest text-success/60">Verified</span>
                      </div>
                      <h2 className="text-2xl font-bold text-text-primary tracking-tighter uppercase italic leading-tight">{selectedHistoryItem.taskTitle || selectedHistoryItem.title}</h2>
                   </div>

                   <div className="bg-surface-bright/50 border border-border rounded-2xl overflow-hidden divide-y divide-border">
                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Authorized Reward</span>
                         <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-bold text-success tabular-nums">+{ (selectedHistoryItem.rewardAmount || 0).toLocaleString()}</span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>

                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">System XP</span>
                         <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-bold text-primary tabular-nums">+{ (selectedHistoryItem.xpReward || 100).toLocaleString()}</span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">XP</span>
                         </div>
                      </div>

                      <div className="p-5 flex justify-between items-center bg-success/[0.01]">
                         <span className="text-[10px] font-black text-success/40 uppercase tracking-[0.2em]">Status</span>
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="text-[9px] font-black text-success uppercase tracking-widest italic">Approved</span>
                         </div>
                      </div>
                   </div>

                   <div className="pt-2 space-y-2">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[9px] font-black text-text-tertiary/50 uppercase tracking-[0.3em]">History ID</span>
                         <span className="text-[9px] font-mono text-text-tertiary truncate max-w-[140px]">{selectedHistoryItem.id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[9px] font-black text-text-tertiary/50 uppercase tracking-[0.3em]">Ledger TX</span>
                         <span className="text-[9px] font-mono text-text-tertiary truncate max-w-[140px]">{selectedHistoryItem.transactionReference || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                <div className="p-8 bg-background border-t border-border flex justify-center">
                   <p className="text-[9px] font-black text-text-tertiary/50 uppercase tracking-[0.6em]">PULSE REWARDS SYSTEM</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-24 md:pt-32 pb-24 md:pb-32 px-4 md:px-6 max-w-5xl mx-auto">

        {/* HEADER */}
        <header className="mb-12 md:mb-16">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <Shield size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary/50">Available Objectives</span>
                 </div>
                 <h1 className="text-4xl md:text-6xl font-bold text-text-primary tracking-tighter leading-none uppercase">
                    Quests
                 </h1>
              </div>

              <div className="flex bg-surface-bright p-1 rounded-xl border border-border shrink-0">
                  <button
                    onClick={() => setView('AVAILABLE')}
                    className={cn(
                      "px-6 md:px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'AVAILABLE' ? "bg-surface text-text-primary shadow-xl" : "text-text-tertiary hover:text-text-primary"
                    )}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setView('COMPLETED')}
                    className={cn(
                      "px-6 md:px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'COMPLETED' ? "bg-surface text-text-primary shadow-xl" : "text-text-tertiary hover:text-text-primary"
                    )}
                  >
                    History
                  </button>
               </div>
           </div>

           {view === 'AVAILABLE' && (
              <div className="mt-8 md:mt-12 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                 {(['ALL', 'SOCIAL', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'SPONSORED', 'CHALLENGES'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                        filter === cat ? "bg-primary/10 border-primary/30 text-primary" : "bg-surface-bright border-border text-text-tertiary hover:border-text-tertiary hover:text-text-primary"
                      )}
                    >
                      {cat}
                    </button>
                 ))}
              </div>
           )}
        </header>

        {/* LIST VIEW */}
        <div className="space-y-12">
           {view === 'AVAILABLE' ? (
              <>
                 {/* CAMPAIGN CARDS */}
                 {activeCampaigns.length > 0 && (filter === 'ALL' || activeCampaigns.some(c => c.category === filter as any)) && (
                    <div className="space-y-6">
                       <div className="flex items-center gap-3 px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Active Campaigns</h4>
                          <div className="h-px flex-1 bg-border" />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {activeCampaigns.map((camp) => (
                             <div
                               key={camp.id}
                               onClick={() => navigate(`/campaigns/${camp.id}`)}
                               className="group relative h-[240px] rounded-[2rem] border border-border overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 bg-surface"
                             >
                                {camp.bannerUrl || camp.thumbnailUrl ? (
                                   <img src={camp.bannerUrl || camp.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-1000 grayscale-[50%] group-hover:grayscale-0" alt="" />
                                ) : (
                                   <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent p-8 flex flex-col justify-end">
                                   <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                         <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest">{camp.category}</span>
                                         {camp.featured && <Star size={10} className="text-warning" fill="currentColor" />}
                                      </div>
                                      <h3 className="text-2xl font-bold text-text-primary tracking-tighter uppercase italic">{camp.name}</h3>
                                      <div className="flex items-center gap-6 pt-2">
                                         <div className="flex items-center gap-2">
                                            <Zap size={12} className="text-primary" />
                                            <span className="text-xs font-mono font-bold text-text-primary">+{ (camp.totalPrizePool || 0).toLocaleString() }</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <Target size={12} className="text-success" />
                                            <span className="text-xs font-mono font-bold text-text-primary">
                                               {tasks.filter(t => t.campaignId === camp.id).length}
                                            </span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <CheckCircle2 size={12} className="text-indigo-400" />
                                            <span className="text-xs font-mono font-bold text-text-primary">
                                               {subtasks.filter((s: any) => s.validationState === 'APPROVED' && s.campaignId === camp.id).length}
                                            </span>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {/* SPONSORED PLACEHOLDER (PREPARED FOR FUTURE ADS) */}
                 {filter === 'SPONSORED' && availableStandaloneTasks.length === 0 && (
                    <div className="py-24 text-center border border-dashed border-border rounded-[2rem] opacity-20">
                       <Zap size={32} className="mx-auto mb-4 text-text-tertiary/50" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Premium Offers Coming Soon</p>
                    </div>
                 )}

                 {/* STANDALONE TASKS */}
                 {availableStandaloneTasks.length > 0 && (
                    <div className="space-y-6">
                       <div className="flex items-center gap-3 px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Community Quests</h4>
                          <div className="h-px flex-1 bg-border" />
                       </div>
                       <div className="grid grid-cols-1 gap-3">
                          {availableStandaloneTasks.map((task) => {
                             return (
                                <div
                                  key={task.id}
                                  onClick={() => setSelectedMarketTask({ ...task, type: 'TASK' })}
                                  className="group p-5 rounded-2xl bg-surface border border-border hover:border-primary/20 transition-all cursor-pointer flex items-center justify-between"
                                >
                                   <div className="flex items-center gap-5 min-w-0">
                                      <div className="w-12 h-12 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary shrink-0">
                                         <TaskIcon category={task.category} size={20} />
                                      </div>
                                      <div className="min-w-0">
                                         <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight italic truncate group-hover:text-primary transition-colors">
                                            {task.title}
                                         </h3>
                                         <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1">
                                               <Zap size={10} className="text-primary" />
                                               <span className="text-[10px] font-mono font-bold text-text-secondary">+{task.rewardAmount}</span>
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-border" />
                                            <span className="text-[8px] font-black text-text-tertiary uppercase tracking-widest">{task.verificationType}</span>
                                         </div>
                                      </div>
                                   </div>
                                   <ChevronRight size={16} className="text-text-tertiary/50 group-hover:text-primary transition-colors" />
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 )}

                 {activeMissions.length > 0 && (filter === 'ALL' || filter === 'CHALLENGES') && (
                    <div className="space-y-6">
                       <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Daily Objectives</h4>
                             <div className="h-px w-24 bg-border" />
                          </div>
                       </div>

                       <div className="space-y-2">
                          {activeMissions.map((mission) => {
                             const isCompleted = mission.progress?.status === 'COMPLETED';
                             const progress = mission.progress?.progress || 0;
                             const target = mission.definition.targetValue;
                             const percent = Math.min((progress / target) * 100, 100);

                             return (
                                <motion.div
                                  key={mission.id}
                                  whileHover={{ x: 4 }}
                                  onClick={() => setSelectedMarketTask({ ...mission, type: 'CHALLENGE' })}
                                  className={cn(
                                    "p-5 rounded-2xl bg-surface border transition-all cursor-pointer flex items-center justify-between group",
                                    isCompleted ? "border-primary/40 bg-primary/[0.02]" : "border-border hover:border-border-bright"
                                  )}
                                >
                                   <div className="flex items-center gap-5 min-w-0">
                                      <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-all shrink-0",
                                        isCompleted ? "bg-primary/20 border-primary/30 text-text-primary" : "bg-surface-bright border-border text-text-tertiary group-hover:text-text-primary"
                                      )}>
                                         <TaskIcon category={mission.definition.category} size={20} />
                                      </div>
                                      <div className="min-w-0">
                                         <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight italic truncate group-hover:text-primary transition-colors">
                                            {mission.definition.title}
                                         </h3>
                                         <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1">
                                               <Zap size={10} className="text-primary" />
                                               <span className="text-[10px] font-mono font-bold text-text-primary">+{mission.definition.rewardPoints.toLocaleString()}</span>
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-border" />
                                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{Math.round(percent)}% Complete</span>
                                         </div>
                                      </div>
                                   </div>

                                   <div className="flex items-center gap-4">
                                      {isCompleted ? (
                                         <div className="px-4 py-1.5 rounded-lg bg-primary text-text-primary text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 animate-pulse italic">
                                            Claim
                                         </div>
                                      ) : (
                                         <ChevronRight size={16} className="text-text-tertiary/50 group-hover:text-primary transition-colors" />
                                      )}
                                   </div>
                                </motion.div>
                             );
                          })}
                       </div>
                    </div>
                 )}
              </>
           ) : (
              <>
                 {/* COMPLETED HISTORY */}
                 <div className="grid grid-cols-1 gap-3">
                   {unifiedHistory.map((item: any, i) => (
                      <div
                        key={item.id || i}
                        onClick={() => setSelectedHistoryItem(item)}
                        className="flex items-center justify-between p-4 px-6 rounded-xl border border-success/10 bg-success/[0.01] group hover:bg-success/[0.02] cursor-pointer transition-all shadow-lg"
                      >
                         <div className="flex items-center gap-5">
                            <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success shadow-inner">
                               <CheckCircle2 size={18} />
                            </div>
                            <div>
                               <h3 className="text-sm font-bold text-text-primary uppercase tracking-tight italic group-hover:text-success transition-colors">{item.taskTitle}</h3>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black text-success uppercase tracking-widest">{ (item.category as any) === 'WELCOME' || (item.category as any) === 'LEVEL' ? 'Achievement' : 'Quest'}</span>
                                  <div className="w-1 h-1 rounded-full bg-success/20" />
                                  <span className="text-[9px] font-mono text-text-tertiary">{(item.resolvedAt?.toDate?.() || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-base font-mono font-bold text-success">+{ item.rewardAmount?.toLocaleString()} PTS</p>
                            <p className="text-[8px] font-black text-text-tertiary/50 uppercase tracking-widest">Permanent Record</p>
                         </div>
                      </div>
                   ))}
                 </div>
              </>
           )}

           {/* EMPTY STATES */}
           {((view === 'AVAILABLE' && activeCampaigns.length === 0 && activeMissions.length === 0 && availableStandaloneTasks.length === 0) || (view === 'COMPLETED' && unifiedHistory.length === 0)) && (
              <div className="py-32 text-center border border-dashed border-border rounded-[3rem] opacity-20">
                 <Search size={48} className="mx-auto mb-6 text-text-tertiary/50" />
                 <p className="text-[11px] font-black uppercase tracking-[0.5em]">No Objectives Detected</p>
              </div>
           )}
        </div>

        {/* REFINED TASK DETAIL DRAWER */}
        <TaskDetailDrawer
           isOpen={!!selectedTask && selectedTask.type !== 'CHALLENGE'}
           onClose={() => setSelectedMarketTask(null)}
           task={selectedTask}
           claim={selectedTask ? subtasks.find((s: any) => s.taskId === selectedTask.id) : undefined}
           onAction={async () => {
              setIsSubmittingTask(true);
              try {
                const result = await TaskEngine.attemptTask({
                   userId: currentUser!.uid,
                   taskId: selectedTask!.id,
                   proof: selectedTaskProof
                });
                if (result.success) {
                   toast.success('Sequence Initiated: Under Review', { icon: '⏳' });
                   setSelectedMarketTask(null);
                   setSelectedTaskProof('');
                } else {
                   toast.error(result.error || 'Execution Failure');
                }
              } finally {
                setIsSubmittingTask(false);
              }
           }}
           isSubmitting={isSubmittingTask}
           proofValue={selectedTaskProof}
           setProofValue={setSelectedTaskProof}
        />

        {/* SYSTEM CHALLENGE OVERLAY */}
        <AnimatePresence>
           {selectedTask && selectedTask.type === 'CHALLENGE' && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                 <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                   onClick={() => setSelectedMarketTask(null)}
                 />
                 <motion.div
                   initial={{ scale: 0.98, opacity: 0, y: 20 }}
                   animate={{ scale: 1, opacity: 1, y: 0 }}
                   exit={{ scale: 0.98, opacity: 0, y: 20 }}
                   className="relative w-full max-w-lg bg-surface border border-border-bright rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
                 >
                    <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-surface-bright/50">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl text-primary border border-primary/20 flex items-center justify-center">
                             <TaskIcon category={selectedTask.definition.category} size={20} />
                          </div>
                          <div>
                             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary leading-none mb-1">Challenge</p>
                             <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.15em]">{selectedTask.definition.category}</h3>
                          </div>
                       </div>
                       <button onClick={() => setSelectedMarketTask(null)} className="w-10 h-10 hover:bg-surface-bright rounded-xl transition-all text-text-tertiary flex items-center justify-center">
                          <X size={18} />
                       </button>
                    </div>

                    <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
                       <div className="space-y-4">
                          <h2 className="text-2xl font-bold text-text-primary tracking-tight uppercase italic leading-tight">{selectedTask.definition.title}</h2>
                          <p className="text-sm text-text-secondary font-medium leading-relaxed opacity-70 italic border-l-2 border-primary/20 pl-6">
                             {selectedTask.definition.description || 'Complete this objective to earn rewards.'}
                          </p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-5 rounded-2xl bg-surface-bright/50 border border-border space-y-1.5">
                             <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">Authorized Reward</p>
                             <div className="flex items-baseline gap-1.5">
                                <p className="text-xl font-mono font-bold text-text-primary">+{selectedTask.definition.rewardPoints.toLocaleString()}</p>
                                <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">pts</span>
                             </div>
                          </div>
                          <div className="p-5 rounded-2xl bg-surface-bright/50 border border-border space-y-1.5">
                             <p className="text-[9px] font-black text-text-tertiary uppercase tracking-[0.2em]">System XP</p>
                             <div className="flex items-baseline gap-1.5">
                                <p className="text-xl font-mono font-bold text-primary">+{selectedTask.definition.rewardXp.toLocaleString()}</p>
                                <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">xp</span>
                             </div>
                          </div>
                       </div>

                       {selectedTask.progress && (
                          <div className="space-y-4">
                             <div className="flex justify-between items-end px-1">
                                <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Goal Progress</h4>
                                <p className="text-xs font-mono font-bold text-text-primary">{selectedTask.progress.progress} / {selectedTask.progress.target}</p>
                             </div>
                             <div className="h-1.5 w-full bg-surface-bright rounded-full overflow-hidden">
                                <motion.div
                                   initial={{ width: 0 }}
                                   animate={{ width: `${Math.min((selectedTask.progress.progress / selectedTask.progress.target) * 100, 100)}%` }}
                                   className="h-full bg-primary shadow-[0_0_10px_rgba(0,112,255,0.4)]"
                                />
                             </div>
                          </div>
                       )}

                       <div className="space-y-3 pt-4">
                          {selectedTask.progress?.status === 'COMPLETED' ? (
                             <Button
                               className="w-full h-14 bg-text-primary text-background hover:bg-primary hover:text-text-primary transition-all font-black uppercase tracking-[0.3em] text-[10px] rounded-2xl shadow-xl"
                               onClick={() => handleClaimMission(selectedTask.id)}
                               isLoading={claimingId === selectedTask.id}
                             >
                                Claim Reward
                             </Button>
                          ) : selectedTask.progress?.status === 'CLAIMED' ? (
                             <div className="h-14 flex items-center justify-center gap-3 text-success bg-success/5 border border-success/10 rounded-2xl font-black uppercase tracking-[0.2em] text-[9px]">
                                <CheckCircle2 size={16} />
                                Reward Claimed
                             </div>
                          ) : (
                             <Button
                               onClick={() => {
                                 if(selectedTask.definition.category === 'PREDICTION') navigate('/predictions');
                                 else if(selectedTask.definition.category === 'REFERRAL') navigate('/referrals');
                                 else navigate('/tasks');
                                 setSelectedMarketTask(null);
                               }}
                               className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] group italic shadow-xl"
                             >
                                Initialize Quest <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                             </Button>
                          )}
                       </div>
                    </div>

                    <div className="p-8 bg-background border-t border-border flex justify-center">
                       <p className="text-[9px] font-black text-text-tertiary/50 uppercase tracking-[0.6em]">PULSE REWARDS SYSTEM</p>
                    </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>
      </div>
      </div>
    </>
  );
};

export default Tasks;
