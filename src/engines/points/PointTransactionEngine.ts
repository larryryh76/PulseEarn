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
  type: Transaction['type'] | 'AI_SYSTEM_CORRECTION' | 'prediction_entry' | 'referral_bonus' | 'withdrawal_debit';
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
   * The absolute authority gateway for all economy mutations.
   * Enforces transactional locking, claim idempotency, and centralized reward validation.
   */
  static async execute(request: PointTransactionRequest): Promise<PointTransactionResult> {
    const { userId, amount, type, source, claimId, xpReward = 0, metadata = {} } = request;
    const userRef = doc(db, 'users', userId);
    const claimRef = doc(db, 'system_claims', claimId);
    const transactionsRef = collection(db, 'users', userId, 'transactions');

    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Acquire State & Validate Idempotency
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("ENTITY_NOT_FOUND");

        const userData = userSnap.data();
        const claimSnap = await transaction.get(claimRef);
        if (claimSnap.exists()) throw new Error("REWARD_ALREADY_CLAIMED");

        // 2. Transactional Locking (Atomic Mutex)
        if (!request.bypassLock && userData.execution_lock) {
          const lockTime = userData.execution_lock_at?.toDate();
          const now = new Date();
          if (lockTime && (now.getTime() - lockTime.getTime()) < 30000) {
            throw new Error("RACE_CONDITION_DETECTED");
          }
        }

        // 3. Centralized Reward Validation Rules
        if (type === 'daily_reward') {
          const lastReward = userData.lastRewardDate?.toDate();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (lastReward && lastReward >= today) {
             throw new Error("DAILY_REWARD_COOLDOWN");
          }

          // Streak Logic
          const lastRewardTime = lastReward ? lastReward.getTime() : 0;
          const oneDayMs = 24 * 60 * 60 * 1000;
          const isStreak = lastRewardTime > 0 && (today.getTime() - lastRewardTime) <= oneDayMs * 1.5;

          transaction.update(userRef, {
            streak: isStreak ? increment(1) : 1
          });
        }

        // 4. Financial Solvency Check
        if (amount < 0 && (userData.points || 0) + amount < 0) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        // 5. Fraud Checks (Stub for high-value mutations)
        if (amount > 10000) {
          const velocityCheckRef = doc(db, 'system_security', `velocity_${userId}`);
          // Add complex fraud detection logic here in future
          transaction.set(velocityCheckRef, {
            lastLargeReward: serverTimestamp(),
            amount,
            status: 'FLAGGED_FOR_REVIEW'
          }, { merge: true });
        }

        // 6. Progression Calculation
        const newXp = (userData.xp || 0) + (amount > 0 ? xpReward : 0);
        const newLevel = calculateLevel(newXp);

        // 7. Atomic Mutation
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

        // 8. Proof of Execution (Idempotency Layer)
        transaction.set(claimRef, {
          userId,
          type,
          source,
          amount,
          executedAt: serverTimestamp(),
          metadata: { ...metadata, engineVersion: '5.0.0-REAL' }
        });

        // 9. Immutable Transaction Log
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
          engineVersion: '5.0.0-REAL'
        });

        return { success: true, txId: txDoc.id };
      });
    } catch (error: any) {
      console.error(`[EconomyEngine] Protocol Failure: ${error.message} (Claim: ${claimId})`);
      await this.logValidationFailure(userId, claimId, error.message, request);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic Market Prediction Pipeline
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
        if (claimSnap.exists()) throw new Error("DUPLICATE_PREDICTION_ATTEMPT");

        if ((userData.points || 0) < amount) throw new Error("INSUFFICIENT_FUNDS");

        // 1. Transactional State Sync
        transaction.update(userRef, {
          points: increment(-amount),
          lastActionTimestamp: serverTimestamp(),
          ['stats.predictionsCount']: increment(1)
        });

        // 2. Create Verifiable Prediction Record
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
          timestamp: serverTimestamp(),
          engineVersion: '5.0.0-REAL'
        });

        // 3. Mark Claim Nonce
        transaction.set(claimRef, { userId, type: 'prediction_entry', claimId, executedAt: serverTimestamp() });

        // 4. Ledger Entry
        const txDoc = doc(transactionsRef);
        transaction.set(txDoc, {
          userId,
          type: 'prediction_entry',
          amount: -amount,
          source: `Market Prediction: ${symbol.toUpperCase()}`,
          claimId,
          timestamp: serverTimestamp(),
          metadata: { assetId, predictionId: predDoc.id },
          engineVersion: '5.0.0-REAL'
        });

        return { success: true, txId: txDoc.id, predictionId: predDoc.id };
      });
    } catch (error: any) {
      await this.logValidationFailure(userId, claimId, error.message, request);
      return { success: false, error: error.message };
    }
  }

  private static async logValidationFailure(userId: string, claimId: string, error: string, request: any) {
    try {
      await setDoc(doc(collection(db, 'system_anomalies')), {
        userId,
        claimId,
        error,
        requestType: request.type,
        timestamp: serverTimestamp(),
        severity: (error === 'REWARD_ALREADY_CLAIMED' || error === 'RACE_CONDITION_DETECTED') ? 'HIGH' : 'MEDIUM',
        context: 'PROTOCOL_VALIDATION_FAILURE'
      });
    } catch (e) {
      // Background logging failsafe
    }
  }
}
