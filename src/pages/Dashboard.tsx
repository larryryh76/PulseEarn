import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Zap,
  Trophy,
  Share2,
  TrendingUp,
  Clock,
  Gift,
  CheckCircle2,
  ArrowUpRight,
  Plus,
  ArrowRight,
  Users,
  Copy,
  ChevronRight,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { cn } from '../utils';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
          </div>
          <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.3em]">Syncing Protocol</p>
        </div>
      </div>
    </DashboardLayout>
  );

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
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" x2="0%">
                  <stop offset="0%" stopColor="#0070ff" stopOpacity="0" />
                  <stop offset="50%" stopColor="#0070ff" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#00f2ff" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Animated Glow Path */}
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
                  <span className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">Net Assets</span>
                </div>
                <div className="flex items-center gap-1 text-[#00ff88] text-[10px] font-bold bg-[#00ff88]/10 px-2 py-0.5 rounded-full">
                  <ArrowUpRight size={10} strokeWidth={3} />
                  4.28%
                </div>
              </div>

              <div className="flex items-baseline gap-2.5">
                <h3 className="text-5xl md:text-6xl font-mono font-bold text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                  {userData.points.toLocaleString()}
                </h3>
                <span className="text-primary font-bold text-xl tracking-tight">PTS</span>
              </div>

              <p className="text-white/20 text-[11px] font-bold mt-2 font-mono tracking-wider">≈ ${(userData.points * 0.12).toFixed(2)} USD</p>
            </div>

            {/* Quick Actions - Floating Feel */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Earn', icon: Zap, color: 'bg-primary', glow: 'shadow-[0_10px_30px_rgba(0,112,255,0.4)]' },
                { label: 'Predict', icon: TrendingUp, color: 'bg-[#15151F]', glow: '' },
                { label: 'Invite', icon: Share2, color: 'bg-[#15151F]', glow: '' }
              ].map((action, i) => (
                <button
                  key={i}
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

      {/* Stats Grid - High Density Micro-Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Streak', val: userData.streak, unit: 'Days', icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-500/10', sub: 'Top 5% Rank' },
          { label: 'Squad', val: 12, unit: 'Users', icon: Users, color: 'text-accent', bg: 'bg-accent/10', sub: '+150 PTS Earned' },
          { label: 'Global', val: '#1.2k', unit: '', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10', sub: 'Rising Star' },
          { label: 'Yield', val: '12.4', unit: '%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', sub: 'Daily Avg' }
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

      {/* Gamified Quests - Vertical addictive list */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary rounded-full" />
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Available Quests</h2>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-white/40">
            Progress: <span className="text-primary">1/3</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Task 1 - Completed */}
          <Card className="p-5 border-primary/20 bg-primary/[0.04] relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
               <CheckCircle2 size={80} className="text-primary" />
             </div>
             <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 shadow-[0_0_20px_rgba(0,112,255,0.15)]">
                  <CheckCircle2 className="text-primary" size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-base tracking-tight">Daily Check-in</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] font-mono font-bold text-primary">+10 PULSE</span>
                    <div className="w-1 h-1 rounded-full bg-primary/30" />
                    <span className="text-[9px] font-bold uppercase text-green-500">Collected</span>
                  </div>
                </div>
              </div>
              <button className="px-5 py-2 rounded-xl bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest">
                Done
              </button>
            </div>
          </Card>

          {/* Pending Tasks */}
          {[
            { title: 'Market Oracle', sub: 'Predict next BTC move', pts: '+50', icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
            { title: 'Social Pulse', sub: 'Share daily stats', pts: '+25', icon: Share2, color: 'text-secondary', bg: 'bg-secondary/10' }
          ].map((task, i) => (
            <Card key={i} className="p-5 border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.03] transition-all group cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/[0.05] group-hover:scale-110 transition-transform", task.bg)}>
                    <task.icon className={task.color} size={28} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base tracking-tight">{task.title}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] font-mono font-bold text-white/60">{task.pts} PULSE</span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">{task.sub}</span>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all">
                  <ChevronRight size={20} className="text-white/20 group-hover:text-white" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* High Density History */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-white/10 rounded-full" />
          <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Recent Events</h2>
        </div>
        <Card className="p-0 overflow-hidden border-white/[0.03] bg-white/[0.01]">
          <div className="divide-y divide-white/[0.02]">
            {[
              { type: 'Check-in', val: '+10', time: 'Just now', positive: true },
              { type: 'Referral', val: '+50', time: '2 hours ago', positive: true },
              { type: 'Withdraw', val: '-100', time: 'Yesterday', positive: false }
            ].map((ev, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    ev.positive ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
                  )} />
                  <div>
                    <p className="text-[13px] font-bold text-white/80">{ev.type}</p>
                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">{ev.time}</p>
                  </div>
                </div>
                <span className={cn(
                  "font-mono text-xs font-bold",
                  ev.positive ? "text-green-500" : "text-white/40"
                )}>
                  {ev.val} PTS
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
