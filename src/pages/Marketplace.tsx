import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  TrendingUp,
  Clock,
  Activity,
  Target,
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
  Play,
  Monitor,
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
  Compass,
  ArrowUpRight
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
  isNew?: boolean;
  isTrending?: boolean;
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

// ─── Category Configurations ──────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'All Opportunities', icon: Compass, gradient: 'from-[#6366F1] to-[#A855F7]' },
  { id: 'featured', label: 'Featured', icon: Sparkles, gradient: 'from-[#3B82F6] to-[#8B5CF6]' },
  { id: 'daily', label: 'Daily Checks', icon: Flame, gradient: 'from-[#EF4444] to-[#F97316]' },
  { id: 'surveys', label: 'Surveys', icon: BarChart3, gradient: 'from-[#10B981] to-[#3B82F6]' },
  { id: 'games', label: 'Games', icon: Trophy, gradient: 'from-[#F59E0B] to-[#EF4444]' },
  { id: 'apps', label: 'Apps & Mobile', icon: Monitor, gradient: 'from-[#6366F1] to-[#3B82F6]' },
  { id: 'videos', label: 'Videos', icon: Play, gradient: 'from-[#EC4899] to-[#8B5CF6]' },
  { id: 'cashback', label: 'Cashback', icon: CreditCard, gradient: 'from-[#06B6D4] to-[#10B981]' },
  { id: 'shopping', label: 'Shopping', icon: CreditCard, gradient: 'from-[#F59E0B] to-[#F97316]' },
  { id: 'education', label: 'Education', icon: Target, gradient: 'from-[#84CC16] to-[#10B981]' },
  { id: 'community', label: 'Community', icon: UserPlus, gradient: 'from-[#06B6D4] to-[#3B82F6]' },
  { id: 'referrals', label: 'Referrals', icon: UserPlus, gradient: 'from-[#EC4899] to-[#F43F5E]' },
  { id: 'predictions', label: 'Predictions', icon: TrendingUp, gradient: 'from-[#8B5CF6] to-[#06B6D4]' },
  { id: 'seasonal', label: 'Seasonal', icon: Gift, gradient: 'from-[#EC4899] to-[#F97316]' },
  { id: 'sponsored', label: 'Sponsored', icon: Star, gradient: 'from-[#3B82F6] to-[#06B6D4]' },
] as const;

// ─── Custom Vector Card Artwork Generation ────────────────────────────────────

