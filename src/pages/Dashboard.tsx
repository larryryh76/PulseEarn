import React from 'react';
import MainLayout from '../layouts/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Zap, Trophy, Share2, LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  if (!userData) return null;

  return (
    <MainLayout>
      <div className="container mx-auto px-6 pt-32 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              Welcome, <span className="text-primary">{userData.username}</span>
            </h1>
            <p className="text-white/40">Manage your earnings and track your progress.</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut size={18} />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="flex flex-col gap-4 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-sm font-bold uppercase tracking-widest">Total Points</span>
              <Zap className="text-primary" size={20} />
            </div>
            <div className="text-4xl font-mono font-bold text-white">{userData.points}</div>
            <div className="text-xs text-primary/60 font-medium">+120 this week</div>
          </Card>

          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-sm font-bold uppercase tracking-widest">Daily Streak</span>
              <Trophy className="text-secondary" size={20} />
            </div>
            <div className="text-4xl font-mono font-bold text-white">{userData.streak} Days</div>
            <div className="text-xs text-secondary/60 font-medium">Keep it up!</div>
          </Card>

          <Card className="flex flex-col gap-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-white/40 text-sm font-bold uppercase tracking-widest">Referral Program</span>
              <Share2 className="text-accent" size={20} />
            </div>
            <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mt-2">
              <div className="font-mono font-bold text-lg">{userData.referralCode}</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(userData.referralCode);
                  toast.success('Copied to clipboard!');
                }}
                className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors"
              >
                Copy Code
              </button>
            </div>
            <div className="text-xs text-white/30 font-medium">Share your code and earn 10% of your friends' earnings.</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-2xl font-bold">Recommended Tasks</h2>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <User className="text-white/40" />
                  </div>
                  <div>
                    <h4 className="font-bold">Verify Social Profile {i}</h4>
                    <p className="text-white/40 text-sm">Connect your X account to earn 50 points.</p>
                  </div>
                </div>
                <Button size="sm">Start</Button>
              </Card>
            ))}
          </div>

          <div className="space-y-8">
            <h2 className="text-2xl font-bold">Activity Log</h2>
            <Card className="space-y-6">
              {[
                { type: 'Signup Bonus', amount: '+100', date: 'Just now' },
                { type: 'Welcome Reward', amount: '+50', date: '2 mins ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="font-bold text-sm">{activity.type}</div>
                    <div className="text-[10px] text-white/30">{activity.date}</div>
                  </div>
                  <div className="font-mono text-primary font-bold">{activity.amount}</div>
                </div>
              ))}
              <button className="w-full text-center text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white pt-2 transition-colors">
                View Full History
              </button>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
