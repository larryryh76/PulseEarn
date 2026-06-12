import { db } from '../../firebase/config';
import {
  doc,
  increment,
  collection,
  serverTimestamp,
  runTransaction,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { Transaction } from '../../types';
import { calculateLevel } from '../../utils/progression';
import { EconomyAuthority } from './EconomyAuthority';

export interface PointTransactionRequest {
  userId: string;
  amount: number;
  type: Transaction['type'];
  source: string;
  claimId: string; // Unique Nonce/Claim ID (e.g. daily_20260525_UID)
  description?: string;
  xpReward?: number;
  referenceId?: string;
  metadata?: Record<string, any>;
  bypassLock?: boolean;
}

export type PointTransactionResult =
  | { success: true; txId: string; predictionId?: string; newLevel?: number }
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

        // 1.5 Economy Rule Validation
        const validation = EconomyAuthority.validateAction(type, request, userData);
        if (!validation.valid) throw new Error(validation.error);

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
        }

        // 4. Financial Solvency Check
        if (amount < 0 && (userData.points || 0) + amount < 0) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        // 5. Fraud Checks
        if (amount > 10000) {
          const velocityCheckRef = doc(db, 'system_security', `velocity_${userId}`);
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
        const updates: any = {
          points: increment(amount),
          xp: newXp,
          level: newLevel,
          'stats.totalEarnings': increment(amount > 0 ? amount : 0),
          totalEarnedToday: amount > 0 ? increment(amount) : (userData.totalEarnedToday || 0),
          lastActionTimestamp: serverTimestamp(),
          execution_lock: false, // Release Lock
          execution_lock_at: null,
          ...(type === 'daily_reward' ? { lastRewardDate: serverTimestamp() } : {})
        };

        if (type === 'task_reward') updates['stats.tasksCompleted'] = increment(1);
        if (type === 'referral_bonus') updates['stats.referralsCount'] = increment(1);

        if (type === 'daily_reward') {
          const lastReward = userData.lastRewardDate?.toDate();
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastRewardTime = lastReward ? lastReward.getTime() : 0;
          const oneDayMs = 24 * 60 * 60 * 1000;
          const isStreak = lastRewardTime > 0 && (today.getTime() - lastRewardTime) <= oneDayMs * 1.5;
          updates.streak = isStreak ? increment(1) : 1;
        }

        transaction.update(userRef, updates);

        // 7.5 System Task Trigger
        // We use a post-transaction check or separate call for the engine to avoid nested transaction issues
        // but for level_up and task_reward we trigger the processing.

        // 8. Proof of Execution
        transaction.set(claimRef, {
          userId,
          type,
          source,
          amount,
          executedAt: serverTimestamp(),
          metadata: { ...metadata, engineVersion: '5.0.0-PRO' }
        });

        // 8.5 Activity Log (Handled via ActivityEngine post-transaction)

        // 9. Immutable Transaction Log
        const txDoc = doc(transactionsRef);
        transaction.set(txDoc, {
          id: txDoc.id,
          userId,
          type,
          amount,
          source,
          claimId,
          status: 'COMPLETED',
          referenceId: request.referenceId || null,
          description: request.description || '',
          metadata,
          timestamp: serverTimestamp(),
          processedAt: serverTimestamp(),
          auditTrail: [`SYSTEM_AUTHORIZED:${type}`, `NONCE_CLAIMED:${claimId}`],
          engineVersion: '5.0.0-PRO'
        });

        return { success: true, txId: txDoc.id, newLevel: updates.level, oldLevel: userData.level || 1 };
      }).then(async (res: any) => {
        // Trigger background missions and activity logs after successful transaction
        if (res.success) {
          const { ActivityEngine } = await import('../system/ActivityEngine');
          const { SystemTaskEngine } = await import('../tasks/SystemTaskEngine');

          await ActivityEngine.log({
            userId,
            type: type === 'task_reward' ? 'task_completed' : 'reward_received',
            points: amount,
            description: source,
            referenceId: request.referenceId
          });

          if (type === 'task_reward') await SystemTaskEngine.processEvent(userId, 'campaign_task_completed');
          if (type === 'daily_reward') await SystemTaskEngine.processEvent(userId, 'daily_login');
          if (type === 'referral_bonus') await SystemTaskEngine.processEvent(userId, 'referral_completed');
          if (type === 'prediction_reward') await SystemTaskEngine.processEvent(userId, 'prediction_submitted');

          if (res.newLevel && res.newLevel > res.oldLevel) {
             await ActivityEngine.log({
               userId,
               type: 'level_achieved',
               description: `Reached Level ${res.newLevel}!`,
               metadata: { level: res.newLevel }
             });
             await SystemTaskEngine.processEvent(userId, 'level_up');
          }
        }
        return res as PointTransactionResult;
      });
    } catch (error: any) {
      console.error(`[PointEngine] System Failure: ${error.message} (Claim: ${claimId})`);
      await this.logValidationFailure(userId, claimId, error.message, request);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic Market Prediction Entry
   */
  static async executePrediction(request: {
    userId: string;
    taskId: string;
    amount: number;
    assetId: string;
    symbol: string;
    direction: 'UP' | 'DOWN';
    entryPrice: number;
    claimId: string;
    rewardAmount?: number;
  }): Promise<PointTransactionResult> {
    const { userId, taskId, amount, assetId, symbol, direction, entryPrice, claimId, rewardAmount } = request;
    const userRef = doc(db, 'users', userId);
    const claimRef = doc(db, 'system_claims', claimId);
    const predictionsRef = collection(db, 'user_predictions');
    const transactionsRef = collection(db, 'users', userId, 'transactions');

    try {
      return await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("ENTITY_NOT_FOUND");

        const userData = userSnap.data();

        if ((userData.points || 0) < amount) throw new Error("INSUFFICIENT_FUNDS");

        const txDoc = doc(transactionsRef);
        const predDoc = doc(predictionsRef, claimId);

        // 1. Point Deduction & Stat Update
        transaction.update(userRef, {
          points: increment(-amount),
          lastActionTimestamp: serverTimestamp(),
          ['stats.predictionsCount']: increment(1)
        });

        // 1.5 Update Campaign Analytics (Only if it's a campaign-linked market)
        if (!taskId.startsWith('global_')) {
          const campaignRef = doc(db, 'campaigns', taskId);
          const campaignSnap = await transaction.get(campaignRef);
          if (campaignSnap.exists()) {
            transaction.update(campaignRef, {
              participantsCount: increment(1)
            });
          }
        }

        // 2. Create Verifiable Prediction Record
        transaction.set(predDoc, {
          id: claimId,
          userId,
          taskId,
          assetId,
          symbol,
          direction,
          stakeAmount: amount,
          rewardAmount: amount * 2, // Strictly enforce 2x Reward Model for initial prod
          entryPrice,
          status: 'ACTIVE',
          claimId,
          createdAt: serverTimestamp(),
          transactionReference: txDoc.id,
          auditTrail: [`Forecast initiated: ${direction} at ${entryPrice}. Potential Reward: ${rewardAmount || (amount * 2)}`],
          engineVersion: '5.0.0-PRO'
        });

        // 3. Mark Claim Nonce
        transaction.set(claimRef, { userId, type: 'prediction_entry', claimId, executedAt: serverTimestamp() });

        // 3.5 Activity Log (Handled via ActivityEngine post-transaction)

        // 4. Ledger Entry
        transaction.set(txDoc, {
          userId,
          type: 'prediction_entry',
          amount: -amount,
          source: `Market Forecast: ${symbol.toUpperCase()}`,
          claimId,
          timestamp: serverTimestamp(),
          metadata: { assetId, predictionId: predDoc.id },
          engineVersion: '5.0.0-PRO'
        });

        return { success: true, txId: txDoc.id, predictionId: predDoc.id };
      }).then(async (res: any) => {
        if (res.success) {
          const { ActivityEngine } = await import('../system/ActivityEngine');
          const { SystemTaskEngine } = await import('../tasks/SystemTaskEngine');

          await ActivityEngine.log({
            userId,
            type: 'prediction_placed',
            points: -amount,
            description: `Placed forecast on ${symbol.toUpperCase()}`,
            referenceId: res.predictionId
          });

          await SystemTaskEngine.processEvent(userId, 'prediction_submitted');
        }
        return res as PointTransactionResult;
      });
    } catch (error: any) {
      await this.logValidationFailure(userId, claimId, error.message, request);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic Market Prediction Resolution
   */
  static async resolvePrediction(predictionId: string, currentPrice: number, manualRewardPool?: number): Promise<void> {
    const predRef = doc(db, 'user_predictions', predictionId);

    try {
      return await runTransaction(db, async (transaction) => {
        const predSnap = await transaction.get(predRef);
        if (!predSnap.exists()) throw new Error("PREDICTION_NOT_FOUND");

        const data = predSnap.data();
        if (data.status !== 'ACTIVE') throw new Error("PREDICTION_ALREADY_RESOLVED");

        const userId = data.userId;
        const userRef = doc(db, 'users', userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("USER_NOT_FOUND");

        const userData = userSnap.data();
        const isWin = data.direction === 'UP'
          ? currentPrice > data.entryPrice
          : currentPrice < data.entryPrice;

        // Use stored rewardAmount (2x model) or fallback to manual pool
        const payout = isWin ? (data.rewardAmount || manualRewardPool || (data.stakeAmount * 2)) : 0;
        const xpReward = isWin ? 250 : 50;

        const claimId = `res_${predictionId}`;
        const claimRef = doc(db, 'system_claims', claimId);
        const transactionsRef = collection(db, 'users', userId, 'transactions');
        const notificationsRef = collection(db, 'users', userId, 'notifications');

        // 1. Update Prediction Status
        transaction.update(predRef, {
          status: 'RESOLVED',
          exitPrice: currentPrice,
          rewardAmount: payout,
          resolvedAt: serverTimestamp(),
          auditTrail: [...(data.auditTrail || []), `Settled at ${currentPrice}. Result: ${isWin ? 'WIN' : 'LOSS'}`]
        });

        // 2. Award Points & XP if Win
        const newXp = (userData.xp || 0) + xpReward;
        transaction.update(userRef, {
          points: increment(payout),
          xp: newXp,
          level: calculateLevel(newXp),
          lastActionTimestamp: serverTimestamp(),
          'stats.totalWins': increment(isWin ? 1 : 0),
          'stats.predictionRewards': increment(payout)
        });

        // 3. Log Settlement Transaction
        if (payout > 0) {
          const txDoc = doc(transactionsRef);
          transaction.set(txDoc, {
            id: txDoc.id,
            userId,
            type: 'prediction_reward',
            amount: payout,
            source: `Forecast Win: ${data.symbol.toUpperCase()}`,
            claimId,
            status: 'COMPLETED',
            referenceId: predictionId,
            timestamp: serverTimestamp(),
            processedAt: serverTimestamp(),
            auditTrail: [`SETTLEMENT_CORE_V5`, `MARKET_PRICE:${currentPrice}`, `RESULT:WIN`],
            metadata: { predictionId, currentPrice, isWin: true },
            engineVersion: '5.0.0-PRO'
          });
        }

        // 4. Mark Nonce
        transaction.set(claimRef, { userId, type: 'prediction_settlement', claimId, executedAt: serverTimestamp() });

        // 4.5 Activity Log (Handled via ActivityEngine post-transaction)

        // 5. Notification
        const notifDoc = doc(notificationsRef);
        transaction.set(notifDoc, {
          title: isWin ? 'Forecast Successful!' : 'Forecast Unsuccessful',
          description: isWin
            ? `Your ${data.symbol.toUpperCase()} forecast was correct. +${payout} PTS awarded.`
            : `Your ${data.symbol.toUpperCase()} forecast was incorrect. Stake lost.`,
          type: 'prediction_result',
          read: false,
          timestamp: serverTimestamp()
        });
      }).then(async () => {
         const { ActivityEngine } = await import('../system/ActivityEngine');
         const { SystemTaskEngine } = await import('../tasks/SystemTaskEngine');

         const predSnap = await getDoc(predRef);
         if (predSnap.exists()) {
            const data = predSnap.data();
            const isWin = (data.rewardAmount || 0) > 0;

            await ActivityEngine.log({
              userId: data.userId,
              type: isWin ? 'prediction_won' : 'prediction_lost',
              points: data.rewardAmount || 0,
              description: isWin
                ? `Forecast successful on ${data.symbol.toUpperCase()}! +${data.rewardAmount} PTS`
                : `Forecast settled for ${data.symbol.toUpperCase()}`,
              referenceId: predictionId
            });

            await SystemTaskEngine.processEvent(data.userId, 'prediction_completed');
         }
      });
    } catch (error: any) {
      console.error(`[MarketResolver] Failed to resolve ${predictionId}:`, error.message);
      throw error;
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
        context: 'SYSTEM_VALIDATION_FAILURE'
      });
    } catch (e) {
      // Background logging failsafe
    }
  }
}
