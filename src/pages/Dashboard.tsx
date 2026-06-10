import React from 'react';
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
  AlertCircle,
  ChevronRight,
  Flame,
  Wallet as WalletIcon,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { formatUSD } from '../utils/finance';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { activities, tasks, campaigns, loading, getTaskStatus, subtasks } = useTasks();

  const activeTasks = tasks.filter(t => t.active && getTaskStatus(t).status === 'available');
  const activeCampaigns = (campaigns || []).filter(c => c.active);
  const featuredCampaign = activeCampaigns.find(c => c.featured) || activeCampaigns[0];
  const pendingSubtasks = subtasks.filter(s => s.validationState === 'PENDING');

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
        {/* OPERATIONAL HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">User Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
               Welcome Back, <span className="text-text-tertiary">{userData?.username}</span>
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-3"
          >
             {[
               { name: 'Browse', path: '/tasks', icon: LayoutGrid },
               { name: 'Predictions', path: '/predictions', icon: BarChart3 },
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

        {/* METRIC INFRASTRUCTURE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
           <Card variant="compact" className="bg-primary/[0.03] border-primary/20 p-8 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <p className="data-label text-primary">Available Balance</p>
                 <WalletIcon size={18} className="text-primary" />
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{(userData?.points || 0)?.toLocaleString()} <span className="text-[10px] font-mono text-primary uppercase">PTS</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">≈ {formatUSD((userData?.points || 0) / 1000)} USD</p>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <p className="data-label">Rank Progression</p>
                 <TrendingUp size={18} className="text-text-tertiary" />
              </div>
              <div className="space-y-4">
                 <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-white tracking-tight">LVL {userData?.level || 1}</p>
                    <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{(userData?.xp || 0)?.toLocaleString()} XP</p>
                 </div>
                 <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((userData?.xp || 0) % 1000) / 10, 100)}%` }}
                      className="h-full bg-primary"
                    />
                 </div>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <p className="data-label">Active Streak</p>
                 <Flame size={18} className={cn(userData?.streak && userData.streak > 0 ? "text-orange-500" : "text-text-tertiary")} />
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{userData?.streak || 0} <span className="text-[10px] font-mono text-text-tertiary uppercase">Days</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Session Consistency</p>
              </div>
           </Card>

           <Card variant="compact" className="p-8 flex flex-col justify-between min-h-[160px]">
              <div className="flex justify-between items-start">
                 <p className="data-label">Pending Reviews</p>
                 <Clock size={18} className="text-text-tertiary" />
              </div>
              <div className="space-y-1">
                 <p className="text-3xl font-bold text-white tracking-tighter">{pendingSubtasks.length} <span className="text-[10px] font-mono text-text-tertiary uppercase">Items</span></p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Awaiting Verification</p>
              </div>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-start">
          {/* PRIMARY EARNING FEED */}
          <div className="lg:col-span-2 space-y-16">
            {/* FEATURED DISCOVERY */}
            {featuredCampaign ? (
               <section className="space-y-8">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold tracking-tight">Priority Discovery</h2>
                     <Link to="/tasks" className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest hover:text-white flex items-center gap-2 transition-colors">
                        All Campaigns <ChevronRight size={14} />
                     </Link>
                  </div>

                  <Link to={`/campaigns/${featuredCampaign.id}`} className="group relative block w-full aspect-[21/10] md:aspect-[21/8] rounded-[2.5rem] border border-border overflow-hidden bg-surface-bright/50 transition-all hover:border-primary/40 hover:shadow-premium">
                     {featuredCampaign.bannerUrl ? (
                        <img src={featuredCampaign.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000 grayscale-[0.3] group-hover:grayscale-0" />
                     ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent p-10 flex flex-col justify-end">
                        <div className="max-w-xl space-y-6">
                           <div className="flex items-center gap-3">
                              <span className="badge-system badge-primary">Featured Campaign</span>
                              <span className="badge-system">+{(featuredCampaign.totalPrizePool || featuredCampaign.pointsReward || 0).toLocaleString()} PTS</span>
                           </div>
                           <h3 className="text-3xl md:text-4xl font-bold text-white leading-none tracking-tight">{featuredCampaign.name}</h3>
                           <p className="text-sm text-text-secondary font-medium line-clamp-2 leading-relaxed">
                              {featuredCampaign.description}
                           </p>
                           <div className="flex items-center gap-3 pt-2">
                              <Button size="sm" variant="primary" className="group-hover:gap-4 transition-all">Join Now <ArrowRight size={14} /></Button>
                           </div>
                        </div>
                     </div>
                  </Link>
               </section>
            ) : (
               <section className="space-y-8">
                  <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold tracking-tight">Priority Discovery</h2>
                  </div>
                  <div className="py-24 text-center border border-dashed border-border rounded-[2.5rem] bg-surface/20">
                     <AlertCircle className="mx-auto text-text-tertiary/20 mb-4" size={40} />
                     <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">No active campaigns at this time</p>
                  </div>
               </section>
            )}

            {/* RECENT REWARDS & OPPORTUNITIES */}
            <section className="space-y-8">
               <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold tracking-tight">Available Rewards</h2>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {activeTasks.length > 0 ? (
                    activeTasks.slice(0, 5).map((task) => (
                      <Link
                        key={task.id}
                        to={`/campaigns/${task.id}`}
                        className="group flex items-center justify-between p-6 rounded-[2rem] bg-surface/50 border border-border hover:bg-surface-bright/50 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-border flex items-center justify-center shrink-0 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                              <Target size={24} className="text-text-tertiary group-hover:text-primary transition-colors" />
                           </div>
                           <div>
                              <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mb-1">{task.category}</p>
                              <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">{task.title}</h3>
                           </div>
                        </div>

                        <div className="flex items-center gap-8">
                           <div className="hidden md:block text-right">
                              <p className="data-label">Potential Reward</p>
                              <div className="flex items-center gap-2 justify-end">
                                 <Zap size={12} className="text-primary" />
                                 <span className="text-sm font-bold text-white">+{task.rewardAmount} <span className="text-[10px] text-text-tertiary uppercase">PTS</span></span>
                              </div>
                           </div>
                           <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                              <ChevronRight size={18} />
                           </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-24 text-center border border-dashed border-border rounded-[2.5rem] bg-surface/20">
                      <AlertCircle className="mx-auto text-text-tertiary/20 mb-4" size={40} />
                      <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">No active data streams</p>
                    </div>
                  )}
               </div>

               <Button variant="outline" className="w-full h-16 rounded-[2rem]" onClick={() => navigate('/tasks')}>
                  View All Marketplace Campaigns
               </Button>
            </section>
          </div>

          {/* SYSTEM SIDEBAR: LIVE FEED */}
          <div className="space-y-16">
            <section className="space-y-8">
              <div className="flex items-center gap-3">
                <ActivityIcon size={18} className="text-primary" />
                <h2 className="text-lg font-bold tracking-tight uppercase tracking-widest text-[11px]">System Activity</h2>
              </div>

              <div className="space-y-3">
                {activities.length > 0 ? (
                  activities.slice(0, 8).map((activity) => {
                    const isPositive = activity.points > 0;
                    return (
                      <div key={activity.id} className="p-5 rounded-2xl bg-surface-bright/30 border border-border group hover:bg-surface-bright/50 transition-all">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                            isPositive ? "bg-success/5 border-success/10 text-success" : "bg-white/5 border-white/10 text-white/20"
                          )}>
                            {activity.type === 'reward_received' || activity.type === 'task_approved' ? <Zap size={14} /> :
                             activity.type === 'level_achieved' ? <TrendingUp size={14} /> :
                             activity.type === 'referral_activated' ? <UserPlus size={14} /> : <ActivityIcon size={14} />}
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="text-[11px] font-bold text-white leading-snug group-hover:text-primary transition-colors truncate">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                               <span className={cn(
                                 "text-[8px] font-bold uppercase tracking-widest",
                                 isPositive ? "text-success" : "text-text-tertiary"
                               )}>
                                 {isPositive ? `+${activity.points} PTS` : 'System Event'}
                               </span>
                               <span className="text-[8px] text-text-tertiary font-mono">
                                {activity.timestamp?.toDate?.() ? (activity.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "N/A") : 'N/A'}
                               </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center border border-dashed border-border rounded-2xl">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">Zero Activity Pulses</p>
                  </div>
                )}
              </div>
            </section>

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

            {/* COMPLETED SUMMARY QUICK VIEW */}
            <section className="space-y-8">
               <div className="system-card bg-surface-bright/20 border-dashed border-white/5 py-10 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success border border-success/20">
                     <CheckCircle2 size={24} />
                  </div>
                  <div className="text-center">
                     <p className="text-2xl font-bold text-white tracking-tight">{userData?.stats?.tasksCompleted || 0}</p>
                     <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Campaigns Finalized</p>
                  </div>
               </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
