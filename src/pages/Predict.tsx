import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Activity,
  Zap,
  Search,
  Flame,
  ArrowRight
} from 'lucide-react';
import { cn } from '../utils';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';

const Predict: React.FC = () => {
  const { userData } = useAuth();
  const { marketData, loading, error } = useCryptoData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [predictionAmount, setPredictionAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  const filteredAssets = marketData?.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handlePredict = async () => {
    if (!direction) return toast.error('Select a direction');
    if (!userData) return toast.error('Auth session required');
    if (userData.points < predictionAmount) return toast.error('Insufficient points');

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Position Opened: ${selectedAsset?.symbol.toUpperCase()} ${direction.toUpperCase()}!`);
      setSelectedAsset(null);
      setDirection(null);
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
           <p className="text-white/40 max-w-xs mx-auto text-sm">We are unable to reach the market data nodes.</p>
           <Button variant="outline" onClick={() => window.location.reload()}>Retry Sync</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-20">

        <ErrorBoundary name="PredictHeader">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
             <div className="space-y-1">
                <div className="flex items-center gap-2 text-accent font-bold">
                   <Zap size={16} />
                   <span className="text-[10px] uppercase tracking-[0.3em]">Market Oracle v2.4</span>
                </div>
                <h1 className="text-5xl font-bold tracking-tight text-white">Price Forecasting</h1>
                <p className="text-white/40 text-sm font-medium">Synchronize with institutional flows and predict market direction.</p>
             </div>

             <div className="w-full md:w-80 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                   <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search Asset Node..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-primary/50 transition-all font-medium"
                />
             </div>
          </div>
        </ErrorBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

           {/* ASSET EXPLORER GRID */}
           <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <Flame size={16} className="text-orange-500" />
                    <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Market Movers</h3>
                 </div>
                 <div className="flex items-center gap-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <span>24h Change</span>
                    <span className="w-12 text-right">Action</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                 {loading ? (
                    [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-3xl" />)
                 ) : filteredAssets.map((asset) => (
                    <motion.div
                      layout
                      key={asset.id}
                      onClick={() => setSelectedAsset(asset)}
                      className={cn(
                        "group p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-primary/30 transition-all flex items-center justify-between cursor-pointer",
                        selectedAsset?.id === asset.id && "bg-white/[0.08] border-primary/50 ring-1 ring-primary/20"
                      )}
                    >
                       <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 p-3 flex items-center justify-center shadow-2xl relative group-hover:scale-105 transition-transform">
                             <img src={asset.image} className="w-full h-full object-contain" alt="" />
                             <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-[#050507]" />
                          </div>
                          <div>
                             <h4 className="text-lg font-bold text-white tracking-tight uppercase flex items-center gap-2">
                                {asset.symbol}/USDT
                                {asset.price_change_percentage_24h > 10 && (
                                   <span className="px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 text-[8px] font-bold uppercase tracking-widest border border-orange-500/20">Trending</span>
                                )}
                             </h4>
                             <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-sm font-mono font-bold text-white/60 tracking-tight">${asset.current_price.toLocaleString()}</span>
                                <div className="h-3 w-[1px] bg-white/10" />
                                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Vol: ${(asset.total_volume / 1000000).toFixed(1)}M</span>
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-8">
                          <div className={cn(
                            "flex flex-col items-end",
                            asset.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
                          )}>
                             <div className="flex items-center gap-1 font-bold text-sm">
                                {asset.price_change_percentage_24h >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                {Math.abs(asset.price_change_percentage_24h).toFixed(2)}%
                             </div>
                             <div className="w-16 h-4 mt-2 opacity-30">
                                <svg viewBox="0 0 100 20" className="w-full h-full">
                                   <path
                                     d={asset.price_change_percentage_24h >= 0 ? "M0 15 L20 10 L40 12 L60 5 L80 8 L100 2" : "M0 5 L20 10 L40 8 L60 15 L80 12 L100 18"}
                                     fill="none"
                                     stroke="currentColor"
                                     strokeWidth="2"
                                   />
                                </svg>
                             </div>
                          </div>
                          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/20 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                             <ArrowRight size={16} />
                          </div>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </div>

           {/* PREDICTION SIDEBAR */}
           <div className="lg:col-span-4 space-y-6">
              <AnimatePresence mode="wait">
                 {selectedAsset ? (
                    <motion.div
                      key="prediction-card"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                       <Card className="p-8 border-white/[0.05] bg-[#0D0D12] sticky top-24 shadow-2xl overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05),transparent_70%)] pointer-events-none" />

                          <div className="text-center mb-10 relative z-10">
                             <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-2xl">
                                <img src={selectedAsset.image} className="w-10 h-10" alt="" />
                             </div>
                             <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] mb-2">Open Position</p>
                             <h2 className="text-2xl font-bold tracking-tight">{selectedAsset.symbol?.toUpperCase()}/USDT</h2>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                             <button
                               onClick={() => setDirection('up')}
                               className={cn(
                                 "h-32 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden group",
                                 direction === 'up'
                                   ? "bg-success/10 border-success text-success shadow-[0_0_40px_rgba(34,197,94,0.15)]"
                                   : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
                               )}
                             >
                                <TrendingUp size={28} />
                                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Higher</span>
                             </button>

                             <button
                               onClick={() => setDirection('down')}
                               className={cn(
                                 "h-32 rounded-3xl border-2 flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden group",
                                 direction === 'down'
                                   ? "bg-danger/10 border-danger text-danger shadow-[0_0_40px_rgba(255,46,91,0.15)]"
                                   : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
                               )}
                             >
                                <TrendingDown size={28} />
                                <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Lower</span>
                             </button>
                          </div>

                          <div className="space-y-6 mb-8 relative z-10">
                             <div>
                                <div className="flex justify-between items-center mb-3 px-1">
                                   <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Magnitude</label>
                                   <span className="text-[10px] font-bold text-primary uppercase">Bal: {userData?.points.toLocaleString() || '0'}</span>
                                </div>
                                <input
                                  type="number"
                                  value={predictionAmount}
                                  onChange={(e) => setPredictionAmount(Number(e.target.value))}
                                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-5 text-lg font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                                />
                             </div>

                             <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                   <span className="text-white/30">Node Accuracy</span>
                                   <span className="text-success">94.2%</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                   <span className="text-white/30">Est. Payout</span>
                                   <span className="text-white">{predictionAmount * 1.85} PTS</span>
                                </div>
                             </div>
                          </div>

                          <Button
                            onClick={handlePredict}
                            disabled={isSubmitting || !direction}
                            glow
                            className="w-full py-6 text-[11px] font-bold uppercase tracking-[0.3em]"
                          >
                             {isSubmitting ? 'Syncing Node...' : 'Authorize Position'}
                          </Button>

                          <button
                            onClick={() => setSelectedAsset(null)}
                            className="w-full mt-4 text-[10px] font-bold text-white/20 hover:text-white uppercase tracking-widest transition-colors"
                          >
                             Discard Position
                          </button>
                       </Card>
                    </motion.div>
                 ) : (
                    <motion.div
                      key="empty-state"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-12 rounded-[3rem] bg-white/[0.01] border border-dashed border-white/10 text-center space-y-6"
                    >
                       <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto text-white/10">
                          <Target size={40} />
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">Awaiting Objective</h4>
                          <p className="text-[11px] text-white/20 mt-2 leading-relaxed">Select an asset from the market feed to open a predictive position.</p>
                       </div>
                    </motion.div>
                 )}
              </AnimatePresence>

              {/* MARKET SENTIMENT WIDGET */}
              <Card className="p-8 border-white/[0.05] bg-[#0A0A0F]">
                 <div className="flex items-center gap-3 mb-6">
                    <Activity size={16} className="text-primary" />
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">Global Pulse</h4>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <span className="text-2xl font-bold text-success">Bullish</span>
                       <span className="text-xl font-mono font-bold text-white/40">72%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                       <div className="h-full bg-success w-[72%] shadow-[0_0_10px_rgba(34,197,94,0.3)]" />
                       <div className="h-full bg-danger/40 w-[28%]" />
                    </div>
                    <p className="text-[10px] text-white/20 leading-relaxed font-medium uppercase tracking-tight">Institutional nodes detecting heavy buy-side flow in major liquidity zones.</p>
                 </div>
              </Card>
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predict;
