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
import { Task, SystemTaskDefinition } from '../types';

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
        title: 'Welcome Task',
        description: 'Get started by reviewing the platform documentation.',
        instructions: 'Read the reward policy in your profile.',
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

    // Seed System Task Definitions
    const sysTasksCol = collection(db, 'system_task_definitions');
    const sysSnap = await getDocs(query(sysTasksCol, limit(1)));
    if (sysSnap.empty) {
      const definitions: Partial<SystemTaskDefinition>[] = [
        {
          id: 'welcome_prediction',
          title: 'Forecasting Debut',
          description: 'Submit your first market prediction to unlock platform achievements.',
          trigger: 'prediction_submitted',
          category: 'WELCOME',
          conditionField: 'stats.predictionsCount',
          targetValue: 1,
          rewardPoints: 50,
          rewardXp: 100,
          active: true,
          repeatable: false,
          priority: 100
        },
        {
          id: 'referral_junior',
          title: 'Network Builder',
          description: 'Successfully invite your first friend to join the PulseEarn ecosystem.',
          trigger: 'referral_completed',
          category: 'REFERRAL',
          conditionField: 'stats.referralsCount',
          targetValue: 1,
          rewardPoints: 100,
          rewardXp: 250,
          active: true,
          repeatable: false,
          priority: 90
        },
        {
          id: 'referral_pro',
          title: 'Community Leader',
          description: 'Onboard 5 unique nodes to the referral network.',
          trigger: 'referral_completed',
          category: 'REFERRAL',
          conditionField: 'stats.referralsCount',
          targetValue: 5,
          rewardPoints: 500,
          rewardXp: 1000,
          active: true,
          repeatable: false,
          priority: 80
        },
        {
          id: 'campaign_enthusiast',
          title: 'Campaign Enthusiast',
          description: 'Complete 5 individual tasks across any active campaigns.',
          trigger: 'campaign_task_completed',
          category: 'CAMPAIGN',
          conditionField: 'stats.tasksCompleted',
          targetValue: 5,
          rewardPoints: 200,
          rewardXp: 500,
          active: true,
          repeatable: false,
          priority: 70
        },
        {
          id: 'level_vanguard',
          title: 'Elite Progression',
          description: 'Reach Level 10 to establish elite platform status.',
          trigger: 'level_up',
          category: 'LEVEL',
          conditionField: 'level',
          targetValue: 10,
          rewardPoints: 1000,
          rewardXp: 2500,
          active: true,
          repeatable: false,
          priority: 60
        }
      ];

      for (const def of definitions) {
        await setDoc(doc(db, 'system_task_definitions', def.id!), {
          ...def,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      console.log(`Seeded ${definitions.length} system task definitions.`);
    }
  } catch (error) {
    console.error('Error seeding tasks:', error);
  }
};
