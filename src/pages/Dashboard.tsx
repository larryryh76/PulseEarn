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
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { cn } from '../utils';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* Wallet-First Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-0 border-primary/20 bg-gradient-to-br from-primary/[0.08] via-transparent to-transparent overflow-hidden relative">
          {/* Subtle Graph Overlay (Mock) */}
          <div className="absolute bottom-0 right-0 left-0 h-32 opacity-20 pointer-events-none">
            <svg viewBox="0 0 400 100" className="w-full h-full preserve-3d">
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2 }}
                d="M0 80 Q 50 70, 100 85 T 200 60 T 300 40 T 400 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary"
              />
            </svg>
          </div>

          <div className="p-6 md:p-8 relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Total Portfolio</p>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-500 text-[10px] font-bold">
                    <ArrowUpRight size={10} />
                    +4.2%
                  </div>
                </div>
                <h3 className="text-4xl md:text-5xl font-mono font-bold text-white tracking-tighter">
                  {userData.points.toLocaleString()}
                  <span className="text-primary/60 text-2xl ml-2 font-heading tracking-normal">PTS</span>
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(0,112,255,0.15)] animate-pulse">
                <Zap className="text-primary" size={24} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <Button size="sm" className="flex-1 min-w-[100px] h-10 bg-primary shadow-lg shadow-primary/20">
                <Plus size={16} />
                Earn
              </Button>
              <Button variant="outline" size="sm" className="flex-1 min-w-[100px] h-10 border-white/10 bg-white/[0.03]">
                <TrendingUp size={16} />
                Predict
              </Button>
              <Button variant="outline" size="sm" className="flex-1 min-w-[100px] h-10 border-white/10 bg-white/[0.03]">
                <Share2 size={16} />
                Invite
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4 flex flex-col justify-between h-32 border-white/[0.05]">
          <div className="flex justify-between items-start">
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Streak</p>
            <Trophy className="text-secondary opacity-50" size={16} />
          </div>
          <div>
            <h4 className="text-xl font-mono font-bold leading-none">{userData.streak} Days</h4>
            <p className="text-[9px] text-white/20 mt-1 font-bold">Top 5% Users</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between h-32 border-white/[0.05]">
          <div className="flex justify-between items-start">
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Referrals</p>
            <Users className="text-accent opacity-50" size={16} />
          </div>
          <div>
            <h4 className="text-xl font-mono font-bold leading-none">12 Users</h4>
            <p className="text-[9px] text-accent mt-1 font-bold">+150 PTS Earned</p>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between h-32 border-white/[0.05] col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Global Rank</p>
            <TrendingUp className="text-primary opacity-50" size={16} />
          </div>
          <div>
            <h4 className="text-xl font-mono font-bold leading-none">#1,242</h4>
            <div className="flex items-center gap-1 mt-1 text-[9px] text-green-500 font-bold">
              <ArrowUpRight size={10} />
              +15 today
            </div>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between h-32 border-white/[0.05] col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest">Promo Code</p>
            <Share2 className="text-white/20" size={16} />
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(userData.referralCode);
              toast.success('Copied!');
            }}
            className="text-sm font-mono font-bold text-white/80 tracking-widest hover:text-primary transition-colors text-left"
          >
            {userData.referralCode}
          </button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Daily Challenges - Actionable Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold flex items-center gap-2 text-white/60">
              <Gift size={16} className="text-primary" />
              Daily Earnings
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Card className="p-4 flex items-center justify-between group border-primary/10 bg-primary/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <CheckCircle2 className="text-primary" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-[13px]">Daily Login Bonus</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-mono text-primary font-bold">+10 PTS</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[9px] font-bold uppercase tracking-tighter text-green-500">Collected</span>
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="text-white/10 group-hover:text-primary transition-colors" />
            </Card>

            {[
              { title: 'BTC Prediction', desc: 'Predict next 1h move', points: '+50', icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
              { title: 'Market Sentiment', desc: 'Complete daily survey', points: '+25', icon: Clock, color: 'text-secondary', bg: 'bg-secondary/10' }
            ].map((task, i) => (
              <Card key={i} className="p-4 flex items-center justify-between group border-transparent hover:border-white/10 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${task.bg} flex items-center justify-center shrink-0 border border-white/[0.05]`}>
                    <task.icon className={task.color} size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[13px]">{task.title}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-mono text-white/60 font-bold">{task.points} PTS</span>
                      <div className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[9px] text-white/30 font-medium">{task.desc}</span>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-white/[0.05] text-[10px] font-bold group-hover:bg-primary group-hover:text-white transition-all">
                  Claim
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Events - Compact */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 text-white/60 mb-2">
            <Clock size={16} />
            History
          </h2>
          <Card className="p-0 overflow-hidden border-white/[0.05]">
            <div className="divide-y divide-white/[0.03]">
              {[
                { title: 'Daily Bonus', amount: '+10', time: 'Just now', up: true },
                { title: 'Signup Bonus', amount: '+100', time: 'Yesterday', up: true },
                { title: 'Stake Fee', amount: '-5', time: '2d ago', up: false }
              ].map((activity, i) => (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      activity.up ? "bg-green-500" : "bg-red-500"
                    )} />
                    <div>
                      <p className="text-xs font-bold">{activity.title}</p>
                      <p className="text-[9px] text-white/20 uppercase font-medium">{activity.time}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-xs font-mono font-bold",
                    activity.up ? "text-green-500" : "text-red-500"
                  )}>
                    {activity.amount}
                  </p>
                </div>
              ))}
            </div>
            <button className="w-full py-3 bg-white/[0.02] text-[9px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors">
              View All
            </button>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

const Users = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default Dashboard;
