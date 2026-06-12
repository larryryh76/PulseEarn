import React, { useState, useMemo } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useCryptoData } from '../../hooks/useCryptoData';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';
import { Campaign, PredictionRecord } from '../../types';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Activity,
  LineChart,
  Target,
  ArrowLeft,
  ChevronRight,
  BarChart3,
  History
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
  const { predictions: userPredictions, campaigns: contextCampaigns } = useTasks();
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [stake, setStake] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalView, setTerminalView] = useState<'EXPLORE' | 'PORTFOLIO'>('EXPLORE');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'WON' | 'LOST'>('ALL');

  // Unified global markets from live data + admin campaigns
  const allMarkets = useMemo(() => {
    const campaignMarkets = contextCampaigns.filter((c: Campaign) => c.category === 'PREDICTION').map((c: Campaign) => ({
      id: c.id,
      assetId: (c as any).predictionAsset || 'bitcoin',
      symbol: (c as any).predictionSymbol || 'BTC',
      name: c.name,
      question: c.predictionQuestion || c.description,
      isCampaign: true,
      image: ''
    }));

    const globalMarkets = marketData.slice(0, 10).map(coin => ({
      id: `global_${coin.id}`,
      assetId: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: `${coin.name}`,
      question: `Will ${coin.name} price increase in the next 24h?`,
      isCampaign: false,
      image: coin.image,
      price: coin.current_price,
      change: coin.price_change_percentage_24h
    }));

    return [...campaignMarkets, ...globalMarkets];
  }, [contextCampaigns, marketData]);

  const activeMarket = allMarkets.find(m => m.id === selectedMarketId);
  const coinData = marketData.find(c => c.id === activeMarket?.assetId);

  const handlePredict = async () => {
    if (!currentUser || !prediction || !userData || !activeMarket) return;

    if (userData.points < stake) return toast.error('Insufficient points for this forecast.');

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

  const activePositions = useMemo(() =>
    userPredictions.filter((p: PredictionRecord) => p.status === 'ACTIVE'),
    [userPredictions]
  );

  if (marketLoading && allMarkets.length === 0) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto space-y-12">
        <div className="h-12 w-64 bg-white/5 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-[2.5rem] animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  const filteredPredictions = useMemo(() => {
    return [...userPredictions]
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      })
      .filter((p: PredictionRecord) => {
          if (historyFilter === 'ALL') return true;
          if (historyFilter === 'ACTIVE') return p.status === 'ACTIVE';
          if (historyFilter === 'COMPLETED') return p.status === 'RESOLVED';
          if (historyFilter === 'WON') return p.status === 'RESOLVED' && (p.rewardAmount || 0) > 0;
          if (historyFilter === 'LOST') return p.status === 'RESOLVED' && (p.rewardAmount || 0) === 0;
          return true;
      });
  }, [userPredictions, historyFilter]);

  return (
    <MainLayout>
      <div className="pt-24 min-h-screen bg-[#050507] flex flex-col">
        {/* TOP NAV BAR - TERMINAL STYLE */}
        <div className="border-b border-white/5 bg-black/60 backdrop-blur-xl sticky top-16 z-30 px-6 py-5">
           <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-8">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(0,112,255,0.2)]">
                       <BarChart3 size={16} className="text-primary" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white italic">Forecasting Terminal</span>
                 </div>
                 <div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/[0.05]">
                    <button
                      onClick={() => { setTerminalView('EXPLORE'); setSelectedMarketId(null); }}
                      className={cn(
                        "px-4 md:px-6 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                        terminalView === 'EXPLORE' && !selectedMarketId ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                      )}
                    >
                      <Activity size={12} />
                      <span className="hidden sm:inline">Markets</span>
                    </button>
                    <button
                      onClick={() => { setTerminalView('PORTFOLIO'); setSelectedMarketId(null); }}
                      className={cn(
                        "px-4 md:px-6 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                        terminalView === 'PORTFOLIO' ? "bg-white text-black shadow-lg" : "text-text-tertiary hover:text-white"
                      )}
                    >
                      <History size={12} />
                      <span className="hidden sm:inline">My Forecasts</span>
                      {activePositions.length > 0 && <span className="w-1 h-1 rounded-full bg-primary" />}
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

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 pb-20 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedMarketId && activeMarket ? (
               <motion.div
                 key="selected"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
               >
                  {/* LEFT: BACK & MARKET INFO */}
                  <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                     <button
                       onClick={() => setSelectedMarketId(null)}
                       className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors group"
                     >
                       <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Markets</span>
                     </button>

                     <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                           <div className="flex items-center gap-4 sm:gap-6">
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center p-2.5 sm:p-3">
                                 {coinData?.image ? <img src={coinData.image} className="w-full h-full object-contain" alt="" /> : <Zap size={24} className="text-primary" />}
                              </div>
                              <div className="min-w-0">
                                 <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tighter uppercase truncate">{activeMarket.symbol}</h2>
                                    <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest whitespace-nowrap">
                                       {activeMarket.isCampaign ? 'Featured' : 'Market'}
                                    </span>
                                 </div>
                                 <p className="text-text-tertiary text-xs sm:text-sm font-medium line-clamp-1">{activeMarket.question}</p>
                              </div>
                           </div>
                           <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                              <div className="text-left sm:text-right">
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">Price</p>
                                 <p className="text-lg sm:text-xl font-mono font-bold text-white">${(coinData?.current_price || 0).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">24h</p>
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
                        <div className="bg-black/40 border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 min-h-[350px] sm:min-h-[400px] flex flex-col">
                           <div className="flex items-center justify-between mb-6 px-4">
                              <div className="flex items-center gap-4">
                                 <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Market Live</span>
                                 </div>
                              </div>
                              <LineChart size={14} className="text-primary" />
                           </div>
                           <div className="flex-1">
                              <PredictionChart assetId={activeMarket.assetId} symbol={activeMarket.symbol} />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* RIGHT: EXECUTION PANEL */}
                  <div className="lg:col-span-4 lg:sticky lg:top-40 h-fit">
                     <div className="bg-[#0A0A0F] border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.02]">
                           <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight uppercase">Predict</h3>
                        </div>

                        <div className="p-6 sm:p-8 space-y-6 sm:space-y-8">
                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-2">Direction</label>
                              <div className="grid grid-cols-2 gap-3">
                                 <button
                                   onClick={() => setPrediction('UP')}
                                   className={cn(
                                     "p-4 sm:p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                     prediction === 'UP' ? "bg-success/10 border-success shadow-[0_0_20px_rgba(34,197,94,0.15)]" : "bg-white/[0.01] border-white/[0.05] hover:border-success/30"
                                   )}
                                 >
                                    <TrendingUp size={24} className={cn("transition-all", prediction === 'UP' ? "text-success scale-110" : "text-white/20")} />
                                    <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'UP' ? "text-success" : "text-white/40")}>UP</p>
                                 </button>
                                 <button
                                   onClick={() => setPrediction('DOWN')}
                                   className={cn(
                                     "p-4 sm:p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                     prediction === 'DOWN' ? "bg-danger/10 border-danger shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "bg-white/[0.01] border-white/[0.05] hover:border-danger/30"
                                   )}
                                 >
                                    <TrendingDown size={24} className={cn("transition-all", prediction === 'DOWN' ? "text-danger scale-110" : "text-white/20")} />
                                    <p className={cn("font-black uppercase tracking-[0.1em] text-[10px]", prediction === 'DOWN' ? "text-danger" : "text-white/40")}>DOWN</p>
                                 </button>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest block ml-2">Stake Amount</label>
                              <div className="flex flex-wrap gap-2">
                                 {STAKE_OPTIONS.map((opt) => (
                                    <button
                                      key={opt}
                                      onClick={() => setStake(opt)}
                                      className={cn(
                                        "px-3 py-2 sm:px-4 rounded-xl border text-[10px] font-mono font-bold transition-all",
                                        stake === opt ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                                      )}
                                    >
                                       {opt}
                                    </button>
                                 ))}
                              </div>
                              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-4 sm:space-y-6">
                                 <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Stake</span>
                                    <span className="text-sm font-mono font-bold text-white">{stake} PTS</span>
                                 </div>
                                 <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                       <Zap size={14} className="text-primary" />
                                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">Potential Return</span>
                                    </div>
                                    <div className="text-right">
                                       <span className="text-sm font-mono font-bold text-primary block">{stake * 2} PTS</span>
                                       <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">2× Stake</span>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <Button
                                className="w-full h-14 sm:h-16 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl shadow-2xl active:scale-[0.98] disabled:opacity-20"
                                disabled={!prediction || isSubmitting}
                                isLoading={isSubmitting}
                                onClick={handlePredict}
                              >
                                PLACE PREDICTION
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
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Active Markets</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none italic">
                           Discover
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
                                    <h3 className="text-xl font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                       {market.question}
                                    </h3>
                                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                       <div className="flex items-center gap-1.5">
                                          <Zap size={10} className="text-primary" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-primary">2× Return</span>
                                       </div>
                                       <div className="flex items-center gap-2 text-white/20 group-hover:text-white transition-colors">
                                          <span className="text-[10px] font-black uppercase tracking-widest">Predict Now</span>
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
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={14} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Capital Ledger</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none uppercase italic">
                            My Forecasts
                        </h1>
                    </div>

                    <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.05] overflow-x-auto no-scrollbar">
                        {(['ALL', 'ACTIVE', 'COMPLETED', 'WON', 'LOST'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setHistoryFilter(f)}
                                className={cn(
                                    "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                                    historyFilter === f ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-tertiary hover:text-white"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                     {filteredPredictions.map((pred: PredictionRecord) => {
                        const isWin = pred.status === 'RESOLVED' && (pred.rewardAmount || 0) > 0;

                        return (
                          <div key={pred.id} className="group relative overflow-hidden">
                            <div className={cn(
                                "absolute inset-y-0 left-0 w-0.5 transition-all group-hover:w-1",
                                pred.status === 'ACTIVE' ? "bg-primary" : isWin ? "bg-success" : "bg-white/10"
                            )} />

                            <div className="p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] bg-[#0A0A0F] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-white/[0.02] shadow-xl">
                               <div className="flex items-center gap-5 sm:gap-6">
                                  <div className={cn(
                                    "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border transition-all shadow-inner shrink-0",
                                    pred.status === 'ACTIVE' ? "bg-primary/5 border-primary/20 text-primary shadow-primary/5" :
                                    isWin ? "bg-success/5 border-success/20 text-success shadow-success/5" :
                                    "bg-white/[0.02] border-white/10 text-white/20"
                                  )}>
                                     {pred.direction === 'UP' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                  </div>

                                  <div className="space-y-1.5 min-w-0">
                                     <div className="flex items-center gap-2.5 flex-wrap">
                                        <h3 className="text-lg font-bold text-white uppercase tracking-tighter italic truncate">
                                           {pred.symbol} Forecast
                                        </h3>
                                        <div className={cn(
                                          "px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-[0.2em] border",
                                          pred.status === 'ACTIVE' ? "bg-primary/10 text-primary border-primary/20 animate-pulse" :
                                          isWin ? "bg-success/10 text-success border-success/20" :
                                          "bg-white/5 text-white/30 border-white/10"
                                        )}>
                                          {pred.status === 'ACTIVE' ? 'Active' : pred.status}
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-3 text-text-tertiary">
                                        <span className="text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
                                           {pred.createdAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'Pending'}
                                        </span>
                                        <div className="w-1 h-1 rounded-full bg-white/5" />
                                        <span className="text-[9px] font-mono text-white/20 uppercase">{pred.id.slice(-6)}</span>
                                     </div>
                                  </div>
                               </div>

                               <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 md:gap-10 flex-1 md:max-w-2xl lg:max-w-3xl border-t md:border-t-0 border-white/5 pt-5 md:pt-0">
                                  <div className="space-y-1">
                                     <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Stake</p>
                                     <div className="flex items-baseline gap-1">
                                        <p className="text-sm font-mono font-bold text-white">{pred.stakeAmount.toLocaleString()}</p>
                                        <span className="text-[8px] font-bold text-text-tertiary">PTS</span>
                                     </div>
                                  </div>

                                  <div className="space-y-1">
                                     <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Entry</p>
                                     <p className="text-sm font-mono font-bold text-white truncate">${pred.entryPrice.toLocaleString()}</p>
                                  </div>

                                  <div className="space-y-1">
                                     <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Execution</p>
                                     {pred.status === 'RESOLVED' ? (
                                        <p className="text-sm font-mono font-bold text-white truncate">${pred.exitPrice?.toLocaleString() || '---'}</p>
                                     ) : (
                                        <div className="flex items-center gap-1.5">
                                           <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                                           <p className="text-[9px] font-black text-primary uppercase tracking-widest">Live</p>
                                        </div>
                                     )}
                                  </div>

                                  <div className="space-y-1 text-right sm:text-left">
                                     <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Yield</p>
                                     {pred.status === 'RESOLVED' ? (
                                        <div className="flex items-baseline justify-end sm:justify-start gap-1">
                                            <p className={cn(
                                              "text-base font-mono font-bold tracking-tighter",
                                              isWin ? "text-success" : "text-white/10"
                                            )}>
                                               {isWin ? `+${pred.rewardAmount?.toLocaleString()}` : '0'}
                                            </p>
                                            {isWin && <span className="text-[8px] font-bold text-success/50 uppercase tracking-widest">PTS</span>}
                                        </div>
                                     ) : (
                                        <div className="flex items-center justify-end sm:justify-start gap-1.5 text-primary">
                                            <Zap size={12} />
                                            <p className="text-base font-mono font-bold tracking-tighter">+{pred.stakeAmount * 2}</p>
                                        </div>
                                     )}
                                  </div>
                               </div>
                            </div>
                          </div>
                        );
                     })}

                     {userPredictions.length === 0 && (
                        <div className="py-40 text-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.01] flex flex-col items-center gap-8 group hover:border-primary/20 transition-all">
                           <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/10 group-hover:text-primary/20 group-hover:scale-110 transition-all duration-700">
                              <Activity size={40} />
                           </div>
                           <div className="space-y-2">
                              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/30">Zero Activity Detected</p>
                              <p className="text-xs text-text-tertiary font-medium">Your forecasting ledger is currently empty.</p>
                           </div>
                           <Button
                             onClick={() => setTerminalView('EXPLORE')}
                             variant="primary"
                             size="sm"
                             className="rounded-xl px-8 h-12 shadow-2xl shadow-primary/20"
                           >
                             Open Markets
                           </Button>
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
