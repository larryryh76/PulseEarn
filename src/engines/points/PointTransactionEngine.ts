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
import { EconomyConfigEngine } from '../system/EconomyConfigEngine';
import { ActivityEngine } from '../system/ActivityEngine';
import { SystemTaskEngine } from '../tasks/SystemTaskEngine';
import { ReferralProtectionEngine } from '../system/ReferralProtectionEngine';

export interface PointTransactionRequest {
  userId: string;
  amount: number;
  type: Transaction['type'];
  source: string;
  claimId: string; // Unique Nonce/Claim ID (e.g. daily_20260525_UID)
  description?: string;
  xpReward?: number;
  referenceId?: string;
  taskClaimId?: string; // Optional: Links to a task_claim for atomic resolution
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
    const { userId, amount, type, source, claimId, xpReward = 0, taskClaimId, metadata = {} } = request;
    const userRef = doc(db, 'users', userId);
    const claimRef = doc(db, 'system_claims', claimId);
    const transactionsRef = collection(db, 'users', userId, 'transactions');
    const taskClaimRef = taskClaimId ? doc(db, 'task_claims', taskClaimId) : null;

    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Acquire State & Validate Idempotency
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("ENTITY_NOT_FOUND");

        const userData = userSnap.data();
        const claimSnap = await transaction.get(claimRef);
        if (claimSnap.exists()) throw new Error("REWARD_ALREADY_CLAIMED");

        // 1.1 Atomic Task Claim Verification (Priority 1)
        if (taskClaimRef) {
          const tcSnap = await transaction.get(taskClaimRef);
          if (!tcSnap.exists()) throw new Error("TASK_CLAIM_NOT_FOUND");
          if (tcSnap.data().validationState !== 'PENDING') throw new Error("TASK_CLAIM_ALREADY_RESOLVED");

          // Perform Claim Status Update inside transaction
          transaction.update(taskClaimRef, {
            validationState: 'APPROVED',
            resolvedAt: serverTimestamp(),
            reviewedBy: metadata.reviewedBy || 'ADMIN_HUB_ATOMIC'
          });
        }

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

        // Apply Lock if not bypassed
        if (!request.bypassLock) {
           transaction.update(userRef, {
              execution_lock: true,
              execution_lock_at: serverTimestamp()
           });
        }

