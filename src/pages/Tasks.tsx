import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Target,
  Sparkles,
  Clock,
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
  const location = useLocation();
  const { currentUser } = useAuth();
  const { tasks, campaigns, systemTasks, loading, getTaskStatus } = useTasks();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'SPONSORED' | 'CHALLENGES'>('ALL');
  const [view, setView] = useState<'AVAILABLE' | 'COMPLETED'>('AVAILABLE');

  useEffect(() => {
    if (location.state?.view) {
      setView(location.state.view);
    }
  }, [location.state]);
  const [selectedTask, setSelectedMarketTask] = useState<any | null>(null);
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
  }, [location.state, systemTasks]);

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
      {/* HISTORY DETAIL MODAL */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedHistoryItem(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl"
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-lg bg-[#08080C] border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
             >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success shadow-lg">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 leading-none mb-1">Quest Ledger</p>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em]">COMPLETED OBJECTIVE</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedHistoryItem(null)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-text-tertiary">
                      <X size={18} />
                   </button>
                </div>

                <div className="p-8 space-y-8">
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 text-text-tertiary mb-2">
                         <Calendar size={12} className="text-primary/40" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{selectedHistoryItem.claimedAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'RECENT'}</span>
                         <span className="text-white/10">•</span>
                         <Clock size={12} className="text-primary/40" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Verified</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight uppercase italic leading-tight">{selectedHistoryItem.definition?.title || selectedHistoryItem.title}</h2>
                   </div>

                   <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Authorized Reward</span>
                         <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-bold text-success tabular-nums">+{ (selectedHistoryItem.definition?.rewardPoints || selectedHistoryItem.rewardAmount || 0).toLocaleString()}</span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>

                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">System XP</span>
                         <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-bold text-primary tabular-nums">+{ (selectedHistoryItem.definition?.rewardXp || selectedHistoryItem.xpReward || 100).toLocaleString()}</span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">XP</span>
                         </div>
                      </div>

                      <div className="p-5 flex justify-between items-center bg-success/[0.01]">
                         <span className="text-[10px] font-black text-success/40 uppercase tracking-[0.2em]">Ledger Status</span>
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="text-[9px] font-black text-success uppercase tracking-widest italic">Immutable Proof</span>
                         </div>
                      </div>
                   </div>

                   <div className="pt-4">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">Network Hash</span>
                         <span className="text-[9px] font-mono text-white/20 truncate max-w-[140px]">{selectedHistoryItem.id || 'N/A'}</span>
                      </div>
                   </div>
                </div>

                <div className="p-8 bg-black border-t border-white/5 flex justify-center">
                   <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.6em]">PulseEarn Secure Ledger • Protocol V6.0</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    Quest Hub
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
                       <div className="grid grid-cols-1 gap-8 pb-12">
                          {activeCampaigns.map((camp) => (
                             <div
                               key={camp.id}
                               onClick={() => navigate(`/campaigns/${camp.id}`)}
                               className="group relative h-[300px] md:h-[400px] rounded-[3rem] border border-white/5 overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 bg-[#0A0A0F]"
                             >
                                {camp.bannerUrl || camp.thumbnailUrl ? (
                                   <img src={camp.bannerUrl || camp.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000 grayscale-[50%] group-hover:grayscale-0" alt="" />
                                ) : (
                                   <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-10 md:p-16 flex flex-col justify-end">
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
                                      <h3 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-[0.9] uppercase italic">{camp.name}</h3>
                                      <p className="text-white/40 text-sm md:text-lg font-medium line-clamp-2 max-w-2xl">{camp.description}</p>
                                      <div className="flex items-center gap-10 pt-6">
                                         <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Allocation</span>
                                            <div className="flex items-center gap-2">
                                               <Zap size={14} className="text-primary" />
                                               <span className="text-sm font-mono font-bold text-white">+{(camp.totalPrizePool || 0).toLocaleString()} <span className="text-primary text-[10px]">PTS</span></span>
                                            </div>
                                         </div>
                                         <div className="flex flex-col gap-1">
                                            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Objectives</span>
                                            <div className="flex items-center gap-2">
                                               <Target size={14} className="text-success" />
                                               <span className="text-sm font-mono font-bold text-white">{camp.taskIds?.length || 0}</span>
                                            </div>
                                         </div>
                                         <div className="ml-auto hidden md:flex items-center gap-4 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary hover:text-white transition-all shadow-2xl">
                                            Start Quest
                                            <ArrowRight size={14} />
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
                    <div className="space-y-10">
                       <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                             <h4 className="text-xl font-bold tracking-tight text-white italic">Challenges</h4>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{activeMissions.length} ACTIVE NODES</span>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                          {activeMissions.map((mission) => {
                             const isCompleted = mission.progress?.status === 'COMPLETED';
                             const progress = mission.progress?.progress || 0;
                             const target = mission.definition.targetValue;
                             const percent = Math.min((progress / target) * 100, 100);

                             return (
                                <motion.div
                                  key={mission.id}
                                  whileHover={{ y: -5 }}
                                  onClick={() => setSelectedMarketTask({ ...mission, type: 'CHALLENGE' })}
                                  className={cn(
                                    "p-8 rounded-[2.5rem] bg-[#0A0A0F] border transition-all cursor-pointer flex flex-col justify-between group min-h-[300px] shadow-2xl",
                                    isCompleted ? "border-primary/40 bg-primary/[0.02]" : "border-white/5 hover:border-white/20"
                                  )}
                                >
                                   <div className="space-y-6">
                                      <div className="flex justify-between items-start">
                                         <div className={cn(
                                           "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all",
                                           isCompleted ? "bg-primary/20 border-primary/30 text-white" : "bg-white/[0.03] border-white/5 text-text-tertiary group-hover:text-white"
                                         )}>
                                            <TaskIcon category={mission.definition.category} size={28} />
                                         </div>
                                         <div className="text-right">
                                            <div className="flex items-center gap-1.5 justify-end">
                                               <Zap size={12} className="text-primary" />
                                               <span className="text-xl font-mono font-bold text-white">+{mission.definition.rewardPoints.toLocaleString()}</span>
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Authorized Reward</p>
                                         </div>
                                      </div>

                                      <div className="space-y-3">
                                         <div className="flex items-center gap-2 mb-1">
                                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                            <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{mission.definition.category}</p>
                                         </div>
                                         <h3 className="text-2xl font-bold text-white tracking-tighter leading-tight line-clamp-1 group-hover:text-primary transition-colors italic">
                                            {mission.definition.title}
                                         </h3>
                                         <p className="text-sm text-text-tertiary font-medium line-clamp-2 leading-relaxed opacity-60 italic">
                                            {mission.definition.description || 'Secure this objective to claim your contribution rewards.'}
                                         </p>
                                      </div>
                                   </div>

                                   <div className="pt-8 flex items-center justify-between border-t border-white/5 mt-auto">
                                      <div className="flex flex-col gap-2 flex-1 max-w-[140px]">
                                         <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                            <motion.div
                                               initial={{ width: 0 }}
                                               animate={{ width: `${percent}%` }}
                                               className={cn("h-full rounded-full transition-all duration-1000", isCompleted ? "bg-success" : "bg-primary")}
                                            />
                                         </div>
                                         <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{Math.round(percent)}% Protocol Sync</span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                         {isCompleted ? (
                                            <div className="px-6 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 animate-pulse italic">
                                               Secure
                                            </div>
                                         ) : (
                                            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center text-white/10 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                               <ArrowRight size={18} />
                                            </div>
                                         )}
                                      </div>
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
                   {[...completedMissions, ...completedTasks.map(t => ({...t, type: 'TASK'}))].map((item: any, i) => (
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
                               <h3 className="text-sm font-bold text-white uppercase tracking-tight italic group-hover:text-success transition-colors">{item.definition?.title || item.title}</h3>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-black text-success uppercase tracking-widest">Protocol Secured</span>
                                  <div className="w-1 h-1 rounded-full bg-success/20" />
                                  <span className="text-[9px] font-mono text-white/20">{item.claimedAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'RECENT'}</span>
                               </div>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-base font-mono font-bold text-success">+{item.definition?.rewardPoints || item.rewardAmount} PTS</p>
                            <p className="text-[8px] font-black text-white/10 uppercase tracking-widest">Permanent Ledger</p>
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
                   className="relative w-full max-w-lg h-full bg-[#08080C] border-l border-white/[0.05] shadow-2xl flex flex-col"
                 >
                    {/* Panel Header */}
                    <div className="p-6 border-b border-white/[0.05] flex items-center justify-between shrink-0">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-xl text-primary border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                             <TaskIcon category={selectedTask.definition.category} size={18} />
                          </div>
                          <div>
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 block leading-none mb-1">Challenge</span>
                             <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none">{selectedTask.definition.category}</span>
                          </div>
                       </div>
                       <button onClick={() => setSelectedMarketTask(null)} className="w-10 h-10 hover:bg-white/[0.05] rounded-xl transition-all text-text-tertiary hover:text-white flex items-center justify-center">
                          <X size={18} />
                       </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10">
                       <div className="space-y-4">
                          <h2 className="text-3xl font-bold text-white tracking-tighter leading-tight uppercase italic">{selectedTask.definition.title}</h2>
                          <p className="text-sm text-text-secondary font-medium leading-relaxed border-l-2 border-primary/20 pl-6 italic">{selectedTask.definition.description}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2 group hover:bg-white/[0.04] transition-all">
                             <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Yield</p>
                             <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl font-mono font-bold text-white tracking-tighter">+{selectedTask.definition.rewardPoints.toLocaleString()}</p>
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">pts</span>
                             </div>
                          </div>
                          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2 group hover:bg-white/[0.04] transition-all">
                             <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Growth</p>
                             <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl font-mono font-bold text-white tracking-tighter">+{selectedTask.definition.rewardXp.toLocaleString()}</p>
                                <span className="text-[9px] font-black text-success uppercase tracking-widest">xp</span>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Instructions</h4>
                             <div className="h-px flex-1 bg-white/[0.03] ml-4" />
                          </div>
                          <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.03] space-y-5 relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-6 opacity-[0.01]">
                                <Target size={100} />
                             </div>
                             <div className="flex gap-4 relative z-10">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-[10px] font-black text-primary">01</div>
                                <div className="space-y-1.5">
                                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Primary Objective</p>
                                   <p className="text-sm font-medium text-text-secondary leading-relaxed">
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
