import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { PointTransactionEngine } from './PointTransactionEngine';

export interface ConsistencyAudit {
  userId: string;
  expectedBalance: number;
  actualBalance: number;
  diff: number;
  inconsistent: boolean;
}

export class PointConsistencyScanner {
  /**
   * Scans a specific user's transaction history and compares it to their balance.
   */
  static async scanUser(userId: string): Promise<ConsistencyAudit> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("User not found");

    const actualBalance = userSnap.data().points || 0;

    // Sum all transactions
    const txRef = collection(db, 'users', userId, 'transactions');
    const txSnap = await getDocs(txRef);

    let expectedBalance = 0;
    txSnap.forEach(doc => {
      expectedBalance += (doc.data().amount || 0);
    });

    const diff = expectedBalance - actualBalance;

    return {
      userId,
      expectedBalance,
      actualBalance,
      diff,
      inconsistent: diff !== 0
    };
  }

  /**
   * Automatically repairs a user's balance if an inconsistency is detected.
   */
  static async repairUser(userId: string) {
    const audit = await this.scanUser(userId);

    if (audit.inconsistent) {
      console.log(`[PointAI] Repairing user ${userId}. Diff: ${audit.diff}`);

      await PointTransactionEngine.execute({
        userId,
        amount: audit.diff,
        type: 'AI_SYSTEM_CORRECTION',
        source: 'PointConsistencyScanner',
        claimId: `audit_${userId}_${Date.now()}`,
        description: `Automated balance alignment. Detected variance: ${audit.diff} PTS.`,
        metadata: {
          auditDate: new Date().toISOString(),
          variance: audit.diff,
          expected: audit.expectedBalance,
          actual: audit.actualBalance
        }
      });

      return { repaired: true, amount: audit.diff };
    }

    return { repaired: false };
  }
}
