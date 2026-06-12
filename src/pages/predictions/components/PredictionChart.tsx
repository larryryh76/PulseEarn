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
      try {
        setLoading(true);
        // Fetch 24h data from CoinGecko
        const res = await axios.get(`https://api.coingecko.com/api/v3/coins/${assetId}/market_chart`, {
           params: { vs_currency: 'usd', days: '1' }
        });

        const prices = res.data.prices; // [timestamp, price]
        const chartData = prices.map((p: any) => ({
           time: Math.floor(p[0] / 1000) as any,
           value: p[1]
        }));

        series.setData(chartData);
        chart.timeScale().fitContent();
      } catch (err) {
        console.error('Chart Data Error:', err);
        // Generate simulated data on network failure
        const data = [];
        let time = Math.floor(Date.now() / 1000) - (100 * 60);
        let value = 100;
        for (let i = 0; i < 100; i++) {
          value += (Math.random() - 0.5) * 2;
          data.push({ time: time as any, value });
          time += 60;
        }
        series.setData(data);
      } finally {
        setLoading(false);
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
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [assetId]);

  return (
    <div className="w-full bg-white/[0.01] border border-white/5 rounded-2xl overflow-hidden p-2 relative">
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
