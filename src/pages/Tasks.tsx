import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  Clock,
  CheckCircle2,
  Search,
  Award,
  Loader2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { TaskCategory } from '../types';

const Tasks: React.FC = () => {
  const { userData } = useAuth();
  const { tasks, submitTask, getTaskStatus, loading } = useTasks();
  const [activeCategory, setActiveCategory] = useState<TaskCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const categories: (TaskCategory | 'ALL')[] = ['ALL', 'SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'STREAK'];

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = activeCategory === 'ALL' || task.category === activeCategory;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAction = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.actionUrl && task.verificationType === 'proof') {
       window.open(task.actionUrl, '_blank');
    }

    setIsSubmitting(taskId);
    await submitTask(taskId);
    setIsSubmitting(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 animate-in">
        {/* Market Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Mission Marketplace</h2>
            <h1 className="text-4xl font-bold tracking-tight text-glow">Earning Terminal</h1>
            <p className="text-sm text-white/40 max-w-lg">
              Engage with authorized ecosystem partners to secure Pulse and XP rewards.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Operational Tier</span>
                <span className="text-xs font-bold text-primary">LVL {userData?.level || 1}</span>
             </div>
          </div>
        </section>

        {/* Intelligence Controls */}
        <section className="flex flex-col lg:flex-row gap-4 items-center justify-between">
           <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 w-full lg:w-fit overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shrink-0 ${
                      activeCategory === cat ? 'bg-primary text-white shadow-lg' : 'text-white/30 hover:text-white/60'
                   }`}
                 >
                    {cat}
                 </button>
              ))}
           </div>

           <div className="relative w-full lg:w-80 group">
              <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Scan missions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs focus:ring-1 focus:ring-primary/20 outline-none"
              />
           </div>
        </section>

        {/* Mission Center */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {loading ? (
              [1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-64 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] animate-pulse" />
              ))
           ) : filteredTasks.length === 0 ? (
              <div className="col-span-full py-20 text-center glass-panel rounded-[3rem] border-white/5">
                 <Search size={48} className="mx-auto mb-6 opacity-10" />
                 <h3 className="text-xl font-bold opacity-40">No Signal Detected</h3>
                 <p className="text-sm opacity-20 mt-2">Adjust your filters or standby for new ecosystem deployments.</p>
              </div>
           ) : (
              filteredTasks.map(task => {
                 const { status, nextAvailable } = getTaskStatus(task);
                 const isLocked = task.minLevel > (userData?.level || 1);

                 return (
                    <motion.div
                      key={task.id}
                      layout
                      className={cn(
                        "group premium-card flex flex-col justify-between relative overflow-hidden",
                        status === 'completed' && "opacity-60 border-emerald-500/20 bg-emerald-500/[0.02]",
                        isLocked && "grayscale pointer-events-none"
                      )}
                    >
                       {/* Background Symbol */}
                       <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                          <Zap size={120} />
                       </div>

                       <div className="space-y-5">
                          <div className="flex items-start justify-between">
                             <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Zap size={24} fill={task.category === 'DAILY' ? 'currentColor' : 'none'} className={task.category === 'DAILY' ? 'animate-pulse' : ''} />
                             </div>
                             <div className="flex flex-col items-end gap-1.5">
                                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-[0.1em] text-white/30">
                                   {task.category}
                                </span>
                                {isLocked && (
                                   <div className="flex items-center gap-1 text-rose-500">
                                      <Lock size={10} />
                                      <span className="text-[9px] font-bold">LVL {task.minLevel}</span>
                                   </div>
                                )}
                             </div>
                          </div>

                          <div>
                             <h3 className="text-lg font-bold tracking-tight mb-2 pr-12 group-hover:text-primary transition-colors">{task.title}</h3>
                             <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                                {task.description}
                             </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                             <div className="space-y-1">
                                <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Yield</p>
                                <div className="flex items-center gap-1.5 text-emerald-400">
                                   <Zap size={12} fill="currentColor" />
                                   <span className="text-sm font-bold font-mono">+{task.rewardAmount}</span>
                                </div>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Clearance</p>
                                <div className="flex items-center gap-1.5 text-primary">
                                   <Award size={12} />
                                   <span className="text-sm font-bold font-mono">+{task.xpReward} XP</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="mt-8">
                          {status === 'completed' ? (
                             <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-2 text-emerald-500">
                                <CheckCircle2 size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Objective Secured</span>
                             </div>
                          ) : status === 'pending' ? (
                             <div className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/30">
                                <Clock size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Auditing Evidence</span>
                             </div>
                          ) : status === 'cooldown' ? (
                             <div className="w-full py-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex flex-col items-center">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Refilling Reward</span>
                                <span className="text-xs font-mono text-white/40 mt-0.5">{nextAvailable?.toLocaleTimeString()}</span>
                             </div>
                          ) : (
                             <button
                               onClick={() => handleAction(task.id)}
                               disabled={isSubmitting === task.id}
                               className="w-full py-4 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 group/btn transition-all"
                             >
                                {isSubmitting === task.id ? (
                                   <Loader2 size={16} className="animate-spin" />
                                ) : (
                                   <>
                                      <span className="text-[10px] font-bold uppercase tracking-widest">Deploy Objective</span>
                                      <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                   </>
                                )}
                             </button>
                          )}
                       </div>
                    </motion.div>
                 );
              })
           )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
