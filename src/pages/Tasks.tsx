import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  CheckCircle2,
  Search,
  TrendingUp,
  Award,
  Trophy,
  ChevronRight,
  Target,
  Sparkles,
  X,
  Share2,
  Calendar,
  Flame,
  ArrowRight,
  Shield,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { SystemTaskEngine } from '../engines/tasks/SystemTaskEngine';

const TaskIcon = ({ category, size = 20, className = "" }: { category: string, size?: number, className?: string }) => {
  switch (category) {
    case 'WELCOME': return <Sparkles size={size} className={cn("text-primary", className)} />;
    case 'REFERRAL': return <Share2 size={size} className={cn("text-blue-400", className)} />;
    case 'PREDICTION': return <TrendingUp size={size} className={cn("text-success", className)} />;
    case 'LEVEL': return <Trophy size={size} className={cn("text-warning", className)} />;
    case 'SOCIAL': return <Award size={size} className={cn("text-indigo-400", className)} />;
    case 'DAILY': return <Calendar size={size} className={cn("text-orange-400", className)} />;
    case 'STREAK': return <Flame size={size} className={cn("text-danger", className)} />;
    default: return <Target size={size} className={cn("text-primary", className)} />;
  }
};

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tasks, campaigns, systemTasks, loading, getTaskStatus } = useTasks();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'SPONSORED' | 'CHALLENGES'>('ALL');
  const [view, setView] = useState<'AVAILABLE' | 'COMPLETED'>('AVAILABLE');
  const [selectedTask, setSelectedMarketTask] = useState<any | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const activeCampaigns = campaigns.filter(c =>
    c.active && (filter === 'ALL' || c.category === filter as any)
  );

  const activeMissions = systemTasks.filter(m =>
    (filter === 'ALL' || filter === 'CHALLENGES') &&
    (!m.progress || m.progress.status !== 'CLAIMED')
  );

  const completedMissions = systemTasks.filter(m => m.progress?.status === 'CLAIMED');
  const completedTasks = tasks.filter(t => getTaskStatus(t).status === 'completed');

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
    <MainLayout>
      <div className="pt-32 px-6 max-w-5xl mx-auto space-y-8">
        <div className="h-10 w-48 bg-white/[0.03] rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-20 bg-white/[0.02] rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-32 px-6 max-w-5xl mx-auto">

        {/* HEADER */}
        <header className="mb-16">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <Shield size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Available Tasks</span>
                 </div>
                 <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none uppercase">
                    Tasks
                 </h1>
              </div>

              <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05] shrink-0">
                  <button
                    onClick={() => setView('AVAILABLE')}
                    className={cn(
                      "px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'AVAILABLE' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setView('COMPLETED')}
                    className={cn(
                      "px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'COMPLETED' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    History
                  </button>
               </div>
           </div>

           {view === 'AVAILABLE' && (
              <div className="mt-12 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                 {(['ALL', 'SOCIAL', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'SPONSORED', 'CHALLENGES'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                        filter === cat ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/[0.02] border-white/[0.05] text-text-tertiary hover:border-white/[0.1] hover:text-white"
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
                 {/* CAMPAIGN BANNERS */}
                 {activeCampaigns.length > 0 && (
                    <div className="space-y-6">
                       <div className="flex items-center gap-3 px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Featured</h4>
                          <div className="h-px flex-1 bg-white/[0.03]" />
                       </div>
                       <div className="grid grid-cols-1 gap-6 pb-12">
                          {activeCampaigns.map((camp) => (
                             <div
                               key={camp.id}
                               onClick={() => navigate(`/campaigns/${camp.id}`)}
                               className="group relative aspect-[16/6] md:aspect-[21/7] rounded-[2.5rem] border border-white/5 overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 bg-[#0A0A0F]"
                             >
                                {camp.bannerUrl || camp.thumbnailUrl ? (
                                   <img src={camp.bannerUrl || camp.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" alt="" />
                                ) : (
                                   <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-8 md:p-12 flex flex-col justify-end">
                                   <div className="space-y-4 max-w-2xl">
                                      <div className="flex items-center gap-3">
                                         <span className="px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/30 text-[9px] font-black text-primary uppercase tracking-widest">{camp.category}</span>
                                         {camp.featured && (
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-warning/10 border border-warning/30 text-[9px] font-black text-warning uppercase tracking-widest">
                                               <Star size={10} fill="currentColor" />
                                               Featured
                                            </div>
                                         )}
                                      </div>
                                      <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tighter leading-none uppercase">{camp.name}</h3>
                                      <div className="flex items-center gap-8 pt-4">
                                         <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-primary" />
                                            <span className="text-xs font-mono font-bold text-white">+{(camp.totalPrizePool || 0).toLocaleString()} <span className="text-primary text-[10px]">PTS</span></span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                            <Target size={14} className="text-success" />
                                            <span className="text-xs font-mono font-bold text-white">{camp.taskIds?.length || 0} <span className="text-success text-[10px]">Tasks</span></span>
                                         </div>
                                         <div className="hidden md:flex items-center gap-2 text-white/40">
                                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Start Now</span>
                                         </div>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}

                 {activeMissions.length > 0 && (
                    <div className="space-y-8">
                       <div className="flex items-center gap-3 px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Challenges</h4>
                          <div className="h-px flex-1 bg-white/[0.03]" />
                       </div>

                       <div className="grid grid-cols-1 gap-2">
                          {activeMissions.map((mission) => {
                             const isCompleted = mission.progress?.status === 'COMPLETED';
                             const progress = mission.progress?.progress || 0;
                             const target = mission.definition.targetValue;
                             const percent = Math.min((progress / target) * 100, 100);

                             return (
                                <div
                                  key={mission.id}
                                  onClick={() => setSelectedMarketTask({ ...mission, type: 'CHALLENGE' })}
                                  className={cn(
                                    "group p-1 rounded-2xl border transition-all cursor-pointer",
                                    isCompleted
                                     ? "bg-primary/[0.08] border-primary/20 hover:bg-primary/[0.12]"
                                     : "bg-[#0A0A0F] border-white/5 hover:bg-white/[0.02] hover:border-primary/20"
                                  )}
                                >
                                   <div className="flex items-center justify-between p-4 px-6">
                                      <div className="flex items-center gap-6 min-w-0">
                                         <div className={cn(
                                           "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-lg transition-all",
                                           isCompleted ? "bg-primary/20 border-primary/30 text-white" : "bg-white/[0.03] border-white/5 text-primary group-hover:border-primary/20"
                                         )}>
                                            <TaskIcon category={mission.definition.category} size={24} />
                                         </div>
                                         <div className="min-w-0 space-y-1">
                                            <h3 className="text-base font-bold text-white tracking-tight truncate group-hover:text-primary transition-colors uppercase leading-none">{mission.definition.title}</h3>
                                            <div className="flex items-center gap-4">
                                               <div className="flex items-center gap-1.5">
                                                  <Zap size={10} className="text-primary" />
                                                  <span className="text-[10px] font-mono font-bold text-text-secondary">+{mission.definition.rewardPoints} PTS</span>
                                               </div>
                                               <div className="flex items-center gap-1.5">
                                                  <TrendingUp size={10} className="text-success" />
                                                  <span className="text-[10px] font-mono font-bold text-text-secondary">+{mission.definition.rewardXp} XP</span>
                                               </div>
                                            </div>
                                         </div>
                                      </div>

                                      <div className="flex items-center gap-8 shrink-0 ml-4">
                                         <div className="hidden sm:flex flex-col items-end gap-1.5 w-32">
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{progress} / {target}</span>
                                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                               <motion.div
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${percent}%` }}
                                                  className="h-full bg-primary"
                                               />
                                            </div>
                                         </div>
                                         {isCompleted ? (
                                            <div className="px-6 py-2.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 animate-pulse">
                                               Claim
                                            </div>
                                         ) : (
                                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/10 group-hover:bg-primary group-hover:text-white transition-all">
                                               <ChevronRight size={18} />
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 )}
              </>
           ) : (
              <>
                 {/* COMPLETED HISTORY */}
                 <div className="space-y-3">
                   {[...completedMissions, ...completedTasks.map(t => ({...t, type: 'TASK'}))].map((item: any, i) => (
                      <div
                        key={item.id || i}
                        className="flex items-center justify-between p-5 px-8 rounded-2xl border border-success/10 bg-success/[0.01] opacity-70 group hover:opacity-100 transition-all"
                      >
                         <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                               <CheckCircle2 size={20} />
                            </div>
                            <div>
                               <h3 className="text-base font-bold text-white uppercase tracking-tight">{item.definition?.title || item.title}</h3>
                               <p className="text-[10px] font-black text-success uppercase tracking-widest mt-1">Completed</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-lg font-mono font-bold text-success">+{item.definition?.rewardPoints || item.rewardAmount} PTS</p>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{item.claimedAt?.toDate?.().toLocaleDateString() || 'Recently'}</p>
                         </div>
                      </div>
                   ))}
                 </div>
              </>
           )}

           {/* EMPTY STATES */}
           {((view === 'AVAILABLE' && activeCampaigns.length === 0 && activeMissions.length === 0) || (view === 'COMPLETED' && completedTasks.length === 0 && completedMissions.length === 0)) && (
              <div className="py-32 text-center border border-dashed border-white/[0.03] rounded-[3rem] opacity-20">
                 <Search size={48} className="mx-auto mb-6 text-white/10" />
                 <p className="text-[11px] font-black uppercase tracking-[0.5em]">No Objectives Detected</p>
              </div>
           )}
        </div>

        {/* TASK DETAIL PANEL */}
        <AnimatePresence>
           {selectedTask && (
              <div className="fixed inset-0 z-[100] flex items-center justify-end">
                 <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-black/80 backdrop-blur-md"
                   onClick={() => setSelectedMarketTask(null)}
                 />
                 <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 35, stiffness: 350 }}
                   className="relative w-full max-w-xl h-full bg-[#08080C] border-l border-white/[0.05] shadow-2xl flex flex-col"
                 >
                    {/* Panel Header */}
                    <div className="p-8 border-b border-white/[0.05] flex items-center justify-between shrink-0">
                       <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-lg shadow-primary/10">
                             <TaskIcon category={selectedTask.definition.category} size={20} />
                          </div>
                          <div>
                             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block">Challenge</span>
                             <span className="text-[8px] font-black text-primary uppercase tracking-widest">{selectedTask.definition.category}</span>
                          </div>
                       </div>
                       <button onClick={() => setSelectedMarketTask(null)} className="p-3 hover:bg-white/[0.05] rounded-2xl transition-all text-text-tertiary hover:text-white">
                          <X size={20} />
                       </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                       <div className="space-y-6">
                          <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tighter leading-[1] uppercase">{selectedTask.definition.title}</h2>
                          <p className="text-lg text-text-secondary font-medium leading-relaxed border-l-2 border-primary/20 pl-8">{selectedTask.definition.description}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] space-y-3 group hover:bg-white/[0.04] transition-all">
                             <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Reward</p>
                             <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-mono font-bold text-white tracking-tighter">+{selectedTask.definition.rewardPoints}</p>
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">pts</span>
                             </div>
                          </div>
                          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] space-y-3 group hover:bg-white/[0.04] transition-all">
                             <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Experience</p>
                             <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-mono font-bold text-white tracking-tighter">+{selectedTask.definition.rewardXp}</p>
                                <span className="text-[10px] font-black text-success uppercase tracking-widest">xp</span>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-8">
                          <div className="flex items-center justify-between">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Instructions</h4>
                             <div className="h-px flex-1 bg-white/[0.03] ml-6" />
                          </div>
                          <div className="p-8 rounded-[3rem] bg-black/40 border border-white/[0.03] space-y-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                                <Target size={120} />
                             </div>
                             <div className="flex gap-6 relative z-10">
                                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-black text-primary shadow-lg shadow-primary/5">01</div>
                                <div className="space-y-2">
                                   <p className="text-xs font-black text-white/40 uppercase tracking-widest">Objective</p>
                                   <p className="text-base font-medium text-text-secondary leading-relaxed">
                                      {selectedTask.definition.category === 'WELCOME' && "Secure your identity on the PulseEarn protocol to unlock basic rewards."}
                                      {selectedTask.definition.category === 'REFERRAL' && `Deploy your invitation link and successfully onboard ${selectedTask.definition.targetValue} new participants.`}
                                      {selectedTask.definition.category === 'PREDICTION' && `Execute ${selectedTask.definition.targetValue} successful market forecasts to demonstrate analytical proficiency.`}
                                      {selectedTask.definition.category === 'LEVEL' && `Acquire enough experience points through platform interaction to reach Rank ${selectedTask.definition.targetValue}.`}
                                      {selectedTask.definition.category === 'CAMPAIGN' && "Complete multiple campaign objectives to maximize your yield."}
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>

                       {selectedTask.progress && (
                          <div className="space-y-6">
                             <div className="flex justify-between items-end px-2">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Progress</h4>
                                <p className="text-sm font-mono font-bold text-white">{selectedTask.progress.progress} <span className="text-white/20">/</span> {selectedTask.progress.target}</p>
                             </div>
                             <div className="h-2 w-full bg-white/[0.03] rounded-full overflow-hidden p-0.5 border border-white/5">
                                <motion.div
                                   initial={{ width: 0 }}
                                   animate={{ width: `${Math.min((selectedTask.progress.progress / selectedTask.progress.target) * 100, 100)}%` }}
                                   className="h-full bg-gradient-to-r from-primary to-primary-bright rounded-full shadow-[0_0_15px_rgba(94,106,210,0.4)]"
                                />
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="p-10 border-t border-white/[0.05] bg-black/60 backdrop-blur-xl shrink-0">
                       {selectedTask.progress?.status === 'COMPLETED' ? (
                          <Button
                            className="w-full h-16 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-[0.4em] text-[11px] rounded-2xl active:scale-[0.98] shadow-2xl shadow-primary/20"
                            onClick={() => handleClaimMission(selectedTask.id)}
                            isLoading={claimingId === selectedTask.id}
                          >
                             Claim Reward
                          </Button>
                       ) : selectedTask.progress?.status === 'CLAIMED' ? (
                          <div className="h-16 flex items-center justify-center gap-4 text-success bg-success/5 border border-success/10 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px]">
                             <CheckCircle2 size={20} />
                             Reward Claimed
                          </div>
                       ) : (
                          <div className="group relative">
                             <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                             <button
                               onClick={() => {
                                 if(selectedTask.definition.category === 'PREDICTION') navigate('/predictions');
                                 if(selectedTask.definition.category === 'REFERRAL') navigate('/referrals');
                                 setSelectedMarketTask(null);
                               }}
                               className="relative w-full h-16 flex items-center justify-between px-10 text-white bg-white/[0.03] border border-white/[0.08] rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white/[0.06] transition-all group overflow-hidden"
                             >
                                <span className="relative z-10">Start Task</span>
                                <ArrowRight size={18} className="relative z-10 group-hover:translate-x-2 transition-transform duration-300 text-primary" />
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                             </button>
                          </div>
                       )}
                    </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>

      </div>
    </MainLayout>
  );
};

export default Tasks;
