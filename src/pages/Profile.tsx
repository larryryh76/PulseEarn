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
  X,
  Activity,
  ShieldCheck,
  Hash
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
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Protocol Directive</p>
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
    if (confirm('Authorize platform termination?')) {
      await logout();
      toast.success('Session Closed');
    }
  };

  const isAdmin = userData.role === 'admin';
  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  const stats = [
    { label: 'Verified Missions', val: completedCount, icon: CheckCircle2, color: 'text-success' },
    { label: 'Ecosystem Referrals', val: userData.stats?.referralsCount || 0, icon: Users, color: 'text-accent' },
    { label: 'Protocol Tier', val: `LVL ${userData.level}`, icon: ShieldCheck, color: 'text-primary' },
    { label: 'Yield Balance', val: userData.points.toLocaleString(), icon: Zap, color: 'text-white' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-12 pb-32">

        {/* PREMIUM IDENTITY HEADER */}
        <section>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-accent/10 rounded-[3rem] blur-2xl opacity-30" />
            <Card className="p-0 border-white/10 bg-black overflow-hidden relative rounded-[2.5rem] shadow-2xl">
               <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32" />

               <div className="p-10 md:p-16 relative z-10">
                  <div className="flex flex-col md:flex-row items-center gap-12">
                    {/* Avatar System */}
                    <div className="relative shrink-0">
                      <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-white/5 p-[1px] shadow-2xl">
                        <div className="w-full h-full rounded-[2.4rem] bg-black flex items-center justify-center overflow-hidden">
                          <img
                            src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`}
                            alt="Identity"
                            className="w-full h-full object-cover opacity-80"
                          />
                        </div>
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em] shadow-2xl">
                        Tier {userData.level}
                      </div>
                    </div>

                    {/* Identity Info */}
                    <div className="flex-1 text-center md:text-left space-y-8">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                           <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white uppercase">{userData.username}</h2>
                           <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                              {isAdmin ? 'Systems Admin' : 'Pulse Operator'}
                           </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6">
                          <span className="text-white/20 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                             <Calendar size={14} className="text-white/10" />
                             Genesis: {userData.createdAt?.toDate().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-white/20 text-[11px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
                             <Hash size={14} className="text-white/10" />
                             ID: {userData.uid.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      <div className="max-w-md mx-auto md:mx-0 space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.3em]">Clearance Progression</span>
                          <span className="text-sm font-mono text-primary font-bold">{Math.round(xpInfo.currentLevelXp)} / {xpInfo.requiredXp} XP</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${xpInfo.progress}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center md:justify-start gap-4">
                        <button
                          onClick={copyReferralCode}
                          className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                        >
                          <span className="text-[11px] font-mono font-bold text-white/40 group-hover:text-white transition-colors">{userData.referralCode}</span>
                          <Copy size={14} className="text-white/10" />
                        </button>
                        <button
                          onClick={() => setActiveOverlay('settings')}
                          className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 hover:text-white"
                        >
                          <Settings size={14} />
                          Config
                        </button>
                      </div>
                    </div>
                  </div>
               </div>
            </Card>
          </div>
        </section>

        {/* METRIC GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="p-8 rounded-[2rem] bg-black border border-white/5 space-y-6 group hover:border-white/10 transition-colors"
            >
              <div className="flex justify-between items-start">
                 <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 bg-white/[0.01]", stat.color)}>
                   <stat.icon size={20} />
                 </div>
                 <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest">Active</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-mono font-bold text-white tracking-tighter">{stat.val}</p>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* OPERATIONS MENU */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3 px-2">
                 <Shield size={16} className="text-primary" />
                 <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Operational Menu</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {[
                   { label: 'Execution History', icon: Trophy, desc: 'Transactional record of missions and yields', action: () => setActiveOverlay('history') },
                   { label: 'Security Protocols', icon: Shield, desc: 'Advanced account protection and identity', action: () => setActiveOverlay('settings') },
                   { label: 'Knowledge Base', icon: LifeBuoy, desc: 'System directives and guide documentation', action: () => setActiveOverlay('help') },
                 ].map((item, i) => (
                   <button
                     key={i}
                     onClick={item.action}
                     className="w-full p-8 rounded-3xl bg-black border border-white/5 flex items-center justify-between hover:bg-white/[0.01] hover:border-white/20 transition-all group"
                   >
                     <div className="flex items-center gap-6 text-left">
                       <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                         <item.icon size={24} />
                       </div>
                       <div>
                         <p className="text-lg font-bold text-white uppercase tracking-tight">{item.label}</p>
                         <p className="text-xs text-white/30 font-medium uppercase tracking-tighter mt-1">{item.desc}</p>
                       </div>
                     </div>
                     <ChevronRight size={20} className="text-white/10 group-hover:text-white transition-colors" />
                   </button>
                 ))}
                 <button
                   onClick={handleLogout}
                   className="w-full p-8 rounded-3xl bg-danger/5 border border-danger/10 flex items-center justify-center gap-4 text-danger/40 hover:text-danger hover:bg-danger/10 transition-all uppercase font-bold text-[11px] tracking-[0.3em]"
                 >
                   <LogOut size={20} />
                   Terminate Session
                 </button>
              </div>
           </div>

           {/* RECENT SIGNALS */}
           <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                    <Activity size={16} className="text-success" />
                    <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">Recent Signals</h3>
                 </div>
              </div>
              <div className="bg-black border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                 <div className="divide-y divide-white/5">
                    {activities.length === 0 ? (
                      <div className="py-24 text-center">
                         <p className="text-[11px] font-bold text-white/10 uppercase tracking-[0.4em]">Audit Trail Empty</p>
                      </div>
                    ) : activities.slice(0, 6).map((ev) => (
                      <div key={ev.id} className="p-6 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                        <div className="flex items-center gap-5">
                           <div className={cn(
                              "w-1 h-8 rounded-full",
                              ev.points > 0 ? "bg-primary shadow-[0_0_10px_rgba(0,102,255,0.4)]" : "bg-white/10"
                           )} />
                           <div>
                            <p className="text-[13px] font-bold text-white uppercase tracking-tight">{ev.type.replace('_', ' ')}</p>
                            <p className="text-[10px] text-white/20 font-mono uppercase tracking-tighter mt-0.5">
                              {ev.timestamp ? ev.timestamp.toDate().toLocaleTimeString() : '---'}
                            </p>
                          </div>
                        </div>
                        <span className="text-base font-mono font-bold text-primary">{ev.points > 0 ? '+' : ''}{ev.points}</span>
                      </div>
                    ))}
                 </div>
                 <button onClick={() => setActiveOverlay('history')} className="w-full py-6 bg-white/[0.01] hover:bg-white/[0.02] border-t border-white/5 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] hover:text-white transition-colors">
                    Full Ledger View
                 </button>
              </div>
           </div>
        </div>
      </div>

      <Overlay isOpen={activeOverlay === 'history'} onClose={() => setActiveOverlay(null)} title="Execution Ledger"><TransactionHistory /></Overlay>
      <Overlay isOpen={activeOverlay === 'settings'} onClose={() => setActiveOverlay(null)} title="Security Protocol"><SettingsPanel /></Overlay>
      <Overlay isOpen={activeOverlay === 'help'} onClose={() => setActiveOverlay(null)} title="Directives"><HelpCenter /></Overlay>

    </DashboardLayout>
  );
};

export default Profile;
