/**
 * Marketplace Health Monitor Engine
 * 
 * PHASE 15.5 - Operational Metrics for Engine Intelligence
 * 
 * Tracks marketplace operational health:
 * - Providers connected/healthy
 * - Active campaigns/opportunities
 * - Inventory sync status
 * - Pending verifications
 * - Callback queue depth
 * - Failed syncs
 * - Last successful refresh
 * 
 * These are operational metrics for the engine, NOT decorative UI.
 */

import { ProviderDiscovery } from './ProviderDiscoveryEngine';

export interface MarketplaceHealthMetrics {
  timestamp: Date;
  
  // Provider Health
  providersConnected: number;
  providersActive: number;
  providersHealthy: number;
  providersDegraded: number;
  providersOffline: number;
  providersMaintenance: number;
  
  // Inventory Status
  activeCampaigns: number;
  activeOpportunities: number;
  totalInventoryItems: number;
  
  // Sync Status
  lastSuccessfulSyncAt: Date | null;
  lastFailedSyncAt: Date | null;
  failedSyncsInLast24h: number;
  averageSyncDuration: number; // ms
  successRate: number; // 0-100%
  
  // Verification Queue
  pendingVerifications: number;
  verificationBacklog: number;
  averageVerificationTime: number; // seconds
  
  // Callback Queue
  callbackQueueDepth: number;
  failedCallbacks: number;
  
  // Performance
  uptime: number; // 0-100%
  overallHealth: 'healthy' | 'degraded' | 'critical';
}

export interface ProviderHealthMetrics {
  providerId: string;
  providerName: string;
  status: 'healthy' | 'degraded' | 'offline' | 'maintenance';
  lastSync: Date | null;
  syncSuccessRate: number; // 0-100%
  opportunityCount: number;
  failedSyncs: number;
  averageSyncTime: number; // ms
}

export interface SyncHealthMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number; // 0-100%
  averageDuration: number; // ms
  totalInventoryFetched: number;
  totalOpportunitiesGenerated: number;
}

export interface QueueHealthMetrics {
  verificationQueueLength: number;
  verificationQueueWaitTime: number; // seconds
  callbackQueueLength: number;
  callbackQueueWaitTime: number; // seconds
  failedCallbacks: number;
  retryQueueLength: number;
}

export class MarketplaceHealthMonitorEngine {
  
  /**
   * Get comprehensive marketplace health metrics.
   * Used by admin dashboard and operational intelligence.
   */
  async getMarketplaceHealth(): Promise<MarketplaceHealthMetrics> {
    const providers = ProviderDiscovery.getAllProviders();
    const activeProviders = ProviderDiscovery.getActiveProviders();
    const healthyProviders = ProviderDiscovery.getHealthyProviders();
    
    const degraded = providers.filter(p => p.capabilities.healthStatus === 'degraded').length;
    const offline = providers.filter(p => p.capabilities.healthStatus === 'offline').length;
    const maintenance = providers.filter(p => p.capabilities.healthStatus === 'maintenance').length;

    // Get inventory status
    // In real app: query campaigns, opportunities, and raw inventory collections
    const activeCampaigns = 0;
    const activeOpportunities = 0;
    const totalInventoryItems = 0;

    // Get sync metrics
    const syncMetrics = await this.getSyncHealthMetrics();

    // Get queue metrics
    const queueMetrics = await this.getQueueHealthMetrics();

    // Calculate overall health
    const overallHealth = this.calculateOverallHealth(
      providers.length,
      healthyProviders.length,
      degraded,
      offline,
      maintenance,
      syncMetrics.successRate,
      queueMetrics.verificationQueueLength
    );

    return {
      timestamp: new Date(),
      
      providersConnected: providers.length,
      providersActive: activeProviders.length,
      providersHealthy: healthyProviders.length,
      providersDegraded: degraded,
      providersOffline: offline,
      providersMaintenance: maintenance,
      
      activeCampaigns,
      activeOpportunities,
      totalInventoryItems,
      
      lastSuccessfulSyncAt: await this.getLastSuccessfulSync(),
      lastFailedSyncAt: await this.getLastFailedSync(),
      failedSyncsInLast24h: await this.getFailedSyncsInLast24h(),
      averageSyncDuration: syncMetrics.averageDuration,
      successRate: syncMetrics.successRate,
      
      pendingVerifications: queueMetrics.verificationQueueLength,
      verificationBacklog: queueMetrics.verificationQueueLength,
      averageVerificationTime: queueMetrics.verificationQueueWaitTime,
      
      callbackQueueDepth: queueMetrics.callbackQueueLength,
      failedCallbacks: queueMetrics.failedCallbacks,
      
      uptime: await this.calculateUptime(),
      overallHealth,
    };
  }

