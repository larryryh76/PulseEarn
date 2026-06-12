import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Copy,
  Share2,
  History,
  TrendingUp,
  Gift,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ReferralRecord } from '../types';
import { cn } from '../utils';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';

const Referrals: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setReferrals(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralRecord)));
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
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

  const stats = [
    { label: 'Total Referrals', value: referrals.length, icon: Users, color: 'text-primary' },
    { label: 'Points Earned', value: (referrals.filter(r => r.status === 'REWARDED').length * 50 || 0)?.toLocaleString(), icon: Zap, color: 'text-accent' },
    { label: 'Pending', value: referrals.filter(r => r.status !== 'REWARDED').length, icon: Clock, color: 'text-warning' },
    { label: 'Successful', value: referrals.filter(r => r.status === 'REWARDED').length, icon: CheckCircle2, color: 'text-success' },
  ];

  return (
    <MainLayout>
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
             <Card className="p-10 bg-primary/[0.02] border-primary/20 space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] -translate-y-1/2 translate-x-1/2" />

                <div className="space-y-6">
                   <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                      <Gift className="text-primary" size={24} />
                      Invite Friends
                   </h2>
                   <p className="text-sm text-text-secondary leading-relaxed font-medium">
                      Share your unique referral code or link. When your friends join and complete tasks, you'll earn points.
                   </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-3">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Unique Invite Code</p>
                      <div className="flex gap-2">
                         <div className="flex-1 bg-background border border-white/10 rounded-xl px-5 py-4 font-mono font-bold text-lg tracking-widest text-white">
                            {userData?.referralCode || '-------'}
                         </div>
                         <button
                           onClick={copyCode}
                           className="w-14 h-full bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all"
                         >
                            <Copy size={20} />
                         </button>
                      </div>
                   </div>
                   <div className="space-y-3">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Referral Link</p>
                      <div className="flex gap-2">
                         <div className="flex-1 bg-background border border-white/10 rounded-xl px-5 py-4 font-medium text-sm truncate text-white/40">
                            pulseearn.app/join?ref={userData?.referralCode}
                         </div>
                         <button
                           onClick={copyLink}
                           className="w-14 h-full bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
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

             <section className="space-y-8">
                <div className="flex items-center justify-between">
                   <h2 className="text-sm font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-3">
                      <History size={16} />
                      Referral History
                   </h2>
                </div>

                <div className="space-y-4">
                   {loading ? (
                     [1,2,3].map(i => <div key={i} className="h-20 bg-surface rounded-2xl animate-pulse" />)
                   ) : referrals.length > 0 ? (
                     referrals.map(ref => (
                       <div key={ref.id} className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-all">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-text-tertiary">
                                <Users size={18} />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white uppercase tracking-tight">{ref.refereeUsername || 'New User'}</p>
                                <p className="text-[10px] font-mono text-white/20 mt-0.5 uppercase">Joined {ref.createdAt?.toDate?.() ? (ref.createdAt?.toDate?.()?.toLocaleDateString() || "N/A") : 'N/A'}</p>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className={cn(
                               "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest border",
                               ref.status === 'REWARDED' ? "bg-success/10 text-success border-success/20" : "bg-white/5 text-white/20 border-white/10"
                             )}>
                                {ref.status}
                             </span>
                          </div>
                       </div>
                     ))
                   ) : (
                     <div className="py-20 text-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
                        <Users size={40} className="mx-auto text-white/5 mb-4" />
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
                     <p className="text-2xl font-mono font-bold text-white">{stat.value}</p>
                  </Card>
                ))}
             </section>

             <Card className="p-8 space-y-8 bg-surface-bright/30 border-white/5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                   <TrendingUp size={14} />
                   Referral Performance
                </h3>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                         <span className="text-text-tertiary">Progress to Tier 2</span>
                         <span className="text-white">{referrals.length} / 10</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <div className="h-full bg-accent w-[30%] shadow-[0_0_10px_rgba(0,210,255,0.3)]" />
                      </div>
                   </div>

                   <div className="pt-6 border-t border-white/5 space-y-4">
                      {[
                        { label: 'Referral Bonus', value: '50 PTS' },
                        { label: 'Task Share', value: '5%' },
                        { label: 'Multiplier', value: '1.0x' },
                      ].map((rule, i) => (
                        <div key={i} className="flex justify-between items-center">
                           <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{rule.label}</span>
                           <span className="text-[10px] font-mono font-bold text-white">{rule.value}</span>
                        </div>
                      ))}
                   </div>
                </div>
             </Card>

             <div className="p-8 bg-white/[0.01] border border-white/5 rounded-[2rem] space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                   <CheckCircle2 size={14} />
                   Verification Rules
                </h3>
                <ul className="space-y-4">
                   {[
                     'Invitee must verify their email address.',
                     'Invitee must complete at least 1 campaign.',
                     'Rewards are distributed within 24 hours.',
                     'Inactive accounts (30d) do not generate rewards.'
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
    </MainLayout>
  );
};

export default Referrals;
