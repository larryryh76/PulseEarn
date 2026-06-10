import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useCryptoData } from '../../hooks/useCryptoData';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Campaign, PredictionRecord } from '../../types';
import { TrendingUp, TrendingDown, Clock, Trophy, History, ArrowRight, Zap, Activity, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import PredictionChart from './components/PredictionChart';

const Predictions: React.FC = () => {
  const { marketData, loading: marketLoading } = useCryptoData();
  const { currentUser, userData } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userPredictions, setUserPredictions] = useState<PredictionRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Layer 1: Automated Pulse Events
  const automatedEvents = [
     {
       id: 'auto_btc_weekly',
       assetId: 'bitcoin',
       symbol: 'BTC',
       name: 'Bitcoin Alpha Forecast',
       predictionQuestion: 'Will BTC maintain bullish momentum above current levels?',
       totalPrizePool: 25000,
       type: 'WEEKLY',
       participantsCount: 1242
     },
     {
       id: 'auto_eth_daily',
       assetId: 'ethereum',
       symbol: 'ETH',
       name: 'Ethereum Momentum',
       predictionQuestion: 'Will ETH market depth increase in the next 24h?',
       totalPrizePool: 10000,
       type: 'DAILY',
       participantsCount: 856
     },
     {
       id: 'auto_sol_pulse',
       assetId: 'solana',
       symbol: 'SOL',
       name: 'Solana Velocity',
       predictionQuestion: 'Will SOL maintain current support levels?',
       totalPrizePool: 15000,
       type: 'DAILY',
       participantsCount: 2103
     },
  ];

  const featuredEvent = campaigns.find(c => c.featured) || automatedEvents[0];

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), where('category', '==', 'PREDICTION'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
    });

    if (currentUser) {
      const predQ = query(collection(db, 'user_predictions'), where('userId', '==', currentUser.uid));
      onSnapshot(predQ, (snap) => {
        setUserPredictions(snap.docs.map(d => d.data() as PredictionRecord));
      });
    }

    const leaderQ = query(collection(db, 'users'), where('stats.predictionsCount', '>', 0), limit(10));
    const unsubLeader = onSnapshot(leaderQ, (snap) => {
      const leaders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLeaderboard(leaders.sort((a: any, b: any) => (b.stats?.predictionsCount || 0) - (a.stats?.predictionsCount || 0)));
    });

    return () => {
      unsubscribe();
      unsubLeader();
    };
  }, [currentUser]);

  const handlePredict = async (event: any) => {
    if (!currentUser || !prediction || !userData) return;

    const stake = 100;
    if (userData.points < stake) return toast.error('Insufficient capital for this execution');
    if (userPredictions.find(p => p.taskId === event.id)) return toast.error('Duplicate execution detected for this event');

    setIsSubmitting(true);
    try {
      const assetId = event.assetId || (event as any).predictionAsset || (event.name.toLowerCase().includes('bitcoin') ? 'bitcoin' : 'ethereum');
      const coinData = marketData.find(c => c.id === assetId);
      const predId = `${currentUser.uid}_${event.id}`;
      const potentialReward = stake * 2;

      const { PointTransactionEngine } = await import('../../engines/points/PointTransactionEngine');
      const result = await PointTransactionEngine.executePrediction({
         userId: currentUser.uid,
         taskId: event.id,
         amount: stake,
         rewardAmount: potentialReward,
         assetId: assetId,
         symbol: coinData?.symbol || event.symbol || 'CRYPTO',
         direction: prediction,
         entryPrice: coinData?.current_price || 0,
         claimId: predId
      });

      if (!result.success) throw new Error(result.error);
      toast.success(`Market Forecast Executed: ${prediction} at ${coinData?.current_price}`);
      setSelectedEvent(null);
      setPrediction(null);
    } catch (err: any) {
      toast.error(err.message || 'Execution failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* HERO: FEATURED PREDICTION PRODUCT */}
        {featuredEvent && (
          <section className="mb-20">
            <div className={cn(
              "relative w-full rounded-[3.5rem] border border-white/10 overflow-hidden bg-surface-bright/20 p-12 md:p-20",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:to-transparent"
            )}>
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                 <div className="w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent blur-3xl" />
              </div>

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 <div className="space-y-10">
                    <div className="flex items-center gap-3">
                       <span className="px-3 py-1 bg-accent/20 text-accent text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-accent/20">Featured Market</span>
                       <div className="flex items-center gap-2 text-text-tertiary">
                          <Activity size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">{(featuredEvent.participantsCount || 0)?.toLocaleString()} Participants</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none text-white">
                          {featuredEvent.name}
                       </h1>
                       <p className="text-2xl md:text-3xl text-text-secondary font-medium tracking-tight">
                          {featuredEvent.predictionQuestion || 'Will market volatility increase?'}
                       </p>
                    </div>

                    <div className="flex flex-wrap gap-8">
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Reward Pool</p>
                          <p className="text-3xl font-mono font-bold text-white tracking-tighter">
                             +{(featuredEvent.totalPrizePool || 0)?.toLocaleString()} <span className="text-xs text-primary">PTS</span>
                          </p>
                       </div>
                       <div className="w-px h-12 bg-white/10 hidden md:block" />
                       <div className="space-y-1">
                          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Ends In</p>
                          <p className="text-3xl font-mono font-bold text-white tracking-tighter">
                             {(featuredEvent as any).endDate ? '48:12:05' : '24h Cycle'}
                          </p>
                       </div>
                    </div>

                    <Button
                      size="lg"
                      className="h-16 px-12 rounded-[1.5rem] bg-white text-black hover:bg-primary hover:text-white border-0 transition-all font-black uppercase tracking-widest"
                      onClick={() => setSelectedEvent(featuredEvent)}
                    >
                       Execute Forecast <ArrowRight size={20} className="ml-2" />
                    </Button>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
           <div className="lg:col-span-8 space-y-20">
              {/* ACTIVE MARKETS */}
              <section className="space-y-10">
                <div className="flex items-center justify-between">
                   <h2 className="text-2xl font-bold tracking-tight flex items-center gap-4 uppercase tracking-[0.1em]">
                      <Zap className="text-primary" size={24} />
                      Active Markets
                   </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {automatedEvents.map(event => {
                     const existing = userPredictions.find(p => p.taskId === event.id);
                     const coin = marketData.find(c => c.id === event.assetId);
                     return (
                       <Card
                         key={event.id}
                         className={cn(
                           "group p-8 space-y-8 transition-all cursor-pointer border-white/5 relative overflow-hidden bg-surface-bright/20",
                           existing ? "opacity-60" : "hover:border-primary/40 hover:bg-surface-bright/30"
                         )}
                         onClick={() => !existing && setSelectedEvent(event)}
                       >
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                   <img src={coin?.image} className="w-8 h-8" alt="" />
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white uppercase">{event.symbol}</p>
                                   <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">${coin?.current_price.toLocaleString()}</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="badge-system badge-primary">2.0x Yield</span>
                             </div>
                          </div>

                          <div className="space-y-2">
                             <h3 className="text-lg font-bold text-white tracking-tight line-clamp-2 leading-tight">
                                {event.predictionQuestion}
                             </h3>
                             <div className="flex items-center gap-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Trophy size={12} className="text-accent" /> {event.totalPrizePool.toLocaleString()} PTS</span>
                                <span className="flex items-center gap-1.5"><Activity size={12} /> {event.participantsCount.toLocaleString()} Joined</span>
                             </div>
                          </div>

                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-text-tertiary">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">14:22:10 Left</span>
                             </div>
                             <Button size="sm" variant={existing ? "outline" : "primary"} className="rounded-xl px-6">
                                {existing ? 'Position Active' : 'Predict Now'}
                             </Button>
                          </div>
                       </Card>
                     );
                   })}

                   {/* Campaign Markets */}
                   {campaigns.map(camp => {
                     const existing = userPredictions.find(p => p.taskId === camp.id);
                     const coin = marketData.find(c => c.id === (camp as any).predictionAsset);
                     return (
                       <Card
                         key={camp.id}
                         className={cn(
                           "group p-8 space-y-8 transition-all cursor-pointer border-white/5 relative overflow-hidden bg-surface-bright/20",
                           existing ? "opacity-60" : "hover:border-accent/40 hover:bg-surface-bright/30"
                         )}
                         onClick={() => !existing && setSelectedEvent({ ...camp, assetId: (camp as any).predictionAsset })}
                       >
                          <div className="flex justify-between items-start">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center overflow-hidden border border-accent/20">
                                   <BarChart2 size={24} className="text-accent" />
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-white uppercase">{camp.name}</p>
                                   <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{coin?.symbol || 'CRYPTO'} MARKET</p>
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="badge-system border-accent/20 bg-accent/10 text-accent">Premier Event</span>
                             </div>
                          </div>

                          <div className="space-y-2">
                             <h3 className="text-lg font-bold text-white tracking-tight line-clamp-2 leading-tight">
                                {camp.predictionQuestion || camp.description}
                             </h3>
                             <div className="flex items-center gap-4 text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Trophy size={12} className="text-accent" /> {camp.totalPrizePool.toLocaleString()} PTS</span>
                                <span className="flex items-center gap-1.5"><Activity size={12} /> {camp.participantsCount.toLocaleString()} Joined</span>
                             </div>
                          </div>

                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-text-tertiary">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                   {camp.endDate ? `Ends ${new Date(camp.endDate.toDate()).toLocaleDateString()}` : 'Limited Time'}
                                </span>
                             </div>
                             <Button size="sm" variant={existing ? "outline" : "primary"} className="rounded-xl px-6">
                                {existing ? 'Submitted' : 'Participate'}
                             </Button>
                          </div>
                       </Card>
                     );
                   })}
                </div>
              </section>

              {/* LIVE MARKET OVERVIEW */}
              <section className="space-y-8">
                 <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black tracking-[0.2em] uppercase text-text-tertiary">Live Market Synchronization</h2>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {marketLoading ? (
                       [1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/[0.02] border border-white/5 rounded-[1.5rem] animate-pulse" />)
                    ) : marketData.slice(0, 4).map(coin => (
                         <div
                           key={coin.id}
                           className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] hover:border-primary/40 transition-all group cursor-pointer flex items-center justify-between"
                           onClick={() => {
                             const autoEvent = automatedEvents.find(e => e.assetId === coin.id);
                             if (autoEvent) setSelectedEvent(autoEvent);
                           }}
                         >
                            <div className="flex items-center gap-3">
                               <img src={coin.image} alt="" className="w-6 h-6 rounded-full grayscale group-hover:grayscale-0 transition-all" />
                               <div>
                                  <p className="text-[10px] font-bold text-white uppercase">{coin.symbol}</p>
                                  <p className="text-[11px] font-mono font-bold text-text-tertiary">${coin.current_price.toLocaleString()}</p>
                               </div>
                            </div>
                            <span className={cn("text-[9px] font-bold font-mono", coin.price_change_percentage_24h >= 0 ? "text-success" : "text-danger")}>
                               {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(1)}%
                            </span>
                         </div>
                      ))}
                 </div>
              </section>
           </div>

           {/* Sidebar: Performance & History */}
           <div className="lg:col-span-4 space-y-12">
              <section className="space-y-6">
                 <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary flex items-center gap-3">
                    <History size={16} className="text-primary" />
                    Portfolio Activity
                 </h2>
                 <div className="space-y-3">
                    {userPredictions.slice(0, 5).map(pred => (
                      <div key={pred.id} className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                         <div className="flex items-center gap-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", pred.direction === 'UP' ? "bg-success/5 text-success" : "bg-danger/5 text-danger")}>
                               {pred.direction === 'UP' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div>
                               <p className="text-[11px] font-bold text-white uppercase">{pred.symbol} Forecast</p>
                               <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">{pred.status}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[11px] font-mono font-bold text-white">${pred.entryPrice.toLocaleString()}</p>
                            <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-0.5">Strike Price</p>
                         </div>
                      </div>
                    ))}
                    {userPredictions.length === 0 && (
                      <div className="py-16 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-text-tertiary">
                            <History size={20} />
                         </div>
                         <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">No active market positions</p>
                      </div>
                    )}
                 </div>
              </section>

              <Card className="bg-primary/[0.02] border-white/5 p-8 space-y-8 rounded-[2.5rem]">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Trophy className="text-primary" size={20} />
                       <h2 className="text-[10px] font-black uppercase tracking-[0.2em]">Global Alpha Ranking</h2>
                    </div>
                    {userData?.stats?.predictionsCount && (
                       <div className="text-right">
                          <p className="text-[9px] font-bold text-text-tertiary uppercase mb-0.5">Win Rate</p>
                          <p className="text-sm font-mono font-bold text-accent">
                             {((userData.stats.totalWins || 0) / (userData.stats.predictionsCount || 1) * 100).toFixed(1)}%
                          </p>
                       </div>
                    )}
                 </div>
                 <div className="space-y-5">
                    {leaderboard.length > 0 ? leaderboard.slice(0, 5).map((user, i) => (
                      <div key={user.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/20 overflow-hidden">
                               {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" /> : (i + 1)}
                            </div>
                            <div>
                               <span className="text-[12px] font-bold text-white/80 block leading-none mb-1">{user.username || 'Anonymous'}</span>
                               <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">{user.stats?.predictionsCount || 0} Executions</span>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className="text-xs font-mono font-bold text-accent block tracking-tighter">
                               {((user.stats?.totalWins || 0) / (user.stats?.predictionsCount || 1) * 100).toFixed(1)}%
                            </span>
                         </div>
                      </div>
                    )) : (
                      [1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between opacity-30 animate-pulse">
                           <div className="w-10 h-10 rounded-xl bg-white/5" />
                           <div className="h-4 w-24 bg-white/5 rounded" />
                        </div>
                      ))
                    )}
                 </div>
              </Card>
           </div>
        </div>
      </div>

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
               className="relative w-full max-w-4xl bg-surface border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row h-full max-h-[85vh] lg:h-auto"
             >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-primary via-accent to-success" />

                {/* Left: Market Insight & Chart */}
                <div className="flex-1 p-8 md:p-12 space-y-8 overflow-y-auto">
                   <div className="space-y-4">
                      <div className="flex items-center gap-3">
                         <img src={marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.image} className="w-10 h-10 rounded-full" alt="" />
                         <div>
                            <h2 className="text-2xl font-black tracking-tight text-white uppercase">{selectedEvent.name}</h2>
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">
                               {selectedEvent.symbol || 'CRYPTO'} / USD SPOT MARKET
                            </p>
                         </div>
                      </div>
                      <p className="text-lg text-text-secondary font-medium leading-relaxed">
                         {selectedEvent.predictionQuestion || 'Analyze the market trajectory and authorize your forecast.'}
                      </p>
                   </div>

                   <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6 space-y-6">
                      <PredictionChart
                         assetId={selectedEvent.assetId || (selectedEvent as any).predictionAsset}
                         symbol={selectedEvent.symbol || 'CRYPTO'}
                      />
                      <div className="flex items-center justify-between px-2">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Current Mark Price</p>
                            <p className="text-2xl font-mono font-bold text-white tracking-tighter">
                               ${marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.current_price.toLocaleString()}
                            </p>
                         </div>
                         <div className="text-right space-y-1">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">24h Volatility</p>
                            <span className={cn("text-lg font-mono font-bold", (marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.price_change_percentage_24h || 0) >= 0 ? "text-success" : "text-danger")}>
                               {(marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.price_change_percentage_24h || 0).toFixed(2)}%
                            </span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-2 flex items-center gap-2"><Clock size={12} /> Execution Window</p>
                         <p className="text-sm font-bold text-white uppercase tracking-tight">Active for 14:22:10</p>
                      </div>
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-2 flex items-center gap-2"><Trophy size={12} /> Potential Yield</p>
                         <p className="text-sm font-bold text-success uppercase tracking-tight">+200.00 PTS + 250 XP</p>
                      </div>
                   </div>
                </div>

                {/* Right: Authorization Controls */}
                <div className="w-full lg:w-[380px] bg-white/[0.03] border-l border-white/5 p-8 md:p-12 flex flex-col justify-between space-y-10">
                   <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Capital Execution</p>
                      <button onClick={() => setSelectedEvent(null)} className="text-text-tertiary hover:text-white transition-colors">
                         <XIcon size={24} />
                      </button>
                   </div>

                   <div className="space-y-8 flex-grow flex flex-col justify-center">
                      <div className="space-y-4">
                         <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1">Set Directional Forecast</p>
                         <div className="grid grid-cols-1 gap-4">
                            <button
                              onClick={() => setPrediction('UP')}
                              className={cn(
                                "p-8 rounded-3xl border-2 transition-all flex items-center justify-between group",
                                prediction === 'UP' ? "bg-success/10 border-success text-success shadow-lg shadow-success/10" : "bg-white/[0.02] border-white/5 text-white/40 hover:border-success/30 hover:text-success"
                              )}
                            >
                               <div className="flex items-center gap-4">
                                  <div className={cn("p-3 rounded-xl", prediction === 'UP' ? "bg-success/20" : "bg-white/5 group-hover:bg-success/10")}>
                                     <TrendingUp size={24} />
                                  </div>
                                  <span className="font-black uppercase tracking-widest">Bullish</span>
                               </div>
                               {prediction === 'UP' && <div className="w-2 h-2 rounded-full bg-success animate-pulse" />}
                            </button>

                            <button
                              onClick={() => setPrediction('DOWN')}
                              className={cn(
                                "p-8 rounded-3xl border-2 transition-all flex items-center justify-between group",
                                prediction === 'DOWN' ? "bg-danger/10 border-danger text-danger shadow-lg shadow-danger/10" : "bg-white/[0.02] border-white/5 text-white/40 hover:border-danger/30 hover:text-danger"
                              )}
                            >
                               <div className="flex items-center gap-4">
                                  <div className={cn("p-3 rounded-xl", prediction === 'DOWN' ? "bg-danger/20" : "bg-white/5 group-hover:bg-danger/10")}>
                                     <TrendingDown size={24} />
                                  </div>
                                  <span className="font-black uppercase tracking-widest">Bearish</span>
                               </div>
                               {prediction === 'DOWN' && <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />}
                            </button>
                         </div>
                      </div>

                      <div className="bg-black/40 rounded-3xl p-6 border border-white/5">
                         <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Required Stake</span>
                            <span className="text-sm font-mono font-bold text-white">100.00 PTS</span>
                         </div>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Available Balance</span>
                            <span className="text-sm font-mono font-bold text-primary">{(userData?.points || 0).toLocaleString()} PTS</span>
                         </div>
                      </div>
                   </div>

                   <Button
                     className="w-full h-18 bg-white text-black hover:bg-primary hover:text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl disabled:opacity-20 transition-all shadow-2xl"
                     disabled={!prediction || isSubmitting}
                     isLoading={isSubmitting}
                     onClick={() => handlePredict(selectedEvent)}
                   >
                      Authorize Execution
                   </Button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

const XIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export default Predictions;
