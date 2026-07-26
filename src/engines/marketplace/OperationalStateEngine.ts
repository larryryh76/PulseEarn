/**
 * Marketplace Operational State Engine
 * 
 * PHASE 15.5 - Operational State Messages
 * 
 * Marketplace NEVER appears empty.
 * Always shows operational context:
 * - "Syncing inventory..."
 * - "Provider connected, awaiting inventory..."
 * - "No campaigns currently available"
 * - "Campaign approval pending"
 * - "Provider temporarily unavailable"
 * 
 * Every state has a message explaining what's happening.
 */

import { ProviderDiscovery } from './ProviderDiscoveryEngine';

export type MarketplaceOperationalState = 
  | 'loading'
  | 'syncing'
  | 'healthy'
  | 'degraded'
  | 'empty_awaiting'
  | 'empty_unavailable'
  | 'maintenance';

export interface OperationalStateDetails {
  providersConnected: number;
  providersHealthy: number;
  providersOffline: number;
  activeCampaigns: number;
  activeOpportunities: number;
  lastSyncAt: Date | null;
  pendingVerifications: number;
  failedSyncs: number;
  callbackQueueDepth: number;
}

export interface MarketplaceOperationalStatus {
  state: MarketplaceOperationalState;
  message: string;
  description: string;
  actionable: boolean;
  actionText?: string;
  iconType: 'loading' | 'warning' | 'error' | 'info' | 'success';
  details: OperationalStateDetails;
  timestamp: Date;
}

export class OperationalStateEngine {
  
  /**
   * Determine marketplace operational state and message.
   * Called frequently to reflect current backend state.
   */
  async getMarketplaceState(): Promise<MarketplaceOperationalStatus> {
    const providers = ProviderDiscovery.getAllProviders();
    const providersConnected = providers.length;
    const providersHealthy = providers.filter(p => p.capabilities.healthStatus === 'healthy').length;
    const providersOffline = providers.filter(p => p.capabilities.healthStatus === 'offline').length;
    const providersMaintenance = providers.filter(p => p.capabilities.healthStatus === 'maintenance').length;

    // Get campaign and opportunity counts
    // In real app: query from Firestore
    const activeCampaigns = 0;
    const activeOpportunities = 0;

    // Get sync status
    const lastSyncAt = await this.getLastSuccessfulSync();
    const failedSyncs = await this.getFailedSyncCount();

    // Get pending verifications
    const pendingVerifications = await this.getPendingVerificationCount();

    // Get callback queue depth
    const callbackQueueDepth = await this.getCallbackQueueDepth();

    const details: OperationalStateDetails = {
      providersConnected,
      providersHealthy,
      providersOffline,
      activeCampaigns,
      activeOpportunities,
      lastSyncAt,
      pendingVerifications,
      failedSyncs,
      callbackQueueDepth,
    };

    // Determine state and message
    let state: MarketplaceOperationalState;
    let message: string;
    let description: string;
    let actionable: boolean = false;
    let actionText: string | undefined;
    let iconType: 'loading' | 'warning' | 'error' | 'info' | 'success';

    // State determination logic
    if (providersConnected === 0) {
      // No providers at all
      state = 'empty_unavailable';
      message = 'No providers connected';
      description = 'Admin needs to configure marketplace providers.';
      iconType = 'error';
      actionable = true;
      actionText = 'Contact Admin';
    } else if (providersHealthy === 0) {
      // All providers are offline
      state = 'maintenance';
      message = 'All providers temporarily unavailable';
      description = `${providersOffline} offline, ${providersMaintenance} in maintenance. Check back soon.`;
      iconType = 'warning';
    } else if (activeOpportunities === 0 && providersHealthy > 0) {
      // Providers connected but no opportunities
      if (failedSyncs > 2) {
        state = 'degraded';
        message = 'Sync errors preventing inventory updates';
        description = `${failedSyncs} failed syncs. System is working to recover.`;
        iconType = 'warning';
      } else {
        state = 'empty_awaiting';
        message = 'Inventory syncing from providers...';
        description = `${providersHealthy}/${providersConnected} providers connected and syncing.`;
        iconType = 'loading';
      }
    } else if (callbackQueueDepth > 100) {
      // Callback queue backing up
      state = 'degraded';
      message = 'High verification queue depth';
      description = `${callbackQueueDepth} verifications pending. System processing.`;
      iconType = 'info';
    } else if (providersHealthy < providersConnected && activeOpportunities > 0) {
      // Some providers offline but opportunities still available
      state = 'degraded';
      message = `${providersConnected - providersHealthy} providers currently unavailable`;
      description = `${activeOpportunities} opportunities still available from healthy providers.`;
      iconType = 'info';
    } else if (failedSyncs > 0) {
      // Some sync errors but system healthy
      state = 'degraded';
      message = `${failedSyncs} recent sync errors`;
      description = 'System is recovering. New opportunities may appear shortly.';
      iconType = 'info';
    } else {
      // All systems healthy
      state = 'healthy';
      message = 'Marketplace ready';
      description = `${activeOpportunities} opportunities from ${providersHealthy} providers.`;
      iconType = 'success';
    }

    return {
      state,
      message,
      description,
      actionable,
      actionText,
      iconType,
      details,
      timestamp: new Date(),
    };
  }

