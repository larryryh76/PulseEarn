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
  const [source, setSource] = useState<'coingecko' | 'cryptocompare'>('coingecko');
  // Timestamp of the last SUCCESSFUL fetch (0 = never loaded). Authoritative freshness signal.
  const [lastUpdated, setLastUpdated] = useState<number>(cache.timestamp);
  // Ticks every 30s so `isStale` recomputes even while fetches are failing.
  const [, setFreshnessTick] = useState(0);

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
        console.warn('CoinGecko failed, falling back to CryptoCompare...', cgError);
        await fetchFromCryptoCompare();
        setError('Using fallback market data source');
      }
    } catch (err) {
      console.error('All crypto data sources failed:', err);
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
