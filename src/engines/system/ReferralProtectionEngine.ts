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
import { EconomyConfigEngine } from './EconomyConfigEngine';

export class ReferralProtectionEngine {
  /**
   * Checks if a user has met the qualifications to reward their referrer.
   * Usually called when a referee signs up or a referrer completes their first task.
   */
  static async qualifyReferral(userId: string): Promise<void> {
    try {
      // 1. First check: Is this user a REFEREE who just joined?
      const refAsRefereeQuery = query(
        collection(db, 'referrals'),
        where('refereeId', '==', userId),
        where('status', '==', 'REGISTERED')
      );

      const refereeSnap = await getDocs(refAsRefereeQuery);
      if (!refereeSnap.empty) {
        await this.processReferralRecords(refereeSnap.docs);
      }

      // 2. Second check: Did this user just become a QUALIFIED REFERRER?
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && (userSnap.data().stats?.tasksCompleted || 0) > 0) {
        const refAsReferrerQuery = query(
          collection(db, 'referrals'),
          where('referrerId', '==', userId),
          where('status', '==', 'REGISTERED')
        );
        const referrerSnap = await getDocs(refAsReferrerQuery);
        if (!referrerSnap.empty) {
          await this.processReferralRecords(referrerSnap.docs);
        }
      }
    } catch (err) {
      console.error("[ReferralProtection] Qualification check failed:", err);
    }
  }

  private static async processReferralRecords(docs: any[]): Promise<void> {
    const config = await EconomyConfigEngine.getConfig();

    for (const refDoc of docs) {
      try {
        const refData = refDoc.data();
        const referrerId = refData.referrerId;
        const refereeId = refData.refereeId;

        // 1. Check Referrer Eligibility (Must have completed at least 1 task)
        const referrerRef = doc(db, 'users', referrerId);
        const referrerSnap = await getDoc(referrerRef);
        if (!referrerSnap.exists()) continue;
        const referrerData = referrerSnap.data();

        const isReferrerQualified = (referrerData.stats?.tasksCompleted || 0) > 0;
        if (!isReferrerQualified) continue;

        // 2. Get Referee Data for metadata
        const refereeRef = doc(db, 'users', refereeId);
        const refereeSnap = await getDoc(refereeRef);
        if (!refereeSnap.exists()) continue;
        const refereeData = refereeSnap.data();

        // 3. Sanity Check (Anti-Fraud)
        const isSane = await FraudEngine.checkReferralSanity(referrerId, refereeId);
        if (!isSane) {
          await updateDoc(doc(db, 'referrals', refDoc.id), {
            status: 'FLAGGED',
            updatedAt: serverTimestamp()
          });
          continue;
        }

        // 4. Execute Reward for Referrer
        const claimId = `ref_qualify_${referrerId}_${refereeId}`;
        const rewardResult = await PointTransactionEngine.execute({
          userId: referrerId,
          amount: config.rewards.referralBonusPoints,
          type: 'referral_bonus',
          source: `Referral Bonus (Friend Joined): ${refereeData.username}`,
          claimId,
          xpReward: config.rewards.referralBonusXP
        });

        if (rewardResult.success || rewardResult.error === 'REWARD_ALREADY_CLAIMED') {
          // 5. Update Referral Status
          await updateDoc(doc(db, 'referrals', refDoc.id), {
            status: 'REWARDED',
            rewardTransactionId: rewardResult.success ? rewardResult.txId : 'ALREADY_CLAIMED',
            updatedAt: serverTimestamp()
          });

          // 6. Notify Referrer
          if (rewardResult.success) {
            await NotificationEngine.send({
              userId: referrerId,
              title: 'Referral Reward Issued!',
              description: `You earned +${config.rewards.referralBonusPoints} PTS for inviting ${refereeData.username}.`,
              type: 'referral_joined'
            });
          }
        }
      } catch (innerErr) {
        console.error("[ReferralProtection] Failed to process specific referral:", innerErr);
      }
    }
  }
}
