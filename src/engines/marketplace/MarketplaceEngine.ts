/**
 * MarketplaceEngine
 * 
 * Central orchestration layer for the PulseEarn Marketplace.
 * Aggregates opportunities from all sources (internal tasks, provider offers)
 * and provides unified access to the opportunity ecosystem.
 */

import {
  MarketplaceOpportunity,
  RecommendationSection,
  SearchOptions,
  OpportunityCategory,
  ProviderInventory,
  SectionSource,
  SectionLayout,
  MarketplaceUserProfile,
  MarketplaceAdminConfig,
} from '../../types/marketplace';
import {
  normalizeCampaign,
  mergeOpportunities,
} from './OpportunityNormalizer';
import { aggregateOpportunities } from './OpportunityAggregator';
import { MarketplaceEligibilityEngine } from './MarketplaceEligibilityEngine';
import { generateAllSections } from './RecommendationEngine';

export { normalizeCampaign };
import { Task, Campaign, UserTask, UserData } from '../../types';

// ─── Engine State ─────────────────────────────────────────────────────────────

interface EngineState {
  opportunities: MarketplaceOpportunity[];
  providers: Map<string, ProviderInventory>;
  adminConfig: MarketplaceAdminConfig;
  lastRefresh: Date;
  isInitialized: boolean;
}

const state: EngineState = {
  opportunities: [],
  providers: new Map(),
  adminConfig: {
    featuredCampaignIds: [],
    hiddenCampaignIds: [],
    prioritizedCampaigns: {},
    disabledCategories: [],
    enabledCategories: [],
    sectionOrder: [],
  },
  lastRefresh: new Date(0),
  isInitialized: false,
};

// ─── Admin Composition Configuration ──────────────────────────────────────────

export function setAdminConfig(config: MarketplaceAdminConfig): void {
  state.adminConfig = {
    ...state.adminConfig,
    ...config,
  };
}

export function getAdminConfig(): MarketplaceAdminConfig {
  return state.adminConfig;
}

// ─── Initialization ─────────────────────────────────────────────────────────────

/**
 * Initialize the marketplace engine with internal task data.
 * Called once on app startup or when user authenticates.
 */
export function initializeMarketplace(
  tasks: Task[],
  campaigns: Campaign[],
  userTasks: Record<string, UserTask>
): void {
  const providerInventories = Array.from(state.providers.values());
  state.opportunities = aggregateOpportunities({
    tasks,
    campaigns,
    userTasks,
    providerInventories,
  });
  state.lastRefresh = new Date();
  state.isInitialized = true;
}

/**
 * Update user-specific data (task progress, completion status, eligibility).
 * Called when user context changes or real-time updates arrive.
 */
export function updateUserContext(
  tasks: Task[],
  campaigns: Campaign[],
  userTasks: Record<string, UserTask>,
  userData: UserData | null = null,
  profile?: MarketplaceUserProfile
): void {
  const providerInventories = Array.from(state.providers.values());
  const merged = aggregateOpportunities({
    tasks,
    campaigns,
    userTasks,
    providerInventories,
  });

  // Evaluate eligibility for all opportunities if userData is present
  state.opportunities = evaluateUserOpportunities(merged, userData, userTasks, profile);
  state.lastRefresh = new Date();
  state.isInitialized = true;
}

/**
 * Evaluates intelligence & eligibility for a set of opportunities.
 */
export function evaluateUserOpportunities(
  opportunities: MarketplaceOpportunity[],
  userData: UserData | null,
  userTasks: Record<string, UserTask> = {},
  profile?: MarketplaceUserProfile
): MarketplaceOpportunity[] {
  const userRegion = (userData as any)?.region || (userData as any)?.country || (profile as any)?.location?.country || 'GLOBAL';

  return opportunities.map(opp => {
    const uTask = userTasks[opp.id];
    const eligibilityResult = MarketplaceEligibilityEngine.evaluate(
      opp,
      userData,
      uTask,
      profile,
      userRegion
    );

    return {
      ...opp,
      computedEligibility: eligibilityResult,
      // If locked or hidden by eligibility rules, set status accordingly
      status: eligibilityResult.visibility === 'hidden'
        ? 'expired'
        : (eligibilityResult.visibility === 'locked' && opp.status === 'available' ? 'locked' : opp.status),
    };
  }).filter(opp => opp.computedEligibility?.visibility !== 'hidden');
}

