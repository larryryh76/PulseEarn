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

const INITIAL_TASKS: Omit<Task, 'id' | 'createdAt'>[] = [
  {
    title: 'Daily Protocol Ping',
    description: 'Sync with the mainnet and claim your daily reward.',
    rewardPoints: 10,
    rewardXp: 15,
    type: 'daily',
    rarity: 'common',
    difficulty: 'easy',
    category: 'Daily',
    active: true,
    cooldown: 24,
    verificationType: 'automated'
  },
  {
    title: 'Terminal Surveillance',
    description: 'Monitor the live activity feed for 30 seconds.',
    rewardPoints: 25,
    rewardXp: 40,
    type: 'timer',
    rarity: 'common',
    difficulty: 'easy',
    category: 'Daily',
    active: true,
    duration: 30,
    cooldown: 1,
    verificationType: 'timer'
  },
  {
    title: 'X/Twitter Infiltration',
    description: 'Follow our official handle for protocol updates.',
    rewardPoints: 50,
    rewardXp: 100,
    type: 'social',
    rarity: 'rare',
    difficulty: 'medium',
    category: 'Social',
    minLevel: 2,
    active: true,
    cooldown: 0,
    verificationType: 'manual',
    proofRequirements: 'Submit your X profile link'
  },
  {
    title: 'Squad Expansion',
    description: 'Successfully refer a new node to the ecosystem.',
    rewardPoints: 150,
    rewardXp: 300,
    type: 'referral',
    rarity: 'rare',
    difficulty: 'hard',
    category: 'Growth',
    active: true,
    verificationType: 'automated'
  },
  {
    title: 'Oracle Master',
    description: 'Correctly predict 5 market movements.',
    rewardPoints: 500,
    rewardXp: 1000,
    type: 'prediction',
    rarity: 'legendary',
    difficulty: 'hard',
    category: 'Featured',
    minLevel: 5,
    active: true,
    isFeatured: true,
    verificationType: 'automated'
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
          createdAt: serverTimestamp()
        });
      }
      console.log('Seeding complete.');
    }
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
};
