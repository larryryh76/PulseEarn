import { useState, useEffect } from 'react';
import axios from 'axios';

export interface CryptoMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
}

export interface GlobalMarketData {
  total_market_cap: { [key: string]: number };
  total_volume: { [key: string]: number };
  market_cap_percentage: { [key: string]: number };
  market_cap_change_percentage_24h_usd: number;
}

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const CRYPTOCOMPARE_BASE_URL = 'https://min-api.cryptocompare.com/data';

const SYMBOL_MAP: Record<string, string> = {
  'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL', 'binancecoin': 'BNB', 'ripple': 'XRP',
  'cardano': 'ADA', 'dogecoin': 'DOGE', 'the-open-network': 'TON', 'avalanche-2': 'AVAX', 'chainlink': 'LINK',
  'sui': 'SUI', 'tron': 'TRX', 'shiba-inu': 'SHIB', 'pepe': 'PEPE', 'litecoin': 'LTC',
  'polkadot': 'DOT', 'cosmos': 'ATOM', 'arbitrum': 'ARB', 'optimism': 'OP', 'near': 'NEAR'
};

// Display names for assets, used when a price-only provider (exchange APIs) is the
// source and CoinGecko's rich metadata is unavailable.
const ASSET_NAME_MAP: Record<string, string> = {
  'bitcoin': 'Bitcoin', 'ethereum': 'Ethereum', 'solana': 'Solana', 'binancecoin': 'BNB', 'ripple': 'XRP',
  'cardano': 'Cardano', 'dogecoin': 'Dogecoin', 'the-open-network': 'Toncoin', 'avalanche-2': 'Avalanche', 'chainlink': 'Chainlink',
  'sui': 'Sui', 'tron': 'TRON', 'shiba-inu': 'Shiba Inu', 'pepe': 'Pepe', 'litecoin': 'Litecoin',
  'polkadot': 'Polkadot', 'cosmos': 'Cosmos', 'arbitrum': 'Arbitrum', 'optimism': 'Optimism', 'near': 'NEAR'
};

// Keyless coin icon CDN, keyed by lowercase symbol.
const iconFor = (sym: string) => `https://assets.coincap.io/assets/icons/${sym.toLowerCase()}@2x.png`;

// Reliable, keyless exchange endpoint. Returns last trade + 24h open per product.
const COINBASE_EXCHANGE_URL = 'https://api.exchange.coinbase.com';

type CryptoSource = 'coingecko' | 'coinbase' | 'cryptocompare';

// A price is considered stale once it is older than this. The feed refreshes every
// 60s, so 90s means a single missed cycle (plus buffer) flags the data as stale. A
// prediction platform must never present stale prices as live, so consumers use this
// to gate rendering and staking.
export const PRICE_STALE_MS = 90_000;

// Memory cache for market data to prevent redundant fetches and layout shifts
let cache: {
  market: CryptoMarketData[];
  global: GlobalMarketData | null;
  timestamp: number;
} = { market: [], global: null, timestamp: 0 };

