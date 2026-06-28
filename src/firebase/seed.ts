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
          id: 'daily_checkin',
          title: 'Daily Check-In',
          description: 'Log in today to keep your streak going',
          trigger: 'daily_login',
          category: 'DAILY',
          conditionField: 'streak',
          targetValue: 1,
          rewardPoints: 20,
          rewardXp: 50,
          active: true,
          period: 'DAILY',
          repeatable: true,
          priority: 110
        },
        {
          id: 'welcome_aboard',
          title: 'Welcome Aboard',
          description: 'Complete your very first task',
          trigger: 'campaign_task_completed',
          category: 'WELCOME',
          conditionField: 'stats.tasksCompleted',
          targetValue: 1,
          rewardPoints: 50,
          rewardXp: 100,
          active: true,
          period: 'ONCE',
          repeatable: false,
          priority: 105
        },
        {
          id: 'two_for_today',
          title: 'Two for Today',
          description: 'Complete 2 tasks today',
          trigger: 'campaign_task_completed',
          category: 'DAILY',
          conditionField: 'totalEarnedToday', // Proxy or custom logic
          targetValue: 2,
          rewardPoints: 40,
          rewardXp: 80,
          active: true,
          period: 'DAILY',
          repeatable: true,
          priority: 100
        },
        {
          id: 'first_forecast',
          title: 'First Forecast',
          description: 'Place your first prediction today',
          trigger: 'prediction_submitted',
          category: 'DAILY',
          conditionField: 'stats.predictionsCount',
          targetValue: 1,
          rewardPoints: 25,
          rewardXp: 50,
          active: true,
          period: 'DAILY',
          repeatable: true,
          priority: 95
        },
        {
          id: 'weekly_grind',
          title: 'Weekly Grind',
          description: 'Complete 5 tasks this week',
          trigger: 'campaign_task_completed',
          category: 'CAMPAIGN',
          conditionField: 'stats.tasksCompleted',
          targetValue: 5,
          rewardPoints: 150,
          rewardXp: 300,
          active: true,
          period: 'WEEKLY',
          repeatable: true,
          priority: 90
        },
        {
          id: 'bring_a_friend',
          title: 'Bring a Friend',
          description: 'Refer one new user this week',
          trigger: 'referral_completed',
          category: 'REFERRAL',
          conditionField: 'stats.referralsCount',
          targetValue: 1,
          rewardPoints: 100,
          rewardXp: 200,
          active: true,
          period: 'WEEKLY',
          repeatable: true,
          priority: 85
        },
        {
          id: 'forecast_streak',
          title: 'Forecast Streak',
          description: 'Settle 3 predictions this week',
          trigger: 'prediction_completed',
          category: 'PREDICTION',
          conditionField: 'stats.predictionsCount',
          targetValue: 3,
          rewardPoints: 120,
          rewardXp: 250,
          active: true,
          period: 'WEEKLY',
          repeatable: true,
          priority: 80
        },
        {
          id: 'level_climber',
          title: 'Level Climber',
          description: 'Reach Level 5',
          trigger: 'level_up',
          category: 'LEVEL',
          conditionField: 'level',
          targetValue: 5,
          rewardPoints: 200,
          rewardXp: 500,
          active: true,
          period: 'ONCE',
          repeatable: false,
          priority: 75
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
