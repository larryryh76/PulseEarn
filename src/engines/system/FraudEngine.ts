import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  serverTimestamp,
  addDoc,
  getDoc
} from 'firebase/firestore';

export class FraudEngine {
  /**
   * Evaluates user risk based on device fingerprint and behavior.
   * Does NOT auto-ban, but flags for admin review.
   */
  static async evaluateUserIntegrity(userId: string, fingerprint: string): Promise<void> {
    try {
      let riskScore = 0;
      const flags: string[] = [];

      // 1. Check for Duplicate Fingerprints (Multi-Account Detection)
      const fpQuery = query(
        collection(db, 'users'),
        where('fingerprint', '==', fingerprint)
      );
      const fpSnap = await getDocs(fpQuery);

      if (fpSnap.size > 1) {
        riskScore += (fpSnap.size - 1) * 20;
        flags.push('MULTI_ACCOUNT_FP');
      }

      // 2. Check for suspicious account age vs earnings (Future)

      // 3. Resolve Risk Level
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (riskScore >= 60) riskLevel = 'HIGH';
      else if (riskScore >= 20) riskLevel = 'MEDIUM';

      // 4. Update User Profile
      await updateDoc(doc(db, 'users', userId), {
        riskScore,
        riskLevel,
        fraudFlags: arrayUnion(...flags),
        updatedAt: serverTimestamp()
      });

      // 5. If High Risk, Log System Anomaly
      if (riskLevel === 'HIGH') {
         const anomalyRef = collection(db, 'system_anomalies');
         await addDoc(anomalyRef, {
            userId,
            error: `High Risk Detection: ${flags.join(', ')}`,
            severity: 'HIGH',
            context: 'UserIntegrity_Scan',
            timestamp: serverTimestamp(),
            metadata: { fingerprint, duplicateCount: fpSnap.size }
         });
      }

    } catch (err) {
      console.error("[FraudEngine] Integrity evaluation failed:", err);
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
