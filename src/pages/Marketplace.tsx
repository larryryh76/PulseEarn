import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Zap,
  TrendingUp,
  Clock,
  Activity,
  Target,
  LayoutGrid,
  BarChart3,
  CreditCard,
  UserPlus,
  ChevronRight,
  Flame,
  X,
  Gift,
  Trophy,
  Layers,
  Sparkles,
  ShieldCheck,
  Star,
  ArrowRight,
  Play,
  Monitor,
  Search,
  ExternalLink,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { safeFetch } from '../utils/api';
import { auth } from '../firebase/config';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  id: string;
  name: string;
  affiliateId: string;
  callbackUrl: string;
  minimumReward: number;
  maximumReward: number;
  rewardMultiplier: number;
  launchUrl: string | null;
  embeddable: boolean;
}

interface Opportunity {
  id: string;
  source: 'internal' | 'provider';
  providerId?: string;
  providerName?: string;
  title: string;
  description: string;
  rewardAmount: number;
  xpReward: number;
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'elite';
  category: string;
  requirements: string;
  verificationType: string;
  actionUrl?: string | null;
  status: 'available' | 'completed' | 'pending' | 'rejected' | 'cooldown';
  isFeatured?: boolean;
}

interface MergedHistoryItem {
  id: string;
  source: 'internal' | 'provider';
  title: string;
  providerName?: string;
  points: number;
  xp: number;
  timestamp: Date;
  status: string;
}

// ─── Category Constants ───────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'featured', label: 'Featured', icon: Sparkles },
  { id: 'daily', label: 'Daily', icon: Flame },
  { id: 'surveys', label: 'Surveys', icon: BarChart3 },
  { id: 'games', label: 'Games', icon: Trophy },
  { id: 'apps', label: 'Apps', icon: Monitor },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'cashback', label: 'Cashback & Shopping', icon: CreditCard },
  { id: 'learn', label: 'Learn', icon: Target },
  { id: 'community', label: 'Community', icon: UserPlus },
  { id: 'referrals', label: 'Referrals', icon: UserPlus },
  { id: 'predictions', label: 'Predictions', icon: TrendingUp },
  { id: 'seasonal', label: 'Seasonal', icon: Gift },
  { id: 'sponsored', label: 'Sponsored', icon: Star },
] as const;

