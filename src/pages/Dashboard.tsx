import React, { useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  TrendingUp,
  Clock,
  Activity as ActivityIcon,
  Target,
  LayoutGrid,
  BarChart3,
  CreditCard,
  UserPlus,
  ArrowRight,
  ChevronRight,
  Flame,
  Wallet as WalletIcon,
  CheckCircle2,
  X,
  ExternalLink,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { formatUSD } from '../utils/finance';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getXpProgress, getLevelTier } from '../utils/progression';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { activities, tasks, campaigns, loading, getTaskStatus, subtasks, systemTasks } = useTasks();
  const [selectedActivity, setSelectedActivity] = React.useState<any | null>(null);

  const activeCampaigns = (campaigns || []).filter(c => c.active);
  const featuredCampaign = activeCampaigns.find(c => c.featured) || activeCampaigns[0];
  const pendingSubtasks = subtasks.filter(s => s.validationState === 'PENDING');

  // Unified Dynamic Task Engine: Prioritize system milestones then campaign tasks
  const dynamicObjectives = useMemo(() => {
    const objectives: any[] = [];

    // 1. Unfinished System Tasks (Milestones)
    systemTasks.forEach(st => {
       if (st.progress?.status !== 'CLAIMED') {
          objectives.push({
             id: st.id,
             title: st.definition.title,
             reward: st.definition.rewardPoints,
             category: st.definition.category,
             progress: st.progress?.progress || 0,
             target: st.definition.targetValue,
             status: st.progress?.status || 'IN_PROGRESS',
             type: 'SYSTEM',
             path: st.definition.category === 'PREDICTION' ? '/predictions' :
                   st.definition.category === 'REFERRAL' ? '/referrals' : '/tasks'
          });
       }
    });

    // 2. Actionable Campaign Tasks
    tasks.filter(t => t.active && getTaskStatus(t).status === 'available').forEach(t => {
       objectives.push({
          id: t.id,
          title: t.title,
          reward: t.rewardAmount,
          category: t.category,
          status: 'available',
          type: 'CAMPAIGN',
          path: `/campaigns/${t.campaignId}`
       });
    });

    // Sort: Completed (ready to claim) first, then by progress ratio, then by reward
    return objectives.sort((a, b) => {
       if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return -1;
       if (b.status === 'COMPLETED' && a.status !== 'COMPLETED') return 1;

       if (a.target && b.target) {
          const ratioA = a.progress / a.target;
          const ratioB = b.progress / b.target;
          if (ratioB !== ratioA) return ratioB - ratioA;
       }

       return b.reward - a.reward;
    });
  }, [systemTasks, tasks, getTaskStatus]);

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto space-y-12">
        <div className="h-12 w-64 bg-surface rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-surface rounded-[2rem] animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           <div className="lg:col-span-2 h-[600px] bg-surface rounded-[2.5rem] animate-pulse" />
           <div className="h-[600px] bg-surface rounded-[2.5rem] animate-pulse" />
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
               Welcome back, <span className="text-text-tertiary">{userData?.username}</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-3"
          >
             {[
               { name: 'Tasks', path: '/tasks', icon: LayoutGrid },
               { name: 'Prediction', path: '/predictions', icon: BarChart3 },
               { name: 'Withdraw', path: '/wallet', icon: CreditCard },
               { name: 'Invite', path: '/referrals', icon: UserPlus },
             ].map((action) => (
               <Link
                key={action.name}
                to={action.path}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-surface-bright border border-border hover:bg-surface-accent hover:border-primary/40 transition-all group"
               >
                 <action.icon size={14} className="text-text-tertiary group-hover:text-primary transition-colors" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary group-hover:text-white transition-colors">{action.name}</span>
               </Link>
             ))}
          </motion.div>
        </div>

        {/* METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
           <Card variant="compact" className="bg-primary/[0.03] border-primary/20 p-8 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <p className="data-label text-primary">Balance</p>
                 <WalletIcon size={18} className="text-primary" />
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{(userData?.points || 0)?.toLocaleString()} <span className="text-[10px] font-mono text-primary uppercase">PTS</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">≈ {formatUSD((userData?.points || 0) / 1000)} USD</p>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px] bg-white/[0.01] border-white/5">
              <div className="flex justify-between items-start">
                 <p className="data-label">Progression</p>
                 <TrendingUp size={18} className={cn(getLevelTier(userData?.level || 1).color)} />
              </div>
              <div className="space-y-4">
                 <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                       <p className="text-2xl font-bold text-white tracking-tight">LVL {userData?.level || 1}</p>
                       <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", getLevelTier(userData?.level || 1).color)}>
                          {getLevelTier(userData?.level || 1).title}
                       </span>
                    </div>
                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1">{(userData?.xp || 0)?.toLocaleString()} Total XP</p>
                 </div>
                 <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getXpProgress(userData?.xp || 0).progress}%` }}
                      className={cn(
                        "h-full transition-all duration-1000 rounded-full relative",
                        getLevelTier(userData?.level || 1).color.replace('text-', 'bg-'),
                        "shadow-[0_0_20px_rgba(94,106,210,0.8)]"
                      )}
                    >
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                    </motion.div>
                 </div>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <p className="data-label">Streak</p>
                 <Flame size={18} className={cn(userData?.streak && userData.streak > 0 ? "text-orange-500" : "text-text-tertiary")} />
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{userData?.streak || 0} <span className="text-[10px] font-mono text-text-tertiary uppercase">Days</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Login Streak</p>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <p className="data-label">Pending</p>
                 <Clock size={18} className="text-text-tertiary" />
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{pendingSubtasks.length} <span className="text-[10px] font-mono text-text-tertiary uppercase">Tasks</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Reviewing</p>
              </div>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-start">
          {/* PRIMARY EARNING FEED */}
          <div className="lg:col-span-2 space-y-16">
            {/* FEATURED DISCOVERY */}
            {featuredCampaign && (
               <section className="space-y-8">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold tracking-tight italic">Recommended Campaign</h2>
                     <Link to="/tasks" className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest hover:text-white flex items-center gap-2 transition-colors">
                        View All <ChevronRight size={14} />
                     </Link>
                  </div>

                  <Link to={`/campaigns/${featuredCampaign.id}`} className="group relative block w-full aspect-[21/9] rounded-[2.5rem] border border-white/5 overflow-hidden bg-[#0A0A0F] transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10">
                     {featuredCampaign.bannerUrl ? (
                        <img src={featuredCampaign.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000" />
                     ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-10 flex flex-col justify-end">
                        <div className="max-w-xl space-y-6">
                           <div className="flex items-center gap-3">
                              <span className="px-3 py-1 rounded-full bg-primary text-white text-[9px] font-black uppercase tracking-widest">Featured</span>
                              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">+{(featuredCampaign.totalPrizePool || 0).toLocaleString()} PTS</span>
                           </div>
                           <h3 className="text-3xl md:text-4xl font-bold text-white leading-none tracking-tighter italic">{featuredCampaign.name}</h3>
                           <p className="text-sm text-text-secondary font-medium line-clamp-2 leading-relaxed italic">
                              {featuredCampaign.description}
                           </p>
                           <div className="flex items-center gap-3 pt-2">
                              <Button size="sm" variant="primary" className="rounded-xl px-10 h-12 shadow-xl shadow-primary/20 group-hover:gap-6 transition-all italic">Launch Campaign <ArrowRight size={14} /></Button>
                           </div>
                        </div>
                     </div>
                  </Link>
               </section>
            )}



            {/* DYNAMIC OBJECTIVES ENGINE */}
            <section className="space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Target size={18} className="text-primary" />
                       <h2 className="text-xl font-bold tracking-tight">Active Objectives</h2>
                    </div>
                    <Link to="/tasks" className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest hover:text-white transition-colors">
                       View Hub
                    </Link>
                 </div>

                 {dynamicObjectives.length > 0 ? (
                 <div className="grid grid-cols-1 gap-3">
                    {dynamicObjectives.slice(0, 5).map((obj: any) => (
                      <Link
                        key={obj.id}
                        to={obj.path}
                        className={cn(
                           "group flex items-center justify-between p-6 rounded-3xl transition-all border",
                           obj.status === 'COMPLETED'
                              ? "bg-primary/10 border-primary/30 shadow-[0_0_30px_rgba(94,106,210,0.1)]"
                              : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-primary/20"
                        )}
                      >
                        <div className="flex items-center gap-6">
                           <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all shadow-lg",
                              obj.status === 'COMPLETED' ? "bg-primary text-white border-primary" : "bg-white/[0.03] border-white/5 text-text-tertiary group-hover:border-primary/20"
                           )}>
                              {obj.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <Target size={24} className="group-hover:text-primary" />}
                           </div>
                           <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                 <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{obj.category}</p>
                                 {obj.status === 'COMPLETED' && <span className="text-[7px] font-black bg-primary text-white px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">Claim Ready</span>}
                              </div>
                              <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors leading-tight">{obj.title}</h3>
                              {obj.target > 0 ? (
                                 <div className="flex items-center gap-3 pt-1">
                                    <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                                       <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${(obj.progress / obj.target) * 100}%` }}
                                          className="h-full bg-primary"
                                       />
                                    </div>
                                    <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">{obj.progress} / {obj.target}</span>
                                 </div>
                              ) : (
                                 <p className="text-[10px] text-text-tertiary font-medium">Objective Active</p>
                              )}
                           </div>
                        </div>

                        <div className="flex items-center gap-8">
                           <div className="hidden sm:block text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                 <Zap size={12} className="text-primary" />
                                 <span className="text-base font-mono font-bold text-white">+{obj.reward}</span>
                              </div>
                              <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">{obj.status === 'COMPLETED' ? 'Claimable' : 'Reward'}</p>
                           </div>
                           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-text-tertiary group-hover:bg-primary group-hover:text-white transition-all">
                              <ChevronRight size={18} />
                           </div>
                        </div>
                      </Link>
                    ))}
                 </div>
                 ) : (
                    <div className="py-12 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-white/[0.01]">
                       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">No active tasks available</p>
                    </div>
                 )}
              </section>
          </div>

          {/* ACTIVITY FEED */}
          <div className="space-y-16">
            {activities.length > 0 && (
              <section className="space-y-8">
                <div className="flex items-center gap-3">
                  <ActivityIcon size={18} className="text-primary" />
                  <h2 className="text-lg font-bold tracking-tight uppercase tracking-widest text-[11px]">Activity</h2>
                </div>

                <div className="space-y-2">
                  {activities.slice(0, 8).map((activity) => {
                    const isPositive = activity.points > 0;

                    const handleActivityClick = () => {
                      setSelectedActivity(activity);
                    };

                    return (
                      <div
                        key={activity.id}
                        onClick={handleActivityClick}
                        className="p-4 rounded-xl bg-white/[0.01] border border-white/5 group hover:bg-white/[0.03] hover:border-primary/20 transition-all cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isPositive ? "bg-success/5 border-success/10 text-success" : "bg-white/5 border-white/10 text-white/20"
                          )}>
                            {activity.type === 'reward_received' || activity.type === 'task_approved' || activity.type === 'prediction_won' ? <Zap size={14} /> :
                             activity.type === 'level_achieved' ? <TrendingUp size={14} /> :
                             activity.type === 'prediction_placed' ? <BarChart3 size={14} /> :
                             activity.type === 'referral_activated' ? <UserPlus size={14} /> : <ActivityIcon size={14} />}
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="text-[10px] font-bold text-white leading-snug group-hover:text-primary transition-colors truncate">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className={cn(
                                 "text-[8px] font-black uppercase tracking-widest",
                                 isPositive ? "text-success" : "text-text-tertiary"
                               )}>
                                 {isPositive ? `+${activity.points} PTS` : 'Activity'}
                               </span>
                               <span className="text-[8px] text-text-tertiary font-mono">
                                {activity.timestamp?.toDate?.() ? (activity.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "") : ""}
                               </span>
                            </div>
                          </div>
                          <div className="ml-auto self-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <ChevronRight size={14} className="text-primary" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* PENDING VALIDATIONS SUMMARY */}
            {pendingSubtasks.length > 0 && (
               <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-warning" />
                    <h2 className="text-lg font-bold tracking-tight uppercase tracking-widest text-[11px]">Pending Reviews</h2>
                  </div>
                  <div className="space-y-3">
                     {pendingSubtasks.slice(0, 3).map(s => (
                        <div key={s.id} className="p-4 rounded-xl border border-warning/10 bg-warning/[0.02] flex items-center justify-between">
                           <div className="min-w-0">
                              <p className="text-[10px] font-bold text-white truncate max-w-[140px]">{s.metadata?.taskTitle || 'Campaign'}</p>
                              <p className="text-[8px] font-bold text-warning uppercase tracking-widest mt-1">Verification Active</p>
                           </div>
                           <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                              <Clock size={14} />
                           </div>
                        </div>
                     ))}
                  </div>
               </section>
            )}

            {/* COMPLETED SUMMARY */}
            <section className="space-y-8">
               <div className="system-card bg-surface-bright/20 border-dashed border-white/5 py-10 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20">
                     <CheckCircle2 size={24} />
                  </div>
                  <div className="text-center">
                     <p className="text-2xl font-bold text-white tracking-tight">{userData?.stats?.tasksCompleted || 0}</p>
                     <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Tasks Completed</p>
                  </div>
               </div>
            </section>
          </div>
        </div>
      </div>

      {/* ACTIVITY DETAIL OVERLAY */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedActivity(null)}
               className="absolute inset-0 bg-black/80 backdrop-blur-md"
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="relative w-full max-w-lg bg-[#0A0A0F] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
             >
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                        <ActivityIcon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1">Event Logic</p>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">{selectedActivity.type.replace('_', ' ')}</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedActivity(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-text-tertiary hover:text-white">
                      <X size={20} />
                   </button>
                </div>

                <div className="p-10 space-y-10 flex-1">
                   <div className="space-y-4">
                      <h2 className="text-3xl font-bold text-white tracking-tighter uppercase italic leading-none">{selectedActivity.description}</h2>
                      <div className="flex items-center gap-4 text-text-tertiary">
                         <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleDateString()}</span>
                         </div>
                         <div className="w-1 h-1 rounded-full bg-white/10" />
                         <div className="flex items-center gap-2">
                            <Clock size={14} className="text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleTimeString()}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2 group hover:bg-white/[0.04] transition-all">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Yield Impact</p>
                         <div className="flex items-baseline gap-2">
                            <p className={cn(
                              "text-2xl font-mono font-bold tracking-tighter",
                              selectedActivity.points > 0 ? "text-success" : selectedActivity.points < 0 ? "text-danger" : "text-white"
                            )}>
                               {selectedActivity.points > 0 ? '+' : ''}{selectedActivity.points}
                            </p>
                            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>
                      <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2 group hover:bg-white/[0.04] transition-all">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Status</p>
                         <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-primary" />
                            <p className="text-xs font-bold text-white uppercase tracking-widest">Verified</p>
                         </div>
                      </div>
                   </div>

                   {selectedActivity.referenceId && (
                      <div className="p-8 rounded-[2rem] bg-black/40 border border-white/5 space-y-6">
                         <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">System Reference</p>
                            <span className="text-[9px] font-mono text-primary truncate max-w-[120px]">{selectedActivity.referenceId}</span>
                         </div>
                         <Button
                           onClick={() => {
                              const type = selectedActivity.type as string;
                              if (type.includes('prediction')) navigate('/predictions');
                              else if (type.includes('campaign')) {
                                 if (selectedActivity.referenceId) navigate(`/campaigns/${selectedActivity.referenceId}`);
                                 else navigate('/tasks');
                              }
                              else if (type.includes('task') || type.includes('mission')) navigate('/tasks');
                              else if (type.includes('referral')) navigate('/referrals');
                              else if (type.includes('level')) navigate('/me');
                              else if (type.includes('withdrawal')) navigate('/wallet');
                              setSelectedActivity(null);
                           }}
                           variant="primary"
                           className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl shadow-primary/10"
                         >
                            Open Context <ExternalLink size={14} className="ml-2" />
                         </Button>
                      </div>
                   )}
                </div>

                <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-center">
                   <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.5em]">PulseEarn Infrastructure Node Alpha-5</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Dashboard;
