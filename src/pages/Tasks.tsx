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
  Layout,
  ArrowRight
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

        {/* PREMIUM HEADER */}
        <header className="mb-16">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <Layout size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Reward Center</span>
                 </div>
                 <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none italic">
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

        {/* ELEGANT LIST VIEW */}
        <div className="space-y-2">
           {view === 'AVAILABLE' ? (
              <>
                 {/* CHALLENGES (System Tasks) */}
                 {activeMissions.map((mission) => {
                    const isCompleted = mission.progress?.status === 'COMPLETED';
                    return (
                       <div
                         key={mission.id}
                         onClick={() => setSelectedMarketTask({ ...mission, type: 'CHALLENGE' })}
                         className={cn(
                           "group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                           isCompleted
                            ? "bg-primary/[0.04] border-primary/20 hover:bg-primary/[0.06]"
                            : "bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.1]"
                         )}
                       >
                          <div className="flex items-center gap-5 overflow-hidden">
                             <div className={cn(
                               "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all border",
                               isCompleted ? "bg-primary/20 border-primary/30" : "bg-white/[0.03] border-white/[0.05]"
                             )}>
                                <TaskIcon category={mission.definition.category} size={20} />
                             </div>
                             <div className="min-w-0">
                                <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-0.5">Global Challenge</p>
                                <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate">{mission.definition.title}</h3>
                             </div>
                          </div>

                          <div className="flex items-center gap-8 shrink-0 ml-4">
                             <div className="text-right hidden sm:block">
                                <div className="flex items-center gap-1.5 justify-end">
                                   <Zap size={10} className="text-primary" />
                                   <span className="text-xs font-mono font-bold text-white">+{mission.definition.rewardPoints}</span>
                                </div>
                                <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">PTS Available</p>
                             </div>
                             <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/10 group-hover:bg-white/10 group-hover:text-white transition-all">
                                <ChevronRight size={14} />
                             </div>
                          </div>
                       </div>
                    );
                 })}

                 {/* CAMPAIGN BANNERS */}
                 {activeCampaigns.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                       {activeCampaigns.map((camp) => (
                          <div
                            key={camp.id}
                            onClick={() => navigate(`/campaigns/${camp.id}`)}
                            className="group relative aspect-[16/9] rounded-[2rem] border border-white/5 overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5"
                          >
                             {camp.bannerUrl || camp.thumbnailUrl ? (
                                <img src={camp.bannerUrl || camp.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" alt="" />
                             ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                             )}
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 flex flex-col justify-end">
                                <div className="space-y-4">
                                   <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[8px] font-black text-primary uppercase tracking-widest">{camp.category}</span>
                                      <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Campaign</span>
                                   </div>
                                   <h3 className="text-xl font-bold text-white tracking-tight italic leading-none">{camp.name}</h3>
                                   <div className="flex items-center justify-between pt-2">
                                      <div className="flex items-center gap-1.5">
                                         <Zap size={10} className="text-primary" />
                                         <span className="text-xs font-mono font-bold text-white">+{(camp.totalPrizePool || 0).toLocaleString()}</span>
                                      </div>
                                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/40 group-hover:bg-white group-hover:text-black transition-all">
                                         <ArrowRight size={14} />
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}

                 {activeMissions.length > 0 && (
                    <div className="space-y-4">
                       <div className="flex items-center gap-3 px-2">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Challenges & Missions</h4>
                          <div className="h-px flex-1 bg-white/[0.03]" />
                       </div>

                       <div className="space-y-2">
                          {activeMissions.map((mission) => {
                             const isCompleted = mission.progress?.status === 'COMPLETED';
                             return (
                                <div
                                  key={mission.id}
                                  onClick={() => setSelectedMarketTask({ ...mission, type: 'CHALLENGE' })}
                                  className={cn(
                                    "group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                                    isCompleted
                                     ? "bg-primary/[0.04] border-primary/20 hover:bg-primary/[0.06]"
                                     : "bg-white/[0.01] border-white/[0.03] hover:bg-white/[0.03] hover:border-white/[0.1]"
                                  )}
                                >
                                   <div className="flex items-center gap-5 overflow-hidden">
                                      <div className={cn(
                                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all border",
                                        isCompleted ? "bg-primary/20 border-primary/30" : "bg-white/[0.03] border-white/[0.05]"
                                      )}>
                                         <TaskIcon category={mission.definition.category} size={20} />
                                      </div>
                                      <div className="min-w-0">
                                         <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-0.5">Global Challenge</p>
                                         <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate">{mission.definition.title}</h3>
                                      </div>
                                   </div>

                                   <div className="flex items-center gap-8 shrink-0 ml-4">
                                      <div className="text-right hidden sm:block">
                                         <div className="flex items-center gap-1.5 justify-end">
                                            <Zap size={10} className="text-primary" />
                                            <span className="text-xs font-mono font-bold text-white">+{mission.definition.rewardPoints}</span>
                                         </div>
                                         <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">PTS Available</p>
                                      </div>
                                      <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/10 group-hover:bg-white/10 group-hover:text-white transition-all">
                                         <ChevronRight size={14} />
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
                 {[...completedMissions, ...completedTasks.map(t => ({...t, type: 'TASK'}))].map((item: any, i) => (
                    <div
                      key={item.id || i}
                      className="flex items-center justify-between p-4 rounded-2xl border border-success/10 bg-success/[0.01] opacity-60"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                             <CheckCircle2 size={16} />
                          </div>
                          <div>
                             <h3 className="text-sm font-bold text-white uppercase tracking-tight">{item.definition?.title || item.title}</h3>
                             <p className="text-[8px] font-bold text-success uppercase tracking-widest">Verified & Settled</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-mono font-bold text-success">+{item.definition?.rewardPoints || item.rewardAmount} PTS</p>
                       </div>
                    </div>
                 ))}
              </>
           )}

           {/* EMPTY STATES */}
           {((view === 'AVAILABLE' && activeCampaigns.length === 0 && activeMissions.length === 0) || (view === 'COMPLETED' && completedTasks.length === 0 && completedMissions.length === 0)) && (
              <div className="py-32 text-center border border-dashed border-white/[0.03] rounded-[2rem] opacity-20">
                 <Search size={40} className="mx-auto mb-4" />
                 <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Activities Found</p>
              </div>
           )}
        </div>

        {/* PREMIUM TASK DETAIL PANEL */}
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
                          <div className="p-2 bg-primary/10 rounded-lg text-primary border border-primary/20">
                             <TaskIcon category={selectedTask.definition.category} size={18} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Activity Protocol</span>
                       </div>
                       <button onClick={() => setSelectedMarketTask(null)} className="p-2.5 hover:bg-white/[0.05] rounded-xl transition-all text-text-tertiary hover:text-white">
                          <X size={20} />
                       </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12">
                       <div className="space-y-6">
                          <div className="inline-flex px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                             <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{selectedTask.definition.category}</span>
                          </div>
                          <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tighter leading-[0.9] italic">{selectedTask.definition.title}</h2>
                          <p className="text-lg text-text-secondary font-medium leading-relaxed italic border-l-2 border-white/5 pl-6">{selectedTask.definition.description}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] space-y-2 group hover:bg-white/[0.04] transition-all">
                             <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Reward Value</p>
                             <div className="flex items-center gap-2">
                                <Zap size={16} className="text-primary" />
                                <p className="text-2xl font-mono font-bold text-white tracking-tight">+{selectedTask.definition.rewardPoints}</p>
                                <span className="text-[10px] font-bold text-primary uppercase">pts</span>
                             </div>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] space-y-2 group hover:bg-white/[0.04] transition-all">
                             <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Mastery Gain</p>
                             <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-success" />
                                <p className="text-2xl font-mono font-bold text-white tracking-tight">+{selectedTask.definition.rewardXp}</p>
                                <span className="text-[10px] font-bold text-success uppercase">xp</span>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Instructions</h4>
                             <div className="h-px flex-1 bg-white/[0.03] ml-6" />
                          </div>
                          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/[0.03] space-y-4">
                             <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 text-[10px] font-bold text-primary">1</div>
                                <p className="text-sm font-medium text-text-secondary leading-relaxed italic">
                                   {selectedTask.definition.category === 'WELCOME' && "Complete your profile registration to secure your starting bonus."}
                                   {selectedTask.definition.category === 'REFERRAL' && "Share your unique link and complete your first referral."}
                                   {selectedTask.definition.category === 'PREDICTION' && "Navigate to the Prediction tab and submit your first market forecast."}
                                   {selectedTask.definition.category === 'LEVEL' && `Increase your community rank to Level ${selectedTask.definition.targetValue} through consistent activity.`}
                                   {selectedTask.definition.category === 'CAMPAIGN' && "Complete campaign objectives to build your reputation."}
                                </p>
                             </div>
                          </div>
                       </div>

                       {selectedTask.progress && (
                          <div className="space-y-6">
                             <div className="flex justify-between items-end">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Execution Progress</h4>
                                <p className="text-sm font-mono font-bold text-white">{selectedTask.progress.progress} <span className="text-white/20">/</span> {selectedTask.progress.target}</p>
                             </div>
                             <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden">
                                <motion.div
                                   initial={{ width: 0 }}
                                   animate={{ width: `${Math.min((selectedTask.progress.progress / selectedTask.progress.target) * 100, 100)}%` }}
                                   className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                                />
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="p-10 border-t border-white/[0.05] bg-black/40 shrink-0">
                       {selectedTask.progress?.status === 'COMPLETED' ? (
                          <Button
                            className="w-full h-16 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-[0.4em] text-[11px] rounded-xl italic active:scale-[0.98]"
                            onClick={() => handleClaimMission(selectedTask.id)}
                            isLoading={claimingId === selectedTask.id}
                          >
                             Claim Reward
                          </Button>
                       ) : selectedTask.progress?.status === 'CLAIMED' ? (
                          <div className="h-16 flex items-center justify-center gap-3 text-success bg-success/5 border border-success/10 rounded-xl font-black uppercase tracking-[0.2em] text-[10px]">
                             <CheckCircle2 size={18} />
                             Complete & Verified
                          </div>
                       ) : (
                          <div className="group relative">
                             <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                             <button
                               onClick={() => {
                                 if(selectedTask.definition.category === 'PREDICTION') navigate('/predictions');
                                 if(selectedTask.definition.category === 'REFERRAL') navigate('/referrals');
                                 setSelectedMarketTask(null);
                               }}
                               className="relative w-full h-16 flex items-center justify-between px-8 text-white bg-white/[0.03] border border-white/[0.05] rounded-xl font-bold uppercase tracking-widest text-[11px] hover:bg-white/[0.05] transition-all group"
                             >
                                <span>Proceed to Objective</span>
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
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
