import {
  db
} from '../firebase/config';
import {
  doc,
  increment,
  collection,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { Transaction } from '../types';

export const awardPoints = async (
  userId: string,
  amount: number,
  type: Transaction['type'],
  source: string
) => {
  const userRef = doc(db, 'users', userId);
  const transactionsRef = collection(db, 'users', userId, 'transactions');
  const settingsRef = doc(db, 'system', 'settings');

  try {
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const settingsSnap = await transaction.get(settingsRef);

      if (!userSnap.exists()) throw new Error("User does not exist");

      const userData = userSnap.data();
      const settings = settingsSnap.exists() ? settingsSnap.data() : { dailyPointsCap: 500 };

      // Check Daily Cap
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastRewardDate = userData.lastRewardDate?.toDate();
      const isNewDay = !lastRewardDate || lastRewardDate < today;

      let currentTodayPoints = isNewDay ? 0 : (userData.totalEarnedToday || 0);

      if (amount > 0 && currentTodayPoints + amount > settings.dailyPointsCap) {
        throw new Error(`Daily cap of ${settings.dailyPointsCap} reached`);
      }

      // Fraud Check: Actions per minute
      const now = Timestamp.now();
      const lastAction = userData.lastActionTimestamp;
      let actionsInLastMinute = userData.actionsInLastMinute || 0;

      if (lastAction && (now.seconds - lastAction.seconds) < 60) {
        actionsInLastMinute += 1;
      } else {
        actionsInLastMinute = 1;
      }

      // Fraud Check: Earned in last hour
      let earnedInLastHour = userData.earnedInLastHour || 0;
      const lastHourReset = userData.lastHourReset;
      if (lastHourReset && (now.seconds - lastHourReset.seconds) < 3600) {
        earnedInLastHour += amount;
      } else {
        earnedInLastHour = amount;
        transaction.update(userRef, { lastHourReset: now });
      }

      // Flagging logic
      let isFlagged = userData.isFlagged || false;
      let flagReason = userData.flagReason || "";

      if (actionsInLastMinute > 10) {
        isFlagged = true;
        flagReason = "Excessive actions per minute (>10)";
      } else if (earnedInLastHour > 1000) {
        isFlagged = true;
        flagReason = "High earnings in one hour (>1000)";
      }

      // Update User
      transaction.update(userRef, {
        points: increment(amount),
        totalEarnedToday: isNewDay ? amount : increment(amount),
        lastRewardDate: Timestamp.fromDate(today),
        lastActionTimestamp: now,
        actionsInLastMinute,
        earnedInLastHour,
        isFlagged,
        flagReason
      });

      // Add Transaction Entry
      const newTransaction = {
        userId,
        type,
        amount,
        source,
        timestamp: serverTimestamp()
      };

      const newTxRef = doc(transactionsRef);
      transaction.set(newTxRef, newTransaction);
    });

    return { success: true };
  } catch (error: any) {
    console.error("Economy Engine Error:", error);
    return { success: false, error: error.message };
  }
};
