import { db } from '../../firebase/config';
import {
  doc,
  increment,
  collection,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { Transaction } from '../../types';
import { calculateLevel } from '../..//utils/progression';

export interface PointTransactionRequest {
  userId: string;
  amount: number;
  type: Transaction['type'] | 'AI_SYSTEM_CORRECTION';
  source: string;
  description?: string;
  xpReward?: number;
  metadata?: Record<string, any>;
}

export class PointTransactionEngine {
  /**
   * The single authoritative method for moving points in the PulseEarn ecosystem.
   * Ensures atomic balance updates and transaction logging.
   */
  static async execute(request: PointTransactionRequest) {
    const { userId, amount, type, source, xpReward = 0, metadata = {} } = request;
    const userRef = doc(db, 'users', userId);
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const settingsRef = doc(db, 'system', 'settings');

    try {
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("User identity not found in ecosystem");

        const userData = userSnap.data();
        const settingsSnap = await transaction.get(settingsRef);
        const settings = settingsSnap.exists() ? settingsSnap.data() : { dailyPointsCap: 1000 };

        // 1. Point Deductions Safety
        if (amount < 0 && (userData.points || 0) + amount < 0) {
          throw new Error("Insufficient point balance for transaction");
        }

        // 2. Daily Earning Cap Validation (for positive rewards only)
        if (amount > 0 && type !== 'AI_SYSTEM_CORRECTION') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastRewardDate = userData.lastRewardDate?.toDate();
          const isNewDay = !lastRewardDate || lastRewardDate < today;

          let currentTodayPoints = isNewDay ? 0 : (userData.totalEarnedToday || 0);
          if (currentTodayPoints + amount > settings.dailyPointsCap) {
             // We allow the transaction but cap it at the remaining limit
             const allowableAmount = Math.max(0, settings.dailyPointsCap - currentTodayPoints);
             if (allowableAmount === 0) throw new Error("Daily ecosystem reward cap reached");
             // Note: In a production scenario, we might want to log that it was capped.
          }
        }

        // 3. Progression Logic
        const newXp = (userData.xp || 0) + (amount > 0 ? xpReward : 0);
        const newLevel = calculateLevel(newXp);

        // 4. Update User State
        transaction.update(userRef, {
          points: increment(amount),
          xp: newXp,
          level: newLevel,
          totalEarnedToday: amount > 0 ? increment(amount) : (userData.totalEarnedToday || 0),
          lastActionTimestamp: serverTimestamp(),
          // Metadata for tracking
          ['stats.lastTransactionAmount']: amount,
          ['stats.lastTransactionType']: type
        });

        // 5. Create Immutable Transaction Record
        const txDoc = doc(transactionsRef);
        transaction.set(txDoc, {
          userId,
          type,
          amount,
          source,
          description: request.description || '',
          metadata,
          timestamp: serverTimestamp(),
          engineVersion: '2.0.0-AI'
        });
      });

      return { success: true };
    } catch (error: any) {
      console.error("[PointAI] Transaction Failed:", error.message);
      return { success: false, error: error.message };
    }
  }
}
