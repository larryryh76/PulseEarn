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
  Calendar,
  TrendingDown
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

  // Intelligent Live Rotation Engine: Dynamically cycles through highest-value opportunities
  const rotatingOpportunities = useMemo(() => {
    const opps: any[] = [];

    // 1. Featured Campaigns (Highest Priority)
    activeCampaigns.filter(c => c.featured).forEach(c => {
       opps.push({
          id: `campaign_${c.id}`,
          type: 'CAMPAIGN',
          title: c.name,
          subtitle: 'Featured Campaign',
          description: c.description,
          reward: c.totalPrizePool || 0,
          rewardLabel: 'Prize Pool',
          image: c.bannerUrl,
          path: `/campaigns/${c.id}`,
          priority: 100
       });
    });

    // 2. High-Value System Missions
    systemTasks.forEach(st => {
       if (st.progress?.status !== 'CLAIMED') {
          opps.push({
             id: `mission_${st.id}`,
             type: 'MISSION',
             title: st.definition.title,
             subtitle: 'System Objective',
             description: st.definition.description,
             reward: st.definition.rewardPoints,
             rewardLabel: 'Milestone Reward',
             progress: st.progress?.progress || 0,
             target: st.definition.targetValue,
             path: st.definition.category === 'PREDICTION' ? '/predictions' :
                   st.definition.category === 'REFERRAL' ? '/referrals' : '/tasks',
             priority: st.progress?.status === 'COMPLETED' ? 90 : 70
          });
       }
    });

    // 3. Newest Campaigns
    activeCampaigns.filter(c => !c.featured).slice(0, 3).forEach(c => {
       opps.push({
          id: `new_${c.id}`,
          type: 'CAMPAIGN',
          title: c.name,
          subtitle: 'New Opportunity',
          description: c.description,
          reward: c.totalPrizePool || 0,
          rewardLabel: 'Prize Pool',
          image: c.bannerUrl,
          path: `/campaigns/${c.id}`,
          priority: 50
       });
    });

    return opps.sort((a, b) => b.priority - a.priority);
  }, [activeCampaigns, systemTasks]);

  const [rotationIndex, setRotationIndex] = React.useState(0);
  const featuredOpportunity = rotatingOpportunities[rotationIndex];

  // Auto-rotation timer
  React.useEffect(() => {
    if (rotatingOpportunities.length <= 1) return;
    const interval = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % rotatingOpportunities.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [rotatingOpportunities.length]);

  // Secondary Active Objectives List
  const activeObjectives = useMemo(() => {
     return tasks
       .filter(t => t.active && getTaskStatus(t).status === 'available')
       .map(t => ({
          id: t.id,
          title: t.title,
          reward: t.rewardAmount,
          category: t.category,
          path: `/campaigns/${t.campaignId}`
       }))
       .slice(0, 4);
  }, [tasks, getTaskStatus]);

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
            {/* LIVE OPPORTUNITY ROTATOR */}
            {featuredOpportunity && (
               <section className="space-y-8">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Zap size={18} className="text-primary" />
                        <h2 className="text-xl font-black uppercase tracking-widest text-[11px]">Priority Discovery</h2>
                     </div>
                     <div className="flex gap-2">
                        {rotatingOpportunities.slice(0, 5).map((_, idx) => (
                           <button
                             key={idx}
                             onClick={() => setRotationIndex(idx)}
                             className={cn(
                               "h-1 transition-all rounded-full",
                               rotationIndex === idx ? "w-6 bg-primary" : "w-2 bg-white/10 hover:bg-white/20"
                             )}
                           />
                        ))}
                     </div>
                  </div>

                  <AnimatePresence mode="wait">
                     <motion.div
                        key={featuredOpportunity.id}
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 1.02, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                     >
                        <Link to={featuredOpportunity.path} className="group relative block w-full aspect-[21/9] rounded-[3rem] border border-white/5 overflow-hidden bg-[#0A0A0F] shadow-2xl transition-all hover:border-primary/40">
                           {featuredOpportunity.image ? (
                              <img src={featuredOpportunity.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-[3s]" />
                           ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-black to-black" />
                           )}

                           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-10 flex flex-col justify-end">
                              <div className="max-w-2xl space-y-6">
                                 <div className="flex items-center gap-4">
                                    <span className="px-3 py-1 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                                       {featuredOpportunity.subtitle}
                                    </span>
                                    <div className="flex items-center gap-2 text-white/40">
                                       <Zap size={14} className="text-primary" />
                                       <span className="text-[11px] font-black uppercase tracking-widest">
                                          +{featuredOpportunity.reward.toLocaleString()} PTS
                                       </span>
                                    </div>
                                 </div>

                                 <h3 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter uppercase italic">{featuredOpportunity.title}</h3>
                                 <p className="text-base text-text-secondary font-medium line-clamp-2 leading-relaxed opacity-60">
                                    {featuredOpportunity.description}
                                 </p>

                                 <div className="flex items-center gap-6 pt-2">
                                    <Button size="lg" variant="primary" className="rounded-2xl px-12 h-14 shadow-2xl shadow-primary/20 group-hover:gap-8 transition-all font-black uppercase tracking-widest text-[11px] italic">
                                       Launch Now <ArrowRight size={16} />
                                    </Button>
                                    {featuredOpportunity.target && (
                                       <div className="flex flex-col gap-2">
                                          <div className="flex justify-between items-center w-32">
                                             <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Progress</span>
                                             <span className="text-[10px] font-mono text-white">{Math.round((featuredOpportunity.progress / featuredOpportunity.target) * 100)}%</span>
                                          </div>
                                          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                             <motion.div
                                               initial={{ width: 0 }}
                                               animate={{ width: `${(featuredOpportunity.progress / featuredOpportunity.target) * 100}%` }}
                                               className="h-full bg-primary"
                                             />
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </Link>
                     </motion.div>
                  </AnimatePresence>
               </section>
            )}

            {/* LIVE TASK FEED */}
            <section className="space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Target size={18} className="text-primary" />
                       <h2 className="text-xl font-black uppercase tracking-widest text-[11px]">Actionable Objectives</h2>
                    </div>
                    <Link to="/tasks" className="text-[10px] font-black text-text-tertiary uppercase tracking-widest hover:text-white transition-colors group flex items-center gap-2">
                       Marketplace <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                 </div>

                 {activeObjectives.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeObjectives.map((obj) => (
                      <Link
                        key={obj.id}
                        to={obj.path}
                        className="group p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/5 hover:bg-white/[0.03] hover:border-primary/20 transition-all flex items-center justify-between shadow-lg"
                      >
                        <div className="flex items-center gap-5">
                           <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-text-tertiary group-hover:text-primary transition-all">
                              <Target size={20} />
                           </div>
                           <div className="space-y-1">
                              <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">{obj.category}</p>
                              <h3 className="text-[13px] font-black text-white group-hover:text-primary transition-colors leading-tight uppercase italic">{obj.title}</h3>
                           </div>
                        </div>

                        <div className="flex items-center gap-2">
                           <Zap size={10} className="text-primary" />
                           <span className="text-[13px] font-mono font-bold text-white">+{obj.reward}</span>
                        </div>
                      </Link>
                    ))}
                 </div>
                 ) : (
                    <div className="py-20 text-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01]">
                       <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">All objectives secured</p>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedActivity(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl"
             />
             <motion.div
               initial={{ scale: 0.9, opacity: 0, y: 40 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 40 }}
               className="relative w-full max-w-2xl bg-[#050507] border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
             >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-[1.25rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl shadow-primary/20">
                        <ActivityIcon size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none mb-1.5">System Protocol</p>
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">{selectedActivity.type.replace(/_/g, ' ')}</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedActivity(null)} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl transition-all text-text-tertiary hover:text-white">
                      <X size={24} />
                   </button>
                </div>

                <div className="p-10 space-y-12 overflow-y-auto max-h-[70vh]">
                   <div className="space-y-6 text-center md:text-left">
                      <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">{selectedActivity.description}</h2>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-text-tertiary">
                         <div className="flex items-center gap-2.5">
                            <Calendar size={16} className="text-primary/40" />
                            <span className="text-[11px] font-black uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                         </div>
                         <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                         <div className="flex items-center gap-2.5">
                            <Clock size={16} className="text-primary/40" />
                            <span className="text-[11px] font-black uppercase tracking-widest">{selectedActivity.timestamp?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                         </div>
                      </div>
                   </div>

                   {/* DYNAMIC CONTENT BASED ON METADATA */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3 group hover:border-primary/20 transition-all shadow-inner">
                         <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Balance Impact</p>
                         <div className="flex items-baseline gap-2.5">
                            <p className={cn(
                              "text-4xl font-mono font-bold tracking-tighter",
                              selectedActivity.points > 0 ? "text-success" : selectedActivity.points < 0 ? "text-danger" : "text-white/20"
                            )}>
                               {selectedActivity.points > 0 ? '+' : ''}{selectedActivity.points.toLocaleString()}
                            </p>
                            <span className="text-[11px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>

                      <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3 group hover:border-primary/20 transition-all shadow-inner">
                         <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Verification Status</p>
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                            <p className="text-lg font-black text-white uppercase tracking-widest italic">Immutable Record</p>
                         </div>
                      </div>

                      {/* Prediction Details */}
                      {selectedActivity.metadata?.assetId && (
                        <>
                          <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Asset Index</p>
                            <p className="text-lg font-black text-white uppercase tracking-widest">{selectedActivity.metadata.symbol} / USD</p>
                          </div>
                          <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Vector Position</p>
                            <div className="flex items-center gap-2">
                               {selectedActivity.metadata.direction === 'UP' ? <TrendingUp size={18} className="text-success" /> : <TrendingDown size={18} className="text-danger" />}
                               <p className={cn("text-lg font-black uppercase tracking-widest", selectedActivity.metadata.direction === 'UP' ? "text-success" : "text-danger")}>
                                  {selectedActivity.metadata.direction}
                               </p>
                            </div>
                          </div>
                          <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Entry Vector</p>
                            <p className="text-lg font-mono font-bold text-white">${selectedActivity.metadata.entryPrice?.toLocaleString()}</p>
                          </div>
                          {selectedActivity.metadata.exitPrice && (
                            <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Exit Vector</p>
                              <p className="text-lg font-mono font-bold text-white">${selectedActivity.metadata.exitPrice?.toLocaleString()}</p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Task Details */}
                      {selectedActivity.metadata?.taskName && (
                        <div className="md:col-span-2 p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-3">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Associated Objective</p>
                          <p className="text-xl font-bold text-white uppercase tracking-tight italic">{selectedActivity.metadata.taskName}</p>
                        </div>
                      )}
                   </div>

                   <div className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-dashed border-white/10 space-y-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div className="space-y-1">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Network Reference</p>
                            <p className="text-[10px] font-mono text-primary truncate max-w-[280px]">{selectedActivity.referenceId || selectedActivity.id}</p>
                         </div>
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
                              else if (type.includes('level')) navigate('/me');
                              else if (type.includes('withdrawal')) navigate('/wallet');
                              setSelectedActivity(null);
                           }}
                           variant="primary"
                           className="h-14 px-10 rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-primary/20 group italic"
                         >
                            Explore Context <ArrowRight size={16} className="ml-3 group-hover:translate-x-2 transition-transform" />
                         </Button>
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
    </MainLayout>
  );
};

export default Dashboard;
