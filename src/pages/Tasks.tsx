import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  CheckCircle2,
  Users,
  Search,
  ArrowRight,
  Target,
  Image as ImageIcon,
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
  const { tasks, campaigns, loading, getTaskStatus } = useTasks();
  const [filter, setFilter] = useState<'ALL' | 'SOCIAL' | 'ENGAGEMENT' | 'REFERRAL' | 'PREDICTION' | 'EDUCATION' | 'EVENTS' | 'SPONSORED' | 'OFFERWALL'>('ALL');
  const [view, setView] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const activeCampaigns = campaigns
    .filter(c => c.active && (filter === 'ALL' || c.category === filter as any))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const standaloneTasks = tasks.filter(t =>
    t.active && !t.campaignId && (filter === 'ALL' || t.category === filter as any)
  );

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
                  {(['ALL', 'SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'EVENTS', 'SPONSORED', 'OFFERWALL'] as const).map((cat) => (
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
          {view === 'ACTIVE' ? (
            <>
            {activeCampaigns.map((camp, index) => (
              <motion.div
                key={camp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => navigate(`/campaigns/${camp.id}`)}
                className="group cursor-pointer"
              >
                <Card className="h-full flex flex-col min-h-[460px] p-0 rounded-[2.5rem] bg-surface-bright/50 border border-white/5 overflow-hidden">
                  <div className="h-44 relative overflow-hidden">
                     {camp.bannerUrl ? (
                        <img src={camp.bannerUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" />
                     ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-transparent" />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />

                     <div className="absolute top-8 left-8 flex gap-2">
                        <div className="px-3 py-2 bg-background/80 backdrop-blur-md border border-white/10 rounded-xl group-hover:border-primary/40 transition-colors">
                          {camp.category === 'SOCIAL' ? <Users size={16} className="text-primary" /> :
                           camp.category === 'PREDICTION' ? <TrendingUp size={16} className="text-accent" /> :
                           <Zap size={16} className="text-warning" />}
                        </div>
                        {camp.featured && (
                           <div className="px-3 py-2 bg-accent text-white rounded-xl text-[8px] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                              <Target size={10} /> Featured
                           </div>
                        )}
                     </div>

                     <div className="absolute top-8 right-8 text-right">
                        <div className="px-4 py-2 bg-background/80 backdrop-blur-md border border-white/10 rounded-xl">
                           <p className="text-xl font-bold text-white tracking-tighter leading-none">+{(camp.totalPrizePool || 0)?.toLocaleString()}</p>
                           <p className="text-[7px] uppercase tracking-[0.2em] text-primary font-bold mt-1">Pool</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 p-8 pt-6 space-y-5">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">{camp.category}</span>
                          <span className="w-1 h-1 rounded-full bg-white/10" />
                          <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.15em]">{camp.status}</span>
                       </div>
                       <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight">{camp.name}</h3>
                    </div>
                    <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-3 font-medium">
                       {camp.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
                          <Users size={12} className="text-text-tertiary" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">{(camp.participantsCount || 0)?.toLocaleString()} Joined</span>
                       </div>
                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
                          <Zap size={12} className="text-text-tertiary" />
                          <span className="text-[9px] font-bold uppercase tracking-widest text-text-secondary">{camp.taskIds?.length || 0} Task Units</span>
                       </div>
                    </div>
                  </div>

                  <div className="px-8 pb-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       {camp.sponsorLogoUrl ? (
                          <img src={camp.sponsorLogoUrl} alt="" className="w-8 h-8 rounded-lg border border-white/10" />
                       ) : (
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20"><ImageIcon size={14} /></div>
                       )}
                       <div>
                          <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest leading-none mb-1">Sponsor</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{camp.sponsorName || 'PulseEarn'}</p>
                       </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-bright text-white border border-border group-hover:bg-primary group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(0,112,255,0.3)] transition-all">
                       <ArrowRight size={20} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}

            {standaloneTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (activeCampaigns.length + index) * 0.05 }}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="group cursor-pointer"
              >
                <Card className="h-full flex flex-col min-h-[460px] p-0 rounded-[2.5rem] bg-surface/50 border border-white/5 overflow-hidden">
                  <div className="h-44 relative overflow-hidden">
                     <div className="w-full h-full bg-gradient-to-br from-primary/5 to-transparent" />
                     <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <Zap size={64} className="text-primary" />
                     </div>
                     <div className="absolute top-8 left-8 flex gap-2">
                        <div className="px-3 py-2 bg-background/80 backdrop-blur-md border border-white/10 rounded-xl">
                          <Zap size={16} className="text-primary" />
                        </div>
                     </div>
                     <div className="absolute top-8 right-8">
                        <div className="px-4 py-2 bg-background/80 backdrop-blur-md border border-white/10 rounded-xl">
                           <p className="text-xl font-bold text-white tracking-tighter leading-none">+{task.rewardAmount}</p>
                           <p className="text-[7px] uppercase tracking-[0.2em] text-primary font-bold mt-1">PTS</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 p-8 pt-6 space-y-4">
                     <div className="space-y-2">
                        <p className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">{task.category}</p>
                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors leading-tight">{task.title}</h3>
                     </div>
                     <p className="text-[14px] text-text-secondary leading-relaxed line-clamp-3 font-medium">{task.description}</p>
                  </div>
                  <div className="px-8 pb-8 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Standalone Task</span>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-surface-bright text-white border border-border group-hover:bg-primary transition-all">
                       <ArrowRight size={18} />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
            </>
          ) : (
            completedTasks.map((task, index) => {
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="group cursor-pointer"
                >
                  <Card className="h-full flex flex-col min-h-[460px] p-0 rounded-[2.5rem] bg-success/[0.02] border-success/30">
                    {/* Reuse similar layout for history items */}
                    <div className="h-44 relative overflow-hidden rounded-[2.5rem_2.5rem_0_0]">
                       {task.campaignArtwork ? (
                          <img src={task.campaignArtwork} alt="" className="w-full h-full object-cover opacity-40" />
                       ) : (
                          <div className="w-full h-full bg-success/5" />
                       )}
                       <div className="absolute inset-0 flex items-center justify-center">
                          <CheckCircle2 size={48} className="text-success" />
                       </div>
                    </div>
                    <div className="flex-1 p-8">
                       <h3 className="text-xl font-bold text-white mb-2">{task.title}</h3>
                       <p className="text-sm text-text-secondary line-clamp-2 mb-6">{task.description}</p>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Reward Secured</p>
                          <p className="text-lg font-mono font-bold text-success">+{task.rewardAmount} PTS</p>
                       </div>
                    </div>
                    <div className="px-8 pb-8 flex items-center justify-between">
                       <span className="text-[10px] font-bold uppercase tracking-widest text-success">Verified Completion</span>
                       <ArrowRight size={20} className="text-white/20" />
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* EMPTY STATE ARCHITECTURE */}
        {(view === 'ACTIVE' ? activeCampaigns.length === 0 : completedTasks.length === 0) && (
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
