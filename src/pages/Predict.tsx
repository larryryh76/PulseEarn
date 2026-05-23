import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Target,
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { cn } from '../utils';
import TradingViewChart from '../components/ui/TradingViewChart';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { motion } from 'framer-motion';

const Predict: React.FC = () => {
  const { userData } = useAuth();
  const { marketData, loading, error } = useCryptoData();
  const [selectedAsset, setSelectedAsset] = useState('bitcoin');
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);
  const [predictionAmount, setPredictionAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const asset = marketData?.find(c => c.id === selectedAsset);

  const handlePredict = async () => {
    if (!selectedDirection) return toast.error('Select a direction');
    if (!userData) return toast.error('Auth session required');
    if (userData.points < predictionAmount) return toast.error('Insufficient points');

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Prediction locked: ${selectedAsset} will go ${selectedDirection}!`);
      setSelectedDirection(null);
    } catch (err) {
      toast.error('Oracle transmission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && (!marketData || marketData.length === 0)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
           <AlertCircle size={48} className="text-danger opacity-50" />
           <h2 className="text-xl font-bold">Oracle Sync Offline</h2>
           <p className="text-white/40 max-w-xs mx-auto text-sm">We are unable to reach the market data nodes. Please check your connection.</p>
           <Button variant="outline" onClick={() => window.location.reload()}>Retry Sync</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
           <div className="space-y-1">
              <div className="flex items-center gap-2 text-accent font-bold">
                 <SparklesIcon size={16} />
                 <span className="text-[10px] uppercase tracking-[0.3em]">Predictive Intel Layer</span>
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-white">Market Oracle</h1>
              <p className="text-white/40 text-sm font-medium leading-relaxed">Analyze institutional flow and forecast the next 60m price window.</p>
           </div>

           <div className="flex bg-[#0A0A0F] border border-white/[0.05] rounded-2xl p-1 gap-1">
              {[
                { id: 'bitcoin', label: 'BTC', icon: '₿' },
                { id: 'ethereum', label: 'ETH', icon: 'Ξ' },
                { id: 'solana', label: 'SOL', icon: 'S' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedAsset(item.id)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                    selectedAsset === item.id
                      ? "bg-accent border border-accent/20 text-black shadow-[0_0_20px_rgba(0,242,255,0.2)]"
                      : "text-white/30 hover:text-white hover:bg-white/5"
                  )}
                >
                  <span className="opacity-50">{item.icon}</span>
                  {item.label}
                </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

           {/* Chart Column */}
           <div className="lg:col-span-2 space-y-6">
              <Card className="p-0 border-white/[0.05] bg-[#0A0A0F] overflow-hidden relative">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,242,255,0.03),transparent_70%)] pointer-events-none" />

                 <div className="p-8 border-b border-white/[0.05] flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-5">
                       {loading && !asset ? (
                          <Skeleton className="w-14 h-14 rounded-2xl" />
                       ) : (
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center p-3">
                             <img src={asset?.image} className="w-full h-full object-contain" alt="" />
                          </div>
                       )}
                       <div>
                          <h3 className="font-bold text-white text-xl tracking-tight uppercase flex items-center gap-2">
                             {asset?.symbol || '---'}/USDT
                             <span className="px-2 py-0.5 rounded bg-success/10 text-success text-[8px] font-bold uppercase border border-success/20 tracking-widest">Live</span>
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Protocol ID: 0x422...ORCL</span>
                             <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          </div>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-3xl font-mono font-bold text-white tracking-tighter">
                          {loading && !asset ? '---' : asset?.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </p>
                       <div className={cn(
                          "flex items-center justify-end gap-1.5 text-sm font-bold mt-1",
                          (asset?.price_change_percentage_24h || 0) >= 0 ? "text-success" : "text-danger"
                       )}>
                          {(asset?.price_change_percentage_24h || 0) >= 0 ? <ArrowUpRight size={14} /> : <TrendingDown size={14} />}
                          {(asset?.price_change_percentage_24h || 0).toFixed(2)}%
                       </div>
                    </div>
                 </div>

                 <div className="h-[400px] relative bg-black/20 flex items-center justify-center">
                    <ErrorBoundary name="ChartVisualizer">
                      {loading && !asset ? (
                         <div className="w-full h-full p-8 flex flex-col gap-4">
                            <Skeleton className="w-full flex-1 rounded-2xl" />
                            <div className="flex gap-4 h-8">
                               <Skeleton className="flex-1 rounded-lg" />
                               <Skeleton className="flex-1 rounded-lg" />
                               <Skeleton className="flex-1 rounded-lg" />
                            </div>
                         </div>
                      ) : (
                         <div className="w-full h-full">
                            <TradingViewChart symbol={selectedAsset} />
                            <div className="absolute bottom-6 right-8 px-4 py-2 rounded-xl bg-[#0D0D12]/80 backdrop-blur-md border border-white/5 flex items-center gap-3 shadow-2xl">
                               <Activity size={14} className="text-accent animate-pulse" />
                               <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Feed: Aggregated WebSocket</span>
                            </div>
                         </div>
                      )}
                    </ErrorBoundary>
                 </div>

                 <div className="grid grid-cols-3 divide-x divide-white/[0.05] border-t border-white/[0.05] bg-white/[0.01]">
                    <div className="p-6 text-center group cursor-pointer hover:bg-white/[0.01] transition-colors">
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-white/40 transition-colors">24h Volume</p>
                       <p className="text-sm font-mono font-bold text-white">${(asset?.total_volume || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-6 text-center group cursor-pointer hover:bg-white/[0.01] transition-colors">
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-white/40 transition-colors">Volatility Index</p>
                       <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-accent w-2/3" />
                          </div>
                          <span className="text-sm font-mono font-bold text-accent text-[11px]">MEDIUM</span>
                       </div>
                    </div>
                    <div className="p-6 text-center group cursor-pointer hover:bg-white/[0.01] transition-colors">
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2 group-hover:text-white/40 transition-colors">Node Accuracy</p>
                       <p className="text-sm font-mono font-bold text-success text-[13px]">94.2%</p>
                    </div>
                 </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="p-8 border-white/[0.05] bg-[#0A0A0F] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-success opacity-20" />
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 rounded-lg bg-success/10 text-success">
                          <Activity size={16} />
                       </div>
                       <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Market Sentiment</h4>
                    </div>
                    <div className="space-y-5">
                       <div className="flex justify-between items-end">
                          <div className="flex flex-col">
                             <span className="text-2xl font-bold text-success">Bullish</span>
                             <span className="text-[9px] font-bold text-white/20 uppercase mt-0.5 tracking-widest">Protocol Signal</span>
                          </div>
                          <span className="text-xl font-mono font-bold text-white/40">72%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '72%' }}
                            className="h-full bg-success shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                          />
                          <div className="h-full bg-danger/40 w-[28%]" />
                       </div>
                       <p className="text-[11px] text-white/40 leading-relaxed font-medium italic">
                          "Institutional nodes detected heavy buy-side order flow in the $63,800 - $64,200 liquidity zone."
                       </p>
                    </div>
                 </Card>

                 <Card className="p-8 border-white/[0.05] bg-[#0A0A0F] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-20" />
                    <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 rounded-lg bg-accent/10 text-accent">
                          <History size={16} />
                       </div>
                       <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Oracle Track Record</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[9px] font-bold text-white/20 uppercase mb-1 tracking-widest">Global P/L</p>
                          <p className="text-xl font-bold text-success">+1.4M PTS</p>
                       </div>
                       <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[9px] font-bold text-white/20 uppercase mb-1 tracking-widest">Correct</p>
                          <p className="text-xl font-bold text-white">8,421</p>
                       </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between text-[10px] font-bold text-white/20 uppercase tracking-widest bg-white/[0.03] p-3 rounded-xl border border-white/5">
                       <span>Last Round Result</span>
                       <span className="text-success flex items-center gap-1">UP (+1.4%) <CheckCircle2 size={12} /></span>
                    </div>
                 </Card>
              </div>
           </div>

           {/* Controls Column */}
           <div className="space-y-6">
              <Card className="p-8 border-white/[0.05] bg-[#0D0D12] sticky top-24 shadow-2xl">
                 <div className="text-center mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 border border-accent/20">
                       <Target size={24} className="text-accent" />
                    </div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-2">Position Directive</p>
                    <h2 className="text-2xl font-bold tracking-tight">Forecast Next Round</h2>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => setSelectedDirection('up')}
                      className={cn(
                        "h-40 rounded-3xl border-2 flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden group",
                        selectedDirection === 'up'
                          ? "bg-success/10 border-success text-success shadow-[0_0_40px_rgba(34,197,94,0.15)]"
                          : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
                      )}
                    >
                       {selectedDirection === 'up' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.2),transparent_70%)]" />}
                       <div className={cn("p-4 rounded-full transition-transform duration-500", selectedDirection === 'up' ? "bg-success/20" : "bg-white/5 group-hover:scale-110")}>
                          <TrendingUp size={32} />
                       </div>
                       <div className="text-center relative z-10">
                          <span className="block text-[11px] font-bold uppercase tracking-[0.2em]">Higher</span>
                          <span className="text-[10px] font-mono opacity-40 mt-1 block">1.82x Boost</span>
                       </div>
                    </button>

                    <button
                      onClick={() => setSelectedDirection('down')}
                      className={cn(
                        "h-40 rounded-3xl border-2 flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden group",
                        selectedDirection === 'down'
                          ? "bg-danger/10 border-danger text-danger shadow-[0_0_40px_rgba(255,46,91,0.15)]"
                          : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
                      )}
                    >
                       {selectedDirection === 'down' && <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,46,91,0.2),transparent_70%)]" />}
                       <div className={cn("p-4 rounded-full transition-transform duration-500", selectedDirection === 'down' ? "bg-danger/20" : "bg-white/5 group-hover:scale-110")}>
                          <TrendingDown size={32} />
                       </div>
                       <div className="text-center relative z-10">
                          <span className="block text-[11px] font-bold uppercase tracking-[0.2em]">Lower</span>
                          <span className="text-[10px] font-mono opacity-40 mt-1 block">2.14x Boost</span>
                       </div>
                    </button>
                 </div>

                 <div className="space-y-6 mb-8">
                    <div>
                       <div className="flex justify-between items-center mb-3 px-1">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stake Magnitude</label>
                          <span className="text-[10px] font-bold text-primary uppercase">Bal: {userData?.points.toLocaleString() || '0'} PTS</span>
                       </div>
                       <div className="relative">
                          <input
                            type="number"
                            value={predictionAmount}
                            onChange={(e) => setPredictionAmount(Number(e.target.value))}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-5 text-lg font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1.5">
                             {[50, 200, 1000].map(amt => (
                               <button
                                 key={amt}
                                 onClick={() => setPredictionAmount(amt)}
                                 className="px-2.5 py-1.5 rounded-lg bg-white/5 text-[9px] font-bold text-white/40 hover:bg-white/10 transition-colors uppercase"
                               >
                                  {amt}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#0A0A0F] border border-white/[0.05] flex gap-4">
                       <ShieldCheck className="text-primary shrink-0" size={18} />
                       <div>
                          <p className="text-[10px] text-white/40 leading-relaxed font-medium uppercase tracking-wide">
                             Extraction Security: Enabled
                          </p>
                          <p className="text-[9px] text-white/20 leading-relaxed mt-0.5">
                             Your principal is protected by the protocol insurance fund.
                          </p>
                       </div>
                    </div>
                 </div>

                 <Button
                   onClick={handlePredict}
                   disabled={isSubmitting || !selectedDirection}
                   glow
                   className={cn(
                      "w-full py-5 text-[11px] font-bold uppercase tracking-[0.3em] transition-all",
                      !selectedDirection && "opacity-50 grayscale"
                   )}
                 >
                    {isSubmitting ? (
                       <div className="flex items-center gap-3">
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          Signing Node Contract...
                       </div>
                    ) : 'Authorize Forecast'}
                 </Button>

                 <div className="mt-8 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-3 text-white/20">
                       <Clock size={14} className="animate-pulse" />
                       <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Next Round Seal: 14:22</span>
                    </div>
                    <div className="flex -space-x-3">
                       {[1,2,3,4,5].map(i => (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0D0D12] bg-white/[0.05] flex items-center justify-center text-[10px] font-bold text-white/40 shadow-xl overflow-hidden">
                             <img src={`https://api.dicebear.com/7.x/shapes/svg?seed=trader${i}`} alt="" />
                          </div>
                       ))}
                       <div className="w-8 h-8 rounded-full border-2 border-[#0D0D12] bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shadow-xl">
                          +1.2k
                       </div>
                    </div>
                 </div>
              </Card>

              <Card className="p-8 border-white/[0.05] bg-[#0A0A0F] relative overflow-hidden">
                 <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Active Directive</h4>
                    <span className="text-[9px] font-bold text-white/20">LIVE</span>
                 </div>
                 <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center mx-auto opacity-40">
                       <Target className="text-white/40" size={32} />
                    </div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Awaiting Position</p>
                 </div>
              </Card>
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

const SparklesIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export default Predict;
