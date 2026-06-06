import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  Share2,
  Copy,
  Check,
  Bell,
  Lock,
  HelpCircle,
  Smartphone,
  ChevronRight,
  Globe,
  Zap,
  BarChart3,
  Calendar,
  ShieldCheck,
  FileText,
  Activity,
  History,
  TrendingUp,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getXpProgress } from '../utils/progression';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { transactions, loading: txLoading } = useTransactions(10);
  const [hasCopied, setHasCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'REWARDS' | 'ACTIVITY' | 'SETTINGS' | 'SUPPORT'>('IDENTITY');
  const navigate = useNavigate();

  const [prefs, setPrefs] = useState(userData?.preferences || {
    notifications: true,
    rewardAlerts: true,
    marketing: false,
    privacyMode: false
  });

  useEffect(() => {
    if (userData?.preferences) {
      setPrefs(userData.preferences);
    }
  }, [userData]);

  const updatePreference = async (key: string, value: boolean) => {
    if (!userData?.uid) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    try {
      await updateDoc(doc(db, 'users', userData.uid), {
        [`preferences.${key}`]: value
      });
      toast.success('Settings updated');
    } catch (err) {
      toast.error('Failed to sync settings');
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

  const xpStats = getXpProgress(userData?.xp || 0);
  const memberSince = userData?.createdAt?.toDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) || 'Recent';

  if (txLoading && !userData) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-5xl mx-auto space-y-12">
        <div className="flex items-center gap-8">
           <div className="w-32 h-32 rounded-[2.5rem] bg-surface animate-pulse" />
           <div className="space-y-4">
              <div className="h-10 w-64 bg-surface rounded-xl animate-pulse" />
              <div className="h-6 w-48 bg-surface rounded-lg animate-pulse" />
           </div>
        </div>
        <div className="h-[400px] bg-surface rounded-[2.5rem] animate-pulse" />
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
        {/* PROFILE INFRASTRUCTURE HEADER */}
        <header className="mb-16">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 text-center lg:text-left">
            <div className="relative group">
               <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
               <div className="w-36 h-36 rounded-[3rem] bg-surface-bright p-1 border border-white/5 relative z-10">
                 <div className="w-full h-full rounded-[2.9rem] overflow-hidden border border-white/5">
                   <img
                     src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`}
                     alt=""
                     className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700"
                   />
                 </div>
                 <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-primary shadow-2xl">
                   <Award size={24} />
                 </div>
               </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                   <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">{userData?.username}</h1>
                   <div className="badge-system badge-primary h-8 px-4 flex items-center gap-2">
                      <TrendingUp size={12} />
                      LVL {userData?.level || 1}
                   </div>
                 </div>
                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-text-tertiary">
                   <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                     <Calendar size={14} className="text-primary" />
                     Joined {memberSince}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                     <Zap size={14} className="text-primary" />
                     {userData?.xp?.toLocaleString()} <span className="text-white/20">Authorized XP</span>
                   </div>
                 </div>
              </div>

              {/* XP HIERARCHY */}
              <div className="max-w-md mx-auto lg:mx-0 p-6 bg-surface-bright/30 border border-white/5 rounded-2xl">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.2em] mb-3 text-text-tertiary">
                  <span>Elevation to Rank {xpStats.level + 1}</span>
                  <span className="text-white">{Math.floor(xpStats.progress)}% Verified</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpStats.progress}%` }}
                    className="h-full bg-primary shadow-[0_0_10px_rgba(94,106,210,0.5)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* NAVIGATION SYSTEM */}
        <div className="flex gap-1.5 mb-12 p-1.5 bg-surface-bright/50 border border-border rounded-[1.5rem] overflow-x-auto no-scrollbar">
          {[
            { id: 'IDENTITY', label: 'Identity', icon: UserIcon },
            { id: 'REWARDS', label: 'Rewards', icon: Zap },
            { id: 'ACTIVITY', label: 'Activity', icon: History },
            { id: 'SETTINGS', label: 'Settings', icon: SettingsIcon },
            { id: 'SUPPORT', label: 'Support', icon: HelpCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.15em] transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* SYSTEM VIEWPORT */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'IDENTITY' && (
              <motion.div key="id" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-1 h-5 bg-primary rounded-full" />
                       <h2 className="text-lg font-bold tracking-tight">Security Protocol</h2>
                    </div>
                    <Card variant="compact" className="space-y-4">
                      <div className="ledger-row border-0">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Email Verification</span>
                        <div className="badge-system bg-success/10 text-success border-success/20">Authorized</div>
                      </div>
                      <div className="ledger-row border-0">
                        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Session Encryption</span>
                        <div className="badge-system bg-success/10 text-success border-success/20">Active</div>
                      </div>
                      <div className="ledger-row border-0">
                         <span className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">Last Secure Login</span>
                         <span className="data-mono">{userData?.security?.lastLogin?.toDate().toLocaleDateString() || 'N/A'}</span>
                      </div>
                    </Card>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-1 h-5 bg-primary rounded-full" />
                       <h2 className="text-lg font-bold tracking-tight">Ecosystem Linkage</h2>
                    </div>
                    <Card variant="compact" className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-white/5 flex items-center justify-center text-text-tertiary group hover:border-primary/20 transition-colors">
                        <Smartphone size={24} />
                      </div>
                      <div className="space-y-1">
                         <p className="text-sm font-bold text-white">Device Pairing</p>
                         <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">Primary Handset Authorized</p>
                      </div>
                    </Card>
                  </section>
                </div>

                <div className="pt-12 border-t border-border">
                   <Button variant="danger" className="w-full h-16 rounded-[1.5rem] opacity-60 hover:opacity-100" onClick={handleLogout}>
                      <LogOut size={16} />
                      Terminate Active Session
                   </Button>
                </div>
              </motion.div>
            )}

            {activeTab === 'REWARDS' && (
              <motion.div key="rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <Card className="bg-primary/[0.02] border-primary/20 p-12 relative overflow-hidden rounded-[3rem]">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                    <Share2 size={160} />
                  </div>
                  <div className="relative z-10 max-w-xl space-y-10">
                    <div className="space-y-3">
                       <h2 className="text-3xl font-bold tracking-tight">Referral Infrastructure</h2>
                       <p className="text-base text-text-secondary leading-relaxed font-medium">
                          Expand the PulseEarn node network. You receive <span className="text-white font-bold tracking-tight">50 PTS</span> for every verified user you onboard to the ecosystem.
                       </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 w-full bg-background/60 border border-white/10 px-8 py-5 rounded-2xl font-mono text-xl tracking-[0.2em] text-white flex items-center justify-between">
                        {userData?.referralCode}
                        <div className="w-px h-6 bg-white/10 mx-2" />
                        <button onClick={copyReferral} className="text-text-tertiary hover:text-white transition-colors">
                           {hasCopied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 pt-12 border-t border-white/10">
                      <div className="space-y-2">
                        <p className="data-label">Total Referrals</p>
                        <p className="text-4xl font-bold text-white tracking-tighter">{userData?.stats?.referralsCount || 0}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="data-label">Inventory Earned</p>
                        <p className="text-4xl font-bold text-white tracking-tighter">{( (userData?.stats?.referralsCount || 0) * 50 ).toLocaleString()} <span className="text-xs text-primary font-mono ml-1 uppercase">PTS</span></p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {activeTab === 'ACTIVITY' && (
              <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="flex items-center gap-3">
                   <div className="w-1 h-5 bg-primary rounded-full" />
                   <h2 className="text-lg font-bold tracking-tight">Recent Synchronization History</h2>
                </div>
                <div className="space-y-2">
                  {transactions.slice(0, 10).map(tx => (
                    <div key={tx.id} className="ledger-row">
                      <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary">
                          <Zap size={14} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white leading-none mb-1.5">{tx.source || 'Ecosystem Reward'}</p>
                          <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">
                            {tx.timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="text-[13px] font-mono font-bold text-success">+{tx.amount.toLocaleString()} <span className="text-[9px] uppercase tracking-widest opacity-40">PTS</span></span>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="py-24 text-center border border-dashed border-border rounded-[2.5rem]">
                       <p className="text-[10px] font-bold uppercase text-text-tertiary tracking-[0.2em]">No system activity found in current cycle</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'SETTINGS' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <section className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    <h2 className="text-lg font-bold tracking-tight">System Communications</h2>
                  </div>
                  <Card className="divide-y divide-white/5 p-0 overflow-hidden">
                    {[
                      { id: 'notifications', label: 'Core Alerts', desc: 'Critical security and authentication signals' },
                      { id: 'rewardAlerts', label: 'Economic Pulses', desc: 'Real-time notification of point and XP authorization' },
                      { id: 'marketing', label: 'Ecosystem Intelligence', desc: 'Updates on new campaign discovery and network news' }
                    ].map(item => (
                      <div key={item.id} className="flex items-center justify-between p-8 hover:bg-white/[0.01] transition-colors">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-white">{item.label}</p>
                          <p className="text-xs text-text-tertiary leading-relaxed max-w-sm font-medium">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => updatePreference(item.id, !prefs[item.id as keyof typeof prefs])}
                          className={cn(
                            "w-11 h-5.5 rounded-full relative transition-all duration-300",
                            prefs[item.id as keyof typeof prefs] ? "bg-primary" : "bg-surface-bright"
                          )}
                        >
                          <motion.div
                            animate={{ x: prefs[item.id as keyof typeof prefs] ? 24 : 4 }}
                            className="absolute top-1 w-3.5 h-3.5 rounded-full bg-white shadow-lg"
                          />
                        </button>
                      </div>
                    ))}
                  </Card>
                </section>

                <section className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-primary rounded-full" />
                    <h2 className="text-lg font-bold tracking-tight">Security Infrastructure</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button className="flex items-center justify-between p-6 bg-surface border border-border rounded-2xl hover:border-primary/30 transition-all text-left">
                       <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">Rotate Credentials</span>
                       <ChevronRight size={14} className="text-text-tertiary" />
                    </button>
                    <button className="flex items-center justify-between p-6 bg-surface border border-border rounded-2xl hover:border-primary/30 transition-all text-left">
                       <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">Session Manager</span>
                       <ChevronRight size={14} className="text-text-tertiary" />
                    </button>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'SUPPORT' && (
              <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12 text-center lg:text-left">
                <Card className="bg-surface/30 border-dashed border-border p-12 text-center flex flex-col items-center gap-8 rounded-[3rem]">
                  <div className="w-20 h-20 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-premium">
                    <HelpCircle size={32} />
                  </div>
                  <div className="space-y-3 max-w-md">
                     <h2 className="text-3xl font-bold tracking-tight">Operational Support</h2>
                     <p className="text-base text-text-secondary leading-relaxed font-medium">Access our official documentation frameworks or open a support request with the network operators.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl pt-4">
                    <Link to="/reward-policy" className="system-card-compact flex flex-col items-center gap-4 bg-background/40 hover:bg-surface-bright/50 transition-all group">
                      <Zap size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Reward Policy</span>
                    </Link>
                    <Link to="/verification-policy" className="system-card-compact flex flex-col items-center gap-4 bg-background/40 hover:bg-surface-bright/50 transition-all group">
                      <ShieldCheck size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Validation</span>
                    </Link>
                    <Link to="/fraud-policy" className="system-card-compact flex flex-col items-center gap-4 bg-background/40 hover:bg-surface-bright/50 transition-all group">
                      <FileText size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Integrity</span>
                    </Link>
                  </div>
                </Card>

                <div className="p-10 border border-border bg-surface-bright/20 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8">
                   <div className="space-y-1 text-center md:text-left">
                      <p className="text-lg font-bold text-white">Need a direct link?</p>
                      <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Open a direct support signal</p>
                   </div>
                   <Button className="h-14 px-10 rounded-2xl">
                      Request Operator Access
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
