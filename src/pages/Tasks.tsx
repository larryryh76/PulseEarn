import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  History,
  LayoutGrid,
  Filter,
  TrendingUp,
  ShieldCheck,
  Star,
  Award,
  Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { SystemTaskEngine } from '../engines/tasks/SystemTaskEngine';

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tasks, campaigns, systemTasks, loading, getTaskStatus } = useTasks();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'SPONSORED' | 'CHALLENGES'>('ALL');
  const [view, setView] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const activeCampaigns = campaigns.filter(c =>
    c.active && (filter === 'ALL' || c.category === filter as any)
  );

  const activeMissions = systemTasks.filter(m =>
    (filter === 'ALL' || filter === 'CHALLENGES') &&
    (!m.progress || m.progress.status !== 'CLAIMED')
  );

  const completedMissions = systemTasks.filter(m => m.progress?.status === 'CLAIMED');

  const completedTasks = tasks.filter(t => {
    const { status } = getTaskStatus(t);
    return status === 'completed';
  });

  const handleClaimMission = async (taskId: string) => {
    if (!currentUser) return;
    setClaimingId(taskId);
    try {
      const result = await SystemTaskEngine.claimReward(currentUser.uid, taskId);
      if (result.success) {
        toast.success('Reward Authorized', { icon: '🎁' });
      } else {
        toast.error(result.error || 'Authorization failed');
      }
    } catch (err) {
      toast.error('System processing error');
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto space-y-12">
        <div className="h-20 w-full bg-surface border border-border rounded-[2rem] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-80 bg-surface border border-border rounded-[2rem] animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* OPERATIONAL HEADER */}
        <header className="mb-16">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Rewards Infrastructure</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Unified <span className="text-text-tertiary">Marketplace</span>
              </h1>
              <p className="text-text-secondary max-w-xl font-medium">
                Complete verified objectives and system challenges to authorize reward distribution across the network.
              </p>
            </motion.div>

            <div className="flex flex-wrap items-center gap-4">
               <div className="flex bg-surface-bright border border-border p-1.5 rounded-2xl shadow-subtle">
                  <button
                    onClick={() => setView('ACTIVE')}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'ACTIVE' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    <LayoutGrid size={14} />
                    Available
                  </button>
                  <button
                    onClick={() => setView('HISTORY')}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'HISTORY' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    <History size={14} />
                    Secured
                  </button>
               </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {view === 'ACTIVE' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-12 flex flex-wrap items-center gap-3 p-1.5 bg-surface/50 border border-border rounded-[1.5rem] overflow-hidden backdrop-blur-sm"
              >
                <div className="px-4 border-r border-border flex items-center gap-2 text-text-tertiary">
                  <Filter size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Filter By</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
                  {(['ALL', 'SOCIAL', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'SPONSORED', 'CHALLENGES'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all whitespace-nowrap",
                        filter === cat ? "bg-surface-bright text-white shadow-sm border border-white/10" : "text-text-tertiary hover:text-white hover:bg-white/5"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* UNIFIED GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {view === 'ACTIVE' ? (
            <>
              {/* SYSTEM MISSIONS (RENDERED AS CARDS) */}
              {activeMissions.map((mission, index) => {
                 const isCompleted = mission.progress?.status === 'COMPLETED';
                 const progressPercent = mission.progress ? Math.min((mission.progress.progress / mission.progress.target) * 100, 100) : 0;

                 return (
                    <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={cn(
                        "h-full flex flex-col min-h-[420px] p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 transition-all group relative overflow-hidden",
                        isCompleted && "bg-primary/[0.03] border-primary/20 shadow-premium"
                      )}>
                        <div className="flex justify-between items-start mb-10">
                           <div className={cn(
                             "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-lg",
                             isCompleted ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-text-tertiary"
                           )}>
                              {mission.definition.category === 'WELCOME' && <Star size={24} />}
                              {mission.definition.category === 'REFERRAL' && <Award size={24} />}
                              {mission.definition.category === 'PREDICTION' && <TrendingUp size={24} />}
                              {mission.definition.category === 'CAMPAIGN' && <ShieldCheck size={24} />}
                              {mission.definition.category === 'LEVEL' && <Trophy size={24} />}
                           </div>
                           <div className="text-right">
                              <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Execution Reward</p>
                              <div className="flex items-center gap-2 justify-end">
                                 <Zap size={14} className="text-primary" />
                                 <span className="text-xl font-mono font-bold text-white">+{mission.definition.rewardPoints}</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex-1 space-y-4">
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{mission.definition.category} Challenge</span>
                           </div>
                           <h3 className="text-2xl font-bold text-white uppercase tracking-tight leading-none group-hover:text-primary transition-colors">
                              {mission.definition.title}
                           </h3>
                           <p className="text-sm text-text-secondary font-medium leading-relaxed italic">
                              {mission.definition.description}
                           </p>
                        </div>

                        <div className="pt-8 border-t border-white/5 space-y-6">
                           {isCompleted ? (
                              <Button
                                className="w-full h-14 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-widest text-[10px] rounded-2xl"
                                onClick={() => handleClaimMission(mission.id)}
                                isLoading={claimingId === mission.id}
                              >
                                 Authorize Reward
                              </Button>
                           ) : (
                              <div className="space-y-3">
                                 <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                    <span className="text-text-tertiary">Mission Progress</span>
                                    <span className="text-white">{mission.progress?.progress || 0} / {mission.definition.targetValue}</span>
                                 </div>
                                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progressPercent}%` }}
                                      className="h-full bg-primary"
                                    />
                                 </div>
                              </div>
                           )}
                        </div>
                      </Card>
                    </motion.div>
                 );
              })}

              {/* CAMPAIGNS */}
              {activeCampaigns.map((camp, index) => (
                <motion.div
                  key={camp.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (activeMissions.length + index) * 0.05 }}
                  onClick={() => navigate(`/campaigns/${camp.id}`)}
                  className="group cursor-pointer"
                >
                  <Card className="h-full flex flex-col min-h-[460px] p-0 rounded-[2.5rem] bg-surface-bright/50 border border-white/5 overflow-hidden">
                    <div className="h-44 relative overflow-hidden">
                       {camp.bannerUrl ? (
                          <img src={camp.bannerUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" />
                       ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                       <div className="absolute top-8 left-8">
                          <div className="px-3 py-2 bg-background/80 backdrop-blur-md border border-white/10 rounded-xl group-hover:border-primary/40 transition-colors">
                             {camp.category === 'SOCIAL' ? <Users size={16} className="text-primary" /> :
                              camp.category === 'PREDICTION' ? <TrendingUp size={16} className="text-accent" /> :
                              <Zap size={16} className="text-warning" />}
                          </div>
                       </div>
                    </div>
                    <div className="flex-1 p-8 pt-6 space-y-5">
                       <div className="space-y-2">
                          <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">{camp.category}</p>
                          <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight">{camp.name}</h3>
                       </div>
                       <p className="text-sm text-text-secondary leading-relaxed line-clamp-3 font-medium">
                          {camp.description}
                       </p>
                    </div>
                    <div className="px-8 pb-8 flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Zap size={14} className="text-primary" />
                          <span className="text-[10px] font-mono font-bold text-white">+{(camp.totalPrizePool || 0).toLocaleString()}</span>
                       </div>
                       <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-bright text-white border border-border group-hover:bg-primary group-hover:border-primary transition-all">
                          <ArrowRight size={20} />
                       </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </>
          ) : (
            <>
              {/* COMPLETED MISSIONS */}
              {completedMissions.map((mission, index) => (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full flex flex-col min-h-[420px] p-8 rounded-[2.5rem] bg-success/[0.02] border-success/30 opacity-60">
                    <div className="flex justify-between items-start mb-10">
                       <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-success/20 text-success border border-success/20">
                          <CheckCircle2 size={24} />
                       </div>
                    </div>
                    <div className="flex-1 space-y-4">
                       <h3 className="text-2xl font-bold text-white uppercase tracking-tight leading-none">{mission.definition.title}</h3>
                       <p className="text-sm text-text-secondary font-medium leading-relaxed italic">{mission.definition.description}</p>
                    </div>
                    <div className="pt-8 border-t border-white/5">
                       <p className="text-lg font-mono font-bold text-success">+{mission.definition.rewardPoints} PTS Secured</p>
                    </div>
                  </Card>
                </motion.div>
              ))}

              {/* COMPLETED TASKS */}
              {completedTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (completedMissions.length + index) * 0.05 }}
                  onClick={() => navigate(`/campaigns/${task.campaignId}`)}
                  className="group cursor-pointer"
                >
                  <Card className="h-full flex flex-col min-h-[420px] p-8 rounded-[2.5rem] bg-success/[0.02] border-success/30">
                    <div className="flex justify-between items-start mb-10">
                       <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-success/10 text-success border border-success/10">
                          <CheckCircle2 size={24} />
                       </div>
                    </div>
                    <div className="flex-1">
                       <h3 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">{task.title}</h3>
                       <p className="text-sm text-text-secondary line-clamp-3 italic">{task.description}</p>
                    </div>
                    <div className="pt-8 border-t border-white/5">
                       <p className="text-lg font-mono font-bold text-success">+{task.rewardAmount} PTS Secured</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </>
          )}
        </div>

        {/* EMPTY STATE */}
        {(view === 'ACTIVE' ? (activeCampaigns.length === 0 && activeMissions.length === 0) : (completedTasks.length === 0 && completedMissions.length === 0)) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="py-48 text-center border border-dashed border-border rounded-[3rem] bg-surface/20 flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-surface border border-border rounded-[2rem] flex items-center justify-center mb-8 text-text-tertiary">
               <Search size={32} />
            </div>
            <h2 className="text-xl font-bold mb-3 uppercase tracking-tighter">No Active Opportunities</h2>
            <p className="text-text-secondary text-sm max-w-xs mx-auto font-medium mb-12">
               Infrastructure is currently indexing new rewards. Check back shortly for refreshed challenges.
            </p>
            <Button variant="outline" onClick={() => setFilter('ALL')}>Reset Filters</Button>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tasks;
