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

  const categories: (TaskCategory | 'ALL')[] = ['ALL', 'SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'STREAK', 'SEASONAL'];

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
      <div className="max-w-[1400px] mx-auto space-y-10 pb-20 animate-in">

        {/* Authoritative Marketplace Header */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,102,255,0.5)]" />
               <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30">Mission Marketplace</h2>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Mission Marketplace</h1>
            <p className="text-base text-white/40 max-w-xl leading-relaxed">
              Engage with authorized ecosystem partners to secure high-yield Pulse and XP rewards. Every mission is verified through the Pulse-Core validation engine.
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-6 relative z-10">
             <div className="px-6 py-3 bg-white/[0.02] border border-white/10 rounded-2xl flex items-center gap-6">
                <div className="flex flex-col">
                   <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Access Tier</span>
                   <span className="text-sm font-bold text-primary">LVL {userData?.level || 1} USER</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="flex flex-col">
                   <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Operational Status</span>
                   <span className="text-sm font-bold text-emerald-500">ACTIVE</span>
                </div>
             </div>

             {/* Intelligence Search Integrated */}
             <div className="relative w-full lg:w-80 group">
                <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Scan mission tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/10 rounded-[1.5rem] text-sm font-medium focus:border-primary outline-none transition-all placeholder:text-white/10"
                />
             </div>
          </div>

          <Zap size={300} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.01] pointer-events-none" />
        </section>

        {/* Category Orchestration */}
        <section className="flex flex-col lg:flex-row gap-6 items-center justify-between border-b border-white/5 pb-8">
           <div className="flex items-center gap-3 bg-white/[0.02] p-1.5 rounded-2xl border border-white/5 w-full lg:w-fit overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={cn(
                      "px-6 py-3 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all shrink-0",
                      activeCategory === cat
                        ? "bg-primary text-white shadow-xl shadow-primary/20 border border-primary/20"
                        : "text-white/20 hover:text-white/40 hover:bg-white/[0.02]"
                   )}
                 >
                    {cat}
                 </button>
              ))}
           </div>

           <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white/20">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              {filteredTasks.length} Deployments found
           </div>
        </section>

        {/* Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

                       <div className="space-y-6">
                          <div className="flex items-start justify-between">
                             <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary group-hover:scale-105 transition-all group-hover:border-primary/20 shadow-sm">
                                <Zap size={28} fill={task.category === 'STREAK' ? 'currentColor' : 'none'} className={task.category === 'STREAK' ? 'animate-pulse' : ''} />
                             </div>
                             <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                   <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/30">
                                      {task.category}
                                   </span>
                                </div>
                                {isLocked && (
                                   <div className="flex items-center gap-2 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500">
                                      <Lock size={10} />
                                      <span className="text-[9px] font-bold uppercase">LOCKED: LVL {task.minLevel}</span>
                                   </div>
                                )}
                             </div>
                          </div>

                          <div>
                             <div className="flex items-center gap-2 mb-2">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-primary/40">Authority: {task.providerName}</span>
                             </div>
                             <h3 className="text-xl font-bold tracking-tight mb-3 pr-8 group-hover:text-primary transition-colors">{task.title}</h3>
                             <p className="text-sm text-white/40 line-clamp-2 leading-relaxed font-medium">
                                {task.description}
                             </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                             <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Yield</p>
                                <div className="flex items-center gap-2 text-emerald-400">
                                   <Zap size={14} fill="currentColor" />
                                   <span className="text-base font-bold font-mono">+{task.rewardAmount.toLocaleString()}</span>
                                </div>
                             </div>
                             <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase text-white/20 tracking-widest">Clearance</p>
                                <div className="flex items-center gap-2 text-primary">
                                   <Award size={14} />
                                   <span className="text-base font-bold font-mono">+{task.xpReward} XP</span>
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
