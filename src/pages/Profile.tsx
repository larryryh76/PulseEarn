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
import { useNavigate } from 'react-router-dom';
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
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60]"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-x-0 bottom-0 top-16 bg-[#050507] z-[70] rounded-t-[2.5rem] border-t border-white/10 flex flex-col"
        >
          <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
             <h2 className="text-xl font-bold tracking-tight">{title}</h2>
             <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                <X size={20} />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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

  const isAdmin = userData.role === 'admin';
  const xpInfo = getXpProgress(userData.xp || 0);

  // Real stats calculation
  const completedCount = Object.keys(userTasks).length;

  const stats = isAdmin ? [
    { label: 'Protocol Access', val: 'Root', icon: Shield, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'System Health', val: '100%', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  ] : [
    { label: 'Completed', val: completedCount, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Referrals', val: userData.stats?.referralsCount || 0, icon: Users, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Predictions', val: userData.stats?.predictionsCount || 0, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Total Pulse', val: userData.points.toLocaleString(), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <DashboardLayout>
      {/* Premium Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-0 border-white/[0.05] bg-[#0A0A0F] overflow-hidden relative group">
           <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[120px] rounded-full -mr-32 -mt-32 group-hover:bg-primary/20 transition-all duration-700" />

           <div className="p-8 md:p-10 relative z-10">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar with Level Ring */}
                <div className="relative">
                  <div className="w-28 h-24 md:w-32 md:h-32 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/50 to-accent p-[3px] shadow-[0_0_30px_rgba(0,112,255,0.2)]">
                    <div className="w-full h-full rounded-[2.4rem] bg-[#0A0A0F] flex items-center justify-center overflow-hidden">
                      <img
                        src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-widest shadow-xl">
                    LV.{userData.level}
                  </div>
                </div>

                {/* Main Info */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                    <h2 className="text-4xl font-bold tracking-tight text-white">{userData.username}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/30 text-primary text-[9px] font-bold uppercase tracking-[0.2em]">
                        {isAdmin ? 'System Administrator' : 'Core Pioneer'}
                      </span>
                      <div className="h-4 w-[1px] bg-white/10 hidden md:block" />
                      <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar size={12} className="text-white/20" />
                        Joined {userData.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* XP Progress Bar */}
                  {!isAdmin && (
                    <div className="max-w-md mx-auto md:mx-0 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Next Level Progress</span>
                        <span className="text-[10px] font-mono text-primary font-bold">{Math.round(xpInfo.currentLevelXp)} / {xpInfo.requiredXp} XP</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${xpInfo.progress}%` }}
                          className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_15px_rgba(0,112,255,0.4)]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    {!isAdmin && (
                      <button
                        onClick={copyReferralCode}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all group"
                      >
                        <div className="flex flex-col items-start leading-tight">
                          <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.1em]">Referral Link</span>
                          <span className="text-xs font-mono font-bold text-white/60">{userData.referralCode}</span>
                        </div>
                        <Copy size={14} className="text-white/20 group-hover:text-primary transition-colors" />
                      </button>
                    )}
                    <button
                      onClick={() => setActiveOverlay('settings')}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all text-[10px] font-bold uppercase tracking-widest text-white/60"
                    >
                      <Settings size={14} />
                      Configure
                    </button>
                  </div>
                </div>
              </div>
           </div>
        </Card>
      </motion.div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((stat, i) => (
          <Card key={i} className="p-5 border-white/[0.03] bg-[#0A0A0F] hover:border-primary/20 transition-colors">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-5 border border-white/[0.05]", stat.bg)}>
              <stat.icon size={18} className={stat.color} />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-mono font-bold text-white tracking-tight">{stat.val}</span>
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1.5">{stat.label}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Operational Menu */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
         {/* System Menu */}
         <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.25em] ml-2">Protocol Access</h3>
            <Card className="p-0 overflow-hidden border-white/[0.03] bg-[#0A0A0F]">
               <div className="divide-y divide-white/[0.02]">
                  {[
                    { label: 'Reward History', icon: Trophy, desc: 'Complete transaction ledger', action: () => setActiveOverlay('history') },
                    { label: 'Squad & Network', icon: Users, desc: 'Manage node connections', action: () => navigate('/referrals') },
                    { label: 'Help Center', icon: LifeBuoy, desc: 'Protocol documentation', action: () => setActiveOverlay('help') },
                    { label: 'System Settings', icon: Settings, desc: 'Device & UI preferences', action: () => setActiveOverlay('settings') },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 group-hover:text-primary group-hover:border-primary/20 transition-all">
                          <item.icon size={18} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-white/90">{item.label}</p>
                          <p className="text-[10px] text-white/30 font-medium">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/10 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                  <button
                    onClick={handleLogout}
                    className="w-full p-5 flex items-center justify-center gap-3 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all group"
                  >
                    <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-widest">Logout Protocol Session</span>
                  </button>
               </div>
            </Card>
         </div>

         {/* Activity Log */}
         <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.25em]">Global Event Feed</h3>
               <span className="text-[8px] font-bold text-green-500 uppercase tracking-tighter flex items-center gap-1">
                  <Activity size={10} />
                  Live Sync
               </span>
            </div>
            <Card className="p-0 overflow-hidden border-white/[0.03] bg-[#0A0A0F]">
               <div className="divide-y divide-white/[0.02]">
                  {activities.length === 0 ? (
                    <div className="py-20 text-center">
                       <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest italic">No events detected</p>
                    </div>
                  ) : activities.slice(0, 5).map((ev) => (
                    <div key={ev.id} className="p-4 flex items-center justify-between hover:bg-white/[0.01] transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                         <div>
                          <p className="text-[12px] font-bold text-white/80">{ev.type.replace('_', ' ')}</p>
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-tighter">
                            {ev.timestamp ? ev.timestamp.toDate().toLocaleTimeString() : 'Processing...'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-primary">{ev.points > 0 ? '+' : ''}{ev.points} PTS</span>
                    </div>
                  ))}
               </div>
            </Card>
         </div>
      </div>

      {/* Overlays */}
      <Overlay
        isOpen={activeOverlay === 'history'}
        onClose={() => setActiveOverlay(null)}
        title="Transaction Ledger"
      >
        <TransactionHistory />
      </Overlay>

      <Overlay
        isOpen={activeOverlay === 'settings'}
        onClose={() => setActiveOverlay(null)}
        title="Protocol Configuration"
      >
        <SettingsPanel />
      </Overlay>

      <Overlay
        isOpen={activeOverlay === 'help'}
        onClose={() => setActiveOverlay(null)}
        title="Pulse Help Center"
      >
        <HelpCenter />
      </Overlay>

    </DashboardLayout>
  );
};

export default Profile;
