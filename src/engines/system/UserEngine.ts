import { db } from '../../firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDeviceFingerprint } from '../../utils/fingerprint';
import { FraudEngine } from './FraudEngine';

export class UserEngine {
  /**
   * Records device fingerprint and checks for multi-account violations.
   */
  static async recordFingerprint(uid: string): Promise<void> {
    try {
      const fingerprint = await getDeviceFingerprint();
      const fpRef = doc(db, 'system_fingerprints', `${uid}_${fingerprint}`);

      await setDoc(fpRef, {
        userId: uid,
        fingerprint,
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });

      await updateDoc(doc(db, 'users', uid), {
        fingerprint,
        lastSeen: serverTimestamp()
      });

      // Simple Multi-Account Scan
      await FraudEngine.evaluateUserIntegrity(uid, fingerprint);

    } catch (err) {
      console.warn("[UserEngine] Fingerprint recording failed:", err);
    }
  }
}
