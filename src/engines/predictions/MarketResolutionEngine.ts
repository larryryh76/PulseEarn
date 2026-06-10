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

    for (const doc of snap.docs) {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || new Date();
      const now = new Date();

      // Check if prediction is at least 24h old (temporary logic for automation)
      const isExpired = (now.getTime() - createdAt.getTime()) > (24 * 60 * 60 * 1000);

      if (isExpired || data.id.startsWith('auto_')) { // auto_ are resolved faster for testing or at cycle ends
         try {
            // Fetch Current Price for Settlement
            const priceRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
               params: { ids: data.assetId, vs_currencies: 'usd' }
            });

            const currentPrice = priceRes.data[data.assetId]?.usd;
            if (currentPrice) {
               await PointTransactionEngine.resolvePrediction(doc.id, currentPrice);
               resolved++;
            }
         } catch (err) {
            console.error(`Failed to resolve prediction ${doc.id}:`, err);
            failed++;
         }
      }
    }

    return { resolved, failed };
  }
}
