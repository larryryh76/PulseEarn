/**
 * Statistics Engine
 * 
 * PHASE 15.5 - Single Source of Truth
 * 
 * ALL pages (Dashboard, Marketplace, Profile, History, Notifications, Leaderboard)
 * read statistics from ONE authoritative source: the PointTransactionEngine ledger.
 * 
 * No independent calculations.
 * No duplicated statistics logic.
 * No page-specific totals.
 * 
 * Real-time listeners ensure all pages stay synchronized.
 */

import type {
  UserStatistics,
  PointTransaction,
} from '../../types/statistics';

export class StatisticsEngine {
  private userStats = new Map<string, UserStatistics>();
  private listeners = new Map<string, Set<(stats: UserStatistics) => void>>();
  private unsubscribers = new Map<string, () => void>();

  /**
   * Initialize real-time listener for a user.
   * Subscribes to PointTransactionEngine ledger and recalculates stats on every change.
   * This ensures all pages see the same data immediately.
   */
  initializeForUser(userId: string, db: any): void {
    if (this.unsubscribers.has(userId)) {
      // Already listening
      return;
    }

    // Create real-time listener on PointTransactionEngine ledger
    const unsubscribe = db
      .collection('point_transactions')
      .where('userId', '==', userId)
      .where('status', '==', 'completed')
      .onSnapshot((snapshot: any) => {
        const transactions = snapshot.docs.map((doc: any) => doc.data() as PointTransaction);
        const stats = this.calculateFromLedger(userId, transactions);
        this.userStats.set(userId, stats);
        
        // Notify ALL listeners (Dashboard, Marketplace, Profile, etc.)
        this.notifyListeners(userId, stats);
      });

    this.unsubscribers.set(userId, unsubscribe);
  }

  /**
   * Calculate all statistics from authoritative PointTransactionEngine ledger.
   * This is the SINGLE place statistics are computed.
   * Every page reads from this ONE source.
   */
  private calculateFromLedger(userId: string, transactions: PointTransaction[]): UserStatistics {
    let totalPointsEarned = 0;
    let currentPoints = 0;
    let totalXP = 0;
    let tasksCompleted = 0;
    let opportunitiesCompleted = 0;
    let surveysCompleted = 0;
    let gamesCompleted = 0;
    let installsCompleted = 0;
    let referralRewards = 0;
    let predictionRewards = 0;
    let dailyBonuses = 0;
    let seasonalRewards = 0;

    // Iterate through transaction ledger
    for (const tx of transactions) {
      totalPointsEarned += tx.amount || 0;
      currentPoints += tx.amount || 0;
      totalXP += tx.xpAwarded || 0;

      // Count completions by type
      switch (tx.type) {
        case 'task_completion':
          tasksCompleted++;
          break;
        case 'opportunity_completion':
          opportunitiesCompleted++;
          break;
        case 'survey_completion':
          surveysCompleted++;
          break;
        case 'game_completion':
          gamesCompleted++;
          break;
        case 'install_completion':
          installsCompleted++;
          break;
        case 'referral_reward':
          referralRewards += tx.amount;
          break;
        case 'prediction_reward':
          predictionRewards += tx.amount;
          break;
        case 'daily_bonus':
          dailyBonuses += tx.amount;
          break;
        case 'seasonal_reward':
          seasonalRewards += tx.amount;
          break;
      }
    }

    // Calculate level from XP (example: 100 XP per level)
    const currentLevel = Math.floor(totalXP / 100) + 1;
    const nextLevelXP = currentLevel * 100;
    const xpProgress = ((totalXP % 100) / 100) * 100;

    return {
      userId,
      totalPointsEarned,
      currentPoints,
      currentTier: this.getTierFromPoints(totalPointsEarned),
      totalXP,
      currentLevel,
      nextLevelXP,
      xpProgress,
      tasksCompleted,
      opportunitiesCompleted,
      surveysCompleted,
      gamesCompleted,
      installsCompleted,
      referralRewards,
      predictionRewards,
      dailyBonuses,
      seasonalRewards,
      currentStreak: 0, // TODO: Calculate from activity
      longestStreak: 0, // TODO: Calculate from history
      achievementsUnlocked: 0, // TODO: Query achievements collection
      lastActivityAt: transactions.length > 0 
        ? transactions[transactions.length - 1].createdAt 
        : new Date(),
      totalSessions: 0, // TODO: Query sessions collection
      averageSessionDuration: 0, // TODO: Calculate from sessions
      accountStatus: 'active',
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate user tier from total points earned.
   * Used for progression display and recommendations.
   */
  private getTierFromPoints(points: number): string {
    if (points >= 100000) return 'Platinum';
    if (points >= 50000) return 'Gold';
    if (points >= 25000) return 'Silver';
    if (points >= 10000) return 'Bronze';
    if (points >= 1000) return 'Member';
    return 'Newcomer';
  }

  /**
   * Get current statistics for a user (synchronous read).
   * Used when page mounts or needs immediate data.
   */
  getStats(userId: string): UserStatistics | undefined {
    return this.userStats.get(userId);
  }

  /**
   * Subscribe to statistics updates.
   * Every page that displays stats should subscribe here.
   * Returns unsubscribe function.
   * 
   * Usage:
   * const unsubscribe = Statistics.subscribe(userId, (stats) => {
   *   setDashboardStats(stats);
   *   setMarketplaceStats(stats);
   * });
   */
  subscribe(userId: string, callback: (stats: UserStatistics) => void): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    
    this.listeners.get(userId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(userId)?.delete(callback);
    };
  }

  /**
   * Notify all listeners of a statistics change.
   * Called whenever the ledger updates.
   */
  private notifyListeners(userId: string, stats: UserStatistics): void {
    const callbacks = this.listeners.get(userId);
    if (callbacks) {
      callbacks.forEach(callback => callback(stats));
    }
  }

  /**
   * Stop listening for a user.
   * Call when user logs out or component unmounts.
   */
  cleanup(userId: string): void {
    const unsubscribe = this.unsubscribers.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(userId);
    }

    this.userStats.delete(userId);
    this.listeners.delete(userId);
  }

  /**
   * Get specific statistic for display.
   * Used by pages that need individual stats.
   */
  getTotalPointsEarned(userId: string): number {
    return this.getStats(userId)?.totalPointsEarned ?? 0;
  }

  getCurrentPoints(userId: string): number {
    return this.getStats(userId)?.currentPoints ?? 0;
  }

  getTotalXP(userId: string): number {
    return this.getStats(userId)?.totalXP ?? 0;
  }

  getCurrentLevel(userId: string): number {
    return this.getStats(userId)?.currentLevel ?? 1;
  }

  getTasksCompleted(userId: string): number {
    return this.getStats(userId)?.tasksCompleted ?? 0;
  }

  getOpportunitiesCompleted(userId: string): number {
    return this.getStats(userId)?.opportunitiesCompleted ?? 0;
  }

  getReferralRewards(userId: string): number {
    return this.getStats(userId)?.referralRewards ?? 0;
  }

  getPredictionRewards(userId: string): number {
    return this.getStats(userId)?.predictionRewards ?? 0;
  }

  getCurrentTier(userId: string): string {
    return this.getStats(userId)?.currentTier ?? 'Newcomer';
  }
}

// Singleton instance
export const Statistics = new StatisticsEngine();
