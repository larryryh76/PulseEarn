import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import { getXpProgress } from '../utils/progression';
import {
  Shield,
  Award,
  Zap,
  Clock,
  Star,
  ChevronRight,
  Camera,
  Share2,
  Settings,
  Target,
  Trophy,
  Activity,
  Verified,
  Fingerprint,
  LifeBuoy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cn } from '../utils';
import SettingsPanel from '../components/ui/SettingsPanel';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { userTasks, activities } = useTasks();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SETTINGS' | 'ACHIEVEMENTS' | 'ACTIVITY'>('OVERVIEW');

  if (!userData) return null;

  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  return (
      <div className="max-w-[1200px] mx-auto space-y-12 pb-24 animate-in">

        {/* REFINED PROFILE HEADER */}
        <section className="relative p-1 bg-white/[0.03] border border-white/10 rounded-[3rem] overflow-hidden">
           <div className="absolute inset-0 v2-gradient-bg opacity-40 pointer-events-none" />

           <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 p-10 lg:p-16">
              <div className="relative group shrink-0">
                 <div className="w-40 h-40 rounded-[3rem] bg-surface border-4 border-black/40 overflow-hidden shadow-2xl relative z-10 group-hover:scale-[1.02] transition-transform duration-500">
                    <img src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`} alt="" className="w-full h-full object-cover" />
                 </div>
                 <button className="absolute bottom-2 right-2 p-3.5 bg-primary text-white rounded-2xl border-4 border-black/40 z-20 shadow-xl hover:scale-110 transition-transform">
                    <Camera size={20} />
                 </button>
              </div>

              <div className="flex-1 text-center md:text-left space-y-6">
                 <div className="space-y-2">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                       <h1 className="text-4xl font-bold tracking-tight">{userData.username}</h1>
                       <div className="px-4 py-1.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
                          <Shield size={12} className="text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Verified</span>
                       </div>
                    </div>
                    <p className="text-white/40 font-medium text-lg">{userData.email}</p>
                 </div>

                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
                    <div className="flex items-center gap-3">
                       <Fingerprint size={16} className="text-white/20" />
                       <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">ID: {userData.uid.substring(0, 12)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <Clock size={16} className="text-white/20" />
                       <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Joined {userData.createdAt instanceof Object ? userData.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'V2 Early'}</span>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                 <button
                  onClick={() => setActiveTab('SETTINGS')}
                  className="px-8 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/[0.05] transition-all flex items-center justify-center gap-3"
                 >
                    <Settings size={14} />
                    Manage Settings
                 </button>
                 <button
                  onClick={() => logout()}
                  className="px-8 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-3"
                 >
                    Logout Session
                 </button>
              </div>
           </div>
        </section>

        {/* NAVIGATION TAB SYSTEM */}
        <div className="flex items-center gap-10 border-b border-white/5 pb-1 overflow-x-auto no-scrollbar">
           {(['OVERVIEW', 'ACTIVITY', 'ACHIEVEMENTS', 'SETTINGS'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                   "text-[10px] font-black uppercase tracking-[0.3em] transition-all relative pb-6 shrink-0",
                   activeTab === tab ? "text-primary" : "text-white/20 hover:text-white/40"
                )}
              >
                 {tab}
                 {activeTab === tab && (
                    <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary shadow-[0_0_15px_rgba(0,102,255,0.5)] rounded-full" />
                 )}
              </button>
           ))}
        </div>

        {/* CONTENT ARCHITECTURE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

           {/* MAIN FEED AREA (8 cols) */}
           <div className="lg:col-span-8 space-y-12">

              {activeTab === 'OVERVIEW' && (
                 <div className="space-y-12 animate-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="v2-stat-card">
                          <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Account Level</p>
                          <div className="flex items-center justify-between pt-2">
                             <h2 className="text-3xl font-mono font-bold">LVL {userData.level}</h2>
                             <Award size={20} className="text-primary" />
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-4">
                             <div className="h-full bg-primary" style={{ width: `${xpInfo.progress}%` }} />
                          </div>
                       </div>
                       <div className="v2-stat-card">
                          <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Tasks Completed</p>
                          <div className="flex items-center justify-between pt-2">
                             <h2 className="text-3xl font-mono font-bold">{completedCount}</h2>
                             <Zap size={20} className="text-emerald-500" />
                          </div>
                       </div>
                       <div className="v2-stat-card">
                          <p className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Referrals</p>
                          <div className="flex items-center justify-between pt-2">
                             <h2 className="text-3xl font-mono font-bold">{userData.stats?.referralsCount || 0}</h2>
                             <Share2 size={20} className="text-amber-500" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-3">
                             <Activity size={18} className="text-primary" />
                             <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Recent Activity</h3>
                          </div>
                          <button onClick={() => setActiveTab('ACTIVITY')} className="text-[9px] font-bold uppercase text-primary hover:underline">View All Records</button>
                       </div>
                       <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/[0.03]">
                          {activities.slice(0, 5).map(act => (
                             <div key={act.id} className="p-6 px-8 hover:bg-white/[0.01] flex items-center justify-between group transition-all">
                                <div className="flex items-center gap-6">
                                   <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-white/20">
                                      <Clock size={16} />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">{act.description}</p>
                                      <p className="text-[9px] font-bold uppercase text-white/10 mt-1">{act.type.replace(/_/g, ' ')}</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-sm font-bold font-mono text-emerald-400">+{act.points}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              )}

              {activeTab === 'SETTINGS' && (
                 <div className="animate-in">
                    <SettingsPanel />
                 </div>
              )}

              {activeTab === 'ACHIEVEMENTS' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in">
                    {[
                       { title: 'Genesis Member', desc: 'Joined during the platform reconstruction phase.', icon: Trophy, unlocked: true },
                       { title: 'Task Expert', desc: 'Complete 100 verified tasks in the marketplace.', icon: Zap, unlocked: false },
                       { title: 'Top Referrer', desc: 'Onboard 50+ users to the PulseEarn ecosystem.', icon: Share2, unlocked: false },
                       { title: 'Pulse Titan', desc: 'Accumulate a balance of 1,000,000 PTS.', icon: Star, unlocked: false },
                    ].map((ach, i) => (
                       <div key={i} className={cn(
                          "p-8 rounded-[2.5rem] border transition-all flex items-start gap-6",
                          ach.unlocked ? "bg-white/[0.02] border-white/10" : "bg-black/40 border-white/5 opacity-40 grayscale"
                       )}>
                          <div className={cn(
                             "w-16 h-16 rounded-2xl flex items-center justify-center border shrink-0",
                             ach.unlocked ? "bg-primary/10 border-primary/20 text-primary shadow-lg" : "bg-white/5 border-white/5 text-white/10"
                          )}>
                             <ach.icon size={28} />
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-lg font-bold tracking-tight">{ach.title}</h4>
                             <p className="text-xs text-white/40 leading-relaxed font-medium">{ach.desc}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              )}
           </div>

           {/* SIDEBAR CONTEXT (4 cols) */}
           <div className="lg:col-span-4 space-y-10">

              <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] space-y-8">
                 <div className="flex items-center gap-3">
                    <Shield size={18} className="text-primary" />
                    <h4 className="text-sm font-bold uppercase tracking-widest">Account Security</h4>
                 </div>

                 <div className="space-y-6">
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Verification</p>
                          <p className="text-sm font-bold text-emerald-500 mt-0.5">Secure</p>
                       </div>
                       <Verified size={18} className="text-emerald-500/40" />
                    </div>
                    <div className="h-px bg-white/5 w-full" />
                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Role Authority</p>
                          <p className="text-sm font-bold mt-0.5 uppercase">{userData.role}</p>
                       </div>
                       <div className="px-2 py-1 bg-white/5 rounded-lg font-mono text-[9px] font-bold text-white/30">{userData.role.substring(0, 3).toUpperCase()}</div>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-primary/[0.01] border border-primary/10 rounded-[2.5rem] space-y-6">
                 <div className="flex items-center gap-3">
                    <Target size={18} className="text-primary" />
                    <h4 className="text-sm font-bold uppercase tracking-widest">Next Milestone</h4>
                 </div>
                 <div className="space-y-4">
                    <p className="text-sm font-medium text-white/50 leading-relaxed">
                       Achieve <span className="text-white font-bold">LVL {userData.level + 1}</span> to unlock premium withdrawal options.
                    </p>
                    <div className="space-y-2">
                       <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                          <span className="text-primary">Progress</span>
                          <span className="text-white/40">{Math.round(xpInfo.progress)}%</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${xpInfo.progress}%` }} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[2.5rem] space-y-6">
                 <div className="flex items-center gap-3">
                    <LifeBuoy size={18} className="text-primary" />
                    <h4 className="text-sm font-bold uppercase tracking-widest">Help Center</h4>
                 </div>
                 <div className="space-y-2">
                    <Link to="/support" className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                       <span className="text-xs font-bold text-white/60 group-hover:text-white">Support Portal</span>
                       <ChevronRight size={14} className="text-white/10 group-hover:text-white/40" />
                    </Link>
                    <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group text-left">
                       <span className="text-xs font-bold text-white/60 group-hover:text-white">Privacy Policy</span>
                       <ChevronRight size={14} className="text-white/10 group-hover:text-white/40" />
                    </button>
                 </div>
              </div>

           </div>

        </div>
      </div>
  );
};

export default Profile;
