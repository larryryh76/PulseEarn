import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import TransactionHistory from '../components/ui/TransactionHistory';
import SettingsPanel from '../components/ui/SettingsPanel';
import HelpCenter from '../components/ui/HelpCenter';
import {
  Copy,
  Trophy,
  Users,
  Zap,
  Settings,
  Shield,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Calendar,
  CheckCircle2,
  TrendingUp,
  X,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { getXpProgress } from '../utils/progression';

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Overlay: React.FC<OverlayProps> = ({ isOpen, onClose, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/95 backdrop-blur-md z-[60]"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-x-0 bottom-0 top-12 bg-[#050507] z-[70] rounded-t-3xl border-t border-white/10 flex flex-col"
        >
          <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
             <h2 className="text-lg font-bold tracking-tight">{title}</h2>
             <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                <X size={18} />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
             <div className="max-w-3xl mx-auto">
                {children}
             </div>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { activities, userTasks } = useTasks();
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);

  if (!userData) return null;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(userData.referralCode);
    toast.success('Code copied!');
  };

  const handleLogout = async () => {
    if (confirm('Log out of PulseEarn?')) {
      await logout();
      toast.success('Logged out');
    }
  };

  const isAdmin = userData.role === 'admin';
  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  const stats = [
    { label: 'Tasks', val: completedCount, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Referrals', val: userData.stats?.referralsCount || 0, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Predictions', val: userData.stats?.predictionsCount || 0, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Points', val: userData.points.toLocaleString(), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-0 border-white/[0.05] bg-[#0A0A0F] overflow-hidden relative rounded-3xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-24 -mt-24" />

             <div className="p-6 md:p-8 relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2rem] bg-gradient-to-br from-primary to-accent p-[2px]">
                      <div className="w-full h-full rounded-[1.9rem] bg-[#0A0A0F] flex items-center justify-center overflow-hidden">
                        <img
                          src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold uppercase tracking-widest shadow-lg">
                      LV.{userData.level}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{userData.username}</h2>
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-primary/20 border border-primary/30 text-primary text-[8px] font-bold uppercase tracking-widest">
                          {isAdmin ? 'Administrator' : 'Pulse Member'}
                        </span>
                        <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar size={10} className="text-white/20" />
                          Joined {userData.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {!isAdmin && (
                      <div className="max-w-xs mx-auto md:mx-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Next Level</span>
                          <span className="text-[9px] font-mono text-primary font-bold">{Math.round(xpInfo.currentLevelXp)} / {xpInfo.requiredXp} XP</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${xpInfo.progress}%` }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                      <button
                        onClick={copyReferralCode}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                      >
                        <span className="text-[10px] font-mono font-bold text-white/60">{userData.referralCode}</span>
                        <Copy size={12} className="text-white/20" />
                      </button>
                      <button
                        onClick={() => setActiveOverlay('settings')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all text-[9px] font-bold uppercase tracking-widest text-white/60"
                      >
                        <Settings size={12} />
                        Settings
                      </button>
                    </div>
                  </div>
                </div>
             </div>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <Card key={i} className="p-4 border-white/[0.03] bg-[#0A0A0F] rounded-2xl">
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-4 border border-white/[0.05]", stat.bg)}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-mono font-bold text-white tracking-tight">{stat.val}</span>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-1">{stat.label}</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Menu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Account Menu</h3>
              <Card className="p-0 overflow-hidden border-white/[0.03] bg-[#0A0A0F] rounded-2xl">
                 <div className="divide-y divide-white/[0.02]">
                    {[
                      { label: 'Activity History', icon: Trophy, desc: 'Your rewards and transactions', action: () => setActiveOverlay('history') },
                      { label: 'Help & Support', icon: LifeBuoy, desc: 'Get help or read guides', action: () => setActiveOverlay('help') },
                      { label: 'Security', icon: Shield, desc: 'Manage your security', action: () => setActiveOverlay('settings') },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={item.action}
                        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 group-hover:text-primary transition-all">
                            <item.icon size={16} />
                          </div>
                          <div className="text-left">
                            <p className="text-[13px] font-bold text-white/90">{item.label}</p>
                            <p className="text-[10px] text-white/30">{item.desc}</p>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-white/10" />
                      </button>
                    ))}
                    <button
                      onClick={handleLogout}
                      className="w-full p-4 flex items-center justify-center gap-3 text-red-500/40 hover:text-red-500 transition-all"
                    >
                      <LogOut size={16} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
                    </button>
                 </div>
              </Card>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                 <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Recent Activity</h3>
                 <Activity size={12} className="text-green-500/40" />
              </div>
              <Card className="p-0 overflow-hidden border-white/[0.03] bg-[#0A0A0F] rounded-2xl">
                 <div className="divide-y divide-white/[0.02]">
                    {activities.length === 0 ? (
                      <div className="py-12 text-center">
                         <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest">No activity</p>
                      </div>
                    ) : activities.slice(0, 4).map((ev) => (
                      <div key={ev.id} className="p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                           <div>
                            <p className="text-[11px] font-bold text-white/80">{ev.type.replace('_', ' ')}</p>
                            <p className="text-[8px] text-white/30 font-bold uppercase tracking-tighter">
                              {ev.timestamp ? ev.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-primary">{ev.points > 0 ? '+' : ''}{ev.points}</span>
                      </div>
                    ))}
                 </div>
              </Card>
           </div>
        </div>
      </div>

      <Overlay isOpen={activeOverlay === 'history'} onClose={() => setActiveOverlay(null)} title="Activity History"><TransactionHistory /></Overlay>
      <Overlay isOpen={activeOverlay === 'settings'} onClose={() => setActiveOverlay(null)} title="Settings"><SettingsPanel /></Overlay>
      <Overlay isOpen={activeOverlay === 'help'} onClose={() => setActiveOverlay(null)} title="Help Center"><HelpCenter /></Overlay>
    </DashboardLayout>
  );
};

export default Profile;
