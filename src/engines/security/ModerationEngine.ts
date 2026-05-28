import { db } from '../../firebase/config';
import {
  doc,
  serverTimestamp,
  runTransaction,
  collection
} from 'firebase/firestore';

export class ModerationEngine {
  /**
   * Authoritatively suspends or freezes an account
   */
  static async lockAccount(userId: string, adminId: string, reason: string, duration: 'temporary' | 'permanent'): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const auditRef = collection(db, 'system_audit');

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) throw new Error("USER_NOT_FOUND");

      transaction.update(userRef, {
        status: duration === 'permanent' ? 'frozen' : 'restricted',
        isBanned: duration === 'permanent',
        isFlagged: true,
        flagReason: reason
      });

      // Immutable Audit Record
      const auditDoc = doc(auditRef);
      transaction.set(auditDoc, {
        type: 'ACCOUNT_LOCK',
        userId,
        adminId,
        reason,
        severity: duration === 'permanent' ? 'CRITICAL' : 'HIGH',
        timestamp: serverTimestamp()
      });

      // Notify User
      const notifRef = collection(db, 'users', userId, 'notifications');
      const notifDoc = doc(notifRef);
      transaction.set(notifDoc, {
        title: 'Account Security Notice',
        description: `Your account has been ${duration === 'permanent' ? 'suspended' : 'restricted'} due to: ${reason}`,
        type: 'moderation_notice',
        read: false,
        timestamp: serverTimestamp()
      });
    });
  }

  /**
   * Resets account security state (Recovery)
   */
  static async recoverAccount(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (transaction) => {
      transaction.update(userRef, {
        status: 'active',
        isBanned: false,
        isFlagged: false,
        flagReason: null,
        'security.suspiciousFlags': []
      });
    });
  }
}
