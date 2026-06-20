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
   */
  private static async processReferralReward(referralDocId: string, refData: any, refereeData: any): Promise<void> {
    const { referrerId, refereeId } = refData;

    try {
      // 1. Check Referrer Eligibility (Must have completed at least 1 task)
      const referrerRef = doc(db, 'users', referrerId);
      const referrerSnap = await getDoc(referrerRef);
      if (!referrerSnap.exists()) return;
      const referrerData = referrerSnap.data();

      const isReferrerQualified = (referrerData.stats?.tasksCompleted || 0) > 0;
      if (!isReferrerQualified) return;

      // 2. Sanity Check (Fraud Detection)
      const isSane = await FraudEngine.checkReferralSanity(referrerId, refereeId);
      if (!isSane) {
        await updateDoc(doc(db, 'referrals', referralDocId), {
          status: 'FLAGGED',
          updatedAt: serverTimestamp()
        });
        return;
      }

      // 3. Execute Reward
      const config = await EconomyConfigEngine.getConfig();
      const claimId = `ref_qualify_${referrerId}_${refereeId}`;

      const rewardResult = await PointTransactionEngine.execute({
        userId: referrerId,
        amount: config.rewards.referralBonusPoints,
        type: 'referral_bonus',
        source: `Referral Bonus: ${refereeData.username}`,
        claimId,
        xpReward: config.rewards.referralBonusXP,
        metadata: { refereeId, engineVersion: '5.0.0-PRO' }
      });

      if (rewardResult.success || rewardResult.error === 'REWARD_ALREADY_CLAIMED') {
        await updateDoc(doc(db, 'referrals', referralDocId), {
          status: 'REWARDED',
          rewardTransactionId: rewardResult.success ? rewardResult.txId : 'ALREADY_CLAIMED',
          updatedAt: serverTimestamp()
        });

        if (rewardResult.success) {
          await NotificationEngine.send({
            userId: referrerId,
            title: 'Referral Bonus Received!',
            description: `Your referral ${refereeData.username} is now verified. +${config.rewards.referralBonusPoints} PTS awarded.`,
            type: 'referral_joined'
          });
        }
      }
    } catch (err) {
      console.error(`[ReferralProtection] Failed to process reward for ${referralDocId}:`, err);
    }
  }
}
