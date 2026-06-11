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
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  ChevronRight,
  Info
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
      <div className="pt-20 min-h-screen bg-[#050507] flex flex-col">
        {/* PREMIUM SUB-NAV */}
        <div className="h-14 border-b border-white/[0.03] bg-black/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-success" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Market Live</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-white/[0.02] border border-white/[0.05] rounded-full">
                 <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Balance:</span>
                 <span className="text-[10px] font-mono font-bold text-white">{(userData?.points || 0).toLocaleString()} PTS</span>
              </div>
           </div>

           <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
              <button
                onClick={() => setTerminalView('FORECAST')}
                className={cn(
                  "px-6 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all",
                  terminalView === 'FORECAST' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                )}
              >
                Prediction
              </button>
              <button
                onClick={() => setTerminalView('PORTFOLIO')}
                className={cn(
                  "px-6 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                  terminalView === 'PORTFOLIO' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                )}
              >
                Portfolio {activePositions.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
           </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

           {/* LEFT SIDEBAR: ASSET SELECTION */}
           <aside className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-white/[0.03] bg-black/20 flex flex-col shrink-0 z-20">
              <div className="p-5 border-b border-white/[0.03] hidden lg:block">
                 <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30">Select Asset</h2>
              </div>

              <div className="flex-1 overflow-x-auto lg:overflow-y-auto no-scrollbar lg:custom-scrollbar flex lg:flex-col p-2 gap-1">
                 {allMarkets.map((market) => {
                    const mCoin = marketData.find(c => c.id === market.assetId);
                    const isSelected = selectedMarketId === market.id;
                    const isNegative = (mCoin?.price_change_percentage_24h || 0) < 0;

                    return (
                       <button
                         key={market.id}
                         onClick={() => { setSelectedMarketId(market.id); setTerminalView('FORECAST'); }}
                         className={cn(
                           "min-w-[180px] lg:min-w-0 w-full p-3.5 rounded-xl transition-all flex items-center gap-3 group border shrink-0",
                           isSelected ? "bg-white/[0.04] border-white/[0.05]" : "bg-transparent border-transparent hover:bg-white/[0.02]"
                         )}
                       >
                          <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/[0.05] p-1.5 flex items-center justify-center shrink-0">
                             {mCoin?.image ? (
                                <img src={mCoin.image} className="w-full h-full object-contain" alt="" />
                             ) : (
                                <Zap size={14} className="text-primary" />
                             )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                             <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-white truncate tracking-tight">{market.symbol}</p>
                                <span className={cn(
                                  "text-[8px] font-mono font-bold",
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

           {/* CENTER STAGE: ANALYSIS & CHART */}
           <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-[#050507]">
              <AnimatePresence mode="wait">
                 {terminalView === 'FORECAST' ? (
                    <motion.div
                      key="forecast"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col lg:flex-row h-full"
                    >
                       <div className="flex-1 p-6 lg:p-10 space-y-10 overflow-y-auto no-scrollbar">
                          {activeMarket ? (
                             <div className="max-w-4xl mx-auto space-y-10">
                                <div className="space-y-6">
                                   <div className="flex items-center gap-3">
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                                        activeMarket.isCampaign ? "bg-primary/10 text-primary border-primary/20" : "bg-white/[0.03] text-white/40 border-white/[0.05]"
                                      )}>
                                         {activeMarket.isCampaign ? 'Featured' : 'Global Market'}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-text-tertiary">
                                         <Activity size={10} />
                                         <span className="text-[9px] font-bold uppercase tracking-widest">{activeMarket.participants.toLocaleString()} Analysts</span>
                                      </div>
                                   </div>
                                   <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tighter leading-tight">
                                      {activeMarket.question}
                                   </h1>
                                </div>

                                <div className="bg-black/20 rounded-[2rem] border border-white/[0.03] p-1 shadow-2xl">
                                   <div className="p-8 border-b border-white/[0.03] flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center">
                                            <LineChart size={20} className="text-primary" />
                                         </div>
                                         <div>
                                            <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mb-0.5">Live Trajectory</p>
                                            <p className="text-xl font-mono font-bold text-white">${(coinData?.current_price || 0).toLocaleString()}</p>
                                         </div>
                                      </div>
                                      <div className="hidden sm:flex items-center gap-4">
                                         <div className="text-right">
                                            <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">24h Vol</p>
                                            <p className="text-xs font-mono font-bold text-success">${(coinData?.total_volume || 0).toLocaleString()}</p>
                                         </div>
                                         <div className="text-right">
                                            <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">Market Cap</p>
                                            <p className="text-xs font-mono font-bold text-primary">${(coinData?.market_cap || 0).toLocaleString()}</p>
                                         </div>
                                      </div>
                                   </div>
                                   <div className="p-6">
                                      <PredictionChart
                                        assetId={activeMarket.assetId}
                                        symbol={activeMarket.symbol}
                                      />
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                   {[
                                      { label: 'Forecast Reward', value: `+${activeMarket.reward.toLocaleString()} PTS`, icon: Zap, color: 'text-primary' },
                                      { label: 'Resolution', value: '24h Expiry', icon: ShieldCheck, color: 'text-success' },
                                      { label: 'Status', value: 'Authorized', icon: Clock, color: 'text-warning' }
                                   ].map((metric, i) => (
                                      <div key={i} className="p-6 rounded-2xl bg-white/[0.01] border border-white/[0.03] space-y-3 group hover:bg-white/[0.02] transition-all">
                                         <div className="flex items-center gap-2 text-text-tertiary">
                                            <metric.icon size={12} className={metric.color} />
                                            <span className="text-[9px] font-bold uppercase tracking-widest">{metric.label}</span>
                                         </div>
                                         <p className="text-lg font-bold text-white tracking-tight uppercase">{metric.value}</p>
                                      </div>
                                   ))}
                                </div>
                             </div>
                          ) : (
                             <div className="h-full flex items-center justify-center opacity-20">
                                <Activity size={48} className="animate-pulse" />
                             </div>
                          )}
                       </div>

                       {/* RIGHT PANEL: EXECUTION */}
                       <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-white/[0.03] bg-black/40 p-8 flex flex-col justify-between shrink-0">
                          <div className="space-y-10">
                             <div className="space-y-1.5">
                                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Trajectory Analysis</p>
                                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Authorization</h3>
                             </div>

                             <div className="space-y-3">
                                <button
                                  onClick={() => setPrediction('UP')}
                                  className={cn(
                                    "w-full p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                    prediction === 'UP' ? "bg-success/10 border-success shadow-[0_0_20px_rgba(34,197,94,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:border-success/30"
                                  )}
                                >
                                   <div className={cn(
                                     "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                     prediction === 'UP' ? "bg-success text-white" : "bg-white/[0.03] text-white/20 group-hover:text-success"
                                   )}>
                                      <ArrowUpRight size={24} />
                                   </div>
                                   <div className="text-center">
                                      <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'UP' ? "text-success" : "text-white/40")}>Bullish Forecast</p>
                                      <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5 italic">Predict higher valuation</p>
                                   </div>
                                </button>

                                <button
                                  onClick={() => setPrediction('DOWN')}
                                  className={cn(
                                    "w-full p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                    prediction === 'DOWN' ? "bg-danger/10 border-danger shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "bg-white/[0.01] border-white/[0.05] hover:border-danger/30"
                                  )}
                                >
                                   <div className={cn(
                                     "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                     prediction === 'DOWN' ? "bg-danger text-white" : "bg-white/[0.03] text-white/20 group-hover:text-danger"
                                   )}>
                                      <ArrowDownRight size={24} />
                                   </div>
                                   <div className="text-center">
                                      <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'DOWN' ? "text-danger" : "text-white/40")}>Bearish Forecast</p>
                                      <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5 italic">Predict lower valuation</p>
                                   </div>
                                </button>
                             </div>

                             <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.03] space-y-3">
                                <div className="flex justify-between items-center">
                                   <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Platform Fee</span>
                                   <span className="text-xs font-mono font-bold text-white">100 PTS</span>
                                </div>
                                <div className="flex justify-between items-center">
                                   <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">Entry Limit</span>
                                   <span className="text-[9px] font-black text-success uppercase tracking-widest">Authorized</span>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-6 pt-10">
                             <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <Info size={14} className="text-primary shrink-0" />
                                <p className="text-[9px] font-bold text-text-secondary leading-normal">
                                   Forecasts are finalized upon submission and settled at the next resolution cycle.
                                </p>
                             </div>
                             <Button
                               className="w-full h-16 bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-xl disabled:opacity-20 transition-all active:scale-[0.98]"
                               disabled={!prediction || isSubmitting}
                               isLoading={isSubmitting}
                               onClick={handlePredict}
                             >
                                Submit Forecast
                             </Button>
                          </div>
                       </div>
                    </motion.div>
                 ) : (
                    <motion.div
                      key="portfolio"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex-1 p-6 lg:p-12 overflow-y-auto no-scrollbar"
                    >
                       <div className="max-w-4xl mx-auto space-y-12">
                          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-white/[0.03] pb-10">
                             <div className="space-y-2">
                                <h2 className="text-4xl font-bold text-white tracking-tighter italic">Portfolio</h2>
                                <p className="text-sm text-text-secondary font-medium italic">Your active trajectory forecasts and history.</p>
                             </div>
                             <div className="flex gap-8">
                                <div className="text-right">
                                   <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">Win Rate</p>
                                   <p className="text-2xl font-mono font-bold text-primary">
                                      {((userData?.stats?.totalWins || 0) / (userData?.stats?.predictionsCount || 1) * 100).toFixed(0)}%
                                   </p>
                                </div>
                                <div className="text-right">
                                   <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-0.5">Settled</p>
                                   <p className="text-2xl font-mono font-bold text-white">{(userData?.stats?.totalWins || 0)}</p>
                                </div>
                             </div>
                          </header>

                          <div className="space-y-2">
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
                                      <div className="p-2 rounded-lg bg-white/[0.03] text-white/20">
                                         <ChevronRight size={14} />
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
