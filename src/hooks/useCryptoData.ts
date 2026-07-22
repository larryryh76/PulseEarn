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

// Memory cache for market data to prevent redundant fetches and layout shifts
let cache: {
  market: CryptoMarketData[];
  global: GlobalMarketData | null;
  timestamp: number;
} = { market: [], global: null, timestamp: 0 };

const FALLBACK_MARKET_DATA: CryptoMarketData[] = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', current_price: 64250, market_cap: 1260000000000, market_cap_rank: 1, price_change_percentage_24h: 2.45, total_volume: 28500000000 },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', current_price: 3480, market_cap: 418000000000, market_cap_rank: 2, price_change_percentage_24h: 1.82, total_volume: 14200000000 },
  { id: 'solana', symbol: 'sol', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', current_price: 152.4, market_cap: 71000000000, market_cap_rank: 5, price_change_percentage_24h: 5.12, total_volume: 3100000000 },
  { id: 'binancecoin', symbol: 'bnb', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', current_price: 580.1, market_cap: 85000000000, market_cap_rank: 4, price_change_percentage_24h: -0.45, total_volume: 950000000 },
  { id: 'ripple', symbol: 'xrp', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png', current_price: 0.58, market_cap: 32000000000, market_cap_rank: 7, price_change_percentage_24h: 0.95, total_volume: 1100000000 }
];

export const useCryptoData = () => {
  const [marketData, setMarketData] = useState<CryptoMarketData[]>(cache.market.length > 0 ? cache.market : FALLBACK_MARKET_DATA);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(cache.global);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'coingecko' | 'cryptocompare' | 'fallback'>('coingecko');

  const fetchFromCryptoCompare = async () => {
    const symbols = Object.values(SYMBOL_MAP).join(',');
    const res = await axios.get(`${CRYPTOCOMPARE_BASE_URL}/pricemultifull`, {
      params: { fsyms: symbols, tsyms: 'USD' },
      timeout: 5000
    });

    const raw = res.data.RAW;
    if (!raw) throw new Error('CryptoCompare returned empty payload');

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
    }).filter(item => item.current_price > 0);

    if (mapped.length > 0) {
      setMarketData(mapped);
      setSource('cryptocompare');
    } else {
      throw new Error('No valid price data from CryptoCompare');
    }
  };

  const fetchMarketData = async () => {
    try {
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
            timeout: 5000
          }),
          axios.get(`${COINGECKO_BASE_URL}/global`, { timeout: 5000 })
        ]);

        if (Array.isArray(marketRes.data) && marketRes.data.length > 0) {
          setMarketData(marketRes.data);
          setGlobalData(globalRes.data.data);

          // Update Cache
          cache = {
            market: marketRes.data,
            global: globalRes.data.data,
            timestamp: Date.now()
          };

          setSource('coingecko');
          setError(null);
          return;
        }
      } catch (cgError) {
        console.warn('CoinGecko failed, attempting CryptoCompare fallback...');
      }

      await fetchFromCryptoCompare();
      setError(null);
    } catch (err) {
      console.warn('External crypto data unavailable, using fallback dataset.');
      if (marketData.length === 0) {
        setMarketData(FALLBACK_MARKET_DATA);
      }
      setSource('fallback');
      setError(null);
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
    return () => clearInterval(interval);
  }, []);

  const getCoin = (id: string) => marketData.find(c => c.id === id);

  return {
    marketData,
    globalData,
    loading,
    error,
    source,
    getCoin,
    refresh: fetchMarketData
  };
};
