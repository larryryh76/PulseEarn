import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  CheckCircle2,
  Lock,
  ChevronRight,
  Clock,
  Users,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { mapSystemError } from '../utils/errors';

const Tasks: React.FC = () => {
  const { tasks, loading, submitTask, getTaskStatus } = useTasks();
  const { userData } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'DAILY' | 'REFERRAL'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const filteredTasks = tasks.filter(t => filter === 'ALL' || t.category === filter);

  const handleTaskClick = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const { status } = getTaskStatus(task);
    if (status !== 'available' && status !== 'rejected') return;

    setIsSubmitting(taskId);
    try {
      const result = await submitTask(taskId);
      if (result.success) {
        if (task.verificationType === 'automated') {
          toast.success(`+${task.rewardAmount} PTS Secured`, { icon: '⚡' });
        } else {
          toast.success('Mission proof logged for audit');
        }
      } else {
        toast.error(mapSystemError(result.error || '') || 'Action failed');
      }
    } catch (err) {
      toast.error('System synchronization error');
    } finally {
      setIsSubmitting(null);
    }
  };

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
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="data-label text-primary mb-2">Missions Terminal</p>
              <h1>Earn Rewards</h1>
            </motion.div>

            <div className="flex items-center gap-2 p-1 bg-surface border border-border rounded-xl">
              {(['ALL', 'SOCIAL', 'DAILY', 'REFERRAL'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    filter === cat ? "bg-white/5 text-white" : "text-text-secondary hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Missions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  "system-card group relative overflow-hidden flex flex-col",
                  (isLocked || isCooldown || isCompleted) && "opacity-75"
                )}
              >
                {/* Status Overlay */}
                {(isCompleted || isPending) && (
                  <div className="absolute inset-0 z-10 bg-surface/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <div className="badge-system bg-surface border-border flex items-center gap-2 px-4 py-2 scale-110">
                      {isCompleted ? (
                        <>
                          <CheckCircle2 size={14} className="text-success" />
                          <span className="text-success">Claimed</span>
                        </>
                      ) : (
                        <>
                          <Clock size={14} className="text-warning" />
                          <span className="text-warning">Audit Pending</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                    {task.category === 'SOCIAL' ? <Users size={24} /> : <Zap size={24} />}
                  </div>
                  <div className="text-right">
                    <p className="data-mono text-lg font-bold text-white">+{task.rewardAmount}</p>
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary">PTS</p>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="mb-2">{task.title}</h3>
                  <p className="text-xs line-clamp-2 mb-6">{task.description}</p>
                </div>

                {/* Action Footer */}
                <div className="pt-6 border-t border-border flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-3">
                    {isLocked ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-danger uppercase tracking-wider">
                        <Lock size={12} />
                        Level {task.minLevel}
                      </div>
                    ) : isCooldown ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-warning uppercase tracking-wider">
                        <Clock size={12} />
                        Next in 14h
                      </div>
                    ) : (
                      <span className="badge-system">{task.category}</span>
                    )}
                  </div>

                  <button
                    disabled={isLocked || isCooldown || isCompleted || isPending || isSubmitting === task.id}
                    onClick={() => handleTaskClick(task.id)}
                    className={cn(
                      "flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest transition-all",
                      (isLocked || isCooldown || isCompleted || isPending)
                        ? "text-text-secondary cursor-not-allowed"
                        : "text-primary hover:gap-3"
                    )}
                  >
                    {isSubmitting === task.id ? (
                      <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <>
                        Execute
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredTasks.length === 0 && (
          <div className="py-32 text-center border border-dashed border-border rounded-3xl">
            <Search className="mx-auto text-white/10 mb-4" size={48} />
            <p className="text-text-secondary">No missions found matching your deployment criteria</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tasks;
