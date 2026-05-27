import { db } from '../../firebase/config';
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
  increment
} from 'firebase/firestore';
import { Task, TaskClaim, SubmissionStatus, UserData } from '../../types';
import { PointTransactionEngine } from '../points/PointTransactionEngine';
import { TaskSecurityAuthority } from './TaskSecurityAuthority';

export interface TaskAttemptRequest {
  userId: string;
  taskId: string;
  proof?: string; // screenshot URL or text
}

export class TaskEngine {
  /**
   * Initialize a task attempt.
   * This creates a 'PENDING' claim record if the task requires verification.
   */
  static async attemptTask(request: TaskAttemptRequest): Promise<{ success: boolean; error?: string; claimId?: string }> {
    const { userId, taskId, proof } = request;
    const taskRef = doc(db, 'tasks', taskId);
    const userRef = doc(db, 'users', userId);
    const userTaskRef = doc(db, 'users', userId, 'user_tasks', taskId);

    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Get Task and User State
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("TASK_NOT_FOUND");
        const taskData = taskSnap.data() as Task;

        const providerRef = doc(db, 'task_providers', taskData.providerId);
        const providerSnap = await transaction.get(providerRef);
        if (!providerSnap.exists()) throw new Error("PROVIDER_NOT_FOUND");
        const providerData = providerSnap.data();

        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) throw new Error("USER_NOT_FOUND");
        const userData = userSnap.data();

        // 2. Eligibility Checks
        if (taskData.status !== 'ACTIVE') throw new Error("TASK_INACTIVE");
        if (providerData.providerStatus !== 'ACTIVE') throw new Error("PROVIDER_SUSPENDED");
        if (userData.level < (taskData.minLevel || 0)) throw new Error("LEVEL_TOO_LOW");

        // 2.1 Budget Check
        if (taskData.maxClaims && taskData.totalClaims >= taskData.maxClaims) {
          throw new Error("TASK_CAP_REACHED");
        }

        const userTaskSnap = await transaction.get(userTaskRef);
        if (userTaskSnap.exists()) {
          const utData = userTaskSnap.data();
          if (utData.status === 'pending') throw new Error("TASK_ALREADY_PENDING");
          if (utData.status === 'completed' && taskData.cooldownPeriod === 0) throw new Error("TASK_ALREADY_COMPLETED");

          // Cooldown check for repeatable tasks
          if (utData.lastCompleted) {
             const lastTime = utData.lastCompleted.toDate().getTime();
             const now = new Date().getTime();
             const cooldownMs = taskData.cooldownPeriod * 3600000;
             if (now - lastTime < cooldownMs) throw new Error("TASK_ON_COOLDOWN");
          }
        }

