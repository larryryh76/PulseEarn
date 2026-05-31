import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { UserData, Transaction, Activity } from '../../types';

export interface DashboardSummary {
  balance: number;
  totalEarnings: number;
  weeklyEarnings: number;
  level: number;
  xp: number;
  streak: number;
  referrals: number;
  activePredictions: number;
  pendingRewards: number;
  recentActivities: Activity[];
}

export class DashboardEngine {
  /**
   * Aggregates verified backend data for the Command Center
   */
  static async getSummary(userData: UserData): Promise<DashboardSummary> {
    const userId = userData.uid;
    const now = new Date();
    const oneWeekAgo = new Timestamp(Math.floor((now.getTime() - 7 * 24 * 60 * 60 * 1000) / 1000), 0);

    // 1. Fetch Weekly Earnings via Transaction Aggregation
    // Note: Filtering on multiple range fields (timestamp and amount) requires a composite index.
    // We filter by timestamp in Firestore and by amount in memory to avoid the index requirement.
    const weeklyTxQuery = query(
      collection(db, 'users', userId, 'transactions'),
      where('timestamp', '>=', oneWeekAgo)
    );
    const weeklyTxSnap = await getDocs(weeklyTxQuery);
    let weeklyTotal = 0;
    weeklyTxSnap.forEach(doc => {
      const tx = doc.data() as Transaction;
      if (tx.amount > 0) {
        weeklyTotal += tx.amount;
      }
    });

    // 2. Count Active Predictions
    const activePredQuery = query(
      collection(db, 'predictions'),
      where('userId', '==', userId),
      where('status', '==', 'PENDING')
    );
    const activePredSnap = await getDocs(activePredQuery);

    // 3. Count Pending Reward Claims
    const pendingClaimsQuery = query(
      collection(db, 'task_claims'),
      where('userId', '==', userId),
      where('validationState', '==', 'PENDING')
    );
    const pendingClaimsSnap = await getDocs(pendingClaimsQuery);

    // 4. Fetch Activities
    const activityQuery = query(
      collection(db, 'users', userId, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const activitySnap = await getDocs(activityQuery);
    const activities = activitySnap.docs.map(d => ({ id: d.id, ...d.data() } as Activity));

    return {
      balance: userData.points,
      totalEarnings: userData.stats?.totalEarnings || 0,
      weeklyEarnings: weeklyTotal,
      level: userData.level,
      xp: userData.xp,
      streak: userData.streak,
      referrals: userData.stats?.referralsCount || 0,
      activePredictions: activePredSnap.size,
      pendingRewards: pendingClaimsSnap.size,
      recentActivities: activities
    };
  }
}
