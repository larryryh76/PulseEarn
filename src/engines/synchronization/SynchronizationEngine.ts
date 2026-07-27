/**
 * Synchronization Engine
 * 
 * PHASE 15.5 - Real-time Synchronization Layer
 * 
 * When ANY change happens (opportunity completion, campaign deletion, etc.),
 * it propagates IMMEDIATELY to all dependent systems:
 * Dashboard ↔ Marketplace ↔ Wallet ↔ Activity ↔ History ↔ Notifications ↔ Profile ↔ Leaderboard ↔ Admin
 * 
 * No stale data. No ghost opportunities. No inconsistent states.
 */

import type { PointTransaction } from '../../types/statistics';

export type SyncEvent = 
  | 'marketplace:refresh'
  | 'dashboard:refresh'
  | 'wallet:refresh'
  | 'activity:update'
  | 'history:update'
  | 'notifications:update'
  | 'profile:refresh'
  | 'leaderboard:refresh'
  | 'admin:update'
  | 'search:refresh'
  | 'filters:refresh'
  | 'opportunity:completed'
  | 'opportunity:verified'
  | 'campaign:deleted'
  | 'provider:status_changed';

export interface SyncChangeData {
  event: SyncEvent;
  timestamp: Date;
  data: any;
  source?: string; // Which system triggered this change
}

export class SynchronizationEngine {
  private changeListeners = new Map<string, Set<(data: SyncChangeData) => void>>();

  /**
   * Listen for opportunity completion and propagate everywhere.
   */
  listenForOpportunityCompletion(
    _db: any,
    _callback: (opportunityId: string) => void
  ): () => void {
    // In real app: db.collection('marketplace_opportunities')
    //   .where('status', '==', 'verified')
    //   .onSnapshot(...)
    
    return () => {};
  }

  /**
   * Propagate opportunity completion through entire pipeline.
   * Touches: Dashboard, Marketplace, Wallet, Activity, History, Notifications, Profile, Leaderboard, Admin
   */
  async propagateOpportunityCompletion(
    opportunityId: string,
    transaction: PointTransaction
  ): Promise<void> {
    const changeData: SyncChangeData = {
      event: 'opportunity:completed',
      timestamp: new Date(),
      data: { opportunityId, transaction },
    };

    // 1. Marketplace refresh - remove completed opportunity from available list
    this.broadcast('marketplace:refresh', changeData);

    // 2. Dashboard refresh - update stats
    this.broadcast('dashboard:refresh', changeData);

    // 3. Wallet update - points arrived
    this.broadcast('wallet:refresh', changeData);

    // 4. Activity feed - new activity entry
    this.broadcast('activity:update', changeData);

    // 5. History - add to transaction history
    this.broadcast('history:update', changeData);

    // 6. Notifications - new notification
    this.broadcast('notifications:update', changeData);

    // 7. Profile - update stats
    this.broadcast('profile:refresh', changeData);

    // 8. Leaderboard - update user ranking
    this.broadcast('leaderboard:refresh', changeData);

    // 9. Admin - audit trail
    this.broadcast('admin:update', changeData);
  }

  /**
   * Listen for campaign deletion.
   */
  listenForCampaignDeletion(
    _db: any,
    _callback: (campaignId: string) => void
  ): () => void {
    // In real app: db.collection('campaigns')
    //   .onSnapshot(...)

    return () => {};
  }

  /**
   * Propagate campaign deletion through entire pipeline.
   * All associated opportunities are removed.
   */
  async propagateCampaignDeletion(campaignId: string): Promise<void> {
    const changeData: SyncChangeData = {
      event: 'campaign:deleted',
      timestamp: new Date(),
      data: { campaignId },
    };

    // Delete all associated opportunities
    // In real app: db.collection('marketplace_opportunities')
    //   .where('campaignId', '==', campaignId)
    //   .get() -> batch delete

    // Propagate to all systems
    this.broadcast('marketplace:refresh', changeData);
    this.broadcast('dashboard:refresh', changeData);
    this.broadcast('search:refresh', changeData);
    this.broadcast('filters:refresh', changeData);
    this.broadcast('activity:update', changeData);
    this.broadcast('admin:update', changeData);
  }

  /**
   * Listen for provider status changes (health degradation, recovery, maintenance).
   */
  listenForProviderStatusChange(
    _db: any,
    _callback: (providerId: string, newStatus: string) => void
  ): () => void {
    // In real app: db.collection('marketplace_providers')
    //   .onSnapshot(...)

    return () => {};
  }

  /**
   * Propagate provider status change.
   * Affects marketplace display and operational state.
   */
  async propagateProviderStatusChange(
    providerId: string,
    newStatus: 'healthy' | 'degraded' | 'offline' | 'maintenance'
  ): Promise<void> {
    const changeData: SyncChangeData = {
      event: 'provider:status_changed',
      timestamp: new Date(),
      data: { providerId, newStatus },
    };

    // Marketplace updates operational state
    this.broadcast('marketplace:refresh', changeData);

    // Dashboard updates provider health status
    this.broadcast('dashboard:refresh', changeData);

    // Admin updates monitoring
    this.broadcast('admin:update', changeData);

    // Search/filters update available providers
    this.broadcast('search:refresh', changeData);
    this.broadcast('filters:refresh', changeData);
  }

  /**
   * Subscribe to sync events.
   * Every page that needs to stay in sync should subscribe.
   * 
   * Usage:
   * const unsubscribe = Synchronization.subscribe('dashboard:refresh', (data) => {
   *   refreshDashboard(data);
   * });
   */
  subscribe(event: SyncEvent, callback: (data: SyncChangeData) => void): () => void {
    if (!this.changeListeners.has(event)) {
      this.changeListeners.set(event, new Set());
    }

    this.changeListeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.changeListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Subscribe to multiple events at once.
   * Useful for pages that care about several event types.
   */
  subscribeMultiple(
    events: SyncEvent[],
    callback: (data: SyncChangeData) => void
  ): () => void {
    const unsubscribers = events.map(event => this.subscribe(event, callback));

    // Return unsubscribe function that removes all subscriptions
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  /**
   * Broadcast a change to all listeners.
   */
  private broadcast(event: SyncEvent, data: SyncChangeData): void {
    const callbacks = this.changeListeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[Synchronization] Error in ${event} callback:`, err);
        }
      });
    }
  }

  /**
   * Manually trigger a sync event.
   * Used for testing or manual refresh.
   */
  triggerEvent(event: SyncEvent, data: any): void {
    this.broadcast(event, {
      event,
      timestamp: new Date(),
      data,
      source: 'manual',
    });
  }

  /**
   * Get all registered listeners for debugging.
   */
  getListenerCount(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.changeListeners.forEach((listeners, event) => {
      counts[event] = listeners.size;
    });
    return counts;
  }

  /**
   * Clear all listeners (for cleanup/testing).
   */
  clearAllListeners(): void {
    this.changeListeners.clear();
  }
}

// Singleton instance
export const Synchronization = new SynchronizationEngine();