// ─── Provider Management ──────────────────────────────────────────────────────

/**
 * Add or update provider inventory.
 */
export function updateProviderInventory(inventory: ProviderInventory): void {
  state.providers.set(inventory.providerId, inventory);
  
  // Re-merge all opportunities
  const internalOpportunities = state.opportunities.filter(o => o.source === 'internal');
  state.opportunities = mergeOpportunities(internalOpportunities, getAllProviderOpportunities());
  state.lastRefresh = new Date();
}

/**
 * Get all provider opportunities.
 */
function getAllProviderOpportunities(): MarketplaceOpportunity[] {
  return Array.from(state.providers.values())
    .filter(p => p.connectionStatus === 'connected')
    .flatMap(p => p.opportunities);
}

/**
 * Get provider by ID.
 */
export function getProvider(providerId: string): ProviderInventory | undefined {
  return state.providers.get(providerId);
}

/**
 * Get all providers.
 */
export function getAllProviders(): ProviderInventory[] {
  return Array.from(state.providers.values());
}

/**
 * Update provider connection status.
 */
export function updateProviderStatus(
  providerId: string,
  status: 'connected' | 'degraded' | 'offline',
  errorMessage?: string
): void {
  const provider = state.providers.get(providerId);
  if (provider) {
    provider.connectionStatus = status;
    provider.errorMessage = errorMessage;
  }
}

// ─── Opportunity Access ────────────────────────────────────────────────────────

/**
 * Get all available opportunities.
 */
export function getAllOpportunities(): MarketplaceOpportunity[] {
  return state.opportunities.filter(o => o.status === 'available');
}

/**
 * Get opportunity by ID.
 */
export function getOpportunity(id: string): MarketplaceOpportunity | undefined {
  return state.opportunities.find(o => o.id === id);
}

/**
 * Get opportunities by category.
 */
export function getByCategory(category: OpportunityCategory): MarketplaceOpportunity[] {
  return state.opportunities.filter(
    o => o.status === 'available' && o.metadata.category === category
  );
}

/**
 * Get featured opportunities.
 */
export function getFeatured(): MarketplaceOpportunity[] {
  return state.opportunities.filter(
    o => o.status === 'available' && 
    (o.metadata.category === 'featured' || o.metadata.category === 'daily')
  ).slice(0, 10);
}

/**
 * Get trending opportunities.
 */
export function getTrending(): MarketplaceOpportunity[] {
  return state.opportunities
    .filter(o => o.status === 'available' && o.engagement.trending)
    .slice(0, 10);
}

/**
 * Get opportunities almost complete (pending or on cooldown).
 */
export function getAlmostComplete(): MarketplaceOpportunity[] {
  return state.opportunities
    .filter(o => o.status === 'pending' || o.status === 'cooldown')
    .slice(0, 10);
}

/**
 * Get completed opportunities (for history view).
 */
export function getCompleted(): MarketplaceOpportunity[] {
  return state.opportunities
    .filter(o => o.status === 'completed')
    .slice(0, 20);
}

/**
 * Get new opportunities.
 */
export function getNew(): MarketplaceOpportunity[] {
  return state.opportunities
    .filter(o => o.status === 'available' && o.engagement.isNew)
    .slice(0, 10);
}

/**
 * Get highest paying opportunities.
 */
export function getHighestPaying(limit: number = 10): MarketplaceOpportunity[] {
  return [...state.opportunities]
    .filter(o => o.status === 'available')
    .sort((a, b) => b.reward.points - a.reward.points)
    .slice(0, limit);
}

/**
 * Get fastest rewards (shortest estimated time).
 */
export function getFastestRewards(limit: number = 10): MarketplaceOpportunity[] {
  const timeMap: Record<string, number> = {
    '1-2 min': 1,
    '5 min': 5,
    '10 min': 10,
    'Daily': 2,
    'Ongoing': 999,
  };

  return [...state.opportunities]
    .filter(o => o.status === 'available')
    .sort((a, b) => {
      const timeA = timeMap[a.metadata.estimatedTime] || 15;
      const timeB = timeMap[b.metadata.estimatedTime] || 15;
      return timeA - timeB;
    })
    .slice(0, limit);
}

