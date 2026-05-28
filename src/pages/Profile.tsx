import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import DashboardLayout from '../components/layout/DashboardLayout';
import { getXpProgress } from '../utils/progression';
import {
  Shield,
  Award,
  Zap,
  LogOut,
  Clock,
  Trophy,
  Star,
  ChevronRight,
  Mail,
  Edit2,
  Camera,
  TrendingUp,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { userTasks, activities } = useTasks();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACHIEVEMENTS' | 'SECURITY'>('OVERVIEW');

  if (!userData) return null;

  const xpInfo = getXpProgress(userData.xp || 0);
  const completedCount = Object.keys(userTasks).length;

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 animate-in fade-in duration-700">
        {/* Profile Header Card */}
        <section className="relative glass-card border-white/[0.05] rounded-[3rem] overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent" />

           <div className="relative pt-24 px-10 pb-10 flex flex-col md:flex-row items-end justify-between gap-8">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
                 <div className="relative group">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-[#050507] border-4 border-[#050507] overflow-hidden shadow-2xl relative z-10 group-hover:scale-105 transition-transform">
                       <img src={userData.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData.uid}`} alt="avatar" />
                    </div>
                    <button className="absolute bottom-0 right-0 p-2.5 bg-primary text-white rounded-2xl border-4 border-[#050507] z-20 hover:scale-110 transition-transform">
                       <Camera size={16} />
                    </button>
                    <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                 </div>

                 <div className="space-y-2">
                    <div className="flex items-center gap-3 justify-center md:justify-start">
                       <h1 className="text-3xl font-bold tracking-tight">{userData.username}</h1>
                       <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-widest">
                          LVL {userData.level}
                       </span>
                    </div>
                    <div className="flex items-center gap-4 text-white/40 text-xs font-medium justify-center md:justify-start">
                       <div className="flex items-center gap-1.5">
                          <Mail size={14} className="opacity-50" />
                          <span>{userData.email}</span>
                       </div>
                       <span className="w-1 h-1 rounded-full bg-white/10" />
                       <span className="uppercase tracking-tighter">Authorized Participant</span>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-3">
                 <Link to="/pulse-core/settings" className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all">
                    <Edit2 size={14} />
                    Customize Identity
                 </Link>
                 <button
                   onClick={() => logout()}
                   className="flex items-center gap-2 px-6 py-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/20 transition-all"
                 >
                    <LogOut size={14} />
                    Sign Out
                 </button>
              </div>
           </div>

           {/* Quick Sub-nav */}
           <div className="px-10 pb-8 flex items-center gap-8">
              {(['OVERVIEW', 'ACHIEVEMENTS', 'SECURITY'] as const).map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`text-[10px] font-bold uppercase tracking-[0.2em] pb-2 border-b-2 transition-all ${
                      activeTab === tab ? 'border-primary text-white' : 'border-transparent text-white/20 hover:text-white/40'
                   }`}
                 >
                    {tab}
                 </button>
              ))}
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Left column: Progression & Stats */}
           <div className="lg:col-span-2 space-y-8">
              {activeTab === 'OVERVIEW' && (
                 <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div className="glass-card p-6 rounded-[2rem] border-white/[0.05] space-y-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Operational Tier</p>
                          <div className="flex items-center justify-between">
                             <h2 className="text-3xl font-bold font-mono tracking-tighter">LVL {userData.level}</h2>
                             <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                <Award size={20} />
                             </div>
                          </div>
                          <div className="space-y-2">
                             <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${xpInfo.progress}%` }}
                                  className="h-full bg-primary"
                                />
                             </div>
                             <div className="flex justify-between text-[9px] font-bold uppercase text-white/20">
                                <span>{userData.xp} XP</span>
                                <span>{Math.round(xpInfo.requiredXp)} XP</span>
                             </div>
                          </div>
                       </div>

                       <div className="glass-card p-6 rounded-[2rem] border-white/[0.05] space-y-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Task Compliance</p>
                          <div className="flex items-center justify-between">
                             <h2 className="text-3xl font-bold font-mono tracking-tighter">{completedCount}</h2>
                             <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <Zap size={20} />
                             </div>
                          </div>
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter flex items-center gap-1.5">
                             <TrendingUp size={12} className="text-emerald-400" />
                             Performing above target
                          </p>
                       </div>

                       <div className="glass-card p-6 rounded-[2rem] border-white/[0.05] space-y-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Network Growth</p>
                          <div className="flex items-center justify-between">
                             <h2 className="text-3xl font-bold font-mono tracking-tighter">{userData.stats?.referralsCount || 0}</h2>
                             <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <Share2 size={20} />
                             </div>
                          </div>
                          <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">
                             Total Affiliates Onboarded
                          </p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold tracking-tight">Recent Engagement</h3>
                          <button className="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors">View Audit Log</button>
                       </div>

                       <div className="glass-card border-white/[0.05] rounded-[2.5rem] overflow-hidden">
                          <div className="divide-y divide-white/5">
                             {activities.slice(0, 5).map(activity => (
                                <div key={activity.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                                         <Clock size={16} className="text-white/20" />
                                      </div>
                                      <div>
                                         <p className="text-sm font-bold text-white/90">{activity.description}</p>
                                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{activity.type.replace(/_/g, ' ')}</p>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold font-mono text-emerald-400">+{activity.points}</span>
                                      <ChevronRight size={14} className="text-white/10" />
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </>
              )}

              {activeTab === 'ACHIEVEMENTS' && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                       { title: 'Early Adopter', icon: Trophy, unlocked: true },
                       { title: 'Task Master', icon: Star, unlocked: true },
                       { title: 'Pulse Legend', icon: Zap, unlocked: false },
                       { title: 'Network Whale', icon: Share2, unlocked: false },
                    ].map((ach, i) => (
                       <div key={i} className={`glass-card p-6 rounded-[2rem] border-white/[0.05] text-center flex flex-col items-center gap-4 ${!ach.unlocked && 'opacity-20 grayscale'}`}>
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${ach.unlocked ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-white/20'}`}>
                             <ach.icon size={24} />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest">{ach.title}</span>
                       </div>
                    ))}
                 </div>
              )}
           </div>

           {/* Right column: Identity Context */}
           <div className="space-y-8">
              <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
                 <div className="flex items-center gap-3">
                    <Shield size={18} className="text-primary" />
                    <h4 className="text-base font-bold">Security Context</h4>
                 </div>

                 <div className="space-y-5">
                    <div className="flex justify-between items-center pb-5 border-b border-white/5">
                       <div>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Verification Status</p>
                          <p className="text-sm font-bold mt-1">Verified Authorization</p>
                       </div>
                       <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                          <Shield size={14} />
                       </div>
                    </div>

                    <div className="flex justify-between items-center pb-5 border-b border-white/5">
                       <div>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Account Authority</p>
                          <p className="text-sm font-bold mt-1 uppercase">{userData.role}</p>
                       </div>
                       <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 font-mono text-[10px] font-bold">
                          USR
                       </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <div>
                          <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Joined Ecosystem</p>
                          <p className="text-sm font-bold mt-1">{userData.createdAt instanceof Object ? userData.createdAt.toDate().toLocaleDateString() : 'Initial Era'}</p>
                       </div>
                       <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                          <Clock size={14} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="glass-card p-8 rounded-[2.5rem] border-white/[0.05] space-y-6">
                 <h4 className="text-base font-bold">Ecosystem Insights</h4>
                 <div className="p-5 bg-white/5 rounded-[2rem] border border-white/10 space-y-3">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-primary" />
                       <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Next Milestone</p>
                    </div>
                    <p className="text-sm font-bold leading-relaxed">
                       Achieve LVL {userData.level + 1} to unlock premium high-yield missions and private discord access.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
