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
import { Task } from '../types';

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

      // Seed a single initial production-ready task
      const initialTask: Partial<Task> = {
        id: 'initial_onboarding',
        title: 'Platform Calibration',
        description: 'Verify your operational status by reviewing the system documentation.',
        instructions: 'Read the reward policy in your profile center.',
        category: 'EDUCATION',
        type: 'once',
        platform: 'NONE',
        rewardAmount: 100,
        xpReward: 50,
        status: 'ACTIVE',
        visibility: 'PUBLIC',
        verificationType: 'automated',
        cooldownPeriod: 0,
        minLevel: 1,
        totalClaims: 0,
        providerId: 'SYSTEM',
        providerName: 'PulseEarn',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        fraudProtection: {
           duplicatePrevention: true,
           abuseDetection: true,
           multiAccountDetection: true
        }
      };
      await setDoc(doc(db, 'tasks', 'initial_onboarding'), initialTask);
    }
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
};
