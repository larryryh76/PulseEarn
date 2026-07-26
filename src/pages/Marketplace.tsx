import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Compass, Filter, Search, RefreshCw,
  ArrowUpRight, Clock, Trophy, Flame, CheckCircle2, ChevronRight,
  X, Layers, Activity, Info, Lock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTaskContext } from '../contexts/TaskContext';
import { safeFetch } from '../utils/api';
import { validateExternalUrl } from '../utils/security';
import toast from 'react-hot-toast';
import { cn } from '../utils';

import {
  MarketplaceOpportunity,
  OpportunityCategory,
  OpportunityDifficulty,
  MARKETPLACE_CATEGORIES,
  DIFFICULTY_CONFIG,
} from '../types/marketplace';

import {
  initializeMarketplace,
  updateUserContext,
  updateProviderInventory,
  search,
  getMarketplaceState,
} from '../engines/marketplace/MarketplaceEngine';

import {
  generateAllSections,
} from '../engines/marketplace/RecommendationEngine';

import LaunchEngine, { launchOpportunity, trackLaunch } from '../engines/marketplace/LaunchEngine';

// ─── Provider Interface ───────────────────────────────────────────────────────
export interface Provider {
  id: string;
  name: string;
  logo?: string;
  status?: 'active' | 'degraded' | 'maintenance' | 'offline' | string;
  enabled?: boolean;
  apiEndpoint?: string;
  callbackUrl?: string;
  rewardMultiplier?: number;
  userSharePct?: number;
  platformSharePct?: number;
  priority?: number;
  description?: string;
  affiliateId?: string;
  minimumReward?: number;
  maximumReward?: number;
  launchUrl?: string | null;
  embeddable?: boolean;
}

// ─── Canonical Status Helper ──────────────────────────────────────────────────
export function getCanonicalStatus(status: string | undefined): {
  label: string;
  badgeClass: string;
  isActionable: boolean;
} {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'started':
      return {
        label: 'In Progress',
        badgeClass: 'bg-primary/10 border-primary/20 text-primary',
        isActionable: true,
      };
    case 'pending':
    case 'pending_review':
    case 'submitted':
    case 'awaiting_verification':
      return {
        label: 'Pending Review',
        badgeClass: 'bg-warning/10 border-warning/20 text-warning',
        isActionable: false,
      };
    case 'completed':
    case 'claimed':
    case 'verified':
      return {
        label: 'Completed',
        badgeClass: 'bg-success/10 border-success/20 text-success',
        isActionable: false,
      };
    case 'rejected':
      return {
        label: 'Rejected',
        badgeClass: 'bg-danger/10 border-danger/20 text-danger',
        isActionable: true,
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
      };
    case 'expired':
      return {
        label: 'Expired',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
      };
    case 'cooldown':
    case 'on_cooldown':
      return {
        label: 'On Cooldown',
        badgeClass: 'bg-surface-bright border-border text-text-tertiary',
        isActionable: false,
      };
    default:
      return {
        label: 'Available',
        badgeClass: 'bg-surface-bright border-border text-text-secondary',
        isActionable: true,
      };
  }
}

