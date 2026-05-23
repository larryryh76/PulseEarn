import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Task, Campaign, TaskRarity, TaskDifficulty, UserData } from '../types';
import { AIReport } from './EcosystemScanner';

export interface BotStrategy {
  id: string;
  title: string;
  description: string;
  actionType: 'campaign' | 'task_rotation' | 'economy_adjustment';
  suggestedTasks?: Partial<Task>[];
  suggestedCampaign?: Partial<Campaign>;
  reasoning: string;
}

export class EcosystemBot {

  /**
   * Evaluates a user and triggers retention/engagement missions.
   */
  static async evaluateUserEngagement(user: UserData) {
    if (user.role === 'admin') return;

    const now = new Date();
    const lastAction = user.lastActionTimestamp?.toDate() || new Date(0);
    const daysSinceAction = (now.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceAction > 3) {
      const missionKey = `comeback_${user.uid.slice(0,5)}`;
      const userTasksRef = collection(db, 'users', user.uid, 'userTasks');
      const q = query(userTasksRef, where('taskId', '==', missionKey));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const globalTaskRef = doc(db, 'tasks', missionKey);
        await runTransaction(db, async (transaction) => {
          transaction.set(globalTaskRef, {
            title: 'Re-Engagement Bonus',
            description: 'We missed you! Claim this one-time reward to get back into the action.',
            rewardPoints: 200,
            rewardXp: 500,
            type: 'once',
            category: 'Retention',
            id: missionKey,
            active: true,
            verificationType: 'automated',
            createdAt: serverTimestamp()
          }, { merge: true });
        });

        await addDoc(collection(db, 'users', user.uid, 'notifications'), {
           title: 'Special Quest Unlocked!',
           description: 'Claim your comeback bonus now.',
           type: 'system',
           read: false,
           timestamp: serverTimestamp()
        });
      }
    }
  }

  static generateStrategy(report: AIReport): BotStrategy {
    switch (report.id) {
      case 'growth_social_low':
        return {
          id: 'strategy_social_boost',
          title: 'Social Engagement Surge',
          description: 'Launch a high-intensity TikTok & YouTube engagement campaign.',
          actionType: 'campaign',
          reasoning: 'Real-time metrics indicate a 40% drop in social interactions. This campaign aims to restore viral growth velocity.',
          suggestedTasks: [
            {
              title: 'TikTok Community Interaction',
              description: 'Engage with our latest social content to boost platform visibility.',
              rewardPoints: 450,
              rewardXp: 800,
              category: 'TikTok',
              verificationType: 'proof',
              proofRequirements: 'Submit your TikTok handle for verification.'
            },
            {
              title: 'YouTube Insight Session',
              description: 'Watch our latest feature overview to earn bonus points.',
              rewardPoints: 300,
              rewardXp: 500,
              category: 'YouTube',
              verificationType: 'timer',
              duration: 360
            },
            {
              title: 'Discord Community Raid',
              description: 'Join the community raid on the official Discord and reach Level 1.',
              rewardPoints: 600,
              rewardXp: 1200,
              category: 'Discord',
              verificationType: 'manual'
            }
          ],
          suggestedCampaign: {
            name: 'Social Velocity Week',
            description: 'Maximize ecosystem reach through distributed social actions.',
            bannerUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=2574&auto=format&fit=crop',
            featured: true
          }
        };

      case 'retention_streak_drop':
        return {
          id: 'strategy_streak_recovery',
          title: 'Loyalty Recovery Strategy',
          description: 'Deploy retention-focused quests to recover inactive users.',
          actionType: 'task_rotation',
          reasoning: `Analysis shows ${report.data?.count || 'many'} users recently lost their streaks. This strategy focuses on re-establishing daily habits.`,
          suggestedTasks: [
            {
              title: 'Streak Recovery Quest',
              description: 'Complete 3 daily check-ins to unlock a massive loyalty bonus.',
              rewardPoints: 1000,
              rewardXp: 2000,
              category: 'Engagement',
              type: 'streak',
              difficulty: 'medium' as TaskDifficulty,
              rarity: 'legendary' as TaskRarity
            },
            {
              title: 'Daily Morning Bonus',
              description: 'Complete your first task before 10:00 AM UTC for extra rewards.',
              rewardPoints: 150,
              rewardXp: 300,
              category: 'Engagement',
              type: 'daily',
              difficulty: 'easy' as TaskDifficulty
            }
          ]
        };

      case 'growth_referral_stagnant':
        return {
          id: 'strategy_referral_race',
          title: 'Referral Sprint Event',
          description: 'Initiate a 48-hour referral race with boosted bonuses.',
          actionType: 'campaign',
          reasoning: 'Viral growth coefficient is below target. Boosting referral utility to re-accelerate ecosystem expansion.',
          suggestedCampaign: {
            name: 'Pulse Referral Race',
            description: 'Top inviters share a 50,000 PTS prize pool. Every successful referral earns bonus XP.',
            bannerUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2574&auto=format&fit=crop',
            totalPrizePool: 50000,
            featured: true
          },
          suggestedTasks: [
            {
              title: 'Referral Challenge',
              description: 'Invite 3 new active members to the platform.',
              rewardPoints: 1500,
              rewardXp: 3000,
              category: 'Referral',
              type: 'referral'
            }
          ]
        };

      case 'economy_inflation_high':
        return {
          id: 'strategy_economy_rebalance',
          title: 'Economy Stabilization Strategy',
          description: 'Adjust reward weights and introduce point-sink mystery quests.',
          actionType: 'economy_adjustment',
          reasoning: 'Ecosystem supply is exceeding safe thresholds. Introduce mystery quests with variable yields to stabilize inflation.',
          suggestedTasks: [
            {
              title: 'The Mystery Terminal',
              description: 'Spend 100 PTS for a chance to win up to 5,000 PTS or exclusive XP multipliers.',
              rewardPoints: 5000,
              rewardXp: 5000,
              category: 'Mystery',
              type: 'premium',
              rarity: 'mythic' as TaskRarity
            }
          ]
        };

      default:
        return {
          id: 'strategy_general_refresh',
          title: 'Ecosystem Maintenance',
          description: 'Rotate low-performing tasks to maintain interest.',
          actionType: 'task_rotation',
          reasoning: 'Standard operational maintenance to prevent engagement decay.'
        };
    }
  }

  static async executeStrategy(strategy: BotStrategy) {
    const batch = writeBatch(db);

    if (strategy.actionType === 'campaign' && strategy.suggestedCampaign) {
      const campaignRef = doc(collection(db, 'campaigns'));
      const campaignId = campaignRef.id;

      batch.set(campaignRef, {
        ...strategy.suggestedCampaign,
        id: campaignId,
        active: true,
        createdAt: serverTimestamp(),
        startDate: serverTimestamp(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        taskIds: []
      });

      if (strategy.suggestedTasks) {
        for (const taskData of strategy.suggestedTasks) {
          const taskRef = doc(collection(db, 'tasks'));
          batch.set(taskRef, {
            ...taskData,
            id: taskRef.id,
            campaignId: campaignId,
            active: true,
            createdAt: serverTimestamp(),
            rarity: taskData.rarity || 'rare',
            difficulty: taskData.difficulty || 'medium',
            verificationType: taskData.verificationType || 'automated'
          });
        }
      }
    } else if (strategy.actionType === 'task_rotation' && strategy.suggestedTasks) {
      for (const taskData of strategy.suggestedTasks) {
        const taskRef = doc(collection(db, 'tasks'));
        batch.set(taskRef, {
          ...taskData,
          id: taskRef.id,
          active: true,
          createdAt: serverTimestamp(),
          rarity: taskData.rarity || 'uncommon',
          difficulty: taskData.difficulty || 'easy',
          verificationType: taskData.verificationType || 'automated'
        });
      }
    } else if (strategy.actionType === 'economy_adjustment' && strategy.suggestedTasks) {
       for (const taskData of strategy.suggestedTasks) {
        const taskRef = doc(collection(db, 'tasks'));
        batch.set(taskRef, {
          ...taskData,
          id: taskRef.id,
          active: true,
          createdAt: serverTimestamp(),
          isFeatured: true,
          verificationType: 'activity'
        });
      }
    }

    await batch.commit();
  }
}
