import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Task, UserData } from '../types';

/**
 * EcosystemBot: An autonomous layer supervising the platform growth and engagement.
 */
export class EcosystemBot {

  /**
   * Evaluates a user and triggers retention/engagement missions.
   */
  static async evaluateUserEngagement(user: UserData) {
    if (user.role === 'admin') return;

    const now = new Date();
    const lastAction = user.lastActionTimestamp?.toDate() || new Date(0);
    const daysSinceAction = (now.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24);

    // 1. COMEBACK MISSION for inactive users (> 3 days)
    if (daysSinceAction > 3) {
      await this.triggerSpecialMission(user.uid, 'comeback_bonus', {
        title: 'Return of the Node',
        description: 'The protocol missed your presence. Claim this one-time comeback bonus.',
        rewardPoints: 200,
        rewardXp: 500,
        type: 'once',
        category: 'Retention'
      });
    }

    // 2. STREAK PRESERVATION (if last login was yesterday but not today)
    // Managed in AuthContext usually, but EcoBot can trigger a "Streak Save" quest.
  }

  /**
   * Rotates featured tasks based on performance or system priority.
   */
  static async rotateFeaturedCampaigns() {
    try {
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('active', '==', true));
      const snapshot = await getDocs(q);

      const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task));

      // Select 3 random high-reward tasks to feature
      const sorted = tasks.sort((a, b) => b.rewardPoints - a.rewardPoints);
      const toFeature = sorted.slice(0, 3);

      for (const task of tasks) {
        const isFeatured = toFeature.some(t => t.id === task.id);
        if (task.isFeatured !== isFeatured) {
          await updateDoc(doc(db, 'tasks', task.id), { isFeatured });
        }
      }

      console.log("EcoBot: Rotated featured missions.");
    } catch (e) {
      console.error("EcoBot rotation failed:", e);
    }
  }

  /**
   * Triggers a specific mission for a user.
   */
  private static async triggerSpecialMission(uid: string, missionKey: string, taskData: Partial<Task>) {
    // Check if user already has this triggered
    const userTasksRef = collection(db, 'users', uid, 'userTasks');
    const q = query(userTasksRef, where('taskId', '==', missionKey));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Add the task to global tasks if it doesn't exist, or just assign it locally.
      // For simplicity, we'll ensure it exists in global tasks with a hidden flag.
      const globalTaskRef = doc(db, 'tasks', missionKey);
      await runTransaction(db, async (transaction) => {
        transaction.set(globalTaskRef, {
          ...taskData,
          id: missionKey,
          active: true,
          verificationType: 'automated',
          createdAt: serverTimestamp(),
          isPersonal: true // Bot-generated personal quest
        }, { merge: true });
      });

      // Send notification
      await addDoc(collection(db, 'users', uid, 'notifications'), {
         title: 'Special Quest Unlocked!',
         description: taskData.title,
         type: 'system',
         read: false,
         timestamp: serverTimestamp()
      });
    }
  }

  /**
   * Performs daily system health checks and economy balancing.
   */
  static async runDailyOps() {
    await this.rotateFeaturedCampaigns();
    // In a real app, this would be a Cloud Function.
    // Here we simulate it on admin login or periodic trigger.
  }
}
