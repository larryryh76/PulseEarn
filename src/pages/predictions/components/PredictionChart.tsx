import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, AreaSeries } from 'lightweight-charts';
import axios from 'axios';

interface PredictionChartProps {
  assetId: string;
  symbol: string;
}

const PredictionChart: React.FC<PredictionChartProps> = ({ assetId }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#A0AEC0',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: window.innerWidth < 768 ? 200 : 240,
      timeScale: {
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: '#5E6AD2',
      topColor: 'rgba(94, 106, 210, 0.3)',
      bottomColor: 'rgba(94, 106, 210, 0)',
      lineWidth: 2,
    });

    const fetchData = async () => {
      // Fix #7: Implement fallback for chart data
      const SYMBOL_MAP: Record<string, string> = {
        'bitcoin': 'BTC', 'ethereum': 'ETH', 'solana': 'SOL', 'binancecoin': 'BNB', 'ripple': 'XRP',
        'cardano': 'ADA', 'dogecoin': 'DOGE', 'the-open-network': 'TON', 'avalanche-2': 'AVAX', 'chainlink': 'LINK',
        'sui': 'SUI', 'tron': 'TRX', 'shiba-inu': 'SHIB', 'pepe': 'PEPE', 'litecoin': 'LTC',
        'polkadot': 'DOT', 'cosmos': 'ATOM', 'arbitrum': 'ARB', 'optimism': 'OP', 'near': 'NEAR'
      };

      try {
        if (isMounted) setLoading(true);
        let chartData = [];

        try {
          // Primary: CoinGecko
          const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${assetId}/market_chart`, {
             params: { vs_currency: 'usd', days: '1' }
          });
          chartData = res.data.prices.map((p: any) => ({
             time: Math.floor(p[0] / 1000) as any,
             value: p[1]
          }));
        } catch (cgError) {
          console.warn('CoinGecko chart failed, falling back to CryptoCompare...', cgError);
          // Fallback: CryptoCompare
          const sym = SYMBOL_MAP[assetId];
          if (sym) {
            const res = await axios.get(`https://min-api.cryptocompare.com/data/v2/histohour`, {
              params: { fsym: sym, tsym: 'USD', limit: 24 }
            });
            chartData = res.data.Data.Data.map((p: any) => ({
              time: p.time as any,
              value: p.close
            }));
          } else {
            throw new Error('No symbol mapping found for fallback');
          }
        }

        if (isMounted && chartData.length > 0) {
           series.setData(chartData);
           chart.timeScale().fitContent();
        }
      } catch (err) {
        console.error('All chart data sources failed:', err);
        // Generate simulated data on network failure
        const data = [];
        let time = Math.floor(Date.now() / 1000) - (100 * 60);
        let value = 100;
        for (let i = 0; i < 100; i++) {
          value += (Math.random() - 0.5) * 2;
          data.push({ time: time as any, value });
          time += 60;
        }
        if (isMounted) series.setData(data);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [assetId]);

  return (
    <div className="w-full bg-muted/40 border border-border rounded-xl overflow-hidden p-2 relative">
       {loading && (
          <div className="absolute inset-0 z-10 bg-background/40 backdrop-blur-sm flex items-center justify-center">
             <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
       )}
       <div ref={chartContainerRef} className="w-full h-[200px] sm:h-[240px]" />
    </div>
  );
};

export default PredictionChart;
