import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  TrendingUp,
  Clock,
  Activity as ActivityIcon,
  Target,
  LayoutGrid,
  BarChart3,
  CreditCard,
  UserPlus,
  ChevronRight,
  Flame,
  Wallet as WalletIcon,
  CheckCircle2,
  X,
  Calendar,
  TrendingDown,
  Gift,
  MousePointer2,
  Trophy,
  ArrowUpRight,
  Layers,
  Sparkles,
  ShieldCheck,
  Star,
  ArrowRight,
  Bell,
  Play,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { formatUSD } from '../utils/finance';
import { getXpProgress, getLevelTier } from '../utils/progression';
import OnboardingOverlay from '../components/OnboardingOverlay';
import AnimatedNumber from '../components/ui/AnimatedNumber';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Statistics } from '../engines/statistics/StatisticsEngine';

// ─── Sub-components ──────────────────────────────────────────────────────────

const SkeletonPulse: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('animate-pulse bg-surface-bright rounded-2xl', className)} />
);

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  trend?: { dir: 'up' | 'down'; label: string };
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, accent = 'primary', trend }) => (
  <div className={cn(
    'relative flex flex-col justify-between p-6 rounded-2xl border bg-surface overflow-hidden group transition-all duration-300 hover:border-border-bright min-h-[130px]',
    accent === 'primary' ? 'border-primary/20 bg-primary/[0.03]' : 'border-border'
  )}>
    {accent === 'primary' && (
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all duration-700 pointer-events-none" />
    )}
    <div className="flex items-start justify-between relative z-10">
      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.18em]">{label}</span>
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center border text-[14px]',
        accent === 'primary'
          ? 'bg-primary/10 border-primary/20 text-primary'
          : 'bg-surface-bright border-border text-text-tertiary'
      )}>
        {icon}
      </div>
    </div>
    <div className="relative z-10 space-y-0.5">
      <div className="text-2xl font-bold tracking-tight text-text-primary">{value}</div>
      {sub && <p className="text-[10px] text-text-tertiary font-medium">{sub}</p>}
      {trend && (
        <div className={cn('flex items-center gap-1 mt-1', trend.dir === 'up' ? 'text-success' : 'text-danger')}>
          {trend.dir === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          <span className="text-[9px] font-bold uppercase tracking-widest">{trend.label}</span>
        </div>
      )}
    </div>
  </div>
);

interface ActivityItemProps {
  activity: any;
  onClick: () => void;
}
const ActivityItem: React.FC<ActivityItemProps> = ({ activity, onClick }) => {
  const isPositive = activity.points > 0;
  const getIcon = () => {
    if (activity.type.includes('prediction')) return <BarChart3 size={14} />;
    if (activity.type.includes('task')) return <Target size={14} />;
    if (activity.type.includes('referral')) return <UserPlus size={14} />;
    if (activity.type.includes('level')) return <TrendingUp size={14} />;
    if (activity.type.includes('withdrawal')) return <CreditCard size={14} />;
    if (activity.type.includes('offerwall')) return <Layers size={14} />;
    return <Zap size={14} />;
  };
  const timeStr = activity.timestamp?.toDate?.()
    ? activity.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-transparent hover:bg-surface-bright hover:border-border transition-all group text-left"
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center border shrink-0',
        isPositive ? 'bg-success/8 border-success/15 text-success' : 'bg-surface-bright border-border text-text-tertiary'
      )}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
          {activity.description}
        </p>
        <p className="text-[9px] text-text-tertiary mt-0.5 uppercase tracking-wide">{timeStr}</p>
      </div>
      <div className={cn(
        'text-[11px] font-bold shrink-0 tabular-nums',
        isPositive ? 'text-success' : 'text-text-tertiary'
      )}>
        {isPositive ? `+${activity.points.toLocaleString()}` : '—'}
      </div>
    </button>
  );
};

