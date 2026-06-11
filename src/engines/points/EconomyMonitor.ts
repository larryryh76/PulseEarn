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
