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
  ShieldCheck,
  Star,
  Award,
  Trophy,
  ChevronRight,
  Target,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { SystemTaskEngine } from '../engines/tasks/SystemTaskEngine';

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tasks, campaigns, systemTasks, loading, getTaskStatus } = useTasks();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'SPONSORED' | 'CHALLENGES'>('ALL');
  const [view, setView] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
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
      <div className="pt-32 px-6 max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-48 bg-white/5 rounded-lg animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

        {/* APP-STYLE HEADER */}
        <header className="mb-12">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-4">
                 <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary">Activity Feed</span>
                 </div>
                 <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none italic">
                    Tasks
                 </h1>
              </div>

              <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shrink-0">
                  <button
                    onClick={() => setView('ACTIVE')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'ACTIVE' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setView('HISTORY')}
                    className={cn(
                      "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'HISTORY' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    Completed
                  </button>
               </div>
           </div>

           {view === 'ACTIVE' && (
              <div className="mt-10 flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                 {(['ALL', 'SOCIAL', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'SPONSORED', 'CHALLENGES'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={cn(
                        "px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shrink-0",
                        filter === cat ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 border-white/10 text-text-tertiary hover:border-white/20 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                 ))}
              </div>
           )}
        </header>

        {/* COMPACT LIST VIEW */}
        <div className="space-y-2">
           {view === 'ACTIVE' ? (
              <>
                 {/* CHALLENGES (System Tasks) */}
                 {activeMissions.map((mission) => {
                    const isCompleted = mission.progress?.status === 'COMPLETED';
                    return (
                       <div
                         key={mission.id}
                         onClick={() => setSelectedMarketTask({ ...mission, type: 'CHALLENGE' })}
                         className={cn(
                           "group flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer",
                           isCompleted
                            ? "bg-primary/[0.03] border-primary/20 hover:bg-primary/[0.05]"
                            : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                         )}
                       >
                          <div className="flex items-center gap-5 overflow-hidden">
                             <div className={cn(
                               "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all border",
                               isCompleted ? "bg-primary text-white border-primary" : "bg-white/5 border-white/5 text-text-tertiary"
                             )}>
                                {mission.definition.category === 'WELCOME' && <Star size={20} />}
                                {mission.definition.category === 'REFERRAL' && <Award size={20} />}
                                {mission.definition.category === 'PREDICTION' && <TrendingUp size={20} />}
                                {mission.definition.category === 'LEVEL' && <Trophy size={20} />}
                                {mission.definition.category === 'CAMPAIGN' && <ShieldCheck size={20} />}
                             </div>
                             <div className="min-w-0">
                                <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5">Challenge</p>
                                <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate">{mission.definition.title}</h3>
                             </div>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 ml-4">
                             <div className="text-right hidden sm:block">
                                <div className="flex items-center gap-1.5 justify-end">
                                   <Zap size={12} className="text-primary" />
                                   <span className="text-xs font-mono font-bold text-white">+{mission.definition.rewardPoints}</span>
                                </div>
                                <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">PTS Reward</p>
                             </div>
                             <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all">
                                <ChevronRight size={16} />
                             </div>
                          </div>
                       </div>
                    );
                 })}

                 {/* CAMPAIGNS */}
                 {activeCampaigns.map((camp) => (
                    <div
                      key={camp.id}
                      onClick={() => navigate(`/campaigns/${camp.id}`)}
                      className="group flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-5 overflow-hidden">
                           <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 p-2 overflow-hidden">
                              {camp.thumbnailUrl ? (
                                 <img src={camp.thumbnailUrl} className="w-full h-full object-cover rounded-md" alt="" />
                              ) : (
                                 <Zap size={20} className="text-primary" />
                              )}
                           </div>
                           <div className="min-w-0">
                              <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">{camp.category}</p>
                              <h3 className="text-sm font-bold text-white uppercase tracking-tight truncate">{camp.name}</h3>
                           </div>
                        </div>

                        <div className="flex items-center gap-6 shrink-0 ml-4">
                           <div className="text-right hidden sm:block">
                              <div className="flex items-center gap-1.5 justify-end">
                                 <Zap size={12} className="text-primary" />
                                 <span className="text-xs font-mono font-bold text-white">+{(camp.totalPrizePool || 0).toLocaleString()}</span>
                              </div>
                              <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Pool Total</p>
                           </div>
                           <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white transition-all">
                                <ChevronRight size={16} />
                             </div>
                        </div>
                    </div>
                 ))}
              </>
           ) : (
              <>
                 {/* COMPLETED HISTORY */}
                 {[...completedMissions, ...completedTasks.map(t => ({...t, type: 'TASK'}))].map((item: any, i) => (
                    <div
                      key={item.id || i}
                      className="flex items-center justify-between p-5 rounded-2xl border border-success/10 bg-success/[0.01] opacity-60"
                    >
                       <div className="flex items-center gap-5">
                          <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                             <CheckCircle2 size={18} />
                          </div>
                          <div>
                             <h3 className="text-sm font-bold text-white uppercase tracking-tight">{item.definition?.title || item.title}</h3>
                             <p className="text-[9px] font-bold text-success uppercase tracking-widest">Authorized & Secured</p>
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
           {((view === 'ACTIVE' && activeCampaigns.length === 0 && activeMissions.length === 0) || (view === 'HISTORY' && completedTasks.length === 0 && completedMissions.length === 0)) && (
              <div className="py-32 text-center border border-dashed border-white/5 rounded-[2.5rem] opacity-30">
                 <Search size={48} className="mx-auto mb-6" />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero Activities Available</p>
              </div>
           )}
        </div>

        {/* TASK DETAILS SLIDE-OVER (Simulated as Modal for now) */}
        <AnimatePresence>
           {selectedTask && (
              <div className="fixed inset-0 z-[100] flex items-center justify-end">
                 <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-background/80 backdrop-blur-md"
                   onClick={() => setSelectedMarketTask(null)}
                 />
                 <motion.div
                   initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                   transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                   className="relative w-full max-w-xl h-full bg-surface-bright border-l border-white/5 shadow-2xl flex flex-col"
                 >
                    <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/20 rounded-lg text-primary"><Target size={18} /></div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Challenge Details</span>
                       </div>
                       <button onClick={() => setSelectedMarketTask(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                          <X size={20} />
                       </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 space-y-12">
                       <div className="space-y-6">
                          <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none italic">{selectedTask.definition.title}</h2>
                          <p className="text-lg text-text-secondary font-medium italic leading-relaxed">{selectedTask.definition.description}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-2">
                             <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Reward Value</p>
                             <div className="flex items-center gap-2">
                                <Zap size={14} className="text-primary" />
                                <p className="text-xl font-mono font-bold text-white">+{selectedTask.definition.rewardPoints} PTS</p>
                             </div>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-2">
                             <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Mastery XP</p>
                             <div className="flex items-center gap-2">
                                <TrendingUp size={14} className="text-accent" />
                                <p className="text-xl font-mono font-bold text-white">+{selectedTask.definition.rewardXp} XP</p>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Instructions</h4>
                          <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-4 font-medium text-text-secondary leading-relaxed italic text-sm">
                             {selectedTask.definition.category === 'WELCOME' && "Complete your profile registration to secure your starting bonus."}
                             {selectedTask.definition.category === 'REFERRAL' && "Share your unique link and authorize your first referral to the network."}
                             {selectedTask.definition.category === 'PREDICTION' && "Navigate to the Markets tab and authorize your first trajectory forecast."}
                             {selectedTask.definition.category === 'LEVEL' && `Increase your authorization rank to Level ${selectedTask.definition.targetValue} through consistent activity.`}
                             {selectedTask.definition.category === 'CAMPAIGN' && "Complete campaign objectives to establish network reputation."}
                          </div>
                       </div>

                       {selectedTask.progress && (
                          <div className="space-y-6">
                             <div className="flex justify-between items-end">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Progress</h4>
                                <p className="text-sm font-mono font-bold text-white">{selectedTask.progress.progress} / {selectedTask.progress.target}</p>
                             </div>
                             <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                   initial={{ width: 0 }}
                                   animate={{ width: `${Math.min((selectedTask.progress.progress / selectedTask.progress.target) * 100, 100)}%` }}
                                   className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                                />
                             </div>
                          </div>
                       )}
                    </div>

                    <div className="p-10 border-t border-white/5 bg-black/20 shrink-0">
                       {selectedTask.progress?.status === 'COMPLETED' ? (
                          <Button
                            className="w-full h-20 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-[0.4em] text-[13px] rounded-[1.5rem] italic"
                            onClick={() => handleClaimMission(selectedTask.id)}
                            isLoading={claimingId === selectedTask.id}
                          >
                             Claim Reward
                          </Button>
                       ) : selectedTask.progress?.status === 'CLAIMED' ? (
                          <div className="h-20 flex items-center justify-center gap-3 text-success bg-success/5 border border-success/10 rounded-[1.5rem] font-black uppercase tracking-[0.2em]">
                             <CheckCircle2 size={24} />
                             Authorized
                          </div>
                       ) : (
                          <div className="h-20 flex items-center justify-center text-text-tertiary bg-white/5 border border-white/5 rounded-[1.5rem] font-bold uppercase tracking-widest text-[11px]">
                             Awaiting Completion
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
