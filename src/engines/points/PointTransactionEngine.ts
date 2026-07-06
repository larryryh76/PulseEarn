import { auth } from '../../firebase/config';
import { safeFetch } from '../../utils/api';
import { Transaction } from '../../types';
import { ActivityEngine } from '../system/ActivityEngine';
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
  utcOffset?: number;
}

export type PointTransactionResult =
  | { success: true; txId: string; predictionId?: string; newLevel?: number; error?: never }
  | { success: false; error: string; txId?: never; predictionId?: never; newLevel?: never };

export class PointTransactionEngine {
  /**
   * The absolute authority gateway for all economy mutations.
   * Moved to server-side execution to satisfy Phase A field-level security locks.
   */
  static async execute(request: PointTransactionRequest): Promise<PointTransactionResult> {
    const { userId, claimId } = request;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/execute-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (res.success) {
        // Trigger background missions and activity logs after successful transaction
        // We pass the expected stats from the request/response to side effects
        this.triggerSideEffects({
           ...res,
           userId: request.userId,
           type: request.type,
           oldLevel: res.oldLevel || 1, // Server should ideally return this
           tasksCompleted: res.tasksCompleted || 0
        });
        return res as PointTransactionResult;
      } else {
        throw new Error(res.error || 'SERVER_TRANSACTION_FAILED');
      }
    } catch (error: any) {
      console.error(`[PointEngine] System Failure: ${error.message} (Claim: ${claimId})`);

      // Auto-Log Anomalies for Health Monitoring
      const severity = (error.code === 'permission-denied' || error.message?.includes('PERMISSION')) ? 'HIGH' : 'MEDIUM';
      await this.logValidationFailure(userId, claimId, error.message, { ...request, severity, code: error.code });

      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic Market Prediction Entry
   * Moved to server-side execution to satisfy Phase A field-level security locks.
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
    const { userId, claimId } = request;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/execute-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (res.success) {
        // NOTE: the prediction_placed activity + stake ledger entry are now written
        // server-side, atomically inside /api/execute-prediction. Logging here as well
        // would create a duplicate timeline entry, so it is intentionally omitted.
        return res as PointTransactionResult;
      } else {
        throw new Error(res.error || 'SERVER_PREDICTION_FAILED');
      }
    } catch (error: any) {
      await this.logValidationFailure(userId, claimId, error.message, request);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic Market Prediction Resolution
   * Moved to server-side execution to satisfy Phase A field-level security locks.
   */
  static async resolvePrediction(predictionId: string, currentPrice: number, _manualRewardPool?: number): Promise<void> {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/resolve-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ predictionId, currentPrice })
      });

      if (!res.success) {
        throw new Error(res.error || 'SERVER_RESOLUTION_FAILED');
      }

      // Trigger post-resolution side effects if needed (handled in API mostly)
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
        ReferralProtectionEngine.qualifyReferral(userId).catch(() => {});
        if (tasksCompleted === 0) {
          ReferralProtectionEngine.processRetroactiveRewards(userId).catch(() => {});
        }
      }

      // 4. Level Up Logic
      if (newLevel && newLevel > oldLevel) {
        ActivityEngine.log({
          userId,
          type: 'level_achieved',
          description: `Reached Level ${newLevel}!`,
          metadata: { level: newLevel }
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[PointEngine] Side-effect failure:", err);
    }
  }

  private static async logValidationFailure(userId: string, claimId: string, error: string, _request: any) {
    // system_anomalies is write-restricted to Admin SDK (server-side) only.
    // Client writes to this collection are blocked by Firestore rules.
    // The server already logs anomalies in /api/execute-transaction error paths.
    // Emit a console warning so engineers can see failures during debugging.
    const severity = (error === 'REWARD_ALREADY_CLAIMED' || error === 'RACE_CONDITION_DETECTED') ? 'HIGH' : 'MEDIUM';
    console.warn(`[PointEngine] Validation failure [${severity}]: ${error} | claim=${claimId} | user=${userId}`);
  }
}
