import { db } from '../../firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { PointTransactionEngine } from './PointTransactionEngine';
import axios from 'axios';

export class MarketResolver {
  private static PRICE_API = 'https://api.coingecko.com/api/v3/simple/price';

  /**
   * Scans for pending predictions and resolves them against current market prices.
   * Utilizes the atomic resolution pipeline in PointTransactionEngine.
   */
  static async resolveAllPending() {
    console.log("[MarketResolver] Starting resolution cycle...");

    const predictionsRef = collection(db, 'user_predictions');
    const q = query(predictionsRef, where('status', '==', 'ACTIVE'), limit(50));
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

      // 3. Process each prediction using the atomic engine
      for (const predDoc of snapshot.docs) {
        const data = predDoc.data();
        const currentPrice = prices[data.assetId]?.usd;

        if (currentPrice === undefined) continue;

        try {
           // Find related campaign to get reward pool
           const campaignSnap = await getDoc(doc(db, 'campaigns', data.taskId));
           const rewardPool = campaignSnap.exists() ? campaignSnap.data().totalPrizePool : 1000;

           await PointTransactionEngine.resolvePrediction(predDoc.id, currentPrice, rewardPool);
           resolvedCount++;
        } catch (err: any) {
           console.error(`[MarketResolver] Atomic resolution failed for ${predDoc.id}:`, err.message);
        }
      }

      return { resolved: resolvedCount };
    } catch (error) {
      console.error("[MarketResolver] Market Data API Error:", error);
      throw error;
    }
  }
}