        // 3. Handle different verification types
        if (taskData.verificationType === 'automated') {
          // For automated tasks, we immediately attempt to execute the transaction
          const claimId = `task_${taskId}_${userId}_${Date.now()}`;
          const result = await PointTransactionEngine.execute({
            userId,
            amount: taskData.rewardAmount,
            type: 'task_reward',
            source: `Task: ${taskData.title}`,
            claimId,
            xpReward: taskData.xpReward,
            metadata: { taskId, verification: 'automated' }
          });

          if (!result.success) throw new Error(result.error);

          // Update user task state
          transaction.set(userTaskRef, {
            taskId,
            lastCompleted: serverTimestamp(),
            status: 'completed',
            totalCompletions: increment(1)
          }, { merge: true });

          // Update task global stats
          transaction.update(taskRef, {
            totalClaims: increment(1)
          });

          return { success: true, claimId };
        } else {
          // Manual or Proof-based tasks require a submission record
          const claimId = `sub_${taskId}_${userId}_${Date.now()}`;
          const claimRef = doc(db, 'task_claims', claimId);

          const claimData: Partial<TaskClaim> = {
            id: claimId,
            userId,
            taskId,
            providerId: taskData.providerId,
            validationState: 'PENDING',
            completionState: 'IN_PROGRESS',
            xpGranted: 0,
            fraudFlags: [],
            submittedProof: proof || null,
            createdAt: serverTimestamp() as any,
            resolvedAt: null
          };

        const flags = TaskSecurityAuthority.analyzeClaim(claimData as TaskClaim, userData as UserData);
        claimData.fraudFlags = flags;

          transaction.set(claimRef, claimData);
          transaction.set(userTaskRef, {
            taskId,
            status: 'pending',
          submissionId: claimId,
          fraudFlagged: flags.length > 0
          }, { merge: true });

          return { success: true, claimId };
        }
      });
    } catch (error: any) {
      console.error(`[TaskEngine] Attempt Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin/System Resolution of a task claim
   */
  static async resolveClaim(claimId: string, status: SubmissionStatus, adminId: string, feedback?: string): Promise<{ success: boolean; error?: string }> {
    const claimRef = doc(db, 'task_claims', claimId);

    try {
      return await runTransaction(db, async (transaction) => {
        const claimSnap = await transaction.get(claimRef);
        if (!claimSnap.exists()) throw new Error("CLAIM_NOT_FOUND");
        const claimData = claimSnap.data() as TaskClaim;

        if (claimData.validationState !== 'PENDING') throw new Error("CLAIM_ALREADY_RESOLVED");

        const taskRef = doc(db, 'tasks', claimData.taskId);
        const taskSnap = await transaction.get(taskRef);
        if (!taskSnap.exists()) throw new Error("TASK_NOT_FOUND");
        const taskData = taskSnap.data() as Task;

        const userTaskRef = doc(db, 'users', claimData.userId, 'user_tasks', claimData.taskId);
        const notificationsRef = collection(db, 'users', claimData.userId, 'notifications');

        if (status === 'APPROVED') {
          // Execute Reward
          const result = await PointTransactionEngine.execute({
            userId: claimData.userId,
            amount: taskData.rewardAmount,
            type: 'task_reward',
            source: `Task Approved: ${taskData.title}`,
            claimId: `approved_${claimId}`,
            xpReward: taskData.xpReward,
            metadata: { taskId: claimData.taskId, claimId }
          });

          if (!result.success) throw new Error(result.error);

          transaction.update(claimRef, {
            validationState: 'APPROVED',
            completionState: 'COMPLETED',
            rewardTransactionId: result.txId,
            xpGranted: taskData.xpReward,
            resolvedAt: serverTimestamp(),
            reviewedBy: adminId,
            adminFeedback: feedback || null
          });

          transaction.update(userTaskRef, {
            status: 'completed',
            lastCompleted: serverTimestamp(),
            totalCompletions: increment(1)
          });

          transaction.update(taskRef, {
            totalClaims: increment(1)
          });

          // Notify User
          const notifDoc = doc(notificationsRef);
          transaction.set(notifDoc, {
            title: 'Task Approved!',
            description: `Your submission for "${taskData.title}" was approved. +${taskData.rewardAmount} PTS awarded.`,
            type: 'submission_update',
            read: false,
            timestamp: serverTimestamp()
          });

        } else if (status === 'REJECTED') {
          transaction.update(claimRef, {
            validationState: 'REJECTED',
            completionState: 'FAILED',
            resolvedAt: serverTimestamp(),
            reviewedBy: adminId,
            adminFeedback: feedback || "Submission did not meet requirements."
          });

          transaction.update(userTaskRef, {
            status: 'rejected'
          });

          // Notify User
          const notifDoc = doc(notificationsRef);
          transaction.set(notifDoc, {
            title: 'Task Rejected',
            description: `Your submission for "${taskData.title}" was rejected. ${feedback || ''}`,
            type: 'submission_update',
            read: false,
            timestamp: serverTimestamp()
          });
        }

        return { success: true };
      });
    } catch (error: any) {
      console.error(`[TaskEngine] Resolution Failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
