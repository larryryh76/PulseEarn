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
  Eye,
  HelpCircle,
  Smartphone,
  ChevronRight,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { loading } = useTasks();
  const [hasCopied, setHasCopied] = useState(false);
  const [activeView, setActiveView] = useState<'IDENTITY' | 'SETTINGS' | 'SECURITY' | 'SUPPORT'>('IDENTITY');
  const navigate = useNavigate();

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
      <div className="pt-32 pb-24 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Sidebar Nav */}
          <aside className="lg:w-64 shrink-0">
             <div className="flex flex-col items-center text-center mb-10 lg:items-start lg:text-left">
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 p-0.5 mb-6">
                   <div className="w-full h-full rounded-[1.9rem] bg-surface overflow-hidden border border-border">
                      <img
                        src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                   </div>
                </div>
                <h1 className="text-2xl mb-1">{userData?.username}</h1>
                <p className="data-label">Lvl {userData?.level || 1} System Operator</p>
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
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all",
                      activeView === item.id ? "bg-white/5 text-white" : "text-text-secondary hover:text-white hover:bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                       <item.icon size={16} />
                       {item.label}
                    </div>
                    <ChevronRight size={14} className={cn("opacity-0 transition-opacity", activeView === item.id && "opacity-100")} />
                  </button>
                ))}
             </nav>

             <div className="mt-12 pt-8 border-t border-border">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-danger/60 hover:text-danger text-[11px] font-bold uppercase tracking-widest transition-colors"
                >
                  <LogOut size={16} />
                  Terminate Session
                </button>
             </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <AnimatePresence mode="wait">
              {activeView === 'IDENTITY' && (
                <motion.div key="id" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <section className="system-card">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                           <ShieldCheck size={16} />
                           System Identification
                        </h2>
                        <div className="space-y-6">
                           <div className="flex items-center justify-between">
                              <span className="text-xs text-text-secondary font-medium">Internal Email</span>
                              <span className="text-xs font-bold text-white">{userData?.email}</span>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-xs text-text-secondary font-medium">Activation Date</span>
                              <span className="text-xs font-bold text-white">{userData?.createdAt?.toDate().toLocaleDateString()}</span>
                           </div>
                           <div className="flex items-center justify-between">
                              <span className="text-xs text-text-secondary font-medium">Deployment Region</span>
                              <span className="badge-system">Global / Tier 1</span>
                           </div>
                        </div>
                     </section>

                     <section className="system-card bg-primary/[0.02] border-primary/20">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                           <Share2 size={16} />
                           Expansion Protocol
                        </h2>
                        <p className="text-xs text-text-secondary mb-8">Onboard new operators using your unique signal to receive 50 PTS per verification.</p>

                        <div className="relative mb-8">
                           <input readOnly value={userData?.referralCode} className="w-full bg-black/40 border-border pr-12 font-mono text-sm tracking-wider" />
                           <button onClick={copyReferral} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors">
                              {hasCopied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
                           </button>
                        </div>

                        <div className="flex justify-between items-baseline pt-4 border-t border-white/5">
                           <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Confirmed Signals</p>
                           <p className="text-2xl font-mono font-bold text-white">{userData?.stats?.referralsCount || 0}</p>
                        </div>
                     </section>
                  </div>
                </motion.div>
              )}

              {activeView === 'SETTINGS' && (
                <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <section className="system-card">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
                         <Bell size={16} />
                         Signal Notifications
                      </h2>
                      <div className="space-y-4">
                         {[
                           { label: 'Mission Alerts', desc: 'Real-time notification when new tasks are deployed' },
                           { label: 'Settlement Signals', desc: 'Updates on withdrawal and prediction resolution' },
                           { label: 'Ecosystem Status', desc: 'Platform health and maintenance broadcasts' }
                         ].map(item => (
                           <div key={item.label} className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl">
                              <div>
                                 <p className="text-sm font-medium">{item.label}</p>
                                 <p className="text-[10px] text-text-secondary uppercase mt-1">{item.desc}</p>
                              </div>
                              <div className="w-10 h-6 bg-primary rounded-full relative p-1 cursor-pointer">
                                 <div className="absolute right-1 top-1 bottom-1 w-4 bg-white rounded-full" />
                              </div>
                           </div>
                         ))}
                      </div>
                   </section>

                   <section className="system-card">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
                         <Globe size={16} />
                         Localization
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="p-4 bg-white/5 border border-border rounded-xl flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest">Interface Language</span>
                            <span className="text-xs text-text-secondary">English (US)</span>
                         </div>
                         <div className="p-4 bg-white/5 border border-border rounded-xl flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest">Currency Unit</span>
                            <span className="text-xs text-text-secondary">USD ($)</span>
                         </div>
                      </div>
                   </section>
                </motion.div>
              )}

              {activeView === 'SECURITY' && (
                <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section className="system-card">
                         <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                            <Lock size={16} />
                            Access Layer
                         </h2>
                         <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl hover:bg-white/10 transition-all text-left">
                               <div className="flex items-center gap-3">
                                  <Smartphone size={16} className="text-text-secondary" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Two-Factor Auth</span>
                               </div>
                               <span className="text-[10px] font-bold text-danger uppercase">Inactive</span>
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl hover:bg-white/10 transition-all text-left">
                               <div className="flex items-center gap-3">
                                  <Eye size={16} className="text-text-secondary" />
                                  <span className="text-xs font-bold uppercase tracking-widest">Change Password</span>
                               </div>
                               <ChevronRight size={14} className="text-text-secondary" />
                            </button>
                         </div>
                      </section>

                      <section className="system-card border-danger/10">
                         <h2 className="text-sm font-bold uppercase tracking-widest text-danger mb-6">Device Management</h2>
                         <div className="p-4 bg-white/5 border border-border rounded-xl flex justify-between items-center mb-4">
                            <div>
                               <p className="text-xs font-bold text-white">Current Session</p>
                               <p className="text-[10px] text-text-secondary font-mono mt-1">Linux / Chrome - 10.42.x.x</p>
                            </div>
                            <span className="badge-system text-success border-success/20">Active</span>
                         </div>
                         <p className="text-[10px] text-text-secondary text-center">Terminate all other sessions to secure your entity records.</p>
                      </section>
                   </div>
                </motion.div>
              )}

              {activeView === 'SUPPORT' && (
                <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-20">
                   <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8">
                      <HelpCircle size={40} className="text-primary" />
                   </div>
                   <h2 className="text-2xl mb-4">How can we assist your operation?</h2>
                   <p className="text-text-secondary max-w-md mx-auto mb-10">Access our documentation, browse technical FAQs, or initiate a priority support ticket.</p>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                      <button className="btn-system-primary py-4">Documentation</button>
                      <button className="btn-system-secondary py-4">Knowledge Base</button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
