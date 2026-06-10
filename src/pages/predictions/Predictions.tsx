import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useCryptoData } from '../../hooks/useCryptoData';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Campaign, PredictionRecord } from '../../types';
import { TrendingUp, TrendingDown, Clock, Trophy, History, ArrowRight, Zap, ShieldCheck, Activity, BarChart2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Layer 1: Automated Pulse Events
  const automatedEvents = [
     { id: 'auto_btc_weekly', assetId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin Alpha Forecast', target: 'Above 24h Close', type: 'WEEKLY' },
     { id: 'auto_eth_daily', assetId: 'ethereum', symbol: 'ETH', name: 'Ethereum Momentum', target: 'Above 24h Close', type: 'DAILY' },
     { id: 'auto_sol_pulse', assetId: 'solana', symbol: 'SOL', name: 'Solana High-Velocity Pulse', target: 'Above 24h Close', type: 'DAILY' },
     { id: 'auto_ton_daily', assetId: 'the-open-network', symbol: 'TON', name: 'TON Ecosystem Outlook', target: 'Above 24h Close', type: 'DAILY' },
  ];

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), where('category', '==', 'PREDICTION'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Campaign)));
      setLoading(false);
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
        <header className="mb-20">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
             <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-accent" />
                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.3em]">Institutional Forecasting</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tighter">
                   Market <span className="text-accent">Predictions</span>
                </h1>
                <p className="text-text-secondary max-w-xl text-lg font-medium leading-relaxed">
                   Leverage real-time market data to execute predictive forecasts. Successful executions award 2.0x capital returns and high-yield XP.
                </p>
             </div>
             <div className="flex items-center gap-6 p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] backdrop-blur-md">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center text-accent shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)]">
                   <Zap size={24} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">Standard Protocol</p>
                   <p className="text-xs text-text-tertiary font-bold">Stake: 100 PTS • Yield: 200 PTS • +250 XP</p>
                </div>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
           <div className="lg:col-span-8 space-y-20">
              {/* Featured / Live Forecasts */}
              <section className="space-y-10">
                <div className="flex items-center justify-between">
                   <h2 className="text-2xl font-bold tracking-tight flex items-center gap-4">
                      <Activity className="text-accent" size={24} />
                      Live Forecast Opportunities
                   </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Campaign Layer */}
                   {!loading && campaigns.map(camp => {
                     const existing = userPredictions.find(p => p.taskId === camp.id);
                     return (
                       <Card
                         key={camp.id}
                         className={cn(
                           "group p-8 space-y-8 transition-all cursor-pointer border-white/5 relative overflow-hidden bg-surface-bright/30",
                           existing ? "opacity-60 grayscale-[0.5]" : "hover:border-accent/40 hover:bg-surface-bright/50"
                         )}
                         onClick={() => !existing && setSelectedEvent({ ...camp, assetId: (camp as any).predictionAsset })}
                       >
                          <div className="flex justify-between items-start relative z-10">
                             <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent group-hover:scale-110 transition-transform">
                                <BarChart2 size={28} />
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Max Yield</p>
                                <p className="text-2xl font-mono font-bold text-white tracking-tighter">+{(camp.totalPrizePool || 0)?.toLocaleString()} <span className="text-xs">PTS</span></p>
                             </div>
                          </div>
                          <div className="relative z-10">
                             <div className="flex items-center gap-2 mb-3">
                                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-bold uppercase rounded border border-primary/20">Premier Event</span>
                             </div>
                             <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-3 group-hover:text-accent transition-colors">{camp.name}</h3>
                             <p className="text-sm text-text-secondary line-clamp-2 font-medium leading-relaxed">{camp.description}</p>
                          </div>
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                             <div className="flex items-center gap-2 text-text-tertiary">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                   {camp.endDate ? `CLOSES ${new Date(camp.endDate.toDate()).toLocaleDateString()}` : 'ONGOING'}
                                </span>
                             </div>
                             {existing ? (
                                <div className="flex items-center gap-2 text-accent">
                                   <ShieldCheck size={14} />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">SUBMITTED</span>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 text-primary font-bold group-hover:translate-x-1 transition-transform">
                                   <span className="text-[10px] uppercase tracking-widest">EXECUTE</span>
                                   <ArrowRight size={14} />
                                </div>
                             )}
                          </div>
                       </Card>
                     );
                   })}

                   {/* Automated Pulse Layer */}
                   {automatedEvents.map(event => {
                     const existing = userPredictions.find(p => p.taskId === event.id);
                     const coin = marketData.find(c => c.id === event.assetId);
                     return (
                       <Card
                         key={event.id}
                         className={cn(
                           "group p-8 space-y-8 transition-all cursor-pointer border-white/5 relative overflow-hidden bg-surface-bright/30",
                           existing ? "opacity-60 grayscale-[0.5]" : "hover:border-primary/40 hover:bg-surface-bright/50"
                         )}
                         onClick={() => !existing && setSelectedEvent(event)}
                       >
                          <div className="flex justify-between items-start relative z-10">
                             <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <TrendingUp size={28} />
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Fixed Multiplier</p>
                                <p className="text-2xl font-mono font-bold text-white tracking-tighter">2.00x <span className="text-xs">YIELD</span></p>
                             </div>
                          </div>
                          <div className="relative z-10">
                             <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-3 group-hover:text-primary transition-colors">{event.name}</h3>
                             <div className="flex items-center gap-3 mb-4">
                                <img src={coin?.image} className="w-5 h-5 rounded-full" alt="" />
                                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">{coin?.symbol.toUpperCase()} SPOT MARKET</span>
                             </div>
                             <p className="text-sm text-text-secondary font-medium">Forecast direction from ${coin?.current_price.toLocaleString()}</p>
                          </div>
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                             <div className="flex items-center gap-2 text-text-tertiary">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{event.type} CYCLE</span>
                             </div>
                             {existing ? (
                                <div className="flex items-center gap-2 text-primary">
                                   <ShieldCheck size={14} />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">ACTIVE POSITION</span>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 text-primary font-bold group-hover:translate-x-1 transition-transform">
                                   <span className="text-[10px] uppercase tracking-widest">FORECAST</span>
                                   <ArrowRight size={14} />
                                </div>
                             )}
                          </div>
                       </Card>
                     );
                   })}
                </div>
              </section>

              {/* Market Overview */}
              <section className="space-y-8">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight uppercase tracking-widest text-text-tertiary">Live Market Feeds</h2>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {marketLoading ? (
                       [1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-white/[0.02] border border-white/5 rounded-3xl animate-pulse" />)
                    ) : marketData.slice(0, 4).map(coin => (
                         <div
                           key={coin.id}
                           className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] hover:border-primary/40 transition-all group cursor-pointer"
                           onClick={() => {
                             const autoEvent = automatedEvents.find(e => e.assetId === coin.id);
                             if (autoEvent) setSelectedEvent(autoEvent);
                           }}
                         >
                            <div className="flex items-center justify-between mb-4">
                               <img src={coin.image} alt="" className="w-8 h-8 rounded-full group-hover:scale-110 transition-transform" />
                               <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg font-mono", coin.price_change_percentage_24h >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                                  {coin.price_change_percentage_24h >= 0 ? '▲' : '▼'} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                               </span>
                            </div>
                            <div>
                               <p className="text-lg font-mono font-bold text-white tracking-tighter">${coin.current_price.toLocaleString()}</p>
                               <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-[0.2em]">{coin.symbol.toUpperCase()} / USD</p>
                            </div>
                         </div>
                      ))}
                 </div>
              </section>
           </div>

           {/* Sidebar: Performance & History */}
           <div className="lg:col-span-4 space-y-12">
              <section className="space-y-6">
                 <h2 className="text-xs font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-3">
                    <History size={16} />
                    My Positions
                 </h2>
                 <div className="space-y-4">
                    {userPredictions.slice(0, 5).map(pred => (
                      <div key={pred.id} className="p-5 bg-white/[0.03] border border-white/10 rounded-[1.5rem] flex items-center justify-between group hover:bg-white/[0.05] transition-colors">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{pred.symbol} Forecast</p>
                            <div className="flex items-center gap-2">
                               {pred.direction === 'UP' ? <TrendingUp size={14} className="text-success" /> : <TrendingDown size={14} className="text-danger" />}
                               <span className={cn("text-xs font-bold uppercase tracking-widest", pred.direction === 'UP' ? 'text-success' : 'text-danger')}>
                                  {pred.direction}
                               </span>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className="text-[9px] font-mono font-bold text-white/40 block mb-1">{pred.status}</span>
                            <p className="text-xs font-mono font-bold text-white/60">${pred.entryPrice.toLocaleString()}</p>
                         </div>
                      </div>
                    ))}
                    {userPredictions.length === 0 && (
                      <div className="py-12 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[2rem]">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">No active positions</p>
                      </div>
                    )}
                 </div>
              </section>

              <Card className="bg-accent/[0.03] border-accent/20 p-8 space-y-8 rounded-[2.5rem]">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Trophy className="text-accent" size={20} />
                       <h2 className="text-sm font-bold uppercase tracking-widest">Global Ranking</h2>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
               onClick={() => setSelectedEvent(null)}
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="relative w-full max-w-xl bg-surface border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
             >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-success" />

                <div className="p-10 sm:p-12 space-y-10">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] mb-3">Capital Execution</p>
                         <h2 className="text-3xl font-bold text-white uppercase tracking-tight leading-tight">{selectedEvent.name}</h2>
                      </div>
                      <button onClick={() => setSelectedEvent(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-text-tertiary">
                         <XIcon size={24} />
                      </button>
                   </div>

                   <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2.5rem] space-y-8">
                      <PredictionChart
                         assetId={selectedEvent.assetId || (selectedEvent as any).predictionAsset}
                         symbol={selectedEvent.symbol || 'CRYPTO'}
                      />
                      <div className="flex items-center justify-between border-t border-white/5 pt-6">
                         <div className="flex items-center gap-4">
                            <img src={marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.image} className="w-12 h-12 rounded-full" alt="" />
                            <div>
                               <p className="text-xl font-mono font-bold text-white tracking-tighter">${marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.current_price.toLocaleString()}</p>
                               <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Mark Price</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <span className={cn("text-xs font-mono font-bold px-3 py-1.5 rounded-xl", (marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.price_change_percentage_24h || 0) >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                                {(marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.price_change_percentage_24h || 0).toFixed(2)}%
                             </span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-5">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em] ml-1">Market Sentiment Authorization</p>
                      <div className="grid grid-cols-2 gap-6">
                         <button
                           onClick={() => setPrediction('UP')}
                           className={cn(
                             "p-10 rounded-[2.5rem] border transition-all flex flex-col items-center gap-5 group",
                             prediction === 'UP' ? "bg-success/10 border-success text-success shadow-[0_0_40px_rgba(34,197,94,0.1)]" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-success/30 hover:text-success"
                           )}
                         >
                            <TrendingUp size={48} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Bullish</span>
                         </button>
                         <button
                           onClick={() => setPrediction('DOWN')}
                           className={cn(
                             "p-10 rounded-[2.5rem] border transition-all flex flex-col items-center gap-5 group",
                             prediction === 'DOWN' ? "bg-danger/10 border-danger text-danger shadow-[0_0_40px_rgba(239,68,68,0.1)]" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-danger/30 hover:text-danger"
                           )}
                         >
                            <TrendingDown size={48} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Bearish</span>
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1.5">Authorized Stake</p>
                         <p className="text-base font-mono font-bold text-white tracking-tighter">100.00 <span className="text-[10px]">PTS</span></p>
                      </div>
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                         <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-1.5">Target Yield</p>
                         <p className="text-base font-mono font-bold text-success tracking-tighter">+200.00 <span className="text-[10px]">PTS</span></p>
                      </div>
                   </div>

                   <Button
                     className="w-full h-18 bg-primary text-white font-bold uppercase tracking-[0.3em] text-[11px] shadow-2xl shadow-primary/20 rounded-[1.5rem]"
                     disabled={!prediction || isSubmitting}
                     isLoading={isSubmitting}
                     onClick={() => handlePredict(selectedEvent)}
                   >
                      Confirm Market Authorization
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
