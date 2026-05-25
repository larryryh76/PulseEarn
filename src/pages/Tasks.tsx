import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Sparkles,
  Target,
  Star,
  Clock,
  History,
  AlertCircle,
  Flame,
  Search,
  ExternalLink,
  ShieldCheck,
  Globe,
  Twitter,
  Users,
  Filter,
  ArrowRight,
  BarChart3,
  MousePointer2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { getXpProgress } from '../utils/progression';
import toast from 'react-hot-toast';

const Tasks: React.FC = () => {
  const { userData } = useAuth();
  const {
    tasks,
    campaigns,
    submissions,
    loading,
    submitTask,
    getTaskStatus
  } = useTasks();

  const [activeTab, setActiveTab] = useState('All Missions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [proof, setProof] = useState('');

  if (!userData || loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    </DashboardLayout>
  );

  const categories = ['All Missions', 'Featured', 'Social', 'Growth', 'Daily', 'Partners', 'History'];

  const filteredTasks = tasks.filter(t => {
    const matchesTab = activeTab === 'All Missions' ||
                      (activeTab === 'Featured' && t.isFeatured) ||
                      (activeTab === 'Social' && t.category === 'Social') ||
                      (activeTab === 'Growth' && t.category === 'Growth') ||
                      (activeTab === 'Daily' && t.type === 'daily') ||
                      (activeTab === 'Partners' && t.providerId && t.providerId !== 'internal');
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const xpInfo = getXpProgress(userData.xp || 0);

  const handleTaskAction = (task: any) => {
    const { status } = getTaskStatus(task);
    if (status === 'completed' || status === 'cooldown' || status === 'pending') return;

    if (task.verificationType === 'automated' || task.verificationType === 'timer') {
       submitTask(task.id);
    } else {
       setSelectedTask(task);
       setProof('');
    }
  };

  const handleProofSubmit = async () => {
    if (!proof.trim()) return toast.error('Proof required');
    await submitTask(selectedTask.id, proof);
    setSelectedTask(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-16 pb-32">

        {/* PREMIUM MARKETPLACE HEADER */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12">
           <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,102,255,0.2)]">
                    <Globe size={20} />
                 </div>
                 <h2 className="text-[11px] font-bold uppercase tracking-[0.4em] text-white/40">Marketplace Discovery</h2>
              </div>
              <h1 className="text-6xl font-bold tracking-tighter text-white leading-[0.9]">
                 REWARD <br />
                 <span className="text-primary">CAMPAIGNS.</span>
              </h1>
              <p className="text-white/40 text-lg font-medium leading-relaxed">
                 Access high-yield ecosystem missions. Engage with premium partners to scale your protocol standing and earn transactional rewards.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-black p-8 min-w-[200px] space-y-2">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 size={10} className="text-primary" /> Global Yield
                 </p>
                 <p className="text-3xl font-mono font-bold text-white">{userData.points?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-black p-8 min-w-[200px] space-y-2">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={10} className="text-success" /> Protocol Tier
                 </p>
                 <p className="text-3xl font-mono font-bold text-primary">LVL {xpInfo.level}</p>
              </div>
           </div>
        </div>

        {/* CAMPAIGN CAROUSEL (ZEALY/GALXE STYLE) */}
        {campaigns.length > 0 && (
          <div className="space-y-8">
             <div className="flex items-center justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-3">
                   <Sparkles size={18} className="text-primary" />
                   <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">Ecosystem Missions</h3>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-white/20 uppercase tracking-widest cursor-default">
                   <Users size={14} />
                   <span>{campaigns.reduce((acc, c) => acc + (c.participantsCount || 0), 0).toLocaleString()} Actively Earning</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.map(camp => (
                   <motion.div
                     key={camp.id}
                     whileHover={{ y: -6 }}
                     className="relative group overflow-hidden rounded-[2.5rem] border border-white/10 bg-black h-80 flex flex-col justify-end p-8 cursor-pointer shadow-2xl transition-all hover:border-primary/40"
                   >
                      <img src={camp.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

                      <div className="relative space-y-4">
                         <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded-md bg-white text-black text-[9px] font-bold uppercase tracking-widest">Verified Partner</div>
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Limited Event</span>
                         </div>
                         <h4 className="text-3xl font-bold text-white tracking-tighter leading-tight group-hover:text-primary transition-colors">{camp.name}</h4>
                         <div className="flex items-center justify-between pt-4">
                            <div className="flex items-center gap-3">
                               <div className="flex -space-x-3">
                                  {[1,2,3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-white/10" />
                                  ))}
                               </div>
                               <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">+{camp.participantsCount || '1.2k'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-primary uppercase tracking-widest">
                               Explore <ArrowRight size={14} />
                            </div>
                         </div>
                      </div>
                   </motion.div>
                ))}
             </div>
          </div>
        )}

        {/* TASK MARKETPLACE ENGINE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 pt-8">

           {/* Navigation Pillar */}
           <div className="lg:col-span-3 space-y-12">
              <div className="space-y-4">
                 <div className="flex items-center gap-2 text-white/20 px-4 mb-2">
                    <Filter size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Navigation</span>
                 </div>
                 <div className="space-y-1">
                    {categories.map(cat => (
                       <button
                         key={cat}
                         onClick={() => setActiveTab(cat)}
                         className={cn(
                           "w-full text-left px-5 py-4 rounded-xl text-[13px] font-bold uppercase tracking-widest transition-all border",
                           activeTab === cat ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]" : "bg-transparent border-transparent text-white/30 hover:text-white"
                         )}
                       >
                          {cat}
                       </button>
                    ))}
                 </div>
              </div>

              {/* Live Status Widget */}
              <div className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-6">
                 <div className="flex items-center gap-2 text-orange-500">
                    <Flame size={18} />
                    <span className="text-[11px] font-bold uppercase tracking-widest">Loyalty Multiplier</span>
                 </div>
                 <div className="space-y-2">
                    <p className="text-4xl font-mono font-bold text-white">{userData.streak || 0}<span className="text-lg text-white/20">D</span></p>
                    <p className="text-[11px] text-white/30 leading-relaxed font-medium">Keep your sequence active to maintain the 1.5x global multiplier.</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-2 text-white/20 px-4">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Audit</span>
                 </div>
                 <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                    <p className="text-[12px] text-white/60 leading-relaxed font-medium">All campaign payouts are settled atomically via the <span className="text-primary font-bold">Pulse Transaction Engine v5.0</span>.</p>
                 </div>
              </div>
           </div>

           {/* Marketplace Feed */}
           <div className="lg:col-span-9 space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                 <div className="relative flex-1 max-w-xl">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                      type="text"
                      placeholder="Search campaigns, tasks, providers..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl pl-14 pr-4 py-4 text-[14px] text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                    />
                 </div>
                 <div className="flex items-center gap-8 px-4">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Avg. Payout</span>
                       <span className="text-sm font-bold text-white">450 PTS</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Discovery Rate</span>
                       <span className="text-sm font-bold text-success">Optimal</span>
                    </div>
                 </div>
              </div>

              {activeTab === 'History' ? (
                <div className="space-y-4">
                   {submissions.length === 0 ? (
                      <div className="py-32 text-center border border-dashed border-white/5 rounded-[2.5rem]">
                         <History className="mx-auto text-white/5 mb-6" size={48} />
                         <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.5em]">No Execution Records</p>
                      </div>
                   ) : (
                      <div className="space-y-4">
                         <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4">Audit Ledger</h3>
                         {submissions.map(sub => (
                            <div key={sub.id} className="p-8 rounded-2xl bg-black border border-white/5 flex items-center justify-between hover:border-white/20 transition-all">
                               <div className="flex items-center gap-6">
                                  <div className={cn(
                                    "w-14 h-14 rounded-xl flex items-center justify-center border",
                                    sub.status === 'approved' ? 'bg-success/5 border-success/10 text-success' : 'bg-primary/5 border-primary/10 text-primary'
                                  )}>
                                     <Target size={24} />
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-3">
                                        <p className="text-base font-bold text-white uppercase tracking-tight">Mission Log: {sub.taskId.slice(0, 12)}</p>
                                        <span className="text-[10px] font-mono text-white/20 px-2 border border-white/5 rounded">AUDIT_{sub.id.slice(0, 6)}</span>
                                     </div>
                                     <p className="text-[11px] font-mono text-white/30 uppercase mt-1">{sub.submittedAt?.toDate().toLocaleString()}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <div className={cn(
                                    "text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
                                    sub.status === 'approved' ? 'bg-success/10 border-success/20 text-success' : 'bg-primary/10 border-primary/20 text-primary'
                                  )}>{sub.status}</div>
                                  <p className="text-lg font-mono font-bold text-white mt-2">+{sub.rewardPoints} <span className="text-[10px] opacity-20">PTS</span></p>
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {filteredTasks.length === 0 ? (
                      <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-[2.5rem]">
                         <AlertCircle className="mx-auto text-white/5 mb-6" size={48} />
                         <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.5em]">No Missions Detected</p>
                      </div>
                   ) : filteredTasks.map(task => {
                      const { status, nextAvailable } = getTaskStatus(task);
                      return (
                         <motion.div
                           key={task.id}
                           whileHover={{ scale: 1.02 }}
                           onClick={() => handleTaskAction(task)}
                           className={cn(
                             "group p-8 rounded-3xl bg-black border border-white/10 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden shadow-xl",
                             (status === 'completed' || status === 'pending') && "opacity-50 grayscale pointer-events-none"
                           )}
                         >
                            {/* Card Decorative Elements */}
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                               {task.category === 'Social' ? <Twitter size={120} /> : <Zap size={120} />}
                            </div>

                            <div className="flex items-start justify-between mb-10 relative z-10">
                               <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{task.providerName || 'Pulse Infrastructure'}</span>
                                     {task.providerId && task.providerId !== 'internal' && <div className="w-1 h-1 rounded-full bg-primary" />}
                                  </div>
                                  <h4 className="text-2xl font-bold text-white tracking-tight group-hover:text-primary transition-colors leading-tight">{task.title}</h4>
                               </div>
                               <div className="flex flex-col items-end gap-2">
                                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
                                     <Zap size={12} className="text-primary" />
                                     <span className="text-xs font-bold text-primary">+{task.rewardPoints}</span>
                                  </div>
                                  <span className={cn(
                                     "text-[8px] font-bold uppercase tracking-[0.2em] px-2 py-0.5 rounded border",
                                     task.rarity === 'legendary' ? "bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]" : "bg-white/5 border-white/10 text-white/30"
                                  )}>{task.rarity}</span>
                               </div>
                            </div>

                            <p className="text-[13px] text-white/40 font-medium leading-relaxed mb-8 relative z-10 line-clamp-2">
                               {task.description}
                            </p>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                               <div className="flex items-center gap-6">
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Time Est.</span>
                                     <span className="text-[11px] font-bold text-white/60 flex items-center gap-1.5"><Clock size={10} /> {task.estimatedTime || '2m'}</span>
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Clearance</span>
                                     <span className="text-[11px] font-bold text-white/60 flex items-center gap-1.5"><Star size={10} /> LVL {task.minLevel || 1}</span>
                                  </div>
                               </div>
                               <div className="px-5 py-2 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all shadow-lg flex items-center gap-2">
                                  Claim <MousePointer2 size={12} />
                               </div>
                            </div>

                            {status === 'cooldown' && (
                               <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-20">
                                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white/40">
                                     <Clock size={24} />
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/40 mb-1">Reset Sequence Active</p>
                                     <p className="text-sm font-mono font-bold text-white">{nextAvailable?.toLocaleTimeString()}</p>
                                  </div>
                               </div>
                            )}

                            {status === 'pending' && (
                               <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-20">
                                  <div className="w-12 h-12 rounded-full border border-primary/20 flex items-center justify-center text-primary animate-pulse">
                                     <ShieldCheck size={24} />
                                  </div>
                                  <div className="text-center">
                                     <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mb-1">Audit in Progress</p>
                                     <p className="text-[10px] font-bold text-white/40">VERIFYING MISSION DATA</p>
                                  </div>
                               </div>
                            )}
                         </motion.div>
                      );
                   })}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* MISSION AUTHENTICATION MODAL */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedTask(null)}
               className="absolute inset-0 bg-black/95 backdrop-blur-xl"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-xl bg-black border border-white/10 rounded-[3rem] p-12 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]"
             >
                <div className="absolute top-0 right-0 p-12 opacity-5">
                   <Target size={180} className="text-primary" />
                </div>

                <div className="flex items-center gap-6 mb-12 relative z-10">
                   <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(0,102,255,0.2)]">
                      <ExternalLink size={32} />
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-3xl font-bold text-white tracking-tighter uppercase">{selectedTask.title}</h3>
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                         <p className="text-[11px] font-bold text-primary uppercase tracking-[0.3em]">Verification Protocol Required</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-10 relative z-10">
                   <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
                      <p className="text-[11px] font-bold text-white/20 uppercase tracking-widest">Mission Directive</p>
                      <p className="text-[15px] text-white/60 leading-relaxed font-medium italic">
                         "{selectedTask.proofRequirements || "To authorize your reward distribution, provide the unique identifier or URL link proving task completion."}"
                      </p>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-end px-2">
                         <label className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">Transaction Proof</label>
                         <span className="text-[10px] font-mono text-primary/40 uppercase">Awaiting Input...</span>
                      </div>
                      <input
                        type="text"
                        value={proof}
                        onChange={e => setProof(e.target.value)}
                        placeholder="Enter Link, Hash, or Handle..."
                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-5 text-base text-white focus:outline-none focus:border-primary/50 transition-all font-mono shadow-inner"
                      />
                   </div>

                   <div className="flex gap-4 pt-6">
                      <button
                        onClick={() => setSelectedTask(null)}
                        className="flex-1 py-5 rounded-2xl bg-transparent border border-white/10 text-[11px] font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all"
                      >
                         Abort Mission
                      </button>
                      <button
                        onClick={handleProofSubmit}
                        className="flex-1 py-5 rounded-2xl bg-white text-black text-[11px] font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:bg-white/90 active:scale-95 transition-all"
                      >
                         Authorize Submission
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Tasks;
