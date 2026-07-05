import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import { EconomyConfigEngine } from '../engines/system/EconomyConfigEngine';
import {
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  Share2,
  Copy,
  Check,
  HelpCircle,
  Zap,
  Calendar,
  ShieldCheck,
  FileText,
  History,
  TrendingUp,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import Card from '../components/ui/CardLegacy';
import Button from '../components/ui/ButtonLegacy';
import { getXpProgress, getLevelTier } from '../utils/progression';

const Profile: React.FC = () => {
  const { userData, logout, currentUser, updateUserEmail, updateUserPassword, reauthenticate } = useAuth();
  const { transactions, loading: txLoading } = useTransactions(10);
  const [hasCopied, setHasCopied] = useState(false);
  const [liveReferralCount, setLiveReferralCount] = useState<number | null>(null);
  const [rewardAmount, setRewardAmount] = useState(50);

  const [emailForm, setEmailForm] = useState({ email: currentUser?.email || '', currentPassword: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', new: '', confirm: '' });
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.email || emailForm.email === currentUser?.email) return;
    if (!emailForm.currentPassword) return toast.error('Current password required');

    setIsUpdatingEmail(true);
    try {
      await reauthenticate(emailForm.currentPassword);
      await updateUserEmail(emailForm.email);
      toast.success(`Confirmation link sent to ${emailForm.email}. Click it to complete the change.`);
      setEmailForm(prev => ({ ...prev, email: currentUser?.email || '', currentPassword: '' }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePassUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passForm.currentPassword) return toast.error('Current password required');
    if (passForm.new !== passForm.confirm) return toast.error('Passwords do not match');
    if (passForm.new.length < 6) return toast.error('Password must be at least 6 characters');

    setIsUpdatingPass(true);
    try {
      await reauthenticate(passForm.currentPassword);
      await updateUserPassword(passForm.new);
      toast.success('Password updated successfully');
      setPassForm({ currentPassword: '', new: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await EconomyConfigEngine.getConfig();
      setRewardAmount(config.rewards.referralBonusPoints);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', currentUser.uid),
      where('status', '==', 'REWARDED')
    );

    const unsubscribe = onSnapshot(q, (snap: any) => {
      setLiveReferralCount(snap.size);
    });

    return unsubscribe;
  }, [currentUser]);
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
  const memberSince = (userData?.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) || "N/A") || 'Recent';

  if (txLoading && !userData) return (
    <div className="pt-32 px-6 max-w-5xl mx-auto space-y-12">
      <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-12">
         <div className="w-36 h-36 rounded-[3rem] bg-surface animate-pulse" />
         <div className="flex-1 space-y-4 w-full">
            <div className="h-12 w-3/4 bg-surface rounded-xl animate-pulse mx-auto lg:mx-0" />
            <div className="h-6 w-1/2 bg-surface rounded-lg animate-pulse mx-auto lg:mx-0" />
         </div>
      </div>
      <div className="h-[400px] bg-surface rounded-[2.5rem] animate-pulse" />
    </div>
  );

  if (!userData && !txLoading) return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-6 px-6 text-center">
       <div className="w-20 h-20 rounded-3xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
          <UserIcon size={40} />
       </div>
       <div className="space-y-2">
          <h2 className="text-2xl font-bold uppercase italic tracking-tighter text-text-primary">Profile Inaccessible</h2>
          <p className="text-text-tertiary text-sm max-w-xs mx-auto uppercase font-bold tracking-widest leading-relaxed italic">
             Authorized identity data could not be retrieved from the network.
          </p>
       </div>
       <Button onClick={() => window.location.reload()} className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest italic">
          Attempt Recovery
       </Button>
    </div>
  );

  return (
    <>
      <div className="bg-background transition-colors duration-300">
      <div className="pt-24 md:pt-32 pb-24 md:pb-32 px-4 md:px-6 max-w-5xl mx-auto">
        {/* PROFILE HEADER */}
        <header className="mb-12 md:mb-16">
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8 md:gap-12 text-center lg:text-left">
            <div className="relative group">
               <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
               <div className={cn("w-36 h-36 rounded-[3rem] bg-surface-bright p-1 border border-border relative z-10", getLevelTier(userData?.level || 1).glow)}>
                 <div className="w-full h-full rounded-[2.9rem] overflow-hidden border border-border group/avatar relative">
                   <img
                     src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`}
                     alt=""
                     className="w-full h-full object-cover grayscale-[0.2] group-hover/avatar:grayscale-0 transition-all duration-700"
                   />
                 </div>
                 <div className={cn("absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-surface border border-border-bright flex items-center justify-center shadow-2xl", getLevelTier(userData?.level || 1).color)}>
                   <Award size={24} />
                 </div>
               </div>
            </div>

            <div className="flex-1 space-y-6 w-full">
              <div className="space-y-2">
                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                   <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-text-primary">{userData?.username}</h1>
                   <div className={cn("badge-system h-8 px-4 flex items-center gap-2", getLevelTier(userData?.level || 1).color, "bg-surface-bright")}>
                      <TrendingUp size={12} />
                      LVL {userData?.level || 1}
                   </div>
                   <div className={cn("badge-system h-8 px-4 flex items-center gap-2 font-black uppercase tracking-widest", getLevelTier(userData?.level || 1).color, "bg-surface-bright")}>
                      {getLevelTier(userData?.level || 1).title}
                   </div>
                 </div>
                 <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-text-tertiary">
                   <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                     <Calendar size={14} className="text-primary" />
                     Joined {memberSince}
                   </div>
                   <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                     <Zap size={14} className="text-primary" />
                     {(userData?.xp || 0)?.toLocaleString()} <span className="text-text-tertiary">XP Earned</span>
                   </div>
                 </div>
              </div>

              {/* XP PROGRESSION */}
              <div className="max-w-md mx-auto lg:mx-0 p-6 bg-surface-bright border border-border rounded-2xl">
                <div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.2em] mb-3 text-text-tertiary">
                  <span>Progress to Level {xpStats.level + 1}</span>
                  <span className={cn("font-black", getLevelTier(userData?.level || 1).color)}>{Math.floor(xpStats.progress)}%</span>
                </div>
                <div className="h-3 bg-surface-bright rounded-full overflow-hidden p-0.5 border border-border-bright">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpStats.progress}%` }}
                    className={cn(
                      "h-full transition-all duration-1000 rounded-full relative",
                      getLevelTier(userData?.level || 1).color.replace('text-', 'bg-'),
                      "shadow-[0_0_20px_rgba(94,106,210,0.8)]"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* NAVIGATION SYSTEM */}
        <div className="flex gap-1.5 mb-8 md:mb-12 p-1.5 bg-surface-bright/50 border border-border rounded-2xl md:rounded-[1.5rem] overflow-x-auto no-scrollbar">
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
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-text-primary hover:bg-surface-bright"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT VIEWPORT */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            {activeTab === 'IDENTITY' && (
              <motion.div key="id" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-1 h-5 bg-primary rounded-full" />
                       <h2 className="text-lg font-bold tracking-tight italic uppercase tracking-widest">Identity Node</h2>
                    </div>
                    <Card variant="compact" className="space-y-4 bg-surface-bright/50">
                      <div className="ledger-row border-0">
                        <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Network Email</span>
                        <span className="text-xs font-mono font-bold text-text-primary">{currentUser?.email}</span>
                      </div>
                      <div className="ledger-row border-0">
                        <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Security Clearance</span>
                        <div className={cn(
                          "badge-system",
                          currentUser?.emailVerified ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                        )}>
                          {currentUser?.emailVerified ? 'VERIFIED' : 'PENDING'}
                        </div>
                      </div>
                      {userData?.lastSeen && (
                        <div className="ledger-row border-0">
                           <span className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Last Activity</span>
                           <span className="text-xs font-mono font-bold text-text-primary uppercase">{userData.lastSeen.toDate().toLocaleDateString()}</span>
                        </div>
                      )}
                    </Card>
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                       <div className="w-1 h-5 bg-primary rounded-full" />
                       <h2 className="text-lg font-bold tracking-tight italic uppercase tracking-widest">Ecosystem Stats</h2>
                    </div>
                    <Card variant="compact" className="grid grid-cols-2 gap-4 bg-surface-bright/50">
                      <div className="p-4 rounded-xl bg-background/40 border border-border">
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">Total Wins</p>
                         <p className="text-xl font-mono font-bold text-text-primary">{userData?.stats?.totalWins || 0}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-background/40 border border-border">
                         <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-1">Streak</p>
                         <p className="text-xl font-mono font-bold text-warning">{userData?.streak || 0} D</p>
                      </div>
                    </Card>
                  </section>
                </div>

                <div className="pt-12 border-t border-border">
                   <Button variant="danger" className="w-full h-16 rounded-2xl opacity-60 hover:opacity-100 italic font-black uppercase tracking-widest text-[11px]" onClick={handleLogout}>
                      <LogOut size={16} />
                      Sign Out
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
                       <h2 className="text-3xl font-bold tracking-tight italic">Invite Friends</h2>
                       <p className="text-base text-text-secondary leading-relaxed font-medium italic">
                          Grow your network and earn rewards. You'll receive <span className="text-text-primary font-bold tracking-tight">{rewardAmount} PTS</span> for every friend who joins PulseEarn using your code.
                       </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 w-full bg-background/60 border border-border-bright px-8 py-5 rounded-2xl font-mono text-xl tracking-[0.2em] text-text-primary flex items-center justify-between">
                        {userData?.referralCode}
                        <div className="w-px h-6 bg-surface-accent mx-2" />
                        <button onClick={copyReferral} className="text-text-tertiary hover:text-text-primary transition-colors">
                           {hasCopied ? <Check size={20} className="text-success" /> : <Copy size={20} />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-12 pt-12 border-t border-border-bright">
                      <div className="space-y-2">
                        <p className="data-label">Total Referrals</p>
                          <p className="text-4xl font-bold text-text-primary tracking-tighter">{liveReferralCount ?? userData?.stats?.referralsCount ?? 0}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="data-label">Total Earned</p>
                          <p className="text-4xl font-bold text-text-primary tracking-tighter">{((liveReferralCount ?? userData?.stats?.referralsCount ?? 0) * rewardAmount)?.toLocaleString()} <span className="text-xs text-primary font-mono ml-1 uppercase">PTS</span></p>
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
                   <h2 className="text-lg font-bold tracking-tight">Recent Activity History</h2>
                </div>
                <div className="space-y-2">
                  {transactions.slice(0, 10).map(tx => (
                    <div key={tx.id} className="ledger-row">
                      <div className="flex items-center gap-5">
                        <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-primary">
                          <Zap size={14} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-text-primary leading-none mb-1.5">{tx.source || 'Ecosystem Reward'}</p>
                          <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">
                            {(tx.timestamp?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || "N/A")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                         <span className="text-[13px] font-mono font-bold text-success">+{(tx.amount || 0)?.toLocaleString()} <span className="text-[9px] uppercase tracking-widest opacity-40">PTS</span></span>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="py-24 text-center border border-dashed border-border rounded-[2.5rem]">
                       <p className="text-[10px] font-bold uppercase text-text-tertiary tracking-[0.2em]">No recent activity</p>
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
                  <Card className="divide-y divide-white/5 p-0 overflow-hidden bg-surface-bright/50 border-border">
                    {[
                      { id: 'notifications', label: 'Security Alerts', desc: 'Critical security and account updates' },
                      { id: 'rewardAlerts', label: 'Reward Notifications', desc: 'Real-time alerts for earned points and XP' },
                      { id: 'marketing', label: 'Product Updates', desc: 'News about new campaigns and platform features' }
                    ].map(item => (
                      <div key={item.id} className="flex items-center justify-between p-8 hover:bg-surface-bright/50 transition-colors">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-text-primary">{item.label}</p>
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
                    <h2 className="text-lg font-bold tracking-tight">Security & Privacy</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card variant="compact" className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-text-primary">Update Email</p>
                        <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest">Change your primary login email</p>
                      </div>
                      <form onSubmit={handleEmailUpdate} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">New Email</label>
                          <input
                            type="email"
                            value={emailForm.email}
                            onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
                            className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Current Password</label>
                          <input
                            type="password"
                            placeholder="Confirm to verify identity"
                            value={emailForm.currentPassword}
                            onChange={e => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
                            className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                          />
                        </div>
                        <Button isLoading={isUpdatingEmail} className="w-full py-3 text-[10px] uppercase tracking-widest font-black italic">
                          Update Email Address
                        </Button>
                      </form>
                    </Card>

                    <Card variant="compact" className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-text-primary">Change Password</p>
                        <p className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest">Secure your account access</p>
                      </div>
                      <form onSubmit={handlePassUpdate} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Current Password</label>
                          <input
                            type="password"
                            placeholder="Current Password"
                            value={passForm.currentPassword}
                            onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                            className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">New Password</label>
                          <input
                            type="password"
                            placeholder="New Password"
                            value={passForm.new}
                            onChange={e => setPassForm({ ...passForm, new: e.target.value })}
                            className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Confirm New Password</label>
                          <input
                            type="password"
                            placeholder="Confirm New Password"
                            value={passForm.confirm}
                            onChange={e => setPassForm({ ...passForm, confirm: e.target.value })}
                            className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                          />
                        </div>
                        <Button isLoading={isUpdatingPass} className="w-full py-3 text-[10px] uppercase tracking-widest font-black italic">
                          Change Password
                        </Button>
                      </form>
                    </Card>
                  </div>

                  <div className="p-12 text-center border border-dashed border-border rounded-[2rem] bg-surface-bright/30">
                     <ShieldCheck size={40} className="mx-auto text-text-tertiary/20 mb-4" />
                     <p className="text-[10px] font-black uppercase text-text-tertiary tracking-[0.2em]">Privacy protections are active</p>
                     <p className="text-[9px] text-text-tertiary/50 mt-1 uppercase font-bold tracking-widest">Advanced security controls are managed by the identity provider</p>
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
                     <h2 className="text-3xl font-bold tracking-tight italic">Help & Support</h2>
                     <p className="text-base text-text-secondary leading-relaxed font-medium italic">Access platform documentation or contact our support team for assistance.</p>
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
                      <p className="text-lg font-bold text-text-primary">Need a direct link?</p>
                      <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest">Open a direct support signal</p>
                   </div>
                   <Button className="h-14 px-10 rounded-2xl" onClick={() => navigate('/support')}>
                      Support Center
                   </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </>
  );
};

export default Profile;
