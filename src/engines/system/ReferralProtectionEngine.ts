import { db, auth } from '../../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';

export class ReferralProtectionEngine {
  /**
   * Checks if a user has met the qualifications to reward their referrer.
   * Triggered when a referee (userId) signs up or completes an action.
   */
  static async qualifyReferral(userId: string): Promise<void> {
    try {
      const refQuery = query(
        collection(db, 'referrals'),
        where('refereeId', '==', userId),
        where('status', '==', 'REGISTERED')
      );

      const snap = await getDocs(refQuery);
      if (snap.empty) return;

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;
      const userData = userSnap.data();

      for (const refDoc of snap.docs) {
        await this.processReferralReward(refDoc.id, refDoc.data(), userData);
      }
    } catch (err) {
      console.error("[ReferralProtection] Qualification check failed:", err);
    }
  }

  /**
   * Retroactively processes rewards for a referrer who just became qualified.
   * Triggered when a user completes their first task.
   */
  static async processRetroactiveRewards(referrerId: string): Promise<void> {
    try {
      const pendingQuery = query(
        collection(db, 'referrals'),
        where('referrerId', '==', referrerId),
        where('status', '==', 'REGISTERED')
      );

      const snap = await getDocs(pendingQuery);
      if (snap.empty) return;

      console.log(`[ReferralProtection] Processing ${snap.size} retroactive rewards for referrer ${referrerId}`);

      for (const refDoc of snap.docs) {
        const refData = refDoc.data();
        const refereeRef = doc(db, 'users', refData.refereeId);
        const refereeSnap = await getDoc(refereeRef);
        if (!refereeSnap.exists()) continue;

        await this.processReferralReward(refDoc.id, refData, refereeSnap.data());
      }
    } catch (err) {
      console.error("[ReferralProtection] Retroactive processing failed:", err);
    }
  }

  /**
   * Core logic to reward a referrer for a specific referral record.
   * Moved to server-side execution to satisfy Phase A field-level security locks.
   */
  private static async processReferralReward(referralDocId: string, refData: any, refereeData: any): Promise<void> {
    const { referrerId, refereeId } = refData;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/process-referral-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          referralDocId,
          referrerId,
          refereeId,
          refereeUsername: refereeData.username
        })
      });

      const res = await response.json();
      if (!res.success) {
        console.warn(`[ReferralProtection] Server-side processing failed: ${res.error}`);
      }
    } catch (err) {
      console.error(`[ReferralProtection] Failed to trigger server-side reward for ${referralDocId}:`, err);
    }
  }
}