  /**
   * Get per-provider health metrics.
   */
  async getProviderHealthMetrics(): Promise<ProviderHealthMetrics[]> {
    const providers = ProviderDiscovery.getAllProviders();
    const metrics: ProviderHealthMetrics[] = [];

    for (const provider of providers) {
      const syncStats = await this.getProviderSyncStats(provider.id);

      metrics.push({
        providerId: provider.id,
        providerName: provider.name,
        status: provider.capabilities.healthStatus,
        lastSync: provider.capabilities.lastSyncAt,
        syncSuccessRate: syncStats.successRate,
        opportunityCount: provider.capabilities.opportunityCount,
        failedSyncs: syncStats.failedSyncs,
        averageSyncTime: syncStats.averageDuration,
      });
    }

    // Sort by success rate descending
    metrics.sort((a, b) => b.syncSuccessRate - a.syncSuccessRate);

    return metrics;
  }

  /**
   * Get sync health metrics across all providers.
   */
  private async getSyncHealthMetrics(): Promise<SyncHealthMetrics> {
    // In real app: query provider_sync_status collection
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      successRate: 0,
      averageDuration: 0,
      totalInventoryFetched: 0,
      totalOpportunitiesGenerated: 0,
    };
  }

  /**
   * Get queue health metrics.
   */
  private async getQueueHealthMetrics(): Promise<QueueHealthMetrics> {
    // In real app: query various queue collections
    return {
      verificationQueueLength: 0,
      verificationQueueWaitTime: 0,
      callbackQueueLength: 0,
      callbackQueueWaitTime: 0,
      failedCallbacks: 0,
      retryQueueLength: 0,
    };
  }

  /**
   * Get provider-specific sync statistics.
   */
  private async getProviderSyncStats(_providerId: string): Promise<{
    successRate: number;
    failedSyncs: number;
    averageDuration: number;
  }> {
    // In real app: query provider_sync_status filtered by providerId
    return {
      successRate: 0,
      failedSyncs: 0,
      averageDuration: 0,
    };
  }

  /**
   * Calculate overall marketplace health status.
   */
  private calculateOverallHealth(
    totalProviders: number,
    healthyProviders: number,
    degraded: number,
    offline: number,
    maintenance: number,
    syncSuccessRate: number,
    verificationQueueLength: number
  ): 'healthy' | 'degraded' | 'critical' {
    // Critical conditions
    if (totalProviders === 0 || healthyProviders === 0) {
      return 'critical';
    }
    // Include maintenance in unavailable count (both are non-viable)
    const unavailable = offline + degraded + maintenance;
    if (unavailable > totalProviders * 0.5) {
      // More than 50% unavailable or in maintenance
      return 'critical';
    }
    if (syncSuccessRate < 50) {
      // Less than 50% sync success
      return 'critical';
    }
    if (verificationQueueLength > 1000) {
      // Massive queue backlog
      return 'critical';
    }

    // Degraded conditions
    if (degraded > totalProviders * 0.2) {
      // More than 20% degraded
      return 'degraded';
    }
    if (syncSuccessRate < 85) {
      // Less than 85% sync success
      return 'degraded';
    }
    if (verificationQueueLength > 100) {
      // Significant queue backlog
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get last successful sync timestamp.
   */
  private async getLastSuccessfulSync(): Promise<Date | null> {
    // In real app: query provider_sync_status where status === 'success' ordered by timestamp
    return null;
  }

  /**
   * Get last failed sync timestamp.
   */
  private async getLastFailedSync(): Promise<Date | null> {
    // In real app: query provider_sync_status where status === 'failed'
    return null;
  }

  /**
   * Count failed syncs in last 24 hours.
   */
  private async getFailedSyncsInLast24h(): Promise<number> {
    // In real app: query provider_sync_status filtered by 24h window
    return 0;
  }

  /**
   * Calculate marketplace uptime percentage.
   */
  private async calculateUptime(): Promise<number> {
    // In real app: calculate from system_health collection
    return 100;
  }

  /**
   * Get health alert if any issues detected.
   */
  async getHealthAlert(metrics: MarketplaceHealthMetrics): Promise<{
    level: 'info' | 'warning' | 'error';
    title: string;
    description: string;
  } | null> {
    if (metrics.overallHealth === 'critical') {
      return {
        level: 'error',
        title: 'Critical marketplace issues detected',
        description: `${metrics.providersOffline} providers offline, ${metrics.failedSyncsInLast24h} sync failures`,
      };
    }

    if (metrics.overallHealth === 'degraded') {
      return {
        level: 'warning',
        title: 'Marketplace performance degraded',
        description: `${metrics.providersDegraded} providers degraded, sync success rate: ${metrics.successRate}%`,
      };
    }

    if (metrics.callbackQueueDepth > 500) {
      return {
        level: 'warning',
        title: 'Callback queue backing up',
        description: `${metrics.callbackQueueDepth} callbacks pending`,
      };
    }

    if (metrics.pendingVerifications > 200) {
      return {
        level: 'warning',
        title: 'Verification queue building',
        description: `${metrics.pendingVerifications} verifications pending`,
      };
    }

    return null;
  }
}

// Singleton instance
export const HealthMonitor = new MarketplaceHealthMonitorEngine();
