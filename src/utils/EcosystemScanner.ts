import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Task, UserData, Campaign, TaskSubmission } from '../types';

export interface EcosystemState {
  tasks: Task[];
  users: UserData[];
  campaigns: Campaign[];
  submissions: TaskSubmission[];
  marketData?: any;
}

export interface AIReport {
  type: 'health' | 'fraud' | 'engagement' | 'placeholder' | 'ux';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: Date;
  actionable?: boolean;
}

export class EcosystemScanner {
  static async scanState(): Promise<EcosystemState> {
    const [tasksSnap, usersSnap, campaignsSnap, subsSnap] = await Promise.all([
      getDocs(collection(db, 'tasks')),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'campaigns')),
      getDocs(collection(db, 'taskSubmissions'))
    ]);

    return {
      tasks: tasksSnap.docs.map(d => d.data() as Task),
      users: usersSnap.docs.map(d => d.data() as UserData),
      campaigns: campaignsSnap.docs.map(d => d.data() as Campaign),
      submissions: subsSnap.docs.map(d => d.data() as TaskSubmission)
    };
  }

  static async generateReports(state: EcosystemState): Promise<AIReport[]> {
    const reports: AIReport[] = [];

    // 1. Placeholder Detection
    const mockTasks = state.tasks.filter(t => t.description.toLowerCase().includes('placeholder') || t.title.toLowerCase().includes('placeholder'));
    if (mockTasks.length > 0) {
      reports.push({
        type: 'placeholder',
        severity: 'high',
        message: `${mockTasks.length} tasks detected with placeholder descriptions. System integrity compromised.`,
        timestamp: new Date(),
        actionable: true
      });
    }

    // 2. Engagement Analysis
    const inactiveUsers = state.users.filter(u => {
      const lastAction = u.lastActionTimestamp?.toDate() || new Date(0);
      return (new Date().getTime() - lastAction.getTime()) > (1000 * 60 * 60 * 24 * 7);
    });
    if (state.users.length > 0 && inactiveUsers.length / state.users.length > 0.3) {
      reports.push({
        type: 'engagement',
        severity: 'medium',
        message: `Churn risk: ${Math.round((inactiveUsers.length / state.users.length) * 100)}% of users have been inactive for > 7 days.`,
        timestamp: new Date(),
        actionable: true
      });
    }

    // 3. Economy Health
    const totalPoints = state.users.reduce((acc, u) => acc + (u.points || 0), 0);
    if (totalPoints > 1000000) {
      reports.push({
        type: 'health',
        severity: 'low',
        message: 'Point inflation warning: Total ecosystem supply exceeded 1M points. Consider increasing task difficulty.',
        timestamp: new Date(),
      });
    }

    // 4. Fraud Monitoring
    const pendingSubs = state.submissions.filter(s => s.status === 'pending');
    if (pendingSubs.length > 50) {
      reports.push({
        type: 'fraud',
        severity: 'high',
        message: `High risk: ${pendingSubs.length} task submissions pending. Possible automated spam attack detected.`,
        timestamp: new Date(),
        actionable: true
      });
    }

    return reports;
  }
}
