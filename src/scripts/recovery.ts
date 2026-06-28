import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

/**
 * RECOVERY SCRIPT: Profile Backfill
 * Identifies users who exist in Firestore but may have inconsistent fields,
 * or logic to ensure deterministic claim IDs exist.
 *
 * Note: Client-side scripts cannot list Firebase Auth users.
 * This script focuses on Firestore-side integrity and welcome bonus repair.
 */
export const runProfileRecovery = async () => {
  console.log("Starting Profile Recovery...");
  const usersSnap = await getDocs(collection(db, 'users'));
  let fixed = 0;
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const uid = userDoc.id;

    // 1. Ensure referral code exists
    if (!data.referralCode) {
      const referralCode = `PULSE-${uid.slice(0, 6).toUpperCase()}`;
      await setDoc(doc(db, 'users', uid), { referralCode }, { merge: true });
      fixed++;
    }

    // 2. Ensure lastRewardDate exists for daily claim logic
    if (!data.lastRewardDate) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await setDoc(doc(db, 'users', uid), {
        lastRewardDate: Timestamp.fromDate(yesterday)
      }, { merge: true });
      fixed++;
    }

    skipped++;
  }

  console.log(`Recovery Complete. Evaluated: ${skipped}, Modified: ${fixed}`);
  return { evaluated: skipped, modified: fixed };
};
