import React, { useState, useEffect, useMemo } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useCryptoData } from '../../hooks/useCryptoData';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Campaign, PredictionRecord } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Info,
  X,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import PredictionChart from './components/PredictionChart';

const Predictions: React.FC = () => {
  const { marketData } = useCryptoData();
  const { currentUser, userData } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userPredictions, setUserPredictions] = useState<PredictionRecord[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalView, setTerminalView] = useState<'EXPLORE' | 'PORTFOLIO'>('EXPLORE');

  // Unified global markets from live data + admin campaigns
  const allMarkets = useMemo(() => {
    const campaignMarkets = campaigns.map(c => ({
      id: c.id,
      assetId: (c as any).predictionAsset || 'bitcoin',
      symbol: (c as any).predictionSymbol || 'BTC',
      name: c.name,
      question: c.predictionQuestion || c.description,
      reward: c.totalPrizePool || 5000,
      participants: c.participantsCount || 0,
      isCampaign: true,
      image: ''
    }));

    const globalMarkets = marketData.slice(0, 10).map(coin => ({
      id: `global_${coin.id}`,
      assetId: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: `${coin.name} Market`,
      question: `Will ${coin.name} valuation increase in 24h?`,
      reward: 1250,
      participants: Math.floor(Math.random() * 2000) + 1000,
      isCampaign: false,
      image: coin.image,
      price: coin.current_price,
      change: coin.price_change_percentage_24h,
      high_24h: (coin as any).high_24h,
      low_24h: (coin as any).low_24h,
      total_volume: coin.total_volume,
      market_cap: coin.market_cap
    }));

    return [...campaignMarkets, ...globalMarkets];
  }, [campaigns, marketData]);

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), where('category', '==', 'PREDICTION'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });

    if (currentUser) {
      const predQ = query(
        collection(db, 'user_predictions'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      onSnapshot(predQ, (snap) => {
        setUserPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PredictionRecord)));
      });
    }

    return () => unsubscribe();
  }, [currentUser]);

  const activeMarket = allMarkets.find(m => m.id === selectedMarketId);
  const coinData = marketData.find(c => c.id === activeMarket?.assetId);

  const handlePredict = async () => {
    if (!currentUser || !prediction || !userData || !activeMarket) return;

    const stake = 100;
    if (userData.points < stake) return toast.error('Insufficient points for this forecast.');

    const existing = userPredictions.find(p => p.taskId === activeMarket.id && p.status === 'ACTIVE');
    if (existing) return toast.error('Active forecast already exists for this market.');

    setIsSubmitting(true);
    try {
      const { PointTransactionEngine } = await import('../../engines/points/PointTransactionEngine');
      const predId = `${currentUser.uid}_${activeMarket.id}_${Date.now()}`;

      const result = await PointTransactionEngine.executePrediction({
         userId: currentUser.uid,
         taskId: activeMarket.id,
         amount: stake,
         assetId: activeMarket.assetId,
         symbol: activeMarket.symbol,
         direction: prediction,
         entryPrice: coinData?.current_price || (activeMarket as any).price || 0,
         claimId: predId
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Forecast Submitted');
      setPrediction(null);
      setSelectedMarketId(null);
    } catch (err: any) {
      toast.error(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePositions = userPredictions.filter(p => p.status === 'ACTIVE');
  const { loading: marketLoading } = useCryptoData();

  return (
    <MainLayout>
      <div className="pt-24 pb-20 min-h-screen bg-[#050507] px-6 max-w-7xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <Target size={14} className="text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Live Forecasting</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none italic">
                 Prediction
              </h1>
           </div>

           <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05] shrink-0">
              <button
                onClick={() => setTerminalView('EXPLORE')}
                className={cn(
                  "px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  terminalView === 'EXPLORE' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                )}
              >
                Explore
              </button>
              <button
                onClick={() => setTerminalView('PORTFOLIO')}
                className={cn(
                  "px-8 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  terminalView === 'PORTFOLIO' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                )}
              >
                Portfolio {activePositions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
           </div>
        </header>

        <AnimatePresence mode="wait">
           {terminalView === 'EXPLORE' ? (
              <motion.div
                key="explore"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                 {marketLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                       <div key={i} className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.03] animate-pulse h-64 space-y-8">
                          <div className="flex justify-between items-start">
                             <div className="w-12 h-12 rounded-xl bg-white/5" />
                             <div className="space-y-2">
                                <div className="h-3 w-20 bg-white/5 rounded" />
                                <div className="h-2 w-12 bg-white/5 rounded ml-auto" />
                             </div>
                          </div>
                          <div className="space-y-3">
                             <div className="h-4 w-full bg-white/5 rounded" />
                             <div className="h-4 w-2/3 bg-white/5 rounded" />
                          </div>
                          <div className="pt-4 border-t border-white/[0.03] flex justify-between">
                             <div className="h-3 w-16 bg-white/5 rounded" />
                             <div className="h-3 w-12 bg-white/5 rounded" />
                          </div>
                       </div>
                    ))
                 ) : (
                    allMarkets.map((market) => {
                       const mCoin = marketData.find(c => c.id === market.assetId);
                       const isNegative = (mCoin?.price_change_percentage_24h || 0) < 0;

                       return (
                          <div
                            key={market.id}
                            onClick={() => setSelectedMarketId(market.id)}
                            className="group p-6 rounded-[2rem] bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.03] hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                          >
                             <div className="flex justify-between items-start mb-8">
                                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/[0.05] p-2 flex items-center justify-center">
                                   {mCoin?.image ? (
                                      <img src={mCoin.image} className="w-full h-full object-contain" alt="" />
                                   ) : (
                                      <Zap size={18} className="text-primary" />
                                   )}
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-mono font-bold text-white">${(mCoin?.current_price || 0).toLocaleString()}</p>
                                   <span className={cn(
                                     "text-[9px] font-bold",
                                     isNegative ? "text-danger" : "text-success"
                                   )}>
                                      {isNegative ? '' : '+'}{mCoin?.price_change_percentage_24h?.toFixed(1)}%
                                   </span>
                                </div>
                             </div>

                             <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                   {market.question}
                                </h3>
                                <div className="flex items-center justify-between pt-4 border-t border-white/[0.03]">
                                   <div className="flex items-center gap-1.5">
                                      <Zap size={10} className="text-primary" />
                                      <span className="text-[10px] font-mono font-bold text-white">Potential Return: 2× Stake</span>
                                   </div>
                                   <div className="flex items-center gap-1.5 text-white/20">
                                      <Activity size={10} />
                                      <span className="text-[9px] font-bold uppercase tracking-widest">{market.participants.toLocaleString()}</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                       );
                    })
                 )}
              </motion.div>
           ) : (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                 {userPredictions.map((pred) => (
                    <div key={pred.id} className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between group hover:bg-white/[0.02] transition-all">
                       <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border text-lg transition-all",
                            pred.status === 'RESOLVED' ? "bg-success/5 border-success/10 text-success" : "bg-primary/5 border-primary/10 text-primary"
                          )}>
                             {pred.direction === 'UP' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="space-y-1">
                             <div className="flex items-center gap-3">
                                <p className="text-sm font-bold text-white uppercase tracking-tight">{pred.symbol} Forecast</p>
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                                  pred.status === 'RESOLVED' ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"
                                )}>{pred.status}</span>
                             </div>
                             <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
                                {pred.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                             </p>
                          </div>
                       </div>

                       <div className="flex items-center gap-10 text-right">
                          <div className="hidden md:block">
                             <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">Entry</p>
                             <p className="text-sm font-mono font-bold text-white">${pred.entryPrice.toLocaleString()}</p>
                          </div>
                          <div className="w-24">
                             <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">Payout</p>
                             {pred.status === 'RESOLVED' ? (
                                <p className={cn(
                                  "text-sm font-mono font-bold",
                                  (pred.rewardAmount || 0) > 0 ? "text-success" : "text-white/20"
                                )}>
                                   {(pred.rewardAmount || 0) > 0 ? `+${pred.rewardAmount}` : '0'} PTS
                                </p>
                             ) : (
                                <div className="flex items-center justify-end gap-1.5 text-primary">
                                   <Clock size={10} />
                                   <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 ))}

                 {userPredictions.length === 0 && (
                    <div className="py-24 text-center border border-dashed border-white/[0.05] rounded-[2rem] flex flex-col items-center gap-4 opacity-20">
                       <Activity size={40} />
                       <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Active Positions</p>
                    </div>
                 )}
              </motion.div>
           )}
        </AnimatePresence>

        {/* PREDICTION DETAIL PANEL */}
        <AnimatePresence>
           {selectedMarketId && activeMarket && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center">
                 <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                   onClick={() => setSelectedMarketId(null)}
                 />
                 <motion.div
                   initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
                   className="relative w-full max-w-5xl h-full md:h-[min(900px,90vh)] bg-[#08080C] md:rounded-[3rem] border-t md:border border-white/5 shadow-2xl flex flex-col overflow-hidden"
                 >
                    {/* Unified Top Header */}
                    <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between shrink-0">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
                             {coinData?.image ? <img src={coinData.image} className="w-6 h-6 object-contain" alt="" /> : <Zap size={18} className="text-primary" />}
                          </div>
                          <div>
                             <h2 className="text-lg font-bold text-white tracking-tight uppercase">{activeMarket.symbol} Forecast</h2>
                             <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{activeMarket.isCampaign ? 'Featured Market' : 'Standard Market'}</p>
                          </div>
                       </div>
                       <button onClick={() => setSelectedMarketId(null)} className="p-2.5 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white">
                          <X size={20} />
                       </button>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                       {/* ANALYSIS STAGE */}
                       <div className="flex-1 overflow-y-auto custom-scrollbar p-8 lg:p-10 space-y-10">
                          <div className="space-y-4">
                             <h3 className="text-3xl lg:text-4xl font-bold text-white tracking-tighter leading-none italic">{activeMarket.question}</h3>
                             <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                   <LineChart size={14} className="text-primary" />
                                   <span className="text-xl font-mono font-bold text-white">${(coinData?.current_price || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                                   <div className="text-right">
                                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">24h Vol</p>
                                      <p className="text-[11px] font-mono font-bold text-success">${(coinData?.total_volume || 0).toLocaleString()}</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Market Cap</p>
                                      <p className="text-[11px] font-mono font-bold text-primary">${(coinData?.market_cap || 0).toLocaleString()}</p>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="aspect-[16/10] md:aspect-auto md:flex-1 bg-black/40 rounded-[2rem] border border-white/5 p-4 min-h-[300px]">
                             <PredictionChart assetId={activeMarket.assetId} symbol={activeMarket.symbol} />
                          </div>
                       </div>

                       {/* STICKY ACTION PANEL */}
                       <div className="w-full md:w-[380px] bg-black/40 border-t md:border-t-0 md:border-l border-white/5 p-8 flex flex-col justify-between shrink-0">
                          <div className="space-y-8">
                             <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Set Direction</p>
                                <h4 className="text-xl font-bold text-white italic">Confirm Prediction</h4>
                             </div>

                             <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                                <button
                                  onClick={() => setPrediction('UP')}
                                  className={cn(
                                    "p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                    prediction === 'UP' ? "bg-success/10 border-success shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:border-success/30"
                                  )}
                                >
                                   <ArrowUpRight size={32} className={cn("transition-all", prediction === 'UP' ? "text-success scale-110" : "text-white/20")} />
                                   <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'UP' ? "text-success" : "text-white/40")}>Predict Up</p>
                                </button>

                                <button
                                  onClick={() => setPrediction('DOWN')}
                                  className={cn(
                                    "p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                    prediction === 'DOWN' ? "bg-danger/10 border-danger shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:border-danger/30"
                                  )}
                                >
                                   <ArrowDownRight size={32} className={cn("transition-all", prediction === 'DOWN' ? "text-danger scale-110" : "text-white/20")} />
                                   <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'DOWN' ? "text-danger" : "text-white/40")}>Predict Down</p>
                                </button>
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Potential Return</p>
                                   <div className="flex items-center gap-1.5">
                                      <Zap size={10} className="text-primary" />
                                      <span className="text-xs font-mono font-bold text-white">200 PTS</span>
                                   </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Platform Fee</p>
                                   <span className="text-xs font-mono font-bold text-white">100 PTS</span>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-4 mt-8">
                             <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                <Info size={14} className="text-primary shrink-0 mt-0.5" />
                                <p className="text-[9px] font-bold text-text-secondary leading-normal italic">
                                   Final submissions are immutable and settle automatically upon market expiration.
                                </p>
                             </div>
                             <Button
                               className="w-full h-14 md:h-16 bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-xl disabled:opacity-20 transition-all active:scale-[0.98] italic"
                               disabled={!prediction || isSubmitting}
                               isLoading={isSubmitting}
                               onClick={handlePredict}
                             >
                                Submit Prediction
                             </Button>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              </div>
           )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
};

export default Predictions;