export const Marketplace: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const { userTasks, tasks, campaigns, activities, taskHistory, unifiedHistory } = useTaskContext();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [engineVersion, setEngineVersion] = useState<number>(0);

  // ─── Filter & Search State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<OpportunityDifficulty | 'all'>('all');
  const [minRewardFilter, setMinRewardFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'recommended' | 'reward' | 'time' | 'difficulty' | 'newest'>('recommended');
  
  // ─── Drawer Selection State ──────────────────────────────────────────────
  const [selectedOpportunity, setSelectedOpportunity] = useState<MarketplaceOpportunity | null>(null);

  // ─── Progression Tier Strategy ──────────────────────────────────────────────
  const progressionTier = useMemo(() => {
    const level = userData?.level || 1;
    const completedCount = userData?.stats?.tasksCompleted || 0;
    if (level >= 10 || completedCount >= 25) {
      return { name: 'Pro Earner', level, badge: 'Elite Tier', color: 'text-primary bg-primary/10 border-primary/20' };
    }
    if (level >= 3 || completedCount >= 5) {
      return { name: 'Verified Earner', level, badge: 'Tier 2', color: 'text-success bg-success/10 border-success/20' };
    }
    return { name: 'Starter Earner', level, badge: 'Tier 1', color: 'text-text-secondary bg-surface-bright border-border' };
  }, [userData]);

  // ─── Synchronize Marketplace Engine State ───────────────────────────────────
  useEffect(() => {
    if (tasks.length > 0 || campaigns.length > 0) {
      initializeMarketplace(tasks, campaigns, userTasks);
      updateUserContext(tasks, campaigns, userTasks, userData);
      setEngineVersion(v => v + 1);
    }
  }, [tasks, campaigns, userTasks, userData]);

  // ─── Fetch Enabled Providers from Backend (Firestore Source of Truth) ──────
  const fetchProviders = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const idToken = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/user-providers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (res.success && Array.isArray(res.providers)) {
        setProviders(res.providers);

        // Feed provider inventory into Marketplace Engine
        const currentEngineState = getMarketplaceState();
        res.providers.forEach((p: Provider) => {
          const match = currentEngineState.providers.find(inv => inv.providerId === p.id);
          const existingOpps = match?.opportunities || [];
          updateProviderInventory({
            providerId: p.id,
            providerName: p.name,
            opportunities: existingOpps,
            lastSyncedAt: new Date(),
            connectionStatus: p.status === 'degraded' ? 'degraded' : p.status === 'offline' || p.status === 'maintenance' ? 'offline' : 'connected',
          });
        });
        setEngineVersion(v => v + 1);
      } else {
        setProviders([]);
      }
    } catch (err) {
      console.error('[Marketplace] Failed to fetch providers:', err);
      setError('Unable to load Marketplace providers at this time.');
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchProviders();
    }
  }, [currentUser, fetchProviders]);



  // ─── Handle Opportunity Action ──────────────────────────────────────────────
  const handleOpportunityAction = async (opp: MarketplaceOpportunity) => {
    if (!currentUser) {
      toast.error('Please sign in to launch opportunities.');
      return;
    }

    try {
      // Delegate all launch logic to LaunchEngine - handles URL validation, provider capabilities, etc.
      const result = await launchOpportunity(opp, currentUser.uid);
      
      if (!result.success) {
        toast.error(result.error || `Unable to launch ${opp.title}.`);
        return;
      }

      // Track the launch event
      await trackLaunch(opp, currentUser.uid, result.trackingId);

      // Provide user feedback based on launch type
      if (result.url) {
        toast.success(`Launching ${opp.title}...`);
      } else if (opp.action.actionType === 'claim' || opp.action.actionType === 'complete') {
        toast(`Claim submitted for ${opp.title}. Verifying completion...`, { icon: 'ℹ️' });
      }
    } catch (err) {
      console.error('[Marketplace] Launch error:', err);
      toast.error(`Failed to launch ${opp.title}. Please try again.`);
    }
  };

  // ─── Filter Reset Callback ──────────────────────────────────────────────────
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setMinRewardFilter(0);
    setSortBy('recommended');
  }, []);

  // ─── Dynamic Marketplace Engine State & Search Derived Results ──────────────
  const { opportunities: engineOpportunities } = getMarketplaceState();

  const searchResults = useMemo(() => {
    return search({
      query: searchQuery,
      filters: {
        categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        difficulty: selectedDifficulty !== 'all' ? [selectedDifficulty] : undefined,
        minReward: minRewardFilter > 0 ? minRewardFilter : undefined,
      },
      sortBy: sortBy === 'recommended' ? 'recommendation_score' : sortBy,
      limit: 100,
    });
  }, [searchQuery, selectedCategory, selectedDifficulty, minRewardFilter, sortBy, engineOpportunities, engineVersion]);

  const dynamicSections = useMemo(() => {
    return generateAllSections(engineOpportunities, userData, activities, taskHistory);
  }, [engineOpportunities, userData, activities, taskHistory, engineVersion]);

  // ─── Active Continuity Journey ───────────────────────────────────────────────
  const activeTaskSummary = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const activeList = [];

    for (const ut of Object.values(userTasks)) {
      if (ut.status === 'in_progress' || ut.status === 'pending' || ut.status === 'pending_review' || ut.status === 'submitted') {
        const matchingTask = taskMap.get(ut.taskId);
        const statusMeta = getCanonicalStatus(ut.status);
        const targetUrl = (matchingTask as any)?.link || '';
        const hasUrl = typeof targetUrl === 'string' && targetUrl.startsWith('http');

        const matchingOpp: MarketplaceOpportunity = engineOpportunities.find(o => o.id === ut.taskId) || {
          id: ut.taskId,
          title: matchingTask?.title || 'Active Opportunity',
          description: matchingTask?.description || '',
          providerName: 'PulseEarn',
          source: 'internal',
          reward: { points: matchingTask?.rewardAmount ?? 0, xp: matchingTask?.xpReward ?? 0 },
          metadata: {
            category: (matchingTask?.category as OpportunityCategory) || 'community',
            difficulty: 'medium' as OpportunityDifficulty,
            estimatedTime: '2 mins',
            verificationType: 'manual',
            launchMode: 'inline',
            tags: ['active'],
          },
          instructions: matchingTask?.instructions || 'Complete the task instructions.',
          action: {
            actionType: hasUrl ? 'url' : 'complete',
            url: hasUrl ? targetUrl : undefined,
          },
          status: 'started',
          engagement: { completionRate: 0.9, averageReward: matchingTask?.rewardAmount ?? 0, totalCompletions: 10, trending: false, isNew: false },
        };

        activeList.push({
          id: ut.taskId,
          title: matchingTask?.title || 'Active Opportunity',
          reward: matchingTask?.rewardAmount ?? 0,
          xp: matchingTask?.xpReward ?? 0,
          statusLabel: statusMeta.label,
          statusBadgeClass: statusMeta.badgeClass,
          opportunity: matchingOpp,
        });
      }
    }

    return {
      items: activeList.slice(0, 3),
      totalCount: activeList.length,
    };
  }, [userTasks, tasks, engineOpportunities]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedCategory !== 'all' || selectedDifficulty !== 'all' || minRewardFilter > 0;

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 pt-28 pb-20 md:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* ─── Header: Clean & Integrated Below Global Navbar ────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
            Marketplace
          </h1>
          <p className="text-xs md:text-sm text-text-secondary font-medium mt-1">
            Discover and complete verified earning opportunities tailored to your profile.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border font-mono', progressionTier.color)}>
            {progressionTier.name}
          </span>
          <button
            onClick={fetchProviders}
            disabled={loading}
            aria-label="Refresh opportunities"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-bright text-xs font-semibold text-text-secondary hover:text-text-primary transition-all disabled:opacity-50 shadow-xs"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : 'text-text-tertiary'} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Error Banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl border border-danger/20 bg-danger/5 flex items-center gap-3 text-danger text-xs font-medium">
          <Info size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Skeleton Loading State ─────────────────────────────────────────── */}
      {loading && engineOpportunities.length === 0 ? (
        <MarketplaceSkeleton />
      ) : (
        <>
          {/* ─── SECTION 1: Continue Where You Left Off ──────────────────────────── */}
          {activeTaskSummary.totalCount > 0 && (
            <section className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
                  <Compass size={15} />
                  <span>Continue Where You Left Off</span>
                </div>
                <span className="text-[10px] font-mono text-text-tertiary">{activeTaskSummary.totalCount} active</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeTaskSummary.items.map(t => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedOpportunity(t.opportunity)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedOpportunity(t.opportunity);
                      }
                    }}
                    className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary/40 cursor-pointer flex items-center justify-between shadow-xs transition-all group focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">{t.title}</p>
                      <span className={cn('inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1 font-mono', t.statusBadgeClass)}>
                        {t.statusLabel}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-success block">+{t.reward} PTS</span>
                      {t.xp > 0 && <span className="text-[9px] text-primary font-mono block">+{t.xp} XP</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── SECTION 2: Discovery, Search & Category Toolbar ───────────────── */}
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-xs">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search opportunities by title, category, reward..."
                  className="w-full bg-surface-bright/60 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-all placeholder:text-text-tertiary min-h-[44px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-1"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filters & Sorting Controls */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 md:pt-0">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as OpportunityCategory | 'all')}
                  aria-label="Filter by Category"
                  className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-all min-h-[44px]"
                >
                  <option value="all">All Categories</option>
                  {MARKETPLACE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as OpportunityDifficulty | 'all')}
                  aria-label="Filter by Difficulty"
                  className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-all min-h-[44px]"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="elite">Elite</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'recommended' | 'reward' | 'time' | 'difficulty' | 'newest')}
                  aria-label="Sort opportunities"
                  className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-all min-h-[44px]"
                >
                  <option value="recommended">Best Match</option>
                  <option value="reward">Highest Reward</option>
                  <option value="time">Fastest Time</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="newest">Newest</option>
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="px-3 py-2 text-[11px] font-semibold text-danger hover:underline shrink-0 min-h-[44px]"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Quick Category Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border min-h-[44px]',
                  selectedCategory === 'all'
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface border-border text-text-secondary hover:border-border-bright'
                )}
              >
                All Opportunities
              </button>
              {MARKETPLACE_CATEGORIES.slice(0, 8).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 min-h-[44px]',
                    selectedCategory === cat.id
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface border-border text-text-secondary hover:border-border-bright'
                  )}
                >
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ─── SECTION 3: Filtered Search Results (When Filters Active) ────────── */}
          {hasActiveFilters && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Filter size={14} className="text-primary" />
                  <span>Matching Opportunities ({searchResults.length})</span>
                </h2>
              </div>

              {searchResults.length === 0 ? (
                <div className="p-8 rounded-2xl border border-border bg-surface text-center space-y-3">
                  <Info size={28} className="text-text-tertiary mx-auto" />
                  <p className="text-xs font-semibold text-text-primary">No earning opportunities match your selected filters.</p>
                  <p className="text-[11px] text-text-tertiary">Try resetting your filters or clearing search text.</p>
                  <button
                    onClick={handleResetFilters}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all min-h-[44px]"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opportunity={opp}
                      userTask={userTasks[opp.id]}
                      onSelect={() => setSelectedOpportunity(opp)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ─── SECTION 4: Dynamic Recommendation Sections ──────────────────────── */}
          {!hasActiveFilters && dynamicSections.length > 0 && (
            <div className="space-y-10">
              {dynamicSections.map(section => (
                <section key={section.id} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
                        {section.id === 'featured' && <Sparkles size={16} className="text-primary" />}
                        {section.id === 'personalized-for-you' && <Flame size={16} className="text-warning" />}
                        {section.id === 'daily' && <Clock size={16} className="text-success" />}
                        {section.id === 'highest-paying' && <Trophy size={16} className="text-primary" />}
                        <span>{section.title}</span>
                      </h2>
                      {section.subtitle && (
                        <p className="text-[11px] text-text-tertiary mt-0.5">{section.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-text-tertiary uppercase">
                      {section.opportunities.length} Items
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.opportunities.map(opp => (
                      <OpportunityCard
                        key={opp.id}
                        opportunity={opp}
                        userTask={userTasks[opp.id]}
                        onSelect={() => setSelectedOpportunity(opp)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {/* ─── SECTION 5: Recently Verified Activity ──────────────────────────── */}
          {unifiedHistory.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-success" />
                  <span>Recently Verified Activity</span>
                </h2>
                <span className="text-[10px] font-mono text-text-tertiary">Ecosystem Ledger</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                {unifiedHistory.slice(0, 4).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <CheckCircle2 size={14} className="text-success shrink-0" />
                      <span className="font-semibold text-text-primary truncate">{item.taskTitle || 'Completed Opportunity'}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right font-mono">
                      {item.rewardAmount > 0 && <span className="text-success font-bold">+{item.rewardAmount} PTS</span>}
                      {item.xpReward > 0 && <span className="text-primary font-bold">+{item.xpReward} XP</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}


        </>
      )}

      {/* ─── Opportunity Detail Drawer ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedOpportunity && (
          <OpportunityDetailDrawer
            opportunity={selectedOpportunity}
            userTask={userTasks[selectedOpportunity.id]}
            onClose={() => setSelectedOpportunity(null)}
            onAction={() => handleOpportunityAction(selectedOpportunity)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// ─── Opportunity Card Component ───────────────────────────────────────────────

interface OpportunityCardProps {
  opportunity: MarketplaceOpportunity;
  userTask?: { status?: string };
  onSelect: () => void;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, userTask, onSelect }) => {
  const diffConfig = DIFFICULTY_CONFIG[opportunity.metadata.difficulty] || DIFFICULTY_CONFIG.medium;
  const canonicalStatus = userTask ? getCanonicalStatus(userTask.status) : null;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className="p-5 rounded-2xl border border-border bg-surface hover:border-border-bright cursor-pointer flex flex-col justify-between space-y-4 transition-all shadow-xs hover:shadow-md group"
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            {opportunity.metadata.category}
          </span>
          <div className="flex items-center gap-1.5">
            {canonicalStatus && (
              <span className={cn('text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono', canonicalStatus.badgeClass)}>
                {canonicalStatus.label}
              </span>
            )}
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
              style={{ color: diffConfig.color, backgroundColor: diffConfig.bgColor, borderColor: `${diffConfig.color}33` }}
            >
              {diffConfig.label}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
            {opportunity.title}
          </h3>
          <p className="text-[11px] text-text-tertiary line-clamp-2 mt-1 leading-relaxed">
            {opportunity.description || 'Verified earning opportunity available in the PulseEarn ecosystem.'}
          </p>
        </div>
      </div>

      {/* Rewards & Action CTA */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-success tabular-nums">+{opportunity.reward.points}</span>
            <span className="text-[9px] font-bold text-text-tertiary uppercase">PTS</span>
            {opportunity.reward.xp > 0 && (
              <span className="text-[10px] text-primary font-bold ml-1 font-mono">+{opportunity.reward.xp} XP</span>
            )}
          </div>
          <span className="text-[10px] text-text-tertiary flex items-center gap-1 font-mono">
            <Clock size={11} />
            {opportunity.metadata.estimatedTime}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="w-full py-2 px-3 rounded-xl bg-surface-bright hover:bg-primary hover:text-white border border-border text-xs font-bold text-text-secondary transition-all flex items-center justify-center gap-1.5"
        >
          <span>View Details</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Opportunity Detail Drawer Component ──────────────────────────────────────

interface OpportunityDetailDrawerProps {
  opportunity: MarketplaceOpportunity;
  userTask?: { status?: string };
  onClose: () => void;
  onAction: () => void;
}

const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  userTask,
  onClose,
  onAction,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[opportunity.metadata.difficulty] || DIFFICULTY_CONFIG.medium;
  const canonicalStatus = getCanonicalStatus(userTask?.status);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end" role="dialog" aria-modal="true" aria-label={opportunity.title}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      {/* Drawer Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-bright/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Zap size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary block">Opportunity Details</span>
              <h2 className="text-sm font-bold text-text-primary tracking-tight truncate">{opportunity.title}</h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close details" className="p-2 hover:bg-surface-bright rounded-xl text-text-tertiary transition-colors shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Rewards Grid */}
          <section className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-surface-bright border border-border">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary block">Reward Value</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-success tabular-nums">+{opportunity.reward.points}</span>
                <span className="text-[10px] font-bold text-text-tertiary uppercase">PTS</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-surface-bright border border-border">
              <span className="text-[9px] font-bold uppercase tracking-wider text-text-tertiary block">Level Progression</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-primary tabular-nums">+{opportunity.reward.xp}</span>
                <span className="text-[10px] font-bold text-text-tertiary uppercase">XP</span>
              </div>
            </div>
          </section>

          {/* Active Status Indicator (If User Started/Completed) */}
          {userTask && (
            <div className="p-3.5 rounded-xl bg-surface-bright border border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary">Current Status:</span>
              <span className={cn('text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border font-mono', canonicalStatus.badgeClass)}>
                {canonicalStatus.label}
              </span>
            </div>
          )}

          {/* Key Overview Metrics */}
          <section className="space-y-3 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                <Layers size={12} />
                <span>Overview & Specs</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-success/10 border border-success/20 text-success font-mono">
                {opportunity.source === 'provider' ? 'Powered by trusted partner' : 'Verified by PulseEarn'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono">Estimated Time</span>
                <span className="font-semibold text-text-primary">{opportunity.metadata.estimatedTime}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono">Difficulty</span>
                <span className="font-semibold" style={{ color: diffConfig.color }}>{diffConfig.label}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono">Category</span>
                <span className="font-semibold text-text-primary capitalize">{opportunity.metadata.category}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase font-mono">Verification</span>
                <span className="font-semibold text-text-primary capitalize">
                  {opportunity.metadata.verificationType === 'automated' || opportunity.metadata.verificationType === 'api'
                    ? 'Instant Verification'
                    : 'Manual Review'}
                </span>
              </div>
            </div>
          </section>

          {/* Instructions & Completion Steps */}
          <section className="space-y-2 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Requirements & Completion Steps
            </span>
            <p className="text-xs text-text-secondary leading-relaxed pt-1">
              {opportunity.instructions || opportunity.description || 'Follow the step-by-step instructions below to complete this earning opportunity and claim your reward.'}
            </p>
          </section>

          {/* Support / Help Notice */}
          <div className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between text-xs text-text-tertiary">
            <span className="flex items-center gap-1.5">
              <Info size={14} className="text-text-tertiary shrink-0" />
              Need assistance with this opportunity?
            </span>
            <a href="/support" className="text-primary font-bold hover:underline">Support</a>
          </div>

        </div>

        {/* Footer Action CTA */}
        <div className="p-4 border-t border-border bg-surface-bright/50 shrink-0">
          {canonicalStatus.label === 'Completed' ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <CheckCircle2 size={16} />
              <span>Opportunity Completed</span>
            </button>
          ) : canonicalStatus.label === 'Pending Review' ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Clock size={16} />
              <span>Under Verification</span>
            </button>
          ) : !canonicalStatus.isActionable ? (
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-surface-bright border border-border text-text-tertiary text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Lock size={16} />
              <span>{canonicalStatus.label}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
            >
              <span>{canonicalStatus.label === 'In Progress' ? 'Continue Opportunity' : 'Start Opportunity'}</span>
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Marketplace Skeleton Loader Component ───────────────────────────────────

const MarketplaceSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Search Toolbar Skeleton */}
      <div className="h-14 rounded-2xl bg-surface border border-border/60 p-3 flex items-center justify-between gap-4">
        <div className="h-8 bg-surface-bright rounded-xl flex-1 max-w-md" />
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-surface-bright rounded-xl" />
          <div className="h-8 w-28 bg-surface-bright rounded-xl" />
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 bg-surface-bright rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="p-5 rounded-2xl border border-border bg-surface space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-20 bg-surface-bright rounded" />
                <div className="h-4 w-16 bg-surface-bright rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-surface-bright rounded" />
                <div className="h-3 w-full bg-surface-bright rounded" />
                <div className="h-3 w-2/3 bg-surface-bright rounded" />
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <div className="h-5 w-24 bg-surface-bright rounded" />
                <div className="h-8 w-24 bg-surface-bright rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
