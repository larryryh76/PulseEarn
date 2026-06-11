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
  LineChart,
  Target,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import PredictionChart from './components/PredictionChart';

const STAKE_OPTIONS = [10, 50, 100, 500, 1000];

const Predictions: React.FC = () => {
  const { marketData, loading: marketLoading } = useCryptoData();
  const { currentUser, userData } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userPredictions, setUserPredictions] = useState<PredictionRecord[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [stake, setStake] = useState<number>(100);
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
      <div className="pt-24 min-h-screen bg-[#050507] flex flex-col">
        {/* TOP NAV BAR - TERMINAL STYLE */}
        <div className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-16 z-30 px-6 py-4">
           <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                 <div className="flex items-center gap-2">
                    <BarChart3 size={16} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">Forecasting Terminal</span>
                 </div>
                 <div className="hidden md:flex bg-white/[0.03] p-1 rounded-lg border border-white/[0.05]">
                    <button
                      onClick={() => { setTerminalView('EXPLORE'); setSelectedMarketId(null); }}
                      className={cn(
                        "px-6 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                        terminalView === 'EXPLORE' && !selectedMarketId ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                      )}
                    >
                      Explore
                    </button>
                    <button
                      onClick={() => { setTerminalView('PORTFOLIO'); setSelectedMarketId(null); }}
                      className={cn(
                        "px-6 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                        terminalView === 'PORTFOLIO' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                      )}
                    >
                      Portfolio {activePositions.length > 0 && <span className="w-1 h-1 rounded-full bg-primary" />}
                    </button>
                 </div>
              </div>

              {userData && (
                 <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                       <p className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Available Capital</p>
                       <p className="text-xs font-mono font-bold text-white">{userData.points?.toLocaleString()} PTS</p>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                       <Zap size={18} />
                    </div>
                 </div>
              )}
           </div>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full p-6 pb-20">
          <AnimatePresence mode="wait">
            {selectedMarketId && activeMarket ? (
               <motion.div
                 key="selected"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="grid grid-cols-1 lg:grid-cols-12 gap-8"
               >
                  {/* LEFT: BACK & MARKET INFO */}
                  <div className="lg:col-span-8 space-y-8">
                     <button
                       onClick={() => setSelectedMarketId(null)}
                       className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors group"
                     >
                       <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Markets</span>
                     </button>

                     <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center p-3">
                                 {coinData?.image ? <img src={coinData.image} className="w-full h-full object-contain" alt="" /> : <Zap size={24} className="text-primary" />}
                              </div>
                              <div>
                                 <div className="flex items-center gap-3 mb-1">
                                    <h2 className="text-3xl font-bold text-white tracking-tighter uppercase italic">{activeMarket.symbol}</h2>
                                    <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest">
                                       {activeMarket.isCampaign ? 'Featured' : 'Global'}
                                    </span>
                                 </div>
                                 <p className="text-text-tertiary text-sm font-medium italic">{activeMarket.question}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-8 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Index Price</p>
                                 <p className="text-xl font-mono font-bold text-white">${(coinData?.current_price || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">24h Change</p>
                                 <p className={cn(
                                   "text-sm font-mono font-bold",
                                   (coinData?.price_change_percentage_24h || 0) < 0 ? "text-danger" : "text-success"
                                 )}>
                                    {(coinData?.price_change_percentage_24h || 0) > 0 ? '+' : ''}{coinData?.price_change_percentage_24h?.toFixed(2)}%
                                 </p>
                              </div>
                           </div>
                        </div>

                        {/* CENTERED CHART AREA */}
                        <div className="bg-black/40 border border-white/5 rounded-[2.5rem] p-6 min-h-[400px] flex flex-col">
                           <div className="flex items-center justify-between mb-6 px-4">
                              <div className="flex items-center gap-4">
                                 <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Live Feed</span>
                                 </div>
                                 <span className="text-[9px] font-black uppercase tracking-widest text-white/20">•</span>
                                 <span className="text-[9px] font-black uppercase tracking-widest text-white/40">24H Performance</span>
                              </div>
                              <LineChart size={14} className="text-primary" />
                           </div>
                           <div className="flex-1">
                              <PredictionChart assetId={activeMarket.assetId} symbol={activeMarket.symbol} />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Market Cap</p>
                              <p className="text-sm font-mono font-bold text-white">${(coinData?.market_cap || 0).toLocaleString()}</p>
                           </div>
                           <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Volume (24h)</p>
                              <p className="text-sm font-mono font-bold text-white">${(coinData?.total_volume || 0).toLocaleString()}</p>
                           </div>
                           <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                              <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Participants</p>
                              <p className="text-sm font-mono font-bold text-white">{activeMarket.participants.toLocaleString()}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* RIGHT: EXECUTION PANEL */}
                  <div className="lg:col-span-4 lg:sticky lg:top-40 h-fit">
                     <div className="bg-[#0A0A0F] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                           <h3 className="text-xl font-bold text-white italic tracking-tight uppercase">Execution Panel</h3>
                           <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1">Settle Forecast Position</p>
                        </div>

                        <div className="p-8 space-y-8">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-2">Market Direction</label>
                              <div className="grid grid-cols-2 gap-3">
                                 <button
                                   onClick={() => setPrediction('UP')}
                                   className={cn(
                                     "p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                     prediction === 'UP' ? "bg-success/10 border-success shadow-[0_0_20px_rgba(34,197,94,0.15)]" : "bg-white/[0.01] border-white/[0.05] hover:border-success/30"
                                   )}
                                 >
                                    <TrendingUp size={24} className={cn("transition-all", prediction === 'UP' ? "text-success scale-110" : "text-white/20")} />
                                    <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'UP' ? "text-success" : "text-white/40")}>UP</p>
                                 </button>
                                 <button
                                   onClick={() => setPrediction('DOWN')}
                                   className={cn(
                                     "p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                     prediction === 'DOWN' ? "bg-danger/10 border-danger shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "bg-white/[0.01] border-white/[0.05] hover:border-danger/30"
                                   )}
                                 >
                                    <TrendingDown size={24} className={cn("transition-all", prediction === 'DOWN' ? "text-danger scale-110" : "text-white/20")} />
                                    <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'DOWN' ? "text-danger" : "text-white/40")}>DOWN</p>
                                 </button>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-2">Allocation Stake</label>
                              <div className="flex flex-wrap gap-2">
                                 {STAKE_OPTIONS.map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => setStake(opt)}
                                      className={cn(
                                        "px-4 py-2 rounded-xl border text-[10px] font-mono font-bold transition-all",
                                        stake === opt ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                                      )}
                                    >
                                       {opt}
                                    </button>
                                 ))}
                              </div>
                              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-6">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Entry Stake</span>
                                    <span className="text-sm font-mono font-bold text-white">{stake} PTS</span>
                                 </div>
                                 <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                       <Zap size={14} className="text-primary" />
                                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Potential Return</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-primary">{stake * 2} PTS</span>
                                 </div>
                                 <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                                    <p className="text-[9px] font-bold text-primary/80 italic leading-relaxed text-center">
                                       "Potential Return: 2× Stake"
                                    </p>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <div className="flex items-start gap-3 px-2">
                                 <ShieldCheck size={14} className="text-success shrink-0 mt-0.5" />
                                 <p className="text-[9px] font-bold text-white/40 leading-relaxed italic uppercase tracking-wider">
                                    Position is locked for 24 hours. Result settled automatically by price oracle.
                                 </p>
                              </div>
                              <Button
                                className="w-full h-16 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl italic shadow-2xl active:scale-[0.98] disabled:opacity-20"
                                disabled={!prediction || isSubmitting}
                                isLoading={isSubmitting}
                                onClick={handlePredict}
                              >
                                CONFIRM FORECAST
                              </Button>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            ) : terminalView === 'EXPLORE' ? (
               <motion.div
                 key="explore"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="space-y-12"
               >
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                     <div className="space-y-4">
                        <div className="flex items-center gap-2">
                           <Target size={14} className="text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Active Opportunities</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none italic">
                           Market Discovery
                        </h1>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {marketLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                           <div key={i} className="p-8 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] animate-pulse h-64 space-y-8" />
                        ))
                     ) : (
                        allMarkets.map((market) => {
                           const mCoin = marketData.find(c => c.id === market.assetId);
                           const isNegative = (mCoin?.price_change_percentage_24h || 0) < 0;

                           return (
                              <div
                                key={market.id}
                                onClick={() => { setSelectedMarketId(market.id); setPrediction(null); }}
                                className="group p-8 rounded-[2.5rem] bg-[#0A0A0F] border border-white/5 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[280px]"
                              >
                                 <div className="flex justify-between items-start">
                                    <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 p-3 flex items-center justify-center group-hover:border-primary/20 transition-all">
                                       {mCoin?.image ? (
                                          <img src={mCoin.image} className="w-full h-full object-contain" alt="" />
                                       ) : (
                                          <Zap size={24} className="text-primary" />
                                       )}
                                    </div>
                                    <div className="text-right">
                                       <p className="text-sm font-mono font-bold text-white">${(mCoin?.current_price || 0).toLocaleString()}</p>
                                       <span className={cn(
                                         "text-[10px] font-bold",
                                         isNegative ? "text-danger" : "text-success"
                                       )}>
                                          {isNegative ? '' : '+'}{mCoin?.price_change_percentage_24h?.toFixed(1)}%
                                       </span>
                                    </div>
                                 </div>

                                 <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors italic">
                                       {market.question}
                                    </h3>
                                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                       <div className="flex items-center gap-1.5">
                                          <Zap size={10} className="text-primary" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-primary">2× Return</span>
                                       </div>
                                       <div className="flex items-center gap-2 text-white/20 group-hover:text-white transition-colors">
                                          <span className="text-[10px] font-black uppercase tracking-widest italic">Predict Now</span>
                                          <ChevronRight size={14} />
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           );
                        })
                     )}
                  </div>
               </motion.div>
            ) : (
               <motion.div
                 key="portfolio"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="space-y-8"
               >
                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <Activity size={14} className="text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">History & Positions</span>
                     </div>
                     <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none italic uppercase">
                        Portfolio
                     </h1>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                     {userPredictions.map((pred) => (
                        <div key={pred.id} className="p-6 rounded-[2rem] bg-[#0A0A0F] border border-white/5 flex items-center justify-between group hover:bg-white/[0.01] transition-all">
                           <div className="flex items-center gap-6">
                              <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center border text-lg transition-all",
                                pred.status === 'RESOLVED' ? "bg-success/5 border-success/10 text-success" : "bg-primary/5 border-primary/10 text-primary"
                              )}>
                                 {pred.direction === 'UP' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                              </div>
                              <div className="space-y-1">
                                 <div className="flex items-center gap-3">
                                    <p className="text-lg font-bold text-white uppercase tracking-tight italic">{pred.symbol} Forecast</p>
                                    <span className={cn(
                                      "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded border",
                                      pred.status === 'RESOLVED' ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"
                                    )}>{pred.status}</span>
                                 </div>
                                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                                    {pred.createdAt?.toDate?.().toLocaleDateString() || 'Just Now'}
                                 </p>
                              </div>
                           </div>

                           <div className="flex items-center gap-12 text-right">
                              <div className="hidden md:block">
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Entry Price</p>
                                 <p className="text-sm font-mono font-bold text-white">${pred.entryPrice.toLocaleString()}</p>
                              </div>
                              <div className="w-32">
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Payout Status</p>
                                 {pred.status === 'RESOLVED' ? (
                                    <p className={cn(
                                      "text-lg font-mono font-bold",
                                      (pred.rewardAmount || 0) > 0 ? "text-success" : "text-white/10"
                                    )}>
                                       {(pred.rewardAmount || 0) > 0 ? `+${pred.rewardAmount}` : 'LOST'}
                                    </p>
                                 ) : (
                                    <div className="flex items-center justify-end gap-2 text-primary">
                                       <Clock size={12} className="animate-pulse" />
                                       <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     ))}

                     {userPredictions.length === 0 && (
                        <div className="py-32 text-center border border-dashed border-white/5 rounded-[3rem] flex flex-col items-center gap-6 opacity-20">
                           <Activity size={48} />
                           <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Prediction History Detected</p>
                        </div>
                     )}
                  </div>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
};

export default Predictions;
