import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Zap, Compass, Filter, Search, ShieldCheck, RefreshCw,
  ArrowUpRight, Lock, Clock, Trophy, Flame, CheckCircle2, ChevronRight,
  X, Layers, Star, Activity, Info, Store
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTaskContext } from '../contexts/TaskContext';
import { safeFetch } from '../utils/api';
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

// ─── Provider Interface (Earning Channel) ────────────────────────────────────

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

export const Marketplace: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const { userTasks, tasks, campaigns, activities, taskHistory, unifiedHistory } = useTaskContext();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [engineVersion, setEngineVersion] = useState<number>(0);

  // ─── Filter & Search State ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<OpportunityCategory | 'all'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<OpportunityDifficulty | 'all'>('all');
  const [minRewardFilter, setMinRewardFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'recommended' | 'reward' | 'time' | 'difficulty' | 'newest'>('recommended');
  
  // ─── Progressive Disclosure State (Level 1 -> 2 -> 3 -> 4) ──────────────────
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

        // Feed provider inventory into Marketplace Engine while preserving existing opportunities
        const currentEngineState = getMarketplaceState();
        res.providers.forEach((p: Provider) => {
          const match = currentEngineState.providers.find(inv => inv.providerId === p.id);
          const existingOpps = match?.opportunities || [];
          updateProviderInventory({
            providerId: p.id,
            providerName: p.name,
            opportunities: existingOpps,
            lastSyncedAt: new Date(),
            connectionStatus: p.status === 'degraded' ? 'degraded' : p.status === 'offline' ? 'offline' : 'connected',
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

  // ─── Launch Provider Channel ────────────────────────────────────────────────
  const handleLaunchProvider = async (provider: Provider) => {
    if (provider.status === 'offline' || provider.status === 'maintenance') {
      toast.error(`${provider.name} is currently undergoing maintenance.`);
      return;
    }

    setLaunchingId(provider.id);

    try {
      let url = provider.launchUrl;

      if (!url && currentUser) {
        const idToken = await currentUser.getIdToken();
        const res = await safeFetch(`/api/offerwall/providers/${provider.id}/launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
        });

        if (res.success && res.launchUrl) {
          url = res.launchUrl;
        }
      }

      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            toast.error(`Invalid link protocol (${parsed.protocol}) for ${provider.name}.`);
            return;
          }
          window.open(parsed.href, '_blank', 'noopener,noreferrer');
          toast.success(`Opening ${provider.name}...`);
        } catch {
          toast.error(`Invalid launch URL for ${provider.name}.`);
        }
      } else {
        toast.error(`Unable to launch ${provider.name}. Please check provider configuration.`);
      }
    } catch (err) {
      console.error('[Marketplace] Launch error:', err);
      toast.error(`Failed to launch ${provider.name}.`);
    } finally {
      setLaunchingId(null);
    }
  };

  // ─── Handle Opportunity Action ──────────────────────────────────────────────
  const handleOpportunityAction = (opp: MarketplaceOpportunity) => {
    if (opp.action.url) {
      try {
        const parsed = new URL(opp.action.url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          toast.error(`Invalid link protocol (${parsed.protocol}) for this opportunity.`);
          return;
        }
        window.open(parsed.href, '_blank', 'noopener,noreferrer');
        toast.success(`Launching ${opp.title}...`);
      } catch {
        toast.error('Invalid action URL for this opportunity.');
      }
    } else if (opp.providerId) {
      const match = providers.find(p => p.id === opp.providerId);
      if (match) {
        handleLaunchProvider(match);
      } else {
        toast.success(`Initiating opportunity: ${opp.title}`);
      }
    } else {
      toast.success(`Opening opportunity: ${opp.title}`);
    }
  };

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

  // ─── Active Continuity Journey (Level 1 Progress) ───────────────────────────
  const activeTasks = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const result = [];

    for (const ut of Object.values(userTasks)) {
      if (ut.status === 'in_progress' || ut.status === 'pending') {
        const matchingTask = taskMap.get(ut.taskId);
        result.push({
          id: ut.taskId,
          title: matchingTask?.title || 'Active Opportunity',
          reward: matchingTask?.rewardAmount ?? 100,
          status: ut.status,
          xp: matchingTask?.xpReward ?? 25,
        });
        if (result.length >= 3) break;
      }
    }

    return result;
  }, [userTasks, tasks]);

  const hasActiveFilters = searchQuery.trim().length > 0 || selectedCategory !== 'all' || selectedDifficulty !== 'all' || minRewardFilter > 0;

  return (
    <div className="min-h-screen bg-background text-text-primary px-4 py-8 md:px-8 max-w-7xl mx-auto space-y-10">
      
      {/* ─── Marketplace Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
              <Sparkles size={11} />
              PulseEarn Ecosystem
            </span>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border', progressionTier.color)}>
              {progressionTier.name} ({progressionTier.badge})
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
            Marketplace
          </h1>
          <p className="text-xs text-text-tertiary mt-1">
            Discover verified earning opportunities and tailored channels organized by yield, speed, and preference.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-surface hover:bg-surface-bright text-xs font-semibold text-text-secondary transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-text-tertiary'} />
            <span>Refresh Opportunities</span>
          </button>
        </div>
      </div>

      {/* ─── Error State ──────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl border border-danger/20 bg-danger/5 flex items-center gap-3 text-danger text-xs font-medium">
          <Info size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── SECTION 1: Personalized Continuity & Active Journey ──────────── */}
      {activeTasks.length > 0 && (
        <section className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <Compass size={15} />
              <span>Continue Your Earning Journey</span>
            </div>
            <span className="text-[10px] font-mono text-text-tertiary">{activeTasks.length} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeTasks.map(t => (
              <div key={t.id} className="p-3.5 rounded-xl bg-surface border border-border flex items-center justify-between shadow-sm">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-text-primary truncate">{t.title}</p>
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-mono">{t.status.replace('_', ' ')}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-success block">+{t.reward} PTS</span>
                  <span className="text-[9px] text-primary font-mono block">+{t.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── SECTION 2: Discovery, Search & Category Toolbar ───────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-surface p-3.5 rounded-2xl border border-border shadow-sm">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search opportunities by title, category, reward..."
              className="w-full bg-surface-bright/60 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-all placeholder:text-text-tertiary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters & Sorting Controls */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 md:pt-0">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-all"
            >
              <option value="all">All Categories</option>
              {MARKETPLACE_CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value as any)}
              className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-all"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="elite">Elite</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-surface-bright border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-secondary focus:outline-none focus:border-primary transition-all"
            >
              <option value="recommended">Best Match</option>
              <option value="reward">Highest Reward</option>
              <option value="time">Fastest Time</option>
              <option value="difficulty">Difficulty</option>
              <option value="newest">Newest</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedDifficulty('all');
                  setMinRewardFilter(0);
                  setSortBy('recommended');
                }}
                className="px-2.5 py-2 text-[11px] font-semibold text-danger hover:underline shrink-0"
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
              'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border',
              selectedCategory === 'all'
                ? 'bg-primary text-white border-primary shadow-sm'
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
                'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5',
                selectedCategory === cat.id
                  ? 'bg-primary text-white border-primary shadow-sm'
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
              <p className="text-xs font-semibold text-text-primary">No opportunities match your filter criteria.</p>
              <p className="text-[11px] text-text-tertiary">Try clearing search keywords or selecting a broader category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map(opp => (
                <OpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onSelect={() => setSelectedOpportunity(opp)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ─── SECTION 4: Dynamic Recommendation Sections (Default Blueprint) ──── */}
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
                    onSelect={() => setSelectedOpportunity(opp)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ─── SECTION 5: Earning Channels (Partner Offerwalls) ─────────────── */}
      <section className="space-y-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm md:text-base font-bold text-text-primary tracking-tight flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <span>Verified Earning Channels ({providers.length})</span>
            </h2>
            <p className="text-[11px] text-text-tertiary mt-0.5">
              Direct access to partner offerwalls and survey engines with custom yield splits.
            </p>
          </div>
          <span className="text-[10px] font-mono text-text-tertiary">Channel Gateways</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-5 rounded-2xl border border-border bg-surface animate-pulse space-y-3">
                <div className="h-10 bg-surface-bright rounded-xl w-1/2" />
                <div className="h-4 bg-surface-bright rounded w-3/4" />
                <div className="h-8 bg-surface-bright rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="p-8 rounded-2xl border border-border bg-surface text-center space-y-2">
            <Store size={28} className="text-text-tertiary mx-auto" />
            <p className="text-xs font-semibold text-text-primary">No active partner offerwalls currently connected.</p>
            <p className="text-[11px] text-text-tertiary">Channels refresh continuously based on partner uptime.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map(provider => {
              const initial = provider.name ? provider.name[0].toUpperCase() : 'P';
              const multiplierText = provider.rewardMultiplier
                ? `${provider.rewardMultiplier}x Multiplier`
                : '1.0x Yield';
              const userShareText = provider.userSharePct
                ? `${Math.round(provider.userSharePct * 100)}% Share`
                : '85% Share';
              const isOffline = provider.status === 'offline' || provider.status === 'maintenance';

              return (
                <motion.div
                  key={provider.id}
                  whileHover={{ y: -2 }}
                  className="p-5 rounded-2xl border border-border bg-surface hover:border-border-bright flex flex-col justify-between space-y-4 transition-all shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                          {provider.logo ? (
                            <img src={provider.logo} alt={provider.name} className="w-6 h-6 object-contain" />
                          ) : (
                            <span className="text-sm font-black text-primary">{initial}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-text-primary">{provider.name}</h3>
                          <span className="text-[9px] font-mono text-text-tertiary">Channel ID: {provider.id}</span>
                        </div>
                      </div>
                      <span className={cn(
                        'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        provider.status === 'active' || !provider.status
                          ? 'bg-success/10 border-success/20 text-success'
                          : provider.status === 'degraded'
                          ? 'bg-warning/10 border-warning/20 text-warning'
                          : 'bg-danger/10 border-danger/20 text-danger'
                      )}>
                        {provider.status || 'Active'}
                      </span>
                    </div>

                    <p className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed">
                      {provider.description || 'Verified earning gateway offering surveys, tasks, and offers.'}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                      <div className="p-2 rounded-xl bg-surface-bright border border-border">
                        <span className="text-text-tertiary uppercase block font-mono text-[8px]">Yield Rate</span>
                        <span className="font-bold text-text-primary">{multiplierText}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-surface-bright border border-border">
                        <span className="text-text-tertiary uppercase block font-mono text-[8px]">Payout Split</span>
                        <span className="font-bold text-primary">{userShareText}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLaunchProvider(provider)}
                      disabled={launchingId === provider.id || isOffline}
                      className={cn(
                        'w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm',
                        isOffline
                          ? 'bg-surface-bright border border-border text-text-tertiary cursor-not-allowed'
                          : 'bg-primary hover:bg-primary-hover text-white'
                      )}
                    >
                      {launchingId === provider.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : isOffline ? (
                        <>
                          <Lock size={13} />
                          <span>Maintenance</span>
                        </>
                      ) : (
                        <>
                          <span>Launch Channel</span>
                          <ArrowUpRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── SECTION 6: Recently Completed Activity Log ─────────────────────── */}
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
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={14} className="text-success shrink-0" />
                  <span className="font-semibold text-text-primary">{item.taskTitle || 'Completed Opportunity'}</span>
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

      {/* ─── LEVEL 2, 3, 4: Progressive Disclosure Detail Drawer ────────────── */}
      <AnimatePresence>
        {selectedOpportunity && (
          <OpportunityDetailDrawer
            opportunity={selectedOpportunity}
            providers={providers}
            onClose={() => setSelectedOpportunity(null)}
            onAction={() => handleOpportunityAction(selectedOpportunity)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// ─── Level 1: Opportunity Card Component ─────────────────────────────────────

interface OpportunityCardProps {
  opportunity: MarketplaceOpportunity;
  onSelect: () => void;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, onSelect }) => {
  const diffConfig = DIFFICULTY_CONFIG[opportunity.metadata.difficulty] || DIFFICULTY_CONFIG.medium;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className="p-5 rounded-2xl border border-border bg-surface hover:border-border-bright cursor-pointer flex flex-col justify-between space-y-4 transition-all shadow-sm hover:shadow-md group"
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            {opportunity.metadata.category}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
            style={{ color: diffConfig.color, backgroundColor: diffConfig.bgColor, borderColor: `${diffConfig.color}33` }}
          >
            {diffConfig.label}
          </span>
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
          <span>View Opportunity</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </motion.div>
  );
};

// ─── Level 2, 3, 4: Progressive Disclosure Detail Drawer Component ──────────

interface OpportunityDetailDrawerProps {
  opportunity: MarketplaceOpportunity;
  providers: Provider[];
  onClose: () => void;
  onAction: () => void;
}

const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  providers,
  onClose,
  onAction,
}) => {
  const diffConfig = DIFFICULTY_CONFIG[opportunity.metadata.difficulty] || DIFFICULTY_CONFIG.medium;
  const matchingProvider = providers.find(p => p.id === opportunity.providerId);

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-bright/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Zap size={20} />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary block">Level 1 - Summary</span>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-tight">{opportunity.title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-bright rounded-xl text-text-tertiary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* LEVEL 1: Primary Rewards */}
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

          {/* LEVEL 2: Opportunity Details */}
          <section className="space-y-3 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Layers size={12} />
              <span>Level 2 - Opportunity Details</span>
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase">Estimated Duration</span>
                <span className="font-semibold text-text-primary">{opportunity.metadata.estimatedTime}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase">Difficulty Level</span>
                <span className="font-semibold" style={{ color: diffConfig.color }}>{diffConfig.label}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase">Category</span>
                <span className="font-semibold text-text-primary capitalize">{opportunity.metadata.category}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-border">
                <span className="text-[9px] text-text-tertiary block uppercase">Verification</span>
                <span className="font-semibold text-text-primary capitalize">{opportunity.metadata.verificationType}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Instructions</span>
              <p className="text-xs text-text-tertiary leading-relaxed">
                {opportunity.instructions || opportunity.description || 'Follow the specified instructions to claim your reward.'}
              </p>
            </div>
          </section>

          {/* LEVEL 3: Campaign Context */}
          <section className="space-y-2 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-warning flex items-center gap-1">
              <Star size={12} />
              <span>Level 3 - Campaign Context</span>
            </span>
            <p className="text-xs text-text-secondary font-medium">
              Sponsor / Campaign: <span className="text-text-primary font-bold">{opportunity.providerName || 'PulseEarn Campaign'}</span>
            </p>
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              Completions logged: {opportunity.engagement.totalCompletions || 0} claims. Verified by automated callback validation.
            </p>
          </section>

          {/* LEVEL 4: Earning Channel / Provider Details */}
          <section className="space-y-2 p-4 rounded-2xl bg-surface-bright/40 border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-success flex items-center gap-1">
              <ShieldCheck size={12} />
              <span>Level 4 - Earning Channel Integrity</span>
            </span>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-text-tertiary">Channel Source:</span>
              <span className="font-bold text-text-primary">{matchingProvider?.name || opportunity.providerName || 'PulseEarn Core Engine'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Yield Multiplier:</span>
              <span className="font-bold text-success">{matchingProvider?.rewardMultiplier ? `${matchingProvider.rewardMultiplier}x Yield` : '1.0x Yield'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">Integrity Status:</span>
              <span className="font-bold text-success flex items-center gap-1">
                <CheckCircle2 size={12} />
                <span>Verified & Active</span>
              </span>
            </div>
          </section>

        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-border bg-surface-bright/50 shrink-0">
          <button
            onClick={() => {
              onAction();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
          >
            <span>Start Opportunity</span>
            <ArrowUpRight size={15} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Marketplace;
