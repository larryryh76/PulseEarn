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
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { userData } = useAuth();

  if (!userData) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-widest mb-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          Live Platform Stats
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Pulse <span className="text-primary">Dashboard</span>
        </h1>
        <p className="text-white/40 font-medium">Hello, {userData.username}. Welcome back to the ecosystem.</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Main Points Card */}
        <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Available Balance</p>
              <h3 className="text-5xl font-mono font-bold text-white tracking-tighter">
                {userData.points.toLocaleString()}
                <span className="text-primary ml-2">PTS</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Zap className="text-primary" size={24} />
            </div>
          </div>
          <div className="flex gap-4">
            <Button size="sm" className="w-full">Stake Points</Button>
            <Button variant="outline" size="sm" className="w-full">History</Button>
          </div>
        </Card>

        {/* Streak Card */}
        <Card className="flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Daily Streak</p>
              <h3 className="text-3xl font-mono font-bold text-white">{userData.streak} Days</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
              <Trophy className="text-secondary" size={20} />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/[0.05]">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/20 mb-2">
              <span>Next Milestone</span>
              <span>7 Days</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-1000"
                style={{ width: `${(userData.streak / 7) * 100}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Referral Card */}
        <Card className="flex flex-col justify-between border-accent/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1">Referral Code</p>
              <h3 className="text-xl font-mono font-bold text-white tracking-widest uppercase">{userData.referralCode}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
              <Share2 className="text-accent" size={20} />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-6 border-accent/20 text-accent hover:bg-accent/10"
            onClick={() => {
              navigator.clipboard.writeText(userData.referralCode);
              toast.success('Copied to clipboard');
            }}
          >
            Copy Invite Link
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Daily Reward System Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Gift size={20} className="text-primary" />
              Daily Challenges
            </h2>
            <button className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors">
              Refresh Tasks
            </button>
          </div>

          <div className="space-y-4">
            <Card className="p-5 flex items-center justify-between group border-primary/10">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <CheckCircle2 className="text-primary" size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Daily Login Reward</h4>
                  <p className="text-[11px] text-white/40">Claimed automatically on your first visit today.</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-primary font-mono font-bold">+10 PTS</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-green-500">Completed</span>
              </div>
            </Card>

            {[
              { title: 'Market Prediction', desc: 'Make a correct price prediction on BTC.', points: '+50', icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
              { title: 'Community Vote', desc: 'Vote on the next ecosystem improvement.', points: '+25', icon: Clock, color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' }
            ].map((task, i) => (
              <Card key={i} className={`p-5 flex items-center justify-between group border-transparent hover:${task.border}`}>
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl ${task.bg} flex items-center justify-center shrink-0 border border-white/[0.05]`}>
                    <task.icon className={task.color} size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{task.title}</h4>
                    <p className="text-[11px] text-white/40">{task.desc}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="px-5 border-white/[0.08] hover:border-primary/50 group-hover:bg-primary group-hover:text-white transition-all">
                  Start
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock size={20} className="text-white/40" />
            Recent Activity
          </h2>
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-white/[0.05]">
              {[
                { type: 'Reward', title: 'Daily Login Bonus', amount: '+10 PTS', time: 'Just now' },
                { type: 'Bonus', title: 'Welcome Package', amount: '+100 PTS', time: '1 day ago' }
              ].map((activity, i) => (
                <div key={i} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div>
                    <p className="text-xs font-bold mb-0.5">{activity.title}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium">{activity.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-primary">{activity.amount}</p>
                    <ArrowUpRight size={14} className="text-white/10 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white/[0.02] border-t border-white/[0.05]">
              <button className="w-full text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors">
                Explore All History
              </button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
