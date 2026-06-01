import {
  collection,
  getDocs,
  setDoc,
  doc,
  serverTimestamp,
  query,
  limit
} from 'firebase/firestore';
import { db } from './config';

/**
 * CLEANUP: Removed all legacy/demo/mock tasks.
 * Task system is now purely administrative-led via the Operations Hub.
 */

export const seedTasks = async () => {
  try {
    const tasksCol = collection(db, 'tasks');
    const q = query(tasksCol, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Task ecosystem clean. No legacy tasks seeded.');

      // Seed default provider only
      await setDoc(doc(db, 'task_providers', 'SYSTEM'), {
        id: 'SYSTEM',
        name: 'PulseEarn',
        providerStatus: 'ACTIVE',
        totalPaid: 0,
        campaignBudget: 1000000,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
};
