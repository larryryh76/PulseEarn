import {
  collection,
  doc,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Task, UserTask, TaskClaim, TaskCategory } from '../../types';

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
          providerId: task.providerId,
          validationState: task.verificationType === 'automated' ? 'APPROVED' : 'PENDING',
          completionState: task.verificationType === 'automated' ? 'COMPLETED' : 'IN_PROGRESS',
          rewardTransactionId: null,
          xpGranted: task.xpReward,
          fraudFlags: [],
          submittedProof: proof || null,
          createdAt: serverTimestamp() as any,
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
              totalClaims: increment(1)
           });
        }

        // 5. Atomic Reward if Automated
        if (task.verificationType === 'automated') {
          // In a real system, we would trigger the PointTransactionEngine here.
          // Since we are in a transaction, we update the user balance directly for atomicity.
          const userRef = doc(db, 'users', userId);
          transaction.update(userRef, {
            points: increment(task.rewardAmount),
            xp: increment(task.xpReward),
            'stats.tasksCompleted': increment(1),
            'stats.totalEarnings': increment(task.rewardAmount),
            lastActionTimestamp: serverTimestamp()
          });

          // Log transaction
          const txRef = doc(collection(db, 'users', userId, 'transactions'));
          transaction.set(txRef, {
            id: txRef.id,
            userId,
            type: 'task_reward',
            amount: task.rewardAmount,
            source: `task Secured: ${task.title}`,
            claimId,
            status: 'COMPLETED',
            referenceId: taskId,
            timestamp: serverTimestamp(),
            processedAt: serverTimestamp(),
            auditTrail: ['ENGINE_V2_AUTOMATED_RELEASE'],
            engineVersion: '2.5.0-PRO'
          });

          // Activity log
          const activityRef = doc(collection(db, 'users', userId, 'activities'));
          transaction.set(activityRef, {
            userId,
            type: 'task_approved',
            points: task.rewardAmount,
            description: `task [${task.title}] completed successfully.`,
            timestamp: serverTimestamp(),
            referenceId: taskId
          });
        }

        return { success: true };
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
  'ENGAGEMENT',
  'REFERRAL',
  'PREDICTION',
  'EDUCATION',
  'EVENTS'
];
