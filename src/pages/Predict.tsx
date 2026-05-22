import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Target,
  Zap,
  History,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '../utils';
import TradingViewChart from '../components/ui/TradingViewChart';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Predict: React.FC = () => {
  const { userData } = useAuth();
  const { marketData, loading } = useCryptoData();
  const [selectedAsset, setSelectedAsset] = useState('bitcoin');
  const [selectedDirection, setSelectedDirection] = useState<'up' | 'down' | null>(null);
  const [predictionAmount, setPredictionAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const asset = marketData.find(c => c.id === selectedAsset);

  const handlePredict = async () => {
    if (!selectedDirection) return toast.error('Select a direction');
    if (userData && userData.points < predictionAmount) return toast.error('Insufficient points');

    setIsSubmitting(true);
    // Logic for prediction would go here (Firebase write)
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success(`Prediction locked: ${selectedAsset} will go ${selectedDirection}!`);
    setIsSubmitting(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
           <div>
              <div className="flex items-center gap-2 text-accent font-bold mb-2">
                 <Target size={16} />
                 <span className="text-[10px] uppercase tracking-[0.3em]">Oracle Prediction Engine</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">Market Oracle</h1>
              <p className="text-white/40 text-sm mt-1">Predict institutional price movements to earn protocol yield.</p>
           </div>
           <div className="flex gap-2">
              {['bitcoin', 'ethereum', 'solana'].map(id => (
                <button
                  key={id}
                  onClick={() => setSelectedAsset(id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border",
                    selectedAsset === id ? "bg-accent border-accent text-black" : "bg-white/5 border-white/10 text-white/40"
                  )}
                >
                  {id}
                </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

           {/* Chart Column */}
           <div className="lg:col-span-2 space-y-6">
              <Card className="p-0 border-white/[0.05] bg-[#0A0A0F] overflow-hidden">
                 <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       {loading ? <Skeleton className="w-10 h-10 rounded-full" /> : <img src={asset?.image} className="w-10 h-10" alt="" />}
                       <div>
                          <h3 className="font-bold text-white text-lg uppercase">{asset?.symbol}/USDT</h3>
                          <p className="text-[10px] font-medium text-white/40">Real-time Feed</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-2xl font-mono font-bold text-white">
                          {loading ? '---' : asset?.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                       </p>
                       <p className={cn(
                          "text-xs font-bold",
                          (asset?.price_change_percentage_24h || 0) >= 0 ? "text-success" : "text-danger"
                       )}>
                          {(asset?.price_change_percentage_24h || 0) >= 0 ? '+' : ''}{asset?.price_change_percentage_24h.toFixed(2)}%
                       </p>
                    </div>
                 </div>

                 <div className="p-4 h-[350px] flex items-center justify-center bg-black/20">
                    <TradingViewChart symbol={selectedAsset} />
                 </div>

                 <div className="grid grid-cols-3 border-t border-white/[0.05]">
                    <div className="p-4 border-r border-white/[0.05] text-center">
                       <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Vol (24h)</p>
                       <p className="text-xs font-mono font-bold text-white">${(asset?.total_volume || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 border-r border-white/[0.05] text-center">
                       <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Market Cap</p>
                       <p className="text-xs font-mono font-bold text-white">${(asset?.market_cap || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 text-center">
                       <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Status</p>
                       <p className="text-xs font-bold text-success flex items-center justify-center gap-1">
                          <Zap size={10} fill="currentColor" /> Active
                       </p>
                    </div>
                 </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="p-6 border-white/[0.05] bg-[#0A0A0F]">
                    <div className="flex items-center gap-2 mb-4">
                       <Info size={14} className="text-primary" />
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Oracle Sentiment</h4>
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-end mb-1">
                          <span className="text-xs font-bold text-success">Bullish</span>
                          <span className="text-[10px] font-mono text-white/20">68% vs 32%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                          <div className="h-full bg-success w-[68%]" />
                          <div className="h-full bg-danger w-[32%]" />
                       </div>
                       <p className="text-[10px] text-white/40 leading-relaxed italic">
                          "Protocol nodes indicate a strong accumulation phase for {asset?.name} in the current 4h window."
                       </p>
                    </div>
                 </Card>

                 <Card className="p-6 border-white/[0.05] bg-[#0A0A0F]">
                    <div className="flex items-center gap-2 mb-4">
                       <History size={14} className="text-accent" />
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Your Performance</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Total P/L</p>
                          <p className="text-lg font-bold text-success">+1,240 PTS</p>
                       </div>
                       <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Accuracy</p>
                          <p className="text-lg font-bold text-white">72%</p>
                       </div>
                    </div>
                 </Card>
              </div>
           </div>

           {/* Controls Column */}
           <div className="space-y-6">
              <Card className="p-8 border-white/[0.05] bg-[#0D0D12] sticky top-24">
                 <div className="text-center mb-8">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-3">Position Directive</p>
                    <h2 className="text-xl font-bold">Predict Next 1h Direction</h2>
                 </div>

                 <div className="grid grid-cols-2 gap-4 mb-8">
                    <button
                      onClick={() => setSelectedDirection('up')}
                      className={cn(
                        "h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all",
                        selectedDirection === 'up'
                          ? "bg-success/10 border-success text-success shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                          : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
                      )}
                    >
                       <TrendingUp size={28} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Bullish</span>
                       <span className="text-[9px] font-mono opacity-40">Payout 1.85x</span>
                    </button>

                    <button
                      onClick={() => setSelectedDirection('down')}
                      className={cn(
                        "h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all",
                        selectedDirection === 'down'
                          ? "bg-danger/10 border-danger text-danger shadow-[0_0_30px_rgba(255,46,91,0.2)]"
                          : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
                      )}
                    >
                       <TrendingDown size={28} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Bearish</span>
                       <span className="text-[9px] font-mono opacity-40">Payout 2.10x</span>
                    </button>
                 </div>

                 <div className="space-y-6 mb-8">
                    <div>
                       <div className="flex justify-between items-center mb-3 px-1">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Stake Amount</label>
                          <span className="text-[10px] font-bold text-primary uppercase">Available: {userData?.points.toLocaleString()} PTS</span>
                       </div>
                       <div className="relative">
                          <input
                            type="number"
                            value={predictionAmount}
                            onChange={(e) => setPredictionAmount(Number(e.target.value))}
                            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-primary/50"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                             {[50, 100, 500].map(amt => (
                               <button
                                 key={amt}
                                 onClick={() => setPredictionAmount(amt)}
                                 className="px-2 py-1 rounded bg-white/5 text-[8px] font-bold text-white/40 hover:bg-white/10"
                               >
                                  {amt}
                               </button>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 flex gap-3">
                       <AlertCircle className="text-orange-500 shrink-0" size={16} />
                       <p className="text-[10px] text-orange-500/60 leading-relaxed font-medium">
                          Predictions are finalized on-chain every 60 minutes. Aborting after lock is not possible.
                       </p>
                    </div>
                 </div>

                 <Button
                   onClick={handlePredict}
                   disabled={isSubmitting}
                   glow
                   className="w-full py-4 text-[11px] font-bold uppercase tracking-[0.2em]"
                 >
                    {isSubmitting ? 'Transmitting Data...' : 'Confirm Directive'}
                 </Button>

                 <div className="mt-6 flex items-center justify-center gap-2 text-white/20">
                    <Clock size={12} />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Next Settlement in 14:22</span>
                 </div>
              </Card>

              <Card className="p-6 border-white/[0.05] bg-[#0A0A0F]">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4 px-1">Active Positions</h4>
                 <div className="space-y-3">
                    <div className="py-10 text-center">
                       <Target className="mx-auto text-white/5 mb-3" size={32} />
                       <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest">No Active Positions</p>
                    </div>
                 </div>
              </Card>
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predict;
