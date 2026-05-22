import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';

interface TradingViewChartProps {
  symbol: string;
  containerId?: string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current!.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.4)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
      timeScale: {
        borderVisible: false,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    chartRef.current = chart;

    // Use addSeries with area type
    const lineSeries = (chart as any).addAreaSeries({
      lineColor: '#0070ff',
      topColor: 'rgba(0, 112, 255, 0.2)',
      bottomColor: 'rgba(0, 112, 255, 0)',
      lineWidth: 2,
    });

    // Fetch historical data for the chart (simulated for simplicity, usually from an API)
    const data = [...Array(100)].map((_, i) => ({
      time: (Math.floor(Date.now() / 1000) - (100 - i) * 3600) as any,
      value: 60000 + Math.random() * 5000,
    }));

    lineSeries.setData(data);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol]);

  return <div ref={chartContainerRef} className="w-full" />;
};

export default TradingViewChart;
