import { db } from '../../firebase/config';
import {
  doc,
  increment,
  collection,
  serverTimestamp,
  runTransaction,
  setDoc
} from 'firebase/firestore';
import { Transaction } from '../../types';
import { calculateLevel } from '../../utils/progression';

export interface PointTransactionRequest {
  userId: string;
  amount: number;
  type: Transaction['type'] | 'AI_SYSTEM_CORRECTION' | 'prediction_entry';
  source: string;
  claimId: string; // Unique Nonce/Claim ID (e.g. daily_20260525_UID)
  description?: string;
  xpReward?: number;
  metadata?: Record<string, any>;
  bypassLock?: boolean;
}

export type PointTransactionResult =
  | { success: true; txId: string; predictionId?: string }
  | { success: false; error: string };

export class PointTransactionEngine {
  /**
   * The single authoritative gateway for all economy mutations.
   * Features: Transactional Locking, Idempotency (Claim ID), and Centralized Validation.
   */
  static async execute(request: PointTransactionRequest): Promise<PointTransactionResult> {
    const { userId, amount, type, source, claimId, xpReward = 0, metadata = {} } = request;
    const userRef = doc(db, 'users', userId);
    const claimRef = doc(db, 'system_claims', claimId);
    const transactionsRef = collection(db, 'users', userId, 'transactions');

    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Acquire Lock & Check Idempotency
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("ENTITY_NOT_FOUND");

        const userData = userSnap.data();
        const claimSnap = await transaction.get(claimRef);
        if (claimSnap.exists()) throw new Error("REWARD_ALREADY_CLAIMED");

        // 2. Check Execution Lock (Race Condition Prevention)
        if (!request.bypassLock && userData.execution_lock) {
          const lockTime = userData.execution_lock_at?.toDate();
          const now = new Date();
          // If lock is older than 30s, assume it's stale and override
          if (lockTime && (now.getTime() - lockTime.getTime()) < 30000) {
            throw new Error("TRANSACTION_IN_PROGRESS");
          }
        }

        // 3. Set Lock
        transaction.update(userRef, {
          execution_lock: true,
          execution_lock_at: serverTimestamp()
        });

        // 4. Centralized Validation (Cooldowns, Eligibility)
        if (type === 'daily_reward') {
          const lastReward = userData.lastRewardDate?.toDate();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (lastReward && lastReward >= today) {
             throw new Error("DAILY_COOLDOWN_ACTIVE");
          }
        }

        // 5. Balance Safety
        if (amount < 0 && (userData.points || 0) + amount < 0) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        // 6. Execute Mutation
        const newXp = (userData.xp || 0) + (amount > 0 ? xpReward : 0);
        const newLevel = calculateLevel(newXp);

        transaction.update(userRef, {
          points: increment(amount),
          xp: newXp,
          level: newLevel,
          totalEarnedToday: amount > 0 ? increment(amount) : (userData.totalEarnedToday || 0),
          lastActionTimestamp: serverTimestamp(),
          execution_lock: false, // Release Lock
          execution_lock_at: null,
          ...(type === 'daily_reward' ? { lastRewardDate: serverTimestamp() } : {})
        });

        // 7. Create Immutable Claim Record (Idempotency Proof)
        transaction.set(claimRef, {
          userId,
          type,
          source,
          amount,
          executedAt: serverTimestamp(),
          metadata
        });

        // 8. Create Transaction Log
        const txDoc = doc(transactionsRef);
        transaction.set(txDoc, {
          userId,
          type,
          amount,
          source,
          claimId,
          description: request.description || '',
          metadata,
          timestamp: serverTimestamp(),
          engineVersion: '3.0.0-INFRA'
        });

        // 9. Log to Anomaly Feed if high value or suspicious (Placeholder)
        // ...

        return { success: true, txId: txDoc.id };
      });
    } catch (error: any) {
      console.error(`[PointAI] Failure: ${error.message} (Claim: ${claimId})`);

      // Attempt to release lock on error if we have the user reference
      // (Note: transaction rollback handles Firestore state, but we log for monitoring)
      await this.logAnomaly(userId, claimId, error.message, request);

      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic Prediction Sequence
   */
  static async executePrediction(request: {
    userId: string;
    amount: number;
    assetId: string;
    symbol: string;
    direction: 'up' | 'down';
    entryPrice: number;
    claimId: string;
  }): Promise<PointTransactionResult> {
    const { userId, amount, assetId, symbol, direction, entryPrice, claimId } = request;
    const userRef = doc(db, 'users', userId);
    const claimRef = doc(db, 'system_claims', claimId);
    const predictionsRef = collection(db, 'predictions');
    const transactionsRef = collection(db, 'users', userId, 'transactions');

    try {
      return await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("ENTITY_NOT_FOUND");

        const userData = userSnap.data();
        const claimSnap = await transaction.get(claimRef);
        if (claimSnap.exists()) throw new Error("PREDICTION_ALREADY_EXISTS");

        if ((userData.points || 0) < amount) throw new Error("INSUFFICIENT_FUNDS");

        // 1. Lock & Deduct
        transaction.update(userRef, {
          points: increment(-amount),
          execution_lock: false, // Predictions are atomic enough not to need long-locks
          lastActionTimestamp: serverTimestamp()
        });

        // 2. Create Prediction Document
        const predDoc = doc(predictionsRef);
        transaction.set(predDoc, {
          userId,
          assetId,
          symbol,
          direction,
          amount,
          entryPrice,
          status: 'PENDING',
          claimId,
          timestamp: serverTimestamp()
        });

        // 3. Set Claim Nonce
        transaction.set(claimRef, { userId, type: 'prediction_entry', claimId, executedAt: serverTimestamp() });

        // 4. Log Transaction
        const txDoc = doc(transactionsRef);
        transaction.set(txDoc, {
          userId,
          type: 'prediction_entry',
          amount: -amount,
          source: `Forecast: ${symbol.toUpperCase()}`,
          claimId,
          timestamp: serverTimestamp(),
          metadata: { assetId, predictionId: predDoc.id }
        });

        return { success: true, txId: txDoc.id, predictionId: predDoc.id };
      });
    } catch (error: any) {
      await this.logAnomaly(userId, claimId, error.message, request);
      return { success: false, error: error.message };
    }
  }

  private static async logAnomaly(userId: string, claimId: string, error: string, request: any) {
    try {
      await setDoc(doc(collection(db, 'system_anomalies')), {
        userId,
        claimId,
        error,
        requestType: request.type,
        timestamp: serverTimestamp(),
        severity: (error === 'REWARD_ALREADY_CLAIMED' || error === 'DAILY_COOLDOWN_ACTIVE') ? 'MEDIUM' : 'LOW'
      });
    } catch (e) {
      // Ignore secondary failures
    }
  }
}