const CardArtwork: React.FC<{ category: string; gradient: string }> = ({ category, gradient }) => {
  const getIllustration = () => {
    switch (category) {
      case 'games':
        return (
          <svg className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="6" width="20" height="12" rx="3" />
            <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'surveys':
        return (
          <svg className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      case 'daily':
        return (
          <svg className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
          </svg>
        );
      case 'apps':
        return (
          <svg className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="12" y1="18" x2="12" y2="18" strokeLinecap="round" />
          </svg>
        );
      case 'videos':
        return (
          <svg className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        );
      case 'predictions':
        return (
          <svg className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        );
      default:
        return (
          <svg className="w-24 h-24 text-white/10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        );
    }
  };

  return (
    <div className={cn("absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l opacity-20 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none flex items-center justify-end pr-6 overflow-hidden rounded-r-3xl", gradient)}>
      <div className="transform translate-x-6 translate-y-2 rotate-12 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-500">
        {getIllustration()}
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const Marketplace: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const { tasks, getTaskStatus, loading: tasksLoading, unifiedHistory } = useTasks();

  const [activeTab, setActiveTab] = useState<'browse' | 'history'>('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Advanced Filter Settings
  const [showFilters, setShowFilters] = useState(false);
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterRewardMin, setFilterRewardMin] = useState<number>(0);
  const [filterEstimatedTime, setFilterEstimatedTime] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterVerification, setFilterVerification] = useState<string>('all');
  const [filterCompletionState, setFilterCompletionState] = useState<string>('all');
  const [filterStatusAttribute, setFilterStatusAttribute] = useState<'all' | 'new' | 'trending'>('all');

  // Provider states
  const [providers, setProviders] = useState<Provider[]>([]);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [showRedirectModal, setShowRedirectModal] = useState<boolean>(false);

  // External Completions history
  const [externalHistory, setExternalHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // User click history / "Continue Where You Left Off"
  const [clickHistory, setClickHistory] = useState<any[]>([]);

  // Task execution details
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [proof, setProof] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Click history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pulseearn-marketplace-clicks-v2');
      if (stored) {
        setClickHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load click history:', err);
    }
  }, []);

  // Track clicked opportunities
  const trackClick = (opp: Opportunity) => {
    const nextClicks = [
      { id: opp.id, title: opp.title, category: opp.category, rewardAmount: opp.rewardAmount, timestamp: new Date().getTime(), source: opp.source, providerId: opp.providerId },
      ...clickHistory.filter(c => c.id !== opp.id)
    ].slice(0, 4); // keep last 4
    setClickHistory(nextClicks);
    try {
      localStorage.setItem('pulseearn-marketplace-clicks-v2', JSON.stringify(nextClicks));
    } catch (err) {
      console.error('Failed to save click history:', err);
    }
  };

  // Load active offerwall providers
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

  // Load external reward history
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

  // ─── Build Provider Opportunities natively (Type A Integration) ───────────────
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
          title: 'High-Paying Consumer Opinion Survey',
          description: 'Help global brands make strategic decisions. Share your feedback on finance, technology, and daily consumer trends.',
          rewardAmount: Math.round(1850 * p.rewardMultiplier),
          xpReward: 185,
          estimatedTime: '12 min',
          difficulty: 'easy',
          category: 'surveys',
          requirements: 'Reach the end of the survey and answer with care.',
          verificationType: 'Instant Callback',
          status: 'available',
          isFeatured: true,
          isTrending: true
        });
        opps.push({
          id: `opp_cpx_polls`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Quick Brand Engagement Poll',
          description: 'Answer rapid-fire questions about technology and lifestyle brands. Takes less than five minutes.',
          rewardAmount: Math.round(450 * p.rewardMultiplier),
          xpReward: 45,
          estimatedTime: '3 min',
          difficulty: 'easy',
          category: 'surveys',
          requirements: 'Complete all 5 rapid questions in the survey session.',
          verificationType: 'Instant Callback',
          status: 'available'
        });
      } else if (pid === 'bitlabs') {
        opps.push({
          id: `opp_bitlabs_premium`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Premium Corporate Strategy Panel',
          description: 'Access top-tier strategic consulting panels. Complete surveys regarding institutional business tools.',
          rewardAmount: Math.round(3200 * p.rewardMultiplier),
          xpReward: 320,
          estimatedTime: '15 min',
          difficulty: 'medium',
          category: 'surveys',
          requirements: 'Successfully bypass screening filters and finish the corporate feedback session.',
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
          title: 'Install Monopoly GO & Conquer Board 5',
          description: 'Take part in the legendary mobile board game. Reach board 5 to unlock a large rewards payload.',
          rewardAmount: Math.round(7200 * p.rewardMultiplier),
          xpReward: 720,
          estimatedTime: 'Varies',
          difficulty: 'medium',
          category: 'games',
          requirements: 'Must be a first-time downloader of Monopoly GO. Complete board level 5 successfully.',
          verificationType: 'Instant Callback',
          status: 'available',
          isFeatured: true,
          isTrending: true,
          isNew: true
        });
        opps.push({
          id: `opp_lootably_casual`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Play Casual & Puzzle Challenge',
          description: 'Explore the vast casual catalogue of match-three, sorting, and tile puzzles natively.',
          rewardAmount: Math.round(1500 * p.rewardMultiplier),
          xpReward: 150,
          estimatedTime: '15 min',
          difficulty: 'easy',
          category: 'games',
          requirements: 'Choose and run any casual game from the list, achieving the basic level milestones.',
          verificationType: 'Instant Callback',
          status: 'available'
        });
        opps.push({
          id: `opp_lootably_finance`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Test Trending FinTech Utilities',
          description: 'Download the top finance budgeting companion application and register a secure profile.',
          rewardAmount: Math.round(2900 * p.rewardMultiplier),
          xpReward: 290,
          estimatedTime: '5 min',
          difficulty: 'easy',
          category: 'apps',
          requirements: 'Download App, open it, and create a basic verified free profile.',
          verificationType: 'Instant Callback',
          status: 'available',
          isNew: true
        });
      } else if (pid === 'timewall') {
        opps.push({
          id: `opp_timewall_videos`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Watch Sponsored Video Clips & Reels',
          description: 'Stream short informative video clips, technology highlights, or promotional brand reels.',
          rewardAmount: Math.round(350 * p.rewardMultiplier),
          xpReward: 35,
          estimatedTime: '2 min',
          difficulty: 'easy',
          category: 'videos',
          requirements: 'Watch the entire video segment without switching active tabs.',
          verificationType: 'Instant Callback',
          status: 'available'
        });
        opps.push({
          id: `opp_timewall_tasks`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Browse Websites & Complete Micro-Clicks',
          description: 'Perform simple micro-tasks such as reading specified blogs, navigating news articles, or solving short puzzles.',
          rewardAmount: Math.round(750 * p.rewardMultiplier),
          xpReward: 75,
          estimatedTime: '4 min',
          difficulty: 'easy',
          category: 'daily',
          requirements: 'Follow specified search patterns, visit pages, and input basic validation answers.',
          verificationType: 'Instant Callback',
          status: 'available'
        });
      } else if (pid === 'adgem') {
        opps.push({
          id: `opp_adgem_rpg`,
          source: 'provider',
          providerId: p.id,
          providerName: p.name,
          title: 'Guild RPG: Defeat the Fire Dragon',
          description: 'Step into a fantasy tactical RPG. Level up your heroic team and defeat the dragon boss.',
          rewardAmount: Math.round(14500 * p.rewardMultiplier),
          xpReward: 1450,
          estimatedTime: 'Varies',
          difficulty: 'elite',
          category: 'games',
          requirements: 'Download, clear Level 25, and defeat the boss within 14 days of account registration.',
          verificationType: 'Instant Callback',
          status: 'available',
          isFeatured: true,
          isTrending: true
        });
      }
    });
    return opps;
  }, [providers]);

  // ─── Build Internal Opportunities (Type B & PulseEarn Core) ───────────────────
  const internalOpportunities = useMemo<Opportunity[]>(() => {
    return tasks.map(t => {
      let category = 'sponsored';
      const tc = (t.category || '').toUpperCase();
      const tt = (t.type || '').toUpperCase();

      if (tc === 'SURVEY') category = 'surveys';
      else if (tc === 'PREDICTION' || tt === 'PREDICTION') category = 'predictions';
      else if (tc === 'REFERRAL' || tt === 'REFERRAL') category = 'referrals';
      else if (tc === 'COMMUNITY' || tc === 'SOCIAL') category = 'community';
      else if (tc === 'EDUCATION') category = 'education';
      else if (tc === 'EVENTS') category = 'seasonal';
      else if (tc === 'SPONSORED') category = 'sponsored';
      else if (tt === 'STREAK' || tt === 'DAILY') category = 'daily';

      const statusInfo = getTaskStatus(t);

      return {
        id: t.id,
        source: 'internal',
        title: t.title,
        description: t.description || 'Participate and perform requested objectives directly within the PulseEarn interface.',
        rewardAmount: t.rewardAmount,
        xpReward: t.xpReward,
        estimatedTime: t.estimatedTime || '3 min',
        difficulty: (t.minLevel && t.minLevel > 5 ? 'hard' : t.minLevel && t.minLevel > 2 ? 'medium' : 'easy') as any,
        category,
        requirements: t.proofRequirements || 'Upload screenshot proof or provide valid credentials.',
        verificationType: t.verificationType || 'Automated',
        actionUrl: t.actionUrl,
        status: statusInfo.status,
        isFeatured: t.rewardAmount > 600 || t.visibility === 'PUBLIC',
        isNew: t.id.startsWith('new') || t.rewardAmount === 120,
        isTrending: t.rewardAmount > 400
      };
    });
  }, [tasks, getTaskStatus]);

  // Combine All lists safely
  const allOpportunities = useMemo<Opportunity[]>(() => {
    // Unique list by ID
    const merged = [...internalOpportunities, ...providerOpportunities];
    const seen = new Set();
    return merged.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [internalOpportunities, providerOpportunities]);

  // ─── Filter & Search Engine ──────────────────────────────────────────────────
  const filteredOpportunities = useMemo(() => {
    return allOpportunities.filter(opp => {
      // 1. Category check
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'featured') {
          if (!opp.isFeatured) return false;
        } else if (opp.category !== selectedCategory) {
          return false;
        }
      }

      // 2. Search check
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesTitle = opp.title.toLowerCase().includes(query);
        const matchesDesc = opp.description.toLowerCase().includes(query);
        const matchesCat = opp.category.toLowerCase().includes(query);
        const matchesProv = opp.providerName?.toLowerCase().includes(query) || '';
        const matchesDiff = opp.difficulty.toLowerCase().includes(query);

        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesProv && !matchesDiff) {
          return false;
        }
      }

      // 3. Advanced filters
      if (filterDifficulty !== 'all' && opp.difficulty !== filterDifficulty) {
        return false;
      }

      if (filterRewardMin > 0 && opp.rewardAmount < filterRewardMin) {
        return false;
      }

      if (filterEstimatedTime !== 'all') {
        if (filterEstimatedTime === 'short' && (opp.estimatedTime.includes('min') && parseInt(opp.estimatedTime) > 5)) return false;
        if (filterEstimatedTime === 'long' && opp.estimatedTime.includes('min') && parseInt(opp.estimatedTime) <= 5) return false;
      }

      if (filterProvider !== 'all') {
        if (filterProvider === 'internal' && opp.source !== 'internal') return false;
        if (filterProvider !== 'internal' && opp.providerId !== filterProvider) return false;
      }

      if (filterVerification !== 'all') {
        if (filterVerification === 'instant' && !opp.verificationType.toLowerCase().includes('instant') && !opp.verificationType.toLowerCase().includes('auto')) return false;
        if (filterVerification === 'manual' && opp.verificationType.toLowerCase().includes('instant')) return false;
      }

      if (filterCompletionState !== 'all') {
        if (filterCompletionState === 'completed' && opp.status !== 'completed') return false;
        if (filterCompletionState === 'available' && opp.status !== 'available') return false;
      }

      if (filterStatusAttribute !== 'all') {
        if (filterStatusAttribute === 'new' && !opp.isNew) return false;
        if (filterStatusAttribute === 'trending' && !opp.isTrending) return false;
      }

      return true;
    });
  }, [allOpportunities, selectedCategory, searchTerm, filterDifficulty, filterRewardMin, filterEstimatedTime, filterProvider, filterVerification, filterCompletionState, filterStatusAttribute]);

  // ─── Recommendation Engine Sections (No duplicated cards in row arrays) ──────
  const recommendations = useMemo(() => {
    // Unique helper to pull items and mark them
    const takenIds = new Set<string>();

    const getUniqueItems = (filterFn: (o: Opportunity) => boolean, limitCount = 4) => {
      const result: Opportunity[] = [];
      for (const o of allOpportunities) {
        if (result.length >= limitCount) break;
        if (!takenIds.has(o.id) && filterFn(o)) {
          result.push(o);
          takenIds.add(o.id);
        }
      }
      return result;
    };

    // A: Continue Earning Click History (always first, doesn't lock items since user clicked them)
    const continueEarning = clickHistory
      .map(c => allOpportunities.find(o => o.id === c.id))
      .filter(Boolean) as Opportunity[];

    // B: Featured Campaigns (Top strategic offers)
    const featuredCampaigns = getUniqueItems(o => !!o.isFeatured, 3);

    // C: Recommended for You (Balanced items)
    const recommendedForYou = getUniqueItems(o => o.isTrending || o.rewardAmount > 1000, 4);

    // D: Daily Picks (Daily, checklists, fast verification)
    const dailyPicks = getUniqueItems(o => o.category === 'daily' || o.estimatedTime === '2 min' || o.estimatedTime === '3 min', 4);

    // E: Limited-Time Events
    const limitedEvents = getUniqueItems(o => o.category === 'seasonal' || o.difficulty === 'elite', 4);

    return {
      continueEarning,
      featuredCampaigns,
      recommendedForYou,
      dailyPicks,
      limitedEvents
    };
  }, [allOpportunities, clickHistory]);

  // ─── Consolidated History Ledger ───────────────────────────────────────────
  const mergedHistory = useMemo<MergedHistoryItem[]>(() => {
    const list: MergedHistoryItem[] = [];

    // Internal task completions
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

    // External offerwall completions
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

    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [unifiedHistory, externalHistory]);

  // Total completed rewards counter
  const completedRewardsCount = useMemo(() => {
    return mergedHistory.filter(h => h.status === 'COMPLETED' || h.status === 'APPROVED').length;
  }, [mergedHistory]);

  // ─── Launch Flow (Internal Modal vs Native Adapter Iframe vs External Tab) ──
  const handleLaunch = async (opp: Opportunity) => {
    trackClick(opp);

    if (opp.source === 'internal') {
      setSelectedTask(opp);
      setProof('');
      return;
    }

    if (!currentUser || !opp.providerId) {
      toast.error('Log in to launch opportunities');
      return;
    }

    const providerObj = providers.find(p => p.id === opp.providerId);
    if (!providerObj) {
      toast.error('Provider configuration unavailable');
      return;
    }

    const loader = toast.loading(`Connecting with ${providerObj.name}...`);

    let blankWindow: Window | null = null;
    if (!providerObj.embeddable) {
      blankWindow = window.open('', '_blank', 'noopener,noreferrer');
    }

    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch(`/api/offerwall/providers/${opp.providerId}/launch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.success && res.launchUrl) {
        toast.dismiss(loader);
        if (res.embeddable) {
          setActiveProvider({ ...providerObj, launchUrl: res.launchUrl, embeddable: true });
        } else {
          if (blankWindow && !blankWindow.closed) {
            blankWindow.location.href = res.launchUrl;
          } else {
            window.open(res.launchUrl, '_blank', 'noopener,noreferrer');
          }
          setActiveProvider({ ...providerObj, launchUrl: res.launchUrl, embeddable: false });
          setShowRedirectModal(true);
        }
      } else {
        if (blankWindow && !blankWindow.closed) blankWindow.close();
        toast.error(res.message || 'Failed to authenticate secure session', { id: loader });
      }
    } catch {
      if (blankWindow && !blankWindow.closed) blankWindow.close();
      toast.error('Failed to communicate with provider adapter', { id: loader });
    }
  };

  // Submit internal proof
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
        toast.success(data.automated ? 'Points and XP credited instantly!' : 'Proof received. Our moderators will review it shortly.');
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
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'medium':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'hard':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      case 'elite':
        return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-text-primary pt-24 pb-28 selection:bg-primary selection:text-white">
      {/* Soft Decorative Glow Backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* ─── GREETING & STREAK (The Welcome Zone) ───────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Good Morning, <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">{userData?.username || 'Earning Pro'}</span>
            </h1>
            <p className="text-sm text-text-tertiary mt-1">
              Continue your earning streak. Today's premium opportunities are waiting.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-[#0D0D15] border border-white/5 rounded-2xl p-4 w-full md:w-auto shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 animate-pulse">
                <Flame size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Active Streak</p>
                <p className="text-base font-black text-white tabular-nums">{userData?.streak ?? 0} Days Running</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/5" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Completed</p>
                <p className="text-base font-black text-white tabular-nums">{completedRewardsCount} Rewards</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── TAB NAVIGATION ─────────────────────────────────────────────────── */}
        <div className="flex justify-start border-b border-white/5 pb-1">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('browse')}
              className={cn(
                'pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative',
                activeTab === 'browse'
                  ? 'border-primary text-white'
                  : 'border-transparent text-text-tertiary hover:text-white'
              )}
            >
              Marketplace Catalog
              {activeTab === 'browse' && (
                <motion.div layoutId="tab-active-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                'pb-4 px-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all relative',
                activeTab === 'history'
                  ? 'border-primary text-white'
                  : 'border-transparent text-text-tertiary hover:text-white'
              )}
            >
              History & Audit Ledger
              {activeTab === 'history' && (
                <motion.div layoutId="tab-active-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* ─── CATALOG MODE ──────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeTab === 'browse' && (
            <motion.div
              key="catalog"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* FEATURED HERO CAMPAIGN SECTION */}
              {recommendations.featuredCampaigns.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-primary" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white/50">Featured Campaigns</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {recommendations.featuredCampaigns.map(opp => (
                      <FeaturedCampaignCard key={opp.id} opp={opp} onLaunch={handleLaunch} />
                    ))}
                  </div>
                </div>
              )}

              {/* CONTINUE WHERE YOU LEFT OFF SECTION */}
              {recommendations.continueEarning.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-accent animate-pulse" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white/50">Continue Where You Left Off</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendations.continueEarning.map(opp => (
                      <MiniOpportunityCard key={opp.id} opp={opp} onLaunch={handleLaunch} />
                    ))}
                  </div>
                </div>
              )}

              {/* TWO COLUMN SIDE-BY-SIDE HIGHLIGHTS (RECOMMENDED vs DAILY PICKS) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Recommended For You */}
                {recommendations.recommendedForYou.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Compass size={14} className="text-blue-400" />
                      <h2 className="text-[10px] font-black uppercase tracking-widest text-white/50">Recommended For You</h2>
                    </div>
                    <div className="space-y-4">
                      {recommendations.recommendedForYou.map(opp => (
                        <RowOpportunityCard key={opp.id} opp={opp} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Picks */}
                {recommendations.dailyPicks.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Flame size={14} className="text-orange-500" />
                      <h2 className="text-[10px] font-black uppercase tracking-widest text-white/50">Daily Picks</h2>
                    </div>
                    <div className="space-y-4">
                      {recommendations.dailyPicks.map(opp => (
                        <RowOpportunityCard key={opp.id} opp={opp} onLaunch={handleLaunch} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* LIMITED TIME EVENTS BANNER */}
              {recommendations.limitedEvents.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Gift size={14} className="text-rose-500" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-white/50">Limited-Time Events</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendations.limitedEvents.map(opp => (
                      <MiniOpportunityCard key={opp.id} opp={opp} onLaunch={handleLaunch} />
                    ))}
                  </div>
                </div>
              )}

              {/* BROWSE ALL DYNAMIC CATALOGUE WITH FILTER ENGINE */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">Browse Activity Categories</h2>
                    <p className="text-[11px] text-text-tertiary mt-0.5">Explore our comprehensive native library and complete strategic offers.</p>
                  </div>

                  {/* Search and Filter trigger */}
                  <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                      <Search size={14} className="absolute left-4 top-3.5 text-text-tertiary" />
                      <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Search title, tag, difficulty, provider..."
                        className="w-full lg:w-80 bg-[#0A0A0F] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(v => !v)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0",
                        showFilters ? "bg-primary border-primary text-white" : "bg-[#0A0A0F] border-white/5 text-text-tertiary hover:text-white"
                      )}
                    >
                      <Filter size={12} />
                      Filters
                    </button>
                  </div>
                </div>

                {/* ADVANCED FILTER PANEL */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-[#08080C] border border-white/5 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Difficulty filter */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary block">Difficulty</label>
                          <select
                            value={filterDifficulty}
                            onChange={e => setFilterDifficulty(e.target.value)}
                            className="w-full bg-[#0E0E15] border border-white/5 rounded-xl px-3 py-2 text-xs text-text-primary focus:border-primary outline-none"
                          >
                            <option value="all">All Difficulties</option>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                            <option value="elite">Elite</option>
                          </select>
                        </div>

                        {/* Minimum reward */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary block">Minimum Reward</label>
                          <select
                            value={filterRewardMin}
                            onChange={e => setFilterRewardMin(Number(e.target.value))}
                            className="w-full bg-[#0E0E15] border border-white/5 rounded-xl px-3 py-2 text-xs text-text-primary focus:border-primary outline-none"
                          >
                            <option value="0">Any Reward</option>
                            <option value="500">500+ PTS</option>
                            <option value="1500">1,500+ PTS</option>
                            <option value="5000">5,000+ PTS</option>
                          </select>
                        </div>

                        {/* Provider source */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary block">Opportunity Source</label>
                          <select
                            value={filterProvider}
                            onChange={e => setFilterProvider(e.target.value)}
                            className="w-full bg-[#0E0E15] border border-white/5 rounded-xl px-3 py-2 text-xs text-text-primary focus:border-primary outline-none"
                          >
                            <option value="all">All Sources</option>
                            <option value="internal">PulseEarn Quests</option>
                            {providers.map(p => (
                              <option key={p.id} value={p.id}>{p.name} adapter</option>
                            ))}
                          </select>
                        </div>

                        {/* Completion state */}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-text-tertiary block">Verification Method</label>
                          <select
                            value={filterVerification}
                            onChange={e => setFilterVerification(e.target.value)}
                            className="w-full bg-[#0E0E15] border border-white/5 rounded-xl px-3 py-2 text-xs text-text-primary focus:border-primary outline-none"
                          >
                            <option value="all">Any Verification</option>
                            <option value="instant">Instant Verification</option>
                            <option value="manual">Requires Proof Approval</option>
                          </select>
                        </div>

                        {/* Status Attributes */}
                        <div className="space-y-2 col-span-1 sm:col-span-2 lg:col-span-4 flex gap-4 pt-2 border-t border-white/5">
                          <button
                            onClick={() => setFilterStatusAttribute(v => v === 'new' ? 'all' : 'new')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border",
                              filterStatusAttribute === 'new' ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-transparent border-white/5 text-text-tertiary hover:text-white"
                            )}
                          >
                            New Releases Only
                          </button>
                          <button
                            onClick={() => setFilterStatusAttribute(v => v === 'trending' ? 'all' : 'trending')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border",
                              filterStatusAttribute === 'trending' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-transparent border-white/5 text-text-tertiary hover:text-white"
                            )}
                          >
                            Trending Opportunities Only
                          </button>
                          <button
                            onClick={() => {
                              setFilterDifficulty('all');
                              setFilterRewardMin(0);
                              setFilterEstimatedTime('all');
                              setFilterProvider('all');
                              setFilterVerification('all');
                              setFilterCompletionState('all');
                              setFilterStatusAttribute('all');
                            }}
                            className="text-[9px] font-bold uppercase text-rose-400 hover:text-rose-300 ml-auto"
                          >
                            Reset Advanced Filters
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* HORIZONTALLY SCROLLABLE CATEGORY CHIPS */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                  {CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    const isActive = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-3 rounded-2xl whitespace-nowrap text-[10px] font-black uppercase tracking-widest border transition-all shrink-0',
                          isActive
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/25'
                            : 'bg-[#0A0A0F] border-white/5 text-text-tertiary hover:border-primary/20 hover:text-white'
                        )}
                      >
                        <CatIcon size={12} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* RENDER DYNAMIC CARDS CONTAINER */}
                {tasksLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Synthesizing Earning Catalogue...</p>
                  </div>
                ) : filteredOpportunities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-3xl space-y-4 text-center bg-[#07070A]">
                    <div className="w-12 h-12 rounded-2xl bg-[#0F0F17] border border-white/5 flex items-center justify-center text-text-tertiary">
                      <Target size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">No Matching Earning Paths Found</p>
                      <p className="text-xs text-text-tertiary max-w-sm mt-1">Try resetting advanced filters or typing another search query.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOpportunities.map(opp => {
                      const matchingCat = CATEGORIES.find(c => c.id === opp.category) || CATEGORIES[0];
                      return (
                        <PremiumOpportunityCard
                          key={opp.id}
                          opp={opp}
                          gradient={matchingCat.gradient}
                          onLaunch={handleLaunch}
                          diffStyle={getDifficultyStyle(opp.difficulty)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── HISTORY MODE ──────────────────────────────────────────────────── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white">Earning Audit History</h2>
                  <p className="text-[11px] text-text-tertiary mt-0.5">Consolidated real-time ledger records of your completed campaigns and provider offers.</p>
                </div>
                <button
                  onClick={() => { loadExternalHistory(); }}
                  className="p-2.5 bg-[#0D0D15] border border-white/5 rounded-xl text-text-tertiary hover:text-white transition-all shrink-0"
                >
                  <Activity size={14} className={historyLoading ? 'animate-spin' : ''} />
                </button>
              </div>

              {historyLoading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : mergedHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/5 rounded-3xl space-y-4 text-center bg-[#07070A]">
                  <div className="w-12 h-12 rounded-2xl bg-[#0F0F17] border border-white/5 flex items-center justify-center text-text-tertiary">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Earning History is Quiet</p>
                    <p className="text-xs text-text-tertiary max-w-sm mt-1">Complete your first opportunity on the Marketplace. Completed rewards will log and audit here.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-white/5 bg-[#08080C] overflow-hidden divide-y divide-white/5 shadow-2xl">
                  {mergedHistory.map(hist => (
                    <div key={hist.id} className="flex items-center justify-between p-5 hover:bg-[#0D0D15] transition-all">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center border shrink-0',
                          hist.source === 'internal'
                            ? 'bg-primary/5 border-primary/15 text-primary'
                            : 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400'
                        )}>
                          {hist.source === 'internal' ? <Target size={16} /> : <Layers size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{hist.title}</p>
                          <p className="text-[10px] text-text-tertiary mt-1">
                            {hist.source === 'internal' ? 'PulseEarn Native Quest' : `Partner Adapter: ${hist.providerName || 'External Sync'}`}
                            {' · '}
                            {hist.timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 text-right">
                        <div>
                          <p className="text-sm font-black text-emerald-400 tabular-nums">+{hist.points.toLocaleString()} PTS</p>
                          <p className="text-[10px] text-primary font-bold">+{hist.xp} XP</p>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border bg-emerald-500/5 border-emerald-500/15 text-emerald-400">
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

      {/* ─── FULLSCREEN IN-APP ADAPTER VIEWPORT (TYPE A SECURE IFRAME) ────────── */}
      <AnimatePresence>
        {activeProvider && activeProvider.launchUrl && activeProvider.embeddable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-[#050508] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#08080C] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Star size={16} className="text-primary animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-white truncate">{activeProvider.name} Portal</span>
                <span className="text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-1 rounded-md text-text-tertiary hidden sm:inline">
                  Embedded Sandbox Mode
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={activeProvider.launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 text-text-tertiary hover:text-white hover:bg-[#0E0E16] transition-all text-[9px] font-black uppercase tracking-widest"
                >
                  New Tab <ExternalLink size={12} />
                </a>
                <button
                  onClick={() => {
                    setActiveProvider(null);
                    loadExternalHistory();
                    toast.success('Your completion state has been synced with our background validator!');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-primary-bright transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Return to PulseEarn <X size={12} />
                </button>
              </div>
            </div>
            <iframe
              title={`${activeProvider.name} Adapter`}
              src={activeProvider.launchUrl}
              className="flex-1 w-full border-0 bg-white"
              allow="fullscreen; clipboard-write; camera"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SECURE REDIRECT GUIDANCE MODAL (TYPE B AND NON-EMBEDDABLE) ───────── */}
      <AnimatePresence>
        {showRedirectModal && activeProvider && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRedirectModal(false)}
              className="absolute inset-0 bg-[#050508]/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0A0A0F] border border-white/5 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">Ecosystem Session Securely Created</h3>
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest mt-1">Verified Partner Connection</p>
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                We've established a secure verified tracking session and launched <strong className="text-white">{activeProvider.name}</strong> in an external window. Finish the opportunity objectives entirely, then return back to this platform. Your rewards will automatically be validated and credited to your ledger without manual refresh!
              </p>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowRedirectModal(false);
                    loadExternalHistory();
                  }}
                  className="w-full h-12 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-bright transition-all shadow-lg shadow-primary/20"
                >
                  Back to Marketplace Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── NATIVE DETAIL & PROOF SUBMISSION DIALOG ─────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setSelectedTask(null)}
              className="absolute inset-0 bg-[#050508]/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0A0A0F] border border-white/5 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-start justify-between shrink-0 bg-[#0D0D14]">
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center border', getDifficultyStyle(selectedTask.difficulty))}>
                    <Target size={24} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-white uppercase italic tracking-tight">{selectedTask.title}</h2>
                    <p className="text-[9px] text-text-tertiary font-black uppercase tracking-widest mt-1">
                      PulseEarn Core Quest · +{selectedTask.rewardAmount} PTS
                    </p>
                  </div>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-white/5 rounded-lg text-text-tertiary hover:text-white transition-all disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 flex-1 overflow-y-auto bg-[#07070B]">
                <p className="text-xs text-text-secondary leading-relaxed">{selectedTask.description}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                    <p className="text-[8px] text-text-tertiary font-black uppercase tracking-widest">Points Reward</p>
                    <p className="text-xl font-black text-emerald-400 tabular-nums">+{selectedTask.rewardAmount} PTS</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-1">
                    <p className="text-[8px] text-text-tertiary font-black uppercase tracking-widest">XP Progression</p>
                    <p className="text-xl font-black text-primary tabular-nums">+{selectedTask.xpReward} XP</p>
                  </div>
                </div>

                {selectedTask.actionUrl && (
                  <div className="p-4 bg-[#0A0A0F] border border-white/5 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Mission Action Link</p>
                    <a
                      href={selectedTask.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                    >
                      Open Target Landing Page <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {selectedTask.verificationType !== 'automated' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-text-tertiary uppercase tracking-widest pl-1 block">
                      Required Proof Details
                    </label>
                    <textarea
                      value={proof}
                      onChange={e => setProof(e.target.value)}
                      placeholder="Input requested transaction ID, screenshot link, social handle, or task validation codes..."
                      className="w-full h-24 bg-[#0A0A0F] border border-white/5 rounded-xl p-3.5 text-xs text-white focus:border-primary outline-none transition-all resize-none"
                    />
                    <p className="text-[8px] text-text-tertiary/80 pl-1 leading-relaxed">
                      <strong>Instructions:</strong> {selectedTask.requirements}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-white/5 flex gap-3 shrink-0 bg-[#0A0A0F]">
                <button
                  onClick={() => setSelectedTask(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-[#0D0D14] border border-white/5 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                >
                  Cancel
                </button>
                <Button
                  onClick={handleInternalSubmit}
                  isLoading={isSubmitting}
                  className="flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest"
                >
                  {selectedTask.verificationType === 'automated' ? 'Claim Points' : 'Submit Verification Proof'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// ─── PREMIUM INTEGRATED VIEW CARD (GRID COMPLEMENTS) ──────────────────────────
interface PremiumCardProps {
  opp: Opportunity;
  gradient: string;
  onLaunch: (opp: Opportunity) => void;
  diffStyle: string;
}
const PremiumOpportunityCard: React.FC<PremiumCardProps> = ({ opp, gradient, onLaunch, diffStyle }) => {
  const isCompleted = opp.status === 'completed';

  return (
    <motion.div
      onClick={() => onLaunch(opp)}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className={cn(
        "group relative rounded-3xl border border-white/5 bg-[#09090E] p-6 flex flex-col justify-between h-[340px] cursor-pointer hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden",
        isCompleted && "opacity-60"
      )}
    >
      {/* Dynamic Background Illustration with Lighting depth */}
      <CardArtwork category={opp.category} gradient={gradient} />

      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-text-tertiary">
              {opp.category}
            </span>
            {opp.isNew && (
              <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                New Release
              </span>
            )}
            {opp.isTrending && (
              <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Trending
              </span>
            )}
          </div>
          <span className={cn('text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', diffStyle)}>
            {opp.difficulty}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-black text-white group-hover:text-primary transition-colors leading-snug line-clamp-2">
            {opp.title}
          </h3>
          <p className="text-xs text-text-tertiary leading-relaxed line-clamp-3">
            {opp.description}
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5 relative z-10">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Immediate Reward</p>
            <p className="text-base font-black text-emerald-400 tabular-nums">+{opp.rewardAmount.toLocaleString()}</p>
            <p className="text-[8px] text-text-tertiary font-bold uppercase">PTS · +{opp.xpReward} XP Base</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Est. Time</p>
            <p className="text-xs font-semibold text-white">{opp.estimatedTime}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[8px] text-text-tertiary italic">
            {opp.source === 'internal' ? 'PulseEarn Verified' : `Verified Partner: ${opp.providerName}`}
          </span>

          <button className="px-4.5 py-2.5 rounded-xl bg-primary hover:bg-primary-bright text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-lg shadow-primary/20">
            Start <ArrowUpRight size={11} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── MINI CARD FOR RECOMMENDED ROW SECTIONS (SLIDERS / SLICES) ───────────────
interface MiniCardProps {
  opp: Opportunity;
  onLaunch: (opp: Opportunity) => void;
}
const MiniOpportunityCard: React.FC<MiniCardProps> = ({ opp, onLaunch }) => {
  return (
    <motion.div
      onClick={() => onLaunch(opp)}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="p-5 rounded-2xl border border-white/5 bg-[#09090E] hover:border-primary/20 transition-all flex flex-col justify-between h-[150px] cursor-pointer group relative"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">
            {opp.category}
          </span>
          <span className="text-[8px] text-text-tertiary/80 truncate max-w-[80px]">
            {opp.source === 'internal' ? 'PulseEarn' : opp.providerName}
          </span>
        </div>
        <h3 className="text-xs font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
          {opp.title}
        </h3>
      </div>

      <div className="flex justify-between items-end pt-3 border-t border-white/5">
        <div>
          <p className="text-xs font-black text-emerald-400">+{opp.rewardAmount.toLocaleString()} PTS</p>
          <p className="text-[8px] text-text-tertiary font-bold">+{opp.xpReward} XP</p>
        </div>
        <button className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all">
          <ChevronRight size={12} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── ROW CARD FOR TWO COLUMN SIDE-BY-SIDE HIGHLIGHTS ──────────────────────────
interface RowCardProps {
  opp: Opportunity;
  onLaunch: (opp: Opportunity) => void;
}
const RowOpportunityCard: React.FC<RowCardProps> = ({ opp, onLaunch }) => {
  return (
    <motion.div
      onClick={() => onLaunch(opp)}
      whileHover={{ x: 3, transition: { duration: 0.15 } }}
      className="p-4 rounded-2xl border border-white/5 bg-[#09090E] hover:border-primary/20 transition-all flex items-center justify-between gap-4 cursor-pointer group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#0E0E15] border border-white/5 flex items-center justify-center text-text-tertiary shrink-0 group-hover:text-primary transition-all">
          {opp.category === 'surveys' ? <BarChart3 size={16} /> : opp.category === 'games' ? <Trophy size={16} /> : opp.category === 'daily' ? <Flame size={16} /> : <Compass size={16} />}
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
            {opp.title}
          </h4>
          <p className="text-[10px] text-text-tertiary mt-0.5 truncate">
            {opp.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-xs font-black text-emerald-400">+{opp.rewardAmount.toLocaleString()}</p>
          <p className="text-[8px] text-text-tertiary font-bold uppercase">PTS · +{opp.xpReward} XP</p>
        </div>
        <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-all">
          <ChevronRight size={12} />
        </div>
      </div>
    </motion.div>
  );
};

// ─── FEATURED CAMPAIGN HERO CARD ──────────────────────────────────────────────
interface FeaturedCardProps {
  opp: Opportunity;
  onLaunch: (opp: Opportunity) => void;
}
const FeaturedCampaignCard: React.FC<FeaturedCardProps> = ({ opp, onLaunch }) => {
  return (
    <motion.div
      onClick={() => onLaunch(opp)}
      whileHover={{ y: -4, transition: { duration: 0.15 } }}
      className="relative rounded-3xl border border-white/5 bg-gradient-to-br from-[#12121A] to-[#0A0A0F] p-6 flex flex-col justify-between h-[230px] cursor-pointer hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden group"
    >
      {/* Absolute decorative gradient orb behind card */}
      <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/15 transition-colors duration-300" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 rounded-full blur-[40px] pointer-events-none" />

      <div className="space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-widest">
            <Sparkles size={8} /> FEATURED
          </span>
          <span className="text-[8px] font-black uppercase tracking-widest text-text-tertiary">
            {opp.category}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-black text-white group-hover:text-primary transition-colors leading-tight">
            {opp.title}
          </h3>
          <p className="text-xs text-text-tertiary leading-relaxed line-clamp-2">
            {opp.description}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-end border-t border-white/5 pt-4 relative z-10">
        <div>
          <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">Ecosystem Payload</p>
          <p className="text-lg font-black text-emerald-400">+{opp.rewardAmount.toLocaleString()} <span className="text-xs font-semibold text-text-tertiary">PTS</span></p>
        </div>
        <button className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-bright text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1 shadow-lg shadow-primary/20">
          Participate <ArrowUpRight size={11} />
        </button>
      </div>
    </motion.div>
  );
};

export default Marketplace;