/**
 * Get expiring soon opportunities.
 */
export function getExpiringSoon(): MarketplaceOpportunity[] {
  return state.opportunities
    .filter(o => o.status === 'available' && o.engagement.expiringSoon)
    .slice(0, 10);
}

// ─── Search & Discovery ───────────────────────────────────────────────────────

/**
 * Search opportunities with comprehensive filters operating on normalized opportunities.
 */
export function search(options: SearchOptions): MarketplaceOpportunity[] {
  let results = [...state.opportunities];

  // Filter out hidden campaign IDs & disabled categories from Admin Config
  if (state.adminConfig.hiddenCampaignIds?.length) {
    const hidden = new Set(state.adminConfig.hiddenCampaignIds);
    results = results.filter(o => !hidden.has(o.id));
  }
  if (state.adminConfig.disabledCategories?.length) {
    const disabled = new Set(state.adminConfig.disabledCategories);
    results = results.filter(o => !disabled.has(o.metadata.category));
  }
  if (state.adminConfig.enabledCategories?.length) {
    const enabled = new Set(state.adminConfig.enabledCategories);
    results = results.filter(o => enabled.has(o.metadata.category));
  }

  // Search by text query across all fields
  if (options.query) {
    const query = options.query.trim().toLowerCase();
    results = results.filter(o => {
      const titleMatch = o.title.toLowerCase().includes(query);
      const descMatch = o.description.toLowerCase().includes(query);
      const instMatch = o.instructions?.toLowerCase().includes(query);
      const reqMatch = o.requirements?.toLowerCase().includes(query);
      const catMatch = o.metadata.category.toLowerCase().includes(query);
      const providerMatch = (o.providerName || o.providerId || '').toLowerCase().includes(query);
      const tagMatch = o.metadata.tags.some(t => t.toLowerCase().includes(query));
      const diffMatch = o.metadata.difficulty.toLowerCase().includes(query);
      const estMatch = o.metadata.estimatedTime.toLowerCase().includes(query);
      const rewardMatch = query === String(o.reward.points) || query === String(o.reward.xp);

      return titleMatch || descMatch || instMatch || reqMatch || catMatch || providerMatch || tagMatch || diffMatch || estMatch || rewardMatch;
    });
  }

  // Apply structured filters
  if (options.filters) {
    const {
      categories,
      difficulty,
      minReward,
      maxReward,
      maxTime,
      verificationTypes,
      sources,
      providers,
      status,
      featuredOnly,
      recommendedOnly,
    } = options.filters;

    if (categories?.length) {
      results = results.filter(o => categories.includes(o.metadata.category));
    }

    if (providers?.length) {
      results = results.filter(o =>
        providers.some(p =>
          p.toLowerCase() === o.providerId?.toLowerCase() ||
          p.toLowerCase() === o.providerName?.toLowerCase()
        )
      );
    }

    if (difficulty?.length) {
      results = results.filter(o => difficulty.includes(o.metadata.difficulty));
    }

    if (minReward !== undefined) {
      results = results.filter(o => o.reward.points >= minReward);
    }

    if (maxReward !== undefined) {
      results = results.filter(o => o.reward.points <= maxReward);
    }

    if (maxTime !== undefined) {
      const maxMinutes = parseTimeToMinutes(maxTime);
      results = results.filter(o => parseTimeToMinutes(o.metadata.estimatedTime) <= maxMinutes);
    }

    if (verificationTypes?.length) {
      results = results.filter(o => verificationTypes.includes(o.metadata.verificationType));
    }

    if (sources?.length) {
      results = results.filter(o => sources.includes(o.source));
    }

    if (status?.length) {
      results = results.filter(o => status.includes(o.status));
    }

    if (featuredOnly) {
      const featuredSet = new Set(state.adminConfig.featuredCampaignIds || []);
      results = results.filter(
        o => o.metadata.category === 'featured' || featuredSet.has(o.id) || o.engagement.trending
      );
    }

    if (recommendedOnly) {
      results = results.filter(o => (o.computedEligibility?.priorityScore || 0) >= 60);
    }
  }

  // Sort
  if (options.sortBy) {
    results = sortResults(results, options.sortBy, options.sortOrder || 'desc');
  }

  // Pagination
  const offset = options.offset || 0;
  const limit = options.limit || 50;
  return results.slice(offset, offset + limit);
}

