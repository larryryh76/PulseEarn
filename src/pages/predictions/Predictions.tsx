import React, { useState, useEffect } from 'react';
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
  Trophy,
  History,
  ArrowRight,
  Zap,
  Activity,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import PredictionChart from './components/PredictionChart';
import { SystemTaskEngine } from '../../engines/tasks/SystemTaskEngine';

const Predictions: React.FC = () => {
  const { marketData } = useCryptoData();
  const { currentUser, userData } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userPredictions, setUserPredictions] = useState<PredictionRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automated fallback events generated from live market data
  const automatedEvents = marketData.slice(0, 4).map(coin => ({
    id: `auto_${coin.id}_daily`,
    assetId: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: `${coin.name} Velocity Forecast`,
    predictionQuestion: `Will ${coin.symbol.toUpperCase()} maintain bullish momentum in the next 24h?`,
    totalPrizePool: 5000,
    type: 'DAILY',
    participantsCount: Math.floor(Math.random() * 500) + 100, // Simulated for automated only
    image: coin.image,
    price: coin.current_price,
    change: coin.price_change_percentage_24h
  }));

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
        limit(20)
      );
      onSnapshot(predQ, (snap) => {
        setUserPredictions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PredictionRecord)));
      });
    }

    return () => unsubscribe();
  }, [currentUser]);

  const handlePredict = async (event: any) => {
    if (!currentUser || !prediction || !userData) return;

    const stake = 100;
    if (userData.points < stake) return toast.error('Insufficient PTS for this forecast');
    if (userPredictions.find(p => p.taskId === event.id && p.status === 'ACTIVE')) {
      return toast.error('Duplicate position detected for this market');
    }

    setIsSubmitting(true);
    try {
      const assetId = event.assetId || (event as any).predictionAsset;
      const coinData = marketData.find(c => c.id === assetId);
      const predId = `${currentUser.uid}_${event.id}_${Date.now()}`;

      const { PointTransactionEngine } = await import('../../engines/points/PointTransactionEngine');
      const result = await PointTransactionEngine.executePrediction({
         userId: currentUser.uid,
         taskId: event.id,
         amount: stake,
         assetId: assetId,
         symbol: coinData?.symbol || event.symbol || 'CRYPTO',
         direction: prediction,
         entryPrice: coinData?.current_price || event.price || 0,
         claimId: predId
      });

      if (!result.success) throw new Error(result.error);

      // Trigger System Task Engine for first prediction/activity
      await SystemTaskEngine.processEvent(currentUser.uid, 'prediction_submitted');

      toast.success(`Position Authorized: ${prediction} at $${(coinData?.current_price || event.price).toLocaleString()}`);
      setSelectedEvent(null);
      setPrediction(null);
    } catch (err: any) {
      toast.error(err.message || 'Authorization failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const featuredEvent = campaigns.find(c => c.featured) || (automatedEvents.length > 0 ? automatedEvents[0] : null);

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* PRODUCT HERO: FEATURED MARKET */}
        {featuredEvent && (
          <section className="mb-20">
            <div className="relative w-full rounded-[3.5rem] border border-white/5 overflow-hidden bg-surface-bright/20 p-12 md:p-20 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 <div className="space-y-10">
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/20">Featured Market</span>
                       <div className="flex items-center gap-2 text-text-tertiary">
                          <Activity size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{(featuredEvent.participantsCount || 0)?.toLocaleString()} Joined</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-tight text-white uppercase italic">
                          {featuredEvent.name}
                       </h1>
                       <p className="text-2xl text-text-secondary font-medium tracking-tight max-w-lg leading-relaxed">
                          {featuredEvent.predictionQuestion || 'Analyze the market trajectory and authorize your forecast.'}
                       </p>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center">
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Reward Pool</p>
                          <p className="text-3xl font-mono font-bold text-white tracking-tighter">
                             +{(featuredEvent.totalPrizePool || 0)?.toLocaleString()} <span className="text-xs text-primary uppercase">pts</span>
                          </p>
                       </div>
                       <div className="w-px h-12 bg-white/10 hidden md:block" />
                       <Button
                         size="lg"
                         className="h-16 px-12 rounded-2xl bg-white text-black hover:bg-primary hover:text-white transition-all font-black uppercase tracking-widest text-[11px]"
                         onClick={() => setSelectedEvent(featuredEvent)}
                       >
                          Analyze Forecast <ArrowRight size={20} className="ml-2" />
                       </Button>
                    </div>
                 </div>

                 <div className="hidden lg:block bg-black/40 rounded-[2.5rem] border border-white/5 p-8 backdrop-blur-xl">
                    <PredictionChart
                      assetId={(featuredEvent as any).assetId || (featuredEvent as any).predictionAsset || 'bitcoin'}
                      symbol={(featuredEvent as any).symbol || 'BTC'}
                    />
                 </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
           {/* LEFT: ACTIVE OPPORTUNITIES */}
           <div className="lg:col-span-8 space-y-16">
              <section className="space-y-8">
                 <div className="flex items-center justify-between border-b border-white/5 pb-6">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-3">
                       <Zap className="text-primary" size={18} />
                       Active Markets
                    </h2>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                       {automatedEvents.length + campaigns.length} Markets Live
                    </span>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* COMBINED MARKET FEED (ADMIN + AUTOMATED) */}
                    {[...campaigns, ...automatedEvents].map((market: any) => {
                      const existing = userPredictions.find(p => p.taskId === market.id && p.status === 'ACTIVE');
                      const coin = marketData.find(c => c.id === market.assetId || c.id === market.predictionAsset);

                      return (
                        <div
                          key={market.id}
                          className={cn(
                            "group p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all cursor-pointer",
                            existing && "border-primary/20 bg-primary/[0.01]"
                          )}
                          onClick={() => setSelectedEvent(market)}
                        >
                           <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-2">
                                    <img src={coin?.image || market.image} className="w-full h-full object-contain" alt="" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] font-bold text-white uppercase tracking-widest">{market.symbol || coin?.symbol}</p>
                                    <p className="text-[11px] font-mono font-bold text-text-tertiary">${(coin?.current_price || market.price || 0).toLocaleString()}</p>
                                 </div>
                              </div>
                              {existing ? (
                                <div className="badge-system badge-primary border-primary/20">Active</div>
                              ) : (
                                <div className="text-[9px] font-black uppercase tracking-widest text-text-tertiary px-2 py-1 bg-white/5 rounded">Live</div>
                              )}
                           </div>

                           <h3 className="text-sm font-bold text-white mb-4 line-clamp-2 leading-snug uppercase tracking-tight group-hover:text-primary transition-colors">
                              {market.predictionQuestion || market.name}
                           </h3>

                           <div className="flex items-center justify-between pt-4 border-t border-white/5">
                              <div className="flex items-center gap-4 text-[9px] font-bold text-text-tertiary uppercase tracking-widest">
                                 <span className="flex items-center gap-1.5"><Trophy size={12} className="text-primary" /> {market.totalPrizePool.toLocaleString()} PTS</span>
                                 <span className="flex items-center gap-1.5"><Clock size={12} /> {market.endDate ? 'Ends Soon' : '24h'}</span>
                              </div>
                              <ChevronRight size={16} className="text-white/20 group-hover:text-white transition-colors" />
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </section>
           </div>

           {/* RIGHT: PORTFOLIO & RANKING */}
           <div className="lg:col-span-4 space-y-16">
              <section className="space-y-8">
                 <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3">
                    <History size={16} className="text-primary" />
                    Market Portfolio
                 </h2>

                 <div className="space-y-2">
                    {userPredictions.map(pred => (
                      <div key={pred.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                         <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center border",
                              pred.status === 'RESOLVED' ? "bg-success/5 border-success/20 text-success" : "bg-primary/5 border-primary/20 text-primary"
                            )}>
                               {pred.direction === 'UP' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div>
                               <p className="text-[11px] font-bold text-white uppercase tracking-tight">{pred.symbol} Forecast</p>
                               <p className={cn(
                                 "text-[8px] font-black uppercase tracking-[0.1em] mt-0.5",
                                 pred.status === 'RESOLVED' ? "text-success" : "text-primary"
                               )}>{pred.status}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[11px] font-mono font-bold text-white">${pred.entryPrice.toLocaleString()}</p>
                            <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">Authorized Price</p>
                         </div>
                      </div>
                    ))}

                    {userPredictions.length === 0 && (
                      <div className="py-16 text-center border border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center gap-4 opacity-40">
                         <History size={24} className="text-text-tertiary" />
                         <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">No Market Activity Found</p>
                      </div>
                    )}
                 </div>
              </section>

              <Card className="bg-primary/[0.03] border-primary/10 p-8 rounded-[3rem] space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                       <Trophy className="text-primary" size={20} />
                    </div>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Alpha Performance</h2>
                 </div>

                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <p className="text-[9px] font-bold text-text-tertiary uppercase">Total Forecasts</p>
                       <p className="text-xl font-mono font-bold text-white">{userData?.stats?.predictionsCount || 0}</p>
                    </div>
                    <div className="flex justify-between items-end">
                       <p className="text-[9px] font-bold text-text-tertiary uppercase">Successful Exits</p>
                       <p className="text-xl font-mono font-bold text-success">{userData?.stats?.totalWins || 0}</p>
                    </div>
                    <div className="pt-4 border-t border-white/5">
                       <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-3">
                          <span className="text-text-tertiary">Win Rate</span>
                          <span className="text-primary">{((userData?.stats?.totalWins || 0) / (userData?.stats?.predictionsCount || 1) * 100).toFixed(1)}%</span>
                       </div>
                       <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(((userData?.stats?.totalWins || 0) / (userData?.stats?.predictionsCount || 1)) * 100, 100)}%` }}
                            className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                          />
                       </div>
                    </div>
                 </div>
              </Card>
           </div>
        </div>
      </div>

      {/* IMMERSIVE AUTHORIZATION FLOW */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
             <motion.div
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-background/95 backdrop-blur-xl"
               onClick={() => setSelectedEvent(null)}
             />
             <motion.div
               initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }}
               className="relative w-full max-w-4xl bg-surface border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-full max-h-[90vh] lg:h-auto"
             >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-success" />

                {/* PRODUCT DATA SIDE */}
                <div className="flex-1 p-8 md:p-12 space-y-8 overflow-y-auto custom-scrollbar">
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2.5">
                            <img src={marketData.find(c => c.id === (selectedEvent.assetId || selectedEvent.predictionAsset))?.image || selectedEvent.image} className="w-full h-full object-contain" alt="" />
                         </div>
                         <div>
                            <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">{selectedEvent.name}</h2>
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.3em]">{selectedEvent.symbol || marketData.find(c => c.id === selectedEvent.assetId)?.symbol} SPOT MARKET</p>
                         </div>
                      </div>
                      <p className="text-xl text-text-secondary font-medium leading-relaxed italic max-w-xl">
                         {selectedEvent.predictionQuestion || 'Authorize your directional forecast based on current market dynamics.'}
                      </p>
                   </div>

                   <div className="bg-black/20 rounded-[2.5rem] border border-white/5 p-8 space-y-8">
                      <PredictionChart
                         assetId={selectedEvent.assetId || selectedEvent.predictionAsset}
                         symbol={selectedEvent.symbol || 'CRYPTO'}
                      />
                      <div className="flex items-center justify-between px-2">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Mark Price</p>
                            <p className="text-3xl font-mono font-bold text-white tracking-tighter">
                               ${(marketData.find(c => c.id === (selectedEvent.assetId || selectedEvent.predictionAsset))?.current_price || selectedEvent.price || 0).toLocaleString()}
                            </p>
                         </div>
                         <div className="text-right space-y-1">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Market Status</p>
                            <span className="flex items-center gap-2 justify-end text-success text-xs font-bold uppercase tracking-widest">
                               <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                               Synchronized
                            </span>
                         </div>
                      </div>
                   </div>
                </div>

                {/* AUTHORIZATION SIDE */}
                <div className="w-full lg:w-[400px] bg-white/[0.03] border-l border-white/5 p-8 md:p-12 flex flex-col justify-between space-y-10">
                   <div className="flex justify-between items-start">
                      <div className="space-y-1">
                         <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Capital Authorization</p>
                         <h3 className="text-lg font-bold text-white uppercase tracking-tight">Set Direction</h3>
                      </div>
                      <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all text-text-tertiary">
                         <ChevronRight size={24} className="rotate-90 lg:rotate-0" />
                      </button>
                   </div>

                   <div className="space-y-6 flex-grow flex flex-col justify-center">
                      <button
                        onClick={() => setPrediction('UP')}
                        className={cn(
                          "p-8 rounded-[2rem] border-2 transition-all flex items-center justify-between group",
                          prediction === 'UP' ? "bg-success/10 border-success text-success shadow-lg shadow-success/10" : "bg-white/[0.02] border-white/5 text-white/40 hover:border-success/30 hover:text-success"
                        )}
                      >
                         <div className="flex items-center gap-5">
                            <div className={cn("p-3.5 rounded-2xl", prediction === 'UP' ? "bg-success/20" : "bg-white/5 group-hover:bg-success/10")}>
                               <TrendingUp size={28} />
                            </div>
                            <div className="text-left">
                               <p className="font-black uppercase tracking-[0.2em] text-xs">Bullish</p>
                               <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">Forecast Appreciation</p>
                            </div>
                         </div>
                      </button>

                      <button
                        onClick={() => setPrediction('DOWN')}
                        className={cn(
                          "p-8 rounded-[2rem] border-2 transition-all flex items-center justify-between group",
                          prediction === 'DOWN' ? "bg-danger/10 border-danger text-danger shadow-lg shadow-danger/10" : "bg-white/[0.02] border-white/5 text-white/40 hover:border-danger/30 hover:text-danger"
                        )}
                      >
                         <div className="flex items-center gap-5">
                            <div className={cn("p-3.5 rounded-2xl", prediction === 'DOWN' ? "bg-danger/20" : "bg-white/5 group-hover:bg-danger/10")}>
                               <TrendingDown size={28} />
                            </div>
                            <div className="text-left">
                               <p className="font-black uppercase tracking-[0.2em] text-xs">Bearish</p>
                               <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">Forecast Depreciation</p>
                            </div>
                         </div>
                      </button>

                      <div className="bg-black/40 rounded-[2rem] p-6 border border-white/5 space-y-4">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Required Stake</span>
                            <span className="text-sm font-mono font-bold text-white uppercase">100.00 pts</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Network Fee</span>
                            <span className="text-sm font-mono font-bold text-success uppercase">Free</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <Button
                        className="w-full h-18 bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-[1.5rem] disabled:opacity-20 transition-all shadow-2xl active:scale-[0.98]"
                        disabled={!prediction || isSubmitting}
                        isLoading={isSubmitting}
                        onClick={() => handlePredict(selectedEvent)}
                      >
                         Authorize Execution
                      </Button>
                      <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest text-center px-4">
                         Authorization confirms the entry price and freezes the required stake until market resolution.
                      </p>
                   </div>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Predictions;