// ─── Earn Module Card ─────────────────────────────────────────────────────────
const MODULE_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; desc: string }> = {
  tasks:       { icon: <LayoutGrid size={18} />,  color: 'text-primary',     bg: 'bg-primary/8',     border: 'border-primary/20',     desc: 'Complete social & brand tasks' },
  predictions: { icon: <BarChart3 size={18} />,   color: 'text-violet-400',  bg: 'bg-violet-400/8',  border: 'border-violet-400/20',  desc: 'Trade market directions' },
  offerwalls:  { icon: <Layers size={18} />,       color: 'text-cyan-400',    bg: 'bg-cyan-400/8',    border: 'border-cyan-400/20',    desc: 'Install apps, take surveys' },
  referrals:   { icon: <UserPlus size={18} />,    color: 'text-emerald-400', bg: 'bg-emerald-400/8', border: 'border-emerald-400/20', desc: 'Invite friends, earn together' },
};

interface EarnModuleCardProps {
  title: string;
  slug: string;
  reward?: number;
  badge?: string;
  path: string;
}
const EarnModuleCard: React.FC<EarnModuleCardProps> = ({ title, slug, reward, badge, path }) => {
  const meta = MODULE_META[slug] || MODULE_META.tasks;
  return (
    <Link
      to={path}
      className={cn(
        'flex flex-col gap-4 p-5 rounded-2xl border bg-surface hover:bg-surface-bright transition-all duration-200 group',
        meta.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', meta.bg, meta.border, meta.color)}>
          {meta.icon}
        </div>
        {badge && (
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className={cn('text-sm font-bold tracking-tight group-hover:transition-colors', meta.color)}>{title}</h3>
        <p className="text-[11px] text-text-tertiary leading-snug">{meta.desc}</p>
      </div>
      {reward !== undefined && (
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-[10px] text-text-tertiary uppercase tracking-wide font-medium">Avg. Reward</span>
          <span className="text-[11px] font-bold text-text-primary tabular-nums">+{reward.toLocaleString()} PTS</span>
        </div>
      )}
    </Link>
  );
};

// ─── XP Progress Strip ─────────────────────────────────────────────────────���──
const XpProgressBar: React.FC<{ xp: number; level: number }> = ({ xp, level }) => {
  const prog = getXpProgress(xp);
  const tier = getLevelTier(level);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Level {level}</span>
          <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-surface-bright', tier.color, 'border-border')}>
            {tier.title}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-primary">{prog.progress}%</span>
      </div>
      <div className="h-1.5 bg-surface-bright rounded-full overflow-hidden border border-border">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${prog.progress}%` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] as const }}
          className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(94,106,210,0.5)]"
        />
      </div>
      <p className="text-[9px] text-text-tertiary font-medium tabular-nums">
        {xp.toLocaleString()} / {prog.nextLevelXp.toLocaleString()} XP
      </p>
    </div>
  );
};

// ─── Daily Streak Widget ──────────────────────────────────────────────────────
const StreakWidget: React.FC<{ streak: number; claimed: boolean; timeLeft: string }> = ({ streak, claimed, timeLeft }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  // Monday-first index of today (JS getDay(): 0=Sun..6=Sat -> Mon-first: 0=Mon..6=Sun).
  const todayIdx = (new Date().getDay() + 6) % 7;
  // Fill the last `streak` days ENDING on today, so the highlighted day matches the
  // real calendar weekday instead of always starting from Monday.
  const filledCount = Math.min(streak, 7);
  const isFilled = (i: number) => i <= todayIdx && i > todayIdx - filledCount;
  return (
    <div className={cn(
      'flex flex-col gap-4 p-5 rounded-2xl border transition-all',
      claimed ? 'border-success/20 bg-success/[0.03]' : 'border-border bg-surface'
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Daily Streak</span>
          <div className="flex items-center gap-2">
            <Flame className={cn('w-5 h-5', streak > 0 ? 'text-orange-500' : 'text-text-tertiary')} />
            <span className="text-xl font-bold tracking-tight text-text-primary">{streak} days</span>
          </div>
        </div>
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center border text-sm',
          claimed ? 'bg-success/10 border-success/20 text-success' : 'bg-surface-bright border-border text-text-tertiary'
        )}>
          {claimed ? <CheckCircle2 size={16} /> : <Gift size={16} />}
        </div>
      </div>
      <div className="flex gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn(
              'w-full h-1.5 rounded-full transition-all',
              isFilled(i) ? 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.4)]' : 'bg-surface-bright'
            )} />
            <span className={cn(
              'text-[8px] font-bold uppercase',
              i === todayIdx ? 'text-orange-500' : 'text-text-tertiary'
            )}>{d}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-text-tertiary">
          <Clock size={10} />
          <span className="text-[9px] font-medium">Resets in {timeLeft}</span>
        </div>
        {claimed && (
          <span className="text-[9px] font-bold text-success uppercase tracking-widest">Claimed</span>
        )}
      </div>
    </div>
  );
};

// ─── Pending Review Item ──────────────────────────────────────────────────────
const PendingItem: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/10">
    <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center text-warning border border-warning/15">
      <Clock size={13} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-text-primary truncate">{label}</p>
      <p className="text-[9px] text-warning uppercase tracking-widest font-bold mt-0.5">Under Review</p>
    </div>
    <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
  </div>
);

// ─── Discovery Feed Item ──────────────────────────────────────────────────────
const DiscoveryItem: React.FC<{ item: any; onClick: () => void }> = ({ item, onClick }) => {
  const getIcon = () => {
    if (item.category === 'PREDICTION') return <BarChart3 size={16} />;
    if (item.category === 'REFERRAL') return <UserPlus size={16} />;
    if (item.type === 'MISSION') return <Trophy size={16} />;
    if (item.type === 'CAMPAIGN') return <Star size={16} />;
    return <Target size={16} />;
  };
  const accent = item.type === 'CAMPAIGN' ? 'text-primary bg-primary/8 border-primary/20'
    : item.type === 'MISSION' ? 'text-amber-400 bg-amber-400/8 border-amber-400/20'
    : 'text-text-tertiary bg-surface-bright border-border';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-surface hover:bg-surface-bright hover:border-border-bright transition-all group text-left"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border shrink-0', accent)}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[12px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-text-tertiary uppercase tracking-wide font-medium">
            {item.category || item.type}
          </span>
          {item.type === 'MISSION' && item.target > 0 && (
            <>
              <span className="text-text-tertiary/40">·</span>
              <span className="text-[9px] text-text-tertiary">{Math.round((item.progress / item.target) * 100)}% done</span>
            </>
          )}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <span className="text-[12px] font-bold text-text-primary tabular-nums">+{item.reward.toLocaleString()}</span>
        <span className="text-[9px] text-text-tertiary font-medium">PTS</span>
      </div>
      <ChevronRight size={14} className="text-text-tertiary/50 group-hover:text-primary shrink-0 transition-colors" />
    </button>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const { activities, tasks, campaigns, loading, getTaskStatus, subtasks } = useTasks();
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [liveStats, setLiveStats] = useState<any>(null);

  // Subscribe to real-time authoritative Statistics ledger calculations
  useEffect(() => {
    if (!currentUser) return;
    Statistics.initializeForUser(currentUser.uid, db);
    const unsubscribe = Statistics.subscribe(currentUser.uid, (stats) => {
      setLiveStats(stats);
    });
    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (userData && userData.onboardingCompleted === false) setShowOnboarding(true);
  }, [userData]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const diff = nextMidnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { onboardingCompleted: true });
      } catch (err) {
        console.error('Failed to save onboarding state:', err);
      }
    }
  };

  const activeCampaigns = useMemo(() => (campaigns || []).filter(c => c.active), [campaigns]);
  const pendingSubtasks = useMemo(() => {
    const activeTaskIds = new Set(tasks.map(t => t.id));
    return subtasks.filter(s => s.validationState === 'PENDING' && activeTaskIds.has(s.taskId));
  }, [subtasks, tasks]);

  // SYNC VERIFICATION (Phase 18): Ensure all surfaces stay in sync
  useEffect(() => {
    if (tasks.length > 0) {
      const inactiveTasks = tasks.filter(t => t.active === false);
      if (inactiveTasks.length > 0) {
        console.warn("[v0] SYNC DEFECT: Dashboard received", inactiveTasks.length, "inactive tasks (should be filtered by TaskContext)");
      }
    }
    if (activities.length > 0 && activities.some(a => !a.timestamp)) {
      console.warn("[v0] SYNC DEFECT: Dashboard activities missing timestamps");
    }
  }, [tasks, activities]);

  const isClaimedToday = useMemo(() => {
    if (!userData?.lastRewardDate) return false;
    const last = userData.lastRewardDate.toDate();
    const now = new Date();
    return last.getFullYear() === now.getFullYear()
      && last.getMonth() === now.getMonth()
      && last.getDate() === now.getDate();
  }, [userData?.lastRewardDate]);

  const discoveredTasks = useMemo(() => {
    const rail: any[] = [];
    // Defensive: Only include featured campaigns that are active
    activeCampaigns.filter(c => c.featured && c.active).forEach(c => {
      rail.push({ id: `campaign_${c.id}`, originalId: c.id, type: 'CAMPAIGN', title: c.name, category: c.category, reward: c.totalPrizePool || 0, description: c.description, priority: 100 });
    });
    // Defensive: Double-check tasks are active before adding (guards against TaskContext sync issues)
    tasks.filter(t => t.active === true && getTaskStatus(t).status === 'available').slice(0, 8).forEach(t => {
      const campaign = activeCampaigns.find(c => c.id === t.campaignId);
      rail.push({ id: `task_${t.id}`, originalId: t.id, campaignId: t.campaignId, campaignName: campaign?.name, type: 'TASK', title: t.title, category: t.category, reward: t.rewardAmount, xp: t.xpReward, instructions: t.instructions, verificationType: t.verificationType, priority: t.rewardAmount > 500 ? 90 : 70 });
    });
    return rail.sort((a, b) => b.priority - a.priority);
  }, [activeCampaigns, tasks, getTaskStatus]);

  const handleItemClick = (item: any) => {
    setSelectedTask(item);
  };

  const navigateToItem = (item: any) => {
    if (item.category === 'PREDICTION') navigate('/predictions');
    else if (item.category === 'REFERRAL') navigate('/referrals');
    else navigate('/tasks');
    setSelectedTask(null);
  };

  // ─── Loading Skeleton ────────────────────────────────────────────────────
  if (loading) return (
    <div className="pt-24 md:pt-28 pb-32 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-4 w-24" />
          <SkeletonPulse className="h-9 w-72" />
        </div>
        <SkeletonPulse className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <SkeletonPulse key={i} className="h-32" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <SkeletonPulse className="lg:col-span-8 h-96" />
        <SkeletonPulse className="lg:col-span-4 h-96" />
      </div>
    </div>
  );

  if (!userData && !loading) return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
          <ActivityIcon size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">Session Error</h2>
          <p className="text-sm text-text-secondary mt-2">Could not load your profile. Please reload.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-bright transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );

  const points = liveStats ? liveStats.currentPoints : (userData?.points || 0);
  const xp = liveStats ? liveStats.totalXP : (userData?.xp || 0);
  const level = liveStats ? liveStats.currentLevel : (userData?.level || 1);
  const streak = liveStats ? liveStats.currentStreak : (userData?.streak || 0);
  const tasksCompleted = liveStats ? liveStats.tasksCompleted : (userData?.stats?.tasksCompleted || 0);
  const referralsCount = liveStats ? liveStats.referralsCount : (userData?.stats?.referralsCount || 0);
  const predictionsCount = liveStats ? liveStats.predictionsCount : (userData?.stats?.predictionsCount || 0);
  const totalEarnings = liveStats ? liveStats.totalPointsEarned : (userData?.stats?.totalEarnings || 0);

  const stats = {
    tasksCompleted,
    referralsCount,
    predictionsCount,
    totalEarnings
  };

  const xpProg = getXpProgress(xp);

  return (
    <>
      <AnimatePresence>
        {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      </AnimatePresence>

      <div className="pt-20 md:pt-24 pb-28 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">

        {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
        >
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
              Welcome back, <span className="text-primary">{userData?.username}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { label: 'Tasks', path: '/tasks', icon: <LayoutGrid size={13} /> },
              { label: 'Offerwalls', path: '/offerwalls', icon: <Layers size={13} /> },
              { label: 'Wallet', path: '/wallet', icon: <CreditCard size={13} /> },
            ].map(a => (
              <Link
                key={a.label}
                to={a.path}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-[11px] font-bold text-text-secondary hover:bg-surface-bright hover:border-border-bright hover:text-text-primary transition-all"
              >
                {a.icon} {a.label}
              </Link>
            ))}
            <Link
              to="/notifications"
              className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-text-tertiary hover:bg-surface-bright hover:border-border-bright hover:text-text-primary transition-all"
            >
              <Bell size={14} />
            </Link>
          </div>
        </motion.div>

        {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6"
        >
          <StatCard
            label="Pulse Balance"
            value={
              <div className="flex items-baseline gap-1.5">
                <AnimatedNumber value={points} />
                <span className="text-[10px] font-mono font-bold text-primary uppercase">PTS</span>
              </div>
            }
            sub={`≈ ${formatUSD(points / 1000)} USD`}
            icon={<WalletIcon size={14} />}
            accent="primary"
          />
          <StatCard
            label="XP Level"
            value={
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight">{level}</span>
                <span className={cn('text-[9px] font-bold uppercase tracking-widest', getLevelTier(level).color)}>
                  {getLevelTier(level).title}
                </span>
              </div>
            }
            sub={`${xpProg.progress}% to Level ${level + 1}`}
            icon={<TrendingUp size={14} />}
          />
          <StatCard
            label="Daily Streak"
            value={<span className="text-2xl font-bold tracking-tight">{streak}</span>}
            sub="consecutive days"
            icon={<Flame size={14} />}
          />
          <StatCard
            label="Pending Review"
            value={<span className="text-2xl font-bold tracking-tight">{pendingSubtasks.length}</span>}
            sub={pendingSubtasks.length === 1 ? 'submission' : 'submissions'}
            icon={<Clock size={14} />}
          />
        </motion.div>

        {/* ── MAIN GRID ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">

          {/* ── LEFT COLUMN (8 cols) ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-8 space-y-5"
          >
            {/* Earn Modules */}
            <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  <h2 className="text-sm font-bold tracking-tight text-text-primary">Earn</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <EarnModuleCard title="Tasks" slug="tasks" path="/tasks" reward={250} badge="Live" />
                <EarnModuleCard title="Predictions" slug="predictions" path="/predictions" reward={500} />
                <EarnModuleCard title="Offerwalls" slug="offerwalls" path="/offerwalls" reward={1000} badge="New" />
                <EarnModuleCard title="Referrals" slug="referrals" path="/referrals" reward={300} />
              </div>
            </div>

            {/* Opportunities Feed */}
            <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play size={14} className="text-primary" />
                  <h2 className="text-sm font-bold tracking-tight text-text-primary">Opportunities</h2>
                  <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest bg-surface-bright border border-border px-2 py-0.5 rounded-md">
                    {discoveredTasks.length}
                  </span>
                </div>
                <Link
                  to="/tasks"
                  className="flex items-center gap-1.5 text-[10px] font-bold text-text-tertiary hover:text-primary transition-colors uppercase tracking-widest"
                >
                  View All <ArrowRight size={11} />
                </Link>
              </div>

              {discoveredTasks.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary">
                    <Target size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">All caught up</p>
                    <p className="text-xs text-text-tertiary mt-1">New tasks appear here automatically.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {discoveredTasks.slice(0, 8).map(item => (
                    <DiscoveryItem key={item.id} item={item} onClick={() => handleItemClick(item)} />
                  ))}
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-success" />
                  <h3 className="text-sm font-bold text-text-primary">Your Progress</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Tasks Done', value: stats?.tasksCompleted || 0 },
                    { label: 'Referrals', value: stats?.referralsCount || 0 },
                    { label: 'Predictions', value: stats?.predictionsCount || 0 },
                    { label: 'Total Earned', value: `${((stats?.totalEarnings || 0)).toLocaleString()} PTS` },
                  ].map(s => (
                    <div key={s.label} className="p-3 rounded-xl bg-surface-bright border border-border space-y-1">
                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{s.label}</p>
                      <p className="text-base font-bold text-text-primary tabular-nums">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor size={14} className="text-primary" />
                    <h3 className="text-sm font-bold text-text-primary">XP Progression</h3>
                  </div>
                </div>
                <XpProgressBar xp={xp} level={level} />
                <div className="pt-1 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-tertiary font-medium">Next milestone</span>
                    <span className="text-[10px] font-bold text-text-primary">Level {level + 1}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Validations */}
            {pendingSubtasks.length > 0 && (
              <div className="p-5 rounded-2xl border border-warning/15 bg-warning/[0.02] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-warning" />
                    <h3 className="text-sm font-bold text-text-primary">Pending Review</h3>
                    <span className="text-[9px] font-bold text-warning uppercase tracking-widest bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-md">
                      {pendingSubtasks.length}
                    </span>
                  </div>
                  <Link to="/tasks" className="text-[10px] font-bold text-text-tertiary hover:text-warning transition-colors uppercase tracking-widest">
                    View All
                  </Link>
                </div>
                <div className="space-y-2">
                  {pendingSubtasks.slice(0, 4).map(s => (
                    <PendingItem key={s.id} label={s.metadata?.taskTitle || 'Campaign Submission'} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* ── RIGHT COLUMN (4 cols) ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="lg:col-span-4 space-y-5"
          >
            {/* Streak Card */}
            <StreakWidget streak={streak} claimed={isClaimedToday} timeLeft={timeLeft} />

            {/* Activity Feed */}
            <div className="p-5 rounded-2xl border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ActivityIcon size={14} className="text-primary" />
                  <h3 className="text-sm font-bold text-text-primary">Activity</h3>
                </div>
                <Link
                  to="/notifications"
                  state={{ tab: 'ACTIVITY' }}
                  className="text-[10px] font-bold text-text-tertiary hover:text-primary transition-colors uppercase tracking-widest"
                >
                  See All
                </Link>
              </div>

              {activities.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary">
                    <ActivityIcon size={16} />
                  </div>
                  <p className="text-xs text-text-tertiary">No activity yet</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {activities.slice(0, 8).map(a => (
                    <ActivityItem key={a.id} activity={a} onClick={() => setSelectedActivity(a)} />
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="p-5 rounded-2xl border border-border bg-surface space-y-3">
              <h3 className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Quick Actions</h3>
              <div className="space-y-1.5">
                {[
                  { label: 'Browse All Tasks', path: '/tasks', icon: <LayoutGrid size={13} /> },
                  { label: 'Make a Prediction', path: '/predictions', icon: <BarChart3 size={13} /> },
                  { label: 'Invite a Friend', path: '/referrals', icon: <UserPlus size={13} /> },
                  { label: 'Withdraw Earnings', path: '/wallet', icon: <CreditCard size={13} /> },
                ].map(a => (
                  <Link
                    key={a.label}
                    to={a.path}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface-bright border border-transparent hover:border-border group transition-all"
                  >
                    <div className="flex items-center gap-2.5 text-[12px] font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                      <span className="text-text-tertiary group-hover:text-primary transition-colors">{a.icon}</span>
                      {a.label}
                    </div>
                    <ArrowRight size={12} className="text-text-tertiary/40 group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── ACTIVITY DETAIL MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedActivity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
              onClick={() => setSelectedActivity(null)}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-surface border border-border-bright rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <ActivityIcon size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">Activity Log</p>
                    <p className="text-[11px] font-bold text-text-primary uppercase tracking-tight">
                      {selectedActivity.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-bright text-text-tertiary transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="flex items-center gap-2 text-text-tertiary text-[10px]">
                  <Calendar size={11} className="text-primary/40" />
                  <span>
                    {selectedActivity.timestamp?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span>·</span>
                  <Clock size={11} className="text-primary/40" />
                  <span>
                    {selectedActivity.timestamp?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-base font-bold text-text-primary tracking-tight">{selectedActivity.description}</p>

                <div className="rounded-xl border border-border bg-surface-bright divide-y divide-border overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Reward</span>
                    <span className={cn('text-base font-bold tabular-nums', selectedActivity.points >= 0 ? 'text-success' : 'text-danger')}>
                      {selectedActivity.points > 0 ? '+' : ''}{selectedActivity.points.toLocaleString()} PTS
                    </span>
                  </div>
                  {selectedActivity.metadata?.symbol && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Asset</span>
                      <span className="text-sm font-bold text-text-primary">{selectedActivity.metadata.symbol} / USD</span>
                    </div>
                  )}
                  {selectedActivity.metadata?.direction && (
                    <div className="flex justify-between items-center px-4 py-3">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Direction</span>
                      <div className={cn('flex items-center gap-1.5', selectedActivity.metadata.direction === 'UP' ? 'text-success' : 'text-danger')}>
                        {selectedActivity.metadata.direction === 'UP' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        <span className="text-sm font-bold">{selectedActivity.metadata.direction}</span>
                      </div>
                    </div>
                  )}
                  {selectedActivity.metadata?.taskName && (
                    <div className="flex justify-between items-start gap-4 px-4 py-3">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest whitespace-nowrap">Task</span>
                      <span className="text-[11px] font-semibold text-text-primary text-right">{selectedActivity.metadata.taskName}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Status</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                      <span className="text-[11px] font-bold text-success">Confirmed</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium text-text-tertiary/50 font-mono truncate max-w-[160px]">
                    {selectedActivity.referenceId || selectedActivity.id}
                  </span>
                  {(selectedActivity.type.includes('prediction') || selectedActivity.type.includes('task') || selectedActivity.type.includes('referral') || selectedActivity.type.includes('withdrawal')) && (
                    <button
                      onClick={() => {
                        const t = selectedActivity.type as string;
                        if (t.includes('prediction')) navigate('/predictions', { state: { view: 'PORTFOLIO', highlightId: selectedActivity.referenceId } });
                        else if (t.includes('task')) navigate('/tasks', { state: { view: 'COMPLETED', highlightId: selectedActivity.referenceId } });
                        else if (t.includes('referral')) navigate('/referrals');
                        else if (t.includes('withdrawal')) navigate('/wallet');
                        setSelectedActivity(null);
                      }}
                      className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary-bright transition-colors"
                    >
                      View Source <ArrowUpRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── TASK DETAIL MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
              onClick={() => setSelectedTask(null)}
            />
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-surface border border-border-bright rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    {selectedTask.type === 'MISSION' ? <Trophy size={16} /> : <Target size={16} />}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">
                      {selectedTask.campaignName || 'Platform Objective'}
                    </p>
                    <p className="text-[11px] font-bold text-text-primary uppercase tracking-tight">{selectedTask.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-bright text-text-tertiary transition-all"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <h2 className="text-lg font-bold text-text-primary tracking-tight">{selectedTask.title}</h2>
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                    {selectedTask.description || selectedTask.instructions || 'Complete this objective to earn your reward.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-surface-bright border border-border space-y-1">
                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Points</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-text-primary tabular-nums">{selectedTask.reward.toLocaleString()}</span>
                      <span className="text-[9px] text-text-tertiary font-bold">PTS</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-bright border border-border space-y-1">
                    <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">XP</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-primary tabular-nums">{(selectedTask.xp || 100).toLocaleString()}</span>
                      <span className="text-[9px] text-text-tertiary font-bold">XP</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-surface-bright border border-border">
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Verification</span>
                  <div className="flex items-center gap-1.5 text-success">
                    <MousePointer2 size={13} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">{selectedTask.verificationType || 'AUTOMATED'}</span>
                  </div>
                </div>

                {selectedTask.type === 'MISSION' && selectedTask.target > 0 && (
                  <div className="p-4 rounded-xl border border-border bg-surface-bright/60 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Progress</span>
                      <span className="text-[11px] font-bold text-primary tabular-nums">
                        {selectedTask.progress} / {selectedTask.target}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-bright rounded-full overflow-hidden border border-border">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(selectedTask.progress / selectedTask.target) * 100}%` }}
                        className="h-full bg-primary rounded-full"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => navigateToItem(selectedTask)}
                    className="w-full h-12 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-bright transition-colors flex items-center justify-center gap-2"
                  >
                    Continue <ArrowUpRight size={15} />
                  </button>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="w-full h-10 text-[11px] font-bold text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Dashboard;
