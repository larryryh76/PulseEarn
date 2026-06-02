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
  Target
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { activities, tasks, loading } = useTasks();

  const featuredTasks = tasks.filter(t => t.active).slice(0, 3);

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
        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="data-label text-primary mb-2">Operator Command Center</p>
            <h1>Overview</h1>
          </motion.div>
        </header>

        {/* Primary Stats Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="system-card lg:col-span-2 flex flex-col justify-between bg-gradient-to-br from-primary/10 to-transparent border-primary/20"
          >
            <div className="flex justify-between items-start mb-12">
              <div>
                 <p className="data-label text-primary mb-1">Vault Status</p>
                 <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Secured & Active</span>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <Zap size={24} />
              </div>
            </div>
            <div>
              <p className="text-5xl font-mono font-bold text-white tracking-tighter">
                {userData?.points.toLocaleString() || '0'}
                <span className="text-xs ml-3 text-text-secondary">PTS</span>
              </p>
              <p className="text-xs mt-4 text-text-secondary uppercase tracking-[0.2em] font-bold">Equivalent: ${(userData?.points || 0) / 1000} USD</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="system-card flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-8">
               <div>
                  <p className="data-label text-accent mb-1">Rank Status</p>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Level {userData?.level || 1}</span>
               </div>
               <div className="p-2 bg-accent/10 rounded-lg text-accent">
                <TrendingUp size={20} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3 text-text-secondary">
                <span>Experience</span>
                <span className="text-white font-mono">{userData?.xp || 0} / 1,000</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((userData?.xp || 0) / 1000) * 100, 100)}%` }}
                  className="h-full bg-accent"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="system-card flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-8">
               <div>
                  <p className="data-label text-success mb-1">Activity</p>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Pulse Locked</span>
               </div>
               <div className="p-2 bg-success/10 rounded-lg text-success">
                <Clock size={20} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-mono font-bold text-white tracking-tight">{userData?.streak || 0} Day Streak</p>
              <p className="text-[10px] mt-4 text-text-secondary uppercase tracking-widest font-bold">Multiplier: 1.0x</p>
            </div>
          </motion.div>
        </div>

        {/* Featured Campaigns Banners */}
        {featuredTasks.length > 0 && (
           <section className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                 <Star size={16} className="text-primary" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Active Campaigns</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {featuredTasks.map((task) => (
                    <Link key={task.id} to="/tasks" className="relative group overflow-hidden rounded-3xl border border-white/5 aspect-[16/9]">
                       {task.campaignArtwork ? (
                          <img src={task.campaignArtwork} alt={task.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                       ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-black" />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-8 flex flex-col justify-end">
                          <div className="flex items-center gap-2 mb-3">
                             <span className="px-2 py-0.5 rounded bg-primary text-[8px] font-bold uppercase tracking-widest">Featured</span>
                             <span className="text-[10px] font-mono font-bold text-white">+{task.rewardAmount} PTS</span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2">{task.title}</h3>
                          <p className="text-xs text-white/60 line-clamp-1">{task.description}</p>
                       </div>
                    </Link>
                 ))}
              </div>
           </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Missions Preview */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2">
                  <Shield size={18} className="text-primary" />
                  Terminal Missions
                </h2>
                <Link to="/tasks" className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 hover:gap-3 transition-all">
                  View All Missions <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {tasks.slice(0, 4).map((task) => (
                  <Link key={task.id} to="/tasks" className="system-card p-5 flex items-center justify-between group bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-primary/40 transition-colors">
                        <Target size={20} className="text-white/20 group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white/90">{task.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                           <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">{task.category}</span>
                           <div className="w-1 h-1 rounded-full bg-white/10" />
                           <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">{task.verificationType}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm font-mono font-bold text-primary">+{task.rewardAmount}</p>
                        <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Yield</p>
                      </div>
                      <ChevronRight size={18} className="text-text-secondary group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-12">
            {/* Activity Feed */}
            <section>
              <h2 className="flex items-center gap-2 mb-6">
                <ActivityIcon size={18} className="text-accent" />
                Activity Feed
              </h2>
              <div className="space-y-2">
                {activities.length > 0 ? (
                  activities.slice(0, 6).map((activity) => (
                    <div key={activity.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5" />
                        <div>
                          <p className="text-[12px] font-medium text-white/80 leading-relaxed mb-1">{activity.description}</p>
                          <div className="flex items-center gap-3">
                             <span className="text-[9px] text-accent font-bold uppercase tracking-widest">Activity Logged</span>
                             <span className="text-[9px] text-text-secondary font-mono">
                              {activity.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center border border-dashed border-border rounded-3xl bg-black/20">
                    <ActivityIcon className="mx-auto text-white/5 mb-4" size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">No recent activity</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
