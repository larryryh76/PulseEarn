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
} from '../../types/marketplace';
import {
  normalizeTaskBatch,
  mergeOpportunities,
} from './OpportunityNormalizer';
import { Task, Campaign, UserTask } from '../../types';

// ─── Engine State ─────────────────────────────────────────────────────────────

interface EngineState {
  opportunities: MarketplaceOpportunity[];
  providers: Map<string, ProviderInventory>;
  lastRefresh: Date;
  isInitialized: boolean;
}

const state: EngineState = {
  opportunities: [],
  providers: new Map(),
  lastRefresh: new Date(0),
  isInitialized: false,
};

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
  const normalized = normalizeTaskBatch(tasks, campaigns, userTasks);
  
  // Merge with existing provider opportunities
  const providerOpportunities = Array.from(state.providers.values())
    .flatMap(p => p.opportunities);
  
  state.opportunities = mergeOpportunities(normalized, providerOpportunities);
  state.lastRefresh = new Date();
  state.isInitialized = true;
}

/**
 * Update user-specific data (task progress, completion status).
 * Called when user context changes or real-time updates arrive.
 */
export function updateUserContext(
  tasks: Task[],
  campaigns: Campaign[],
  userTasks: Record<string, UserTask>
): void {
  if (!state.isInitialized) {
    initializeMarketplace(tasks, campaigns, userTasks);
    return;
  }

  const normalized = normalizeTaskBatch(tasks, campaigns, userTasks);
  const providerOpportunities = Array.from(state.providers.values())
    .flatMap(p => p.opportunities);
  
  state.opportunities = mergeOpportunities(normalized, providerOpportunities);
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
 * Search opportunities with filters.
 */
export function search(options: SearchOptions): MarketplaceOpportunity[] {
  let results = [...state.opportunities];

  // Filter by query
  if (options.query) {
    const query = options.query.toLowerCase();
    results = results.filter(
      o =>
        o.title.toLowerCase().includes(query) ||
        o.description.toLowerCase().includes(query) ||
        o.metadata.tags.some(t => t.toLowerCase().includes(query))
    );
  }

  // Apply filters
  if (options.filters) {
    const { categories, difficulty, minReward, maxReward, sources, status } = options.filters;

    if (categories?.length) {
      results = results.filter(o => categories.includes(o.metadata.category));
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

    if (sources?.length) {
      results = results.filter(o => sources.includes(o.source));
    }

    if (status?.length) {
      results = results.filter(o => status.includes(o.status));
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
        (a, b) => multiplier * (b.reward.points - a.reward.points)
      );
    case 'time':
      return opportunities.sort((a, b) => {
        const timeA = parseTimeToMinutes(a.metadata.estimatedTime);
        const timeB = parseTimeToMinutes(b.metadata.estimatedTime);
        return multiplier * (timeA - timeB);
      });
    case 'difficulty':
      const diffOrder = ['easy', 'medium', 'hard', 'elite'];
      return opportunities.sort((a, b) => {
        const idxA = diffOrder.indexOf(a.metadata.difficulty);
        const idxB = diffOrder.indexOf(b.metadata.difficulty);
        return multiplier * (idxA - idxB);
      });
    case 'popularity':
      return opportunities.sort((a, b) =>
        multiplier * (b.engagement.totalCompletions - a.engagement.totalCompletions)
      );
    case 'newest':
      return opportunities.sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return multiplier * (dateB - dateA);
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

// ─── Section Generation ────────────────────────────────────────────────────────

/**
 * Generate default recommendation sections.
 */
export function generateDefaultSections(): RecommendationSection[] {
  const featured = getFeatured();
  const trending = getTrending();
  const highestPaying = getHighestPaying(8);
  const fastest = getFastestRewards(8);
  const newOpps = getNew();
  const expiringSoon = getExpiringSoon();

  const sections: RecommendationSection[] = [];

  // Featured Hero
  if (featured.length > 0) {
    sections.push({
      id: 'featured-hero',
      title: 'Featured Opportunities',
      subtitle: 'Hand-picked by the PulseEarn team',
      layout: 'featured',
      source: 'featured',
      opportunities: featured.slice(0, 4),
    });
  }

  // Highest Paying Today
  if (highestPaying.length > 0) {
    sections.push({
      id: 'highest-paying',
      title: 'Highest Paying Today',
      subtitle: 'Maximize your earnings',
      layout: 'slider',
      source: 'highest_paying',
      opportunities: highestPaying,
      viewAllUrl: '/marketplace?sort=reward',
    });
  }

  // Fastest Rewards
  if (fastest.length > 0) {
    sections.push({
      id: 'fastest-rewards',
      title: 'Quick Wins',
      subtitle: 'Earn points in minutes',
      layout: 'slider',
      source: 'fastest',
      opportunities: fastest,
    });
  }

  // Trending Now
  if (trending.length > 0) {
    sections.push({
      id: 'trending',
      title: 'Trending Now',
      subtitle: 'Popular with the community',
      layout: 'slider',
      source: 'trending',
      opportunities: trending,
    });
  }

  // New Today
  if (newOpps.length > 0) {
    sections.push({
      id: 'new-today',
      title: 'New Opportunities',
      subtitle: 'Just added to the marketplace',
      layout: 'slider',
      source: 'new_today',
      opportunities: newOpps,
    });
  }

  // Expiring Soon
  if (expiringSoon.length > 0) {
    sections.push({
      id: 'expiring-soon',
      title: 'Ending Soon',
      subtitle: 'Limited time to complete',
      layout: 'slider',
      source: 'expiring_soon',
      opportunities: expiringSoon,
    });
  }

  return sections;
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
