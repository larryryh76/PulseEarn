import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import TaskCard from '../components/tasks/TaskCard';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Zap,
  Sparkles,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { getXpProgress } from '../utils/progression';

const Tasks: React.FC = () => {
  const { userData } = useAuth();
  const { tasks, loading, claimTask, getTaskStatus } = useTasks();
  const [activeTab, setActiveTab] = React.useState('All');

  if (!userData || loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">Loading Missions</p>
        </div>
      </div>
    </DashboardLayout>
  );

  const categories = ['All', 'Daily', 'Social', 'Growth', 'Game'];
  const filteredTasks = activeTab === 'All'
    ? tasks
    : tasks.filter(t => t.category === activeTab);

  const xpInfo = getXpProgress(userData.xp || 0);

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
             <Sparkles size={16} />
             <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Protocol Directives</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Mission Hub</h1>
          <p className="text-white/40 text-sm mt-1">Complete objectives to increase your capital and clearance level.</p>
        </div>

        <div className="lg:w-80 bg-[#0A0A0F] border border-white/[0.05] rounded-2xl p-5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <TrendingUp size={48} className="text-primary" />
           </div>
           <div className="flex justify-between items-center mb-2 relative z-10">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Clearance Level {xpInfo.level}</span>
              <span className="text-[10px] font-mono text-primary font-bold">{Math.round(xpInfo.currentLevelXp)} / {xpInfo.requiredXp} XP</span>
           </div>
           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative z-10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpInfo.progress}%` }}
                className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(0,112,255,0.3)]"
              />
           </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar">
         {categories.map(cat => (
           <button
             key={cat}
             onClick={() => setActiveTab(cat)}
             className={cn(
               "px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border",
               activeTab === cat
                ? "bg-primary border-primary shadow-[0_4px_15px_rgba(0,112,255,0.2)]"
                : "bg-white/[0.02] border-white/[0.05] text-white/40 hover:text-white"
             )}
           >
             {cat}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
         <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between mb-4 px-2">
               <h2 className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">Active Directives ({filteredTasks.length})</h2>
               <div className="flex items-center gap-2 text-[10px] font-bold text-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live Feed
               </div>
            </div>

            {filteredTasks.length === 0 ? (
               <div className="py-20 text-center border-2 border-dashed border-white/[0.03] rounded-3xl">
                  <p className="text-white/20 font-bold uppercase tracking-widest text-xs">No tasks found in this sector</p>
               </div>
            ) : filteredTasks.map((task) => {
              const { status, nextAvailable } = getTaskStatus(task);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  status={status}
                  nextAvailable={nextAvailable}
                  onClaim={claimTask}
                  userLevel={userData.level}
                />
              );
            })}
         </div>

         <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Target size={40} className="text-primary" />
               </div>
               <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Sector Intel</h3>
               <div className="space-y-4">
                  {[
                    { label: 'Avg Reward', val: '45 PTS', icon: Zap },
                    { label: 'XP Yield', val: 'High', icon: Sparkles },
                    { label: 'Efficiency', val: '94%', icon: TrendingUp }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-[10px] text-white/40 font-bold uppercase">
                          <item.icon size={12} />
                          {item.label}
                       </div>
                       <span className="text-[11px] font-mono font-bold">{item.val}</span>
                    </div>
                  ))}
               </div>
            </div>

            <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05]">
               <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-4">Clearance Perks</h4>
               <div className="space-y-3">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                        <CheckCircle2 size={16} />
                     </div>
                     <p className="text-[10px] font-bold text-white/60">Lv. 2: Social Missions</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                        {userData.level >= 5 ? <CheckCircle2 size={16} className="text-green-500" /> : <Lock size={16} />}
                     </div>
                     <p className={cn("text-[10px] font-bold", userData.level >= 5 ? "text-white/60" : "text-white/20")}>
                        Lv. 5: Oracle Protocol
                     </p>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20">
                        {userData.level >= 10 ? <CheckCircle2 size={16} className="text-green-500" /> : <Lock size={16} />}
                     </div>
                     <p className={cn("text-[10px] font-bold", userData.level >= 10 ? "text-white/60" : "text-white/20")}>
                        Lv. 10: Elite Directives
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
