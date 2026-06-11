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
  Target,
  ArrowUpRight,
  ArrowDownRight,
  History,
  LayoutGrid,
  ShieldCheck
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
  const [viewMode, setViewMode] = useState<'MARKETS' | 'POSITIONS'>('MARKETS');

  // Automated global markets from live data
  const globalMarkets = useMemo(() => marketData.slice(0, 6).map(coin => ({
    id: `global_${coin.id}`,
    assetId: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    question: `Will ${coin.symbol.toUpperCase()} close higher in 24h?`,
    prize: 2500,
    type: 'GLOBAL',
    participants: Math.floor(Math.random() * 1000) + 500,
    image: coin.image,
    price: coin.current_price,
    change: coin.price_change_percentage_24h
  })), [marketData]);

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

  // Combine markets
  const allMarkets = useMemo(() => {
    const campaignMarkets = campaigns.map(c => ({
      id: c.id,
      assetId: (c as any).predictionAsset || 'bitcoin',
      symbol: (c as any).predictionSymbol || 'BTC',
      name: c.name,
      question: c.predictionQuestion || c.description,
      prize: c.totalPrizePool || 5000,
      type: 'SPONSORED',
      participants: c.participantsCount || 0,
      image: '',
      price: 0,
      change: 0
    }));
    return [...campaignMarkets, ...globalMarkets];
  }, [campaigns, globalMarkets]);

  // Set initial selection
  useEffect(() => {
    if (allMarkets.length > 0 && !selectedMarketId) {
      setSelectedMarketId(allMarkets[0].id);
    }
  }, [allMarkets, selectedMarketId]);

  const activeMarket = allMarkets.find(m => m.id === selectedMarketId) || allMarkets[0];
  const coinData = marketData.find(c => c.id === activeMarket?.assetId);

  const handlePredict = async () => {
    if (!currentUser || !prediction || !userData || !activeMarket) return;

    const stake = 100;
    if (userData.points < stake) return toast.error('Insufficient Balance');

    const existing = userPredictions.find(p => p.taskId === activeMarket.id && p.status === 'ACTIVE');
    if (existing) return toast.error('Market position already authorized');

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
         entryPrice: coinData?.current_price || activeMarket.price || 0,
         claimId: predId
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Execution Authorized');
      setPrediction(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPositions = userPredictions.filter(p => p.status === 'ACTIVE');

  return (
    <MainLayout>
      <div className="pt-24 min-h-screen bg-[#050507] flex flex-col">
        {/* TOP BAR / NAVIGATION */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/40 backdrop-blur-xl shrink-0 z-20">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Market Engine Synchronized</span>
              </div>
           </div>

           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setViewMode('MARKETS')}
                className={cn(
                  "px-6 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  viewMode === 'MARKETS' ? "bg-white text-black" : "text-text-tertiary hover:text-white"
                )}
              >
                Forecast Hub
              </button>
              <button
                onClick={() => setViewMode('POSITIONS')}
                className={cn(
                  "px-6 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  viewMode === 'POSITIONS' ? "bg-white text-black" : "text-text-tertiary hover:text-white"
                )}
              >
                Positions {openPositions.length > 0 && <span className="bg-primary/20 text-primary px-1.5 rounded-md">{openPositions.length}</span>}
              </button>
           </div>

           <div className="flex items-center gap-4">
              <div className="text-right">
                 <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Available Capital</p>
                 <p className="text-sm font-mono font-bold text-white">{(userData?.points || 0).toLocaleString()} <span className="text-[10px] text-primary">PTS</span></p>
              </div>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
           {/* LEFT SIDEBAR: MARKET LIST */}
           <div className="w-80 border-r border-white/5 bg-black/20 flex flex-col shrink-0">
              <div className="p-6 border-b border-white/5">
                 <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Market Select</h2>
                    <LayoutGrid size={14} className="text-text-tertiary" />
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <div className="p-2 space-y-1">
                    {allMarkets.map((market) => {
                       const mCoin = marketData.find(c => c.id === market.assetId);
                       const isSelected = selectedMarketId === market.id;
                       const isNegative = (mCoin?.price_change_percentage_24h || 0) < 0;

                       return (
                          <button
                            key={market.id}
                            onClick={() => setSelectedMarketId(market.id)}
                            className={cn(
                              "w-full p-4 rounded-2xl transition-all flex items-center gap-4 group",
                              isSelected ? "bg-white/5 border border-white/10" : "hover:bg-white/[0.02] border border-transparent"
                            )}
                          >
                             <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 p-2 shrink-0">
                                <img src={mCoin?.image || market.image} className="w-full h-full object-contain" alt="" />
                             </div>
                             <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center justify-between">
                                   <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{market.name}</p>
                                   <span className={cn(
                                     "text-[8px] font-bold font-mono",
                                     isNegative ? "text-danger" : "text-success"
                                   )}>
                                      {isNegative ? '' : '+'}{mCoin?.price_change_percentage_24h.toFixed(1)}%
                                   </span>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                   <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{market.symbol}</p>
                                   <p className="text-[10px] font-mono font-bold text-white/40">${(mCoin?.current_price || 0).toLocaleString()}</p>
                                </div>
                             </div>
                          </button>
                       );
                    })}
                 </div>
              </div>
           </div>

           {/* MAIN TERMINAL */}
           <div className="flex-1 flex flex-col relative">
              <AnimatePresence mode="wait">
                 {viewMode === 'MARKETS' ? (
                    <motion.div
                      key="hub"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex overflow-hidden"
                    >
                       {/* CENTER: CHART & STATS */}
                       <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar">
                          {activeMarket ? (
                             <div className="max-w-4xl w-full mx-auto space-y-8">
                                <div className="flex items-start justify-between">
                                   <div className="space-y-4">
                                      <div className="flex items-center gap-3">
                                         <span className={cn(
                                           "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                                           activeMarket.type === 'SPONSORED' ? "bg-primary/20 text-primary border border-primary/20" : "bg-white/5 text-white/40 border border-white/10"
                                         )}>
                                            {activeMarket.type}
                                         </span>
                                         <div className="flex items-center gap-2 text-text-tertiary">
                                            <Activity size={12} />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{(activeMarket.participants || 0).toLocaleString()} Active Forecasts</span>
                                         </div>
                                      </div>
                                      <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">
                                         {activeMarket.question}
                                      </h1>
                                   </div>

                                   <div className="text-right">
                                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Execution Reward</p>
                                      <div className="flex items-center gap-2 justify-end">
                                         <Zap size={16} className="text-primary" />
                                         <span className="text-2xl font-mono font-bold text-white">+{activeMarket.prize.toLocaleString()} <span className="text-xs uppercase text-text-tertiary">pts</span></span>
                                      </div>
                                   </div>
                                </div>

                                <div className="bg-black/40 rounded-[2.5rem] border border-white/5 p-8 backdrop-blur-xl relative overflow-hidden group">
                                   <div className="absolute top-8 right-8 z-10 flex items-center gap-4">
                                      <div className="px-4 py-2 bg-black/60 rounded-xl border border-white/10">
                                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Last Price</p>
                                         <p className="text-lg font-mono font-bold text-white">${(coinData?.current_price || 0).toLocaleString()}</p>
                                      </div>
                                   </div>
                                   <PredictionChart
                                     assetId={activeMarket.assetId}
                                     symbol={activeMarket.symbol}
                                   />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                      <div className="flex items-center gap-2 text-text-tertiary">
                                         <Target size={14} />
                                         <span className="text-[9px] font-bold uppercase tracking-widest">Market Confidence</span>
                                      </div>
                                      <p className="text-xl font-bold text-white uppercase italic">High Volatility</p>
                                   </div>
                                   <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                      <div className="flex items-center gap-2 text-text-tertiary">
                                         <Clock size={14} />
                                         <span className="text-[9px] font-bold uppercase tracking-widest">Settlement Period</span>
                                      </div>
                                      <p className="text-xl font-bold text-white uppercase italic">T + 24 Hours</p>
                                   </div>
                                   <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                      <div className="flex items-center gap-2 text-text-tertiary">
                                         <ShieldCheck size={14} />
                                         <span className="text-[9px] font-bold uppercase tracking-widest">Resolution Engine</span>
                                      </div>
                                      <p className="text-xl font-bold text-white uppercase italic">CoinGecko Oracle</p>
                                   </div>
                                </div>
                             </div>
                          ) : (
                             <div className="flex-1 flex items-center justify-center">
                                <div className="text-center space-y-4 opacity-20">
                                   <Activity size={48} className="mx-auto" />
                                   <p className="text-xs font-black uppercase tracking-[0.4em]">Initializing Core Engine</p>
                                </div>
                             </div>
                          )}
                       </div>

                       {/* RIGHT: EXECUTION PANEL */}
                       <div className="w-[400px] border-l border-white/5 bg-black/20 p-8 flex flex-col justify-between shrink-0">
                          <div className="space-y-10">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Capital Execution</p>
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Authorize Forecast</h3>
                             </div>

                             <div className="space-y-4">
                                <button
                                  onClick={() => setPrediction('UP')}
                                  className={cn(
                                    "w-full p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group",
                                    prediction === 'UP' ? "bg-success/10 border-success text-success shadow-lg shadow-success/10" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-success/30 hover:text-success"
                                  )}
                                >
                                   <div className={cn("p-4 rounded-2xl", prediction === 'UP' ? "bg-success/20" : "bg-white/5 group-hover:bg-success/10")}>
                                      <ArrowUpRight size={32} />
                                   </div>
                                   <div className="text-center">
                                      <p className="font-black uppercase tracking-[0.2em] text-xs italic">BULLISH MARKET</p>
                                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1">Target higher valuation</p>
                                   </div>
                                </button>

                                <button
                                  onClick={() => setPrediction('DOWN')}
                                  className={cn(
                                    "w-full p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 group",
                                    prediction === 'DOWN' ? "bg-danger/10 border-danger text-danger shadow-lg shadow-danger/10" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-danger/30 hover:text-danger"
                                  )}
                                >
                                   <div className={cn("p-4 rounded-2xl", prediction === 'DOWN' ? "bg-danger/20" : "bg-white/5 group-hover:bg-danger/10")}>
                                      <ArrowDownRight size={32} />
                                   </div>
                                   <div className="text-center">
                                      <p className="font-black uppercase tracking-[0.2em] text-xs italic">BEARISH MARKET</p>
                                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1">Target lower valuation</p>
                                   </div>
                                </button>
                             </div>

                             <div className="bg-black/40 rounded-3xl p-6 border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Authorization Cost</span>
                                   <span className="text-sm font-mono font-bold text-white uppercase">100.00 pts</span>
                                </div>
                                <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Network Authority</span>
                                   <span className="text-sm font-mono font-bold text-success uppercase">Verified</span>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <Button
                               className="w-full h-20 bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.4em] text-[12px] rounded-[1.5rem] disabled:opacity-20 transition-all shadow-2xl active:scale-[0.98] italic"
                               disabled={!prediction || isSubmitting}
                               isLoading={isSubmitting}
                               onClick={handlePredict}
                             >
                                Confirm Execution
                             </Button>
                             <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest text-center px-4 leading-relaxed">
                                Execution is permanent. Reward distribution occurs automatically upon market resolution.
                             </p>
                          </div>
                       </div>
                    </motion.div>
                 ) : (
                    <motion.div
                      key="positions"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                      className="flex-1 p-12 overflow-y-auto custom-scrollbar"
                    >
                       <div className="max-w-5xl mx-auto space-y-12">
                          <header className="flex items-center justify-between">
                             <div className="space-y-2">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Portfolio Overview</h2>
                                <p className="text-sm text-text-secondary font-medium tracking-wide">Historical authorization and live market positions.</p>
                             </div>
                             <div className="flex gap-8">
                                <div className="text-right">
                                   <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Authorization Success</p>
                                   <p className="text-2xl font-mono font-bold text-success">{(userData?.stats?.totalWins || 0)}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Win Rate</p>
                                   <p className="text-2xl font-mono font-bold text-primary">
                                      {((userData?.stats?.totalWins || 0) / (userData?.stats?.predictionsCount || 1) * 100).toFixed(1)}%
                                   </p>
                                </div>
                             </div>
                          </header>

                          <div className="grid grid-cols-1 gap-4">
                             {userPredictions.map((pred) => (
                                <div key={pred.id} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                                   <div className="flex items-center gap-8">
                                      <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center border text-2xl",
                                        pred.status === 'RESOLVED' ? "bg-success/5 border-success/20 text-success" : "bg-primary/5 border-primary/20 text-primary"
                                      )}>
                                         {pred.direction === 'UP' ? <TrendingUp /> : <TrendingDown />}
                                      </div>
                                      <div className="space-y-1">
                                         <div className="flex items-center gap-3">
                                            <p className="text-lg font-black text-white uppercase tracking-tight italic">{pred.symbol} FORECAST</p>
                                            <span className={cn(
                                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                              pred.status === 'RESOLVED' ? "bg-success/20 text-success" : "bg-primary/20 text-primary"
                                            )}>{pred.status}</span>
                                         </div>
                                         <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                                            AUTHORIZED: {pred.createdAt?.toDate?.().toLocaleDateString()}
                                         </p>
                                      </div>
                                   </div>

                                   <div className="flex gap-12">
                                      <div className="text-right">
                                         <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Entry Value</p>
                                         <p className="text-xl font-mono font-bold text-white">${pred.entryPrice.toLocaleString()}</p>
                                      </div>
                                      <div className="text-right w-24">
                                         <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Result</p>
                                         {pred.status === 'RESOLVED' ? (
                                            <p className={cn(
                                              "text-xl font-mono font-bold",
                                              (pred.rewardAmount || 0) > 0 ? "text-success" : "text-danger"
                                            )}>
                                               {(pred.rewardAmount || 0) > 0 ? `+${pred.rewardAmount}` : '0'} <span className="text-[10px]">pts</span>
                                            </p>
                                         ) : (
                                            <p className="text-xl font-mono font-bold text-white/20">--</p>
                                         )}
                                      </div>
                                   </div>
                                </div>
                             ))}

                             {userPredictions.length === 0 && (
                                <div className="py-32 text-center border border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center gap-6 opacity-20">
                                   <History size={48} />
                                   <p className="text-xs font-black uppercase tracking-[0.4em]">Zero Execution Records</p>
                                </div>
                             )}
                          </div>
                       </div>
                    </motion.div>
                 )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Predictions;
