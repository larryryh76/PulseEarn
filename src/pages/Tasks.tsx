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
  ArrowRight,
  History,
  LayoutGrid,
  Filter,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, loading, getTaskStatus } = useTasks();
  const { userData } = useAuth();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'ENGAGEMENT' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'EVENTS' | 'SPONSORED'>('ALL');
  const [view, setView] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const activeTasks = tasks.filter(t => {
    const { status } = getTaskStatus(t);
    return status !== 'completed' && (filter === 'ALL' || t.category === filter as any);
  });

  const completedTasks = tasks.filter(t => {
    const { status } = getTaskStatus(t);
    return status === 'completed';
  });

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto space-y-12">
        <div className="h-20 w-full bg-surface border border-border rounded-[2rem] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-80 bg-surface border border-border rounded-[2rem] animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* OPERATIONAL HEADER */}
        <header className="mb-16">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Earning Infrastructure</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Campaign <span className="text-text-tertiary">Marketplace</span>
              </h1>
              <p className="text-text-secondary max-w-xl font-medium">
                Discover verified earning opportunities across the ecosystem. Complete campaign requirements to authorize reward distribution.
              </p>
            </motion.div>

            <div className="flex flex-wrap items-center gap-4">
               {/* View Toggle */}
               <div className="flex bg-surface-bright border border-border p-1.5 rounded-2xl shadow-subtle">
                  <button
                    onClick={() => setView('ACTIVE')}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'ACTIVE' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    <LayoutGrid size={14} />
                    Active
                  </button>
                  <button
                    onClick={() => setView('HISTORY')}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      view === 'HISTORY' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                    )}
                  >
                    <History size={14} />
                    History
                  </button>
               </div>
            </div>
          </div>

          {/* SYSTEM FILTERS */}
          <AnimatePresence mode="wait">
            {view === 'ACTIVE' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-12 flex flex-wrap items-center gap-3 p-1.5 bg-surface/50 border border-border rounded-[1.5rem] overflow-hidden backdrop-blur-sm"
              >
                <div className="px-4 border-r border-border flex items-center gap-2 text-text-tertiary">
                  <Filter size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Filter By</span>
                </div>
                <div className="flex items-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
                  {(['ALL', 'SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'EVENTS', 'SPONSORED'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all whitespace-nowrap",
                        filter === cat ? "bg-surface-bright text-white shadow-sm border border-white/10" : "text-text-tertiary hover:text-white hover:bg-white/5"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* CAMPAIGN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {(view === 'ACTIVE' ? activeTasks : completedTasks).map((task, index) => {
            const { status } = getTaskStatus(task);
            const isLocked = task.minLevel && (userData?.level || 1) < task.minLevel;
            const isPending = status === 'pending';
            const isCompleted = status === 'completed';

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="group cursor-pointer"
              >
                <Card className={cn(
                  "h-full flex flex-col min-h-[460px] p-0 rounded-[2.5rem] bg-surface-bright/50",
                  isCompleted && "border-success/30 bg-success/[0.02]"
                )}>
                  {/* Visual Identity */}
                  <div className="h-44 relative overflow-hidden rounded-[2.5rem_2.5rem_0_0]">
                     {task.campaignArtwork ? (
                        <img src={task.campaignArtwork} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000 grayscale-[0.5] group-hover:grayscale-0" />
                     ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />

                     <div className="absolute top-8 left-8 flex gap-2">
                        <div className="px-3 py-2 bg-background/80 backdrop-blur-md border border-white/5 rounded-xl group-hover:border-primary/40 transition-colors">
                          {task.category === 'SOCIAL' ? <Users size={16} className="text-primary" /> :
                           task.category === 'PREDICTION' ? <TrendingUp size={16} className="text-accent" /> :
                           task.category === 'SPONSORED' ? <ShieldCheck size={16} className="text-success" /> :
                           <Zap size={16} className="text-warning" />}
                        </div>
                        {task.visibility === 'TIER_RESTRICTED' && (
                           <div className="px-3 py-2 bg-background/80 backdrop-blur-md border border-white/5 rounded-xl text-[9px] font-bold text-warning uppercase flex items-center gap-2">
                              <Lock size={12} />
                              Locked
                           </div>
                        )}
                     </div>

                     <div className="absolute top-8 right-8 text-right">
                        <div className="px-4 py-2 bg-background/80 backdrop-blur-md border border-white/5 rounded-xl">
                           <p className="text-xl font-bold text-white tracking-tighter leading-none">+{task.rewardAmount}</p>
                           <p className="text-[7px] uppercase tracking-[0.2em] text-primary font-bold mt-1">Reward</p>
                        </div>
                     </div>
                  </div>

                  {/* Content Integrity */}
                  <div className="flex-1 p-8 pt-6 space-y-5">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">{task.category}</span>
                          <span className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.15em]">{task.platform}</span>
                       </div>
                       <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight">{task.title}</h3>
                    </div>

                    <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-3 font-medium">
                       {task.description}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
                          <Activity size={12} className="text-text-tertiary" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">{task.verificationType}</span>
                       </div>
                    </div>
                  </div>

                  {/* Operational Footer */}
                  <div className="px-8 pb-8 flex items-center justify-between">
                    <div className="space-y-1">
                       <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Progress State</p>
                       <div className="flex items-center gap-2">
                          {isPending ? (
                             <div className="flex items-center gap-2 text-warning">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Pending Review</span>
                             </div>
                          ) : isCompleted ? (
                             <div className="flex items-center gap-2 text-success">
                                <CheckCircle2 size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Claimed</span>
                             </div>
                          ) : isLocked ? (
                             <div className="flex items-center gap-2 text-danger">
                                <Lock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Level {task.minLevel}</span>
                             </div>
                          ) : (
                             <div className="flex items-center gap-2 text-primary">
                                <Zap size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">+{task.xpReward} XP</span>
                             </div>
                          )}
                       </div>
                    </div>

                    <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                       isCompleted ? "bg-success/10 text-success border border-success/20" : "bg-surface-bright text-white border border-border group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/20"
                    )}>
                       <ArrowRight size={20} className={cn("transition-transform group-hover:translate-x-1", isCompleted && "group-hover:translate-x-0")} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* EMPTY STATE ARCHITECTURE */}
        {(view === 'ACTIVE' ? activeTasks.length === 0 : completedTasks.length === 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-48 text-center border border-dashed border-border rounded-[3rem] bg-surface/20 flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-surface border border-border rounded-[2rem] flex items-center justify-center mb-8">
               <Search className="text-text-tertiary" size={32} />
            </div>
            <h2 className="text-xl font-bold mb-3">
               {view === 'ACTIVE' ? 'No Campaigns Available' : 'Empty Execution History'}
            </h2>
            <p className="text-text-secondary text-sm max-w-xs mx-auto font-medium mb-12">
               {view === 'ACTIVE'
                 ? 'Our ecosystem bot is currently indexing new rewards. Check back shortly.'
                 : 'Your completed campaign records will be archived here for verification.'}
            </p>
            <Button variant="outline" onClick={() => setFilter('ALL')}>Reset Infrastructure Filters</Button>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
};

export default Tasks;
