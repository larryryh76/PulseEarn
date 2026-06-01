import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
  Share2,
  Copy,
  Check,
  Bell,
  Lock,
  EyeOff,
  HelpCircle,
  Smartphone,
  ChevronRight,
  Globe,
  Zap,
  BarChart3,
  Activity as ActivityIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import DocumentationModal from '../components/ui/DocumentationModal';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { loading, activities } = useTasks();
  const [hasCopied, setHasCopied] = useState(false);
  const [activeView, setActiveView] = useState<'IDENTITY' | 'SETTINGS' | 'SECURITY' | 'SUPPORT'>('IDENTITY');
  const [docType, setDocType] = useState<'REWARD' | 'VERIFICATION' | 'FRAUD' | null>(null);
  const navigate = useNavigate();

  // Settings states
  const [prefs, setPrefs] = useState(userData?.preferences || {
    notifications: true,
    rewardAlerts: true,
    marketing: false,
    privacyMode: false
  });

  const updatePreference = async (key: string, value: boolean) => {
    if (!userData?.uid) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        [`preferences.${key}`]: value
      });
      toast.success('Signal updated');
    } catch (err) {
      toast.error('Sync failed');
    }
  };

  const copyReferral = () => {
    if (!userData?.referralCode) return;
    navigator.clipboard.writeText(userData.referralCode);
    setHasCopied(true);
    toast.success('Referral code copied');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleLogout = async () => {
     await logout();
     navigate('/');
  };

  if (loading) return <MainLayout><div className="pt-32 px-6 max-w-4xl mx-auto animate-pulse">
    <div className="w-32 h-32 rounded-full bg-white/5 mx-auto mb-8" />
    <div className="h-8 w-64 bg-white/5 mx-auto rounded" />
  </div></MainLayout>;

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto h-screen lg:h-auto overflow-y-auto no-scrollbar">
        <div className="flex flex-col lg:flex-row gap-12 min-h-full">

          {/* Sidebar Nav */}
          <aside className="lg:w-80 shrink-0">
             <div className="sticky top-32 space-y-12">
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                   <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 p-0.5 mb-6 relative group">
                      <div className="w-full h-full rounded-[1.9rem] bg-surface overflow-hidden border border-border">
                         <img
                           src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`}
                           alt="Profile"
                           className="w-full h-full object-cover"
                         />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-primary shadow-xl">
                         <ShieldCheck size={16} />
                      </div>
                   </div>
                   <h1 className="text-2xl mb-1">{userData?.username}</h1>
                   <p className="data-label text-primary">Lvl {userData?.level || 1} System Operator</p>
                </div>

                <nav className="space-y-1">
                   {[
                     { id: 'IDENTITY', label: 'Identity Signals', icon: UserIcon },
                     { id: 'SETTINGS', label: 'Preferences', icon: SettingsIcon },
                     { id: 'SECURITY', label: 'Security Core', icon: Lock },
                     { id: 'SUPPORT', label: 'Support Center', icon: HelpCircle },
                   ].map(item => (
                     <button
                       key={item.id}
                       onClick={() => setActiveView(item.id as any)}
                       className={cn(
                         "w-full flex items-center justify-between px-5 py-4 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all",
                         activeView === item.id
                          ? "bg-white/5 text-white border border-white/5"
                          : "text-text-secondary hover:text-white hover:bg-white/5"
                       )}
                     >
                       <div className="flex items-center gap-4">
                          <item.icon size={16} />
                          {item.label}
                       </div>
                       <ChevronRight size={14} className={cn("opacity-0 transition-opacity", activeView === item.id && "opacity-100")} />
                     </button>
                   ))}
                </nav>

                <div className="pt-8 border-t border-border">
                   <button
                     onClick={handleLogout}
                     className="w-full flex items-center gap-4 px-5 py-4 text-danger/60 hover:text-danger text-[11px] font-bold uppercase tracking-[0.2em] transition-colors"
                   >
                     <LogOut size={16} />
                     Terminate Session
                   </button>
                </div>
             </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 lg:pt-4">
            <AnimatePresence mode="wait">
              {activeView === 'IDENTITY' && (
                <motion.div key="id" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <section className="system-card">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
                           <BarChart3 size={16} className="text-primary" />
                           Operational Stats
                        </h2>
                        <div className="grid grid-cols-2 gap-8">
                           <div>
                              <p className="data-label text-text-secondary mb-1">Missions</p>
                              <p className="text-2xl font-mono font-bold">{userData?.stats?.tasksCompleted || 0}</p>
                           </div>
                           <div>
                              <p className="data-label text-text-secondary mb-1">Signals</p>
                              <p className="text-2xl font-mono font-bold">{userData?.stats?.referralsCount || 0}</p>
                           </div>
                           <div>
                              <p className="data-label text-text-secondary mb-1">Forecasts</p>
                              <p className="text-2xl font-mono font-bold">{userData?.stats?.predictionsCount || 0}</p>
                           </div>
                           <div>
                              <p className="data-label text-text-secondary mb-1">Yield</p>
                              <p className="text-2xl font-mono font-bold">{(userData?.stats?.totalEarnings || 0).toLocaleString()}</p>
                           </div>
                        </div>
                     </section>

                     <section className="system-card border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                           <Share2 size={16} />
                           Expansion Protocol
                        </h2>
                        <p className="text-xs text-text-secondary mb-8 leading-relaxed">Onboard new operators using your unique signal to receive 50 PTS per verification.</p>

                        <div className="relative mb-10">
                           <input readOnly value={userData?.referralCode} className="w-full bg-black/40 border-border pr-12 font-mono text-sm tracking-widest py-4 px-5 rounded-xl" />
                           <button onClick={copyReferral} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors">
                              {hasCopied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                           </button>
                        </div>

                        <div className="flex justify-between items-baseline pt-6 border-t border-white/5">
                           <p className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Confirmed Signals</p>
                           <p className="text-3xl font-mono font-bold text-white">{userData?.stats?.referralsCount || 0}</p>
                        </div>
                     </section>
                  </div>

                  <section className="system-card">
                     <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
                        <ActivityIcon size={16} />
                        Recent Signal History
                     </h2>
                     <div className="space-y-1">
                        {activities.length > 0 ? (
                           activities.slice(0, 5).map(activity => (
                              <div key={activity.id} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                       <Zap size={14} className="text-primary" />
                                    </div>
                                    <div>
                                       <p className="text-xs font-bold">{activity.description}</p>
                                       <p className="text-[10px] text-text-secondary font-mono uppercase mt-1">{activity.timestamp?.toDate().toLocaleString()}</p>
                                    </div>
                                 </div>
                                 <span className="text-xs font-mono font-bold text-success">+{activity.points}</span>
                              </div>
                           ))
                        ) : (
                           <div className="py-12 text-center text-[10px] uppercase font-bold text-white/10 tracking-widest">
                              No history available in local sector
                           </div>
                        )}
                     </div>
                  </section>
                </motion.div>
              )}

              {activeView === 'SETTINGS' && (
                <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                   <section className="system-card">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-10 flex items-center gap-2">
                         <Bell size={16} />
                         Notification Channels
                      </h2>
                      <div className="space-y-6">
                         {[
                           { id: 'notifications', label: 'Primary Signals', desc: 'Main platform alerts and system broadcasts' },
                           { id: 'rewardAlerts', label: 'Yield Pings', desc: 'Real-time alerts for point and XP acquisition' },
                           { id: 'marketing', label: 'Strategic Intel', desc: 'New campaign launches and limited-time events' }
                         ].map(item => (
                           <div key={item.id} className="flex items-center justify-between">
                              <div>
                                 <p className="text-sm font-bold">{item.label}</p>
                                 <p className="text-xs text-text-secondary mt-1">{item.desc}</p>
                              </div>
                              <button
                                onClick={() => updatePreference(item.id, !prefs[item.id as keyof typeof prefs])}
                                className={cn(
                                  "w-12 h-6 rounded-full relative transition-all duration-300",
                                  prefs[item.id as keyof typeof prefs] ? "bg-primary" : "bg-white/10"
                                )}
                              >
                                 <motion.div
                                   animate={{ x: prefs[item.id as keyof typeof prefs] ? 24 : 4 }}
                                   className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                 />
                              </button>
                           </div>
                         ))}
                      </div>
                   </section>

                   <section className="system-card">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-10 flex items-center gap-2">
                         <Globe size={16} />
                         Privacy & Global Signals
                      </h2>
                      <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <div>
                               <p className="text-sm font-bold">Stealth Mode</p>
                               <p className="text-xs text-text-secondary mt-1">Hide your activity signals from global leaderboards</p>
                            </div>
                            <button
                                onClick={() => updatePreference('privacyMode', !prefs.privacyMode)}
                                className={cn(
                                  "w-12 h-6 rounded-full relative transition-all duration-300",
                                  prefs.privacyMode ? "bg-primary" : "bg-white/10"
                                )}
                              >
                                 <motion.div
                                   animate={{ x: prefs.privacyMode ? 24 : 4 }}
                                   className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                                 />
                              </button>
                         </div>
                      </div>
                   </section>
                </motion.div>
              )}

              {activeView === 'SECURITY' && (
                <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="system-card">
                         <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
                            <Lock size={16} />
                            Access Protocols
                         </h2>
                         <div className="space-y-4">
                            <button className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-border rounded-xl hover:bg-white/10 transition-all text-left">
                               <div className="flex items-center gap-4">
                                  <Smartphone size={18} className="text-text-secondary" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Two-Factor Auth</span>
                               </div>
                               <span className="text-[10px] font-bold text-danger uppercase">Inactive</span>
                            </button>
                            <button className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-border rounded-xl hover:bg-white/10 transition-all text-left">
                               <div className="flex items-center gap-4">
                                  <EyeOff size={18} className="text-text-secondary" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Change Secret</span>
                               </div>
                               <ChevronRight size={14} className="text-text-secondary" />
                            </button>
                         </div>
                      </section>

                      <section className="system-card border-danger/10">
                         <h2 className="text-sm font-bold uppercase tracking-widest text-danger mb-8">Active Sessions</h2>
                         <div className="p-5 bg-white/[0.02] border border-white/5 rounded-xl flex justify-between items-center mb-6">
                            <div>
                               <p className="text-xs font-bold text-white uppercase tracking-widest">Linux / Chrome Hub</p>
                               <p className="text-[10px] text-text-secondary font-mono mt-1">10.42.x.x - Pulse Active</p>
                            </div>
                            <span className="badge-system text-success border-success/20">Authorized</span>
                         </div>
                         <button className="w-full py-4 bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-danger/20 transition-all">
                            Purge All Sessions
                         </button>
                      </section>
                   </div>
                </motion.div>
              )}

              {activeView === 'SUPPORT' && (
                <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-24">
                   <div className="w-24 h-24 rounded-[2.5rem] bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-10 shadow-2xl">
                      <HelpCircle size={48} className="text-primary" />
                   </div>
                   <h2 className="text-3xl font-bold mb-4 tracking-tight">Technical Support Terminal</h2>
                   <p className="text-text-secondary max-w-md mx-auto mb-12 text-sm leading-relaxed">Access our centralized knowledge base or initiate a priority signal to our engineering team.</p>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <button onClick={() => setDocType('REWARD')} className="system-card py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">Reward Policy</button>
                      <button onClick={() => setDocType('VERIFICATION')} className="system-card py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">Verification</button>
                      <button onClick={() => setDocType('FRAUD')} className="system-card py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all">Fraud & Integrity</button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

        </div>
      </div>

      <DocumentationModal
        isOpen={!!docType}
        onClose={() => setDocType(null)}
        type={docType || 'REWARD'}
      />
    </MainLayout>
  );
};

export default Profile;
