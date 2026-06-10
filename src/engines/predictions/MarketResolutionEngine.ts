import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PointTransactionEngine } from '../points/PointTransactionEngine';
import axios from 'axios';

export class MarketResolutionEngine {
  /**
   * Scans for expired predictions and resolves them using live market data.
   * This is designed to be called by an Admin or a background function.
   */
  static async resolveExpiredPredictions(): Promise<{ resolved: number; failed: number }> {
    const predictionsRef = collection(db, 'user_predictions');
    // For "Core" automated predictions, we use a 24h cycle from creation for now
    // In a production environment, this would target specific cycle timestamps (e.g. daily close)
    const q = query(predictionsRef, where('status', '==', 'ACTIVE'));
    const snap = await getDocs(q);

    let resolved = 0;
    let failed = 0;

    // Group predictions by assetId to batch API calls
    const groupedByAsset: Record<string, any[]> = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      const assetId = data.assetId;
      if (!groupedByAsset[assetId]) groupedByAsset[assetId] = [];
      groupedByAsset[assetId].push({ id: doc.id, ...data });
    });

    const assetIds = Object.keys(groupedByAsset);
    if (assetIds.length === 0) return { resolved: 0, failed: 0 };

    try {
      // Batch fetch prices for all unique assets
      const priceRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
        params: { ids: assetIds.join(','), vs_currencies: 'usd' }
      });
      const prices = priceRes.data;

      for (const assetId of assetIds) {
        const currentPrice = prices[assetId]?.usd;
        if (!currentPrice) continue;

        for (const pred of groupedByAsset[assetId]) {
          const createdAt = pred.createdAt?.toDate?.() || new Date();
          const now = new Date();
          const isExpired = (now.getTime() - createdAt.getTime()) > (24 * 60 * 60 * 1000);

          if (isExpired || pred.id.startsWith('auto_')) {
            try {
              await PointTransactionEngine.resolvePrediction(pred.id, currentPrice);
              resolved++;
            } catch (err) {
              console.error(`Failed to resolve prediction ${pred.id}:`, err);
              failed++;
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch batch prices for resolution:", err);
      return { resolved: 0, failed: snap.docs.length };
    }

    return { resolved, failed };
  }
}
