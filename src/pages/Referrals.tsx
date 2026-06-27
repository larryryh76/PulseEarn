import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EconomyConfigEngine } from '../engines/system/EconomyConfigEngine';
import {
  Users,
  Copy,
  Share2,
  History,
  TrendingUp,
  ChevronRight,
  Gift,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ReferralRecord } from '../types';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';

const Referrals: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardAmount, setRewardAmount] = useState(50);

  useEffect(() => {
    const fetchConfig = async () => {
      const config = await EconomyConfigEngine.getConfig();
      setRewardAmount(config.rewards.referralBonusPoints);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Removing orderBy to prevent "Missing Index" failures.
    // Sorting is performed client-side for maximum reliability.
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord));
      // Client-side sort by createdAt
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setReferrals(data);
      setLoading(false);
    }, (err: any) => {
      console.error("[Referrals] Authority Sync Failure:", err.message);
      setLoading(false);
      // Fallback for permission/index issues
      if (err.code === 'permission-denied') {
        toast.error("Access Denied: Referral data locked.");
      }
    });

    return unsubscribe;
  }, [currentUser]);

  const copyCode = () => {
    if (userData?.referralCode) {
      navigator.clipboard.writeText(userData.referralCode);
      toast.success('Referral code copied!');
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/signup?ref=${userData?.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const isUnlocked = (userData?.stats?.tasksCompleted || 0) > 0;

  const stats = [
    { label: 'Total Referrals', value: referrals.length, icon: Users, color: 'text-primary' },
    { label: 'PTS Earned', value: (referrals.filter(r => r.status === 'REWARDED').length * rewardAmount).toLocaleString(), icon: Zap, color: 'text-accent' },
    { label: 'Pending', value: referrals.filter(r => r.status === 'REGISTERED').length, icon: Clock, color: 'text-warning' },
    { label: 'Successful', value: referrals.filter(r => r.status === 'REWARDED').length, icon: CheckCircle2, color: 'text-success' },
  ];

  return (
    <>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto space-y-16">
        <header className="space-y-4">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-primary" />
             <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Referrals</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
             Invite <span className="text-text-tertiary">& Earn</span>
          </h1>
          <p className="text-text-secondary max-w-xl font-medium">
             Invite friends and earn rewards for every user you onboard.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* LEFT: INVITATION PANEL */}
          <div className="lg:col-span-7 space-y-12">
             {isUnlocked ? (
               <Card className="p-10 bg-primary/[0.02] border-primary/20 space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />

                  <div className="space-y-6">
                     <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                        <Gift className="text-primary" size={24} />
                        Invite Friends
                     </h2>
                     <p className="text-sm text-text-secondary leading-relaxed font-medium">
                        Share your unique referral code or link. When your friends join, you'll earn points.
                     </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Unique Invite Code</p>
                        <div className="flex gap-2">
                           <div className="flex-1 bg-background border border-border-bright rounded-xl px-5 py-4 font-mono font-bold text-lg tracking-widest text-text-primary">
                              {userData?.referralCode || '-------'}
                           </div>
                           <button
                             onClick={copyCode}
                             className="w-14 h-full bg-surface-bright border border-border-bright rounded-xl flex items-center justify-center text-text-primary hover:bg-surface-accent transition-all"
                           >
                              <Copy size={20} />
                           </button>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Referral Link</p>
                        <div className="flex gap-2">
                           <div className="flex-1 bg-background border border-border-bright rounded-xl px-5 py-4 font-medium text-sm truncate text-text-secondary">
                              pulseearn.online/signup?ref={userData?.referralCode}
                           </div>
                           <button
                             onClick={copyLink}
                             className="w-14 h-full bg-primary text-text-primary rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                           >
                              <Share2 size={20} />
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4">
                     <AlertCircle className="text-primary shrink-0 mt-0.5" size={18} />
                     <p className="text-[11px] text-primary/80 font-semibold leading-relaxed uppercase tracking-wide">
                        Multi-account creation via referral links is strictly prohibited and results in immediate account suspension.
                     </p>
                  </div>
               </Card>
             ) : (
                <Card className="p-10 md:p-16 bg-surface-bright/50 border-dashed border-border flex flex-col items-center text-center gap-10 rounded-[3rem] relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Zap size={120} />
                   </div>

                   <div className="space-y-4">
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight italic uppercase">Unlock Your Network</h2>
                      <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest max-w-xs mx-auto">
                         Complete at least one task to unlock referral rewards.
                      </p>
                   </div>

                   <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-md">
                      <div className="flex-1 p-5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center gap-3 relative">
                         <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black">01</div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-primary">Complete 1 Task</p>
                         <div className="absolute -right-2 top-1/2 -translate-y-1/2 hidden md:block text-primary/30">
                            <ChevronRight size={16} />
                         </div>
                      </div>
                      <div className="flex-1 p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-3 opacity-40">
                         <div className="w-8 h-8 rounded-full bg-white/10 text-white/40 flex items-center justify-center text-[10px] font-black">02</div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Share & Earn</p>
                      </div>
                   </div>

                   <Button onClick={() => navigate('/tasks')} className="px-12 h-16 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic shadow-2xl group">
                      Initialize First Task <ChevronRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
                   </Button>
                </Card>
             )}

             <section className="space-y-8">
                <div className="flex items-center justify-between">
                   <h2 className="text-sm font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-3">
                      <History size={16} />
                      Referral History
                   </h2>
                </div>

                <div className="space-y-8">
                   {loading ? (
                     [1,2,3].map(i => <div key={i} className="h-20 bg-surface rounded-2xl animate-pulse" />)
                   ) : referrals.length > 0 ? (
                     <>
                       {/* Fix #15: Distinguish between Qualified and Pending referrals */}
                       <div className="space-y-4">
                         <div className="flex items-center gap-2 px-2">
                           <CheckCircle2 size={14} className="text-success" />
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Qualified (Rewarded)</h3>
                         </div>
                         {referrals.filter(r => r.status === 'REWARDED').map(ref => (
                           <div key={ref.id} className="p-6 bg-success/[0.02] border border-success/10 rounded-2xl flex items-center justify-between group hover:border-success/30 transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-success/5 border border-success/10 flex items-center justify-center text-success">
                                    <Users size={18} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-text-primary uppercase tracking-tight">{ref.refereeUsername || 'New User'}</p>
                                    <p className="text-[10px] font-mono text-text-tertiary mt-0.5 uppercase">Joined {ref.createdAt?.toDate?.() ? (ref.createdAt?.toDate?.()?.toLocaleDateString() || "N/A") : 'N/A'}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className="badge-system bg-success/10 text-success border-success/20">+{rewardAmount} PTS</div>
                              </div>
                           </div>
                         ))}
                         {referrals.filter(r => r.status === 'REWARDED').length === 0 && (
                           <p className="text-[10px] italic text-text-tertiary px-6">No qualified referrals yet.</p>
                         )}
                       </div>

                       <div className="space-y-4 pt-4">
                         <div className="flex items-center gap-2 px-2">
                           <Clock size={14} className="text-warning" />
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Pending (Awaiting First Task)</h3>
                           <div className="group relative ml-1">
                             <AlertCircle size={12} className="text-text-tertiary cursor-help" />
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-surface border border-border rounded-lg text-[8px] font-bold text-text-secondary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                               Bonus is paid once the referred user completes their first task.
                             </div>
                           </div>
                         </div>
                         {referrals.filter(r => r.status !== 'REWARDED').map(ref => (
                           <div key={ref.id} className="p-6 bg-surface-bright/30 border border-border rounded-2xl flex items-center justify-between group hover:border-border-bright transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border-bright flex items-center justify-center text-text-tertiary">
                                    <Users size={18} />
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-text-primary uppercase tracking-tight">{ref.refereeUsername || 'New User'}</p>
                                    <p className="text-[10px] font-mono text-text-tertiary mt-0.5 uppercase">Joined {ref.createdAt?.toDate?.() ? (ref.createdAt?.toDate?.()?.toLocaleDateString() || "N/A") : 'N/A'}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <span className="px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-surface-bright text-text-tertiary border-border-bright">
                                    {ref.status}
                                 </span>
                              </div>
                           </div>
                         ))}
                         {referrals.filter(r => r.status !== 'REWARDED').length === 0 && (
                           <p className="text-[10px] italic text-text-tertiary px-6">No pending referrals.</p>
                         )}
                       </div>
                     </>
                   ) : (
                     <div className="py-20 text-center border border-dashed border-border-bright rounded-[2.5rem] bg-surface-bright/50">
                        <Users size={40} className="mx-auto text-text-primary/5 mb-4" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">No referrals recorded yet</p>
                     </div>
                   )}
                </div>
             </section>
          </div>

          {/* RIGHT: STATISTICS & RULES */}
          <div className="lg:col-span-5 space-y-12">
             <section className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <Card key={i} variant="compact" className="p-6 space-y-4">
                     <div className="flex justify-between items-start">
                        <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{stat.label}</p>
                        <stat.icon size={14} className={stat.color} />
                     </div>
                     <p className="text-2xl font-mono font-bold text-text-primary">{stat.value}</p>
                  </Card>
                ))}
             </section>

             <Card className="p-8 space-y-8 bg-surface-bright/30 border-border">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                   <TrendingUp size={14} />
                   Referral Performance
                </h3>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                         <span className="text-text-tertiary">Progress to Tier 2</span>
                         <span className="text-text-primary">{referrals.length} / 10</span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-bright rounded-full overflow-hidden">
                         <div
                           className="h-full bg-accent shadow-[0_0_10px_rgba(0,210,255,0.3)] transition-all duration-1000"
                           style={{ width: `${Math.min((referrals.length / 10) * 100, 100)}%` }}
                         />
                      </div>
                   </div>

                   <div className="pt-6 border-t border-border space-y-4">
                      {[
                        { label: 'Referral Bonus', value: `${rewardAmount} PTS` },
                      ].map((rule, i) => (
                        <div key={i} className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{rule.label}</span>
                           <span className="text-[10px] font-mono font-bold text-text-primary">{rule.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </Card>

             <div className="p-8 bg-surface-bright/50 border border-border rounded-[2rem] space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2">
                   <CheckCircle2 size={14} />
                   Verification Rules
                </h3>
                <ul className="space-y-4">
                   {[
                     'Invitee must verify their email address.',
                     'Invitee must complete at least 1 campaign.',
                     'Rewards are distributed instantly upon qualification.'
                   ].map((rule, i) => (
                     <li key={i} className="flex items-start gap-3">
                        <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        <p className="text-[11px] text-text-secondary font-medium leading-relaxed">{rule}</p>
                     </li>
                   ))}
                </ul>
             </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Referrals;
