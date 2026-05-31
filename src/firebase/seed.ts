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

const INITIAL_TASKS: Partial<Task>[] = [
  {
    title: 'Daily Ecosystem Ping',
    description: 'Check in with the platform and claim your daily reward.',
    instructions: 'Click claim to receive your reward',
    rewardAmount: 10,
    xpReward: 15,
    category: 'STREAK',
    status: 'ACTIVE',
    cooldownPeriod: 24,
    verificationType: 'automated',
    providerId: 'SYSTEM',
    providerName: 'PulseEarn',
    visibility: 'PUBLIC',
    minLevel: 1,
    platform: 'NONE',
    totalClaims: 0
  },
  {
    title: 'Terminal Surveillance',
    description: 'Monitor the live activity feed for 30 seconds.',
    instructions: 'Wait for the timer to complete',
    rewardAmount: 25,
    xpReward: 40,
    category: 'ENGAGEMENT',
    status: 'ACTIVE',
    cooldownPeriod: 1,
    verificationType: 'timer',
    providerId: 'SYSTEM',
    providerName: 'PulseEarn',
    visibility: 'PUBLIC',
    minLevel: 1,
    platform: 'NONE',
    totalClaims: 0
  },
  {
    title: 'X/Twitter Infiltration',
    description: 'Follow our official handle for system updates.',
    instructions: 'Follow @PulseEarn on X and submit your handle',
    rewardAmount: 50,
    xpReward: 100,
    category: 'SOCIAL',
    status: 'ACTIVE',
    minLevel: 2,
    cooldownPeriod: 0,
    verificationType: 'proof',
    providerId: 'SYSTEM',
    providerName: 'PulseEarn',
    visibility: 'PUBLIC',
    platform: 'TWITTER',
    totalClaims: 0
  }
];

export const seedTasks = async () => {
  try {
    const tasksCol = collection(db, 'tasks');
    const q = query(tasksCol, limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log('Seeding initial tasks...');
      for (const taskData of INITIAL_TASKS) {
        const newTaskRef = doc(tasksCol);
        await setDoc(newTaskRef, {
          ...taskData,
          id: newTaskRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Seed default provider
      await setDoc(doc(db, 'task_providers', 'SYSTEM'), {
        id: 'SYSTEM',
        name: 'PulseEarn',
        providerStatus: 'ACTIVE',
        totalPaid: 0,
        campaignBudget: 1000000,
        createdAt: serverTimestamp()
      });

      console.log('Seeding complete.');
    }
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
};
