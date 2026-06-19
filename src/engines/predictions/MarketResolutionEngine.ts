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

    // Process in smaller chunks to avoid URL length limits and 429s
    const CHUNK_SIZE = 10;
    for (let i = 0; i < assetIds.length; i += CHUNK_SIZE) {
      const chunk = assetIds.slice(i, i + CHUNK_SIZE);

      try {
        // Batch fetch prices for the current chunk
        const priceRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          params: { ids: chunk.join(','), vs_currencies: 'usd' },
          timeout: 10000
        });
        const prices = priceRes.data;

        for (const assetId of chunk) {
          const currentPrice = prices[assetId]?.usd;
          if (currentPrice === undefined || currentPrice === null) {
            console.warn(`[MarketResolver] No price data for ${assetId}`);
            failed += groupedByAsset[assetId].length;
            continue;
          }

          for (const pred of groupedByAsset[assetId]) {
            const createdAt = pred.createdAt?.toDate?.() || new Date();
            const now = new Date();
            // Resolve anything older than 24h or those marked for auto resolution
            const isExpired = (now.getTime() - createdAt.getTime()) > (24 * 60 * 60 * 1000);

            if (isExpired || pred.id.startsWith('auto_')) {
              try {
                // Diagnostic: Force reconciliation for predictions stuck since June 17
                const createdAtDate = pred.createdAt?.toDate?.() || new Date();
                const isHistoricalStuck = createdAtDate.getTime() < new Date('2026-06-20').getTime();

                if (isHistoricalStuck) {
                   console.log(`[MarketResolver] Reconciling historical prediction: ${pred.id} (${createdAtDate.toISOString()})`);
                }

                // Secondary safety: resolvePrediction is atomic and handles 'ALREADY_RESOLVED' internally
                await PointTransactionEngine.resolvePrediction(pred.id, currentPrice);
                resolved++;
              } catch (err: any) {
                // Silently skip already resolved to avoid polluting logs
                if (err.message === 'PREDICTION_ALREADY_RESOLVED') {
                  continue;
                }
                console.error(`[MarketResolver] Failed prediction ${pred.id}:`, err.message);
                failed++;
              }
            }
          }
        }

        // Brief pause between chunks if there are many, to respect Coingecko rate limits
        if (assetIds.length > CHUNK_SIZE) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (err: any) {
        console.error(`[MarketResolver] API Chunk Failure (${chunk.join(',')}):`, err.message);
        // Mark all predictions in this chunk as failed for this run
        chunk.forEach(id => failed += groupedByAsset[id].length);
      }
    }

    return { resolved, failed };
  }
}
