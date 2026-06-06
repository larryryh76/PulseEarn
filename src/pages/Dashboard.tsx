import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  TrendingUp,
  Clock,
  ShieldCheck,
  ChevronRight,
  Activity as ActivityIcon,
  Star,
  Target,
  LayoutGrid,
  BarChart3,
  CreditCard,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../utils';
import { formatUSD } from '../utils/finance';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { activities, tasks, loading, getTaskStatus } = useTasks();

  const activeTasks = tasks.filter(t => t.active && getTaskStatus(t).status === 'available');
  const featuredTask = activeTasks.sort((a, b) => b.rewardAmount - a.rewardAmount)[0];

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* Dashboard Header & Quick Actions */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
          <motion.header
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="data-label text-primary mb-2">Rewards Dashboard</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Ready to <span className="text-primary">Earn?</span></h1>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-3"
          >
             {[
               { name: 'Browse Campaigns', path: '/tasks', icon: LayoutGrid },
               { name: 'Predictions', path: '/tasks', icon: BarChart3 },
               { name: 'Withdraw', path: '/wallet', icon: CreditCard },
               { name: 'Invite Friends', path: '/me', icon: UserPlus },
             ].map((action) => (
               <Link
                key={action.name}
                to={action.path}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-surface-bright border border-white/5 hover:bg-white/[0.08] hover:border-primary/30 transition-all group shadow-subtle"
               >
                 <action.icon size={16} className="text-white/40 group-hover:text-primary transition-colors" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">{action.name}</span>
               </Link>
             ))}
          </motion.div>
        </div>

        {/* FEATURED CAMPAIGN HERO */}
        {featuredTask && (
           <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
           >
              <Link to={`/tasks/${featuredTask.id}`} className="relative block w-full aspect-[21/9] md:aspect-[21/7] rounded-[3rem] border border-white/10 overflow-hidden group shadow-premium bg-surface-bright">
                 {featuredTask.campaignArtwork ? (
                   <img src={featuredTask.campaignArtwork} alt={featuredTask.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
                 ) : (
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-surface-bright to-surface" />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent p-8 md:p-12 flex flex-col justify-end">
                    <div className="max-w-2xl">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="px-3 py-1 rounded-full bg-primary text-white shadow-lg">
                             <span className="text-[10px] font-bold uppercase tracking-widest">Featured Opportunity</span>
                          </div>
                       </div>
                       <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-none group-hover:text-primary transition-colors">{featuredTask.title}</h2>
                       <p className="text-base md:text-lg text-white/70 mb-8 line-clamp-2 leading-relaxed font-medium">{featuredTask.description}</p>
                       <div className="flex items-center gap-6">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl">
                                <Zap className="text-primary" size={28} />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Earn up to</p>
                                <p className="text-2xl font-mono font-bold text-white">{featuredTask.rewardAmount.toLocaleString()} <span className="text-xs text-white/40">PTS</span></p>
                             </div>
                          </div>
                          <div className="w-px h-12 bg-white/10" />
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-xl">
                                <TrendingUp className="text-accent" size={28} />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-0.5">Progression</p>
                                <p className="text-2xl font-mono font-bold text-white">+{featuredTask.xpReward} <span className="text-xs text-white/40">XP</span></p>
                             </div>
                          </div>
                          <div className="flex-grow" />
                          <div className="hidden lg:flex items-center gap-3 bg-white text-black px-10 py-5 rounded-[2rem] font-bold uppercase tracking-[0.2em] text-xs shadow-2xl hover:scale-105 active:scale-95 transition-all">
                             Complete Now <ArrowRight size={18} />
                          </div>
                       </div>
                    </div>
                 </div>
              </Link>
           </motion.section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-12">

            {/* Active Campaigns - Grid View */}
            <section>
              <div className="flex items-center justify-between mb-10">
                <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight">
                  <Star size={24} className="text-primary" />
                  Available Rewards
                </h2>
                <Link to="/tasks" className="text-[11px] font-bold uppercase tracking-widest text-primary hover:text-white transition-colors flex items-center gap-2 group">
                  Open Marketplace <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeTasks.slice(1, 5).map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks/${task.id}`}
                    className="group card-premium flex flex-col gap-6"
                  >
                    <div className="flex justify-between items-start">
                       <div className="w-14 h-14 rounded-2xl bg-background border border-white/5 flex items-center justify-center shadow-xl group-hover:border-primary/40 transition-colors">
                          <Target size={28} className="text-white/20 group-hover:text-primary transition-colors" />
                       </div>
                       <div className="text-right">
                          <p className="text-xl font-mono font-bold text-primary">+{task.rewardAmount.toLocaleString()}</p>
                          <p className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.2em]">PTS REWARD</p>
                       </div>
                    </div>
                    <div>
                       <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">{task.title}</h3>
                       <p className="text-sm text-text-secondary leading-relaxed line-clamp-2 font-medium">{task.description}</p>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                       <span className="badge-system bg-background">{task.category}</span>
                       <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                          Start <ArrowRight size={14} />
                       </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Account Progress Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="card-premium relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                     <CreditCard size={120} />
                  </div>
                  <div className="flex justify-between items-start mb-12">
                     <p className="data-label text-primary">Wallet Overview</p>
                     <Zap size={24} className="text-primary" />
                  </div>
                  <p className="text-5xl font-mono font-bold text-white tracking-tighter mb-4">
                    {userData?.points.toLocaleString() || '0'}
                    <span className="text-lg ml-3 text-white/20 uppercase tracking-widest font-sans">PTS</span>
                  </p>
                  <div className="flex items-center gap-3 text-text-secondary font-bold text-sm">
                     <span>Estimated Value:</span>
                     <span className="text-white bg-white/5 px-3 py-1 rounded-lg border border-white/5">{formatUSD((userData?.points || 0) / 1000)}</span>
                  </div>
               </div>

               <div className="card-premium">
                  <div className="flex justify-between items-start mb-8">
                     <p className="data-label text-accent">Account Rank</p>
                     <TrendingUp size={24} className="text-accent" />
                  </div>
                  <div className="flex items-baseline gap-4 mb-6">
                     <p className="text-4xl font-bold text-white">Level {userData?.level || 1}</p>
                     <p className="text-xs font-bold text-white/30 uppercase tracking-widest">{userData?.xp || 0} Total XP</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-text-secondary">Progress to Level {(userData?.level || 1) + 1}</span>
                       <span className="text-white">{(userData?.xp || 0) % 1000} / 1000</span>
                    </div>
                    <div className="h-3 bg-background rounded-full overflow-hidden border border-white/5 p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((userData?.xp || 0) % 1000) / 10, 100)}%` }}
                        className="h-full bg-gradient-to-r from-accent to-primary rounded-full"
                      />
                    </div>
                  </div>
               </div>
            </section>
          </div>

          {/* Sidebar / Secondary Modules */}
          <div className="lg:col-span-4 space-y-12">

            {/* Real Reward Feed */}
            <section className="card-premium">
              <h2 className="flex items-center gap-3 text-lg font-bold mb-8">
                <ActivityIcon size={20} className="text-primary" />
                Reward Stream
              </h2>
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.slice(0, 5).map((activity) => {
                    const isPositive = activity.points > 0;
                    return (
                      <div key={activity.id} className="flex items-start gap-4 p-4 rounded-2xl bg-background border border-white/5 hover:border-white/10 transition-all group">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                          isPositive ? "bg-success/5 border-success/10 text-success" : "bg-white/5 border-white/10 text-white/20"
                        )}>
                          {activity.type === 'reward_received' || activity.type === 'task_approved' ? <Zap size={18} /> :
                           activity.type === 'level_achieved' ? <TrendingUp size={18} /> :
                           activity.type === 'referral_activated' ? <UserPlus size={18} /> : <ActivityIcon size={18} />}
                        </div>
                        <div className="flex-grow overflow-hidden">
                          <p className="text-[12px] font-bold text-white group-hover:text-primary transition-colors truncate mb-1">{activity.description}</p>
                          <div className="flex justify-between items-center">
                             <span className={cn(
                               "text-[10px] font-bold uppercase tracking-widest",
                               isPositive ? "text-success" : "text-white/20"
                             )}>
                               {isPositive ? `+${activity.points} PTS` : 'System Event'}
                             </span>
                             <span className="text-[9px] text-white/10 font-mono">
                                {activity.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-background/50">
                    <ActivityIcon className="mx-auto text-white/5 mb-4" size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Awaiting first activity</p>
                  </div>
                )}
              </div>
            </section>

            {/* Performance Widget */}
            <div className="card-premium text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
               <Clock size={40} className="mx-auto text-primary mb-6" />
               <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-2">Current streak</h3>
               <p className="text-5xl font-mono font-bold text-white mb-2">{userData?.streak || 0}</p>
               <p className="text-xs font-bold text-success uppercase tracking-widest">Active Reward Multiplier: 1.0x</p>
            </div>

            {/* Help & Integrity Link */}
            <Link to="/support" className="flex items-center justify-between p-6 rounded-[2rem] bg-primary text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all group">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                     <ShieldCheck size={24} />
                  </div>
                  <div>
                     <p className="text-sm font-bold tracking-tight">Security Center</p>
                     <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Review policies</p>
                  </div>
               </div>
               <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
