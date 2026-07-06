import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PointTransactionEngine } from '../points/PointTransactionEngine';
import axios from 'axios';

const SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL', 'binancecoin': 'BNB', 'ripple': 'XRP',
  'cardano': 'ADA', 'dogecoin': 'DOGE', 'the-open-network': 'TON', 'avalanche-2': 'AVAX', 'chainlink': 'LINK',
  'sui': 'SUI', 'tron': 'TRX', 'shiba-inu': 'SHIB', 'pepe': 'PEPE', 'litecoin': 'LTC',
  'polkadot': 'DOT', 'cosmos': 'ATOM', 'arbitrum': 'ARB', 'optimism': 'OP', 'near': 'NEAR'
};

/**
 * Fetch the authoritative settlement price for a single asset.
 * Uses the same 4-tier keyless fallback chain as the backend so a single provider
 * outage (e.g. CoinGecko 429) never blocks settlement.
 * Returns null — never a fabricated value — when ALL sources fail.
 */
async function fetchSettlementPrice(assetId: string): Promise<number | null> {
  const sym = SYMBOL_MAP[assetId];

  const valid = (p: unknown): p is number =>
    p != null && typeof p === 'number' && isFinite(p) && p > 0;

  // Tier 1: CoinGecko
  try {
    const res = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: { ids: assetId, vs_currencies: 'usd' },
      timeout: 10000,
    });
    const price = res.data?.[assetId]?.usd;
    if (valid(price)) return price;
  } catch { /* fall through */ }

  if (!sym) return null;

  // Tier 2: Coinbase Exchange (reliable, keyless)
  try {
    const res = await axios.get(`https://api.exchange.coinbase.com/products/${sym}-USD/stats`, { timeout: 10000 });
    const price = parseFloat(res.data?.last);
    if (valid(price)) return price;
  } catch { /* fall through */ }

  // Tier 3: Kraken (reliable, keyless)
  try {
    const ksym = sym === 'BTC' ? 'XBT' : sym;
    const res = await axios.get('https://api.kraken.com/0/public/Ticker', {
      params: { pair: `${ksym}USD` },
      timeout: 10000,
    });
    const result = res.data?.result ?? {};
    const first = Object.values(result)[0] as any;
    const price = parseFloat(first?.c?.[0]);
    if (valid(price)) return price;
  } catch { /* fall through */ }

  // Tier 4: CryptoCompare (last resort — needs a key on some plans)
  try {
    const res = await axios.get('https://min-api.cryptocompare.com/data/price', {
      params: { fsym: sym, tsyms: 'USD' },
      timeout: 10000,
    });
    const price = res.data?.USD;
    if (valid(price)) return price;
  } catch { /* fall through */ }

  console.warn(`[MarketResolver] All price sources failed for ${assetId}`);
  return null;
}

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

    // Group by assetId to fetch each asset price only once.
    const groupedByAsset: Record<string, any[]> = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      const assetId = data.assetId;
      if (!groupedByAsset[assetId]) groupedByAsset[assetId] = [];
      groupedByAsset[assetId].push({ id: doc.id, ...data });
    });

    const assetIds = Object.keys(groupedByAsset);
    if (assetIds.length === 0) return { resolved: 0, failed: 0 };

    for (const assetId of assetIds) {
      const currentPrice = await fetchSettlementPrice(assetId);

      if (currentPrice === null) {
        console.warn(`[MarketResolver] No price data for ${assetId} — skipping ${groupedByAsset[assetId].length} prediction(s)`);
        failed += groupedByAsset[assetId].length;
        continue;
      }

      for (const pred of groupedByAsset[assetId]) {
        const createdAt = pred.createdAt?.toDate?.() || new Date();
        const isExpired = Date.now() - createdAt.getTime() > 24 * 60 * 60 * 1000;

        if (isExpired || pred.id.startsWith('auto_')) {
          try {
            await PointTransactionEngine.resolvePrediction(pred.id);
            resolved++;
          } catch (err: any) {
            if (err.message === 'PREDICTION_ALREADY_RESOLVED') continue;
            console.error(`[MarketResolver] Failed prediction ${pred.id}:`, err.message);
            failed++;
          }
        }
      }

      // Brief pause between assets to stay within provider rate limits.
      await new Promise(r => setTimeout(r, 300));
    }

    return { resolved, failed };
  }
}
