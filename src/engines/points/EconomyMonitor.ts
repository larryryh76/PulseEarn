import { db } from '../../firebase/config';
import {
  collection,
  getDocs
} from 'firebase/firestore';

export class EconomyMonitor {
  /**
   * Analyzes the overall health of the ecosystem's point economy.
   */
  static async getEcosystemSnapshot() {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    let totalCirculation = 0;
    let totalUsers = 0;
    let flaggedUsers = 0;

    usersSnap.forEach(doc => {
      const data = doc.data();
      totalCirculation += (data.points || 0);
      totalUsers++;
      if (data.isFlagged) flaggedUsers++;
    });

    // Calculate Earning Velocity (last 24h transactions)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Note: To get total 24h volume efficiently, we'd ideally aggregate this on the backend.
    // For now, we simulate the logic based on the users' daily earned stats.
    let velocity24h = 0;
    usersSnap.forEach(doc => {
        velocity24h += (doc.data().totalEarnedToday || 0);
    });

    return {
      totalCirculation,
      totalUsers,
      flaggedUsers,
      velocity24h,
      averageBalance: totalUsers > 0 ? totalCirculation / totalUsers : 0,
      timestamp: new Date()
    };
  }
}
