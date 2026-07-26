/**
 * Provider Inventory Sync Engine
 * 
 * PHASE 15.5 - Provider Orchestration Rebuild
 * 
 * Ensures consistent pipeline:
 * Provider → Inventory → Campaign → Opportunity → Marketplace
 * 
 * Every provider follows the SAME pipeline regardless of capability.
 * No provider-specific branching logic.
 * Each provider self-describes its inventory source via metadata.
 */

import type { ProviderMetadata } from '../../types/provider';
import { ProviderDiscovery } from './ProviderDiscoveryEngine';

export interface SyncResult {
  success: boolean;
  providerId: string;
  timestamp: Date;
  itemsSynced: number;
  campaignsGenerated: number;
  opportunitiesGenerated: number;
  errors: string[];
}

export class ProviderInventorySyncEngine {
  private syncInProgress = new Map<string, boolean>();

  /**
   * Sync inventory for a provider through the complete pipeline.
   * The pipeline is ALWAYS the same, but inventory source varies.
   */
  async syncProviderInventory(providerId: string): Promise<SyncResult> {
    if (this.syncInProgress.get(providerId)) {
      return {
        success: false,
        providerId,
        timestamp: new Date(),
        itemsSynced: 0,
        campaignsGenerated: 0,
        opportunitiesGenerated: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress.set(providerId, true);
    const errors: string[] = [];

    try {
      const provider = ProviderDiscovery.getProvider(providerId);
      if (!provider) {
        return {
          success: false,
          providerId,
          timestamp: new Date(),
          itemsSynced: 0,
          campaignsGenerated: 0,
          opportunitiesGenerated: 0,
          errors: [`Provider ${providerId} not found`],
        };
      }

      // Step 1: Fetch inventory from provider based on its capabilities
      let inventory = [];
      try {
        inventory = await this.fetchInventory(provider);
      } catch (err: any) {
        errors.push(`Failed to fetch inventory: ${err.message}`);
      }

      const itemsSynced = inventory.length;

      // Step 2: Store raw inventory
      await this.storeRawInventory(providerId, inventory);

      // Step 3: Generate campaigns from inventory
      const campaigns = await this.generateCampaigns(providerId, inventory);
      await this.storeCampaigns(campaigns);
      const campaignsGenerated = campaigns.length;

      // Step 4: Generate opportunities from campaigns
      const opportunities = await this.generateOpportunities(campaigns);
      await this.storeOpportunities(opportunities);
      const opportunitiesGenerated = opportunities.length;

      // Step 5: Notify marketplace refresh
      await this.notifyMarketplaceRefresh();

      return {
        success: true,
        providerId,
        timestamp: new Date(),
        itemsSynced,
        campaignsGenerated,
        opportunitiesGenerated,
        errors,
      };
    } catch (err: any) {
      errors.push(`Sync failed: ${err.message}`);
      return {
        success: false,
        providerId,
        timestamp: new Date(),
        itemsSynced: 0,
        campaignsGenerated: 0,
        opportunitiesGenerated: 0,
        errors,
      };
    } finally {
      this.syncInProgress.set(providerId, false);
    }
  }

  /**
   * Fetch inventory from provider using its configured source.
   * Source is determined by provider metadata, not hardcoded logic.
   */
  private async fetchInventory(provider: ProviderMetadata): Promise<any[]> {
    const source = provider.capabilities.inventorySource;

    switch (source) {
      case 'api':
        return this.fetchFromAPI(provider);
      case 'webhook':
        return this.fetchFromWebhook(provider);
      case 'manual':
        return this.fetchManualCampaigns(provider);
      case 'hybrid':
        // Try API first, fallback to webhooks/manual
        try {
          return await this.fetchFromAPI(provider);
        } catch (err) {
          try {
            return await this.fetchFromWebhook(provider);
          } catch (err2) {
            return this.fetchManualCampaigns(provider);
          }
        }
      default:
        return [];
    }
  }

  /**
   * Fetch inventory via API (if provider supports it).
   */
  private async fetchFromAPI(provider: ProviderMetadata): Promise<any[]> {
    if (!provider.capabilities.supportsInventoryAPI) {
      throw new Error('Provider does not support inventory API');
    }

    if (!provider.configuration.apiEndpoint) {
      throw new Error('No API endpoint configured');
    }

    const response = await fetch(provider.configuration.apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${provider.configuration.apiKey || ''}`,
        ...provider.configuration.customHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch inventory from stored webhooks (if provider uses webhooks).
   */
  private async fetchFromWebhook(provider: ProviderMetadata): Promise<any[]> {
    if (!provider.capabilities.supportsWebhook) {
      throw new Error('Provider does not support webhooks');
    }

    // Query most recent webhook payload from Firestore
    // In real app, this would use proper Firebase admin SDK
    return [];
  }

  /**
   * Fetch manually configured campaigns (if provider supports it).
   */
  private async fetchManualCampaigns(provider: ProviderMetadata): Promise<any[]> {
    if (!provider.capabilities.supportsManualCampaigns) {
      throw new Error('Provider does not support manual campaigns');
    }

    // Query manual_campaigns collection filtered by provider
    // In real app, this would use proper Firebase admin SDK
    return [];
  }

  /**
   * Store raw inventory for auditing and sync tracking.
   */
  private async storeRawInventory(_providerId: string, _inventory: any[]): Promise<void> {
    // In real app: db.collection('provider_raw_inventory').doc(providerId).set(...)
  }

  /**
   * Generate campaigns from provider inventory.
   * Campaigns are the Marketplace's middle layer between Provider and Opportunity.
   */
  private async generateCampaigns(providerId: string, inventory: any[]): Promise<any[]> {
    return inventory.map((item: any) => ({
      id: `${providerId}-${item.id}`,
      providerId,
      name: item.name || item.title || 'Unnamed Campaign',
      description: item.description || '',
      status: 'active',
      opportunities: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Generate opportunities from campaigns.
   * Opportunities are what the Marketplace displays to users.
   */
  private async generateOpportunities(campaigns: any[]): Promise<any[]> {
    const opportunities: any[] = [];

    for (const campaign of campaigns) {
      // Each campaign creates at least one opportunity
      opportunities.push({
        id: campaign.id,
        campaignId: campaign.id,
        providerId: campaign.providerId,
        title: campaign.name,
        description: campaign.description,
        status: 'available',
        category: 'featured',
        action: {
          actionType: 'launch',
          url: '',
        },
        reward: {
          points: 0,
          xp: 0,
        },
        verificationMethod: 'callback', // Default, overridable by provider
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return opportunities;
  }

  /**
   * Store campaigns (replaces any existing campaigns for this provider).
   */
  private async storeCampaigns(_campaigns: any[]): Promise<void> {
    // In real app: batch write to campaigns collection
  }

  /**
   * Store opportunities (replaces any existing opportunities for these campaigns).
   */
  private async storeOpportunities(_opportunities: any[]): Promise<void> {
    // In real app: batch write to marketplace_opportunities collection
  }

  /**
   * Trigger Marketplace refresh by updating last_sync timestamp.
   */
  private async notifyMarketplaceRefresh(): Promise<void> {
    // In real app: update marketplace_state document to trigger listeners
  }

  /**
   * Schedule recurring syncs for providers that support it.
   */
  scheduleProviderSync(providerId: string, intervalMs: number): () => void {
    const provider = ProviderDiscovery.getProvider(providerId);
    if (!provider) return () => {};

    const syncMode = provider.capabilities.syncMode;
    
    if (syncMode !== 'scheduled' && syncMode !== 'hybrid') {
      return () => {};
    }

    const interval = setInterval(() => {
      this.syncProviderInventory(providerId).catch(err => {
        console.error(`[ProviderInventorySync] Error syncing ${providerId}:`, err);
      });
    }, intervalMs || provider.capabilities.syncIntervalMs || 5 * 60 * 1000);

    // Return unsubscribe function
    return () => clearInterval(interval);
  }
}

// Singleton instance
export const ProviderInventorySync = new ProviderInventorySyncEngine();
