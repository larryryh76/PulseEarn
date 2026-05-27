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
          className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-black z-[90] border-l border-border-subtle flex flex-col shadow-2xl"
        >
          <div className="p-8 border-b border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
             <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest">{title}</h2>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Management Interface</p>
             </div>
             <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition-all">
                <X size={20} />
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
    toast.success('Identity code copied');
  };

  const handleLogout = async () => {
    if (confirm('Terminate the current platform session?')) {
      await logout();
      toast.success('Session closed');
    }
  };

  const isAdmin = userData.role === 'admin';
  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-32">

        {/* IDENTITY CORE */}
        <section className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
          <div className="relative shrink-0">
             <div className="w-40 h-40 md:w-48 md:h-40 rounded-3xl overflow-hidden surface-2 relative group">
                <img
                  src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`}
                  alt=""
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
             </div>
             <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl">
                Tier {userData.level}
             </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-8">
             <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                   <h1 className="text-display text-white">{userData.username}</h1>
                   <div className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20">
                      {isAdmin ? 'Systems Admin' : 'Active Member'}
                   </div>
                </div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                   <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Calendar size={14} className="opacity-40" />
                      Started: {userData.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                   </span>
                   <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Hash size={14} className="opacity-40" />
                      ID: {userData.uid.slice(0, 8)}
                   </span>
                </div>
             </div>

             <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <button
                  onClick={copyReferralCode}
                  className="btn-secondary h-12 px-6 flex items-center gap-3"
                >
                   <span className="text-[12px] font-mono text-white/40">{userData.referralCode}</span>
                   <Copy size={14} className="text-white/20" />
                </button>
                <button
                  onClick={() => setActiveOverlay('settings')}
                  className="btn-secondary h-12 px-6 flex items-center gap-2"
                >
                   <Settings size={14} className="text-white/20" />
                   <span>Configure</span>
                </button>
             </div>
          </div>
        </section>

        {/* PROGRESSION & METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">

           <div className="lg:col-span-8 space-y-8">
              {/* XP CYCLE */}
              <div className="surface-2 p-10 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-10 transition-opacity">
                    <Award size={160} />
                 </div>
                 <div className="flex flex-col md:flex-row justify-between items-end mb-10 relative z-10">
                    <div className="space-y-2">
                       <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Experience Cycle</p>
                       <h3 className="text-4xl font-bold text-white tracking-tight uppercase">Progression</h3>
                    </div>
                    <div className="text-right">
                       <span className="text-5xl font-mono font-bold text-white">{Math.round(xpInfo.progress)}%</span>
                       <p className="text-[11px] font-mono text-primary font-bold uppercase tracking-widest mt-2">{Math.round(xpInfo.currentLevelXp)} / {xpInfo.requiredXp} XP</p>
                    </div>
                 </div>
                 <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpInfo.progress}%` }}
                      transition={{ duration: 1.5, ease: "circOut" }}
                      className="h-full bg-primary"
                    />
                 </div>
              </div>

              {/* STATS MATRIX */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                   { label: 'Marketplace Yield', val: completedCount, icon: CheckCircle2, color: 'text-success' },
                   { label: 'Referral Size', val: userData.stats?.referralsCount || 0, icon: Users, color: 'text-accent' },
                   { label: 'Current Streak', val: `${userData.streak || 0}D`, icon: Zap, color: 'text-orange-500' },
                 ].map((stat, i) => (
                   <div key={i} className="surface-1 p-8 space-y-6 interactive group">
                      <div className={cn("w-10 h-10 rounded-xl bg-black border border-white/[0.05] flex items-center justify-center transition-transform duration-300 group-hover:scale-110", stat.color)}>
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

           <div className="lg:col-span-4 space-y-8">
              <div className="px-2">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Management</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                 {[
                   { label: 'Audit Ledger', icon: Activity, desc: 'Balance history', action: () => setActiveOverlay('history') },
                   { label: 'Security Guard', icon: Shield, desc: 'Identity protection', action: () => setActiveOverlay('settings') },
                   { label: 'Service Center', icon: LifeBuoy, desc: 'Platform support', action: () => setActiveOverlay('help') },
                 ].map((item, i) => (
                   <button
                     key={i}
                     onClick={item.action}
                     className="surface-1 p-5 interactive flex items-center justify-between group"
                   >
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/20 group-hover:text-primary transition-colors">
                           <item.icon size={18} />
                        </div>
                        <div className="text-left">
                           <p className="text-[13px] font-bold text-white uppercase tracking-tight">{item.label}</p>
                           <p className="text-[10px] text-white/30 font-medium uppercase tracking-tighter">{item.desc}</p>
                        </div>
                     </div>
                     <ChevronRight size={16} className="text-white/10 group-hover:text-white transition-colors" />
                   </button>
                 ))}
                 <button
                   onClick={handleLogout}
                   className="w-full p-5 rounded-2xl bg-danger/5 border border-danger/10 flex items-center justify-center gap-3 text-danger/40 hover:text-danger hover:bg-danger/10 transition-all uppercase font-bold text-[10px] tracking-[0.3em]"
                 >
                   <LogOut size={16} />
                   Terminate Session
                 </button>
              </div>
           </div>
        </div>

        {/* RECENT OPERATIONAL ACTIVITY */}
        <section className="space-y-8 pt-4">
           <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                 <Activity size={16} className="text-success" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Activity Stream</h3>
              </div>
              <button onClick={() => setActiveOverlay('history')} className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] hover:underline">
                 Full Ledger
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activities.length === 0 ? (
                <div className="col-span-full py-20 text-center surface-1">
                   <ZapOff className="mx-auto text-white/5 mb-6" size={40} />
                   <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.4em]">Audit Trail Empty</p>
                </div>
              ) : activities.slice(0, 6).map((ev) => (
                <div key={ev.id} className="surface-1 p-6 interactive flex items-center justify-between group">
                   <div className="space-y-1">
                      <p className="text-[13px] font-bold text-white uppercase tracking-tight group-hover:text-white transition-colors">{ev.type.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-white/20 font-mono uppercase font-bold">
                        {ev.timestamp ? ev.timestamp.toDate().toLocaleDateString() : '---'}
                      </p>
                   </div>
                   <span className="text-lg font-mono font-bold text-primary">+{ev.points}</span>
                </div>
              ))}
           </div>
        </section>
      </div>

      <Overlay isOpen={activeOverlay === 'history'} onClose={() => setActiveOverlay(null)} title="Audit Ledger"><TransactionHistory /></Overlay>
      <Overlay isOpen={activeOverlay === 'settings'} onClose={() => setActiveOverlay(null)} title="Security Guard"><SettingsPanel /></Overlay>
      <Overlay isOpen={activeOverlay === 'help'} onClose={() => setActiveOverlay(null)} title="Service Center"><HelpCenter /></Overlay>

    </DashboardLayout>
  );
};

export default Profile;
