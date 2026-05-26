import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import TransactionHistory from '../components/ui/TransactionHistory';
import SettingsPanel from '../components/ui/SettingsPanel';
import HelpCenter from '../components/ui/HelpCenter';
import {
  Copy,
  Users,
  Zap,
  Settings,
  Shield,
  LifeBuoy,
  LogOut,
  ChevronRight,
  Calendar,
  CheckCircle2,
  X,
  Activity,
  Hash,
  Award,
  ZapOff
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
          className="fixed inset-0 bg-black/98 backdrop-blur-xl z-[80]"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-black z-[90] border-l border-white/10 flex flex-col shadow-2xl"
        >
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
             <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest">{title}</h2>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Account Management</p>
             </div>
             <button onClick={onClose} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                <X size={24} />
             </button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#020202]">
             <div className="max-w-xl mx-auto">
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
    if (confirm('Authorize session termination?')) {
      await logout();
      toast.success('Session Closed');
    }
  };

  const isAdmin = userData.role === 'admin';
  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-16 pb-32">

        {/* PREMIUM IDENTITY HERO */}
        <section className="relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32" />

          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            {/* Avatar System */}
            <div className="relative shrink-0">
              <div className="w-40 h-40 md:w-56 md:h-56 rounded-[3rem] bg-white/[0.02] p-[1px] shadow-2xl border border-white/10 group overflow-hidden">
                <div className="w-full h-full rounded-[2.9rem] bg-black flex items-center justify-center overflow-hidden relative">
                  <img
                    src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`}
                    alt="Identity"
                    className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl bg-white text-black text-[11px] font-bold uppercase tracking-[0.2em] shadow-2xl">
                Lvl {userData.level}
              </div>
            </div>

            {/* Identity Info */}
            <div className="flex-1 text-center md:text-left space-y-10">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                   <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white uppercase leading-none">{userData.username}</h2>
                   <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                      {isAdmin ? 'System Admin' : 'Member'}
                   </div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                  <span className="text-white/20 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                     <Calendar size={14} className="text-white/10" />
                     Joined {userData.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-white/20 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                     <Hash size={14} className="text-white/10" />
                     ID: {userData.uid.slice(0, 8)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button
                  onClick={copyReferralCode}
                  className="flex items-center gap-4 px-8 py-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                >
                  <span className="text-[12px] font-mono font-bold text-white/40 group-hover:text-white transition-colors">{userData.referralCode}</span>
                  <Copy size={16} className="text-white/10 group-hover:text-primary transition-colors" />
                </button>
                <button
                  onClick={() => setActiveOverlay('settings')}
                  className="flex items-center gap-3 px-8 py-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white"
                >
                  <Settings size={16} />
                  Configure
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* PROGRESSION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

           <div className="lg:col-span-8 space-y-10">
              {/* XP Progression Card */}
              <div className="p-10 rounded-[3rem] bg-black border border-white/10 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                    <Award size={200} />
                 </div>
                 <div className="flex flex-col md:flex-row justify-between items-end mb-12 relative z-10">
                    <div className="space-y-4">
                       <h3 className="text-4xl font-bold text-white tracking-tighter uppercase">Progression</h3>
                       <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.4em]">Current Experience Cycle</p>
                    </div>
                    <div className="text-right">
                       <span className="text-6xl font-mono font-bold text-white leading-none">{Math.round(xpInfo.progress)}%</span>
                       <p className="text-[11px] font-mono text-primary font-bold uppercase tracking-widest mt-2">{Math.round(xpInfo.currentLevelXp)} / {xpInfo.requiredXp} XP</p>
                    </div>
                 </div>
                 <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpInfo.progress}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_15px_rgba(0,102,255,0.4)]"
                    />
                 </div>
              </div>

              {/* Account Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'Marketplace Wins', val: completedCount, icon: CheckCircle2, color: 'text-success' },
                   { label: 'Referral Count', val: userData.stats?.referralsCount || 0, icon: Users, color: 'text-accent' },
                   { label: 'Active Streak', val: `${userData.streak || 0} Days`, icon: Zap, color: 'text-primary' },
                 ].map((stat, i) => (
                   <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/5 space-y-8 hover:bg-white/[0.02] transition-colors group">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 bg-black group-hover:scale-110 transition-transform", stat.color)}>
                         <stat.icon size={20} />
                      </div>
                      <div className="space-y-1">
                         <p className="text-3xl font-mono font-bold text-white tracking-tighter">{stat.val}</p>
                         <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{stat.label}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="lg:col-span-4 space-y-10">
              <div className="flex items-center gap-3 px-2">
                 <Shield size={18} className="text-primary" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Management</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 {[
                   { label: 'Audit Ledger', icon: Activity, desc: 'Transactional history', action: () => setActiveOverlay('history') },
                   { label: 'Security Panel', icon: Shield, desc: 'Protection settings', action: () => setActiveOverlay('settings') },
                   { label: 'Support Center', icon: LifeBuoy, desc: 'Common questions', action: () => setActiveOverlay('help') },
                 ].map((item, i) => (
                   <button
                     key={i}
                     onClick={item.action}
                     className="w-full p-6 rounded-3xl bg-black border border-white/5 flex items-center justify-between hover:border-primary/40 transition-all group"
                   >
                     <div className="flex items-center gap-6 text-left">
                       <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                         <item.icon size={20} />
                       </div>
                       <div>
                         <p className="text-sm font-bold text-white uppercase tracking-tight">{item.label}</p>
                         <p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter mt-0.5">{item.desc}</p>
                       </div>
                     </div>
                     <ChevronRight size={16} className="text-white/10 group-hover:text-white transition-colors" />
                   </button>
                 ))}
                 <button
                   onClick={handleLogout}
                   className="w-full p-6 rounded-3xl bg-danger/5 border border-danger/10 flex items-center justify-center gap-4 text-danger/40 hover:text-danger hover:bg-danger/10 transition-all uppercase font-bold text-[10px] tracking-[0.3em]"
                 >
                   <LogOut size={18} />
                   Logout
                 </button>
              </div>
           </div>
        </div>

        {/* RECENT ACTIVITY LOG */}
        <section className="space-y-10">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <Activity size={18} className="text-success" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Activity Stream</h3>
              </div>
              <button onClick={() => setActiveOverlay('history')} className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] hover:underline">
                 View Full Ledger
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.length === 0 ? (
                <div className="col-span-full py-24 text-center bg-black border border-white/5 rounded-[2.5rem]">
                   <ZapOff className="mx-auto text-white/5 mb-6" size={40} />
                   <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.5em]">No recent activity signals</p>
                </div>
              ) : activities.slice(0, 6).map((ev) => (
                <div key={ev.id} className="p-8 rounded-[2rem] bg-white/[0.01] border border-white/5 flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                   <div className="space-y-1.5">
                      <p className="text-[13px] font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">{ev.type.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-white/20 font-mono uppercase font-bold">
                        {ev.timestamp ? ev.timestamp.toDate().toLocaleDateString() : '---'}
                      </p>
                   </div>
                   <span className="text-xl font-mono font-bold text-primary">+{ev.points}</span>
                </div>
              ))}
           </div>
        </section>
      </div>

      <Overlay isOpen={activeOverlay === 'history'} onClose={() => setActiveOverlay(null)} title="Audit Ledger"><TransactionHistory /></Overlay>
      <Overlay isOpen={activeOverlay === 'settings'} onClose={() => setActiveOverlay(null)} title="Security Panel"><SettingsPanel /></Overlay>
      <Overlay isOpen={activeOverlay === 'help'} onClose={() => setActiveOverlay(null)} title="Support Center"><HelpCenter /></Overlay>

    </DashboardLayout>
  );
};

export default Profile;
