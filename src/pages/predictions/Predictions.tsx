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
      reward: 2500,
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
                 {allMarkets.map((market) => {
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
                                   <span className="text-[10px] font-mono font-bold text-white">+{market.reward.toLocaleString()} PTS</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-white/20">
                                   <Activity size={10} />
                                   <span className="text-[9px] font-bold uppercase tracking-widest">{market.participants.toLocaleString()}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    );
                 })}
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
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
                 <motion.div
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                   onClick={() => setSelectedMarketId(null)}
                 />
                 <motion.div
                   initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                   className="relative w-full max-w-6xl h-full max-h-[850px] bg-surface-bright rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row overflow-hidden"
                 >
                    {/* LEFT: ANALYSIS & CHART */}
                    <div className="flex-1 p-8 lg:p-12 flex flex-col overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-white/5">
                       <div className="flex justify-between items-start mb-10">
                          <div className="space-y-4 flex-1">
                             <div className="flex items-center gap-3">
                                <span className={cn(
                                   "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                   activeMarket.isCampaign ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.03] text-white/40 border-white/[0.05]"
                                )}>
                                   {activeMarket.isCampaign ? 'Featured Discovery' : 'Market Opportunity'}
                                </span>
                             </div>
                             <h2 className="text-3xl lg:text-5xl font-bold text-white tracking-tighter leading-none italic">{activeMarket.question}</h2>
                          </div>
                          <button onClick={() => setSelectedMarketId(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-all md:hidden">
                             <X size={24} />
                          </button>
                       </div>

                       <div className="flex-1 bg-black/20 rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden flex flex-col">
                          <div className="flex justify-between items-center mb-8">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                                   <LineChart size={20} className="text-primary" />
                                </div>
                                <div>
                                   <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-0.5">Mark Price</p>
                                   <p className="text-2xl font-mono font-bold text-white">${(coinData?.current_price || 0).toLocaleString()}</p>
                                </div>
                             </div>
                             <div className="hidden lg:flex items-center gap-6">
                                <div className="text-right">
                                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">24h Vol</p>
                                   <p className="text-xs font-mono font-bold text-success">${(coinData?.total_volume || 0).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Market Cap</p>
                                   <p className="text-xs font-mono font-bold text-primary">${(coinData?.market_cap || 0).toLocaleString()}</p>
                                </div>
                             </div>
                          </div>
                          <div className="flex-1">
                             <PredictionChart assetId={activeMarket.assetId} symbol={activeMarket.symbol} />
                          </div>
                       </div>
                    </div>

                    {/* RIGHT: ACTION PANEL */}
                    <div className="w-full md:w-[420px] bg-black/40 p-8 lg:p-12 flex flex-col justify-between shrink-0">
                       <div className="space-y-12">
                          <div className="flex justify-between items-start">
                             <div className="space-y-1.5">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Forecast Control</p>
                                <h3 className="text-xl font-bold text-white uppercase tracking-tight">Confirm Position</h3>
                             </div>
                             <button onClick={() => setSelectedMarketId(null)} className="p-3 hover:bg-white/5 rounded-2xl transition-all hidden md:block">
                                <X size={24} />
                             </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                             <button
                               onClick={() => setPrediction('UP')}
                               className={cn(
                                 "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4 group overflow-hidden relative",
                                 prediction === 'UP' ? "bg-success/10 border-success shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:border-success/30"
                               )}
                             >
                                <div className={cn(
                                   "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                                   prediction === 'UP' ? "bg-success text-white" : "bg-white/[0.03] text-white/20"
                                )}>
                                   <ArrowUpRight size={32} />
                                </div>
                                <div className="text-center">
                                   <p className={cn("font-black uppercase tracking-[0.1em] text-xs", prediction === 'UP' ? "text-success" : "text-white/40")}>Predict Up</p>
                                   <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1 italic">Price will increase</p>
                                </div>
                             </button>

                             <button
                               onClick={() => setPrediction('DOWN')}
                               className={cn(
                                 "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4 group overflow-hidden relative",
                                 prediction === 'DOWN' ? "bg-danger/10 border-danger shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:border-danger/30"
                               )}
                             >
                                <div className={cn(
                                   "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
                                   prediction === 'DOWN' ? "bg-danger text-white" : "bg-white/[0.03] text-white/20"
                                )}>
                                   <ArrowDownRight size={32} />
                                </div>
                                <div className="text-center">
                                   <p className={cn("font-black uppercase tracking-[0.1em] text-xs", prediction === 'DOWN' ? "text-danger" : "text-white/40")}>Predict Down</p>
                                   <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1 italic">Price will decrease</p>
                                </div>
                             </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div className="p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.03] space-y-2">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Reward</p>
                                <div className="flex items-center gap-1.5">
                                   <Zap size={10} className="text-primary" />
                                   <span className="text-sm font-mono font-bold text-white">+{activeMarket.reward}</span>
                                </div>
                             </div>
                             <div className="p-6 rounded-[1.5rem] bg-white/[0.01] border border-white/[0.03] space-y-2">
                                <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">Fee</p>
                                <span className="text-sm font-mono font-bold text-white">100 PTS</span>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                             <Info size={14} className="text-primary shrink-0" />
                             <p className="text-[9px] font-bold text-text-secondary leading-normal italic">
                                Positions settle at the next market resolution cycle. Final submission is immutable.
                             </p>
                          </div>
                          <Button
                            className="w-full h-16 bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl disabled:opacity-20 transition-all active:scale-[0.98] italic shadow-2xl shadow-primary/10"
                            disabled={!prediction || isSubmitting}
                            isLoading={isSubmitting}
                            onClick={handlePredict}
                          >
                             Submit Prediction
                          </Button>
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
