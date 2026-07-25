/**
 * OpportunityAggregator
 * ─────────────────────────────────────────────────────────────────────────────
 * Part of the Marketplace Single Rendering Pipeline:
 * Marketplace -> MarketplaceEngine -> OpportunityAggregator -> OpportunityNormalizer -> RecommendationEngine -> Rendering Layer -> User
 *
 * Pulls raw data from all internal systems (Tasks, Campaigns, Daily Rewards,
 * Referrals, Predictions, Community, Education) and external provider inventory,
 * routes through OpportunityNormalizer, and aggregates into a unified collection.
 */

import { Task, Campaign, UserTask } from '../../types';
import { MarketplaceOpportunity, ProviderInventory } from '../../types/marketplace';
import { normalizeTaskBatch, mergeOpportunities } from './OpportunityNormalizer';
import { ProviderAdapterRegistry } from './ProviderAdapter';

export interface RawAggregationSource {
  tasks: Task[];
  campaigns: Campaign[];
  userTasks: Record<string, UserTask>;
  providerInventories: ProviderInventory[];
}

/**
 * Aggregates all raw internal and provider sources into a single set of normalized MarketplaceOpportunity items.
 */
export function aggregateOpportunities(source: RawAggregationSource): MarketplaceOpportunity[] {
  const { tasks, campaigns, userTasks, providerInventories } = source;

  // 1. Normalize all active internal tasks & campaigns
  const internalOpportunities = normalizeTaskBatch(tasks, campaigns, userTasks);

  // 2. Extract and normalize provider inventory through provider adapters
  const providerOpportunities: MarketplaceOpportunity[] = [];

  for (const inv of providerInventories) {
    if (inv.connectionStatus !== 'connected') continue;

    const adapter = ProviderAdapterRegistry.get(inv.providerId);
    if (!adapter) continue;

    for (const opp of inv.opportunities) {
      // Ensure reward & status pass through provider adapter normalization
      const normalizedReward = adapter.normalizeReward(opp.reward.points);
      const normalizedStatus = adapter.normalizeStatus(opp.status);

      providerOpportunities.push({
        ...opp,
        reward: {
          ...opp.reward,
          points: normalizedReward.points,
          xp: normalizedReward.xp || opp.reward.xp,
        },
        status: normalizedStatus,
      });
    }
  }

  // 3. Merge internal and provider opportunities cleanly using OpportunityNormalizer
  return mergeOpportunities(internalOpportunities, providerOpportunities);
}
