import React, { useState, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Target, Grid, List, ChevronRight, Zap, Trophy, Users, Gift, Flame, Lock, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { auth } from '../firebase/config';
import { safeFetch } from '../utils/api';
import { Task } from '../types';

const Tasks: React.FC = () => {
  const { tasks, loading, getTaskStatus } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proof, setProof] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categorize tasks
  const categories = useMemo(() => {
    const cats: Record<string, { label: string; count: number; icon: any; color: string }> = {
      automated: { label: 'Automated', count: 0, icon: Zap, color: 'from-yellow-500/10 to-yellow-500/5' },
      manual: { label: 'Manual Verification', count: 0, icon: Target, color: 'from-blue-500/10 to-blue-500/5' },
      campaign: { label: 'Campaigns', count: 0, icon: Trophy, color: 'from-purple-500/10 to-purple-500/5' },
      referral: { label: 'Referral', count: 0, icon: Users, color: 'from-green-500/10 to-green-500/5' },
      welcome: { label: 'Welcome', count: 0, icon: Gift, color: 'from-pink-500/10 to-pink-500/5' },
      level: { label: 'Level Progression', count: 0, icon: Flame, color: 'from-orange-500/10 to-orange-500/5' },
    };
    
    tasks.forEach(t => {
      const key = t.verificationType || 'automated';
      if (cats[key]) cats[key].count++;
    });
    
    return cats;
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || (t.verificationType || 'automated') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [tasks, searchTerm, selectedCategory]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: tasks.length,
    available: filteredTasks.length,
    avgReward: filteredTasks.length > 0 ? Math.round(filteredTasks.reduce((sum, t) => sum + t.rewardAmount, 0) / filteredTasks.length) : 0,
  }), [tasks, filteredTasks]);

  const getTaskIcon = (verificationType?: string) => {
    const type = verificationType || 'automated';
    const iconMap: Record<string, any> = {
      automated: Zap,
      manual: Target,
      campaign: Trophy,
      referral: Users,
      welcome: Gift,
      level: Flame,
    };
    return iconMap[type] || Target;
  };

  const getTaskColor = (verificationType?: string) => {
    const type = verificationType || 'automated';
    const colorMap: Record<string, string> = {
      automated: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
      manual: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
      campaign: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
      referral: 'bg-green-500/20 border-green-500/30 text-green-400',
      welcome: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
      level: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
    };
    return colorMap[type] || colorMap.automated;
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;
    if (selectedTask.verificationType !== 'automated' && !proof.trim()) {
      return toast.error("Please provide proof of completion.");
    }

    setIsSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const data = await safeFetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          taskId: selectedTask.id, 
          proof: proof || 'AUTOMATED_VALIDATION' 
        })
      });

      if (data.success) {
        toast.success(data.automated ? 'Task Completed!' : 'Submitted for Review');
        setSelectedTask(null);
        setProof('');
      } else {
        toast.error(data.message || data.error || 'Submission failed');
      }
    } catch (err) {
      toast.error('System error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-32 px-6 text-center animate-pulse">
        <div className="inline-block">
          <div className="h-2 w-48 bg-surface-bright rounded mb-4" />
          <div className="h-10 w-64 bg-surface-bright rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-32 pb-24 px-4 md:px-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-primary" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-text-tertiary">Quest Marketplace</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-text-primary tracking-tighter uppercase">Opportunities</h1>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-surface border border-border">
            <p className="text-xs md:text-sm text-text-tertiary font-bold mb-1">AVAILABLE</p>
            <p className="text-2xl md:text-3xl font-black text-primary">{stats.available}</p>
          </div>
          <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-surface border border-border">
            <p className="text-xs md:text-sm text-text-tertiary font-bold mb-1">TOTAL</p>
            <p className="text-2xl md:text-3xl font-black text-text-primary">{stats.total}</p>
          </div>
          <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-surface border border-border">
            <p className="text-xs md:text-sm text-text-tertiary font-bold mb-1">AVG REWARD</p>
            <p className="text-2xl md:text-3xl font-black text-success">+{stats.avgReward}</p>
          </div>
        </div>

        {/* Search & Controls */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1 relative">
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search quests..."
              className="w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl bg-surface border border-border focus:border-primary/50 outline-none transition-all text-sm md:text-base"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="px-4 py-3 md:py-4 rounded-xl md:rounded-2xl bg-surface border border-border hover:border-primary/50 transition-all"
            >
              {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-3 -mx-4 md:-mx-6 px-4 md:px-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 md:py-3 rounded-lg md:rounded-xl whitespace-nowrap font-bold text-xs md:text-sm transition-all shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-primary text-background'
              : 'bg-surface border border-border hover:border-primary/50'
          }`}
        >
          All ({stats.total})
        </button>
        {Object.entries(categories).map(([key, cat]) => {
          const IconComponent = cat.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl whitespace-nowrap font-bold text-xs md:text-sm transition-all shrink-0 ${
                selectedCategory === key
                  ? 'bg-primary text-background'
                  : 'bg-surface border border-border hover:border-primary/50'
              }`}
            >
              <IconComponent size={14} className="md:w-4 md:h-4" />
              {cat.label} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Tasks Grid/List */}
      {filteredTasks.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'
          : 'space-y-4'
        }>
          {filteredTasks.map((task) => {
            const TaskIcon = getTaskIcon(task.verificationType);
            const taskStatus = getTaskStatus(task).status;
            const isPending = taskStatus === 'pending';
            const isRejected = taskStatus === 'rejected';
            const isLocked = isPending; // pending tasks cannot be re-executed
            return (
              <motion.div
                key={task.id}
                whileHover={{ y: isLocked ? 0 : -4 }}
                onClick={() => { if (!isLocked) setSelectedTask(task); }}
                className={`group rounded-2xl border transition-all overflow-hidden ${
                  isLocked
                    ? 'cursor-not-allowed border-warning/30 opacity-80'
                    : 'cursor-pointer border-border hover:border-primary/50'
                } ${
                  viewMode === 'grid'
                    ? 'p-6 bg-surface hover:bg-surface-bright space-y-4'
                    : 'p-4 md:p-6 bg-surface hover:bg-surface-bright flex items-center justify-between'
                }`}
              >
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <>
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getTaskColor(task.verificationType)}`}>
                        <TaskIcon size={20} />
                      </div>
                      <span className={`text-xs md:text-sm font-black px-3 py-1 rounded-lg border ${getTaskColor(task.verificationType)}`}>
                        {task.verificationType || 'AUTOMATED'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg md:text-xl font-black text-text-primary group-hover:text-primary transition-colors uppercase italic">{task.title}</h3>
                      <p className="text-xs md:text-sm text-text-secondary leading-relaxed line-clamp-2">{task.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                        <p className="text-xs text-text-tertiary font-bold mb-1">PTS</p>
                        <p className="text-lg md:text-xl font-black text-success">+{task.rewardAmount}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-xs text-text-tertiary font-bold mb-1">XP</p>
                        <p className="text-lg md:text-xl font-black text-primary">+{task.xpReward}</p>
                      </div>
                    </div>
                    {isPending ? (
                      <div className="w-full py-3 rounded-lg bg-warning/15 border border-warning/30 text-warning font-black uppercase text-xs md:text-sm text-center flex items-center justify-center gap-2">
                        <Clock size={14} /> Pending Review
                      </div>
                    ) : isRejected ? (
                      <button className="w-full py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger hover:bg-danger/20 font-black uppercase text-xs md:text-sm transition-all">
                        Rejected · Retry
                      </button>
                    ) : (
                      <button className="w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-background font-black uppercase text-xs md:text-sm transition-all">
                        Execute
                      </button>
                    )}
                  </>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${getTaskColor(task.verificationType)}`}>
                          <TaskIcon size={18} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base md:text-lg font-black text-text-primary group-hover:text-primary transition-colors uppercase italic truncate">{task.title}</h3>
                          <p className="text-xs text-text-tertiary">{task.verificationType || 'AUTOMATED'}</p>
                        </div>
                      </div>
                      <p className="text-xs md:text-sm text-text-secondary ml-13 line-clamp-1">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4 shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-xs text-text-tertiary font-bold">PTS</p>
                        <p className="text-lg md:text-xl font-black text-success">+{task.rewardAmount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-text-tertiary font-bold">XP</p>
                        <p className="text-lg md:text-xl font-black text-primary">+{task.xpReward}</p>
                      </div>
                      {isPending ? (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/15 border border-warning/30 text-warning font-black uppercase text-[10px]">
                          <Clock size={12} /> Pending
                        </span>
                      ) : isRejected ? (
                        <span className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger font-black uppercase text-[10px]">
                          Rejected
                        </span>
                      ) : (
                        <ChevronRight className="text-text-tertiary group-hover:translate-x-1 transition-transform" />
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 md:py-24">
          <Lock size={48} className="mx-auto text-text-tertiary mb-4 opacity-50" />
          <h3 className="text-xl md:text-2xl font-black text-text-secondary mb-2">No Opportunities Found</h3>
          <p className="text-sm md:text-base text-text-tertiary">Check back soon for new quests</p>
        </div>
      )}

      {/* Task Submission Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setSelectedTask(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 md:p-8 border-b border-border flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${getTaskColor(selectedTask.verificationType)}`}>
                    {React.createElement(getTaskIcon(selectedTask.verificationType), { size: 24 })}
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-black text-text-primary uppercase italic mb-1">{selectedTask.title}</h2>
                    <p className="text-xs text-text-tertiary font-bold">{selectedTask.verificationType || 'AUTOMATED'} • {selectedTask.rewardAmount} PTS</p>
                  </div>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-surface-bright rounded-lg transition-all text-text-tertiary disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
                <div>
                  <p className="text-text-secondary leading-relaxed text-sm md:text-base">{selectedTask.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                    <p className="text-xs text-text-tertiary font-bold mb-1">REWARD</p>
                    <p className="text-2xl font-black text-success">+{selectedTask.rewardAmount}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-xs text-text-tertiary font-bold mb-1">BONUS XP</p>
                    <p className="text-2xl font-black text-primary">+{selectedTask.xpReward}</p>
                  </div>
                </div>

                {selectedTask.verificationType !== 'automated' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-text-tertiary uppercase tracking-wide">Proof of Execution</label>
                    <textarea
                      value={proof}
                      onChange={e => setProof(e.target.value)}
                      placeholder="Enter URL, username, or details..."
                      className="w-full h-24 bg-surface-bright border border-border rounded-lg p-3 text-sm focus:border-primary/50 outline-none transition-all resize-none"
                    />
                  </div>
                )}
              </div>

              <div className="p-6 md:p-8 border-t border-border flex gap-3">
                <button
                  onClick={() => setSelectedTask(null)}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-lg bg-surface-bright border border-border hover:border-text-tertiary transition-all font-bold text-sm uppercase disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  className="flex-1 py-3 rounded-lg uppercase font-black text-sm"
                >
                  {selectedTask.verificationType === 'automated' ? 'Complete' : 'Submit'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
