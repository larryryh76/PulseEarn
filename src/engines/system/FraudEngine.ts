import { auth } from '../../firebase/config';
import { safeFetch } from '../../utils/api';

export class FraudEngine {
  /**
   * Evaluates user risk based on device fingerprint and behavior.
   * Moved to server-side execution to avoid unauthorized user list access.
   */
  static async evaluateUserIntegrity(userId: string, fingerprint: string): Promise<void> {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/evaluate-user-integrity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, fingerprint })
      });

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
      // NOTE: Do NOT write fraudFlags/riskScore directly from the client.
      // Firestore rules restrict those fields to server-side (Admin SDK) writes only.
      // Delegate to the server-side integrity endpoint which has Admin SDK access.
      const token = await auth.currentUser?.getIdToken();
      const res = await safeFetch('/api/check-referral-sanity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ referrerId, refereeId })
      });

      // Server returns { success: true, passed: boolean }
      if (!res.success) return true; // Default to pass on server error
      return res.passed === true;
    } catch (err) {
      return true; // Default to pass on error to avoid blocking legitimate users
    }
  }
}
