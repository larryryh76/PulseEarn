import { db } from '../../firebase/config';
import {
  doc,
  collection,
  serverTimestamp,
  runTransaction,
  query,
  where,
  getDocs,
  limit,
  increment
} from 'firebase/firestore';
import { ReferralRecord, UserData } from '../../types';
import { PointTransactionEngine } from '../points/PointTransactionEngine';

export class ReferralEngine {
  /**
   * Authoritatively links a new user to a referrer
   */
  static async processReferral(refereeId: string, referralCode: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Resolve Referrer from Code
        const referrersQuery = query(
          collection(db, 'users'),
          where('referralCode', '==', referralCode),
          limit(1)
        );
        const referrerDocs = await getDocs(referrersQuery);

        if (referrerDocs.empty) throw new Error("INVALID_REFERRAL_CODE");
        const referrerId = referrerDocs.docs[0].id;
        const referrerData = referrerDocs.docs[0].data() as UserData;

        if (referrerId === refereeId) throw new Error("SELF_REFERRAL_PROHIBITED");

        const refereeRef = doc(db, 'users', refereeId);
        const refereeSnap = await transaction.get(refereeRef);
        if (!refereeSnap.exists()) throw new Error("REFEREE_NOT_FOUND");
        const refereeData = refereeSnap.data() as UserData;

        if (refereeData.referredBy) throw new Error("ALREADY_REFERRED");

        // 2. Create Referral Record
        const referralId = `ref_${referrerId}_${refereeId}`;
        const referralRef = doc(db, 'referrals', referralId);
        const referralSnap = await transaction.get(referralRef);
        if (referralSnap.exists()) throw new Error("REFERRAL_LINK_ALREADY_EXISTS");

        const record: ReferralRecord = {
          id: referralId,
          referrerId,
          refereeId,
          refereeUsername: refereeData.username,
          status: 'REGISTERED',
          createdAt: serverTimestamp() as any,
          updatedAt: serverTimestamp() as any,
          fraudFlags: []
        };

        // 3. Fraud Detection (Basic IP/Device logic can be added here)
        if (referrerData.walletAddress && refereeData.walletAddress && referrerData.walletAddress === refereeData.walletAddress) {
          record.status = 'FLAGGED';
          record.fraudFlags.push('MATCHING_WALLET_IDENTIFIED');
        }

        // 4. Update Referee State
        transaction.update(refereeRef, {
          referredBy: referrerId,
          status: 'restricted' // Pending verification/activation
        });

        // 5. Update Referrer Stats
        const referrerRef = doc(db, 'users', referrerId);
        transaction.update(referrerRef, {
          'stats.referralsCount': increment(1)
        });

        transaction.set(referralRef, record);

        return { success: true };
      });
    } catch (error: any) {
      console.error(`[ReferralEngine] Linkage Failure: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Finalizes reward release after referee meets activity criteria
   */
  static async activateReferral(refereeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      return await runTransaction(db, async (transaction) => {
        const refereeRef = doc(db, 'users', refereeId);
        const refereeSnap = await transaction.get(refereeRef);
        const refereeData = refereeSnap.data() as UserData;

        if (!refereeData.referredBy) throw new Error("NO_REFERRER_LINKED");
        const referrerId = refereeData.referredBy;

        const referralId = `ref_${referrerId}_${refereeId}`;
        const referralRef = doc(db, 'referrals', referralId);
        const referralSnap = await transaction.get(referralRef);

        if (!referralSnap.exists()) throw new Error("REFERRAL_RECORD_MISSING");
        const referralData = referralSnap.data() as ReferralRecord;

        if (referralData.status === 'REWARDED' || referralData.status === 'ACTIVATED') {
          throw new Error("ALREADY_PROCESSED");
        }

        // Release Rewards via PointTransactionEngine
        const claimId = `ref_reward_${referralId}`;
        const rewardResult = await PointTransactionEngine.execute({
          userId: referrerId,
          amount: 500, // 500 PTS per referral
          type: 'referral_bonus',
          source: `Referral Reward: ${refereeData.username}`,
          claimId,
          referenceId: referralId,
          xpReward: 100
        });

        if (!rewardResult.success) throw new Error(rewardResult.error);

        // Update Status
        transaction.update(referralRef, {
          status: 'REWARDED',
          rewardTransactionId: rewardResult.txId,
          updatedAt: serverTimestamp()
        });

        // Send Notification
        const notificationsRef = collection(db, 'users', referrerId, 'notifications');
        const notifDoc = doc(notificationsRef);
        transaction.set(notifDoc, {
          title: 'Referral Activated!',
          description: `Your referral ${refereeData.username} has been verified. +500 PTS awarded.`,
          type: 'referral_joined',
          read: false,
          timestamp: serverTimestamp()
        });

        return { success: true };
      });
    } catch (error: any) {
      console.error(`[ReferralEngine] Activation Failure: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
