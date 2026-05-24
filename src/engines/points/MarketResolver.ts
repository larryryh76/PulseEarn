import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { PointTransactionEngine } from './PointTransactionEngine';
import axios from 'axios';

export class MarketResolver {
  private static PRICE_API = 'https://api.coingecko.com/api/v3/simple/price';

  /**
   * Scans for pending predictions and resolves them against current market prices.
   */
  static async resolveAllPending() {
    console.log("[MarketResolver] Starting resolution cycle...");

    const predictionsRef = collection(db, 'predictions');
    const q = query(predictionsRef, where('status', '==', 'PENDING'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("[MarketResolver] No pending positions found.");
      return { resolved: 0 };
    }

    // 1. Map assets to resolve
    const assets = Array.from(new Set(snapshot.docs.map(d => d.data().assetId)));

    // 2. Fetch current prices
    try {
      const response = await axios.get(this.PRICE_API, {
        params: {
          ids: assets.join(','),
          vs_currencies: 'usd'
        }
      });
      const prices = response.data;

      let resolvedCount = 0;

      // 3. Process each prediction
      for (const predDoc of snapshot.docs) {
        const data = predDoc.data();
        const currentPrice = prices[data.assetId]?.usd;

        if (currentPrice === undefined) continue;

        const entryPrice = data.entryPrice;
        const direction = data.direction; // 'up' | 'down'
        const amount = data.amount;

        const isWin = direction === 'up'
          ? currentPrice > entryPrice
          : currentPrice < entryPrice;

        const payout = isWin ? Math.floor(amount * 1.85) : 0;
        const status = isWin ? 'won' : 'lost';

        // Update Prediction Record
        await updateDoc(doc(db, 'predictions', predDoc.id), {
          status,
          exitPrice: currentPrice,
          payout,
          resolvedAt: serverTimestamp()
        });

        // Award points if win
        if (isWin) {
          await PointTransactionEngine.execute({
            userId: data.userId,
            amount: payout,
            type: 'prediction_reward',
            source: `Market Win: ${data.symbol.toUpperCase()}`,
            description: `Correct price forecast resolution.`,
            xpReward: 100,
            metadata: {
              predictionId: predDoc.id,
              asset: data.symbol
            }
          });
        }

        // Send notification
        await addDoc(collection(db, 'users', data.userId, 'notifications'), {
          title: isWin ? 'Forecast Successful!' : 'Forecast Unsuccessful',
          description: isWin
            ? `Your ${data.symbol.toUpperCase()} position closed at $${currentPrice}. +${payout} PTS awarded.`
            : `Your ${data.symbol.toUpperCase()} position closed at $${currentPrice}. Better luck next time.`,
          type: 'prediction_result',
          read: false,
          timestamp: serverTimestamp()
        });

        resolvedCount++;
      }

      return { resolved: resolvedCount };
    } catch (error) {
      console.error("[MarketResolver] API Error:", error);
      throw error;
    }
  }
}
