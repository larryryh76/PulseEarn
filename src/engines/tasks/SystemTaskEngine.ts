import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  runTransaction,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import {
  SystemTaskDefinition,
  UserSystemTask,
  SystemTaskTrigger,
  UserData
} from '../../types';
import { PointTransactionEngine } from '../points/PointTransactionEngine';

export class SystemTaskEngine {
  /**
   * The central entry point for the backend worker to process user activities.
   * Scans for applicable mission templates and updates user mission state.
   */
  static async processEvent(userId: string, trigger: SystemTaskTrigger): Promise<void> {
    try {
      // 1. Fetch active task definitions for this trigger
      const definitionsRef = collection(db, 'system_task_definitions');
      const q = query(definitionsRef, where('trigger', '==', trigger), where('active', '==', true));
      const definitionsSnap = await getDocs(q);

      if (definitionsSnap.empty) return;

      // 2. Fetch User Data for condition checking
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data() as UserData;

      for (const defDoc of definitionsSnap.docs) {
        const def = {
          id: defDoc.id,
          period: 'ONCE', // Default fallback for legacy docs
          ...defDoc.data()
        } as SystemTaskDefinition;
        await this.evaluateMission(userId, userData, def);
      }
    } catch (err) {
      console.error(`[SystemTaskEngine] Event processing failed for ${userId}:`, err);
    }
  }

  /**
   * Atomic evaluation and update of a specific mission for a user.
   */
  private static async evaluateMission(
    userId: string,
    userData: UserData,
    def: SystemTaskDefinition
  ): Promise<void> {
    const userTaskId = `${userId}_${def.id}`;
    const userTaskRef = doc(db, 'user_system_tasks', userTaskId);

    try {
      await runTransaction(db, async (transaction) => {
        const utSnap = await transaction.get(userTaskRef);
        let utData = utSnap.exists() ? utSnap.data() as UserSystemTask : null;

        // Periodic reset logic
        if (utData && def.period !== 'ONCE') {
          const lastEventAt = utData.claimedAt || utData.completedAt;
          if (lastEventAt) {
            const lastDate = lastEventAt.toDate();
            const now = new Date();
            let shouldReset = false;

            if (def.period === 'DAILY') {
              // Reset if last claim was before today (UTC)
              const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
              if (lastDate < today) shouldReset = true;
            } else if (def.period === 'WEEKLY') {
              // Reset if last claim was before the start of this week (UTC Monday)
              const day = now.getUTCDay();
              const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1);
              const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
              if (lastDate < startOfWeek) shouldReset = true;
            }

            if (shouldReset) {
              utData = {
                ...utData,
                status: 'IN_PROGRESS',
                progress: 0,
                completedAt: null,
                claimedAt: null
              };
              transaction.set(userTaskRef, utData, { merge: true });
            }
          }
        }

        // Skip if already claimed
        if (utData?.status === 'CLAIMED') return;

        // Resolve current progress based on the condition field in user document
        const currentProgress = this.resolveFieldValue(userData, def.conditionField) || 0;

        const isCompleted = currentProgress >= def.targetValue;

        // Ensure status doesn't downgrade if progress decreases (unlikely but safe)
        const currentStatus = utData?.status || 'IN_PROGRESS';
        const newStatus = isCompleted ? 'COMPLETED' :
                         (currentStatus === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');

        // If no record exists or progress has changed
        if (!utData || utData.progress !== currentProgress || utData.status !== newStatus) {
          const update: UserSystemTask = {
            id: userTaskId,
            userId,
            systemTaskId: def.id,
            category: def.category,
            status: newStatus as any,
            progress: Math.min(currentProgress, def.targetValue),
            target: def.targetValue,
            unlockedAt: utData?.unlockedAt || serverTimestamp() as Timestamp,
            completedAt: isCompleted ? (utData?.completedAt || serverTimestamp() as Timestamp) : null
          };

          transaction.set(userTaskRef, update, { merge: true });

          if (isCompleted && (!utData || utData.status === 'IN_PROGRESS')) {
             // Log completion for audit visibility
             console.log(`[SystemTaskEngine] Mission ${def.id} reached completion for user ${userId}`);
          }
        }
      });
    } catch (err) {
      console.error(`[SystemTaskEngine] Mission evaluation failed for ${def.id}:`, err);
    }
  }

  /**
   * Manual claim of rewards for a completed system task.
   */
  static async claimReward(userId: string, systemTaskId: string): Promise<{ success: boolean; error?: string }> {
    const userTaskId = `${userId}_${systemTaskId}`;
    const userTaskRef = doc(db, 'user_system_tasks', userTaskId);
    const defRef = doc(db, 'system_task_definitions', systemTaskId);

    try {
      const utSnap = await getDoc(userTaskRef);
      if (!utSnap.exists() || utSnap.data().status !== 'COMPLETED') {
        return { success: false, error: 'MISSION_NOT_COMPLETED' };
      }

      const defSnap = await getDoc(defRef);
      if (!defSnap.exists()) return { success: false, error: 'DEFINITION_NOT_FOUND' };
      const def = defSnap.data() as SystemTaskDefinition;

      const claimId = `sys_${userTaskId}`;

      const result = await PointTransactionEngine.execute({
        userId,
        amount: def.rewardPoints,
        type: 'task_reward',
        source: def.title,
        claimId,
        xpReward: def.rewardXp,
        referenceId: systemTaskId,
        metadata: {
          systemTaskId,
          taskName: def.title,
          category: def.category,
          verificationType: 'automated',
          verificationStatus: 'APPROVED'
        }
      });

      if (result.success) {
        await setDoc(userTaskRef, {
          status: 'CLAIMED',
          claimedAt: serverTimestamp(),
          transactionReference: result.txId
        }, { merge: true });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Helper to resolve nested object fields like 'stats.referralsCount'
   */
  private static resolveFieldValue(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
  }
}