  /**
   * Get user-facing message for a specific operational state.
   * Called by Marketplace UI to display status.
   */
  getStateMessage(status: MarketplaceOperationalStatus): string {
    const { state, details } = status;

    const messages: Record<MarketplaceOperationalState, string> = {
      'loading': 'Initializing marketplace...',
      'syncing': `Syncing with ${details.providersHealthy} providers...`,
      'healthy': `${details.activeOpportunities} opportunities ready`,
      'degraded': 'Some providers temporarily unavailable',
      'empty_awaiting': 'Getting opportunities ready for you...',
      'empty_unavailable': 'Marketplace temporarily unavailable',
      'maintenance': 'Marketplace in maintenance',
    };

    return messages[state];
  }

  /**
   * Get detailed explanation for the current state.
   * Used in UI tooltips or expanded state view.
   */
  getStateDescription(status: MarketplaceOperationalStatus): string {
    const { state, details } = status;

    const descriptions: Record<MarketplaceOperationalState, string> = {
      'loading': 'We\'re setting up the marketplace. Please wait.',
      'syncing': `Currently syncing inventory from ${details.providersHealthy} connected providers. New opportunities will appear as they arrive.`,
      'healthy': `Everything\'s working great! ${details.activeOpportunities} opportunities available from ${details.providersHealthy} providers.`,
      'degraded': `${details.providersOffline} providers are temporarily offline. ${details.activeOpportunities} opportunities are still available. We\'re working to restore full service.`,
      'empty_awaiting': 'Marketplace is loading opportunities from providers. This typically takes a few seconds.',
      'empty_unavailable': 'No providers are currently available. The marketplace will resume when providers come back online.',
      'maintenance': 'Marketplace is under maintenance. We\'ll be back online shortly.',
    };

    let desc = descriptions[state];

    // Add additional context
    if (details.failedSyncs > 0) {
      desc += ` (${details.failedSyncs} recent errors being resolved)`;
    }
    if (details.pendingVerifications > 10) {
      desc += ` (${details.pendingVerifications} verifications in queue)`;
    }

    return desc;
  }

  /**
   * Get recommended action for the user based on state.
   */
  getRecommendedAction(status: MarketplaceOperationalStatus): { text: string; url?: string } | null {
    const { state } = status;

    const actions: Record<MarketplaceOperationalState, { text: string; url?: string } | null> = {
      'loading': null, // Just wait
      'syncing': null, // Just wait
      'healthy': null, // Everything good
      'degraded': { text: 'View Details', url: '/admin/marketplace/health' },
      'empty_awaiting': null, // Just wait
      'empty_unavailable': { text: 'Check System Status', url: '/status' },
      'maintenance': { text: 'View Maintenance Status', url: '/status' },
    };

    return actions[state] ?? null;
  }

  /**
   * Get last successful sync timestamp across all providers.
   */
  private async getLastSuccessfulSync(): Promise<Date | null> {
    // In real app: query provider_sync_status collection
    return null;
  }

  /**
   * Count failed syncs in the last 24 hours.
   */
  private async getFailedSyncCount(): Promise<number> {
    // In real app: query provider_sync_status where status === 'failed'
    return 0;
  }

  /**
   * Get pending verification count.
   */
  private async getPendingVerificationCount(): Promise<number> {
    // In real app: query marketplace_opportunities where status === 'awaiting_verification'
    return 0;
  }

  /**
   * Get callback queue depth.
   */
  private async getCallbackQueueDepth(): Promise<number> {
    // In real app: query provider_callbacks where status === 'pending'
    return 0;
  }
}

// Singleton instance
export const OperationalState = new OperationalStateEngine();
