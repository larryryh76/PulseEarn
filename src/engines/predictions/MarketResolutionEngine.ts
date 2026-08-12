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

    // Fix #7: Map IDs to symbols for CryptoCompare fallback
    const SYMBOL_MAP: Record<string, string> = {
      'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL', 'binancecoin': 'BNB', 'ripple': 'XRP',
      'cardano': 'ADA', 'dogecoin': 'DOGE', 'the-open-network': 'TON', 'avalanche-2': 'AVAX', 'chainlink': 'LINK',
      'sui': 'SUI', 'tron': 'TRX', 'shiba-inu': 'SHIB', 'pepe': 'PEPE', 'litecoin': 'LTC',
      'polkadot': 'DOT', 'cosmos': 'ATOM', 'arbitrum': 'ARB', 'optimism': 'OP', 'near': 'NEAR'
    };

    // Process in smaller chunks to avoid URL length limits and 429s
    const CHUNK_SIZE = 10;
    for (let i = 0; i < assetIds.length; i += CHUNK_SIZE) {
      const chunk = assetIds.slice(i, i + CHUNK_SIZE);

      try {
        let prices: Record<string, any> = {};

        try {
          // Primary: CoinGecko
          const priceRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
            params: { ids: chunk.join(','), vs_currencies: 'usd' },
            timeout: 10000
          });
          prices = priceRes.data;
        } catch (cgError) {
          console.warn('[MarketResolver] CoinGecko failed, falling back to CryptoCompare...');
          // Fallback: CryptoCompare
          const symbols = chunk.map(id => SYMBOL_MAP[id]).filter(Boolean);
          if (symbols.length > 0) {
            const ccRes = await axios.get(`https://min-api.cryptocompare.com/data/pricemulti`, {
              params: { fsyms: symbols.join(','), tsyms: 'USD' }
            });
            // Map back to CoinGecko IDs
            chunk.forEach(id => {
              const sym = SYMBOL_MAP[id];
              if (ccRes.data[sym]) {
                prices[id] = { usd: ccRes.data[sym].USD };
              }
            });
          }
        }

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