        // 3. Centralized Reward Validation Rules (Calendar-Day Reset Logic)
        if (type === 'daily_reward') {
          const lastReward = userData.lastRewardDate?.toDate();
          const now = new Date();

          // Implementation of proper calendar-day reset based on system date
          // This allows claiming as soon as the day changes, even if <24h have passed.
          const currentDayStr = now.toISOString().split('T')[0];
          const lastDayStr = lastReward ? lastReward.toISOString().split('T')[0] : 'NEVER';

          if (lastReward && currentDayStr === lastDayStr) {
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

        // 6. Progression Calculation (Authoritative Level Derivation)
        const config = await EconomyConfigEngine.getConfig();
        const xpPerLevel = config.thresholds?.xpPerLevel || 1000;

        // Ensure amount is handled correctly for XP (deductions don't usually affect XP unless specified)
        const currentXp = userData.xp || 0;
        // Permissive XP for Admins (allows downward correction)
        const xpDelta = (type === 'admin_adjustment') ? xpReward : ((amount >= 0 || xpReward > 0) ? xpReward : 0);
        const newXp = Math.max(0, currentXp + xpDelta);

        // CRITICAL: Level is ALWAYS derived from XP
        const newLevel = calculateLevel(newXp, xpPerLevel);

        // 7. Atomic Write
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

        // Priority 2: Atomic Withdrawal Accounting
        if (type === 'withdrawal_finalized') {
           const finalAmount = amount !== 0 ? Math.abs(amount) : (metadata.amount || 0);
           updates.totalWithdrawn = increment(finalAmount);
        }

        if (type === 'daily_reward') {
          const lastReward = userData.lastRewardDate?.toDate();
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          const lastRewardDate = lastReward ? new Date(lastReward.getFullYear(), lastReward.getMonth(), lastReward.getDate()) : null;
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          // If last reward was exactly yesterday, increment streak. Otherwise, reset to 1.
          const isStreak = lastRewardDate && lastRewardDate.getTime() === yesterday.getTime();
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

        // 9. Secure Transaction Log
        const txDoc = doc(transactionsRef);

        // 8.6 Transactional Notification (Priority 1: ALL OR NOTHING)
        if (type === 'task_reward' || (amount > 0 && type !== 'daily_reward') || type === 'withdrawal_finalized') {
          const notifRef = doc(collection(db, 'users', userId, 'notifications'));

          let title = 'Reward Received';
          let description = `You earned ${amount.toLocaleString()} Points from: ${source}`;
          let notifType = 'reward_claimed';

          if (type === 'task_reward') {
             title = 'Task Approved';
          } else if (type === 'withdrawal_finalized') {
             title = 'Withdrawal Processed';
             const withdrawalAmount = amount !== 0 ? Math.abs(amount) : (metadata.amount || 0);
             description = `Your withdrawal of ${withdrawalAmount.toLocaleString()} PTS has been sent to your wallet.`;
             notifType = 'payout_processed';
          }

          transaction.set(notifRef, {
            title,
            description,
            type: notifType as any,
            read: false,
            timestamp: serverTimestamp(),
            metadata: {
              taskName: source,
              pointsAwarded: amount,
              xpAwarded: xpReward,
              transactionReference: txDoc.id,
              engineVersion: '5.0.0-PRO'
            }
          });
        }

        // 8.7 Transactional Activity (Priority 1: ALL OR NOTHING)
        const activityRef = doc(collection(db, 'users', userId, 'activities'));

        let actType = 'reward_received';
        if (type === 'task_reward') actType = 'task_completed';
        else if (type === 'withdrawal_finalized') actType = 'withdrawal_completed';

        transaction.set(activityRef, {
          id: activityRef.id,
          userId,
          type: actType as any,
          points: amount,
          description: source,
          timestamp: serverTimestamp(),
          referenceId: request.referenceId || null,
          metadata: {
            taskName: source,
            xpEarned: xpReward,
            transactionReference: txDoc.id,
            verificationStatus: 'APPROVED',
            ...(metadata || {}),
            engineVersion: '5.0.0-PRO'
          }
        });

        // 8.8 Task History Snapshot (Permanent Record)
        if (type === 'task_reward') {
          const historyRef = doc(collection(db, 'users', userId, 'task_history'));
          transaction.set(historyRef, {
            id: historyRef.id,
            userId,
            taskId: request.referenceId,
            campaignId: metadata.campaignId || null,
            campaignName: metadata.campaignName || 'Community',
            taskTitle: source,
            category: metadata.category || 'CUSTOM',
            rewardAmount: amount,
            xpReward: xpReward,
            completedAt: metadata.completedAt || serverTimestamp(),
            resolvedAt: serverTimestamp(),
            verificationType: metadata.verificationType || 'manual',
            transactionReference: txDoc.id,
            claimId,
            status: 'COMPLETED',
            metadata: { ...metadata, txId: txDoc.id }
          });
        }

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
          auditTrail: [`AUTHORIZED:${type}`, `CLAIMED:${claimId}`],
          engineVersion: '5.0.0-PRO'
        });

        return {
           success: true,
           txId: txDoc.id,
           newLevel: updates.level,
           oldLevel: userData.level || 1,
           userId,
           type,
           amount,
           source,
           xpReward,
           referenceId: request.referenceId,
           metadata: request.metadata,
           tasksCompleted: userData.stats?.tasksCompleted || 0
        };
      }).then(async (res: any) => {
        // Trigger background missions and activity logs after successful transaction
        if (res.success) {
          // Fire-and-forget side effects (Issue 1 resilient trigger)
          this.triggerSideEffects(res);
        }
        return res as PointTransactionResult;
      });
    } catch (error: any) {
      console.error(`[PointEngine] System Failure: ${error.message} (Claim: ${claimId})`);

      // Auto-Log Anomalies for Health Monitoring
      const severity = (error.code === 'permission-denied' || error.message?.includes('PERMISSION')) ? 'HIGH' : 'MEDIUM';
      await this.logValidationFailure(userId, claimId, error.message, { ...request, severity, code: error.code });

      return { success: false, error: error.message };
    }
  }

  private static async logValidationFailure(userId: string, claimId: string, error: string, request: any) {
    try {
      await setDoc(doc(collection(db, 'system_anomalies')), {
        userId,
        claimId,
        error,
        requestType: request.type || request.code || 'UNKNOWN',
        timestamp: serverTimestamp(),
        severity: request.severity || ((error === 'REWARD_ALREADY_CLAIMED' || error === 'RACE_CONDITION_DETECTED') ? 'HIGH' : 'MEDIUM'),
        context: 'SYSTEM_VALIDATION_FAILURE',
        metadata: { ...request, engineVersion: '5.0.0-PRO' }
      });
    } catch (_e) {
      // Background logging failsafe
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

        const config_p1 = await EconomyConfigEngine.getConfig();

        // 0. Eligibility Check (Minimum Level based on config)
        const unlockLevel = config_p1.thresholds.predictionUnlockLevel;
        if ((userData.level || 1) < unlockLevel) {
          throw new Error("PREDICTION_LOCKED_INSUFFICIENT_LEVEL");
        }

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

        const config_p2 = await EconomyConfigEngine.getConfig();

        // 2. Create Verifiable Prediction Record
        transaction.set(predDoc, {
          id: predDoc.id,
          userId,
          taskId,
          assetId,
          symbol,
          direction,
          stakeAmount: amount,
          rewardAmount: amount * config_p2.rewards.predictionWinMultiplier,
          entryPrice,
          status: 'ACTIVE',
          claimId,
          createdAt: serverTimestamp(),
          transactionReference: txDoc.id,
          auditTrail: [`Forecast initiated: ${direction} at ${entryPrice}. Potential Reward: ${rewardAmount || (amount * 2)}`],
          engineVersion: '5.0.0-PRO'
        });

        // 3. Mark Claim Nonce
        transaction.set(claimRef, { userId, type: 'prediction_entry', claimId, amount: -amount, executedAt: serverTimestamp() });

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
          await ActivityEngine.log({
            userId,
            type: 'prediction_placed',
            points: -amount,
            description: `Placed forecast on ${symbol.toUpperCase()}`,
            referenceId: res.predictionId,
            metadata: {
              assetId,
              symbol,
              direction,
              stakeAmount: amount,
              entryPrice,
              predictionStatus: 'ACTIVE',
              transactionReference: res.txId
            }
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
  static async resolvePrediction(predictionId: string, currentPrice: number, _manualRewardPool?: number): Promise<void> {
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
        const config = await EconomyConfigEngine.getConfig();
        const xpPerLevel = config.thresholds?.xpPerLevel || 1000;

        const isWin = data.direction === 'UP'
          ? currentPrice > data.entryPrice
          : currentPrice < data.entryPrice;

        // Issue 4 Fix: Standardize on immutable rewardAmount calculated at entry
        const payout = isWin ? (data.rewardAmount || (data.stakeAmount * config.rewards.predictionWinMultiplier)) : 0;
        const xpReward = isWin ? config.rewards.predictionXP.win : config.rewards.predictionXP.loss;

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
        const currentXp = userData.xp || 0;
        const newXp = currentXp + xpReward;

        // CRITICAL: Level is ALWAYS derived from XP
        const newLevel = calculateLevel(newXp, xpPerLevel);

        transaction.update(userRef, {
          points: increment(payout),
          xp: newXp,
          level: newLevel,
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
        transaction.set(claimRef, { userId, type: 'prediction_settlement', claimId, amount: payout, executedAt: serverTimestamp() });

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
              referenceId: predictionId,
              metadata: {
                assetId: data.assetId,
                symbol: data.symbol,
                direction: data.direction,
                stakeAmount: data.stakeAmount,
                entryPrice: data.entryPrice,
                exitPrice: currentPrice,
                payoutMultiplier: isWin ? 2.0 : 0,
                predictionStatus: 'RESOLVED',
                transactionReference: data.transactionReference
              }
            });

            await SystemTaskEngine.processEvent(data.userId, 'prediction_completed');
         }
      });
    } catch (error: any) {
      console.error(`[MarketResolver] Failed to resolve ${predictionId}:`, error.message);
      throw error;
    }
  }

  private static async triggerSideEffects(res: any) {
    const { userId, type, newLevel, oldLevel, tasksCompleted } = res;

    try {
      // 1. & 2. Notification and Activity now handled transactionally in execute() for atomicity

      // 3. System Event Triggers
      if (type === 'task_reward') {
        SystemTaskEngine.processEvent(userId, 'campaign_task_completed').catch(() => {});
        ReferralProtectionEngine.qualifyReferral(userId).catch(() => {});
        if (tasksCompleted === 0) {
          ReferralProtectionEngine.processRetroactiveRewards(userId).catch(() => {});
        }
      }

      if (type === 'referral_bonus') SystemTaskEngine.processEvent(userId, 'referral_completed').catch(() => {});
      if (type === 'prediction_reward') SystemTaskEngine.processEvent(userId, 'prediction_completed').catch(() => {});

      // 4. Level Up Logic
      if (newLevel && newLevel > oldLevel) {
        ActivityEngine.log({
          userId,
          type: 'level_achieved',
          description: `Reached Level ${newLevel}!`,
          metadata: { level: newLevel }
        }).catch(() => {});
        SystemTaskEngine.processEvent(userId, 'level_up').catch(() => {});
      }
    } catch (err) {
      console.error("[PointEngine] Side-effect failure:", err);
    }
  }

}
