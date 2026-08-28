import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Compass,
  Filter,
  CheckCircle2,
  Activity,
  Info,
  Globe,
  ShieldCheck,
  Award,
  Clock,
  Trophy,
  Flame,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTaskContext } from '../contexts/TaskContext';
import { safeFetch } from '../utils/api';
import { validateExternalUrl } from '../utils/security';
import toast from 'react-hot-toast';

import {
  MarketplaceOpportunity,
  OpportunityCategory,
  OpportunityDifficulty,
} from '../types/marketplace';

import {
  initializeMarketplace,
  updateUserContext,
  updateProviderInventory,
  search,
  getMarketplaceState,
} from '../engines/marketplace/MarketplaceEngine';

import { generateAllSections } from '../engines/marketplace/RecommendationEngine';

import { MarketplaceHeader } from '../components/marketplace/MarketplaceHeader';
import { MarketplaceCategories } from '../components/marketplace/MarketplaceCategories';
import { MarketplaceFilters, SecondaryFilter } from '../components/marketplace/MarketplaceFilters';
import { OpportunityCard } from '../components/marketplace/OpportunityCard';
import { OpportunityDetailDrawer } from '../components/marketplace/OpportunityDetailDrawer';
import { MarketplaceSkeleton } from '../components/marketplace/MarketplaceSkeleton';
import { MarketplaceEmptyState } from '../components/marketplace/MarketplaceEmptyState';

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
  offers?: MarketplaceOpportunity[];
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
  const [selectedSecondaryFilter, setSelectedSecondaryFilter] = useState<SecondaryFilter>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<OpportunityDifficulty | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'reward' | 'time' | 'difficulty' | 'newest'>(
    'recommended'
  );

  // ─── Drawer Selection State ──────────────────────────────────────────────
  const [selectedOpportunity, setSelectedOpportunity] = useState<MarketplaceOpportunity | null>(
    null
  );

  // ─── Centralized Real Economy Balance ──────────────────────────────────────
  const userBalancePoints = userData?.points ?? 0;

  // ─── Progression Tier ──────────────────────────────────────────────────────
  const progressionTier = useMemo(() => {
    const level = userData?.level || 1;
    const completedCount = userData?.stats?.tasksCompleted || 0;
    if (level >= 10 || completedCount >= 25) {
      return {
        name: 'Pro Earner',
        level,
        badge: 'Elite Tier',
        color: 'text-primary bg-primary/10 border-primary/20',
      };
    }
    if (level >= 3 || completedCount >= 5) {
      return {
        name: 'Verified Earner',
        level,
        badge: 'Tier 2',
        color: 'text-success bg-success/10 border-success/20',
      };
    }
    return {
      name: 'Starter Earner',
      level,
      badge: 'Tier 1',
      color: 'text-text-secondary bg-surface-bright border-border',
    };
  }, [userData]);

  // ─── Synchronize Marketplace Engine State ───────────────────────────────────
  useEffect(() => {
    if (tasks.length > 0 || campaigns.length > 0) {
      initializeMarketplace(tasks, campaigns, userTasks);
      updateUserContext(tasks, campaigns, userTasks, userData);
      setEngineVersion((v) => v + 1);
    }
  }, [tasks, campaigns, userTasks, userData]);

  // ─── Fetch Enabled Providers from Backend ───────────────────────────────────
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
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.success && Array.isArray(res.providers)) {
        setProviders(res.providers);

        // Feed provider inventory into Marketplace Engine
        const currentEngineState = getMarketplaceState();
        res.providers.forEach((p: Provider) => {
          const match = currentEngineState.providers.find((inv) => inv.providerId === p.id);
          const existingOpps =
            p.offers && p.offers.length > 0 ? p.offers : match?.opportunities || [];
          updateProviderInventory({
            providerId: p.id,
            providerName: p.name,
            opportunities: existingOpps,
            lastSyncedAt: new Date(),
            connectionStatus:
              p.status === 'degraded'
                ? 'degraded'
                : p.status === 'offline' || p.status === 'maintenance'
                ? 'offline'
                : 'connected',
          });
        });
        setEngineVersion((v) => v + 1);
      } else {
        setProviders([]);
      }
    } catch (err) {
      console.error('[Marketplace] Failed to fetch providers:', err);
      setError('Unable to load partner provider offers at this time.');
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

  // ─── Launch Partner Channel ─────────────────────────────────────────────────
  const handleLaunchProvider = async (provider: Provider) => {
    if (provider.status === 'offline' || provider.status === 'maintenance') {
      toast.error('Partner channel is currently undergoing scheduled maintenance.');
      return;
    }

    let targetWindow: Window | null = null;
    if (!provider.launchUrl && currentUser) {
      targetWindow = window.open('about:blank', '_blank');
    }

    try {
      let url = provider.launchUrl;

      if (!url && currentUser) {
        const idToken = await currentUser.getIdToken();
        const res = await safeFetch(`/api/offerwall/providers/${provider.id}/launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (res.success && res.launchUrl) {
          url = res.launchUrl;
        }
      }

      if (url) {
        const val = validateExternalUrl(url);
        if (!val.valid || !val.url) {
          if (targetWindow) targetWindow.close();
          toast.error(val.error || 'Invalid launch URL for this provider.');
          return;
        }

        if (targetWindow) {
          targetWindow.location.href = val.url;
        } else {
          window.open(val.url, '_blank', 'noopener,noreferrer');
        }
        toast.success(`Launching ${provider.name}...`);
      } else {
        if (targetWindow) targetWindow.close();
        toast.error('Unable to launch provider. Please try again later.');
      }
    } catch (err) {
      if (targetWindow) targetWindow.close();
      console.error('[Marketplace] Launch error:', err);
      toast.error('Failed to launch opportunity.');
    }
  };

  // ─── Handle Opportunity Action ──────────────────────────────────────────────
  const handleOpportunityAction = (opp: MarketplaceOpportunity) => {
    if (opp.action.url) {
      const val = validateExternalUrl(opp.action.url);
      if (!val.valid || !val.url) {
        toast.error(val.error || 'Invalid action URL for this opportunity.');
        return;
      }
      window.open(val.url, '_blank', 'noopener,noreferrer');
      toast.success(`Launching ${opp.title}...`);
    } else if (opp.providerId) {
      const match = providers.find((p) => p.id === opp.providerId);
      if (match) {
        handleLaunchProvider(match);
      } else {
        toast.error(`Partner channel for ${opp.title} is currently unavailable.`);
      }
    } else if (opp.action.actionType === 'claim' || opp.action.actionType === 'complete') {
      toast(`Claim submitted for ${opp.title}. Verifying completion...`, { icon: 'ℹ️' });
    } else {
      toast.error(`Unable to launch ${opp.title}. No valid target configured.`);
    }
  };

  // ─── Filter Reset Callback ──────────────────────────────────────────────────
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedSecondaryFilter('all');
    setSelectedDifficulty('all');
    setSortBy('recommended');
  }, []);

  // ─── Dynamic Marketplace Engine State & Search Derived Results ──────────────
  const { opportunities: engineOpportunities } = getMarketplaceState();

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    engineOpportunities.forEach((opp) => {
      const cat = opp.metadata?.category;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [engineOpportunities]);

  const searchResults = useMemo(() => {
    let list = search({
      query: searchQuery,
      filters: {
        categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
        difficulty: selectedDifficulty !== 'all' ? [selectedDifficulty] : undefined,
      },
      sortBy: sortBy === 'recommended' ? 'recommendation_score' : sortBy,
      limit: 200,
    });

    // Apply Secondary Filters
    if (selectedSecondaryFilter === 'highest_reward') {
      list = [...list].sort((a, b) => b.reward.points - a.reward.points);
    } else if (selectedSecondaryFilter === 'quick_earn') {
      list = list.filter((opp) => {
        const timeStr = opp.metadata.estimatedTime?.toLowerCase() || '';
        const mins = parseInt(timeStr) || 10;
        return (
          mins <= 5 ||
          timeStr.includes('1 min') ||
          timeStr.includes('2 min') ||
          timeStr.includes('3 min') ||
          timeStr.includes('5 min')
        );
      });
    } else if (selectedSecondaryFilter === 'new') {
      list = list.filter((opp) => opp.engagement?.isNew || opp.source === 'provider');
    } else if (selectedSecondaryFilter === 'mobile') {
      list = list.filter((opp) => {
        if (opp.metadata.category === 'apps') return true;
        return opp.metadata.tags?.some((t) => {
          const lower = t.toLowerCase();
          return (
            lower.includes('mobile') ||
            lower.includes('app') ||
            lower.includes('android') ||
            lower.includes('ios')
          );
        });
      });
    } else if (selectedSecondaryFilter === 'desktop') {
      list = list.filter((opp) => {
        const isMobileOnly = opp.metadata.tags?.some((t) => {
          const lower = t.toLowerCase();
          return (
            lower.includes('mobile only') ||
            lower.includes('ios only') ||
            lower.includes('android only')
          );
        });
        if (isMobileOnly) return false;
        if (opp.metadata.category === 'surveys' || opp.metadata.category === 'learn') return true;
        const isExplicitDesktop = opp.metadata.tags?.some((t) => {
          const lower = t.toLowerCase();
          return (
            lower.includes('desktop') || lower.includes('web') || lower.includes('browser')
          );
        });
        if (isExplicitDesktop) return true;
        const isAppOrMobile =
          opp.metadata.category === 'apps' ||
          opp.metadata.tags?.some((t) => {
            const lower = t.toLowerCase();
            return (
              lower.includes('mobile') ||
              lower.includes('app') ||
              lower.includes('android') ||
              lower.includes('ios')
            );
          });
        return !isAppOrMobile;
      });
    } else if (selectedSecondaryFilter === 'available_now') {
      list = list.filter((opp) => opp.status === 'available');
    } else if (selectedSecondaryFilter === 'ending_soon') {
      const nowMs = Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      list = list.filter((opp) => {
        if (opp.engagement?.expiringSoon || opp.metadata.category === 'limited') return true;
        if (opp.expiresAt) {
          const expTime =
            typeof opp.expiresAt === 'string'
              ? new Date(opp.expiresAt).getTime()
              : opp.expiresAt instanceof Date
              ? opp.expiresAt.getTime()
              : 0;
          return expTime > nowMs && expTime - nowMs <= threeDaysMs;
        }
        return false;
      });
    }

    return list;
  }, [
    searchQuery,
    selectedCategory,
    selectedSecondaryFilter,
    selectedDifficulty,
    sortBy,
    engineOpportunities,
    engineVersion,
  ]);

  const dynamicSections = useMemo(() => {
    return generateAllSections(engineOpportunities, userData, activities, taskHistory);
  }, [engineOpportunities, userData, activities, taskHistory, engineVersion]);

  // ─── Active Continuity Journey ───────────────────────────────────────────────
  const activeTaskSummary = useMemo(() => {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const activeList = [];

    for (const ut of Object.values(userTasks)) {
      if (
        ut.status === 'in_progress' ||
        ut.status === 'pending' ||
        ut.status === 'pending_review' ||
        ut.status === 'submitted' ||
        ut.status === 'started'
      ) {
        const matchingTask = taskMap.get(ut.taskId);
        const targetUrl = (matchingTask as any)?.link || '';
        const hasUrl = typeof targetUrl === 'string' && targetUrl.startsWith('http');

        const matchingOpp: MarketplaceOpportunity = engineOpportunities.find(
          (o) => o.id === ut.taskId
        ) || {
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
          engagement: {
            completionRate: 0.9,
            averageReward: matchingTask?.rewardAmount ?? 0,
            totalCompletions: 0,
            trending: false,
            isNew: false,
          },
        };

        activeList.push({
          id: ut.taskId,
          title: matchingTask?.title || 'Active Opportunity',
          reward: matchingTask?.rewardAmount ?? 0,
          xp: matchingTask?.xpReward ?? 0,
          status: ut.status,
          opportunity: matchingOpp,
        });
      }
    }

    return {
      items: activeList.slice(0, 3),
      totalCount: activeList.length,
    };
  }, [userTasks, tasks, engineOpportunities]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'all' ||
    selectedSecondaryFilter !== 'all' ||
    selectedDifficulty !== 'all';

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 pt-24 pb-20 md:px-8 max-w-7xl mx-auto space-y-6">
      {/* ─── 1. Header & Live Balance Bar ───────────────────────────────────── */}
      <MarketplaceHeader
        userBalancePoints={userBalancePoints}
        progressionTier={progressionTier}
        isLoading={loading}
        onRefresh={fetchProviders}
      />

      {/* ─── Error Notification ─────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl border border-danger/20 bg-danger/5 flex items-center gap-3 text-danger text-xs font-medium">
          <Info size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── 2. Categories Discovery Strip ──────────────────────────────────── */}
      <MarketplaceCategories
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categoryCounts={categoryCounts}
        totalCount={engineOpportunities.length}
      />

      {/* ─── Loading Skeleton ──────────────────────────────────────────────── */}
      {loading && engineOpportunities.length === 0 ? (
        <MarketplaceSkeleton />
      ) : (
        <>
          {/* ─── 3. Active Tasks / Continue Where You Left Off ────────────────── */}
          {activeTaskSummary.totalCount > 0 && (
            <section className="p-4 md:p-5 rounded-2xl border border-primary/25 bg-primary/5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider font-mono">
                  <Compass size={15} />
                  <span>Continue Where You Left Off</span>
                </div>
                <span className="text-[10px] font-mono text-text-tertiary">
                  {activeTaskSummary.totalCount} active tasks
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeTaskSummary.items.map((t) => (
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
                    className="p-3.5 rounded-xl bg-surface border border-border hover:border-primary/50 cursor-pointer flex items-center justify-between shadow-xs transition-all group focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px]"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                        {t.title}
                      </p>
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border mt-1 font-mono bg-primary/10 text-primary border-primary/20">
                        In Progress
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-success block">
                        +{t.reward.toLocaleString()} PTS
                      </span>
                      {t.xp > 0 && (
                        <span className="text-[9px] text-primary font-mono block">+{t.xp} XP</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── 4. Search & Filter Bar ────────────────────────────────────────── */}
          <MarketplaceFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedDifficulty={selectedDifficulty}
            onDifficultyChange={setSelectedDifficulty}
            selectedSecondaryFilter={selectedSecondaryFilter}
            onSecondaryFilterChange={setSelectedSecondaryFilter}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={handleResetFilters}
          />

          {/* ─── 5. Opportunity Grid (Filtered or Sections) ─────────────────────── */}
          {hasActiveFilters ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Filter size={14} className="text-primary" />
                  <span>Matching Opportunities ({searchResults.length})</span>
                </h2>
                <span className="text-[11px] text-text-tertiary">
                  Sorted by {sortBy.replace('_', ' ')}
                </span>
              </div>

              {searchResults.length === 0 ? (
                <MarketplaceEmptyState
                  title="No opportunities found matching your criteria"
                  description="Try broadening your search keywords, switching categories, or resetting the difficulty and quick filter settings."
                  onReset={handleResetFilters}
                  onRefresh={fetchProviders}
                  isLoading={loading}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {searchResults.map((opp) => (
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
          ) : (
            /* ─── 6. Discovery Sections ────────────────────────────────────────── */
            <div className="space-y-8">
              {dynamicSections.map((section) => (
                <section key={section.id} className="space-y-3.5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
                        {section.id === 'featured' && (
                          <Sparkles size={16} className="text-primary shrink-0" />
                        )}
                        {section.id === 'personalized-for-you' && (
                          <Flame size={16} className="text-warning shrink-0" />
                        )}
                        {section.id === 'daily' && (
                          <Clock size={16} className="text-success shrink-0" />
                        )}
                        {section.id === 'highest-paying' && (
                          <Trophy size={16} className="text-primary shrink-0" />
                        )}
                        <span>{section.title}</span>
                      </h2>
                      {section.subtitle && (
                        <p className="text-[11px] text-text-tertiary mt-0.5">{section.subtitle}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-text-tertiary uppercase">
                      {section.opportunities.length} Available
                    </span>
                  </div>

                  {section.opportunities.length === 0 ? (
                    <div className="p-6 rounded-2xl border border-border/60 bg-surface/50 text-center">
                      <p className="text-xs text-text-tertiary">
                        No opportunities currently listed in this section.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {section.opportunities.map((opp) => (
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
              ))}
            </div>
          )}

          {/* ─── 7. Ecosystem Verified Ledger History ─────────────────────────── */}
          {unifiedHistory.length > 0 && (
            <section className="space-y-3 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Activity size={14} className="text-success" />
                  <span>Recently Verified Completions</span>
                </h2>
                <span className="text-[10px] font-mono text-text-tertiary">Live Ledger</span>
              </div>

              <div className="p-4 rounded-2xl bg-surface border border-border space-y-2">
                {unifiedHistory.slice(0, 4).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <CheckCircle2 size={14} className="text-success shrink-0" />
                      <span className="font-semibold text-text-primary truncate">
                        {item.taskTitle || 'Completed Opportunity'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-right font-mono">
                      {item.rewardAmount > 0 && (
                        <span className="text-success font-bold">
                          +{item.rewardAmount.toLocaleString()} PTS
                        </span>
                      )}
                      {item.xpReward > 0 && (
                        <span className="text-primary font-bold">+{item.xpReward} XP</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── 8. Ecosystem Trust & Provider Footer ─────────────────────────── */}
          <MarketplaceFooter totalOpportunities={engineOpportunities.length} providers={providers} />
        </>
      )}

      {/* ─── 9. Opportunity Detail Drawer Modal ─────────────────────────────── */}
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

// ─── Marketplace Ecosystem Footer Component ──────────────────────────────────
interface MarketplaceFooterProps {
  totalOpportunities: number;
  providers?: Provider[];
}

const MarketplaceFooter: React.FC<MarketplaceFooterProps> = ({
  totalOpportunities,
  providers = [],
}) => {
  const activeProvidersCount = useMemo(() => {
    if (!providers || providers.length === 0) return 0;
    return providers.filter(
      (p) => p.status === 'active' || p.status === 'degraded' || !p.status
    ).length;
  }, [providers]);

  const providerSystemStatus = useMemo(() => {
    if (!providers || providers.length === 0) return 'Provider Network Active';
    const hasDegraded = providers.some((p) => p.status === 'degraded');
    const hasOffline = providers.some(
      (p) => p.status === 'offline' || p.status === 'maintenance'
    );
    if (hasOffline || hasDegraded) return 'Provider Network Operational (Degraded Sync)';
    return 'All Provider Systems Operational';
  }, [providers]);

  return (
    <footer className="mt-12 pt-8 border-t border-border space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider font-mono">
            <Globe size={15} />
            <span>Provider Network</span>
          </div>
          <p className="text-xs text-text-primary font-bold">
            {activeProvidersCount > 0
              ? `${activeProvidersCount} Integrated Networks`
              : 'Multi-Network Orchestration'}
          </p>
          <p className="text-[11px] text-text-tertiary">
            Real-time inventory synchronization with ProviderAdapter
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-success text-xs font-bold uppercase tracking-wider font-mono">
            <ShieldCheck size={15} />
            <span>Verification & Payouts</span>
          </div>
          <p className="text-xs text-text-primary font-bold">Automated Postback Auditing</p>
          <p className="text-[11px] text-text-tertiary">
            Anti-fraud checks with instant PTS ledger crediting
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5 shadow-xs">
          <div className="flex items-center gap-2 text-warning text-xs font-bold uppercase tracking-wider font-mono">
            <Award size={15} />
            <span>Ecosystem Scale</span>
          </div>
          <p className="text-xs text-text-primary font-bold">
            {totalOpportunities} Active Opportunities
          </p>
          <p className="text-[11px] text-text-tertiary">
            Personalized recommendation engine active
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-text-tertiary gap-2 pt-2 border-t border-border/50 font-mono">
        <span>PulseEarn Marketplace • Unified Earning Ecosystem</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          {providerSystemStatus}
        </span>
      </div>
    </footer>
  );
};

export default Marketplace;
