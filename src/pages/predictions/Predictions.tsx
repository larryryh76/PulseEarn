import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  BarChart3,
  History,
  Calendar,
  Search,
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import Button from '../../components/ui/Button';
import toast from 'react-hot-toast';
import PredictionChart from './components/PredictionChart';

const STAKE_OPTIONS = [10, 50, 100, 500, 1000];

const Predictions: React.FC = () => {
  const location = useLocation();
  const { marketData = [], loading: marketLoading } = useCryptoData();
  const { currentUser, userData } = useAuth();
  const { predictions: userPredictions = [], campaigns: contextCampaigns = [] } = useTasks();

  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [stake, setStake] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalView, setTerminalView] = useState<'EXPLORE' | 'PORTFOLIO'>('EXPLORE');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PredictionRecord | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Sync with location state for deep linking
  useEffect(() => {
    if (location.state?.view) setTerminalView(location.state.view);
    if (location.state?.highlightId && userPredictions.length > 0) {
       const item = userPredictions.find((p: any) => p.id === location.state.highlightId);
       if (item) {
          setSelectedHistoryItem(item);
          setTerminalView('PORTFOLIO');
       }
    }
  }, [location.state, userPredictions]);

  // Auto-Resolution Logic (Ensures payouts happen when user views history)
  useEffect(() => {
    if (terminalView === 'PORTFOLIO' && !isResolving) {
       const expired = userPredictions.filter(p => {
          if (p.status !== 'ACTIVE') return false;
          const createdAt = p.createdAt?.toDate?.() || new Date();
          return (Date.now() - createdAt.getTime()) > (24 * 60 * 60 * 1000);
       });

       if (expired.length > 0) {
          const runResolution = async () => {
             setIsResolving(true);
             try {
                const { MarketResolutionEngine } = await import('../../engines/predictions/MarketResolutionEngine');
                await MarketResolutionEngine.resolveExpiredPredictions();
             } catch (err) {
                console.error("Auto-Resolution failed:", err);
             } finally {
                setIsResolving(false);
             }
          };
          runResolution();
       }
    }
  }, [terminalView, userPredictions, isResolving]);

  // Unified Markets Engine (Stable)
  const allMarkets = useMemo(() => {
    if (!marketData || !Array.isArray(marketData)) return [];

    const campaignMarkets = (contextCampaigns || [])
      .filter((c: Campaign) => c?.category === 'PREDICTION' && (c as any).predictionAsset)
      .map((c: Campaign) => {
        const coin = marketData.find(cd => cd.id === (c as any).predictionAsset);
        return {
          id: c.id,
          assetId: (c as any).predictionAsset || 'bitcoin',
          symbol: (c as any).predictionSymbol || 'BTC',
          name: c.name,
          question: c.predictionQuestion || c.description,
          isCampaign: true,
          image: coin?.image || '',
          price: coin?.current_price || 0,
          change: coin?.price_change_percentage_24h || 0
        };
      });

    const globalMarkets = marketData.slice(0, 15).map(coin => ({
      id: `global_${coin.id}`,
      assetId: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      question: `Will ${coin.name} price increase in the next 24h?`,
      isCampaign: false,
      image: coin.image,
      price: coin.current_price,
      change: coin.price_change_percentage_24h
    }));

    // Filter out duplicates (prioritize campaign markets)
    const seen = new Set();
    return [...campaignMarkets, ...globalMarkets].filter(m => {
       if (seen.has(m.assetId)) return false;
       seen.add(m.assetId);
       return true;
    });
  }, [contextCampaigns, marketData]);

  const activeMarket = useMemo(() =>
    allMarkets.find(m => m.id === selectedMarketId),
  [allMarkets, selectedMarketId]);

  const coinData = useMemo(() =>
    marketData.find(c => c.id === activeMarket?.assetId),
  [marketData, activeMarket]);

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
         entryPrice: coinData?.current_price || activeMarket.price || 0,
         claimId: predId
      });

      if (!result.success) throw new Error(result.error);

      toast.success('Position Opened Successfully');
      setPrediction(null);
      setSelectedMarketId(null);
    } catch (err: any) {
      toast.error(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPredictions = useMemo(() => {
    return [...userPredictions]
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      })
      .filter((p: PredictionRecord) => {
          if (historyFilter === 'ALL') return true;
          return p.status === historyFilter;
      });
  }, [userPredictions, historyFilter]);

  return (
    <MainLayout>
      {/* REFINED HISTORY MODAL */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               onClick={() => setSelectedHistoryItem(null)}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl"
             />
             <motion.div
               initial={{ scale: 0.98, opacity: 0, y: 10 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.98, opacity: 0, y: 10 }}
               className="relative w-full max-w-sm bg-[#08080C] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10"
             >
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <History size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Forecast Ledger</span>
                   </div>
                   <button onClick={() => setSelectedHistoryItem(null)} className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-all text-text-tertiary">
                      <X size={16} />
                   </button>
                </div>

                <div className="p-8 space-y-8">
                   <div className="flex flex-col items-center text-center space-y-4">
                      <div className="flex items-center gap-3">
                         <h2 className="text-4xl font-bold text-white tracking-tighter uppercase italic">{selectedHistoryItem.symbol}</h2>
                         <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em] border",
                            selectedHistoryItem.status === 'ACTIVE' ? "bg-primary/10 border-primary/20 text-primary" :
                            (selectedHistoryItem.rewardAmount || 0) > 0 ? "bg-success/10 border-success/20 text-success" : "bg-white/5 border-white/10 text-white/30")}>
                            {selectedHistoryItem.status === 'ACTIVE' ? 'Processing' : (selectedHistoryItem.rewardAmount || 0) > 0 ? 'Won' : 'Lost'}
                         </div>
                      </div>

                      <div className="flex items-center gap-2 text-text-tertiary">
                         <Calendar size={10} />
                         <span className="text-[9px] font-bold uppercase tracking-widest">{selectedHistoryItem.createdAt?.toDate?.().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                   </div>

                   <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                      <div className="p-4 flex justify-between items-center">
                         <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Entry Price</span>
                         <span className="text-sm font-mono font-bold text-white">${selectedHistoryItem.entryPrice.toLocaleString()}</span>
                      </div>
                      <div className="p-4 flex justify-between items-center">
                         <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Settlement</span>
                         <span className="text-sm font-mono font-bold text-white">{selectedHistoryItem.exitPrice ? `$${selectedHistoryItem.exitPrice.toLocaleString()}` : '---'}</span>
                      </div>
                      <div className="p-4 flex justify-between items-center">
                         <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Stake / Vector</span>
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-white">{selectedHistoryItem.stakeAmount.toLocaleString()} PTS</span>
                            <div className={cn("w-1.5 h-1.5 rounded-full", selectedHistoryItem.direction === 'UP' ? "bg-success" : "bg-danger")} />
                         </div>
                      </div>
                   </div>

                   <div className="p-6 rounded-2xl bg-primary/[0.02] border border-primary/10 text-center">
                      <p className="text-[9px] font-black text-primary/60 uppercase tracking-[0.2em] mb-2">{selectedHistoryItem.status === 'ACTIVE' ? 'Estimated Payout' : 'Final Yield'}</p>
                      <p className={cn("text-3xl font-mono font-bold tracking-tighter",
                         selectedHistoryItem.status === 'ACTIVE' ? "text-primary" :
                         (selectedHistoryItem.rewardAmount || 0) > 0 ? "text-success" : "text-white/10")}>
                         {selectedHistoryItem.status === 'ACTIVE' ? `+${(selectedHistoryItem.stakeAmount * 2).toLocaleString()}` :
                          (selectedHistoryItem.rewardAmount || 0) > 0 ? `+${selectedHistoryItem.rewardAmount?.toLocaleString()}` : '0'}
                         <span className="text-xs ml-1 opacity-40">PTS</span>
                      </p>
                   </div>

                   <div className="flex justify-between items-center px-1">
                      <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.3em]">Reference ID</span>
                      <span className="text-[8px] font-mono text-white/10 truncate max-w-[140px] uppercase">{selectedHistoryItem.id.slice(-16)}</span>
                   </div>
                </div>

                <div className="p-8 bg-black border-t border-white/5 flex justify-center">
                   <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.6em]">PULSE REWARDS SYSTEM</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-24 min-h-screen bg-black flex flex-col selection:bg-primary/30">
        {/* REBUILT TERMINAL HEADER (Responsive) */}
        <div className="sticky top-[64px] z-40 bg-black/60 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-3 sm:py-5">
           <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-10">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5 shrink-0">
                       <BarChart3 size={18} className="text-primary" />
                    </div>
                    <div className="hidden sm:block">
                       <h1 className="text-xs font-black text-white uppercase tracking-[0.3em] leading-none mb-1">Predictions</h1>
                       <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none">Trading Hub</p>
                    </div>
                 </div>

                 <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                      onClick={() => { setTerminalView('EXPLORE'); setSelectedMarketId(null); }}
                      className={cn(
                        "px-4 sm:px-8 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        terminalView === 'EXPLORE' && !selectedMarketId ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                      )}
                    >
                      <Activity size={12} />
                      <span className="hidden xs:inline">Markets</span>
                    </button>
                    <button
                      onClick={() => { setTerminalView('PORTFOLIO'); setSelectedMarketId(null); }}
                      className={cn(
                        "px-4 sm:px-8 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        terminalView === 'PORTFOLIO' ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                      )}
                    >
                      <History size={12} />
                      <span className="hidden xs:inline">Ledger</span>
                      {userPredictions.some(p => p.status === 'ACTIVE') && (
                         <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      )}
                    </button>
                 </div>
              </div>

              {userData && (
                 <div className="flex items-center gap-4">
                    <div className="text-right hidden xs:block">
                       <p className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Available Pulse</p>
                       <p className="text-xs font-mono font-bold text-white tabular-nums">{userData.points?.toLocaleString()} PTS</p>
                    </div>
                    <div className="w-10 h-10 bg-surface border border-border rounded-xl flex items-center justify-center text-primary shadow-inner shrink-0">
                       <Zap size={18} fill="currentColor" />
                    </div>
                 </div>
              )}
           </div>
        </div>

        {/* MAIN TERMINAL VIEWPORT (Overflow Controlled) */}
        <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 pb-32 min-h-0 overflow-x-hidden">
           <AnimatePresence mode="wait">
              {selectedMarketId && activeMarket ? (
                 <motion.div
                   key="execution"
                   initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                   className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12"
                 >
                    {/* Market Intelligence Panel */}
                    <div className="lg:col-span-8 space-y-8 min-w-0">
                       <button
                         onClick={() => setSelectedMarketId(null)}
                         className="flex items-center gap-2 text-text-tertiary hover:text-white transition-colors group px-1"
                       >
                         <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                         <span className="text-[10px] font-black uppercase tracking-[0.3em]">Back to Explorer</span>
                       </button>

                       <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
                             <div className="flex items-center gap-5 min-w-0">
                                <div className="w-16 h-16 rounded-2xl bg-[#0A0A0F] border border-white/5 flex items-center justify-center p-3 shrink-0 shadow-2xl">
                                   {coinData?.image ? <img src={coinData.image} className="w-full h-full object-contain" alt="" /> : <BarChart3 className="text-primary" />}
                                </div>
                                <div className="min-w-0">
                                   <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                      <h2 className="text-3xl font-bold text-white tracking-tighter uppercase leading-none truncate">{activeMarket.symbol} INDEX</h2>
                                      <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[8px] font-black text-primary uppercase tracking-widest">REALTIME</span>
                                   </div>
                                   <p className="text-text-tertiary text-xs sm:text-sm font-medium italic opacity-60 leading-tight">{activeMarket.question}</p>
                                </div>
                             </div>

                             <div className="flex items-center gap-6 sm:gap-10 bg-white/[0.02] border border-white/5 p-5 rounded-2xl shadow-inner min-w-[200px]">
                                <div className="space-y-1">
                                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Entry Ref</p>
                                   <p className="text-xl font-mono font-bold text-white tabular-nums">${(coinData?.current_price || activeMarket.price || 0).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1 text-right ml-auto">
                                   <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Volatility</p>
                                   <p className={cn(
                                     "text-sm font-mono font-bold tabular-nums",
                                     (coinData?.price_change_percentage_24h || 0) < 0 ? "text-danger" : "text-success"
                                   )}>
                                      {(coinData?.price_change_percentage_24h || 0) > 0 ? '+' : ''}{coinData?.price_change_percentage_24h?.toFixed(2)}%
                                   </p>
                                </div>
                             </div>
                          </div>

                          <div className="bg-[#050507] border border-white/5 rounded-[2.5rem] p-4 sm:p-8 flex flex-col shadow-2xl relative overflow-hidden">
                             <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                   <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Market Live</span>
                                </div>
                                <LineChart size={14} className="text-primary/40" />
                             </div>
                             <div className="flex-1 min-h-[300px] sm:min-h-[400px]">
                                <PredictionChart assetId={activeMarket.assetId} symbol={activeMarket.symbol} />
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Active Capital Execution Panel */}
                    <div className="lg:col-span-4 lg:sticky lg:top-[140px] h-fit pb-12 sm:pb-0">
                       <div className="bg-[#0A0A0F] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,1)] flex flex-col">
                          <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                             <h3 className="text-xl font-bold text-white tracking-tighter uppercase italic">Capital Execution</h3>
                          </div>

                          <div className="p-8 space-y-10">
                             <div className="space-y-5">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] block ml-1">Direction Vector</label>
                                <div className="grid grid-cols-2 gap-4">
                                   <button
                                     onClick={() => setPrediction('UP')}
                                     className={cn(
                                       "p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                       prediction === 'UP' ? "bg-success/10 border-success shadow-[0_0_30px_rgba(34,197,94,0.2)]" : "bg-white/[0.01] border-white/5 hover:border-success/30"
                                     )}
                                   >
                                      <TrendingUp size={24} className={cn("transition-all", prediction === 'UP' ? "text-success scale-110" : "text-white/10")} />
                                      <p className={cn("font-black uppercase tracking-[0.2em] text-[10px]", prediction === 'UP' ? "text-success" : "text-white/20")}>BULLISH</p>
                                   </button>
                                   <button
                                     onClick={() => setPrediction('DOWN')}
                                     className={cn(
                                       "p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                                       prediction === 'DOWN' ? "bg-danger/10 border-danger shadow-[0_0_30px_rgba(239,68,68,0.2)]" : "bg-white/[0.01] border-white/5 hover:border-danger/30"
                                     )}
                                   >
                                      <TrendingDown size={24} className={cn("transition-all", prediction === 'DOWN' ? "text-danger scale-110" : "text-white/10")} />
                                      <p className={cn("font-black uppercase tracking-[0.2em] text-[10px]", prediction === 'DOWN' ? "text-danger" : "text-white/20")}>BEARISH</p>
                                   </button>
                                </div>
                             </div>

                             <div className="space-y-5">
                                <div className="flex justify-between items-center px-1">
                                   <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Stake Allocation</label>
                                   <span className="text-[10px] font-mono font-bold text-white/40 uppercase">PTS Unit</span>
                                </div>
                                <div className="flex flex-wrap gap-2.5">
                                   {STAKE_OPTIONS.map((opt) => (
                                      <button
                                        key={opt}
                                        onClick={() => setStake(opt)}
                                        className={cn(
                                          "px-4 py-2.5 rounded-xl border text-[10px] font-mono font-bold transition-all",
                                          stake === opt ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/[0.03] border-white/10 text-white/30 hover:border-white/20"
                                        )}
                                      >
                                         {opt}
                                      </button>
                                   ))}
                                </div>
                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5 shadow-inner">
                                   <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-text-tertiary">
                                      <span>Stake Amount</span>
                                      <span className="text-white font-mono">{stake.toLocaleString()} PTS</span>
                                   </div>
                                   <div className="h-px bg-white/5" />
                                   <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-2">
                                         <Zap size={14} className="text-primary animate-pulse" />
                                         <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Potential Win</span>
                                      </div>
                                      <div className="text-right">
                                         <span className="text-xl font-mono font-bold text-primary block leading-none">{(stake * 2).toLocaleString()} PTS</span>
                                         <span className="text-[8px] font-black text-primary/30 uppercase tracking-[0.2em]">FIXED 2.0X REWARD</span>
                                      </div>
                                   </div>
                                </div>
                             </div>

                             <Button
                               className="w-full h-16 bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-[0.4em] text-[11px] rounded-2xl shadow-2xl active:scale-[0.98] disabled:opacity-10 italic"
                               disabled={!prediction || isSubmitting}
                               isLoading={isSubmitting}
                               onClick={handlePredict}
                             >
                               INITIATE FORECAST
                             </Button>
                          </div>
                       </div>
                    </div>
                 </motion.div>
              ) : terminalView === 'EXPLORE' ? (
                 <motion.div
                   key="explore"
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="space-y-12"
                 >
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div className="space-y-4">
                          <div className="flex items-center gap-2">
                             <Target size={14} className="text-primary" />
                             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Global Markets</span>
                          </div>
                          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none uppercase">Explore</h2>
                       </div>
                       <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/5 text-text-tertiary">
                          <Search size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Tracking {allMarkets.length} Assets</span>
                       </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                       {marketLoading && allMarkets.length === 0 ? (
                          Array.from({ length: 6 }).map((_, i) => (
                             <div key={i} className="h-[280px] rounded-[2.5rem] bg-white/[0.01] border border-white/5 animate-pulse" />
                          ))
                       ) : (
                          allMarkets.map((market) => (
                             <motion.div
                               key={market.id}
                               whileHover={{ y: -5 }}
                               onClick={() => { setSelectedMarketId(market.id); setPrediction(null); window.scrollTo(0,0); }}
                               className="group p-8 rounded-[2.5rem] bg-[#0A0A0F] border border-white/5 hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[300px] shadow-2xl"
                             >
                                <div className="flex justify-between items-start">
                                   <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 p-3 flex items-center justify-center group-hover:border-primary/20 transition-all shadow-inner">
                                      {market.image ? <img src={market.image} className="w-full h-full object-contain" alt="" /> : <BarChart3 size={24} className="text-primary" />}
                                   </div>
                                   <div className="text-right">
                                      <p className="text-sm font-mono font-bold text-white tabular-nums">${(market.price || 0).toLocaleString()}</p>
                                      <span className={cn(
                                        "text-[10px] font-bold tabular-nums",
                                        (market.change || 0) < 0 ? "text-danger" : "text-success"
                                      )}>
                                         {(market.change || 0) > 0 ? '+' : ''}{market.change?.toFixed(2)}%
                                      </span>
                                   </div>
                                </div>

                                <div className="space-y-6">
                                   <div className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                      <div className="w-1 h-1 rounded-full bg-success animate-pulse" />
                                      <span className="text-[8px] font-black text-success uppercase tracking-[0.2em]">Market Active</span>
                                   </div>
                                   <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors italic">
                                      {market.question}
                                   </h3>

                                   <div className="grid grid-cols-2 gap-4 py-5 border-y border-white/5">
                                      <div className="space-y-1">
                                         <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Multiplier</p>
                                         <p className="text-xs font-mono font-bold text-white">2.00x</p>
                                      </div>
                                      <div className="space-y-1 text-right">
                                         <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Settlement</p>
                                         <p className="text-xs font-mono font-bold text-white">24H</p>
                                      </div>
                                   </div>

                                   <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                         <Zap size={10} className="text-primary" />
                                         <span className="text-[9px] font-black uppercase tracking-widest text-primary">Yield Enabled</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-white/20 group-hover:text-white transition-all">
                                         <span className="text-[10px] font-black uppercase tracking-widest">View Details</span>
                                         <ArrowLeft className="rotate-180" size={14} />
                                      </div>
                                   </div>
                                </div>
                             </motion.div>
                          ))
                       )}
                    </div>
                 </motion.div>
              ) : (
                 <motion.div
                   key="portfolio"
                   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                   className="space-y-12"
                 >
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                       <div className="space-y-4">
                          <div className="flex items-center gap-2">
                             <BarChart3 size={14} className="text-primary" />
                             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Forecast History</span>
                          </div>
                          <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tighter leading-none uppercase">Portfolio</h2>
                       </div>

                       <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar shrink-0">
                          {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((f) => (
                              <button
                                  key={f}
                                  onClick={() => setHistoryFilter(f)}
                                  className={cn(
                                      "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                                      historyFilter === f ? "bg-white text-black shadow-xl" : "text-text-tertiary hover:text-white"
                                  )}
                              >
                                  {f}
                              </button>
                          ))}
                       </div>
                    </header>

                    <div className="space-y-2">
                       {filteredPredictions.map((pred: PredictionRecord) => {
                          const isWin = pred.status === 'RESOLVED' && (pred.rewardAmount || 0) > 0;
                          return (
                            <motion.div
                               key={pred.id}
                               whileHover={{ x: 4 }}
                               onClick={() => setSelectedHistoryItem(pred)}
                               className="group relative overflow-hidden cursor-pointer"
                            >
                              <div className={cn(
                                  "absolute inset-y-0 left-0 w-1 transition-all group-hover:w-1.5",
                                  pred.status === 'ACTIVE' ? "bg-primary" : isWin ? "bg-success" : "bg-white/10"
                              )} />

                              <div className="p-4 sm:p-5 rounded-xl bg-[#0A0A0F] border border-white/5 flex items-center justify-between gap-6 transition-all hover:bg-white/[0.02]">
                                 <div className="flex items-center gap-4 min-w-0">
                                    <div className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center border transition-all shadow-inner shrink-0",
                                      pred.status === 'ACTIVE' ? "bg-primary/5 border-primary/20 text-primary" :
                                      isWin ? "bg-success/5 border-success/20 text-success" :
                                      "bg-white/[0.02] border-white/10 text-white/10"
                                    )}>
                                       {pred.direction === 'UP' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                    </div>

                                    <div className="min-w-0">
                                       <h3 className="text-sm font-bold text-white uppercase tracking-tight italic truncate">
                                          {pred.symbol}
                                       </h3>
                                       <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary mt-0.5">
                                          {pred.createdAt?.toDate?.().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'PENDING'}
                                       </p>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-8 sm:gap-12 text-right">
                                    <div className="hidden xs:block">
                                       <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Entry</p>
                                       <p className="text-xs font-mono font-bold text-white tabular-nums">${pred.entryPrice.toLocaleString()}</p>
                                    </div>
                                    <div>
                                       <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Result</p>
                                       <p className={cn("text-sm font-mono font-bold tabular-nums", isWin ? "text-success" : "text-white/10")}>
                                          {pred.status === 'ACTIVE' ? '---' : isWin ? `+${pred.rewardAmount?.toLocaleString()}` : '0'}
                                       </p>
                                    </div>
                                    <ChevronRight size={14} className="text-white/10 group-hover:text-primary transition-colors" />
                                 </div>
                              </div>
                            </motion.div>
                          );
                       })}

                       {filteredPredictions.length === 0 && (
                          <div className="py-40 text-center border border-dashed border-white/10 rounded-[3rem] bg-white/[0.01] flex flex-col items-center gap-8 group">
                             <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-white/5 group-hover:text-primary/20 transition-all duration-700">
                                <Activity size={40} />
                             </div>
                             <div className="space-y-2">
                                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20">Empty History</p>
                                <p className="text-xs text-text-tertiary font-medium">No forecast records detected in your account.</p>
                             </div>
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
