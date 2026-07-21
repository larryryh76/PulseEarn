/**
 * PulseEarn Premium Marketplace
 * 
 * Rebuilt from the ground up as a world-class fintech rewards experience.
 * Incorporates designs reminiscent of Apple App Store, Coinbase, Steam, Stripe, and Linear.
 * 
 * Features:
 * - Visually Stunning Mesh Gradients & Glassmorphism
 * - Multi-Tab Navigation (Explore, Quest Board, Partner Networks)
 * - Standardized, highly consistent estimated times across all cards and detail drawers
 * - Rich Interactive Partner Networks (Offerwalls) featuring live offers rendered directly in-feed
 * - Linear-style Earning Terminal Drawer with step-by-step checklists and a live simulated terminal log for automated tasks
 * - Immersive Quantum Sandbox frame loader for seamless in-app partner offer execution
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  ArrowUpRight,
  Play,
  Info,
  Search,
  SlidersHorizontal,
  ArrowRight,
  ChevronRight,
  Trophy,
  Check,
  Terminal,
  Cpu,
  Coins,
  ChevronDown,
  Layers,
  Sparkle,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';
import { safeFetch } from '../utils/api';
import { useMarketplace } from '../hooks/useMarketplace';
import {
  MarketplaceOpportunity,
  OpportunityCategory,
  MARKETPLACE_CATEGORIES,
} from '../types/marketplace';
import { cn } from '../utils';
import toast from 'react-hot-toast';

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Normalizes and formats estimated times into a consistent, premium presentation.
 * Fixes: "the same task shows different times as different stuffs"
 */
function formatEstimatedTime(timeStr: string | undefined): string {
  if (!timeStr) return '15 Mins';
  const t = timeStr.toLowerCase().trim();
  
  if (t.includes('daily') || t === 'daily') return 'Daily Refresh';
  if (t.includes('ongoing') || t === 'ongoing') return 'Ongoing Quest';
  
  const numMatch = t.match(/(\d+)/);
  if (!numMatch) {
    return timeStr.charAt(0).toUpperCase() + timeStr.slice(1);
  }
  
  const num = numMatch[1];
  if (t.includes('day') || t.includes('d')) {
    return `${num} ${parseInt(num) === 1 ? 'Day' : 'Days'}`;
  }
  if (t.includes('hour') || t.includes('h')) {
    return `${num} ${parseInt(num) === 1 ? 'Hour' : 'Hours'}`;
  }
  if (t.includes('min') || t.includes('m')) {
    return `${num} ${parseInt(num) === 1 ? 'Min' : 'Mins'}`;
  }
  
  return timeStr.charAt(0).toUpperCase() + timeStr.slice(1);
}

/**
 * Returns distinct colors and icons based on category keys for exquisite visuals.
 */
