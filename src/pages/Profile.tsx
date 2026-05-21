import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import {
  User,
  Copy,
  Trophy,
  Users,
  Zap,
  Settings,
  Shield,
  Bell,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Mail,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  label: string;
  icon: any;
  desc: string | null;
  status?: string;
  action?: () => void;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { activities } = useTasks();
  const navigate = useNavigate();

  if (!userData) return null;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(userData.referralCode);
    toast.success('Referral code copied!');
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
      toast.success('Logged out successfully');
    }
  };

  const stats = [
    { label: 'Total Points', val: userData.points.toLocaleString(), icon: Zap, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Streak Days', val: userData.streak, icon: Trophy, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Tasks Done', val: 0, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Squad Size', val: 0, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
  ];

  const menuSections: MenuSection[] = [
    {
      title: 'Rewards & Growth',
      items: [
        { label: 'Reward History', icon: Trophy, desc: 'View all earned points', action: () => navigate('/dashboard') },
        { label: 'Referral Program', icon: Users, desc: 'Invite friends & earn pulse', action: () => navigate('/referrals') },
      ]
    },
    {
      title: 'Security & Account',
      items: [
        { label: 'Account Security', icon: Shield, desc: 'Password & verification', status: 'Secure' },
        { label: 'Email', icon: Mail, desc: userData.email, status: 'Verified' },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Notifications', icon: Bell, desc: 'Manage alerts' },
        { label: 'App Settings', icon: Settings, desc: 'Theme & display' },
      ]
    },
    {
      title: 'Support',
      items: [
        { label: 'Help Center', icon: LifeBuoy, desc: 'FAQ & Guides' },
      ]
    }
  ];

  return (
    <DashboardLayout>
      {/* Profile Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-0 border-white/[0.05] bg-[#0A0A0F] overflow-hidden relative">
           {/* Ambient Glow background */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-20 -mt-20" />

           <div className="p-8 relative z-10">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-primary/40 p-[2px]">
                    <div className="w-full h-full rounded-[1.9rem] bg-[#0A0A0F] flex items-center justify-center">
                      <User size={40} className="text-primary" />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-[#00ff88] border-4 border-[#0A0A0F] flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-[#050507]" strokeWidth={3} />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                    <h2 className="text-3xl font-bold tracking-tight">{userData.username}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-primary/20 border border-primary/30 text-primary text-[9px] font-bold uppercase tracking-widest">Lv.1 Pioneer</span>
                      <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/40 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={10} />
                        Joined {userData.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Referral Code Box */}
                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.05] mt-2 group cursor-pointer" onClick={copyReferralCode}>
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Referral Code</span>
                      <span className="text-sm font-mono font-bold text-white/70">{userData.referralCode}</span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Copy size={14} className="text-white/40 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </Card>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat, i) => (
          <Card key={i} className="p-4 border-white/[0.03] bg-white/[0.01]">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-white/[0.05]", stat.bg)}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-mono font-bold text-white">{stat.val}</span>
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">{stat.label}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Menu Sections */}
      <div className="space-y-8 mb-12">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.25em] ml-1">{section.title}</h3>
            <Card className="p-0 overflow-hidden border-white/[0.03] bg-white/[0.01]">
              <div className="divide-y divide-white/[0.02]">
                {section.items.map((item: any, i) => (
                  <button
                    key={i}
                    onClick={() => item.action && item.action()}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 group-hover:text-primary group-hover:border-primary/20 transition-all">
                        <item.icon size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-white/90">{item.label}</p>
                        <p className="text-[11px] text-white/30 font-medium">{item.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.status && (
                        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                          {item.status}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-white/10 group-hover:text-white/40 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        ))}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full p-5 rounded-2xl border border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.05] transition-all flex items-center justify-center gap-3 group"
        >
          <LogOut size={18} className="text-red-500/40 group-hover:text-red-500 transition-colors" />
          <span className="text-sm font-bold text-red-500/60 group-hover:text-red-500 transition-colors uppercase tracking-widest">Logout Account</span>
        </button>
      </div>

      {/* Quick History Preview */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-primary/40 rounded-full" />
            <h2 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.25em]">Recent Activity</h2>
          </div>
          <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">View All</button>
        </div>
        <Card className="p-0 overflow-hidden border-white/[0.03] bg-white/[0.01]">
          <div className="divide-y divide-white/[0.02]">
            {activities.length === 0 ? (
              <div className="p-10 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                No activity found
              </div>
            ) : activities.slice(0, 3).map((ev) => (
              <div key={ev.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 rounded-full bg-primary/40" />
                   <div>
                    <p className="text-[13px] font-bold text-white/80">{ev.type}</p>
                    <p className="text-[9px] text-white/20 font-bold uppercase tracking-tighter">
                      {ev.timestamp ? ev.timestamp.toDate().toLocaleString() : 'Processing...'}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-green-500">+{ev.points} PTS</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
