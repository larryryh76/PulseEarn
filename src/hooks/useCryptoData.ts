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

export const useCryptoData = () => {
  const [marketData, setMarketData] = useState<CryptoMarketData[]>([]);
  const [globalData, setGlobalData] = useState<GlobalMarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      const ids = [
        'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
        'cardano', 'dogecoin', 'the-open-network', 'avalanche-2', 'chainlink',
        'sui', 'tron', 'shiba-inu', 'pepe', 'litecoin',
        'polkadot', 'cosmos', 'arbitrum', 'optimism', 'near'
      ].join(',');

      const [marketRes, globalRes] = await Promise.all([
        axios.get(`${COINGECKO_BASE_URL}/coins/markets`, {
          params: {
            vs_currency: 'usd',
            ids,
            order: 'market_cap_desc',
            sparkline: false,
            price_change_percentage: '24h'
          }
        }),
        axios.get(`${COINGECKO_BASE_URL}/global`)
      ]);

      setMarketData(marketRes.data);
      setGlobalData(globalRes.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching crypto data:', err);
      setError('Failed to fetch real-time market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const getCoin = (id: string) => marketData.find(c => c.id === id);

  return {
    marketData,
    globalData,
    loading,
    error,
    getCoin,
    refresh: fetchMarketData
  };
};
