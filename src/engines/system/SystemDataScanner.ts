import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  query,
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { PointConsistencyScanner } from '../points/PointConsistencyScanner';

export class SystemDataScanner {
  /**
   * Scans Firestore for invalid or orphaned data states.
   */
  static async scanDataIntegrity() {
    const alerts = [];

    // 1. Scan for point balance vs transaction mismatches
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(query(usersRef, limit(20)));

    for (const userDoc of usersSnap.docs) {
      const audit = await PointConsistencyScanner.scanUser(userDoc.id);
      if (audit.inconsistent) {
        alerts.push({
          type: 'DATA_INCONSISTENCY',
          severity: 'HIGH',
          userId: userDoc.id,
          message: `User balance mismatch detected. Variance: ${audit.diff} PTS.`,
          audit
        });
      }
    }

    // Store alerts in AI Reports
    if (alerts.length > 0) {
      await addDoc(collection(db, 'aiAlerts'), {
        alerts,
        type: 'DATA_INTEGRITY_SCAN',
        timestamp: serverTimestamp()
      });
    }

    return alerts;
  }
}
