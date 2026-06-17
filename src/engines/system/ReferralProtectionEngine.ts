import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { PointTransactionEngine } from '../points/PointTransactionEngine';
import { NotificationEngine } from './NotificationEngine';
import { FraudEngine } from './FraudEngine';

export class ReferralProtectionEngine {
  /**
   * Checks if a user has met the qualifications to reward their referrer.
   * Qualifications: Email Verified AND (1 Task Completed OR Level 2 reached).
   */
  static async qualifyReferral(userId: string): Promise<void> {
    try {
      // 1. Find the referral record where this user is the referee
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

      // 2. Check Participation Requirements
      const hasTasks = (userData.stats?.tasksCompleted || 0) >= 1;
      const isLeveled = (userData.level || 1) >= 2;
      const isQualified = hasTasks || isLeveled;

      if (!isQualified) return;

      // 3. Process Rewards for all matching referral records (usually just one)
      for (const refDoc of snap.docs) {
        const refData = refDoc.data();
        const referrerId = refData.referrerId;

        // 3.5 Sanity Check (Same Device, etc)
        const isSane = await FraudEngine.checkReferralSanity(referrerId, userId);
        if (!isSane) {
           await updateDoc(doc(db, 'referrals', refDoc.id), {
              status: 'FLAGGED',
              updatedAt: serverTimestamp()
           });
           continue;
        }

        // 4. Execute Reward for Referrer
        const claimId = `ref_qualify_${referrerId}_${userId}`;
        const rewardResult = await PointTransactionEngine.execute({
          userId: referrerId,
          amount: 50,
          type: 'referral_bonus',
          source: `Referral Qualified: ${userData.username}`,
          claimId,
          xpReward: 50
        });

        if (rewardResult.success) {
           // 5. Update Referral Status
           await updateDoc(doc(db, 'referrals', refDoc.id), {
              status: 'REWARDED',
              rewardTransactionId: rewardResult.txId,
              updatedAt: serverTimestamp()
           });

           // 6. Notify Referrer
           await NotificationEngine.send({
              userId: referrerId,
              title: 'Referral Qualified!',
              description: `Your referral ${userData.username} has completed their first task. +50 PTS awarded.`,
              type: 'referral_joined'
           });
        }
      }
    } catch (err) {
      console.error("[ReferralProtection] Qualification check failed:", err);
    }
  }
}
