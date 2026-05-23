import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Sparkles,
  ChevronRight,
  Target,
  Trophy,
  Star,
  Clock,
  History,
  AlertCircle,
  TrendingUp,
  Flame,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { getXpProgress } from '../utils/progression';
import { CardPremium } from '../components/ui/PremiumModules';
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

  const [activeTab, setActiveTab] = React.useState('Featured');
  const [selectedTask, setSelectedTask] = React.useState<any>(null);
  const [proof, setProof] = React.useState('');

  if (!userData || loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    </DashboardLayout>
  );

  const categories = ['Featured', 'Daily', 'Social', 'Growth', 'Retention', 'History'];

  const filteredTasks = activeTab === 'Featured'
    ? tasks.filter(t => t.isFeatured)
    : activeTab === 'History'
    ? [] // History handled separately
    : tasks.filter(t => t.category === activeTab);

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
      <div className="max-w-7xl mx-auto space-y-10 pb-20">

        {/* QUEST ENGINE HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
           <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold">
                 <Sparkles size={16} />
                 <span className="text-[10px] uppercase tracking-[0.3em]">Institutional Quest Engine</span>
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-white">Mission Control</h1>
              <p className="text-white/40 text-sm font-medium">Complete objectives to scale your capital and protocol clearance.</p>
           </div>

           <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              {/* Level Hub */}
              <div className="bg-[#0A0A0F] border border-white/[0.05] rounded-2xl p-4 flex items-center gap-6 md:w-80">
                 <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90">
                       <circle cx="24" cy="24" r="20" className="stroke-white/5 fill-none" strokeWidth="3" />
                       <circle cx="24" cy="24" r="20" className="stroke-primary fill-none" strokeWidth="3" strokeDasharray="125" strokeDashoffset={125 - (125 * xpInfo.progress / 100)} />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-white">Lv.{xpInfo.level}</span>
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                       <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Account XP</span>
                       <span className="text-[10px] font-bold text-primary">{Math.round(xpInfo.currentLevelXp)} / {xpInfo.requiredXp}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: `${xpInfo.progress}%` }} className="h-full bg-primary" />
                    </div>
                 </div>
              </div>

              {/* Streak Widget */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <Flame size={20} fill="currentColor" />
                 </div>
                 <div>
                    <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest leading-none mb-1">Streak</p>
                    <p className="text-lg font-bold text-white">{userData.streak} Days</p>
                 </div>
              </div>
           </div>
        </div>

        {/* CAMPAIGN CAROUSEL */}
        {campaigns.length > 0 && (
          <div className="relative group">
             <div className="flex items-center gap-2 mb-6 px-1">
                <LayoutGrid size={16} className="text-white/20" />
                <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Live Campaigns</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map(camp => (
                   <CardPremium key={camp.id} className="p-0 overflow-hidden border-white/[0.08] min-h-[180px] bg-[#0A0A14] group/camp cursor-pointer">
                      <img src={camp.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover/camp:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent" />
                      <div className="relative p-6 h-full flex flex-col justify-end">
                         <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded-md bg-primary text-[8px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20">Active Campaign</span>
                         </div>
                         <h3 className="text-xl font-bold text-white mb-1">{camp.name}</h3>
                         <p className="text-[10px] text-white/40 font-medium uppercase tracking-widest">{camp.description}</p>
                      </div>
                   </CardPremium>
                ))}
             </div>
          </div>
        )}

        {/* MISSION GRID */}
        <div className="space-y-6">
           {/* Filters */}
           <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
                    activeTab === cat ? "bg-primary border-primary text-white" : "bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white"
                  )}
                >
                  {cat}
                </button>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

              {/* Mission List */}
              <div className="lg:col-span-2 space-y-4">
                 {activeTab === 'History' ? (
                    <div className="space-y-4">
                       <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-2">Verification History</h3>
                       {submissions.length === 0 ? (
                          <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                             <History className="mx-auto text-white/5 mb-4" size={40} />
                             <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">No historical data</p>
                          </div>
                       ) : submissions.map(sub => (
                          <CardPremium key={sub.id} className="bg-[#050507]">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                   <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                                      sub.status === 'approved' ? "bg-success/5 border-success/10 text-success" :
                                      sub.status === 'rejected' ? "bg-danger/5 border-danger/10 text-danger" :
                                      "bg-primary/5 border-primary/10 text-primary"
                                   )}>
                                      <Target size={20} />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-white">Mission ID: {sub.taskId.slice(0, 8)}</p>
                                      <p className="text-[9px] font-bold text-white/20 uppercase mt-0.5">{sub.submittedAt?.toDate().toLocaleString()}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <div className={cn(
                                      "text-[10px] font-bold uppercase tracking-widest",
                                      sub.status === 'approved' ? "text-success" : sub.status === 'rejected' ? "text-danger" : "text-primary"
                                   )}>{sub.status}</div>
                                   {sub.status === 'approved' && <p className="text-[10px] font-bold text-white/40 mt-0.5">+{sub.rewardPoints} PTS</p>}
                                </div>
                             </div>
                             {sub.adminFeedback && <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5 text-[10px] text-white/40 italic">"{sub.adminFeedback}"</div>}
                          </CardPremium>
                       ))}
                    </div>
                 ) : (
                    filteredTasks.length === 0 ? (
                       <div className="py-20 text-center border border-dashed border-white/5 rounded-3xl">
                          <AlertCircle className="mx-auto text-white/5 mb-4" size={40} />
                          <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">Sector Empty</p>
                       </div>
                    ) : filteredTasks.map(task => {
                       const { status, nextAvailable } = getTaskStatus(task);
                       return (
                          <CardPremium
                            key={task.id}
                            onClick={() => handleTaskAction(task)}
                            className={cn(
                              "bg-[#0A0A0F] border-white/[0.05] p-5 cursor-pointer hover:bg-white/[0.02] transition-all",
                              (status === 'completed' || status === 'pending') && "opacity-60"
                            )}
                          >
                             <div className="flex items-center justify-between gap-6">
                                <div className="flex gap-5">
                                   <div className={cn(
                                      "w-14 h-14 rounded-2xl flex items-center justify-center border",
                                      status === 'available' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/20"
                                   )}>
                                      {task.category === 'Social' ? <TrendingUp size={24} /> : task.type === 'daily' ? <Clock size={24} /> : <Zap size={24} />}
                                   </div>
                                   <div>
                                      <div className="flex items-center gap-3 mb-1.5">
                                         <h3 className="font-bold text-white text-base">{task.title}</h3>
                                         <span className={cn(
                                            "text-[8px] font-bold uppercase px-2 py-0.5 rounded border",
                                            task.rarity === 'legendary' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                                            task.rarity === 'rare' ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                                            "bg-white/5 border-white/10 text-white/30"
                                         )}>{task.rarity}</span>
                                      </div>
                                      <p className="text-[11px] text-white/40 font-medium mb-3">{task.description}</p>
                                      <div className="flex items-center gap-4">
                                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary uppercase tracking-widest">
                                            <Zap size={10} /> +{task.rewardPoints} PTS
                                         </div>
                                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent uppercase tracking-widest">
                                            <Star size={10} /> +{task.rewardXp} XP
                                         </div>
                                      </div>
                                   </div>
                                </div>
                                <div className="text-right shrink-0">
                                   {status === 'available' ? (
                                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                         <ChevronRight size={20} />
                                      </div>
                                   ) : status === 'cooldown' ? (
                                      <div className="flex flex-col items-end">
                                         <span className="text-[9px] font-bold text-white/20 uppercase mb-1">Available in</span>
                                         <span className="text-[10px] font-bold text-white/40">
                                            {nextAvailable?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                         </span>
                                      </div>
                                   ) : (
                                      <div className={cn(
                                         "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border",
                                         status === 'completed' ? "bg-success/5 border-success/10 text-success" : "bg-primary/5 border-primary/10 text-primary"
                                      )}>
                                         {status}
                                      </div>
                                   )}
                                </div>
                             </div>
                          </CardPremium>
                       );
                    })
                 )}
              </div>

              {/* Sidebar Stats */}
              <div className="space-y-6">
                 <CardPremium className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                    <div className="flex items-center gap-3 mb-6">
                       <Trophy size={18} className="text-primary" />
                       <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Mission Efficiency</h3>
                    </div>
                    <div className="space-y-6">
                       <div className="flex justify-between items-end">
                          <div>
                             <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Global Mastery</p>
                             <p className="text-2xl font-bold text-white">Top 12%</p>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold text-primary flex items-center gap-1">
                                <TrendingUp size={12} /> +1.2%
                             </p>
                          </div>
                       </div>
                       <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: "88%" }} className="h-full bg-primary" />
                       </div>
                    </div>
                 </CardPremium>

                 <div className="p-8 rounded-[2.5rem] bg-[#0A0A0F] border border-white/[0.05] space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                       <Zap size={16} />
                       <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Eco-Bot Intel</h4>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                       Nodes are reporting high yield in the <span className="text-primary">Social Sector</span>. Complete missions now for 1.5x XP multipliers.
                    </p>
                 </div>
              </div>
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
               className="absolute inset-0 bg-black/80 backdrop-blur-md"
             />
             <motion.div
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="relative w-full max-w-lg bg-[#0D0D12] border border-white/10 rounded-[2.5rem] p-10 overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 opacity-5">
                   <Target size={120} className="text-primary" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">{selectedTask.title}</h3>
                <p className="text-sm text-white/40 mb-8">{selectedTask.description}</p>

                <div className="space-y-6">
                   <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                      <h4 className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] mb-3">Verification Directive</h4>
                      <p className="text-xs text-white/60 leading-relaxed">{selectedTask.proofRequirements || "Submit the required link or screenshot identifier below."}</p>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-1">Proof Submission</label>
                      <input
                        type="text"
                        value={proof}
                        onChange={e => setProof(e.target.value)}
                        placeholder="Enter Link or Username..."
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all"
                      />
                   </div>

                   <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setSelectedTask(null)}
                        className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-all"
                      >
                         Abort
                      </button>
                      <button
                        onClick={handleProofSubmit}
                        className="flex-1 py-4 rounded-2xl bg-primary text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                      >
                         Transmit Proof
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
