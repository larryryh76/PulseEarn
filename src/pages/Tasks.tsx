import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  Clock,
  CheckCircle2,
  Search,
  Loader2,
  Lock,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Filter,
  Users,
  Target
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

  const categories: (TaskCategory | 'ALL')[] = ['ALL', 'SOCIAL', 'REFERRAL', 'PREDICTION', 'STREAK', 'EDUCATION'];

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
      <div className="max-w-[1400px] mx-auto space-y-12 pb-20 animate-in">

        {/* PREMIUM MARKETPLACE HEADER */}
        <section className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-[3rem] p-12 lg:p-16">
          <div className="absolute inset-0 v2-gradient-bg opacity-50 pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-12">
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,102,255,0.8)] animate-pulse" />
                 <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Earning Marketplace</h2>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white leading-[0.9]">
                Discovery <br />
                <span className="text-white/20">Marketplace.</span>
              </h1>
              <p className="text-lg text-white/40 font-medium leading-relaxed">
                Connect with ecosystem partners to unlock rewards. Verified tasks contribute directly to your verified ledger and account progression.
              </p>
            </div>

            <div className="flex flex-col gap-6 w-full lg:w-96">
               <div className="grid grid-cols-2 gap-4">
                  <div className="v2-stat-card">
                     <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Active Tasks</p>
                     <p className="text-2xl font-mono font-bold text-white">{tasks.length}</p>
                  </div>
                  <div className="v2-stat-card">
                     <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Success Rate</p>
                     <p className="text-2xl font-mono font-bold text-emerald-500">100%</p>
                  </div>
               </div>

               <div className="relative group">
                  <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 bg-black/40 border border-white/10 rounded-2xl text-sm font-bold focus:border-primary transition-all outline-none"
                  />
               </div>
            </div>
          </div>
        </section>

        {/* REFINED FILTERING & GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

           {/* Sidebar Filters (3 cols) */}
           <div className="lg:col-span-3 space-y-10">
              <div className="space-y-6">
                 <div className="flex items-center gap-3 px-2">
                    <Filter size={16} className="text-primary" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Filter Categories</h3>
                 </div>
                 <div className="flex flex-col gap-2">
                    {categories.map(cat => (
                       <button
                         key={cat}
                         onClick={() => setActiveCategory(cat)}
                         className={cn(
                            "v2-sidebar-item",
                            activeCategory === cat ? "v2-sidebar-item-active" : "v2-sidebar-item-inactive"
                         )}
                       >
                          {cat === 'ALL' ? <Target size={16} /> :
                           cat === 'SOCIAL' ? <Users size={16} /> :
                           cat === 'REFERRAL' ? <TrendingUp size={16} /> :
                           <Zap size={16} />}
                          <span className="uppercase tracking-widest text-[10px] font-bold">{cat}</span>
                       </button>
                    ))}
                 </div>
              </div>

              <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[2rem] space-y-6">
                 <div className="flex items-center gap-3">
                    <ShieldCheck size={16} className="text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white/60">Verified Partners</h4>
                 </div>
                 <p className="text-[11px] text-white/30 leading-relaxed font-medium uppercase">
                    All tasks are provided by verified ecosystem partners and audited for security.
                 </p>
              </div>
           </div>

           {/* Task Grid (9 cols) */}
           <div className="lg:col-span-9 space-y-8">
              <div className="flex items-center justify-between px-2">
                 <p className="text-[10px] font-mono font-bold text-white/20 uppercase tracking-[0.3em]">
                    {filteredTasks.length} verified tasks found
                 </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {loading ? (
                    [1,2,3,4].map(i => <div key={i} className="h-72 rounded-[2.5rem] bg-white/[0.01] border border-white/5 animate-pulse" />)
                 ) : filteredTasks.length === 0 ? (
                    <div className="col-span-full py-32 text-center glass-panel rounded-[3rem] border-white/5 border-dashed">
                       <Search size={48} className="mx-auto mb-6 opacity-5" />
                       <h3 className="text-xl font-bold opacity-20">No Tasks Found</h3>
                       <p className="text-sm opacity-10 mt-2">Adjust your filters or standby for new deployments.</p>
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
                              "group p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col justify-between relative overflow-hidden",
                              status === 'completed'
                                ? "bg-emerald-500/[0.01] border-emerald-500/10 grayscale-[0.5] opacity-60"
                                : "bg-white/[0.01] border-white/5 hover:border-primary/30 hover:bg-white/[0.02]",
                              isLocked && "grayscale pointer-events-none opacity-40"
                            )}
                          >
                             <div className="space-y-6 relative z-10">
                                <div className="flex items-start justify-between">
                                   <div className={cn(
                                      "w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500 group-hover:scale-105",
                                      status === 'completed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-white/5 border-white/10 text-primary group-hover:border-primary/20 shadow-sm"
                                   )}>
                                      <Zap size={28} fill={task.category === 'STREAK' ? 'currentColor' : 'none'} />
                                   </div>
                                   <div className="flex flex-col items-end gap-2">
                                      <span className="px-3 py-1 rounded-lg bg-black/40 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/20">
                                         {task.category}
                                      </span>
                                      {isLocked && (
                                         <div className="flex items-center gap-2 px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500">
                                            <Lock size={10} />
                                            <span className="text-[9px] font-bold uppercase tracking-tighter">LVL {task.minLevel} REQUIRED</span>
                                         </div>
                                      )}
                                   </div>
                                </div>

                                <div className="space-y-3">
                                   <h3 className="text-xl font-bold tracking-tight pr-8 group-hover:text-primary transition-colors">{task.title}</h3>
                                   <p className="text-sm text-white/30 line-clamp-2 leading-relaxed font-medium group-hover:text-white/40 transition-colors">
                                      {task.description}
                                   </p>
                                </div>

                                <div className="flex items-center gap-8 pt-2">
                                   <div className="space-y-1">
                                      <p className="text-[9px] font-bold uppercase text-white/10 tracking-widest">Reward</p>
                                      <p className="text-lg font-mono font-bold text-emerald-400">+{task.rewardAmount.toLocaleString()}</p>
                                   </div>
                                   <div className="space-y-1">
                                      <p className="text-[9px] font-bold uppercase text-white/10 tracking-widest">EXP</p>
                                      <p className="text-lg font-mono font-bold text-primary">+{task.xpReward}</p>
                                   </div>
                                </div>
                             </div>

                             <div className="mt-8 relative z-10">
                                {status === 'completed' ? (
                                   <div className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-2 text-emerald-500">
                                      <CheckCircle2 size={16} />
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified</span>
                                   </div>
                                ) : status === 'pending' ? (
                                   <div className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-white/20">
                                      <Clock size={16} />
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Auditing</span>
                                   </div>
                                ) : status === 'cooldown' ? (
                                   <div className="w-full py-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex flex-col items-center">
                                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Cooling Down</span>
                                      <span className="text-xs font-mono text-white/30 mt-0.5">{nextAvailable?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                                ) : (
                                   <button
                                     onClick={() => handleAction(task.id)}
                                     disabled={isSubmitting === task.id}
                                     className="w-full py-4 bg-primary text-white rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 group/btn transition-all"
                                   >
                                      {isSubmitting === task.id ? (
                                         <Loader2 size={16} className="animate-spin" />
                                      ) : (
                                         <>
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Start Task</span>
                                            <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
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
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
