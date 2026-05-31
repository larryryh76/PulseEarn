import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getXpProgress } from '../utils/progression';
import {
  Shield,
  Award,
  Zap,
  Clock,
  Star,
  ChevronRight,
  Mail,
  Camera,
  TrendingUp,
  Share2,
  Settings,
  Target,
  Trophy,
  Activity,
  Verified,
  Fingerprint,
  LifeBuoy
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../utils';
import SettingsPanel from '../components/ui/SettingsPanel';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { userTasks, activities } = useTasks();
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'SETTINGS' | 'ACHIEVEMENTS' | 'ACTIVITY'>('IDENTITY');

  if (!userData) return null;

  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-10 pb-24 animate-in">

        {/* Ecosystem Headquarters Identity Deck */}
        <section className="relative bg-white/[0.01] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
           <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-primary/5 to-transparent" />

           <div className="relative pt-12 md:pt-20 px-8 md:px-12 pb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
              <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                 <div className="relative group shrink-0">
                    <div className="w-40 h-40 md:w-48 md:h-48 rounded-[2.5rem] md:rounded-[3.5rem] bg-surface border-[6px] border-black/40 overflow-hidden shadow-2xl relative z-10 group-hover:scale-[1.02] transition-transform duration-500">
                       <img src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <button className="absolute bottom-3 right-3 p-3.5 bg-primary text-white rounded-2xl border-[4px] border-black/40 z-20 shadow-xl hover:scale-110 transition-transform">
                       <Camera size={20} />
                    </button>
                    <div className="absolute -inset-6 bg-primary/20 blur-[80px] rounded-full opacity-40 group-hover:opacity-70 transition-opacity" />
                 </div>

                 <div className="space-y-4 text-center md:text-left min-w-0 flex-1">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                       <h1 className="text-4xl md:text-5xl font-bold tracking-tight truncate w-full">{userData.username}</h1>
                       <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2 shrink-0">
                          <Shield size={12} className="text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">Verified Account</span>
                       </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-white/40 text-base font-medium justify-center md:justify-start">
                       <div className="flex items-center gap-2.5">
                          <Mail size={16} className="opacity-40" />
                          <span className="truncate">{userData.email}</span>
                       </div>
                       <div className="w-1.5 h-1.5 rounded-full bg-white/10 hidden sm:block" />
                       <div className="flex items-center gap-2.5 font-mono text-sm uppercase">
                          <Fingerprint size={16} className="opacity-40" />
                          <span className="tracking-tighter pr-4">User ID: {userData.uid.substring(0, 12)}</span>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 relative z-10">
                 <button
                  onClick={() => setActiveTab('SETTINGS')}
                  className="px-8 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/[0.06] transition-all flex items-center gap-3"
                 >
                    <Settings size={14} />
                    Settings
                 </button>
                 <button
                  onClick={() => logout()}
                  className="px-8 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/20 transition-all"
                 >
                    Sign Out
                 </button>
              </div>
           </div>

           {/* Tab Architecture */}
           <div className="px-8 md:px-12 pb-10 flex items-center gap-10 border-t border-white/5 pt-10 overflow-x-auto no-scrollbar">
              {(['IDENTITY', 'SETTINGS', 'ACHIEVEMENTS', 'ACTIVITY'] as const).map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={cn(
                      "text-[11px] font-black uppercase tracking-[0.25em] transition-all relative pb-3 shrink-0",
                      activeTab === tab ? "text-white" : "text-white/20 hover:text-white/40"
                   )}
                 >
                    {tab}
                    {activeTab === tab && (
                       <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-[0_0_10px_rgba(0,102,255,0.5)]" />
                    )}
                 </button>
              ))}
           </div>
        </section>

        {/* Content Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

           {/* Primary column (8 cols) */}
           <div className="lg:col-span-8 space-y-10">
              {activeTab === 'IDENTITY' && (
                 <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-10"
                 >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="glass-panel p-8 rounded-[2.5rem] space-y-5">
                          <span className="section-label">Performance Tier</span>
                          <div className="flex items-center justify-between">
                             <h2 className="text-3xl font-bold font-mono tracking-tighter">LVL {userData.level}</h2>
                             <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                <Award size={24} />
                             </div>
                          </div>
                          <div className="space-y-2 pt-2">
                             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${xpInfo.progress}%` }}
                                  className="h-full bg-primary"
                                />
                             </div>
                             <div className="flex justify-between text-[9px] font-bold uppercase text-white/20">
                                <span>{userData.xp} / {Math.round(xpInfo.requiredXp)} XP</span>
                                <span>{Math.round(100 - xpInfo.progress)}% Remaining</span>
                             </div>
                          </div>
                       </div>

                       <div className="glass-panel p-8 rounded-[2.5rem] space-y-5">
                          <span className="section-label">Engagement</span>
                          <div className="flex items-center justify-between">
                             <h2 className="text-3xl font-bold font-mono tracking-tighter">{completedCount}</h2>
                             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <Zap size={24} />
                             </div>
                          </div>
                          <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest flex items-center gap-2">
                             <TrendingUp size={14} />
                             Active Contributor
                          </p>
                       </div>

                       <div className="glass-panel p-8 rounded-[2.5rem] space-y-5">
                          <span className="section-label">Social Reach</span>
                          <div className="flex items-center justify-between">
                             <h2 className="text-3xl font-bold font-mono tracking-tighter">{userData.stats?.referralsCount || 0}</h2>
                             <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <Share2 size={24} />
                             </div>
                          </div>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                             Verified Affiliates
                          </p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <Activity size={18} className="text-primary" />
                             <h3 className="text-xl font-bold tracking-tight">Timeline Evidence</h3>
                          </div>
                          <button className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white transition-colors pr-4">Full Logs</button>
                       </div>

                       <div className="space-y-3">
                          {activities.slice(0, 4).map(act => (
                             <div key={act.id} className="fintech-ledger-row px-6 bg-white/[0.01]">
                                <div className="flex items-center gap-5">
                                   <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40">
                                      <Clock size={18} />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-white/80">{act.description}</p>
                                      <p className="text-[10px] font-bold uppercase text-white/20 mt-0.5 tracking-widest">{act.type.replace(/_/g, ' ')}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-2">
                                   <span className="text-sm font-bold font-mono text-emerald-400">+{act.points}</span>
                                   <ChevronRight size={16} className="text-white/10" />
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </motion.div>
              )}

              {activeTab === 'SETTINGS' && (
                 <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-6"
                 >
                    <SettingsPanel />
                 </motion.div>
              )}

              {activeTab === 'ACHIEVEMENTS' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                       { title: 'Genesis User', desc: 'Joined during the initial platform deployment.', icon: Trophy, unlocked: true },
                       { title: 'Market Analyst', desc: 'Predictive accuracy exceeding 75% on market signals.', icon: Star, unlocked: true },
                       { title: 'Pulse Titan', desc: 'Maintain a balance exceeding 1,000,000 points.', icon: Zap, unlocked: false },
                       { title: 'Network Leader', desc: 'Onboard 100+ verified participants.', icon: Share2, unlocked: false },
                    ].map((ach, i) => (
                       <div key={i} className={cn(
                          "glass-panel p-8 rounded-[2.5rem] flex items-start gap-6 border-white/5 transition-all",
                          !ach.unlocked && "opacity-30 grayscale blur-[1px]"
                       )}>
                          <div className={cn(
                             "w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 shrink-0",
                             ach.unlocked ? "bg-primary/10 border-primary/20 text-primary shadow-[0_0_20px_rgba(0,102,255,0.2)]" : "bg-white/5 border-white/10 text-white/10"
                          )}>
                             <ach.icon size={28} />
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-lg font-bold tracking-tight">{ach.title}</h4>
                             <p className="text-xs text-white/40 leading-relaxed pr-6">{ach.desc}</p>
                             {ach.unlocked && (
                                <p className="text-[9px] font-bold uppercase text-primary mt-4 tracking-widest">Authorized Reward Claimed</p>
                             )}
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>

           {/* Context column (4 cols) */}
           <div className="lg:col-span-4 space-y-10">

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-8">
                 <div className="flex items-center gap-3">
                    <Shield size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Security Posture</h4>
                 </div>

                 <div className="space-y-6">
                    <div className="flex justify-between items-center pb-6 border-b border-white/[0.03]">
                       <div>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</p>
                          <p className="text-sm font-bold mt-1 text-emerald-500">Fully Optimized</p>
                       </div>
                       <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <Verified size={16} />
                       </div>
                    </div>

                    <div className="flex justify-between items-center pb-6 border-b border-white/[0.03]">
                       <div>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Authority</p>
                          <p className="text-sm font-bold mt-1 uppercase tracking-tight">{userData.role} Clearance</p>
                       </div>
                       <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 font-mono text-[11px] font-bold">
                          USR
                       </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Member Since</p>
                          <p className="text-sm font-bold mt-1">{userData.createdAt instanceof Object ? userData.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Alpha Era'}</p>
                       </div>
                       <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                          <Clock size={16} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 bg-primary/[0.02] border-primary/10">
                 <div className="flex items-center gap-3">
                    <Target size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Next Milestone</h4>
                 </div>
                 <div className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-3">
                    <p className="text-sm font-bold leading-relaxed">
                       Achieve LVL {userData.level + 1} to unlock premium rewards and priority support.
                    </p>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest pt-4">
                       <span className="text-primary">Progress</span>
                       <span className="text-white/40">{Math.round(xpInfo.progress)}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div animate={{ width: `${xpInfo.progress}%` }} className="h-full bg-primary" />
                    </div>
                 </div>
              </div>

              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                 <div className="flex items-center gap-3">
                    <LifeBuoy size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Help & Resources</h4>
                 </div>
                 <div className="space-y-2">
                    <Link to="/support" className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                       <span className="text-xs font-bold text-white/60 group-hover:text-white">Help Center</span>
                       <ChevronRight size={14} className="text-white/20" />
                    </Link>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                       <span className="text-xs font-bold text-white/60 group-hover:text-white">Reward Policy</span>
                       <ChevronRight size={14} className="text-white/20" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                       <span className="text-xs font-bold text-white/60 group-hover:text-white">Security & Fraud</span>
                       <ChevronRight size={14} className="text-white/20" />
                    </button>
                 </div>
              </div>

           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
