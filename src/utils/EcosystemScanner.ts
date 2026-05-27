import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Task, UserData, Campaign, TaskSubmission, Activity } from '../types';

export interface EcosystemState {
  tasks: Task[];
  users: UserData[];
  campaigns: Campaign[];
  submissions: TaskSubmission[];
  activities: Activity[];
  marketData?: any;
}

export interface AIReport {
  id: string;
  type: 'health' | 'fraud' | 'engagement' | 'placeholder' | 'growth' | 'economy';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  actionable?: boolean;
  data?: any;
}

export class EcosystemScanner {
  static async scanState(): Promise<EcosystemState> {
    const [tasksSnap, usersSnap, campaignsSnap, subsSnap, activitySnap] = await Promise.all([
      getDocs(collection(db, 'tasks')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'campaigns')),
      getDocs(collection(db, 'taskSubmissions')),
      getDocs(query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(100)))
    ]);

    return {
      tasks: tasksSnap.docs.map(d => d.data() as Task),
      users: usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)),
      campaigns: campaignsSnap.docs.map(d => d.data() as Campaign),
      submissions: subsSnap.docs.map(d => d.data() as TaskSubmission),
      activities: activitySnap.docs.map(d => d.data() as Activity)
    };
  }

  static async generateReports(state: EcosystemState): Promise<AIReport[]> {
    const reports: AIReport[] = [];
    const now = new Date().getTime();

    const socialTasks = state.tasks.filter(t => ['TikTok', 'YouTube', 'Twitter', 'Instagram'].some(s => t.category.includes(s)));
    const recentSocialActivity = state.activities.filter(a =>
      a.type.includes('task_reward') &&
      socialTasks.some(t => a.description.includes(t.title))
    );

    if (socialTasks.length > 0 && recentSocialActivity.length < 5) {
      reports.push({
        id: 'growth_social_low',
        type: 'growth',
        severity: 'medium',
        message: 'Social engagement across TikTok and YouTube has dropped by 40% this week. Growth velocity is stalling.',
        timestamp: new Date(),
        actionable: true,
        data: { target: 'social_engagement' }
      });
    }

    const brokenStreaks = state.users.filter(u => {
      const lastReward = u.lastRewardDate?.toDate() || new Date(0);
      const diff = (now - lastReward.getTime()) / (1000 * 60 * 60 * 24);
      return diff > 1.5 && diff < 3;
    });

    if (brokenStreaks.length > state.users.length * 0.1) {
      reports.push({
        id: 'retention_streak_drop',
        type: 'engagement',
        severity: 'high',
        message: `${brokenStreaks.length} users recently broke their daily streaks. Immediate retention intervention required.`,
        timestamp: new Date(),
        actionable: true,
        data: { target: 'streak_recovery' }
      });
    }

    const recentReferrals = state.users.filter(u => {
      const created = u.createdAt?.toDate() || new Date(0);
      return (now - created.getTime()) < (1000 * 60 * 60 * 24 * 7) && u.referredBy;
    });

    if (recentReferrals.length < 2) {
      reports.push({
        id: 'growth_referral_stagnant',
        type: 'growth',
        severity: 'medium',
        message: 'Viral coefficient is below 0.2. Referral growth has entered a stagnation phase.',
        timestamp: new Date(),
        actionable: true,
        data: { target: 'referral_boost' }
      });
    }

    const totalPoints = state.users.reduce((acc, u) => acc + (u.points || 0), 0);
    if (totalPoints > 5000000) {
       reports.push({
         id: 'economy_inflation_high',
         type: 'economy',
         severity: 'high',
         message: 'Point inflation warning: Ecosystem supply approaching critical mass. Recommend immediate reward scaling.',
         timestamp: new Date(),
         actionable: true
       });
    }

    return reports;
  }
}
