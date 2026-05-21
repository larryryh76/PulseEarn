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
    title: 'Daily Check-In',
    description: 'Claim your daily pulse reward and maintain your streak.',
    rewardPoints: 10,
    type: 'daily',
    active: true,
    cooldown: 24,
  },
  {
    title: 'Watch & Earn',
    description: 'Watch the dashboard for 30 seconds to earn points.',
    rewardPoints: 25,
    type: 'timer',
    active: true,
    duration: 30,
    cooldown: 1, // Repeatable every hour? Or just daily? Let's say hourly for engagement.
  },
  {
    title: 'Social Pulse',
    description: 'Spread the word about PulseEarn to your squad.',
    rewardPoints: 50,
    type: 'referral',
    active: true,
  },
  {
    title: 'Profile Pioneer',
    description: 'Explore all features of the PulseEarn dashboard.',
    rewardPoints: 15,
    type: 'once',
    active: true,
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
