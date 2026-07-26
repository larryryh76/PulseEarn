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
import { validateExternalUrl } from '../../utils/security';

export interface RawAggregationSource {
  tasks: Task[];
  campaigns: Campaign[];
  userTasks: Record<string, UserTask>;
  providerInventories: ProviderInventory[];
}

/**
 * Aggregates all raw internal and provider sources into a single set of normalized MarketplaceOpportunity items.
 *
 * Guarantees:
 * - Dynamic Provider Resolution: Uses ProviderAdapterRegistry.resolve to resolve adapters on the fly.
 * - Never Silently Discards: Process all non-offline provider inventories.
 * - URL Security: Ensures action URLs pass validateExternalUrl security checks.
 * - Canonical Status Pipeline: Normalizes provider status into canonical statuses via ProviderAdapter.
 */
export function aggregateOpportunities(source: RawAggregationSource): MarketplaceOpportunity[] {
  const { tasks, campaigns, userTasks, providerInventories } = source;

  // 1. Normalize all active internal tasks & campaigns
  const internalOpportunities = normalizeTaskBatch(tasks, campaigns, userTasks);

  // 2. Extract and normalize provider inventory through provider adapters
  const providerOpportunities: MarketplaceOpportunity[] = [];

  for (const inv of providerInventories) {
    // Skip only explicitly offline providers
    if (inv.connectionStatus === 'offline') continue;

    // Resolve adapter dynamically (falls back to GenericProviderAdapter if not registered)
    const adapter = ProviderAdapterRegistry.resolve(inv.providerId, inv.providerName);

    for (const opp of inv.opportunities) {
      // Ensure reward & status pass through provider adapter normalization
      const normalizedReward = adapter.normalizeReward(opp.reward.points);
      const normalizedStatus = adapter.normalizeStatus(opp.status);

      // Validate action URL if present
      let validatedUrl = opp.action.url;
      if (validatedUrl) {
        const val = validateExternalUrl(validatedUrl);
        if (!val.valid) {
          validatedUrl = undefined;
        }
      }

      providerOpportunities.push({
        ...opp,
        reward: {
          ...opp.reward,
          points: normalizedReward.points,
          xp: normalizedReward.xp || opp.reward.xp,
        },
        status: normalizedStatus,
        action: {
          ...opp.action,
          url: validatedUrl,
        },
      });
    }
  }

  // 3. Merge internal and provider opportunities cleanly using OpportunityNormalizer
  return mergeOpportunities(internalOpportunities, providerOpportunities);
}
