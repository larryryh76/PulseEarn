import { db } from '../../firebase/config';
import {
  doc,
  updateDoc,
  increment,
  arrayUnion,
  getDoc
} from 'firebase/firestore';

export class FraudEngine {
  /**
   * Evaluates user risk based on device fingerprint and behavior.
   * Moved to server-side execution to avoid unauthorized user list access.
   */
  static async evaluateUserIntegrity(userId: string, fingerprint: string): Promise<void> {
    try {
      const response = await fetch('/api/evaluate-user-integrity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, fingerprint })
      });

      const res = await response.json();
      if (!res.success) {
        console.warn(`[FraudEngine] Server-side integrity check failed: ${res.error}`);
      }
    } catch (err) {
      console.error("[FraudEngine] Failed to trigger server-side integrity evaluation:", err);
    }
  }

  /**
   * Validates referral integrity before granting rewards.
   */
  static async checkReferralSanity(referrerId: string, refereeId: string): Promise<boolean> {
    try {
      const referrerRef = doc(db, 'users', referrerId);
      const refereeRef = doc(db, 'users', refereeId);

      const [rSnap, eSnap] = await Promise.all([getDoc(referrerRef), getDoc(refereeRef)]);

      if (!rSnap.exists() || !eSnap.exists()) return false;

      const referrer = rSnap.data();
      const referee = eSnap.data();

      // Flag 1: Same Device referral
      if (referrer.fingerprint && referee.fingerprint && referrer.fingerprint === referee.fingerprint) {
         await updateDoc(refereeRef, {
            fraudFlags: arrayUnion('SAME_DEVICE_REFERRAL'),
            riskScore: increment(30)
         });
         return false; // Fail sanity check
      }

      return true;
    } catch (err) {
      return true; // Default to pass on error to avoid blocking legitimate users
    }
  }
}
