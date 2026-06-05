import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  TrendingUp,
  Clock,
  Shield,
  ChevronRight,
  Activity as ActivityIcon,
  Star,
  Target,
  LayoutGrid,
  BarChart3,
  CreditCard,
  UserPlus,
  ArrowRight,
  AlertCircle
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
        {/* Command Header & Quick Actions */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
          <motion.header
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="data-label text-primary mb-2">Earning Operating Center</p>
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
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-primary/30 transition-all group"
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
              <Link to="/tasks" className="relative block w-full aspect-[21/9] md:aspect-[21/7] rounded-[2.5rem] border border-white/5 overflow-hidden group">
                 {featuredTask.campaignArtwork ? (
                   <img src={featuredTask.campaignArtwork} alt={featuredTask.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                 ) : (
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-surface to-surface" />
                 )}
                 <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent p-8 md:p-12 flex flex-col justify-end">
                    <div className="max-w-2xl">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md">
                             <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Featured High-Yield</span>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-success/20 border border-success/30 backdrop-blur-md">
                             <span className="text-[10px] font-bold text-success uppercase tracking-widest">Ends in 48h</span>
                          </div>
                       </div>
                       <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-none">{featuredTask.title}</h2>
                       <p className="text-base md:text-lg text-white/60 mb-8 line-clamp-2 leading-relaxed">{featuredTask.description}</p>
                       <div className="flex items-center gap-6">
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <Zap className="text-primary" size={24} />
                             </div>
                             <div>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Reward</p>
                                <p className="text-xl font-mono font-bold text-white">{featuredTask.rewardAmount.toLocaleString()} <span className="text-[10px] text-white/40">PTS</span></p>
                             </div>
                          </div>
                          <div className="w-px h-10 bg-white/10" />
                          <div className="flex items-center gap-3">
                             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <TrendingUp className="text-accent" size={24} />
                             </div>
                             <div>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Progression</p>
                                <p className="text-xl font-mono font-bold text-white">+{featuredTask.xpReward} <span className="text-[10px] text-white/40">XP</span></p>
                             </div>
                          </div>
                          <div className="flex-grow" />
                          <div className="hidden sm:flex items-center gap-2 group-hover:gap-4 transition-all bg-white text-black px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs">
                             Start Now <ArrowRight size={16} />
                          </div>
                       </div>
                    </div>
                 </div>
              </Link>
           </motion.section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
          {/* Main Earning Flow */}
          <div className="lg:col-span-2 space-y-12">
            {/* Active Campaigns List */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="flex items-center gap-3 text-xl font-bold">
                  <Star size={20} className="text-primary" />
                  Earning Opportunities
                </h2>
                <Link to="/tasks" className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-primary transition-colors flex items-center gap-2">
                  View Marketplace <ChevronRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {activeTasks.length > 0 ? (
                  activeTasks.slice(0, 6).map((task) => (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className="group bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-primary/20 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.25rem] bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shrink-0">
                          <Target size={28} className="text-white/20 group-hover:text-primary transition-colors" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                             <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{task.title}</h3>
                             <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-bold uppercase tracking-widest text-white/40">{task.category}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                             <div className="flex items-center gap-2">
                                <Zap size={14} className="text-primary" />
                                <span className="text-[10px] font-mono font-bold text-white/60">+{task.rewardAmount} PTS</span>
                             </div>
                             <div className="w-1 h-1 rounded-full bg-white/10" />
                             <div className="flex items-center gap-2">
                                <TrendingUp size={14} className="text-accent" />
                                <span className="text-[10px] font-mono font-bold text-white/60">+{task.xpReward} XP</span>
                             </div>
                             <div className="w-1 h-1 rounded-full bg-white/10" />
                             <div className="flex items-center gap-2">
                                <Shield size={14} className="text-text-secondary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{task.verificationType}</span>
                             </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-8 pt-4 md:pt-0 border-t md:border-0 border-white/5">
                        <div className="text-left md:text-right">
                           <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-1">Status</p>
                           <p className="text-[10px] font-bold text-success uppercase tracking-widest flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                              Open for Claim
                           </p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-white transition-all text-white/20">
                           <ArrowRight size={20} />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="py-20 text-center border border-dashed border-white/5 rounded-[3rem] bg-black/20">
                    <AlertCircle className="mx-auto text-white/5 mb-4" size={48} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">No campaigns available</h3>
                    <p className="text-xs text-white/20 mt-2">Check back later for new earning opportunities.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Secondary Status Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="system-card bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                  <div className="flex justify-between items-start mb-10">
                     <p className="data-label text-primary">Wallet Assets</p>
                     <Zap size={20} className="text-primary" />
                  </div>
                  <p className="text-4xl font-mono font-bold text-white mb-2">{userData?.points.toLocaleString()} <span className="text-xs text-white/20 uppercase tracking-widest">PTS</span></p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">≈ {formatUSD((userData?.points || 0) / 1000)} USD</p>
               </div>
               <div className="system-card">
                  <div className="flex justify-between items-start mb-6">
                     <p className="data-label text-accent">Rank Progress</p>
                     <TrendingUp size={20} className="text-accent" />
                  </div>
                  <div className="flex items-baseline gap-3 mb-4">
                     <p className="text-3xl font-bold text-white">LVL {userData?.level}</p>
                     <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{userData?.xp} XP Total</p>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((userData?.xp || 0) % 1000) / 10, 100)}%` }}
                      className="h-full bg-accent"
                    />
                  </div>
               </div>
            </section>
          </div>

          {/* Activity & Ecosystem Intelligence */}
          <div className="space-y-12">
            <section>
              <h2 className="flex items-center gap-3 text-lg font-bold mb-8">
                <ActivityIcon size={20} className="text-primary" />
                System Activity
              </h2>
              <div className="space-y-3">
                {activities.length > 0 ? (
                  activities.slice(0, 8).map((activity) => {
                    const isPositive = activity.points > 0;
                    return (
                      <div key={activity.id} className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                            isPositive ? "bg-success/5 border-success/10 text-success" : "bg-white/5 border-white/10 text-white/20"
                          )}>
                            {activity.type === 'reward_received' || activity.type === 'task_approved' ? <Zap size={18} /> :
                             activity.type === 'level_achieved' ? <TrendingUp size={18} /> :
                             activity.type === 'referral_activated' ? <UserPlus size={18} /> : <ActivityIcon size={18} />}
                          </div>
                          <div className="flex-grow overflow-hidden">
                            <p className="text-[11px] font-bold text-white leading-tight mb-1 group-hover:text-primary transition-colors truncate">{activity.description}</p>
                            <div className="flex items-center gap-3">
                               <span className={cn(
                                 "text-[8px] font-bold uppercase tracking-widest",
                                 isPositive ? "text-success" : "text-white/20"
                               )}>
                                 {isPositive ? `+${activity.points} PTS` : 'Event Logged'}
                               </span>
                               <span className="text-[8px] text-white/10 font-mono">
                                {activity.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center border border-dashed border-white/5 rounded-[2.5rem] bg-black/10">
                    <ActivityIcon className="mx-auto text-white/5 mb-4" size={32} />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20">No data streams found</p>
                  </div>
                )}
              </div>
            </section>

            {/* Streak / secondary card */}
            <div className="system-card border-dashed border-white/10 bg-transparent text-center py-10">
               <Clock size={32} className="mx-auto text-white/10 mb-6" />
               <p className="text-3xl font-mono font-bold text-white mb-1">{userData?.streak || 0} Days</p>
               <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Active Session Streak</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
