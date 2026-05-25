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
  ChevronRight,
  ShieldCheck,
  Globe,
  Twitter,
  Users
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

  const categories = ['All Missions', 'Featured', 'Social', 'Growth', 'Daily', 'History'];

  const filteredTasks = tasks.filter(t => {
    const matchesTab = activeTab === 'All Missions' ||
                      (activeTab === 'Featured' && t.isFeatured) ||
                      (activeTab === 'Social' && t.category === 'Social') ||
                      (activeTab === 'Growth' && t.category === 'Growth') ||
                      (activeTab === 'Daily' && t.type === 'daily');
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
      <div className="space-y-12 pb-24">

        {/* REWARDS MARKETPLACE HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
           <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/40">
                 <Globe size={18} />
                 <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Live Earning Marketplace</h2>
              </div>
              <h1 className="text-5xl font-bold tracking-tighter text-white">Reward Campaigns</h1>
              <p className="text-white/40 text-base max-w-xl font-medium leading-relaxed">
                 Discover high-yield missions and partnership campaigns. Grow your protocol status and capital through engagement.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-4 w-full lg:w-auto">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 min-w-[160px]">
                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Total Yield</p>
                 <p className="text-2xl font-bold text-white">{userData.points?.toLocaleString() || 0} <span className="text-xs opacity-20">PTS</span></p>
              </div>
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 min-w-[160px]">
                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Protocol Tier</p>
                 <p className="text-2xl font-bold text-primary">LVL {xpInfo.level}</p>
              </div>
           </div>
        </div>

        {/* FEATURED CAMPAIGNS (ZEALY STYLE) */}
        {campaigns.length > 0 && (
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <Sparkles size={16} className="text-primary" />
                   <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Ecosystem Partners</h3>
                </div>
                <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">View All Partnerships</button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map(camp => (
                   <motion.div
                     key={camp.id}
                     whileHover={{ y: -4 }}
                     className="relative group overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A10] h-64 flex flex-col justify-end p-6 cursor-pointer"
                   >
                      <img src={camp.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-1000" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                      <div className="relative space-y-3">
                         <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-primary text-[8px] font-bold uppercase tracking-widest text-white shadow-lg">Verified</span>
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ends in 4 days</span>
                         </div>
                         <h4 className="text-2xl font-bold text-white tracking-tight">{camp.name}</h4>
                         <div className="flex items-center justify-between pt-2">
                            <div className="flex -space-x-2">
                               {[1,2,3].map(i => (
                                 <div key={i} className="w-6 h-6 rounded-full border border-black bg-white/10" />
                               ))}
                               <div className="w-6 h-6 rounded-full border border-black bg-white/5 flex items-center justify-center text-[8px] font-bold">+1.2k</div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase">
                               <Zap size={12} /> Live Now
                            </div>
                         </div>
                      </div>
                   </motion.div>
                ))}
             </div>
          </div>
        )}

        {/* MISSION DISCOVERY */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 pt-8">

           {/* Sidebar Navigation */}
           <div className="space-y-10">
              <div className="space-y-2">
                 <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3">Filter Missions</h4>
                 <div className="space-y-1">
                    {categories.map(cat => (
                       <button
                         key={cat}
                         onClick={() => setActiveTab(cat)}
                         className={cn(
                           "w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                           activeTab === cat ? "bg-white/5 text-primary border border-white/5" : "text-white/30 hover:text-white/60"
                         )}
                       >
                          {cat}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                 <div className="flex items-center gap-2 text-orange-500">
                    <Flame size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Active Streak</span>
                 </div>
                 <p className="text-xl font-bold text-white">{userData.streak || 0} Days</p>
                 <p className="text-[10px] text-white/30 leading-relaxed font-medium">Keep your streak alive to unlock multiplier rewards up to 2.5x.</p>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-3">Market Intel</h4>
                 <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                    <div className="flex items-center gap-2 text-primary">
                       <ShieldCheck size={14} />
                       <span className="text-[9px] font-bold uppercase tracking-widest">Verified Tasks Only</span>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed">All campaigns are vetted for transactional integrity and protocol security.</p>
                 </div>
              </div>
           </div>

           {/* Mission Grid */}
           <div className="lg:col-span-3 space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                    <input
                      type="text"
                      placeholder="Search missions, providers..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium"
                    />
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                       <Users size={14} />
                       <span>4.2k Online</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
                       <Zap size={14} />
                       <span>$14,200 Dist. Today</span>
                    </div>
                 </div>
              </div>

              {activeTab === 'History' ? (
                <div className="space-y-4">
                   {submissions.length === 0 ? (
                      <div className="py-24 text-center border border-dashed border-white/5 rounded-3xl">
                         <History className="mx-auto text-white/5 mb-4" size={40} />
                         <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">Audit Trail Empty</p>
                      </div>
                   ) : (
                      submissions.map(sub => (
                         <div key={sub.id} className="p-6 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between group">
                            <div className="flex items-center gap-5">
                               <div className={cn(
                                 "w-12 h-12 rounded flex items-center justify-center border",
                                 sub.status === 'approved' ? 'bg-success/5 border-success/10 text-success' : 'bg-primary/5 border-primary/10 text-primary'
                               )}>
                                  <Target size={20} />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-white">Task: {sub.taskId.slice(0, 12)}</p>
                                  <p className="text-[10px] font-mono text-white/20 uppercase mt-1">{sub.submittedAt?.toDate().toLocaleString()}</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className={cn(
                                 "text-[10px] font-bold uppercase tracking-widest",
                                 sub.status === 'approved' ? 'text-success' : 'text-primary'
                               )}>{sub.status}</div>
                               <p className="text-[11px] font-bold text-white/40 mt-1">+{sub.rewardPoints} PTS</p>
                            </div>
                         </div>
                      ))
                   )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {filteredTasks.length === 0 ? (
                      <div className="col-span-full py-24 text-center border border-dashed border-white/5 rounded-3xl">
                         <AlertCircle className="mx-auto text-white/5 mb-4" size={40} />
                         <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">No Missions Available</p>
                      </div>
                   ) : filteredTasks.map(task => {
                      const { status, nextAvailable } = getTaskStatus(task);
                      return (
                         <motion.div
                           key={task.id}
                           whileHover={{ y: -2 }}
                           onClick={() => handleTaskAction(task)}
                           className={cn(
                             "group p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden",
                             (status === 'completed' || status === 'pending') && "opacity-50 grayscale"
                           )}
                         >
                            <div className="flex items-start justify-between mb-8">
                               <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 group-hover:text-primary transition-colors">
                                  {task.category === 'Social' ? <Twitter size={20} /> : <Zap size={20} />}
                               </div>
                               <div className="flex flex-col items-end gap-2">
                                  <span className={cn(
                                     "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border",
                                     task.rarity === 'legendary' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" : "bg-white/5 border-white/10 text-white/40"
                                  )}>{task.rarity}</span>
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                                     <Zap size={10} /> +{task.rewardPoints}
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-2 mb-6">
                               <h4 className="text-base font-bold text-white group-hover:text-primary transition-colors">{task.title}</h4>
                               <p className="text-xs text-white/30 leading-relaxed line-clamp-2">{task.description}</p>
                            </div>

                            <div className="flex items-center justify-between pt-5 border-t border-white/5">
                               <div className="flex items-center gap-4 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                                  <span className="flex items-center gap-1"><Clock size={10} /> {task.cooldown ? `${task.cooldown}h` : 'Once'}</span>
                                  <span className="flex items-center gap-1"><Star size={10} /> +{task.rewardXp} XP</span>
                               </div>
                               <div className="flex items-center gap-1 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-all uppercase tracking-widest">
                                  Start <ChevronRight size={12} />
                               </div>
                            </div>

                            {status === 'cooldown' && (
                               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
                                  <Clock size={20} className="text-white/40" />
                                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Cooling Down</p>
                                  <p className="text-xs font-bold text-white">{nextAvailable?.toLocaleTimeString()}</p>
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

      {/* VERIFICATION MODAL */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedTask(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-md"
             />
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="relative w-full max-w-lg bg-black border border-white/10 rounded-2xl p-10 overflow-hidden shadow-2xl"
             >
                <div className="absolute top-0 right-0 p-10 opacity-5">
                   <Target size={140} className="text-primary" />
                </div>

                <div className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <ExternalLink size={24} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">{selectedTask.title}</h3>
                      <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Verification Protocol Required</p>
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-xs text-white/60 leading-relaxed font-medium">
                         {selectedTask.proofRequirements || "To claim your points, please provide your handle or the URL proving completion of the task."}
                      </p>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Proof Output</label>
                      <input
                        type="text"
                        value={proof}
                        onChange={e => setProof(e.target.value)}
                        placeholder="Enter Identifier (Link/Handle)..."
                        className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-all font-medium"
                      />
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setSelectedTask(null)}
                        className="flex-1 py-4 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
                      >
                         Cancel
                      </button>
                      <button
                        onClick={handleProofSubmit}
                        className="flex-1 py-4 rounded-xl bg-primary text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                      >
                         Submit Mission
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
