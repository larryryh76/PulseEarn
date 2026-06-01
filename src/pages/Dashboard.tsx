import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Shield,
  ChevronRight,
  Activity as ActivityIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { activities, tasks, loading } = useTasks();

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
            <p className="data-label text-primary mb-2">Command Center</p>
            <h1>Overview</h1>
          </motion.div>
        </header>

        {/* Primary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="system-card flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Zap size={20} />
              </div>
              <span className="badge-system text-primary">PTS Balance</span>
            </div>
            <div>
              <p className="data-mono text-2xl font-semibold text-white">
                {userData?.points.toLocaleString() || '0'}
              </p>
              <p className="text-xs mt-1">Available rewards</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="system-card flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-accent/10 rounded-lg text-accent">
                <TrendingUp size={20} />
              </div>
              <span className="badge-system text-accent">Level {userData?.level || 1}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-text-secondary uppercase font-bold tracking-wider">XP Progression</span>
                <span className="text-white font-mono">{userData?.xp || 0} / 1,000</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-success/10 rounded-lg text-success">
                <Clock size={20} />
              </div>
              <span className="badge-system text-success">{userData?.streak || 0} Day Streak</span>
            </div>
            <div>
              <p className="data-mono text-2xl font-semibold text-white">Active</p>
              <p className="text-xs mt-1">Next reward in 14h</p>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            {/* Missions Preview */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2">
                  <Shield size={18} className="text-primary" />
                  Priority Missions
                </h2>
                <Link to="/tasks" className="text-xs font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                  View All <ChevronRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {tasks.slice(0, 3).map((task) => (
                  <Link key={task.id} to="/tasks" className="system-card p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Zap size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium">{task.title}</h3>
                        <p className="text-xs">{task.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs font-bold text-white">+{task.rewardAmount} PTS</p>
                        <p className="text-[10px] uppercase tracking-wider text-text-secondary">Instant</p>
                      </div>
                      <ArrowUpRight size={16} className="text-text-secondary group-hover:text-white transition-colors" />
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
                Recent Signals
              </h2>
              <div className="space-y-1">
                {activities.length > 0 ? (
                  activities.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="ledger-row group">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <div>
                          <p className="text-[13px] text-white/80 line-clamp-1">{activity.description}</p>
                          <p className="text-[10px] text-text-secondary uppercase font-mono mt-0.5">
                            {activity.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl">
                    <p className="text-xs text-text-secondary">No recent signals detected</p>
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
