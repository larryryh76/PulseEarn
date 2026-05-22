import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import Card from '../components/ui/Card';
import DashboardLayout from '../components/layout/DashboardLayout';
import TaskCard from '../components/tasks/TaskCard';
import {
  Zap,
  Trophy,
  Share2,
  TrendingUp,
  ArrowUpRight,
  Users,
  Star
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { useNavigate } from 'react-router-dom';
import Skeleton from '../components/ui/Skeleton';
import { getXpProgress } from '../utils/progression';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();
  const { tasks, activities, loading, claimTask, getTaskStatus } = useTasks();
  const navigate = useNavigate();

  if (loading) return (
    <DashboardLayout>
      {/* Wallet Skeleton */}
      <Skeleton className="h-[300px] mb-8" />

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Quests Skeleton */}
      <div className="space-y-4 mb-10">
        <Skeleton className="h-6 w-32 mb-6" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </DashboardLayout>
  );

  if (!userData) return null;

  return (
    <DashboardLayout>
      {/* Premium Wallet Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-0 border-white/[0.05] bg-[#0A0A0F] overflow-hidden relative group">
          {/* Live Dynamic Chart Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg viewBox="0 0 400 150" className="w-full h-full opacity-40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0070ff" stopOpacity="0" />
                  <stop offset="50%" stopColor="#0070ff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#00f2ff" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <motion.path
                d="M-20 120 C 50 110, 80 130, 150 80 C 220 30, 280 100, 350 40 C 400 0, 450 20, 500 10"
                fill="none"
                stroke="#0070ff"
                strokeWidth="4"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1],
                  opacity: [0, 0.3, 0.3],
                  d: [
                    "M-20 120 C 50 110, 80 130, 150 80 C 220 30, 280 100, 350 40 C 400 0, 450 20, 500 10",
                    "M-20 110 C 60 120, 90 110, 160 70 C 230 20, 290 90, 360 30 C 410 10, 460 30, 510 20",
                    "M-20 120 C 50 110, 80 130, 150 80 C 220 30, 280 100, 350 40 C 400 0, 450 20, 500 10"
                  ]
                }}
                transition={{
                  pathLength: { duration: 2, ease: "easeOut" },
                  opacity: { duration: 2 },
                  d: { duration: 10, repeat: Infinity, ease: "linear" }
                }}
              />
            </svg>
          </div>

          <div className="p-7 md:p-10 relative z-10">
            <div className="flex flex-col mb-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
                  <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">Total Balance</span>
                </div>
                <div className="flex items-center gap-1 text-[#00ff88] text-[10px] font-bold bg-[#00ff88]/10 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={10} strokeWidth={3} />
                  Active
                </div>
              </div>

              <div className="flex items-baseline gap-2.5">
                <h3 className="text-5xl md:text-6xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  {userData.points.toLocaleString()}
                </h3>
                <span className="text-primary font-bold text-xl tracking-tight">PTS</span>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <p className="text-white/20 text-[11px] font-bold font-mono tracking-wider">
                  Today's Earnings: <span className="text-white/40">+{userData.totalEarnedToday || 0} PTS</span>
                </p>

                {/* XP Progress Bar Mini */}
                <div className="max-w-[200px] mt-1">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-primary uppercase">Level {userData.level || 1}</span>
                      <span className="text-[9px] font-mono text-white/20">{Math.round(getXpProgress(userData.xp || 0).currentLevelXp)} XP</span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${getXpProgress(userData.xp || 0).progress}%` }}
                        className="h-full bg-primary"
                      />
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Earn', icon: Zap, color: 'bg-primary', glow: 'shadow-[0_10px_30px_rgba(0,112,255,0.4)]', href: '/tasks' },
                { label: 'Predict', icon: TrendingUp, color: 'bg-[#15151F]', glow: '', href: '/predict' },
                { label: 'Invite', icon: Share2, color: 'bg-[#15151F]', glow: '', href: '/referrals' }
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => navigate(action.href)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2.5 h-20 rounded-2xl border border-white/[0.05] transition-all active:scale-95 group/btn",
                    action.color,
                    action.glow
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    action.color === 'bg-primary' ? 'bg-white/20' : 'bg-white/5 group-hover/btn:bg-white/10'
                  )}>
                    <action.icon size={20} className="text-white" />
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Streak', val: userData.streak, unit: 'Days', icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-500/10', sub: 'Daily Pulse' },
          { label: 'Squad', val: 0, unit: 'Users', icon: Users, color: 'text-accent', bg: 'bg-accent/10', sub: 'Referrals' },
          { label: 'Global', val: 'Soon', unit: '', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10', sub: 'Leaderboard' },
          { label: 'Rank', val: 'New', unit: '', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', sub: 'Status' }
        ].map((stat, i) => (
          <Card key={i} className="p-4 border-white/[0.03] bg-white/[0.01] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border border-white/[0.05]", stat.bg)}>
                <stat.icon size={14} className={stat.color} />
              </div>
              <span className="text-white/20 text-[9px] font-bold uppercase tracking-widest">{stat.label}</span>
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-mono font-bold text-white">{stat.val}</span>
                <span className="text-[10px] text-white/30 font-bold uppercase">{stat.unit}</span>
              </div>
              <p className="text-[9px] font-bold text-white/20 mt-1 uppercase tracking-tighter">{stat.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Real Quests */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Available Quests</h2>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40">
            Active: <span className="text-primary">{tasks.length}</span>
          </div>
        </div>

        <div className="space-y-4">
          {tasks.map((task) => {
            const { status, nextAvailable } = getTaskStatus(task);
            return (
              <TaskCard
                key={task.id}
                task={task}
                status={status}
                nextAvailable={nextAvailable}
                onClaim={claimTask}
              />
            );
          })}
        </div>
      </div>

      {/* Persistent Activity History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-white/10 rounded-full" />
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Recent Events</h2>
        </div>
        <Card className="p-0 overflow-hidden border-white/[0.03] bg-white/[0.01]">
          <div className="divide-y divide-white/[0.02]">
            {activities.length === 0 ? (
              <div className="p-10 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                No recent activity
              </div>
            ) : activities.map((ev) => (
              <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]",
                    ev.points > 0 ? "bg-green-500" : "bg-primary"
                  )} />
                  <div>
                    <p className="text-[13px] font-bold text-white/80">{ev.type}</p>
                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">
                      {ev.timestamp ? ev.timestamp.toDate().toLocaleString() : 'Processing...'}
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "font-mono text-xs font-bold",
                  ev.points > 0 ? "text-green-500" : "text-white/40"
                )}>
                  {ev.points > 0 ? `+${ev.points}` : ev.points} PTS
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
