import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import TaskCard from '../components/tasks/TaskCard';
import {
  Trophy,
  Target,
  Flame,
  CheckCircle2,
  TrendingUp,
  Zap,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';

const Tasks: React.FC = () => {
  const { userData } = useAuth();
  const { tasks, loading, claimTask, getTaskStatus } = useTasks();

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

  // Group tasks by type or priority
  const dailyTasks = tasks.filter(t => t.type === 'daily' || t.type === 'timer');
  const specialMissions = tasks.filter(t => t.type === 'once' || t.type === 'referral');

  const completedCount = tasks.filter(t => getTaskStatus(t).status === 'completed').length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <DashboardLayout>
      {/* Achievement Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-8 border-white/[0.05] bg-gradient-to-br from-[#0A0A0F] to-[#12121A] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Trophy size={120} className="text-primary" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                  <Target className="text-primary" size={20} />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Mission Control</h1>
              </div>
              <p className="text-white/40 text-sm mb-6 max-w-md font-medium">
                Complete your daily operations to maximize your Pulse yields and climb the ranks.
              </p>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Daily Goal Progress</span>
                  <span className="text-[10px] font-mono font-bold text-primary">{completedCount}/{tasks.length} DONE</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(0,112,255,0.5)]"
                  />
                </div>
              </div>
            </div>

            {/* Streak Counter */}
            <div className="flex gap-4">
              <div className="px-6 py-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-1">
                <Flame size={24} className="text-orange-500" />
                <span className="text-2xl font-mono font-bold">{userData.streak}</span>
                <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Day Streak</span>
              </div>
              <div className="px-6 py-4 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex flex-col items-center justify-center gap-1">
                <Star size={24} className="text-yellow-500" />
                <span className="text-2xl font-mono font-bold">120</span>
                <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Global Rank</span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Daily Quests Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-5 bg-primary rounded-full" />
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Daily Quests</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {dailyTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              status={getTaskStatus(task).status}
              nextAvailable={getTaskStatus(task).nextAvailable}
              onClaim={claimTask}
            />
          ))}
        </div>
      </div>

      {/* Special Missions Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-5 bg-accent rounded-full" />
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">One-Time Missions</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {specialMissions.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              status={getTaskStatus(task).status}
              nextAvailable={getTaskStatus(task).nextAvailable}
              onClaim={claimTask}
            />
          ))}
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="p-6 border-white/[0.03] bg-white/[0.01] flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Pulse Power</p>
            <p className="text-xl font-mono font-bold text-white">{userData.points.toLocaleString()}</p>
          </div>
        </Card>

        <Card className="p-6 border-white/[0.03] bg-white/[0.01] flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Daily Yield</p>
            <p className="text-xl font-mono font-bold text-white">+{userData.totalEarnedToday || 0}</p>
          </div>
        </Card>

        <Card className="p-6 border-white/[0.03] bg-white/[0.01] flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Completed</p>
            <p className="text-xl font-mono font-bold text-white">{completedCount}</p>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
