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
  ShieldCheck,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownRight,
  LineChart
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
  const [terminalView, setTerminalView] = useState<'FORECAST' | 'PORTFOLIO'>('FORECAST');

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
      change: coin.price_change_percentage_24h
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

  // Default selection
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

      toast.success('Forecast Authorized');
      setPrediction(null);
    } catch (err: any) {
      toast.error(err.message || 'Authorization failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePositions = userPredictions.filter(p => p.status === 'ACTIVE');

  return (
    <MainLayout>
      <div className="pt-24 min-h-screen bg-[#08080C] flex flex-col">
        {/* TERMINAL HEADER */}
        <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 z-20">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Market Prices Active</span>
              </div>
           </div>

           <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => setTerminalView('FORECAST')}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  terminalView === 'FORECAST' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                )}
              >
                Forecasting Hub
              </button>
              <button
                onClick={() => setTerminalView('PORTFOLIO')}
                className={cn(
                  "px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  terminalView === 'PORTFOLIO' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                )}
              >
                My Positions {activePositions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
           </div>

           <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                 <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">Available Balance</p>
                 <p className="text-sm font-mono font-bold text-white">{(userData?.points || 0).toLocaleString()} <span className="text-[10px] text-primary">PTS</span></p>
              </div>
           </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

           {/* MARKET SIDEBAR (MOBILE: Horizontal Scroll, DESKTOP: Left Vertical) */}
           <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/5 bg-black/20 flex flex-col shrink-0 z-10">
              <div className="p-6 border-b border-white/5 hidden lg:block">
                 <div className="flex items-center justify-between">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Active Markets</h2>
                    <LayoutGrid size={14} className="text-text-tertiary" />
                 </div>
              </div>

              <div className="flex-1 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:custom-scrollbar flex lg:flex-col p-2 lg:p-3 gap-2">
                 {allMarkets.map((market) => {
                    const mCoin = marketData.find(c => c.id === market.assetId);
                    const isSelected = selectedMarketId === market.id;
                    const isNegative = (mCoin?.price_change_percentage_24h || 0) < 0;

                    return (
                       <button
                         key={market.id}
                         onClick={() => { setSelectedMarketId(market.id); setTerminalView('FORECAST'); }}
                         className={cn(
                           "min-w-[240px] lg:min-w-0 w-full p-4 rounded-2xl transition-all flex items-center gap-4 group border shrink-0",
                           isSelected ? "bg-white/5 border-white/10" : "bg-transparent border-transparent hover:bg-white/[0.02]"
                         )}
                       >
                          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 p-2 flex items-center justify-center shrink-0">
                             {mCoin?.image ? (
                                <img src={mCoin.image} className="w-full h-full object-contain" alt="" />
                             ) : (
                                <Zap size={18} className="text-primary" />
                             )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                             <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{market.symbol}</p>
                                <span className={cn(
                                  "text-[9px] font-bold font-mono shrink-0",
                                  isNegative ? "text-danger" : "text-success"
                                )}>
                                   {isNegative ? '' : '+'}{mCoin?.price_change_percentage_24h?.toFixed(1)}%
                                </span>
                             </div>
                             <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">${(mCoin?.current_price || 0).toLocaleString()}</p>
                          </div>
                       </button>
                    );
                 })}
              </div>
           </aside>

           {/* MAIN EXPERIENCE STAGE */}
           <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-background/40 relative">
              <AnimatePresence mode="wait">
                 {terminalView === 'FORECAST' ? (
                    <motion.div
                      key="forecast"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="flex-1 flex flex-col lg:flex-row h-full"
                    >
                       {/* CENTER: DATA & CHART */}
                       <div className="flex-1 p-6 lg:p-12 space-y-10 overflow-y-auto no-scrollbar">
                          {activeMarket ? (
                             <div className="max-w-4xl mx-auto space-y-8">
                                <div className="space-y-4">
                                   <div className="flex items-center gap-3">
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                        activeMarket.isCampaign ? "bg-primary/10 text-primary border-primary/20" : "bg-white/5 text-white/40 border-white/10"
                                      )}>
                                         {activeMarket.isCampaign ? 'Featured' : 'Market'}
                                      </span>
                                      <div className="flex items-center gap-2 text-text-tertiary">
                                         <Activity size={12} />
                                         <span className="text-[10px] font-bold uppercase tracking-widest">{activeMarket.participants.toLocaleString()} Joined</span>
                                      </div>
                                   </div>
                                   <h1 className="text-3xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-none italic">
                                      {activeMarket.question}
                                   </h1>
                                </div>

                                <div className="bg-black/40 rounded-[2.5rem] border border-white/5 p-6 lg:p-10 backdrop-blur-xl relative overflow-hidden group">
                                   <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-10">
                                      <div className="px-5 py-2.5 bg-black/60 rounded-xl border border-white/10 backdrop-blur-md">
                                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Mark Price</p>
                                         <p className="text-xl font-mono font-bold text-white">${(coinData?.current_price || 0).toLocaleString()}</p>
                                      </div>
                                   </div>
                                   <PredictionChart
                                     assetId={activeMarket.assetId}
                                     symbol={activeMarket.symbol}
                                   />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   {[
                                      { label: 'Reward Amount', value: `+${activeMarket.reward.toLocaleString()} PTS`, icon: Zap },
                                      { label: 'Prediction Type', value: '24h Forecast', icon: ShieldCheck },
                                      { label: 'Time Remaining', value: 'Ends Soon', icon: Clock }
                                   ].map((metric, i) => (
                                      <div key={i} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                                         <div className="flex items-center gap-2 text-text-tertiary">
                                            <metric.icon size={14} className="text-primary" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">{metric.label}</span>
                                         </div>
                                         <p className="text-xl font-bold text-white uppercase italic tracking-tight">{metric.value}</p>
                                      </div>
                                   ))}
                                </div>
                             </div>
                          ) : (
                             <div className="h-full flex items-center justify-center opacity-20">
                                <Activity size={64} className="animate-pulse" />
                             </div>
                          )}
                       </div>

                       {/* RIGHT: EXECUTION TERMINAL */}
                       <div className="w-full lg:w-[420px] border-t lg:border-t-0 lg:border-l border-white/5 bg-black/20 p-8 lg:p-12 flex flex-col justify-between shrink-0">
                          <div className="space-y-12">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Prediction Hub</p>
                                <h3 className="text-xl font-bold text-white uppercase tracking-tight italic">Set Direction</h3>
                             </div>

                             <div className="space-y-4">
                                <button
                                  onClick={() => setPrediction('UP')}
                                  className={cn(
                                    "w-full p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group",
                                    prediction === 'UP' ? "bg-success/10 border-success text-success shadow-lg shadow-success/10" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-success/30 hover:text-success"
                                  )}
                                >
                                   <div className={cn("p-4 rounded-2xl transition-all", prediction === 'UP' ? "bg-success/20" : "bg-white/5 group-hover:bg-success/10")}>
                                      <ArrowUpRight size={40} />
                                   </div>
                                   <div className="text-center">
                                      <p className="font-black uppercase tracking-[0.2em] text-xs italic">Market Up</p>
                                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1">Price will increase</p>
                                   </div>
                                </button>

                                <button
                                  onClick={() => setPrediction('DOWN')}
                                  className={cn(
                                    "w-full p-8 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-4 group",
                                    prediction === 'DOWN' ? "bg-danger/10 border-danger text-danger shadow-lg shadow-danger/10" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-danger/30 hover:text-danger"
                                  )}
                                >
                                   <div className={cn("p-4 rounded-2xl transition-all", prediction === 'DOWN' ? "bg-danger/20" : "bg-white/5 group-hover:bg-danger/10")}>
                                      <ArrowDownRight size={40} />
                                   </div>
                                   <div className="text-center">
                                      <p className="font-black uppercase tracking-[0.2em] text-xs italic">Market Down</p>
                                      <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1">Price will decrease</p>
                                   </div>
                                </button>
                             </div>

                             <div className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-4">
                                <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Entry Fee</span>
                                   <span className="text-sm font-mono font-bold text-white">100 PTS</span>
                                </div>
                                <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Status</span>
                                   <span className="text-[10px] font-black text-success uppercase">Active</span>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-4 pt-10">
                             <Button
                               className="w-full h-20 bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.4em] text-[13px] rounded-[1.5rem] disabled:opacity-20 transition-all shadow-2xl active:scale-[0.98] italic"
                               disabled={!prediction || isSubmitting}
                               isLoading={isSubmitting}
                               onClick={handlePredict}
                             >
                                Submit Prediction
                             </Button>
                             <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest text-center px-4 leading-relaxed">
                                Once submitted, predictions cannot be changed. Rewards are distributed automatically when the market resolves.
                             </p>
                          </div>
                       </div>
                    </motion.div>
                 ) : (
                    <motion.div
                      key="portfolio"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                      className="flex-1 p-8 lg:p-16 overflow-y-auto no-scrollbar"
                    >
                       <div className="max-w-5xl mx-auto space-y-12">
                          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                             <div className="space-y-3">
                                <h2 className="text-4xl lg:text-6xl font-black text-white uppercase tracking-tighter italic">Portfolio</h2>
                                <p className="text-lg text-text-secondary font-medium tracking-tight">Active forecasts and authorization history.</p>
                             </div>
                             <div className="flex gap-10">
                                <div className="text-right">
                                   <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Accuracy</p>
                                   <p className="text-3xl font-mono font-bold text-primary">
                                      {((userData?.stats?.totalWins || 0) / (userData?.stats?.predictionsCount || 1) * 100).toFixed(1)}%
                                   </p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Total Wins</p>
                                   <p className="text-3xl font-mono font-bold text-success">{(userData?.stats?.totalWins || 0)}</p>
                                </div>
                             </div>
                          </header>

                          <div className="grid grid-cols-1 gap-3">
                             {userPredictions.map((pred) => (
                                <div key={pred.id} className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                                   <div className="flex items-center gap-8">
                                      <div className={cn(
                                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center border text-2xl transition-all shadow-lg",
                                        pred.status === 'RESOLVED' ? "bg-success/5 border-success/20 text-success" : "bg-primary/5 border-primary/20 text-primary"
                                      )}>
                                         {pred.direction === 'UP' ? <TrendingUp /> : <TrendingDown />}
                                      </div>
                                      <div className="space-y-1.5">
                                         <div className="flex items-center gap-3">
                                            <p className="text-xl font-black text-white uppercase tracking-tight italic">{pred.symbol} Forecast</p>
                                            <span className={cn(
                                              "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded border",
                                              pred.status === 'RESOLVED' ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"
                                            )}>{pred.status}</span>
                                         </div>
                                         <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                                            Execution: {pred.createdAt?.toDate?.().toLocaleDateString() || 'Pending'}
                                         </p>
                                      </div>
                                   </div>

                                   <div className="flex items-center gap-12 text-right">
                                      <div className="hidden sm:block">
                                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Entry Value</p>
                                         <p className="text-xl font-mono font-bold text-white">${pred.entryPrice.toLocaleString()}</p>
                                      </div>
                                      <div className="w-28">
                                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Payout</p>
                                         {pred.status === 'RESOLVED' ? (
                                            <p className={cn(
                                              "text-xl font-mono font-bold",
                                              (pred.rewardAmount || 0) > 0 ? "text-success" : "text-white/20"
                                            )}>
                                               {(pred.rewardAmount || 0) > 0 ? `+${pred.rewardAmount}` : '0'} <span className="text-[10px]">pts</span>
                                            </p>
                                         ) : (
                                            <div className="flex items-center justify-end gap-1.5 text-primary">
                                               <Clock size={12} />
                                               <span className="text-[10px] font-black uppercase">Pending</span>
                                            </div>
                                         )}
                                      </div>
                                   </div>
                                </div>
                             ))}

                             {userPredictions.length === 0 && (
                                <div className="py-40 text-center border border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center gap-6 opacity-20">
                                   <LineChart size={64} />
                                   <p className="text-xs font-black uppercase tracking-[0.4em]">Zero Active Positions Found</p>
                                </div>
                             )}
                          </div>
                       </div>
                    </motion.div>
                 )}
              </AnimatePresence>
           </main>
        </div>
      </div>
    </MainLayout>
  );
};

export default Predictions;
