import {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Task, UserTask, TaskClaim, TaskCategory } from '../../types';
import { PointTransactionEngine } from '../points/PointTransactionEngine';
import { ActivityEngine } from '../system/ActivityEngine';

export class TaskEngine {
  /**
   * Initializes a task attempt with status-aware validation
   */
  static async attemptTask(request: { userId: string; taskId: string; proof?: string }): Promise<{ success: boolean; error?: string }> {
    const { userId, taskId, proof } = request;
    const taskRef = doc(db, 'tasks', taskId);
    const userTaskRef = doc(db, 'users', userId, 'user_tasks', taskId);
    const claimsRef = collection(db, 'task_claims');

    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Fetch Task and UserTask state
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("task_NOT_FOUND");
        const task = taskSnap.data() as Task;

        const userTaskSnap = await transaction.get(userTaskRef);
        const userTask = userTaskSnap.data() as UserTask | undefined;

        // 2. Validate availability
        if (task.status !== 'ACTIVE') throw new Error("task_INACTIVE");

        if (userTask) {
          if (userTask.status === 'pending') throw new Error("task_AUDIT_IN_PROGRESS");

          if (task.cooldownPeriod === 0 && userTask.status === 'completed') {
             throw new Error("task_ALREADY_SECURED");
          }

          if (task.cooldownPeriod > 0 && userTask.lastCompleted) {
            const lastTime = userTask.lastCompleted.toDate().getTime();
            const cooldownMs = task.cooldownPeriod * 60 * 60 * 1000;
            if (Date.now() - lastTime < cooldownMs) throw new Error("task_IN_COOLDOWN");
          }
        }

        // 3. Register Claim
        const claimId = `claim_${userId}_${taskId}_${Date.now()}`;
        const claimRef = doc(claimsRef, claimId);

        const claim: Partial<TaskClaim> = {
          id: claimId,
          userId,
          taskId,
          campaignId: task.campaignId,
          providerId: task.providerId,
          validationState: task.verificationType === 'automated' ? 'APPROVED' : 'PENDING',
          completionState: task.verificationType === 'automated' ? 'COMPLETED' : 'IN_PROGRESS',
          rewardTransactionId: null,
          xpGranted: task.xpReward,
          fraudFlags: [],
          submittedProof: proof || null,
          createdAt: serverTimestamp() as any,
          metadata: {
             taskTitle: task.title,
             username: (await transaction.get(doc(db, 'users', userId))).data()?.username || 'Anonymous'
          }
        };

        transaction.set(claimRef, claim);

        // 4. Update User Task State & Global Counters
        transaction.set(userTaskRef, {
          taskId,
          lastCompleted: task.verificationType === 'automated' ? serverTimestamp() : (userTask?.lastCompleted || null),
          status: task.verificationType === 'automated' ? 'completed' : 'pending',
          subtaskId: claimId,
          totalCompletions: increment(task.verificationType === 'automated' ? 1 : 0)
        }, { merge: true });

        if (task.verificationType === 'automated') {
           transaction.update(taskRef, {
              completionCount: increment(1),
              totalDistributed: increment(task.rewardAmount),
              totalClaims: increment(1),
              updatedAt: serverTimestamp() // Fix #17: Ensure rate limiting works
           });
        }

        // 5. Post-transaction reward if Automated
        return { success: true, claimId, task };
      }).then(async (res: any) => {
        if (res.success) {
           if (res.task.verificationType === 'automated') {
              await PointTransactionEngine.execute({
                 userId,
                 amount: res.task.rewardAmount,
                 type: 'task_reward',
                 source: res.task.title,
                 claimId: res.claimId,
                 taskClaimId: res.claimId,
                 xpReward: res.task.xpReward,
                 referenceId: taskId,
                 metadata: {
                    campaignId: res.task.campaignId,
                    taskName: res.task.title,
                    category: res.task.category,
                    verificationType: res.task.verificationType,
                    verificationStatus: 'APPROVED'
                 }
              });
           } else {
              // Manual/Proof tasks still need an activity record for the submission
              await ActivityEngine.log({
                 userId,
                 type: 'task_completed',
                 points: 0,
                 description: `Submitted proof for: ${res.task.title}`,
                 referenceId: taskId,
                 metadata: {
                    campaignId: res.task.campaignId,
                    taskName: res.task.title,
                    verificationStatus: 'PENDING'
                 }
              });
           }
        }
        return res;
      });
    } catch (err: any) {
      console.error(`[TaskEngine] Execution Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generates localized daily tasks for the user
   */
  static async syncEcosystemTasks(): Promise<void> {
    // This would run via a cloud function or administrative trigger
    // to prune expired tasks and rotate featured campaigns.
  }
}

export const TASK_CATEGORIES: TaskCategory[] = [
  'SOCIAL',
  'REFERRAL',
  'EDUCATION',
  'PREDICTION',
  'COMMUNITY',
  'EVENTS',
  'SPONSORED',
  'CUSTOM'
];
