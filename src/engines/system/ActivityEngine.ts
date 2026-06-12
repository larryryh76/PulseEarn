import { db } from '../../firebase/config';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Activity } from '../../types';

export type ActivityType = Activity['type'] | 'campaign_joined' | 'campaign_completed' | 'withdrawal_requested' | 'withdrawal_approved' | 'withdrawal_completed' | 'admin_reward_adjustment' | 'streak_milestone_reached' | 'referral_registered' | 'referral_reward_earned' | 'xp_milestone_reached';

export interface ActivityLogRequest {
  userId: string;
  type: ActivityType;
  points?: number;
  description: string;
  referenceId?: string;
  metadata?: Record<string, any>;
}

export class ActivityEngine {
  /**
   * The central timeline authority for the PulseEarn ecosystem.
   * Logs every significant user event to the Firestore activity feed.
   */
  static async log(request: ActivityLogRequest): Promise<void> {
    const { userId, type, points = 0, description, referenceId, metadata = {} } = request;

    try {
      const activityRef = doc(collection(db, 'users', userId, 'activities'));

      const activityRecord: any = {
        id: activityRef.id,
        userId,
        type,
        points,
        description,
        timestamp: serverTimestamp(),
        referenceId: referenceId || null,
        metadata: {
          ...metadata,
          loggedBy: 'ActivityEngine_V5',
          engineVersion: '5.0.0-PRO'
        }
      };

      await setDoc(activityRef, activityRecord);

      // Optional: Integration with global platform event bus if needed
      // console.log(`[ActivityEngine] Logged ${type} for ${userId}`);
    } catch (error: any) {
      console.error(`[ActivityEngine] Failed to log activity for ${userId}:`, error.message);
      // Background logging failsafe - we don't want to block main transactions if activity logging fails
    }
  }

  /**
   * Helper to log point-related rewards with consistent formatting
   */
  static async logReward(userId: string, source: string, amount: number, referenceId?: string) {
    return this.log({
      userId,
      type: 'reward_received',
      points: amount,
      description: source,
      referenceId
    });
  }
}
