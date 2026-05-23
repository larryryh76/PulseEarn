import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface TradingViewChartProps {
  symbol: string;
  containerId?: string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart: IChartApi | null = null;

    try {
      const handleResize = () => {
        if (chart && chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };

      if (chartContainerRef.current.clientWidth === 0) {
          const timer = setTimeout(() => {
              if (chartContainerRef.current && chartContainerRef.current.clientWidth > 0) {
                  initChart();
              }
          }, 100);
          return () => clearTimeout(timer);
      }

      const initChart = () => {
          if (!chartContainerRef.current) return;

          chart = createChart(chartContainerRef.current, {
            layout: {
              background: { type: ColorType.Solid, color: 'transparent' },
              textColor: 'rgba(255, 255, 255, 0.4)',
            },
            grid: {
              vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
              horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 350,
            timeScale: {
              borderVisible: false,
              timeVisible: true,
            },
            rightPriceScale: {
              borderVisible: false,
            },
            handleScroll: false,
            handleScale: false,
          });

          chartRef.current = chart;

          const areaSeries = (chart as any).addAreaSeries({
             lineColor: '#0070ff',
             topColor: 'rgba(0, 112, 255, 0.2)',
             bottomColor: 'rgba(0, 112, 255, 0)',
             lineWidth: 2,
          });

          seriesRef.current = areaSeries;

          const now = Math.floor(Date.now() / 1000);
          const data = [...Array(100)].map((_, i) => ({
            time: (now - (100 - i) * 300) as any,
            value: 60000 + (Math.random() - 0.5) * 1000,
          }));

          areaSeries.setData(data);
          window.addEventListener('resize', handleResize);
      };

      initChart();

    } catch (err) {
      console.error("Failed to initialize lightweight-chart:", err);
      setError("Chart rendering failed");
    }

    return () => {
      window.removeEventListener('resize', () => {});
      if (chart) {
          chart.remove();
          chartRef.current = null;
      }
    };
  }, [symbol]);

  if (error) {
    return (
        <div className="w-full h-[350px] flex flex-col items-center justify-center bg-white/[0.01] rounded-2xl border border-white/5 space-y-3">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Visualizer Offline</p>
           <button onClick={() => window.location.reload()} className="text-[10px] text-primary hover:underline font-bold uppercase">Retry</button>
        </div>
    );
  }

  return <div ref={chartContainerRef} className="w-full" />;
};

export default TradingViewChart;