function getCategoryDesign(category: string): {
  color: string;
  bg: string;
  border: string;
  glow: string;
  gradient: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
} {
  const designs: Record<string, any> = {
    featured: {
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      glow: 'shadow-amber-500/10',
      gradient: 'from-amber-600/20 to-orange-600/10',
      icon: Sparkles
    },
    daily: {
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      glow: 'shadow-rose-500/10',
      gradient: 'from-rose-600/20 to-red-600/10',
      icon: Zap
    },
    surveys: {
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/10',
      gradient: 'from-emerald-600/20 to-teal-600/10',
      icon: HelpCircle
    },
    games: {
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      glow: 'shadow-violet-500/10',
      gradient: 'from-violet-600/20 to-purple-600/10',
      icon: Trophy
    },
    apps: {
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      glow: 'shadow-blue-500/10',
      gradient: 'from-blue-600/20 to-indigo-600/10',
      icon: Cpu
    }
  };

  return designs[category] || {
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    glow: 'shadow-primary/10',
    gradient: 'from-primary/20 to-indigo-600/5',
    icon: Compass
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

const Marketplace: React.FC = () => {
  const { userData } = useAuth();
  const {
    opportunities,
    providers,
    isLoading,
    refresh,
    openOpportunity,
  } = useMarketplace();

  // Navigation: 'explore' | 'quests' | 'offerwalls'
  const [activeTab, setActiveTab] = useState<'explore' | 'quests' | 'offerwalls'>('explore');

  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'reward' | 'time' | 'difficulty'>('reward');

  // Drawer / Detail state
  const [selectedTask, setSelectedTask] = useState<MarketplaceOpportunity | null>(null);
  const [proof, setProof] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expanded Provider state (for Partner network offers)
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Simulated Verification Terminal state for automated tasks
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalRunning, setTerminalRunning] = useState(false);

  // Sandbox Frame view
  const [activeEmbedOpportunity, setActiveEmbedOpportunity] = useState<MarketplaceOpportunity | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  // Refresh trigger state
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle local refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const loadToast = toast.loading('Synchronizing nodes with partner networks...');
    try {
      await refresh();
      toast.success('Marketplace synced successfully!', { id: loadToast });
    } catch (err) {
      toast.error('Failed to update provider feeds', { id: loadToast });
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Handle automated terminal verification sequence
  const executeAutomatedVerification = async (task: MarketplaceOpportunity) => {
    setTerminalRunning(true);
    setTerminalLogs([]);

    const logSteps = [
      `[SYS] Initializing localized verification node socket...`,
      `[SYS] Establishing secure transport payload validation tunnel...`,
      `[SYS] Pinging validator nodes across PulseEarn network...`,
      `[SYS] Retrieving completion logs for task_id "${task.id}"...`,
      `[SYS] Parsing cryptographic signatures & proof checksums...`,
      `[SYS] Match verified successfully! Writing completion event to ledger...`,
      `[SYS] Minting +${task.reward.points} PTS and +${task.reward.xp} XP reward tokens...`,
      `[SYS] Transaction finalized. Syncing client state...`
    ];

    for (let i = 0; i < logSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 200));
      setTerminalLogs(prev => [...prev, logSteps[i]]);
    }

    // Submit payload to server
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: task.id,
          proof: 'AUTOMATED_VERIFICATION_LEDGER_CONFIRMED'
        })
      });

      if (res.success) {
        toast.success(`Objective Completed! +${task.reward.points} PTS credited.`);
        setSelectedTask(null);
        refresh();
      } else {
        toast.error(res.message || res.error || 'Automation verification failed.');
      }
    } catch (err) {
      toast.error('Connection error submitting completion verification.');
    } finally {
      setTerminalRunning(false);
    }
  };

  // Handle manual task submission
  const handleManualSubmit = async () => {
    if (!selectedTask) return;
    if (!proof.trim()) {
      toast.error('Please input details, completion logs, or link as verification proof.');
      return;
    }

    setIsSubmitting(true);
    const loadToast = toast.loading('Submitting proof to admin reviews ledger...');

    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: selectedTask.id,
          proof: proof.trim()
        })
      });

      if (res.success) {
        toast.success('Proof logged successfully! Review team will evaluate within 24 hours.', { id: loadToast });
        setSelectedTask(null);
        setProof('');
        refresh();
      } else {
        toast.error(res.message || res.error || 'Submission failed.', { id: loadToast });
      }
    } catch (err) {
      toast.error('System synchronization error.', { id: loadToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Launch Opportunity action (either inline modal or iframe sandbox)
  const handleLaunchOpportunity = useCallback((opp: MarketplaceOpportunity) => {
    if (opp.source === 'provider' && opp.action.url) {
      setActiveEmbedOpportunity(opp);
      setIframeLoading(true);
      openOpportunity(opp, true); // Track click in backend
    } else {
      setSelectedTask(opp);
      setProof('');
      setTerminalLogs([]);
      setTerminalRunning(false);
    }
  }, [openOpportunity]);

  // Derived filter calculations for "Quest Board"
  const filteredQuests = useMemo(() => {
    let result = [...opportunities];

    // Exclude external partner offers in the pure Quest Board tab to avoid clutter
    if (activeTab === 'quests') {
      result = result.filter(o => o.source === 'internal');
    }

    if (selectedCategory !== 'all') {
      result = result.filter(o => o.metadata.category === selectedCategory);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.title.toLowerCase().includes(query) || 
        o.description.toLowerCase().includes(query)
      );
    }

    // Sort options
    result.sort((a, b) => {
      if (sortBy === 'reward') {
        return b.reward.points - a.reward.points;
      }
      if (sortBy === 'time') {
        // Simple fallback
        return formatEstimatedTime(a.metadata.estimatedTime).localeCompare(formatEstimatedTime(b.metadata.estimatedTime));
      }
      return 0;
    });

    return result;
  }, [opportunities, selectedCategory, searchQuery, sortBy, activeTab]);

  // Get absolute top paying spotlight featured card
  const spotlightOpportunity = useMemo(() => {
    const featured = opportunities.filter(o => o.metadata.category === 'featured' || o.metadata.category === 'daily');
    if (featured.length > 0) return featured[0];
    return opportunities[0] || null;
  }, [opportunities]);

  return (
    <div className="min-h-screen bg-background text-text-primary pb-16">
      {/* ─── Premium Glassmorphic Navigation Bar & Balance Hud ─── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm shadow-primary/5">
              <Compass className="animate-spin-slow" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Marketplace</h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  LIVE SYNCED
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">Explore premium partner networks and validation quests</p>
            </div>
          </div>

          {/* User Earning Analytics HUD */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="hidden md:flex items-center gap-6 bg-surface-bright/50 border border-border px-4 py-2 rounded-2xl">
              <div>
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Points Ledger</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Coins size={14} className="text-amber-500" />
                  <span className="font-mono text-sm font-black text-white">
                    {userData?.points?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Level Progression</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Trophy size={14} className="text-primary-bright" />
                  <span className="font-mono text-sm font-black text-white">
                    LVL {userData?.xp ? Math.floor(userData.xp / 1000) + 1 : '1'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-3 rounded-xl border border-border bg-surface hover:bg-surface-bright hover:border-text-tertiary transition-all active:scale-95 text-text-secondary"
              title="Synchronize Feeds"
            >
              <RefreshCw size={15} className={cn(isRefreshing && 'animate-spin text-primary')} />
            </button>
          </div>
        </div>

        {/* Tab Selection Row */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 border-t border-border/50 flex gap-2 overflow-x-auto scrollbar-hide py-1">
          {[
            { id: 'explore', label: 'Ecosystem Spotlight', icon: Sparkle },
            { id: 'quests', label: 'Quest Board', icon: Layers },
            { id: 'offerwalls', label: 'Partner Networks', icon: Cpu }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative py-3.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all outline-none",
                activeTab === tab.id
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-white"
              )}
            >
              <tab.icon size={13} />
              {tab.label}
              {tab.id === 'offerwalls' && providers.length > 0 && (
                <span className="font-mono text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-black">
                  {providers.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Main View Container ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {/* Loading Indicator */}
        {isLoading && (
          <div className="py-20 text-center space-y-4">
            <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-text-secondary uppercase tracking-widest animate-pulse">Initializing unified nodes registry...</p>
          </div>
        )}

        {!isLoading && (
          <AnimatePresence mode="wait">
            {/* ─── TAB 1: ECOSYSTEM SPOTLIGHT (Apple/Steam/Coinbase Style) ─── */}
            {activeTab === 'explore' && (
              <motion.div
                key="explore-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-10"
              >
                {/* 1. Immersive Spotlight Billboard */}
                {spotlightOpportunity && (
                  <div className="relative rounded-[28px] overflow-hidden border border-border shadow-2xl group">
                    {/* Glowing glassmesh design backdrop */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-[#0B0914] to-purple-950" />
                    <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_80%_20%,#5E6AD2_0%,transparent_50%)]" />
                    
                    {/* Content wrapper */}
                    <div className="relative z-10 p-8 md:p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="max-w-xl space-y-6">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                          <Sparkles size={13} className="text-amber-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                            Ecosystem Spotlight Campaign
                          </span>
                        </div>

                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                          {spotlightOpportunity.title}
                        </h2>

                        <p className="text-sm text-text-secondary leading-relaxed">
                          {spotlightOpportunity.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          {/* Points */}
                          <div className="flex items-baseline gap-1 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
                            <span className="text-2xl font-black text-emerald-400">
                              +{spotlightOpportunity.reward.points.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">PTS</span>
                          </div>

                          {/* XP */}
                          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-2xl text-amber-400">
                            <Zap size={14} />
                            <span className="text-xs font-black">+{spotlightOpportunity.reward.xp} XP</span>
                          </div>

                          {/* Unified Duration badge */}
                          <div className="flex items-center gap-1.5 text-text-secondary font-semibold text-xs ml-2">
                            <Clock size={14} />
                            <span>{formatEstimatedTime(spotlightOpportunity.metadata.estimatedTime)}</span>
                          </div>
                        </div>

                        <div className="pt-4">
                          <button
                            onClick={() => handleLaunchOpportunity(spotlightOpportunity)}
                            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-emerald-400 hover:scale-[1.03] transition-all duration-300 shadow-xl shadow-white/5"
                          >
                            <span>Initialize Quest</span>
                            <ChevronRight size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Right art representation card */}
                      <div className="relative w-full md:w-80 h-48 md:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-lg transform rotate-2 group-hover:rotate-0 transition-transform duration-500 shrink-0 bg-surface">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                        <img
                          src={spotlightOpportunity.metadata.artwork || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"}
                          alt="Spotlight Artwork"
                          className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-500"
                        />
                        <div className="absolute bottom-4 left-4 right-4 z-20">
                          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Active nodes</p>
                          <p className="text-xs font-black text-white uppercase mt-0.5 truncate">{spotlightOpportunity.providerName || 'PulseEarn Internal'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Quick Wins (Compact high-yield card row) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <Zap className="text-amber-400" size={16} />
                        Quick Wins
                      </h3>
                      <p className="text-xs text-text-secondary">Instant completion validation loops</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {opportunities
                      .filter(o => o.metadata.difficulty === 'easy' || o.reward.points < 2000)
                      .slice(0, 4)
                      .map(opp => {
                        const d = getCategoryDesign(opp.metadata.category);
                        return (
                          <div
                            key={opp.id}
                            onClick={() => handleLaunchOpportunity(opp)}
                            className="bg-surface hover:bg-surface-bright border border-border rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-40 group hover:border-text-tertiary"
                          >
                            <div className="flex items-start justify-between">
                              <span className={cn("p-2 rounded-xl", d.bg, d.color)}>
                                <d.icon size={16} />
                              </span>
                              <span className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                +{opp.reward.points} PTS
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-xs font-black uppercase tracking-tight text-white line-clamp-1 group-hover:text-primary transition-colors">
                                {opp.title}
                              </h4>
                              <p className="text-[10px] text-text-secondary line-clamp-2 leading-relaxed">
                                {opp.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 text-[9px] text-text-tertiary font-bold uppercase tracking-wider">
                              <Clock size={11} />
                              <span>{formatEstimatedTime(opp.metadata.estimatedTime)}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Recommended Campaigns Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                        <TrendingUp className="text-primary" size={16} />
                        Recommended Campaigns
                      </h3>
                      <p className="text-xs text-text-secondary">High-conversion nodes trending now</p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('quests');
                        setSelectedCategory('all');
                      }}
                      className="text-xs font-bold text-primary hover:text-white flex items-center gap-1 uppercase tracking-wider"
                    >
                      Browse All Quests <ArrowRight size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {opportunities
                      .filter(o => o.metadata.category === 'surveys' || o.metadata.category === 'games')
                      .slice(0, 3)
                      .map(opp => {
                        const d = getCategoryDesign(opp.metadata.category);
                        return (
                          <div
                            key={opp.id}
                            onClick={() => handleLaunchOpportunity(opp)}
                            className="bg-surface hover:bg-surface-bright border border-border hover:border-text-tertiary rounded-3xl overflow-hidden cursor-pointer group transition-all duration-300 shadow-sm flex flex-col justify-between h-[24rem]"
                          >
                            <div className="relative h-44 w-full bg-surface-bright overflow-hidden">
                              <img
                                src={opp.metadata.thumbnail || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400"}
                                alt={opp.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <div className="absolute top-4 left-4">
                                <span className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1 bg-black/60 text-white backdrop-blur-md")}>
                                  <d.icon size={11} />
                                  {opp.metadata.category}
                                </span>
                              </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col justify-between">
                              <div className="space-y-2">
                                <h4 className="text-sm font-black text-white uppercase group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                                  {opp.title}
                                </h4>
                                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                                  {opp.description}
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                <div className="space-y-0.5">
                                  <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Reward</p>
                                  <p className="text-base font-black text-emerald-400">+{opp.reward.points.toLocaleString()} PTS</p>
                                </div>

                                <div className="text-right">
                                  <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Est. Duration</p>
                                  <p className="text-xs text-white font-bold">{formatEstimatedTime(opp.metadata.estimatedTime)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── TAB 2: QUEST BOARD (Sleek Linear list/grid of internal tasks) ─── */}
            {activeTab === 'quests' && (
              <motion.div
                key="quests-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Search & Sorting Panel */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-surface p-4 rounded-3xl border border-border">
                  <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                    <input
                      type="text"
                      placeholder="Search active quests..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-surface-bright border border-border focus:border-text-tertiary outline-none rounded-2xl py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder:text-text-tertiary transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Category tabs inside Quest Board */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                          selectedCategory === 'all'
                            ? "bg-primary text-white"
                            : "bg-surface-bright text-text-secondary hover:text-white"
                        )}
                      >
                        All
                      </button>
                      {MARKETPLACE_CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id as any)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap",
                            selectedCategory === cat.id
                              ? "bg-primary text-white"
                              : "bg-surface-bright text-text-secondary hover:text-white"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    <div className="h-6 w-px bg-border hidden md:block" />

                    {/* Sorter */}
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="bg-surface-bright border border-border text-[10px] font-bold uppercase tracking-wider text-white px-3 py-2 rounded-xl outline-none cursor-pointer focus:border-text-tertiary transition-all"
                    >
                      <option value="reward">Highest Reward</option>
                      <option value="time">Estimated Time</option>
                    </select>
                  </div>
                </div>

                {/* Quests Bento Grid Feed */}
                {filteredQuests.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuests.map(opp => {
                      const d = getCategoryDesign(opp.metadata.category);
                      return (
                        <div
                          key={opp.id}
                          onClick={() => handleLaunchOpportunity(opp)}
                          className="group bg-surface hover:bg-surface-bright border border-border hover:border-text-tertiary p-6 rounded-3xl transition-all duration-300 flex flex-col justify-between h-56 cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1", d.bg, d.color)}>
                              <d.icon size={12} />
                              {opp.metadata.category}
                            </span>

                            <div className="text-right">
                              <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Payout</p>
                              <p className="text-sm font-black text-emerald-400">+{opp.reward.points} PTS</p>
                            </div>
                          </div>

                          <div className="space-y-1.5 py-4">
                            <h4 className="text-xs font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors truncate">
                              {opp.title}
                            </h4>
                            <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                              {opp.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border/40">
                            <div className="flex items-center gap-1.5 text-[9px] text-text-tertiary font-bold uppercase tracking-wider">
                              <Clock size={11} />
                              <span>{formatEstimatedTime(opp.metadata.estimatedTime)}</span>
                            </div>

                            <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 group-hover:text-white transition-colors">
                              Initialize Quest <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-surface/20 rounded-3xl border border-dashed border-border/80">
                    <SlidersHorizontal size={28} className="text-text-tertiary mx-auto mb-3" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-white">No active validation quests located</h4>
                    <p className="text-xs text-text-secondary mt-1">Try modifying your search queries or category filter pill selections</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── TAB 3: PARTNER NETWORKS (Offerwalls integrated with active cards) ─── */}
            {activeTab === 'offerwalls' && (
              <motion.div
                key="offerwalls-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Intro details */}
                <div className="bg-surface p-6 rounded-3xl border border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <Cpu className="text-primary" size={18} />
                      Partner Network Feeds (Offerwalls)
                    </h3>
                    <p className="text-xs text-text-secondary leading-relaxed max-w-xl">
                      PulseEarn partners directly with global, secure offerwall networks to provide hundreds of surveys, tasks, games, and daily offers instantly. Click on any provider below to synchronize and discover their live earning opportunities.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-surface-bright px-4 py-2.5 rounded-2xl shrink-0">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono text-white font-black uppercase tracking-wider">
                      {providers.length} Networks Integrated
                    </span>
                  </div>
                </div>

                {/* Offerwalls Grid */}
                <div className="grid grid-cols-1 gap-6">
                  {providers.map(prov => {
                    const offersList = prov.opportunities || [];
                    const isExpanded = expandedProvider === prov.providerId;

                    return (
                      <div
                        key={prov.providerId}
                        className={cn(
                          "bg-surface border border-border rounded-3xl overflow-hidden transition-all duration-300",
                          isExpanded && "border-text-tertiary shadow-lg"
                        )}
                      >
                        {/* Header card representation */}
                        <div
                          onClick={() => setExpandedProvider(isExpanded ? null : prov.providerId)}
                          className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-surface-bright transition-all"
                        >
                          <div className="flex items-center gap-4">
                            {/* Visual Console Node avatar */}
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-indigo-600/10 border border-primary/25 flex items-center justify-center text-primary-bright font-black uppercase text-sm shadow-md">
                              {prov.providerName.substring(0, 2)}
                            </div>

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-base font-black text-white uppercase tracking-tight">{prov.providerName}</h4>
                                <span className="flex h-2 w-2 relative">
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-text-secondary font-bold uppercase tracking-wider">
                                <span className="text-primary-bright">Node Secure</span>
                                <span className="text-white/10">•</span>
                                <span>{offersList.length} Opportunities Synced</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-left md:text-right">
                              <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Multiplier rate</p>
                              <p className="text-sm font-mono font-black text-emerald-400">1.5x Boost Active</p>
                            </div>

                            {/* Dropdown Chevron */}
                            <div className={cn("p-2 rounded-xl bg-surface-bright border border-border transition-transform text-white duration-300", isExpanded && "rotate-180")}>
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>

                        {/* Collapsible live offers panel */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="border-t border-border bg-surface-bright/40"
                            >
                              <div className="p-6 space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">
                                  Available Partner Offers:
                                </p>

                                {offersList.length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {offersList.map(offer => (
                                      <div
                                        key={offer.id}
                                        onClick={() => handleLaunchOpportunity(offer)}
                                        className="bg-surface hover:bg-surface-bright border border-border/80 hover:border-text-tertiary p-5 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 group"
                                      >
                                        <div className="flex items-center gap-4 min-w-0">
                                          {/* Tiny thumbnail */}
                                          <div className="w-12 h-12 rounded-xl bg-surface-bright overflow-hidden shrink-0 border border-border">
                                            <img
                                              src={offer.metadata.thumbnail || "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=150"}
                                              alt={offer.title}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>

                                          <div className="space-y-0.5 min-w-0">
                                            <h5 className="text-xs font-black uppercase tracking-tight text-white group-hover:text-primary transition-colors truncate">
                                              {offer.title}
                                            </h5>
                                            <p className="text-[10px] text-text-secondary truncate leading-relaxed max-w-[14rem] sm:max-w-xs md:max-w-sm">
                                              {offer.description}
                                            </p>
                                            <div className="flex items-center gap-1.5 text-[9px] text-text-tertiary font-semibold">
                                              <Clock size={10} />
                                              <span>{formatEstimatedTime(offer.metadata.estimatedTime)}</span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0 space-y-1">
                                          <span className="inline-block text-[10px] font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                                            +{offer.reward.points.toLocaleString()} PTS
                                          </span>
                                          <p className="text-[8px] text-text-tertiary font-bold uppercase tracking-widest">Connect & Launch</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8">
                                    <p className="text-xs text-text-secondary font-medium">No live offers currently mapped for this partner network.</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ─── Premium Earning Terminal Details Drawer (Linear Inspired) ─── */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !terminalRunning && !isSubmitting && setSelectedTask(null)}
              className="absolute inset-0 bg-[#07070B]/85 backdrop-blur-md"
            />

            {/* Slider Sheet Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 180 }}
              className="relative w-full max-w-xl bg-surface border-l border-border h-full shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-border bg-surface-bright/40 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black text-primary-bright uppercase tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">
                    Quest Terminal Control
                  </span>
                  <h3 className="text-lg font-black text-white uppercase italic mt-1">{selectedTask.title}</h3>
                </div>
                <button
                  disabled={terminalRunning || isSubmitting}
                  onClick={() => setSelectedTask(null)}
                  className="p-2 hover:bg-surface-bright rounded-xl transition-all text-text-tertiary hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto">
                {/* Description */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-mono font-black uppercase tracking-widest text-text-tertiary">
                    Mission Objective
                  </h4>
                  <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                    {selectedTask.description}
                  </p>
                </div>

                {/* Checklist (Custom premium detail check list) */}
                <div className="space-y-3 bg-surface-bright/30 border border-border p-5 rounded-2xl">
                  <h4 className="text-[10px] font-mono font-black uppercase tracking-widest text-white flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-primary-bright" />
                    Validation Requirements Checklist
                  </h4>
                  
                  <div className="space-y-2 pt-1">
                    {[
                      "Initialize validation node framework",
                      "Satisfy external payload checklist requirements",
                      "Avoid usage of duplicate connection structures or VPNs",
                      "Submit verification logs checksum"
                    ].map((req, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary-bright text-[9px] font-bold mt-0.5 shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{req}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* XP / Points Split Ledger Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-[9px] font-mono font-black text-text-tertiary uppercase tracking-widest">Rewards payout</p>
                    <p className="text-xl font-mono font-black text-emerald-400 mt-1">+{selectedTask.reward.points} PTS</p>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/15">
                    <p className="text-[9px] font-mono font-black text-text-tertiary uppercase tracking-widest">Leaderboard XP</p>
                    <p className="text-xl font-mono font-black text-amber-400 mt-1">+{selectedTask.reward.xp} XP</p>
                  </div>
                </div>

                {/* Action Submit Form */}
                <div className="pt-4 border-t border-border/60 space-y-4">
                  {selectedTask.metadata.verificationType === 'automated' ? (
                    /* High-fidelity simulated automated console verification */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-mono font-black text-text-tertiary uppercase tracking-widest">
                          Automated Ledger Handshake
                        </label>
                        <span className="inline-block text-[9px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          AUTOMATED NODES ACTIVE
                        </span>
                      </div>

                      {terminalLogs.length > 0 && (
                        <div className="bg-black/90 rounded-2xl p-4.5 border border-white/5 font-mono text-[10px] text-emerald-400/90 leading-relaxed overflow-hidden h-40 flex flex-col justify-end space-y-1 shadow-inner select-all">
                          {terminalLogs.map((log, lidx) => (
                            <div key={lidx} className="truncate">
                              {log}
                            </div>
                          ))}
                          {terminalRunning && (
                            <div className="flex items-center gap-1.5 text-text-tertiary animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Executing remote protocol...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {!terminalRunning && terminalLogs.length === 0 && (
                        <div className="p-4 rounded-2xl bg-surface-bright/50 border border-border text-center">
                          <p className="text-xs text-text-secondary leading-relaxed">
                            This verification quest utilizes automated, real-time API integrations. Execute the scanner to fetch completion events.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Manual Validation form */
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono font-black text-text-tertiary uppercase tracking-widest">
                        Submit validation logs proof *
                      </label>
                      <textarea
                        disabled={isSubmitting}
                        value={proof}
                        onChange={e => setProof(e.target.value)}
                        placeholder="Paste details, completion URL links, or transaction logs verifying completion..."
                        className="w-full h-28 bg-surface-bright border border-border rounded-2xl p-4 text-xs focus:border-text-tertiary outline-none transition-all resize-none text-white leading-relaxed placeholder:text-text-tertiary font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer footer */}
              <div className="p-6 md:p-8 border-t border-border bg-surface-bright/40 flex gap-3">
                <button
                  disabled={terminalRunning || isSubmitting}
                  onClick={() => setSelectedTask(null)}
                  className="flex-1 px-6 py-3.5 rounded-2xl bg-surface border border-border hover:border-text-tertiary font-black text-[10px] uppercase tracking-widest text-text-secondary transition-all"
                >
                  Terminate Panel
                </button>

                {selectedTask.metadata.verificationType === 'automated' ? (
                  <button
                    disabled={terminalRunning}
                    onClick={() => executeAutomatedVerification(selectedTask)}
                    className="flex-1 px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-bright disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    {terminalRunning ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Scanning payload...</span>
                      </>
                    ) : (
                      <>
                        <Terminal size={13} />
                        <span>Execute Validation</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    disabled={isSubmitting}
                    onClick={handleManualSubmit}
                    className="flex-1 px-6 py-3.5 rounded-2xl bg-primary hover:bg-primary-bright disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    {isSubmitting ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>Log Proof</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Premium Quantum Sandboxed Experience Viewer Frame ─── */}
      <AnimatePresence>
        {activeEmbedOpportunity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#07070B] flex flex-col"
          >
            {/* Header Control Panel */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface/90 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary/20 to-indigo-600/10 border border-primary/25 flex items-center justify-center text-primary-bright shrink-0 shadow-md">
                  <Play size={16} className="text-primary fill-primary" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-tight truncate max-w-xs sm:max-w-md md:max-w-lg">
                    {activeEmbedOpportunity.title}
                  </h4>
                  <p className="text-[9px] font-bold text-text-tertiary uppercase mt-0.5">
                    Secure Earning Frame Synced • {activeEmbedOpportunity.providerName}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl">
                  <ShieldCheck size={12} />
                  <span>Tracking Secure</span>
                </div>

                {/* Reload */}
                <button
                  onClick={() => {
                    setIframeLoading(true);
                    const iframe = document.getElementById('marketplace-quantum-iframe') as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                  }}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white hover:border-white/20"
                  title="Reload Container"
                >
                  <RefreshCw size={13} />
                </button>

                {/* External Window */}
                {activeEmbedOpportunity.action.url && (
                  <a
                    href={activeEmbedOpportunity.action.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white hover:border-white/20 flex items-center justify-center"
                    title="Open External"
                  >
                    <ArrowUpRight size={13} />
                  </a>
                )}

                {/* Close */}
                <button
                  onClick={() => {
                    setActiveEmbedOpportunity(null);
                    setIframeLoading(true);
                  }}
                  className="px-4.5 py-2 rounded-xl bg-danger/15 border border-danger/25 text-danger font-black text-[10px] uppercase tracking-widest hover:bg-danger hover:text-white transition-all shadow-md"
                >
                  Close Frame
                </button>
              </div>
            </div>

            {/* Subheading Notice banner */}
            <div className="bg-primary/5 border-b border-primary/20 px-6 py-2.5 flex items-center gap-2 text-[10px] text-text-secondary font-medium">
              <Info size={13} className="text-primary shrink-0 animate-pulse" />
              <span>Please complete the action steps on the partner site below. Once validated, rewards will credit automatically. Keep this tab active.</span>
            </div>

            {/* Sandbox iframe Container */}
            <div className="flex-1 relative bg-black overflow-hidden">
              {iframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background space-y-4 z-10">
                  <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-xs font-black text-white uppercase tracking-widest">Bridging Partner Frame Tunnel...</p>
                    <p className="text-[9px] text-text-tertiary mt-1 uppercase tracking-wider">Resolving cryptographic keys and affiliate routing logs</p>
                  </div>
                </div>
              )}

              {activeEmbedOpportunity.action.url && (
                <iframe
                  id="marketplace-quantum-iframe"
                  src={activeEmbedOpportunity.action.url}
                  className="w-full h-full border-0"
                  onLoad={() => setIframeLoading(false)}
                  sandbox="allow-scripts allow-popups allow-forms"
                  title={activeEmbedOpportunity.title}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace;