const Marketplace: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const { tasks, getTaskStatus, loading: tasksLoading, unifiedHistory } = useTasks();

  const [activeTab, setActiveTab] = useState<'browse' | 'history'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('featured');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Provider opportunities
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState<boolean>(false);

  // Unified History
  const [externalHistory, setExternalHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Click tracking for "Continue Where You Left Off"
  const [clickHistory, setClickHistory] = useState<any[]>([]);

  // Task execution states (internal tasks)
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [proof, setProof] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Click History from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pulseearn-marketplace-clicks');
      if (stored) {
        setClickHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load click history:', err);
    }
  }, []);

  // Tracking clicked opportunities (Continue Earning)
  const trackClick = (opp: Opportunity) => {
    const nextClicks = [
      { id: opp.id, title: opp.title, category: opp.category, rewardAmount: opp.rewardAmount, timestamp: new Date().getTime(), source: opp.source, providerId: opp.providerId },
      ...clickHistory.filter(c => c.id !== opp.id)
    ].slice(0, 5); // keep last 5
    setClickHistory(nextClicks);
    try {
      localStorage.setItem('pulseearn-marketplace-clicks', JSON.stringify(nextClicks));
    } catch (err) {
      console.error('Failed to save click history:', err);
    }
  };

  // Load active offerwall providers (as inventory/infrastructure)
  const loadProviders = useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/user-providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) {
        setProviders(res.providers || []);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  }, [currentUser]);

  // Load external reward history (offerwall)
  const loadExternalHistory = useCallback(async () => {
    if (!currentUser) return;
    setHistoryLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/my-rewards?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) {
        setExternalHistory(res.rewards || []);
      }
    } catch (err) {
      console.error('Failed to load external history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProviders();
    loadExternalHistory();
  }, [loadProviders, loadExternalHistory]);

  // ─── Build Dynamic Opportunities from Providers ──────────────────────────────
  // When providers are enabled, we transform them into beautiful specific opportunities
  // mapping directly to Marketplace activities.
  const providerOpportunities = useMemo<Opportunity[]>(() => {
    const opps: Opportunity[] = [];
    providers.forEach(p => {
      const pid = p.id;
      if (pid === 'cpxresearch') {
        opps.push({
          id: `opp_cpx_surveys`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'High-Paying Consumer Surveys',
          description: 'Share your opinion on finance, tech, and lifestyle to earn premium rewards.',
          rewardAmount: Math.round(1450 * p.rewardMultiplier),
          xpReward: 145,
          estimatedTime: '10 min',
          difficulty: 'easy',
          category: 'surveys',
          requirements: 'Complete survey fully and qualify',
          verificationType: 'Instant Callback',
          status: 'available',
          isFeatured: true
        });
        opps.push({
          id: `opp_cpx_polls`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Opinions & Short Polls',
          description: 'Take part in quick market research polls with immediate payouts.',
          rewardAmount: Math.round(550 * p.rewardMultiplier),
          xpReward: 55,
          estimatedTime: '4 min',
          difficulty: 'easy',
          category: 'surveys',
          requirements: 'Answer all qualifying questions',
          verificationType: 'Instant Callback',
          status: 'available'
        });
      } else if (pid === 'bitlabs') {
        opps.push({
          id: `opp_bitlabs_premium`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Premium Financial Research Panel',
          description: 'Access exclusive high-reward surveys from top-tier corporate research panels.',
          rewardAmount: Math.round(2800 * p.rewardMultiplier),
          xpReward: 280,
          estimatedTime: '15 min',
          difficulty: 'medium',
          category: 'surveys',
          requirements: 'Qualify and complete panel completely',
          verificationType: 'Instant Callback',
          status: 'available',
          isFeatured: true
        });
      } else if (pid === 'lootably') {
        opps.push({
          id: `opp_lootably_monopoly`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Install Monopoly GO & Reach Board 5',
          description: 'Download the smash-hit board game and unlock board 5 to claim your grand prize.',
          rewardAmount: Math.round(6800 * p.rewardMultiplier),
          xpReward: 680,
          estimatedTime: 'Varies',
          difficulty: 'medium',
          category: 'games',
          requirements: 'New users only. Reach Board 5 in Monopoly GO',
          verificationType: 'Instant Callback',
          status: 'available',
          isFeatured: true
        });
        opps.push({
          id: `opp_lootably_casual`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Play Casual & Puzzle Games',
          description: 'Explore a catalogue of thousands of fun, puzzle, and match-3 games.',
          rewardAmount: Math.round(1800 * p.rewardMultiplier),
          xpReward: 180,
          estimatedTime: 'Varies',
          difficulty: 'easy',
          category: 'games',
          requirements: 'Install and reach target levels',
          verificationType: 'Instant Callback',
          status: 'available'
        });
        opps.push({
          id: `opp_lootably_finance`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Try Trending Apps',
          description: 'Download utility, fintech, or productivity apps and perform a basic action.',
          rewardAmount: Math.round(2500 * p.rewardMultiplier),
          xpReward: 250,
          estimatedTime: '5 min',
          difficulty: 'easy',
          category: 'apps',
          requirements: 'Install and register a new account',
          verificationType: 'Instant Callback',
          status: 'available'
        });
      } else if (pid === 'timewall') {
        opps.push({
          id: `opp_timewall_videos`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Watch Branded Clips & Videos',
          description: 'Earn rewards for watching sponsored video contents and educational clips.',
          rewardAmount: Math.round(240 * p.rewardMultiplier),
          xpReward: 24,
          estimatedTime: '3 min',
          difficulty: 'easy',
          category: 'videos',
          requirements: 'Watch fully without closing tab',
          verificationType: 'Instant Callback',
          status: 'available'
        });
        opps.push({
          id: `opp_timewall_tasks`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Complete Micro-Tasks & timed Clicks',
          description: 'Follow simple instructions to browse specified websites, read articles, or solve short puzzles.',
          rewardAmount: Math.round(620 * p.rewardMultiplier),
          xpReward: 62,
          estimatedTime: '2 min',
          difficulty: 'easy',
          category: 'daily',
          requirements: 'Perform simple click steps and verify',
          verificationType: 'Instant Callback',
          status: 'available'
        });
      } else if (pid === 'adgem') {
        opps.push({
          id: `opp_adgem_rpg`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'RPG Level Progression Challenge',
          description: 'Download hot RPG mobile titles, progress your characters, and defeat bosses.',
          rewardAmount: Math.round(12500 * p.rewardMultiplier),
          xpReward: 1250,
          estimatedTime: 'Varies',
          difficulty: 'elite',
          category: 'games',
          requirements: 'Achieve required character level within 14 days',
          verificationType: 'Instant Callback',
          status: 'available',
          isFeatured: true
        });
        opps.push({
          id: `opp_adgem_apps`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Explore Brand New Utility Apps',
          description: 'Try out new web browsers, storage clean utilities, or VPN applications.',
          rewardAmount: Math.round(1100 * p.rewardMultiplier),
          xpReward: 110,
          estimatedTime: '5 min',
          difficulty: 'easy',
          category: 'apps',
          requirements: 'Open application and perform a single session search',
          verificationType: 'Instant Callback',
          status: 'available'
        });
      } else if (pid === 'offertoro') {
        opps.push({
          id: `opp_offertoro_trials`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Shopping Cashback & Free Trials',
          description: 'Explore cashback rebates on services, subscription trials, and finance accounts.',
          rewardAmount: Math.round(4800 * p.rewardMultiplier),
          xpReward: 480,
          estimatedTime: '10 min',
          difficulty: 'medium',
          category: 'cashback',
          requirements: 'Start free trial with a valid card',
          verificationType: 'Instant Callback',
          status: 'available'
        });
      }
    });
    return opps;
  }, [providers]);

  // ─── Build Dynamic Internal Opportunities ────────────────────────────────────
  const internalOpportunities = useMemo<Opportunity[]>(() => {
    return tasks.map(t => {
      // Map database category strings to our UI category slug
      let category = 'sponsored';
      const tc = (t.category || '').toUpperCase();
      const tt = (t.type || '').toUpperCase();

      if (tc === 'SURVEY') category = 'surveys';
      else if (tc === 'PREDICTION' || tt === 'PREDICTION') category = 'predictions';
      else if (tc === 'REFERRAL' || tt === 'REFERRAL') category = 'referrals';
      else if (tc === 'COMMUNITY' || tc === 'SOCIAL') category = 'community';
      else if (tc === 'EDUCATION') category = 'learn';
      else if (tc === 'EVENTS') category = 'seasonal';
      else if (tc === 'SPONSORED') category = 'sponsored';
      else if (tt === 'STREAK' || tt === 'DAILY') category = 'daily';

      const statusInfo = getTaskStatus(t);

      return {
        id: t.id,
        source: 'internal',
        title: t.title,
        description: t.description || 'Complete this objective directly inside PulseEarn.',
        rewardAmount: t.rewardAmount,
        xpReward: t.xpReward,
        estimatedTime: t.estimatedTime || '3 min',
        difficulty: (t.minLevel && t.minLevel > 5 ? 'medium' : 'easy') as any,
        category,
        requirements: t.proofRequirements || 'Submit required execution proof',
        verificationType: t.verificationType || 'automated',
        actionUrl: t.actionUrl,
        status: statusInfo.status,
        isFeatured: t.rewardAmount > 500 || t.visibility === 'PUBLIC'
      };
    });
  }, [tasks, getTaskStatus]);

  // ─── Combine and Filter Opportunities ────────────────────────────────────────
  const allOpportunities = useMemo<Opportunity[]>(() => {
    return [...internalOpportunities, ...providerOpportunities];
  }, [internalOpportunities, providerOpportunities]);

  const filteredOpportunities = useMemo(() => {
    return allOpportunities.filter(o => {
      // 1. Search term match
      const matchSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      // 2. Category match
      if (selectedCategory === 'featured') {
        return o.isFeatured;
      }
      return o.category === selectedCategory;
    });
  }, [allOpportunities, selectedCategory, searchTerm]);

  // ─── Intelligent Recommendation Engine Sections ──────────────────────────────
  const recommendations = useMemo(() => {
    // A: Highest Paying Today
    const highestPaying = [...allOpportunities]
      .sort((a, b) => b.rewardAmount - a.rewardAmount)
      .slice(0, 4);

    // B: Fastest Rewards (Automated internal tasks + short videos/surveys)
    const fastestRewards = [...allOpportunities]
      .filter(o => o.verificationType === 'automated' || o.estimatedTime === '2 min' || o.estimatedTime === '3 min')
      .slice(0, 4);

    // C: Trending Games (Offers under "games" category)
    const trendingGames = [...allOpportunities]
      .filter(o => o.category === 'games')
      .slice(0, 4);

    // D: Daily Picks (Check-in, short microtasks, daily poll)
    const dailyPicks = [...allOpportunities]
      .filter(o => o.category === 'daily' || o.category === 'learn')
      .slice(0, 4);

    // E: Continue Earning
    // Match clickHistory with currently live opportunities
    const continueEarning = clickHistory
      .map(c => allOpportunities.find(o => o.id === c.id))
      .filter(Boolean) as Opportunity[];

    return {
      highestPaying,
      fastestRewards,
      trendingGames,
      dailyPicks,
      continueEarning
    };
  }, [allOpportunities, clickHistory]);

  // ─── Unified History timeline ────────────────────────────────────────────────
  const mergedHistory = useMemo<MergedHistoryItem[]>(() => {
    const list: MergedHistoryItem[] = [];

    // Internal tasks history
    if (unifiedHistory && Array.isArray(unifiedHistory)) {
      unifiedHistory.forEach(h => {
        let ts = new Date();
        if (h.resolvedAt) {
          ts = h.resolvedAt.toDate ? h.resolvedAt.toDate() : new Date(h.resolvedAt);
        } else if (h.completedAt) {
          ts = h.completedAt.toDate ? h.completedAt.toDate() : new Date(h.completedAt);
        }
        list.push({
          id: h.id || h.claimId || `hist_int_${Math.random()}`,
          source: 'internal',
          title: h.taskTitle || h.title || 'Completed Task',
          points: h.rewardAmount || 0,
          xp: h.xpReward || 0,
          timestamp: ts,
          status: 'COMPLETED'
        });
      });
    }

    // External offerwall history
    if (externalHistory && Array.isArray(externalHistory)) {
      externalHistory.forEach(e => {
        let ts = new Date();
        if (e.createdAt) {
          ts = e.createdAt.seconds ? new Date(e.createdAt.seconds * 1000) : new Date(e.createdAt);
        }
        list.push({
          id: e.id || `hist_ext_${Math.random()}`,
          source: 'provider',
          title: e.offerName || 'Completed Offer',
          providerName: e.providerName || e.providerId,
          points: e.userPoints || 0,
          xp: Math.max(1, Math.round((e.userPoints || 0) / 10)),
          timestamp: ts,
          status: e.status || 'APPROVED'
        });
      });
    }

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [unifiedHistory, externalHistory]);

  // ─── Launch Opportunity Flow ───────────────────────────────────────────────
  const handleLaunch = async (opp: Opportunity) => {
    trackClick(opp);

    if (opp.source === 'internal') {
      // It is an internal PulseEarn task -> Open the complete task detail modal
      setSelectedTask(opp);
      setProof('');
      return;
    }

    // It is an external provider-backed opportunity -> fetch secure launch url
    if (!currentUser || !opp.providerId) {
      toast.error('Log in to launch opportunities');
      return;
    }

    const providerObj = providers.find(p => p.id === opp.providerId);
    if (!providerObj) {
      toast.error('Provider config unavailable');
      return;
    }

    const resolveToast = toast.loading(`Connecting securely with ${providerObj.name}...`);

    let newWindow: Window | null = null;
    if (!providerObj.embeddable) {
      // To bypass popup-blockers synchronously
      newWindow = window.open('', '_blank', 'noopener,noreferrer');
    }

    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch(`/api/offerwall/providers/${opp.providerId}/launch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.success && res.launchUrl) {
        toast.dismiss(resolveToast);
        if (res.embeddable) {
          setActiveProvider({ ...providerObj, launchUrl: res.launchUrl, embeddable: true });
        } else {
          if (newWindow && !newWindow.closed) {
            newWindow.location.href = res.launchUrl;
          } else {
            window.open(res.launchUrl, '_blank', 'noopener,noreferrer');
          }
          setActiveProvider({ ...providerObj, launchUrl: res.launchUrl, embeddable: false });
          setShowRedirectModal(true);
        }
      } else {
        if (newWindow && !newWindow.closed) newWindow.close();
        toast.error(res.message || 'Failed to authenticate secure session', { id: resolveToast });
      }
    } catch {
      if (newWindow && !newWindow.closed) newWindow.close();
      toast.error('Failed to communicate with provider adapter', { id: resolveToast });
    }
  };

  // ─── Submit Internal Task Proof ──────────────────────────────────────────────
  const handleInternalSubmit = async () => {
    if (!selectedTask) return;
    if (selectedTask.verificationType !== 'automated' && !proof.trim()) {
      return toast.error("Provide the required proof details.");
    }

    setIsSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const data = await safeFetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: selectedTask.id,
          proof: proof || 'AUTOMATED_VALIDATION'
        })
      });

      if (data.success) {
        toast.success(data.automated ? 'Objective Completed!' : 'Under Review! You will be notified shortly.');
        setSelectedTask(null);
        setProof('');
      } else {
        toast.error(data.message || data.error || 'Submission failed');
      }
    } catch {
      toast.error('System validation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifficultyStyle = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'bg-success/5 border-success/15 text-success';
      case 'medium':
        return 'bg-warning/5 border-warning/15 text-warning';
      case 'hard':
      case 'elite':
        return 'bg-danger/5 border-danger/15 text-danger';
      default:
        return 'bg-primary/5 border-primary/15 text-primary';
    }
  };

  return (
    <div className="min-h-screen bg-[#07070A] text-text-primary pt-24 pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

        {/* ─── Hero Header & Stats ─────────────────────────────────────────────── */}
        <div className="relative rounded-3xl border border-white/5 bg-gradient-to-br from-[#12121A] to-[#0A0A0F] overflow-hidden p-8 md:p-12">
          {/* Parallax soft background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={11} /> Unified Rewards Marketplace
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white uppercase italic leading-none">
                Ecosystem <br className="hidden sm:block" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary">
                  Marketplace
                </span>
              </h1>
              <p className="text-sm text-text-tertiary leading-relaxed">
                Welcome to the unified core of PulseEarn. Browse campaigns, participate in predictions, complete daily micro-tasks, play games, and finish surveys. Every action flows into one centralized points ecosystem instantly.
              </p>
            </div>

            {/* Quick Balance Widgets */}
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <div className="p-5 rounded-2xl bg-surface border border-white/5 space-y-1 min-w-[150px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Central Balance</p>
                <p className="text-2xl font-black text-white tabular-nums">
                  {(userData?.points ?? 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-text-tertiary uppercase">PTS</p>
              </div>
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15 space-y-1 min-w-[150px]">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary">Progression</p>
                <p className="text-2xl font-black text-primary tabular-nums">
                  Lvl {userData?.level ?? 1}
                </p>
                <p className="text-[9px] text-text-tertiary uppercase">
                  {(userData?.xp ?? 0).toLocaleString()} XP Total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Tabs Navigation (Browse vs Unified History) ────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
          <div className="flex gap-1.5 p-1 bg-surface border border-white/5 rounded-2xl">
            <button
              onClick={() => setActiveTab('browse')}
              className={cn(
                'px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                activeTab === 'browse' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-tertiary hover:text-white'
              )}
            >
              Browse Earning
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                activeTab === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-tertiary hover:text-white'
              )}
            >
              Central Ledger History
              {(mergedHistory.length > 0) && (
                <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold', activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary')}>
                  {mergedHistory.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'browse' && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={14} className="absolute left-4 top-3.5 text-text-tertiary" />
                <input
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search opportunities..."
                  className="w-full sm:w-64 bg-surface border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <button
                onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                className="p-3 bg-surface border border-white/5 rounded-xl text-text-tertiary hover:text-white transition-all shrink-0"
              >
                {viewMode === 'grid' ? <Layers size={14} /> : <LayoutGrid size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* ─── BROWSE TAB ──────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'browse' && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >

              {/* 1. Continue Where You Left Off (if click history present) */}
              {recommendations.continueEarning.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-primary animate-pulse" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Continue Where You Left Off</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendations.continueEarning.map(opp => (
                      <OpportunityCardMini key={opp.id} opp={opp} onLaunch={handleLaunch} />
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Dynamic Categories Ribbon */}
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Select Activity Category</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest border transition-all shrink-0',
                          isActive
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-surface border-white/5 text-text-tertiary hover:border-primary/20 hover:text-white'
                        )}
                      >
                        <CatIcon size={12} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Main Filtered Opportunities list */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-widest text-white/50">
                    Category: <span className="text-white">{CATEGORIES.find(c => c.id === selectedCategory)?.label}</span>
                  </h2>
                  <p className="text-[10px] text-text-tertiary font-bold">{filteredOpportunities.length} opportunities live</p>
                </div>

                {tasksLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : filteredOpportunities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-2xl space-y-4 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-white/5 flex items-center justify-center text-text-tertiary">
                      <Target size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">No Opportunities Live Here</p>
                      <p className="text-xs text-text-tertiary max-w-sm mt-1.5">No direct matching options found in this category right now. Browse other categories or check back soon!</p>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                      : 'space-y-4'
                  )}>
                    {filteredOpportunities.map(opp => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        viewMode={viewMode}
                        onLaunch={handleLaunch}
                        diffStyle={getDifficultyStyle(opp.difficulty)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Recommendation Sliders */}
              <div className="border-t border-white/5 pt-10 space-y-12">
                {/* 4.1 Daily Picks */}
                {recommendations.dailyPicks.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame size={14} className="text-orange-500" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Daily Picks</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {recommendations.dailyPicks.map(opp => (
                        <OpportunityCardMini key={opp.id} opp={opp} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4.2 Highest Paying Today */}
                {recommendations.highestPaying.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-yellow-400" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Highest Paying Today</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {recommendations.highestPaying.map(opp => (
                        <OpportunityCardMini key={opp.id} opp={opp} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4.3 Fastest Rewards */}
                {recommendations.fastestRewards.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-success" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Fastest Verification</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {recommendations.fastestRewards.map(opp => (
                        <OpportunityCardMini key={opp.id} opp={opp} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 4.4 Trending Games */}
                {recommendations.trendingGames.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award size={14} className="text-primary" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Trending Gaming Missions</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {recommendations.trendingGames.map(opp => (
                        <OpportunityCardMini key={opp.id} opp={opp} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </motion.div>
          )}

          {/* ─── CENTRAL LEDGER HISTORY TAB ───────────────────────────────────────── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Earning Audit History</h2>
                  <p className="text-[10px] text-text-tertiary mt-1">Consolidated ledger records of your internal and external completions.</p>
                </div>
                <button
                  onClick={() => { loadExternalHistory(); }}
                  className="p-2 bg-surface border border-white/5 rounded-xl text-text-tertiary hover:text-white transition-all"
                >
                  <Activity size={14} className={historyLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : mergedHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-2xl space-y-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-surface border border-white/5 flex items-center justify-center text-text-tertiary">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">No Earnings Recorded Yet</p>
                    <p className="text-xs text-text-tertiary max-w-sm mt-1.5">Completions from campaigns or provider offers will flow and log directly to this central timeline.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/5 bg-surface overflow-hidden divide-y divide-white/5">
                  {mergedHistory.map(hist => (
                    <div key={hist.id} className="flex items-center justify-between p-4 sm:p-5 hover:bg-surface-bright transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center border shrink-0',
                          hist.source === 'internal'
                            ? 'bg-primary/5 border-primary/15 text-primary'
                            : 'bg-success/5 border-success/15 text-success'
                        )}>
                          {hist.source === 'internal' ? <Target size={15} /> : <Layers size={15} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white truncate">{hist.title}</p>
                          <p className="text-[10px] text-text-tertiary mt-0.5">
                            {hist.source === 'internal' ? 'PulseEarn Quest' : `Provider: ${hist.providerName || 'Adapter'}`}
                            {' · '}
                            {hist.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-[13px] font-black text-success tabular-nums">+{hist.points.toLocaleString()} PTS</p>
                          <p className="text-[9px] text-primary font-bold">+{hist.xp} XP</p>
                        </div>
                        <span className={cn(
                          'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border',
                          hist.status === 'COMPLETED' || hist.status === 'APPROVED' || hist.status === 'REWARD_ISSUED'
                            ? 'bg-success/5 border-success/15 text-success'
                            : 'bg-warning/5 border-warning/15 text-warning'
                        )}>
                          {hist.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ─── FULLSCREEN IN-APP IFRAME VIEWETTE ─────────────────────────────────── */}
      <AnimatePresence>
        {activeProvider && activeProvider.launchUrl && activeProvider.embeddable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-background flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#0A0A0F] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Star size={16} className="text-primary animate-pulse shrink-0" />
                <span className="text-[13px] font-bold text-white truncate">{activeProvider.name} Portal</span>
                <span className="text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-text-tertiary hidden sm:inline">
                  In-App Execution
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={activeProvider.launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 text-text-tertiary hover:text-white hover:bg-surface-bright transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  New Tab <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => {
                    setActiveProvider(null);
                    loadExternalHistory();
                    toast.success('Opportunity complete tracking! Verification is being performed in the background.');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-bright transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Return to PulseEarn <X size={12} />
                </button>
              </div>
            </div>
            <iframe
              title={`${activeProvider.name} Frame`}
              src={activeProvider.launchUrl}
              className="flex-1 w-full border-0 bg-white"
              allow="fullscreen; clipboard-write"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SECURE NEW TAB REDIRECT OVERLAY ──────────────────────────────────── */}
      <AnimatePresence>
        {showRedirectModal && activeProvider && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRedirectModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-surface border border-white/5 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Secure Session Created</h3>
                  <p className="text-[10px] text-text-tertiary uppercase tracking-widest mt-1">Ecosystem Forwarding</p>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                We've established a secure verified session and launched <strong className="text-white">{activeProvider.name}</strong> in a new browser tab. Complete the opportunity objectives fully, and once finished, simply close that tab. All rewards and bonuses are synchronized and credited to your ledger automatically.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowRedirectModal(false);
                    loadExternalHistory();
                  }}
                  className="w-full h-11 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-bright transition-all"
                >
                  Return to Marketplace Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── INTERNAL QUEST DETAILED EXECUTION MODAL ─────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setSelectedTask(null)}
              className="absolute inset-0 bg-background/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-surface border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-start justify-between shrink-0">
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', getDifficultyStyle(selectedTask.difficulty))}>
                    <Target size={24} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white uppercase italic tracking-tight">{selectedTask.title}</h2>
                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest mt-0.5">
                      PulseEarn Quest · {selectedTask.rewardAmount} PTS
                    </p>
                  </div>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-surface-bright rounded-lg text-text-tertiary hover:text-white transition-all disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <p className="text-xs text-text-secondary leading-relaxed">{selectedTask.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-success/5 border border-success/15 space-y-0.5">
                    <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest">PTS Payout</p>
                    <p className="text-2xl font-black text-success tabular-nums">+{selectedTask.rewardAmount}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-0.5">
                    <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest">XP Bonus</p>
                    <p className="text-2xl font-black text-primary tabular-nums">+{selectedTask.xpReward}</p>
                  </div>
                </div>

                {/* Direct Action Link if present */}
                {selectedTask.actionUrl && (
                  <div className="p-4 bg-surface-bright border border-white/5 rounded-xl space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Ecosystem Action Link</p>
                    <a
                      href={selectedTask.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                    >
                      Launch Action Target <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* Proof section */}
                {selectedTask.verificationType !== 'automated' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest pl-1">
                      Proof of Execution
                    </label>
                    <textarea
                      value={proof}
                      onChange={e => setProof(e.target.value)}
                      placeholder="Paste screenshot URL, transaction ID, username or requested details..."
                      className="w-full h-24 bg-surface-bright border border-white/5 rounded-xl p-3.5 text-xs text-white focus:border-primary/50 outline-none transition-all resize-none"
                    />
                    <p className="text-[8px] text-text-tertiary/75 pl-1">
                      {selectedTask.requirements}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-white/5 flex gap-3 shrink-0">
                <button
                  onClick={() => setSelectedTask(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-surface-bright border border-white/5 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleInternalSubmit}
                  isLoading={isSubmitting}
                  className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                >
                  {selectedTask.verificationType === 'automated' ? 'Claim Points' : 'Submit Proof'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// ─── Mini Card (Sliders) ──────────────────────────────────────────────────────
interface MiniCardProps {
  opp: Opportunity;
  onLaunch: (opp: Opportunity) => void;
}
const OpportunityCardMini: React.FC<MiniCardProps> = ({ opp, onLaunch }) => {
  return (
    <div
      onClick={() => onLaunch(opp)}
      className="p-4 rounded-2xl border border-white/5 bg-surface hover:bg-surface-bright hover:border-primary/20 transition-all duration-300 flex flex-col justify-between h-[150px] cursor-pointer group relative"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">
            {opp.category}
          </span>
          <span className="text-[8px] text-text-tertiary truncate max-w-[80px]">
            {opp.source === 'internal' ? 'PulseEarn' : opp.providerName}
          </span>
        </div>
        <h3 className="text-xs font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-tight">
          {opp.title}
        </h3>
      </div>

      <div className="flex justify-between items-end pt-3 border-t border-white/5">
        <div>
          <p className="text-[12px] font-black text-success">+{opp.rewardAmount.toLocaleString()}</p>
          <p className="text-[8px] text-text-tertiary font-bold">PTS</p>
        </div>
        <button className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all">
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Card (Grids / Lists) ────────────────────────────────────────────────
interface MainCardProps {
  opp: Opportunity;
  viewMode: 'grid' | 'list';
  onLaunch: (opp: Opportunity) => void;
  diffStyle: string;
}
const OpportunityCard: React.FC<MainCardProps> = ({ opp, viewMode, onLaunch, diffStyle }) => {
  const isCompleted = opp.status === 'completed';
  const isPending = opp.status === 'pending';

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onLaunch(opp)}
        className={cn(
          'p-4 rounded-2xl border border-white/5 bg-surface hover:bg-surface-bright transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group',
          isCompleted && 'opacity-60 pointer-events-none'
        )}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#12121A] border border-white/5 flex items-center justify-center shrink-0 text-text-tertiary group-hover:text-primary group-hover:scale-110 transition-all">
            {opp.category === 'surveys' ? <BarChart3 size={18} /> : opp.category === 'games' ? <Trophy size={18} /> : <Target size={18} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors truncate">
                {opp.title}
              </h3>
              <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border', diffStyle)}>
                {opp.difficulty}
              </span>
            </div>
            <p className="text-xs text-text-tertiary line-clamp-1 mt-0.5">{opp.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 shrink-0 ml-auto sm:ml-0">
          <div className="text-right">
            <p className="text-sm font-black text-success">+{opp.rewardAmount.toLocaleString()}</p>
            <p className="text-[8px] text-text-tertiary uppercase font-bold">PTS · +{opp.xpReward} XP</p>
          </div>
          {isPending ? (
            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl bg-warning/5 border border-warning/15 text-warning flex items-center gap-1.5">
              <Clock size={11} /> Reviewing
            </span>
          ) : (
            <button className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-bright text-white text-[9px] font-black uppercase tracking-widest transition-all">
              Start
            </button>
          )}
        </div>
      </div>
    );
  }

  // Grid Card
  return (
    <div
      onClick={() => onLaunch(opp)}
      className={cn(
        'relative rounded-2xl border border-white/5 bg-surface hover:bg-surface-bright hover:border-primary/20 transition-all duration-300 p-6 flex flex-col justify-between h-[300px] cursor-pointer group',
        isCompleted && 'opacity-60 pointer-events-none'
      )}
    >
      <div className="space-y-4">
        {/* Card Header metadata */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">
            {opp.category}
          </span>
          <span className={cn('text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border', diffStyle)}>
            {opp.difficulty}
          </span>
        </div>

        {/* Title, details */}
        <div className="space-y-2">
          <h3 className="text-base font-black text-white group-hover:text-primary transition-colors line-clamp-2 leading-tight">
            {opp.title}
          </h3>
          <p className="text-xs text-text-tertiary leading-relaxed line-clamp-3">
            {opp.description}
          </p>
        </div>
      </div>

      {/* Card Footer stats and CTA */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Reward</p>
            <p className="text-lg font-black text-success tabular-nums">+{opp.rewardAmount.toLocaleString()}</p>
            <p className="text-[8px] text-text-tertiary font-bold uppercase">PTS · +{opp.xpReward} XP</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Time</p>
            <p className="text-xs font-semibold text-white">{opp.estimatedTime}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Subtle provider attribution labels */}
          <span className="text-[9px] text-text-tertiary italic">
            {opp.source === 'internal' ? 'Powered by PulseEarn' : `Source: ${opp.providerName}`}
          </span>

          {isPending ? (
            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-warning/5 border border-warning/15 text-warning flex items-center gap-1.5">
              <Clock size={11} /> Reviewing
            </span>
          ) : (
            <button className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-bright text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1">
              Start <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
