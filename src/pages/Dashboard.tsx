import React, { useMemo, useState } from 'react';
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
  Calendar,
  TrendingDown,
  Gift,
  MousePointer2,
  Trophy,
  ArrowUpRight
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

  const activeCampaigns = useMemo(() => (campaigns || []).filter(c => c.active), [campaigns]);
  const pendingSubtasks = subtasks.filter(s => s.validationState === 'PENDING');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Modern Intelligent Discovery Engine
  const discoveredTasks = useMemo(() => {
    const rail: any[] = [];

    // 1. Featured Campaigns
    activeCampaigns.filter(c => c.featured).forEach(c => {
       rail.push({
          id: `campaign_${c.id}`,
          originalId: c.id,
          type: 'CAMPAIGN',
          title: c.name,
          category: c.category,
          reward: c.totalPrizePool || 0,
          image: c.bannerUrl,
          description: c.description,
          participants: c.participantsCount,
          priority: 100
       });
    });

    // 2. High-Value Actionable Tasks
    tasks.filter(t => t.active && getTaskStatus(t).status === 'available').slice(0, 8).forEach(t => {
       const campaign = activeCampaigns.find(c => c.id === t.campaignId);
       rail.push({
          id: `task_${t.id}`,
          originalId: t.id,
          campaignId: t.campaignId,
          campaignName: campaign?.name,
          type: 'TASK',
          title: t.title,
          category: t.category,
          reward: t.rewardAmount,
          xp: t.xpReward,
          instructions: t.instructions,
          verificationType: t.verificationType,
          priority: t.rewardAmount > 500 ? 90 : 70
       });
    });

    // 3. Unclaimed System Missions
    systemTasks.filter(st => st.progress?.status !== 'CLAIMED').forEach(st => {
       rail.push({
          id: `mission_${st.id}`,
          originalId: st.id,
          type: 'MISSION',
          title: st.definition.title,
          category: st.definition.category,
          reward: st.definition.rewardPoints,
          xp: st.definition.rewardXp,
          description: st.definition.description,
          progress: st.progress?.progress || 0,
          target: st.definition.targetValue,
          status: st.progress?.status || 'IN_PROGRESS',
          priority: st.progress?.status === 'COMPLETED' ? 95 : 80
       });
    });

    return rail.sort((a, b) => b.priority - a.priority);
  }, [activeCampaigns, tasks, systemTasks, getTaskStatus]);

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
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-20">
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <Card variant="compact" className="bg-primary/[0.03] border-primary/20 p-8 flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700" />
              <div className="flex justify-between items-start">
                 <p className="data-label text-primary">Balance</p>
                 <WalletIcon size={18} className="text-primary" />
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{(userData?.points || 0)?.toLocaleString()} <span className="text-[10px] font-mono text-primary uppercase">PTS</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">≈ {formatUSD((userData?.points || 0) / 1000)} USD</p>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px] bg-white/[0.02] border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="flex justify-between items-start relative z-10">
                 <p className="data-label">Progression</p>
                 <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/10", getLevelTier(userData?.level || 1).color)}>
                    <TrendingUp size={16} />
                 </div>
              </div>
              <div className="space-y-4 relative z-10">
                 <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                       <p className="text-2xl font-bold text-white tracking-tight">LVL {userData?.level || 1}</p>
                       <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/5", getLevelTier(userData?.level || 1).color)}>
                          {getLevelTier(userData?.level || 1).title}
                       </span>
                    </div>
                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1">{(userData?.xp || 0)?.toLocaleString()} Total XP</p>
                 </div>
                 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getXpProgress(userData?.xp || 0).progress}%` }}
                      className={cn(
                        "h-full transition-all duration-1000 rounded-full relative",
                        getLevelTier(userData?.level || 1).color.replace('text-', 'bg-')
                      )}
                    />
                 </div>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px] bg-white/[0.02] border-white/10 group">
              <div className="flex justify-between items-start">
                 <p className="data-label">Streak</p>
                 <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/10", userData?.streak && userData.streak > 0 ? "text-orange-500" : "text-text-tertiary")}>
                    <Flame size={16} />
                 </div>
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{userData?.streak || 0} <span className="text-[10px] font-mono text-text-tertiary uppercase">Days</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Login Streak</p>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px] bg-white/[0.02] border-white/10 group">
              <div className="flex justify-between items-start">
                 <p className="data-label">Pending</p>
                 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.03] border border-white/10 text-white/40 group-hover:text-warning transition-colors">
                    <Clock size={16} />
                 </div>
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
            {/* MODERN TASK RAIL */}
            <section className="space-y-8">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                     <h2 className="text-xl font-bold tracking-tight italic">Earning Discovery</h2>
                  </div>
                  <Link to="/tasks" className="flex items-center gap-2 group">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-primary transition-colors">Marketplace</span>
                     <ChevronRight size={14} className="text-white/10 group-hover:text-primary transition-colors" />
                  </Link>
               </div>

               <div className="relative -mx-6 px-6 overflow-x-auto no-scrollbar pb-8">
                  <div className="flex gap-5 min-w-max">
                     {discoveredTasks.map((item) => (
                        <motion.div
                           key={item.id}
                           whileHover={{ y: -5 }}
                           className={cn(
                              "w-80 p-6 rounded-[2.5rem] bg-[#0A0A0F] border transition-all cursor-pointer flex flex-col justify-between group",
                              item.type === 'CAMPAIGN' ? "border-primary/20 bg-primary/[0.02]" : "border-white/5 hover:border-white/20"
                           )}
                           onClick={() => {
                              if (item.type === 'CAMPAIGN') navigate(`/campaigns/${item.originalId}`);
                              else setSelectedTask(item);
                           }}
                        >
                           <div className="space-y-6">
                              <div className="flex justify-between items-start">
                                 <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner",
                                    item.type === 'CAMPAIGN' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/[0.02] border-white/5 text-text-tertiary group-hover:text-white"
                                 )}>
                                    {item.category === 'PREDICTION' ? <BarChart3 size={20} /> :
                                     item.category === 'REFERRAL' ? <UserPlus size={20} /> :
                                     item.type === 'MISSION' ? <Trophy size={20} /> : <Target size={20} />}
                                 </div>
                                 <div className="text-right">
                                    <div className="flex items-center gap-1.5 justify-end">
                                       <Zap size={12} className="text-primary" />
                                       <span className="text-lg font-mono font-bold text-white">+{item.reward.toLocaleString()}</span>
                                    </div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Authorized Reward</p>
                                 </div>
                              </div>

                              <div className="space-y-2">
                                 <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">{item.category || item.type}</p>
                                 <h3 className="text-xl font-bold text-white tracking-tighter leading-tight line-clamp-1 group-hover:text-primary transition-colors italic">
                                    {item.title}
                                 </h3>
                                 <p className="text-xs text-text-tertiary font-medium line-clamp-2 leading-relaxed min-h-[32px]">
                                    {item.description || item.instructions || 'Secure this objective to claim your contribution rewards.'}
                                 </p>
                              </div>
                           </div>

                           <div className="pt-8 flex items-center justify-between border-t border-white/5 mt-8">
                              <div className="flex items-center gap-3">
                                 {item.type === 'MISSION' && item.target > 0 ? (
                                    <div className="flex flex-col gap-1.5">
                                       <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-primary" style={{ width: `${(item.progress / item.target) * 100}%` }} />
                                       </div>
                                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{Math.round((item.progress / item.target) * 100)}% Complete</span>
                                    </div>
                                 ) : item.type === 'CAMPAIGN' ? (
                                    <div className="flex -space-x-2">
                                       {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border border-black bg-surface-bright" />)}
                                       <span className="pl-4 text-[9px] font-black text-white/20 uppercase tracking-widest">+{item.participants || 0}</span>
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-1.5 text-success">
                                       <Gift size={10} />
                                       <span className="text-[9px] font-black uppercase tracking-widest">Available</span>
                                    </div>
                                 )}
                              </div>
                              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-text-tertiary group-hover:bg-primary group-hover:text-white transition-all">
                                 <ArrowRight size={14} />
                              </div>
                           </div>
                        </motion.div>
                     ))}
                  </div>
               </div>
            </section>

            {/* DASHBOARD ANALYTICS / STATS OVERVIEW */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-8 group hover:border-primary/20 transition-all">
                   <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                         <TrendingUp size={20} />
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Global Rank</p>
                         <p className="text-xl font-bold text-white tracking-tighter italic">TOP 1%</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Growth Vector</h4>
                      <p className="text-xs text-text-tertiary leading-relaxed">Your ecosystem participation has increased by <span className="text-success font-bold">12.5%</span> this week. Keep forecasting to maintain yield.</p>
                   </div>
                </div>

                <div className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-8 group hover:border-orange-500/20 transition-all">
                   <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center justify-center text-orange-500">
                         <Flame size={20} />
                      </div>
                      <div className="text-right">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Hot Streak</p>
                         <p className="text-xl font-bold text-white tracking-tighter italic">{userData?.streak || 0} DAYS</p>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-widest">Loyalty Multiplier</h4>
                      <p className="text-xs text-text-tertiary leading-relaxed">Daily login recorded. Maintain your streak to unlock <span className="text-orange-500 font-bold">Bonus Yield</span> multipliers.</p>
                   </div>
                </div>
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

                    return (
                      <div
                        key={activity.id}
                        onClick={() => setSelectedActivity(activity)}
                        className="p-5 rounded-2xl bg-[#0A0A0F] border border-white/5 group hover:bg-white/[0.03] hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                      >
                        <div className={cn(
                           "absolute inset-y-0 left-0 w-0.5 transition-all group-hover:w-1",
                           isPositive ? "bg-success" : "bg-primary"
                        )} />

                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all shadow-inner",
                            isPositive ? "bg-success/5 border-success/10 text-success" : "bg-white/[0.02] border-white/10 text-white/20"
                          )}>
                            {activity.type.includes('prediction') ? <BarChart3 size={18} /> :
                             activity.type.includes('task') || activity.type.includes('mission') ? <Target size={18} /> :
                             activity.type.includes('referral') ? <UserPlus size={18} /> :
                             activity.type.includes('level') ? <TrendingUp size={18} /> : <Zap size={18} />}
                          </div>

                          <div className="flex-grow min-w-0">
                            <p className="text-[11px] font-bold text-white leading-tight group-hover:text-primary transition-colors truncate uppercase tracking-tight italic">
                               {activity.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5">
                               <span className={cn(
                                 "text-[8px] font-black uppercase tracking-[0.1em]",
                                 isPositive ? "text-success" : "text-text-tertiary"
                               )}>
                                 {isPositive ? `+${activity.points.toLocaleString()} PTS` : 'Event Registered'}
                               </span>
                               <div className="w-1 h-1 rounded-full bg-white/5" />
                               <span className="text-[8px] text-text-tertiary font-bold uppercase tracking-widest">
                                {activity.timestamp?.toDate?.() ? (activity.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "") : ""}
                               </span>
                            </div>
                          </div>

                          <div className="shrink-0 text-white/10 group-hover:text-primary transition-colors">
                             <ChevronRight size={16} />
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

            {/* COMPLETED SUMMARY / NEXT MILESTONE */}
            <section className="p-8 rounded-[2.5rem] bg-[#0A0A0F] border border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Trophy size={80} />
               </div>
               <div className="flex flex-col items-center gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-full bg-success/5 flex items-center justify-center text-success border border-success/10 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                     <CheckCircle2 size={32} />
                  </div>
                  <div className="text-center space-y-1">
                     <p className="text-4xl font-bold text-white tracking-tighter leading-none">{userData?.stats?.tasksCompleted || 0}</p>
                     <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Verified Contributions</p>
                  </div>
                  <div className="w-full space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Next Milestone</span>
                        <span className="text-[9px] font-mono text-white/40">Level {userData?.level ? userData.level + 1 : 2}</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${getXpProgress(userData?.xp || 0).progress}%` }}
                        />
                     </div>
                  </div>
               </div>
            </section>
          </div>
        </div>
      </div>

      {/* ACTIVITY DETAIL OVERLAY */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedActivity(null)}
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
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                        <ActivityIcon size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 leading-none mb-1">Activity Log</p>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em]">{selectedActivity.type.replace(/_/g, ' ')}</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedActivity(null)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-text-tertiary">
                      <X size={18} />
                   </button>
                </div>

                <div className="p-8 space-y-8">
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 text-text-tertiary mb-2">
                         <Calendar size={12} className="text-primary/40" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                         <span className="text-white/10">•</span>
                         <Clock size={12} className="text-primary/40" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight uppercase italic leading-tight">{selectedActivity.description}</h2>
                   </div>

                   <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Transaction Yield</span>
                         <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-xl font-mono font-bold", selectedActivity.points >= 0 ? "text-success" : "text-danger")}>
                               {selectedActivity.points > 0 ? '+' : ''}{selectedActivity.points.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>

                      {selectedActivity.metadata?.symbol && (
                         <div className="p-5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Asset Index</span>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">{selectedActivity.metadata.symbol} / USD</span>
                         </div>
                      )}

                      {selectedActivity.metadata?.direction && (
                         <div className="p-5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Forecast Vector</span>
                            <div className="flex items-center gap-2">
                               {selectedActivity.metadata.direction === 'UP' ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                               <span className={cn("text-xs font-bold uppercase tracking-widest", selectedActivity.metadata.direction === 'UP' ? "text-success" : "text-danger")}>{selectedActivity.metadata.direction}</span>
                            </div>
                         </div>
                      )}

                      {selectedActivity.metadata?.entryPrice && (
                         <div className="p-5 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Execution Price</span>
                            <span className="text-xs font-mono font-bold text-white">${selectedActivity.metadata.entryPrice.toLocaleString()}</span>
                         </div>
                      )}

                      {selectedActivity.metadata?.taskName && (
                         <div className="p-5 flex justify-between items-start gap-4">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] whitespace-nowrap">Objective</span>
                            <span className="text-[11px] font-bold text-white uppercase tracking-tight text-right italic">{selectedActivity.metadata.taskName}</span>
                         </div>
                      )}

                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Ledger Status</span>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Immutable</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em]">Network Hash</span>
                         <span className="text-[9px] font-mono text-white/20 truncate max-w-[140px]">{selectedActivity.referenceId || selectedActivity.id}</span>
                      </div>
                      {(selectedActivity.type.includes('prediction') ||
                        selectedActivity.type.includes('campaign') ||
                        selectedActivity.type.includes('task') ||
                        selectedActivity.type.includes('mission') ||
                        selectedActivity.type.includes('referral') ||
                        selectedActivity.type.includes('withdrawal')) && (
                        <Button
                           onClick={() => {
                              const type = selectedActivity.type as string;
                              if (type.includes('prediction')) navigate('/predictions');
                              else if (type.includes('campaign')) {
                                 if (selectedActivity.metadata?.campaignId) navigate(`/campaigns/${selectedActivity.metadata.campaignId}`);
                                 else navigate('/tasks');
                              }
                              else if (type.includes('task') || type.includes('mission')) navigate('/tasks');
                              else if (type.includes('referral')) navigate('/referrals');
                              else if (type.includes('withdrawal')) navigate('/wallet');
                              setSelectedActivity(null);
                           }}
                           variant="primary"
                           className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl group"
                        >
                           View Source Context <ArrowUpRight size={14} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Button>
                      )}
                   </div>
                </div>

                <div className="p-8 bg-black border-t border-white/5 flex justify-center">
                   <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.6em]">PulseEarn Secure Ledger • Protocol V6.0</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TASK DETAIL OVERLAY */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedTask(null)}
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
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        {selectedTask.type === 'MISSION' ? <Trophy size={20} /> : <Target size={20} />}
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 leading-none mb-1">{selectedTask.campaignName || 'System Directive'}</p>
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.15em]">{selectedTask.type} PROTOCOL</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedTask(null)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-text-tertiary">
                      <X size={18} />
                   </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                   <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-white tracking-tight uppercase italic leading-tight">{selectedTask.title}</h2>
                      <p className="text-sm text-text-secondary leading-relaxed opacity-70">
                         {selectedTask.description || selectedTask.instructions || 'Execute this objective to secure authorized contribution rewards.'}
                      </p>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Reward</p>
                         <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-bold text-white">{selectedTask.reward.toLocaleString()}</span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                         <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Provision</p>
                         <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-mono font-bold text-primary">{selectedTask.xp?.toLocaleString() || '100'}</span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">XP</span>
                         </div>
                      </div>
                   </div>

                   <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Method</span>
                      <div className="flex items-center gap-2">
                         <MousePointer2 size={14} className="text-success" />
                         <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{selectedTask.verificationType || 'AUTOMATED'}</span>
                      </div>
                   </div>

                   {selectedTask.type === 'MISSION' && selectedTask.target > 0 && (
                      <div className="p-6 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 space-y-4">
                         <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Sync Progress</span>
                            <span className="text-[10px] font-mono text-primary font-bold">{Math.round((selectedTask.progress / selectedTask.target) * 100)}%</span>
                         </div>
                         <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                               initial={{ width: 0 }}
                               animate={{ width: `${(selectedTask.progress / selectedTask.target) * 100}%` }}
                               className="h-full bg-primary"
                            />
                         </div>
                      </div>
                   )}

                   <div className="space-y-3 pt-4">
                      <Button
                        onClick={() => {
                           if (selectedTask.type === 'MISSION') {
                              if (selectedTask.category === 'PREDICTION') navigate('/predictions');
                              else if (selectedTask.category === 'REFERRAL') navigate('/referrals');
                              else navigate('/tasks');
                           } else {
                              navigate(`/campaigns/${selectedTask.campaignId}`);
                           }
                           setSelectedTask(null);
                        }}
                        variant="primary"
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-xl group italic"
                      >
                         Initialize Objective <ArrowUpRight size={16} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </Button>
                      <button
                        onClick={() => setSelectedTask(null)}
                        className="w-full h-12 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors"
                      >
                         Return to Session
                      </button>
                   </div>
                </div>

                <div className="p-8 bg-black border-t border-white/5 flex justify-center">
                   <p className="text-[8px] font-black text-white/10 uppercase tracking-[0.6em]">PulseEarn contribution node • active session</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Dashboard;
