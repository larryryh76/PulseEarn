import { db } from '../../firebase/config';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Activity } from '../../types';

export type ActivityType =
  | Activity['type']
  | 'campaign_joined'
  | 'campaign_completed'
  | 'withdrawal_requested'
  | 'withdrawal_approved'
  | 'withdrawal_completed'
  | 'admin_reward_adjustment'
  | 'streak_milestone_reached'
  | 'referral_registered'
  | 'referral_reward_earned'
  | 'xp_milestone_reached'
  | 'support_ticket_created'
  | 'support_ticket_updated'
  | 'support_ticket_resolved';

export interface ActivityLogRequest {
  userId: string;
  type: ActivityType;
  points?: number;
  description: string;
  referenceId?: string;
  metadata?: {
    // Prediction Specific
    assetId?: string;
    symbol?: string;
    direction?: 'UP' | 'DOWN';
    entryPrice?: number;
    exitPrice?: number;
    stakeAmount?: number;
    payoutMultiplier?: number;
    predictionStatus?: string;

    // Task Specific
    campaignId?: string;
    campaignName?: string;
    taskName?: string;
    xpEarned?: number;
    verificationStatus?: string;

    // Referral Specific
    referredUser?: string;
    milestone?: string;

    // Support Specific
    ticketId?: string;
    category?: string;
    status?: string;

    // Generic
    transactionReference?: string;
    [key: string]: any;
  };
}

export class ActivityEngine {
  /**
   * The central timeline authority for the PulseEarn ecosystem.
   * Logs every significant user event to the Firestore activity feed.
   * Ensures self-contained records for the event timeline.
   */
  static async log(request: ActivityLogRequest): Promise<void> {
    const { userId, type, points = 0, description, referenceId, metadata = {} } = request;

    try {
      const activityRef = doc(collection(db, 'users', userId, 'activities'));

      // Ensure timestamp is present in metadata for self-containment if needed
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
          eventTimestamp: new Date().toISOString(),
          loggedBy: 'ActivityEngine_V6_PRO',
          engineVersion: '6.0.0-PRO'
        }
      };

      await setDoc(activityRef, activityRecord);
    } catch (error: any) {
      console.error(`[ActivityEngine] System Failure: ${error.message}`);
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
