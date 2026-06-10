import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useCryptoData } from '../../hooks/useCryptoData';
import { collection, query, where, onSnapshot, serverTimestamp, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Campaign, PredictionRecord } from '../../types';
import { TrendingUp, TrendingDown, Clock, Trophy, History, ArrowRight, Zap, ShieldCheck, Activity, Info } from 'lucide-react';
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

  // Layer 1: Automated Events (Generated client-side for "Always On" feel, validated server-side)
  const automatedEvents = [
     { id: 'auto_btc_weekly', assetId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin Weekly Forecast', target: 'Above 24h Close', type: 'WEEKLY' },
     { id: 'auto_eth_daily', assetId: 'ethereum', symbol: 'ETH', name: 'Ethereum Daily Pulse', target: 'Above 24h Close', type: 'DAILY' },
     { id: 'auto_sol_pulse', assetId: 'solana', symbol: 'SOL', name: 'Solana Market Sentiment', target: 'Above 24h Close', type: 'DAILY' },
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

    // Fetch Leaderboard
    const leaderQ = query(
      collection(db, 'users'),
      where('stats.predictionsCount', '>', 0),
      limit(10)
    );
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
    if (userData.points < stake) {
      return toast.error('Insufficient points for this prediction');
    }

    if (userPredictions.find(p => p.taskId === event.id)) {
      return toast.error('You have already entered this prediction');
    }

    setIsSubmitting(true);
    try {
      const assetId = event.assetId || (event as any).predictionAsset || (event.name.toLowerCase().includes('bitcoin') ? 'bitcoin' : 'ethereum');
      const coinData = marketData.find(c => c.id === assetId);

      const predId = `${currentUser.uid}_${event.id}`;
      const potentialReward = stake * 2; // 2x Reward Model

      const record: PredictionRecord = {
        id: predId,
        userId: currentUser.uid,
        taskId: event.id,
        assetId: assetId,
        symbol: coinData?.symbol.toUpperCase() || event.symbol || 'CRYPTO',
        direction: prediction,
        entryPrice: coinData?.current_price || 0,
        stakeAmount: stake,
        rewardAmount: potentialReward,
        status: 'ACTIVE',
        transactionReference: `pred_stake_${predId}`,
        createdAt: serverTimestamp() as any,
        auditTrail: [`Predicted ${prediction} at ${coinData?.current_price}. Potential Reward: ${potentialReward}`]
      };

      // Differentiate Core vs Task-based prediction in metadata if needed
      if (event.id.startsWith('auto_')) {
        (record as any).isCore = true;
      }

      // Execute Point Deduction and Prediction Entry through specialized Engine method
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
      toast.success(`Forecast Executed: ${prediction} confirmed. 2x multiplier active.`);
      setSelectedEvent(null);
      setPrediction(null);
    } catch (err) {
      console.error(err);
      toast.error('Forecasting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        <header className="mb-16">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
             <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                   <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Forecasting Hub</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                   Live <span className="text-accent">Predictions</span>
                </h1>
                <p className="text-text-secondary max-w-xl font-medium">
                   Execute market forecasts using real-time data. Earn 2x platform rewards for accurate forecasts.
                </p>
             </div>
             <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                   <Info size={20} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-white uppercase">Reward Protocol</p>
                   <p className="text-[10px] text-text-tertiary font-medium">Core predictions award 2x stake + 250 XP upon resolution.</p>
                </div>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           <div className="lg:col-span-8 space-y-12">
              <section className="space-y-8">
                 <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Market Intelligence</h2>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {marketLoading ? (
                       [1, 2, 3, 4].map(i => <div key={i} className="h-[140px] bg-white/[0.02] border border-white/5 rounded-[2rem] animate-pulse" />)
                    ) : (
                      marketData.slice(0, 4).map(coin => (
                         <div key={coin.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col justify-between min-h-[140px] hover:border-primary/20 transition-all group">
                            <div className="flex items-center justify-between">
                               <img src={coin.image} alt="" className="w-8 h-8 rounded-full group-hover:scale-110 transition-transform" />
                               <span className={cn("text-[10px] font-bold px-2 py-1 rounded-lg", coin.price_change_percentage_24h >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                                  {coin.price_change_percentage_24h >= 0 ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                               </span>
                            </div>
                            <div>
                               <p className="text-lg font-mono font-bold text-white">${coin.current_price.toLocaleString()}</p>
                               <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">{coin.name} ({coin.symbol})</p>
                            </div>
                         </div>
                      ))
                    )}
                 </div>
              </section>

              <section className="space-y-8">
                <div className="flex items-center justify-between">
                   <h2 className="text-xl font-bold tracking-tight">Live Forecasts</h2>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Active Pulse</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Layer 2: Admin Campaigns */}
                   {loading ? (
                      [1, 2].map(i => <div key={i} className="h-64 bg-white/[0.02] border border-white/5 rounded-[2.5rem] animate-pulse" />)
                   ) : campaigns.map(camp => {
                     const existing = userPredictions.find(p => p.taskId === camp.id);
                     return (
                       <Card
                         key={camp.id}
                         className={cn(
                           "p-8 space-y-6 transition-all cursor-pointer",
                           existing ? "border-accent/20 bg-accent/[0.02]" : "hover:border-accent/30"
                         )}
                         onClick={() => !existing && setSelectedEvent({ ...camp, assetId: (camp as any).predictionAsset })}
                       >
                          <div className="flex justify-between items-start">
                             <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                <Zap size={24} />
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Prize Pool</p>
                                <p className="text-xl font-mono font-bold text-white">+{(camp.totalPrizePool || 0)?.toLocaleString()} <span className="text-[10px]">PTS</span></p>
                             </div>
                          </div>
                          <div>
                             <div className="flex items-center gap-2 mb-2">
                                <span className="badge-system badge-primary text-[8px]">Premium Event</span>
                             </div>
                             <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">{camp.name}</h3>
                             <p className="text-sm text-text-secondary line-clamp-2">{camp.description}</p>
                          </div>
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-text-tertiary">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                   {camp.endDate ? `Ends ${new Date(camp.endDate.toDate()).toLocaleDateString()}` : 'Live'}
                                </span>
                             </div>
                             {existing ? (
                                <div className="flex items-center gap-2 text-accent">
                                   <ShieldCheck size={14} />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">Submitted</span>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 text-primary">
                                   <span className="text-[10px] font-bold uppercase tracking-widest">Predict</span>
                                   <ArrowRight size={14} />
                                </div>
                             )}
                          </div>
                       </Card>
                     );
                   })}

                   {/* Layer 1: Automated Events (Market Pulse) */}
                   {automatedEvents.map(event => {
                     const existing = userPredictions.find(p => p.taskId === event.id);
                     const coin = marketData.find(c => c.id === event.assetId);
                     return (
                       <Card
                         key={event.id}
                         className={cn(
                           "p-8 space-y-6 transition-all cursor-pointer relative overflow-hidden",
                           existing ? "border-primary/20 bg-primary/[0.02]" : "hover:border-primary/30"
                         )}
                         onClick={() => !existing && setSelectedEvent(event)}
                       >
                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                             <Activity size={80} />
                          </div>
                          <div className="flex justify-between items-start">
                             <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                <TrendingUp size={24} />
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Multiplier</p>
                                <p className="text-xl font-mono font-bold text-white">2.00x <span className="text-[10px]">FIXED</span></p>
                             </div>
                          </div>
                          <div>
                             <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">{event.name}</h3>
                             <div className="flex items-center gap-2 mb-2">
                                <img src={coin?.image} className="w-4 h-4 rounded-full" alt="" />
                                <span className="text-xs font-mono text-text-secondary">{coin?.symbol.toUpperCase()} Forecast</span>
                             </div>
                             <p className="text-sm text-text-secondary">Will {event.symbol} settle above ${coin?.current_price.toLocaleString()}?</p>
                          </div>
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-text-tertiary">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">{event.type} CYCLE</span>
                             </div>
                             {existing ? (
                                <div className="flex items-center gap-2 text-primary">
                                   <ShieldCheck size={14} />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">Active Forecast</span>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 text-primary">
                                   <span className="text-[10px] font-bold uppercase tracking-widest">Forecast</span>
                                   <ArrowRight size={14} />
                                </div>
                             )}
                          </div>
                       </Card>
                     );
                   })}
                </div>
              </section>
           </div>

           <div className="lg:col-span-4 space-y-8">
              <section className="space-y-6">
                 <h2 className="text-sm font-bold uppercase tracking-widest text-text-tertiary flex items-center gap-3">
                    <History size={16} />
                    My History
                 </h2>
                 <div className="space-y-4">
                    {userPredictions.slice(0, 5).map(pred => (
                      <div key={pred.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between">
                         <div>
                            <p className="text-[10px] font-bold text-text-tertiary uppercase mb-1">{pred.symbol} Forecast</p>
                            <div className="flex items-center gap-2">
                               {pred.direction === 'UP' ? <TrendingUp size={12} className="text-success" /> : <TrendingDown size={12} className="text-danger" />}
                               <span className={cn("text-xs font-bold uppercase", pred.direction === 'UP' ? 'text-success' : 'text-danger')}>
                                  Market {pred.direction}
                               </span>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-mono font-bold text-white/60">{pred.status}</p>
                         </div>
                      </div>
                    ))}
                    {userPredictions.length === 0 && (
                      <div className="p-8 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-2xl">
                         <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">No prediction history</p>
                      </div>
                    )}
                 </div>
              </section>

              <Card className="bg-accent/5 border-accent/10 p-8 space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Trophy className="text-accent" size={20} />
                       <h2 className="text-sm font-bold uppercase tracking-widest">Top Forecasters</h2>
                    </div>
                    {userData?.stats?.predictionsCount && (
                       <div className="text-right">
                          <p className="text-[8px] font-bold text-text-tertiary uppercase">My Accuracy</p>
                          <p className="text-xs font-mono font-bold text-white">
                             {((userData.stats.totalWins || 0) / (userData.stats.predictionsCount || 1) * 100).toFixed(1)}%
                          </p>
                       </div>
                    )}
                 </div>
                 <div className="space-y-4">
                    {leaderboard.length > 0 ? leaderboard.slice(0, 5).map((user, i) => (
                      <div key={user.id} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-white/20">
                               {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full rounded-full" alt="" /> : (i + 1)}
                            </div>
                            <span className="text-[11px] font-bold text-white/60 truncate max-w-[100px]">{user.username || 'Anonymous'}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-[10px] font-mono font-bold text-accent block">{user.stats?.predictionsCount || 0} EVENTS</span>
                            <span className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">
                               {((user.stats?.totalWins || 0) / (user.stats?.predictionsCount || 1) * 100).toFixed(1)}% ACC
                            </span>
                         </div>
                      </div>
                    )) : (
                      [1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between opacity-40">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
                              <span className="text-[11px] font-bold text-white/60">Seeking Pulse...</span>
                           </div>
                           <span className="text-[10px] font-mono font-bold text-accent">--% ACC</span>
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
               className="absolute inset-0 bg-black/95 backdrop-blur-xl"
               onClick={() => setSelectedEvent(null)}
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
             >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-success" />

                <div className="p-10 space-y-8">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2">Market Execution</p>
                         <h2 className="text-2xl font-bold text-white uppercase tracking-tight">{selectedEvent.name}</h2>
                      </div>
                      <button onClick={() => setSelectedEvent(null)} className="p-3 hover:bg-white/5 rounded-xl transition-all text-text-tertiary">
                         <X size={24} />
                      </button>
                   </div>

                   <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2rem] space-y-6">
                      <PredictionChart
                         assetId={selectedEvent.assetId || (selectedEvent as any).predictionAsset}
                         symbol={selectedEvent.symbol || 'CRYPTO'}
                      />
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <img src={marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.image} className="w-10 h-10 rounded-full" alt="" />
                            <div>
                               <p className="text-lg font-mono font-bold text-white">${marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.current_price.toLocaleString()}</p>
                               <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Live Spot Price</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <span className={cn("text-xs font-bold px-3 py-1.5 rounded-xl", (marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.price_change_percentage_24h || 0) >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
                                {(marketData.find(c => c.id === (selectedEvent.assetId || (selectedEvent as any).predictionAsset))?.price_change_percentage_24h || 0).toFixed(2)}%
                             </span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest ml-1">Select Market Direction</p>
                      <div className="grid grid-cols-2 gap-4">
                         <button
                           onClick={() => setPrediction('UP')}
                           className={cn(
                             "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4 group",
                             prediction === 'UP' ? "bg-success/10 border-success text-success shadow-[0_0_30px_rgba(34,197,94,0.15)]" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-success/30 hover:text-success"
                           )}
                         >
                            <TrendingUp size={40} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-[0.15em]">Bullish</span>
                         </button>
                         <button
                           onClick={() => setPrediction('DOWN')}
                           className={cn(
                             "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4 group",
                             prediction === 'DOWN' ? "bg-danger/10 border-danger text-danger shadow-[0_0_30px_rgba(239,68,68,0.15)]" : "bg-white/[0.02] border-white/5 text-white/20 hover:border-danger/30 hover:text-danger"
                           )}
                         >
                            <TrendingDown size={40} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-[0.15em]">Bearish</span>
                         </button>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                         <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Forecast Stake</p>
                         <p className="text-sm font-mono font-bold text-white">100 PTS</p>
                      </div>
                      <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                         <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Potential Payout</p>
                         <p className="text-sm font-mono font-bold text-success">+{(100 * 2).toLocaleString()} PTS</p>
                      </div>
                   </div>

                   <Button
                     className="w-full h-16 bg-primary text-white font-bold uppercase tracking-[0.2em] text-xs shadow-xl shadow-primary/20"
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

const X = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export default Predictions;
