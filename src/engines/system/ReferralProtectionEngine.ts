import { db } from '../../firebase/config';
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
   * DEPRECATED: Signup bonuses are now applied immediately via /api/referrals/apply-signup-bonus
   * during signup, so retroactive processing is no longer needed.
   * 
   * This class remains for backward compatibility and potential future use cases.
   */

  /**
   * Validates that a referral record exists and is in valid state.
   * Used for audit checks and verification.
   */
  static async validateReferralRecord(referralDocId: string): Promise<boolean> {
    try {
      const refRef = doc(db, 'referrals', referralDocId);
      const snap = await getDoc(refRef);
      return snap.exists() && snap.data()?.status === 'QUALIFIED';
    } catch (err) {
      console.error("[ReferralProtection] Validation failed:", err);
      return false;
    }
  }

  /**
   * Gets all referrals for a user (as referrer) and calculates total earned.
   * Used for dashboard stats and analytics.
   */
  static async getReferralStats(referrerId: string): Promise<{
    totalReferrals: number;
    convertedReferrals: number;
    totalEarned: number;
  }> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referrerId', '==', referrerId)
      );

      const snap = await getDocs(q);
      const referrals = snap.docs.map(d => d.data());
      
      const converted = referrals.filter(r => r.status === 'QUALIFIED').length;

      return {
        totalReferrals: referrals.length,
        convertedReferrals: converted,
        totalEarned: referrals.reduce((sum: number, r: any) => sum + (r.referrerBonusPoints || 0), 0)
      };
    } catch (err) {
      console.error("[ReferralProtection] Stats retrieval failed:", err);
      return { totalReferrals: 0, convertedReferrals: 0, totalEarned: 0 };
    }
  }

  /**
   * Gets all referrals where a user is the referee.
   * Used to show how the user got their signup bonus.
   */
  static async getUserReferralSource(refereeId: string): Promise<any | null> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('refereeId', '==', refereeId)
      );

      const snap = await getDocs(q);
      return snap.empty ? null : snap.docs[0].data();
    } catch (err) {
      console.error("[ReferralProtection] Source lookup failed:", err);
      return null;
    }
  }
}
