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
            title: 'Return of the Node',
            description: 'The protocol missed your presence. Claim this one-time comeback bonus.',
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
          title: 'Viral engagement Surge',
          description: 'Launch a high-intensity TikTok & YouTube engagement campaign.',
          actionType: 'campaign',
          reasoning: 'Compensate for current engagement drop by incentivizing social interactions with high-yield short-term rewards.',
          suggestedTasks: [
            {
              title: 'TikTok Viral Interaction',
              description: 'Like and comment on the latest PulseEarn ecosystem videos.',
              rewardPoints: 450,
              rewardXp: 800,
              category: 'TikTok',
              verificationType: 'proof',
              proofRequirements: 'Submit your TikTok handle and video URL for node verification.'
            },
            {
              title: 'YouTube Ecosystem Watch',
              description: 'Watch the latest PulseEarn orientation video (6 mins).',
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
          title: 'Loyalty Restoration Protocol',
          description: 'Deploy "Streak Shield" mystery quests to recover inactive users.',
          actionType: 'task_rotation',
          reasoning: report.message,
          suggestedTasks: [
            {
              title: 'Streak Shield Activation',
              description: 'Login 3 days in a row to restore your broken streak and earn a massive bonus.',
              rewardPoints: 1000,
              rewardXp: 2000,
              category: 'Engagement',
              type: 'streak',
              difficulty: 'medium' as TaskDifficulty,
              rarity: 'legendary' as TaskRarity
            },
            {
              title: 'Morning Pulse Check',
              description: 'Verify your node presence between 06:00 and 10:00 UTC.',
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
          title: 'Node Expansion Competition',
          description: 'Initiate a 48-hour referral race with doubled bonuses.',
          actionType: 'campaign',
          reasoning: 'Re-ignite viral growth by increasing the marginal utility of each successful referral.',
          suggestedCampaign: {
            name: 'Referral Alpha Race',
            description: 'Top 10 inviters share a 50,000 PTS prize pool. Every referral counts for 2x points.',
            bannerUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=2574&auto=format&fit=crop',
            totalPrizePool: 50000,
            featured: true
          },
          suggestedTasks: [
            {
              title: 'Invite 3 Elite Nodes',
              description: 'Onboard 3 new users to the ecosystem.',
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
          title: 'Economy Stabilization Protocol',
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
