import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  CheckCircle2,
  Clock,
  Users,
  Search,
  Star,
  Layers,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { Link } from 'react-router-dom';

const Tasks: React.FC = () => {
  const { tasks, loading, getTaskStatus } = useTasks();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'ENGAGEMENT' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'EVENTS' | 'SPONSORED'>('ALL');

  const featured = tasks.filter(t => t.active).slice(0, 3);
  const marketplaceTasks = tasks.filter(t => filter === 'ALL' || t.category === filter as any);

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
        <header className="mb-16">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <p className="data-label text-primary mb-2">Earning Marketplace</p>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Campaigns</h1>
            </motion.div>

            <div className="flex items-center gap-2 p-1.5 bg-surface border border-border rounded-2xl overflow-x-auto no-scrollbar">
              {(['ALL', 'SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'EVENTS', 'SPONSORED'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={cn(
                    "px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all whitespace-nowrap",
                    filter === cat ? "bg-white/5 text-white shadow-lg border border-white/10" : "text-text-secondary hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Featured Section */}
        {featured.length > 0 && filter === 'ALL' && (
           <section className="mb-20">
              <div className="flex items-center gap-3 mb-8">
                 <Star size={18} className="text-primary" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Featured Opportunities</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {featured.map(task => (
                    <Link key={task.id} to={`/tasks/${task.id}`} className="group relative aspect-[16/10] rounded-[3rem] overflow-hidden border border-white/5 hover:border-primary/30 transition-all shadow-2xl">
                       {task.campaignArtwork ? (
                          <img src={task.campaignArtwork} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
                       ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-black" />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent p-10 flex flex-col justify-end">
                          <div className="flex items-center gap-2 mb-4">
                             <span className="px-3 py-1 rounded-full bg-primary text-white text-[8px] font-bold uppercase tracking-widest shadow-lg">Featured</span>
                             <span className="text-[10px] font-mono font-bold text-white">+{task.rewardAmount} PTS</span>
                          </div>
                          <h3 className="text-2xl font-bold text-white mb-2 leading-tight">{task.title}</h3>
                          <p className="text-sm text-white/60 line-clamp-1 group-hover:text-white transition-colors">{task.description}</p>
                       </div>
                    </Link>
                 ))}
              </div>
           </section>
        )}

        {/* Marketplace Grid */}
        <section>
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <Layers size={18} className="text-accent" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Active Marketplace</h2>
              </div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{marketplaceTasks.length} Campaigns Available</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
             {marketplaceTasks.map((task, index) => {
               const { status } = getTaskStatus(task);
               const isCompleted = status === 'completed';
               const isPending = status === 'pending';

               return (
                 <motion.div
                   key={task.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: index * 0.05 }}
                 >
                    <Link
                      to={`/tasks/${task.id}`}
                      className={cn(
                        "bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 block group hover:border-primary/20 hover:bg-white/[0.02] transition-all relative overflow-hidden",
                        (isCompleted || isPending) && "opacity-60"
                      )}
                    >
                       <div className="flex justify-between items-start mb-6">
                          <div className={cn("p-2.5 rounded-2xl bg-white/5 text-text-secondary group-hover:text-primary group-hover:bg-primary/10 transition-all border border-white/5 group-hover:border-primary/20")}>
                             {task.category === 'SOCIAL' ? <Users size={20} /> : <Zap size={20} />}
                          </div>
                          <div className="text-right">
                             <p className="text-lg font-mono font-bold text-white">+{task.rewardAmount}</p>
                             <p className="text-[8px] uppercase tracking-widest text-text-secondary font-bold">Yield PT</p>
                          </div>
                       </div>

                       <h3 className="font-bold text-white mb-2 leading-tight group-hover:text-primary transition-colors">{task.title}</h3>
                       <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed mb-6 group-hover:text-white/60 transition-colors">{task.description}</p>

                       <div className="flex items-center justify-between pt-6 border-t border-white/5">
                          <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">{task.verificationType}</span>
                          {isCompleted ? (
                             <div className="flex items-center gap-1.5 text-success text-[9px] font-bold uppercase tracking-widest">
                                <CheckCircle2 size={12} /> Verified
                             </div>
                          ) : isPending ? (
                             <div className="flex items-center gap-1.5 text-warning text-[9px] font-bold uppercase tracking-widest">
                                <Clock size={12} /> Auditing
                             </div>
                          ) : (
                             <ChevronRight size={14} className="text-text-secondary group-hover:text-white group-hover:translate-x-1 transition-all" />
                          )}
                       </div>
                    </Link>
                 </motion.div>
               );
             })}
           </div>
        </section>

        {marketplaceTasks.length === 0 && (
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