export const useCryptoData = () => {
  const [marketData, setMarketData] = useState<CryptoMarketData[]>(cache.market);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(cache.global);
  const [loading, setLoading] = useState(cache.market.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<CryptoSource>('coingecko');
  // Timestamp of the last SUCCESSFUL fetch (0 = never loaded). Authoritative freshness signal.
  const [lastUpdated, setLastUpdated] = useState<number>(cache.timestamp);
  // Ticks every 30s so `isStale` recomputes even while fetches are failing.
  const [, setFreshnessTick] = useState(0);

  // Reliable, keyless fallback using Coinbase Exchange per-product stats. Provides the
  // authoritative last trade price and 24h open (for change %). Names/icons come from
  // the static registry since exchanges don't return metadata. Partial failures are
  // tolerated (allSettled) but if NO product resolves we throw so the next tier runs.
  const fetchFromCoinbase = async () => {
    const entries = Object.entries(SYMBOL_MAP);
    const results = await Promise.allSettled(
      entries.map(([, sym]) =>
        axios.get(`${COINBASE_EXCHANGE_URL}/products/${sym}-USD/stats`, { timeout: 8000 }),
      ),
    );

    const mapped: CryptoMarketData[] = [];
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      const [id, sym] = entries[i];
      const last = parseFloat(r.value.data?.last);
      const open = parseFloat(r.value.data?.open);
      if (!Number.isFinite(last) || last <= 0) return;
      mapped.push({
        id,
        symbol: sym.toLowerCase(),
        name: ASSET_NAME_MAP[id] || id,
        image: iconFor(sym),
        current_price: last,
        market_cap: 0,
        market_cap_rank: 0,
        price_change_percentage_24h: Number.isFinite(open) && open > 0 ? ((last - open) / open) * 100 : 0,
        total_volume: parseFloat(r.value.data?.volume) || 0,
      });
    });

    if (mapped.length === 0) throw new Error('Coinbase returned no valid prices');

    setMarketData(mapped);
    setSource('coinbase');
    cache = { ...cache, market: mapped, timestamp: Date.now() };
    setLastUpdated(cache.timestamp);
  };

  const fetchFromCryptoCompare = async () => {
    const symbols = Object.values(SYMBOL_MAP).join(',');
    const res = await axios.get(`${CRYPTOCOMPARE_BASE_URL}/pricemultifull`, {
      params: { fsyms: symbols, tsyms: 'USD' }
    });

    const raw = res.data.RAW;
    const mapped: CryptoMarketData[] = Object.entries(SYMBOL_MAP).map(([id, sym]) => {
      const data = raw[sym]?.USD;
      return {
        id,
        symbol: sym.toLowerCase(),
        name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '),
        image: `https://static.cryptocompare.com/api/data/compound-v2/coin/snapshot/?symbol=${sym}`,
        current_price: data?.PRICE || 0,
        market_cap: data?.MKTCAP || 0,
        market_cap_rank: 0,
        price_change_percentage_24h: data?.CHANGEPCT24HOUR || 0,
        total_volume: data?.TOTALVOLUME24H || 0
      };
    });

    setMarketData(mapped);
    setSource('cryptocompare');
    cache = { ...cache, market: mapped, timestamp: Date.now() };
    setLastUpdated(cache.timestamp);
  };

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const ids = Object.keys(SYMBOL_MAP).join(',');

      try {
        const [marketRes, globalRes] = await Promise.all([
          axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
            params: {
              vs_currency: 'usd',
              ids,
              order: 'market_cap_desc',
              sparkline: false,
              price_change_percentage: '24h'
            },
            timeout: 8000
          }),
          axios.get(`${COINGECKO_BASE_URL}/global`, { timeout: 8000 })
        ]);

        setMarketData(marketRes.data);
        setGlobalData(globalRes.data.data);

        // Update Cache
        cache = {
          market: marketRes.data,
          global: globalRes.data.data,
          timestamp: Date.now()
        };

        setSource('coingecko');
        setLastUpdated(cache.timestamp);
        setError(null);
      } catch (cgError) {
        // CoinGecko is frequently rate-limited (429) from shared IPs. Fall through a
        // chain of reliable keyless providers before giving up. Never fabricate prices.
        console.warn('[v0] CoinGecko unavailable, trying Coinbase…', cgError);
        try {
          await fetchFromCoinbase();
          setError(null);
        } catch (cbError) {
          console.warn('[v0] Coinbase unavailable, trying CryptoCompare…', cbError);
          await fetchFromCryptoCompare();
          setError(null);
        }
      }
    } catch (err) {
      // Every live source failed. Surface an explicit unavailable state — do NOT show
      // stale cache as if it were live (consumers gate on isStale/lastUpdated).
      console.error('[v0] All crypto data sources failed:', err);
      setError('Market data currently unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If cache is fresh (less than 30s), don't trigger initial fetch loading state
    const isFresh = Date.now() - cache.timestamp < 30000;
    if (!isFresh || marketData.length === 0) {
       fetchMarketData();
    }

    const interval = setInterval(fetchMarketData, 60000); // Update every minute
    // Recompute freshness independently so staleness surfaces even while fetches fail.
    const freshness = setInterval(() => setFreshnessTick((t) => t + 1), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(freshness);
    };
  }, []);

  const getCoin = (id: string) => marketData.find(c => c.id === id);

  // Stale once the last successful fetch is older than the threshold. Never stale
  // before the first successful load (that is "loading"/"unavailable", not "stale").
  const isStale = lastUpdated > 0 && Date.now() - lastUpdated > PRICE_STALE_MS;

  return {
    marketData,
    globalData,
    loading,
    error,
    source,
    lastUpdated,
    isStale,
    getCoin,
    refresh: fetchMarketData
  };
};
