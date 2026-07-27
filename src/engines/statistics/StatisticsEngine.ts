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
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { resolveTimestamp } from '../../utils';

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
    const pageListeners = this.listeners.get(userId);
    if (!pageListeners || pageListeners.size === 0) {
      return;
    }
    if (this.unsubscribers.has(userId)) {
      // Already listening
      return;
    }

    // Create real-time listener on PointTransactionEngine ledger
    // Backend ledger schema: users/{uid}/transactions with status 'COMPLETED'
    const q = query(
      collection(db, 'users', userId, 'transactions'),
      where('status', '==', 'COMPLETED')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map((doc: any) => {
        const d = doc.data();
        return { id: doc.id, ...d } as any;
      });
      const stats = this.calculateFromLedger(userId, transactions);
      this.userStats.set(userId, stats);

      // Notify ALL listeners (Dashboard, Marketplace, Profile, etc.)
      this.notifyListeners(userId, stats);
    }, (error) => {
      console.error("[StatisticsEngine] Ledger snapshot error:", error);
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
    let referralCount = 0;
    let predictionsCount = 0;

    const dailyTxDates: string[] = [];

    // Sort transactions chronologically to ensure calculations are completely accurate using unified resolver
    const sortedTxs = [...transactions].sort((a, b) => {
      const timeA = resolveTimestamp(a)?.getTime() || 0;
      const timeB = resolveTimestamp(b)?.getTime() || 0;
      return timeA - timeB;
    });

    const getUtcDateString = (dateVal: any): string => {
      const d = resolveTimestamp(dateVal);
      if (!d) return '';

      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    // Iterate through sorted transaction ledger
    for (const tx of sortedTxs) {
      const amount = tx.amount || 0;
      const xp = (tx as any).xp !== undefined ? (tx as any).xp : (tx.xpAwarded || 0);

      if (amount > 0) {
        totalPointsEarned += amount;
      }
      currentPoints += amount;
      totalXP += xp;

      // Count completions by canonical backend transaction types
      const txType = tx.type as string;
      if (txType === 'prediction_stake' || txType === 'prediction_entry') {
        predictionsCount++;
      }

      switch (txType) {
        case 'task_reward':
          tasksCompleted++;
          opportunitiesCompleted++;
          break;
        case 'offerwall_reward':
          opportunitiesCompleted++;
          // Categorize if possible or generic
          if (tx.source?.toLowerCase().includes('survey')) {
            surveysCompleted++;
          } else if (tx.source?.toLowerCase().includes('game')) {
            gamesCompleted++;
          } else {
            installsCompleted++;
          }
          break;
        case 'referral_bonus':
        case 'referral_reward':
        case 'referral_bonus_received':
        case 'referral_bonus_earned':
          referralRewards += amount;
          referralCount++;
          break;
        case 'prediction_reward':
          predictionRewards += amount;
          break;
        case 'daily_reward': {
          dailyBonuses += amount;
          const dStr = getUtcDateString((tx as any).timestamp || (tx as any).createdAt || (tx as any).processedAt);
          if (dStr) {
            dailyTxDates.push(dStr);
          }
          break;
        }
      }
    }

    // Calculate level from XP using authoritative exponential progression model
    const baseLevelXp = 1000;
    const currentLevel = totalXP < baseLevelXp ? 1 : Math.floor(Math.log(totalXP / baseLevelXp) / Math.log(3)) + 2;
    const currentLevelThreshold = currentLevel <= 1 ? 0 : baseLevelXp * Math.pow(3, currentLevel - 2);
    const nextLevelXP = baseLevelXp * Math.pow(3, currentLevel - 1);
    const xpInLevel = totalXP - currentLevelThreshold;
    const xpNeededForNext = nextLevelXP - currentLevelThreshold;
    const xpProgress = xpNeededForNext > 0 ? Math.min(Math.floor((xpInLevel / xpNeededForNext) * 100), 100) : 100;

    // Calculate streaks from daily reward transactions (fully UTC consistent)
    const uniqueDays = Array.from(new Set(dailyTxDates));

    let currentStreak = 0;
    let longestStreak = 0;

    if (uniqueDays.length > 0) {
      let tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < uniqueDays.length; i++) {
        const prevParts = uniqueDays[i - 1].split('-').map(Number);
        const currParts = uniqueDays[i].split('-').map(Number);

        const prevDate = Date.UTC(prevParts[0], prevParts[1] - 1, prevParts[2]);
        const currDate = Date.UTC(currParts[0], currParts[1] - 1, currParts[2]);
        const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }

      const lastParts = uniqueDays[uniqueDays.length - 1].split('-').map(Number);
      const lastDateUtc = Date.UTC(lastParts[0], lastParts[1] - 1, lastParts[2]);

      const now = new Date();
      const nowDateUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const diffDays = Math.round((nowDateUtc - lastDateUtc) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
      }
    }

    const latestTx = sortedTxs.length > 0 ? sortedTxs[sortedTxs.length - 1] : null;
    const lastActivityAtDate = latestTx ? (resolveTimestamp(latestTx) || new Date()) : new Date();

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
      currentStreak,
      longestStreak,
      referralsCount: referralCount,
      predictionsCount,
      achievementsUnlocked: 0,
      lastActivityAt: lastActivityAtDate,
      totalSessions: 0,
      averageSessionDuration: 0,
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
   * Uses ref-counting of active subscribers to manage Firestore listener lifecycle perfectly (prevents leaks).
   */
  subscribe(userId: string, callback: (stats: UserStatistics) => void): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    
    this.listeners.get(userId)!.add(callback);
    
    // Automatically initialize listener if this is the first subscriber, verifying subscribers still exist
    // We import 'db' directly from config or use a global resolver
    import('../../firebase/config').then(({ db }) => {
      const pageListeners = this.listeners.get(userId);
      if (pageListeners && pageListeners.size > 0) {
        this.initializeForUser(userId, db);
      }
    });

    const currentCached = this.userStats.get(userId);
    if (currentCached) {
      callback(currentCached);
    }

    // Return unsubscribe function with clean reference counting
    return () => {
      const pageListeners = this.listeners.get(userId);
      if (pageListeners) {
        pageListeners.delete(callback);
        if (pageListeners.size === 0) {
          // No active subscribers remain for this user -> stop Firestore listener and release cache
          this.cleanup(userId);
        }
      }
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
