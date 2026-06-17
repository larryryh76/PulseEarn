import { db } from '../../firebase/config';
import {
  collection,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { Notification } from '../../types';

export type NotificationTrigger =
  | 'task_completed'
  | 'reward_claimed'
  | 'referral_joined'
  | 'streak_bonus'
  | 'system'
  | 'prediction_result'
  | 'subtask_update'
  | 'moderation_notice'
  | 'payout_processed';

export interface NotificationRequest {
  userId: string;
  title: string;
  description: string;
  type: Notification['type'];
  metadata?: Record<string, any>;
}

export class NotificationEngine {
  /**
   * The central delivery system for user-facing alerts and reward notifications.
   * Persists notifications to the user's private notification sub-collection.
   */
  static async send(request: NotificationRequest): Promise<void> {
    const { userId, title, description, type, metadata = {} } = request;

    try {
      const notificationsRef = collection(db, 'users', userId, 'notifications');

      const notificationRecord: any = {
        title,
        description,
        type,
        read: false,
        timestamp: serverTimestamp(),
        metadata: {
          ...metadata,
          sentAt: new Date().toISOString(),
          engineVersion: '2.0.0-PRO'
        }
      };

      await addDoc(notificationsRef, notificationRecord);
    } catch (error: any) {
      console.error(`[NotificationEngine] Dispatch Failure: ${error.message}`);
    }
  }

  /**
   * Specialized helper for reward notifications
   */
  static async notifyReward(userId: string, taskName: string, points: number, xp: number, txId?: string) {
    return this.send({
      userId,
      title: 'Task Approved',
      description: `You earned ${points.toLocaleString()} Points from: ${taskName}`,
      type: 'reward_claimed',
      metadata: {
        taskName,
        pointsAwarded: points,
        xpAwarded: xp,
        transactionReference: txId
      }
    });
  }
}
