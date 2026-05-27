import { db } from '../../firebase/config';
import {
  collection,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

export interface AuditEvent {
  type: 'REWARD_DISTRIBUTION' | 'BALANCE_CORRECTION' | 'PAYOUT_REQUEST' | 'MODERATION_ACTION' | 'ADMIN_ACTION' | 'SYSTEM_REPAIR';
  userId: string;
  adminId?: string;
  amount?: number;
  previousBalance?: number;
  newBalance?: number;
  metadata: Record<string, any>;
  status: 'SUCCESS' | 'FAILURE';
}

export class AuditEngine {
  private static AUDIT_COLLECTION = 'system_audit_logs';

  static async log(event: AuditEvent) {
    try {
      await addDoc(collection(db, this.AUDIT_COLLECTION), {
        ...event,
        timestamp: serverTimestamp(),
        engineVersion: '5.0.0-PRO'
      });
    } catch (error) {
      console.error("[AuditEngine] Failed to log event:", error);
    }
  }
}