function sortResults(
  opportunities: MarketplaceOpportunity[],
  sortBy: SearchOptions['sortBy'],
  order: 'asc' | 'desc'
): MarketplaceOpportunity[] {
  const multiplier = order === 'desc' ? -1 : 1;

  switch (sortBy) {
    case 'reward':
      return opportunities.sort(
        (a, b) => multiplier * (a.reward.points - b.reward.points)
      );
    case 'time':
      return opportunities.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.metadata.estimatedTime);
        const timeB = parseTimeToMinutes(b.metadata.estimatedTime);
        return multiplier * (timeA - timeB);
      });
    case 'difficulty': {
      const diffOrder = ['easy', 'medium', 'hard', 'elite'];
      return opportunities.sort((a, b) => {
        const idxA = diffOrder.indexOf(a.metadata.difficulty);
        const idxB = diffOrder.indexOf(b.metadata.difficulty);
        return multiplier * (idxA - idxB);
      });
    }
    case 'popularity':
      return opportunities.sort((a, b) =>
        multiplier * (a.engagement.totalCompletions - b.engagement.totalCompletions)
      );
    case 'newest':
      return opportunities.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return multiplier * (dateA - dateB);
      });
    case 'expiring_soon':
      return opportunities.sort((a, b) => {
        const dateA = a.expiresAt ? new Date(a.expiresAt).getTime() : 9999999999999;
        const dateB = b.expiresAt ? new Date(b.expiresAt).getTime() : 9999999999999;
        return multiplier * (dateA - dateB);
      });
    case 'recommendation_score':
    case 'recommended':
      return opportunities.sort((a, b) => {
        const scoreA = a.computedEligibility?.priorityScore || 50;
        const scoreB = b.computedEligibility?.priorityScore || 50;
        return multiplier * (scoreA - scoreB);
      });
    default:
      return opportunities;
  }
}

function parseTimeToMinutes(time: string): number {
  const tLower = time.toLowerCase();
  if (tLower.includes('daily')) return 1440; // 24 hours in minutes
  if (tLower.includes('ongoing')) return 999999;
  
  const match = time.match(/(\d+)/);
  if (!match) return 15;
  
  const num = parseInt(match[1], 10);
  if (tLower.includes('day') || tLower.includes('d')) return num * 24 * 60;
  if (tLower.includes('hour') || tLower.includes('h')) return num * 60;
  return num;
}

// ─── Dynamic Marketplace Composition Pipeline ─────────────────────────────────

/**
 * Generate default dynamic recommendation sections utilizing RecommendationEngine.
 */
export function generateDefaultSections(): RecommendationSection[] {
  return generateAllSections(
    state.opportunities,
    null,
    [],
    [],
    state.adminConfig
  );
}

/**
 * Generate category sections.
 */
export function generateCategorySections(): RecommendationSection[] {
  const categories: OpportunityCategory[] = [
    'daily', 'surveys', 'games', 'apps', 'videos', 'community', 'referrals'
  ];

  return categories.map(category => ({
    id: `category-${category}`,
    title: formatCategoryTitle(category),
    subtitle: `Browse ${formatCategoryTitle(category).toLowerCase()} opportunities`,
    layout: 'grid' as SectionLayout,
    source: 'category' as SectionSource,
    category,
    opportunities: getByCategory(category).slice(0, 6),
    viewAllUrl: `/marketplace?category=${category}`,
    maxItems: 6,
  }));
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatCategoryTitle(category: OpportunityCategory): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── State Access ─────────────────────────────────────────────────────────────

export function getMarketplaceState(): {
  opportunities: MarketplaceOpportunity[];
  providers: ProviderInventory[];
  lastRefresh: Date;
  isInitialized: boolean;
} {
  return {
    opportunities: state.opportunities,
    providers: Array.from(state.providers.values()),
    lastRefresh: state.lastRefresh,
    isInitialized: state.isInitialized,
  };
}

/**
 * Reset engine state. Call on logout.
 */
export function resetMarketplace(): void {
  state.opportunities = [];
  state.providers.clear();
  state.lastRefresh = new Date(0);
  state.isInitialized = false;
}
