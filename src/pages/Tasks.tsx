import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  CheckCircle2,
  Lock,
  Clock,
  Users,
  Search,
  Activity,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, loading, getTaskStatus } = useTasks();
  const { userData } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'ENGAGEMENT' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'EVENTS' | 'SPONSORED'>('ALL');

  const filteredTasks = tasks.filter(t => filter === 'ALL' || t.category === filter as any);

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="data-label text-primary mb-2">Campaign Intelligence</p>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Active Campaigns</h1>
            </motion.div>

            <div className="flex items-center gap-2 p-1.5 bg-surface border border-border rounded-2xl overflow-x-auto no-scrollbar">
              {(['ALL', 'SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'EVENTS', 'SPONSORED'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap",
                    filter === cat ? "bg-white/5 text-white shadow-lg" : "text-text-secondary hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Missions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTasks.map((task, index) => {
            const { status } = getTaskStatus(task);
            const isLocked = task.minLevel && (userData?.level || 1) < task.minLevel;
            const isPending = status === 'pending';
            const isCompleted = status === 'completed';
            const isCooldown = status === 'cooldown';

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "system-card group relative overflow-hidden flex flex-col min-h-[420px] cursor-pointer",
                  (isLocked || isCooldown || isCompleted) && "opacity-80"
                )}
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                {/* Status Overlay */}
                {(isCompleted || isPending) && (
                  <div className="absolute inset-0 z-10 bg-surface/60 backdrop-blur-[4px] flex items-center justify-center pointer-events-none">
                    <motion.div
                       initial={{ scale: 0.9, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       className="badge-system bg-surface border-border flex items-center gap-3 px-6 py-3 shadow-2xl"
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle2 size={16} className="text-success" />
                          <span className="text-success text-xs font-bold uppercase tracking-widest">Verified</span>
                        </>
                      ) : (
                        <>
                          <Activity size={16} className="text-warning animate-pulse" />
                          <span className="text-warning text-xs font-bold uppercase tracking-widest">Audit Pending</span>
                        </>
                      )}
                    </motion.div>
                  </div>
                )}

                {/* Card Artwork Header */}
                <div className="h-40 -mx-8 -mt-8 mb-8 relative overflow-hidden">
                   {task.campaignArtwork ? (
                      <img src={task.campaignArtwork} alt="" className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-1000" />
                   ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-transparent" />
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />

                   <div className="absolute top-8 left-8 p-3 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl group-hover:border-primary/40 transition-colors">
                    {task.category === 'SOCIAL' ? <Users size={22} className="text-primary" /> :
                     task.category === 'PREDICTION' ? <Activity size={22} className="text-accent" /> :
                     task.category === 'SPONSORED' ? <ShieldCheck size={22} className="text-success" /> :
                     <Zap size={22} className="text-warning" />}
                  </div>

                  <div className="absolute top-8 right-8 flex flex-col items-end">
                     <p className="text-2xl font-mono font-bold text-white tracking-tighter">+{task.rewardAmount}</p>
                     <p className="text-[8px] uppercase tracking-[0.3em] text-primary font-bold">Reward</p>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-lg font-bold text-white/90 leading-tight group-hover:text-white transition-colors">{task.title}</h3>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{task.category}</p>
                     </div>
                     {task.endDate && (
                        <div className="text-right flex items-center gap-1.5 text-white/20">
                           <Clock size={12} />
                           <span className="text-[9px] font-bold uppercase tracking-widest">Active</span>
                        </div>
                     )}
                  </div>

                  <p className="text-[13px] text-text-secondary leading-relaxed line-clamp-3 group-hover:text-white/60 transition-colors">
                     {task.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                     <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-widest text-text-secondary">{task.verificationType}</span>
                     <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-widest text-text-secondary">{task.platform}</span>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-8 border-t border-white/5 flex items-center justify-between mt-8">
                  <div className="flex items-center gap-3">
                    {isLocked ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/20 text-[9px] font-bold text-danger uppercase tracking-widest">
                        <Lock size={12} />
                        Lvl {task.minLevel}
                      </div>
                    ) : isCooldown ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/20 text-[9px] font-bold text-warning uppercase tracking-widest">
                        <Clock size={12} />
                        Cooldown
                      </div>
                    ) : (
                       <div className="flex items-center gap-2 text-primary">
                          <Zap size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">+{task.xpReward} XP</span>
                       </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      "flex items-center gap-3 px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                      (isLocked || isCooldown || isCompleted || isPending)
                        ? "text-white/20 bg-white/5"
                        : "text-white bg-primary group-hover:bg-primary/90 shadow-lg shadow-primary/20 group-hover:gap-4"
                    )}
                  >
                    Details
                    <ArrowRight size={16} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="py-48 text-center border border-dashed border-white/5 rounded-[3rem] bg-black/20">
            <Search className="mx-auto text-white/5 mb-8" size={64} />
            <h2 className="text-xl font-bold mb-2">Sector Quiet</h2>
            <p className="text-text-secondary text-sm max-w-xs mx-auto uppercase tracking-widest font-bold">No active missions available.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tasks;
