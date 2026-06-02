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
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import DocumentationModal from '../components/ui/DocumentationModal';
import { getXpProgress } from '../utils/progression';

const Profile: React.FC = () => {
  const { userData, logout } = useAuth();
  const { transactions, loading: txLoading } = useTransactions(10);
  const [hasCopied, setHasCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'REWARDS' | 'ACTIVITY' | 'SETTINGS' | 'SUPPORT'>('IDENTITY');
  const [docType, setDocType] = useState<'REWARD' | 'VERIFICATION' | 'FRAUD' | null>(null);
  const navigate = useNavigate();

  // Settings states with sync
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

  if (txLoading && !userData) return <MainLayout><div className="pt-32 px-6 max-w-4xl mx-auto animate-pulse">
    <div className="w-32 h-32 rounded-full bg-white/5 mx-auto mb-8" />
    <div className="h-8 w-64 bg-white/5 mx-auto rounded" />
  </div></MainLayout>;

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">

        {/* Identity Header */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row items-center gap-8 md:items-start text-center md:text-left">
            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-accent/20 p-1 relative shadow-2xl">
              <div className="w-full h-full rounded-[2.4rem] bg-surface overflow-hidden border border-white/10">
                <img
                  src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-10 h-10 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-primary shadow-xl">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                <h1 className="text-4xl font-bold tracking-tight">{userData?.username}</h1>
                <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                  Level {userData?.level || 1}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-text-secondary text-sm mb-8">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  Member since {memberSince}
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-primary" />
                  {userData?.xp?.toLocaleString()} Total XP
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="max-w-md mx-auto md:mx-0 mb-6">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-3 text-text-secondary">
                  <span>Progress to Level {xpStats.level + 1}</span>
                  <span>{Math.floor(xpStats.progress)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpStats.progress}%` }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>

              {/* Referral Code Quick Access */}
              <div className="flex items-center gap-3 justify-center md:justify-start">
                 <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-4">
                    <span className="text-[10px] font-bold uppercase text-text-secondary tracking-widest border-r border-white/10 pr-4">Referral Code</span>
                    <span className="font-mono text-sm tracking-widest text-white">{userData?.referralCode}</span>
                    <button onClick={copyReferral} className="text-text-secondary hover:text-white transition-colors pl-2">
                       {hasCopied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex gap-8 mb-12 border-b border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'IDENTITY', label: 'Identity', icon: UserIcon },
            { id: 'REWARDS', label: 'Rewards', icon: Zap },
            { id: 'ACTIVITY', label: 'Activity', icon: BarChart3 },
            { id: 'SETTINGS', label: 'Settings', icon: SettingsIcon },
            { id: 'SUPPORT', label: 'Support', icon: HelpCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "pb-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 shrink-0",
                activeTab === tab.id ? "text-white" : "text-text-secondary hover:text-white"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,102,255,0.5)]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'IDENTITY' && (
              <motion.div key="id" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="bg-white/[0.01] border border-white/5 p-8 rounded-[2rem]">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-6">Account Verification</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-medium">Email Identity</span>
                        <span className="text-[10px] font-bold text-success uppercase tracking-widest">Verified</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-xs font-medium">Security Status</span>
                        <span className="text-[10px] font-bold text-success uppercase tracking-widest">Protected</span>
                      </div>
                    </div>
                  </section>
                  <section className="bg-white/[0.01] border border-white/5 p-8 rounded-[2rem]">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-6">Linked Accounts</h3>
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-text-secondary">
                        <Smartphone size={20} />
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-text-secondary opacity-30">
                        <Globe size={20} />
                      </div>
                    </div>
                  </section>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-5 rounded-2xl border border-danger/20 text-danger/60 hover:text-danger hover:bg-danger/5 transition-all text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                >
                  <LogOut size={16} />
                  Logout of Account
                </button>
              </motion.div>
            )}

            {activeTab === 'REWARDS' && (
              <motion.div key="rewards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <section className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-10 rounded-[3rem] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Share2 size={120} />
                  </div>
                  <div className="relative z-10 max-w-lg">
                    <h2 className="text-2xl font-bold mb-3 tracking-tight">Referral Performance</h2>
                    <p className="text-sm text-text-secondary mb-10 leading-relaxed">Grow your rewards by sharing your unique referral link. You'll receive <span className="text-white font-bold">50 PTS</span> for every user who registers and verifies their account.</p>

                    <div className="flex items-center gap-4 mb-10">
                      <div className="flex-1 bg-black/40 border border-white/10 p-5 rounded-2xl font-mono text-lg tracking-widest text-white">
                        {userData?.referralCode}
                      </div>
                      <button
                        onClick={copyReferral}
                        className="p-5 rounded-2xl bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                      >
                        {hasCopied ? <Check size={24} /> : <Copy size={24} />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/5">
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Total Referrals</p>
                        <p className="text-3xl font-mono font-bold text-white">{userData?.stats?.referralsCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Total Earned</p>
                        <p className="text-3xl font-mono font-bold text-white">{( (userData?.stats?.referralsCount || 0) * 50 ).toLocaleString()} <span className="text-sm">PTS</span></p>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'ACTIVITY' && (
              <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-8 flex items-center gap-3">
                   <BarChart3 size={16} className="text-primary" />
                   Recent Reward History
                </h3>
                <div className="space-y-3">
                  {transactions.slice(0, 8).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-5 bg-white/[0.01] border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-primary">
                          <Zap size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{tx.source || 'Reward'}</p>
                          <p className="text-[10px] text-text-secondary font-medium uppercase mt-1">
                            {tx.timestamp?.toDate().toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-bold text-success">+{tx.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="py-20 text-center border border-dashed border-white/5 rounded-[2rem] text-[10px] font-bold uppercase text-white/20 tracking-widest">
                       No recent activity found
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'SETTINGS' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <section className="bg-white/[0.01] border border-white/5 p-8 rounded-[2rem]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-10 flex items-center gap-2">
                    <Bell size={16} />
                    Notification Preferences
                  </h3>
                  <div className="space-y-8">
                    {[
                      { id: 'notifications', label: 'Account Notifications', desc: 'Receive alerts for security and login activity' },
                      { id: 'rewardAlerts', label: 'Reward Alerts', desc: 'Get notified immediately when PTS or XP is awarded' },
                      { id: 'marketing', label: 'News & Updates', desc: 'Stay informed about new missions and system features' }
                    ].map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold mb-1">{item.label}</p>
                          <p className="text-xs text-text-secondary leading-relaxed max-w-sm">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => updatePreference(item.id, !prefs[item.id as keyof typeof prefs])}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all duration-300",
                            prefs[item.id as keyof typeof prefs] ? "bg-primary" : "bg-white/10"
                          )}
                        >
                          <motion.div
                            animate={{ x: prefs[item.id as keyof typeof prefs] ? 26 : 4 }}
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white/[0.01] border border-white/5 p-8 rounded-[2rem]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-10 flex items-center gap-2">
                    <Lock size={16} />
                    Account Settings
                  </h3>
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
                       <span className="text-xs font-bold uppercase tracking-widest">Two-Factor Authentication</span>
                       <ChevronRight size={14} className="text-text-secondary" />
                    </button>
                    <button className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                       <span className="text-xs font-bold uppercase tracking-widest">Connected Accounts</span>
                       <ChevronRight size={14} className="text-text-secondary" />
                    </button>
                    <button className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all text-left">
                       <span className="text-xs font-bold uppercase tracking-widest">Session Management</span>
                       <ChevronRight size={14} className="text-text-secondary" />
                    </button>
                  </div>
                </section>
              </motion.div>
            )}

            {activeTab === 'SUPPORT' && (
              <motion.div key="support" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                <div className="bg-white/[0.01] border border-white/5 p-10 rounded-[3rem] text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 text-primary border border-primary/20 shadow-2xl shadow-primary/10">
                    <HelpCircle size={32} />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 tracking-tight">Support Center</h2>
                  <p className="text-sm text-text-secondary max-w-sm mx-auto mb-10 leading-relaxed">Access our official documentation or contact our support team for assistance with your account.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
                    <Link to="/reward-policy" className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                      <Zap size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Reward Policy</span>
                    </Link>
                    <Link to="/verification-policy" className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                      <ShieldCheck size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Verification</span>
                    </Link>
                    <Link to="/fraud-policy" className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group">
                      <FileText size={20} className="text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Integrity</span>
                    </Link>
                  </div>
                </div>

                <div className="p-8 border border-white/5 bg-white/[0.01] rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="text-center sm:text-left">
                      <p className="text-sm font-bold mb-1">Need additional help?</p>
                      <p className="text-xs text-text-secondary">Open a support ticket with our team.</p>
                   </div>
                   <button className="px-8 py-4 bg-white text-black text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-white/90 transition-all shadow-xl">
                      Contact Support
                   </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
