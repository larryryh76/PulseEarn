import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCryptoData } from '../hooks/useCryptoData';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Activity,
  Zap,
  Search,
  Flame,
  ArrowRight,
  X,
  History
} from 'lucide-react';
import { cn } from '../utils';
import Skeleton from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { motion, AnimatePresence } from 'framer-motion';
import PredictionHistoryDrawer from '../components/ui/PredictionHistoryDrawer';
import { Timestamp } from 'firebase/firestore';

const Predict: React.FC = () => {
  const { userData } = useAuth();
  const { marketData, loading, error } = useCryptoData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [predictionAmount, setPredictionAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Mock predictions for demo purposes
  const mockPredictions: any[] = [
    {
      id: '1',
      asset: 'BTC',
      assetImage: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      direction: 'up',
      amount: 500,
      payout: 925,
      status: 'won',
      timestamp: Timestamp.now(),
      expiryTimestamp: Timestamp.now(),
      entryPrice: 64200.50,
      exitPrice: 65100.20,
      xpEarned: 50
    },
    {
      id: '2',
      asset: 'ETH',
      assetImage: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      direction: 'down',
      amount: 200,
      payout: 370,
      status: 'lost',
      timestamp: Timestamp.now(),
      expiryTimestamp: Timestamp.now(),
      entryPrice: 3450.10,
      exitPrice: 3520.40,
      xpEarned: 10
    }
  ];

  const filteredAssets = marketData?.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handlePredict = async () => {
    if (!direction) return toast.error('Select a direction');
    if (!userData) return toast.error('Auth required');
    if (userData.points < predictionAmount) return toast.error('Insufficient points');

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Position Opened: ${selectedAsset?.symbol.toUpperCase()} ${direction.toUpperCase()}!`);
      setSelectedAsset(null);
      setDirection(null);
    } catch (err) {
      toast.error('Prediction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error && (!marketData || marketData.length === 0)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 px-6">
           <AlertCircle size={40} className="text-danger opacity-50" />
           <h2 className="text-lg font-bold">Market Feed Offline</h2>
           <p className="text-white/40 max-w-xs mx-auto text-xs">Unable to connect to live market data.</p>
           <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">

        <ErrorBoundary name="PredictHeader">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
             <div className="space-y-1">
                <div className="flex items-center gap-2 text-accent font-bold">
                   <Zap size={14} />
                   <span className="text-[9px] uppercase tracking-widest">Market Predictor</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white">Price Forecasts</h1>
                <p className="text-white/40 text-xs font-medium">Predict the market direction and earn points.</p>
             </div>

             <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                      <Search size={16} />
                   </div>
                   <input
                     type="text"
                     placeholder="Search..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-all"
                   />
                </div>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="w-11 h-11 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                   <History size={20} />
                </button>
             </div>
          </div>
        </ErrorBoundary>

        <div className="space-y-6">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                 <Flame size={14} className="text-orange-500" />
                 <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Market Feed</h3>
              </div>
              <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                 24h Change
              </div>
           </div>

           <div className="grid grid-cols-1 gap-3">
              {loading ? (
                 [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)
              ) : filteredAssets.map((asset) => (
                 <motion.div
                   layout
                   key={asset.id}
                   onClick={() => setSelectedAsset(asset)}
                   className={cn(
                     "group p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all flex items-center justify-between cursor-pointer"
                   )}
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 p-2 flex items-center justify-center">
                          <img src={asset.image} className="w-full h-full object-contain" alt="" />
                       </div>
                       <div>
                          <h4 className="text-sm font-bold text-white tracking-tight uppercase flex items-center gap-2">
                             {asset.symbol}/USDT
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                             <span className="text-xs font-mono font-bold text-white/60 tracking-tight">${asset.current_price.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "flex flex-col items-end",
                         asset.price_change_percentage_24h >= 0 ? "text-success" : "text-danger"
                       )}>
                          <div className="flex items-center gap-1 font-bold text-[11px]">
                             {asset.price_change_percentage_24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                             {Math.abs(asset.price_change_percentage_24h).toFixed(1)}%
                          </div>
                       </div>
                       <ArrowRight size={14} className="text-white/10" />
                    </div>
                 </motion.div>
              ))}
           </div>
        </div>

        {/* BOTTOM SHEET PREDICTION */}
        <AnimatePresence>
          {selectedAsset && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAsset(null)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-x-0 bottom-0 bg-[#0D0D12] z-[70] rounded-t-3xl border-t border-white/10 p-6 pb-10 flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={selectedAsset.image} className="w-8 h-8" alt="" />
                    <h2 className="text-lg font-bold">{selectedAsset.symbol?.toUpperCase()}/USDT</h2>
                  </div>
                  <button onClick={() => setSelectedAsset(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <X size={18} className="text-white/40" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDirection('up')}
                    className={cn(
                      "h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                      direction === 'up' ? "bg-success/10 border-success text-success" : "bg-white/[0.02] border-white/5 text-white/20"
                    )}
                  >
                    <TrendingUp size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Higher</span>
                  </button>
                  <button
                    onClick={() => setDirection('down')}
                    className={cn(
                      "h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all",
                      direction === 'down' ? "bg-danger/10 border-danger text-danger" : "bg-white/[0.02] border-white/5 text-white/20"
                    )}
                  >
                    <TrendingDown size={24} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Lower</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Amount</label>
                      <span className="text-[9px] font-bold text-primary">Points: {userData?.points.toLocaleString()}</span>
                    </div>
                    <input
                      type="number"
                      value={predictionAmount}
                      onChange={(e) => setPredictionAmount(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base font-bold focus:outline-none"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white/30">Potential Reward</span>
                    <span className="text-success">{(predictionAmount * 1.85).toFixed(0)} PTS</span>
                  </div>

                  <Button
                    onClick={handlePredict}
                    disabled={isSubmitting || !direction}
                    glow
                    className="w-full py-4 text-xs font-bold uppercase tracking-widest"
                  >
                    {isSubmitting ? 'Opening...' : 'Confirm Prediction'}
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* SENTIMENT */}
        <Card className="p-6 border-white/[0.05] bg-[#0A0A0F] rounded-2xl">
           <div className="flex items-center gap-3 mb-5">
              <Activity size={14} className="text-primary" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Market Sentiment</h4>
           </div>
           <div className="space-y-3">
              <div className="flex justify-between items-end">
                 <span className="text-xl font-bold text-success">Bullish</span>
                 <span className="text-lg font-mono font-bold text-white/40">72%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex">
                 <div className="h-full bg-success w-[72%]" />
                 <div className="h-full bg-danger/40 w-[28%]" />
              </div>
           </div>
        </Card>
      </div>

      <PredictionHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        predictions={mockPredictions}
      />
    </DashboardLayout>
  );
};

export default Predict;
