import { db } from '../../firebase/config';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ActivityEngine } from '../system/ActivityEngine';
import { SystemTaskEngine } from './SystemTaskEngine';

export class CampaignEngine {
  /**
   * Officially enrolls a user into a campaign.
   * Creates a participation record and logs the activity.
   */
  static async joinCampaign(userId: string, campaignId: string): Promise<void> {
    const participationRef = doc(db, 'users', userId, 'campaign_participation', campaignId);

    try {
      const snap = await getDoc(participationRef);
      if (!snap.exists()) {
        // 1. Create participation record
        await setDoc(participationRef, {
          campaignId,
          userId,
          status: 'ACTIVE',
          joinedAt: serverTimestamp(),
          tasksCompleted: 0,
          lastActivityAt: serverTimestamp()
        });

        // 2. Increment global participant count
        const campaignRef = doc(db, 'campaigns', campaignId);
        await setDoc(campaignRef, {
          participantsCount: increment(1)
        }, { merge: true });

        // 3. Log Activity
        const campaignSnap = await getDoc(campaignRef);
        const campaignName = campaignSnap.exists() ? campaignSnap.data().name : 'New Campaign';

        await ActivityEngine.log({
          userId,
          type: 'campaign_joined',
          description: `Joined ${campaignName} Campaign`,
          referenceId: campaignId
        });
      }
    } catch (error: any) {
      console.error(`[CampaignEngine] Join failed for ${campaignId}:`, error.message);
    }
  }

  /**
   * Marks a campaign as completed for a user.
   */
  static async completeCampaign(userId: string, campaignId: string): Promise<void> {
    const participationRef = doc(db, 'users', userId, 'campaign_participation', campaignId);

    try {
      await setDoc(participationRef, {
        status: 'COMPLETED',
        completedAt: serverTimestamp()
      }, { merge: true });

      const campaignRef = doc(db, 'campaigns', campaignId);
      const campaignSnap = await getDoc(campaignRef);
      const campaignName = campaignSnap.exists() ? campaignSnap.data().name : 'Campaign';

      await ActivityEngine.log({
        userId,
        type: 'campaign_completed',
        description: `Successfully completed ${campaignName}!`,
        referenceId: campaignId
      });

      // Trigger level/progress event
      await SystemTaskEngine.processEvent(userId, 'campaign_task_completed');
    } catch (error: any) {
      console.error(`[CampaignEngine] Completion failed for ${campaignId}:`, error.message);
    }
  }
}
