import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import { useCryptoData } from '../../hooks/useCryptoData';
import { collection, query, where, onSnapshot, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { Campaign, PredictionRecord } from '../../types';
import { TrendingUp, TrendingDown, Clock, Trophy, History, ArrowRight, Zap, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';

const Predictions: React.FC = () => {
  const { marketData } = useCryptoData();
  const { currentUser, userData } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userPredictions, setUserPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [prediction, setPrediction] = useState<'UP' | 'DOWN' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    return unsubscribe;
  }, [currentUser]);

  const handlePredict = async (campaign: Campaign) => {
    if (!currentUser || !prediction || !userData) return;

    // Check balance
    const stake = 100; // Fixed stake for now
    if (userData.points < stake) {
      return toast.error('Insufficient points for this prediction');
    }

    // Check if already predicted
    if (userPredictions.find(p => p.taskId === campaign.id)) {
      return toast.error('You have already entered this prediction');
    }

    setIsSubmitting(true);
    try {
      const coinId = campaign.name.toLowerCase().includes('bitcoin') ? 'bitcoin' : 'ethereum';
      const coinData = marketData.find(c => c.id === coinId);

      const predId = `${currentUser.uid}_${campaign.id}`;
      const record: PredictionRecord = {
        id: predId,
        userId: currentUser.uid,
        taskId: campaign.id,
        assetId: coinId,
        symbol: coinData?.symbol.toUpperCase() || 'CRYPTO',
        direction: prediction,
        entryPrice: coinData?.current_price || 0,
        stakeAmount: stake,
        status: 'ACTIVE',
        transactionReference: `pred_stake_${predId}`,
        createdAt: serverTimestamp() as any,
        auditTrail: [`Predicted ${prediction} at ${coinData?.current_price}`]
      };

      await setDoc(doc(db, 'user_predictions', predId), record);
      toast.success(`Forecast Executed: ${prediction} confirmed.`);
      setSelectedCampaign(null);
      setPrediction(null);
    } catch (err) {
      toast.error('Forecasting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        <header className="mb-16">
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Forecasting Terminal</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Live <span className="text-accent">Predictions</span>
             </h1>
             <p className="text-text-secondary max-w-xl font-medium">
                Execute market forecasts using real-time data. Earn premium rewards for accurate predictions.
             </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
           <div className="lg:col-span-8 space-y-8">
              {loading ? (
                <div className="h-64 bg-surface rounded-[2.5rem] animate-pulse" />
              ) : campaigns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {campaigns.map(camp => {
                     const existing = userPredictions.find(p => p.taskId === camp.id);
                     return (
                       <Card
                         key={camp.id}
                         className={cn(
                           "p-8 space-y-6 transition-all cursor-pointer",
                           existing ? "border-accent/20 bg-accent/[0.02]" : "hover:border-accent/30"
                         )}
                         onClick={() => !existing && setSelectedCampaign(camp)}
                       >
                          <div className="flex justify-between items-start">
                             <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                                <TrendingUp size={24} />
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest">Prize Pool</p>
                                <p className="text-xl font-mono font-bold text-white">+{camp.totalPrizePool.toLocaleString()} <span className="text-[10px]">PTS</span></p>
                             </div>
                          </div>
                          <div>
                             <h3 className="text-lg font-bold text-white uppercase tracking-tight mb-2">{camp.name}</h3>
                             <p className="text-sm text-text-secondary line-clamp-2">{camp.description}</p>
                          </div>
                          <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                             <div className="flex items-center gap-2 text-text-tertiary">
                                <Clock size={14} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Closing Soon</span>
                             </div>
                             {existing ? (
                                <div className="flex items-center gap-2 text-accent">
                                   <ShieldCheck size={14} />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">Active Forecast</span>
                                </div>
                             ) : (
                                <ArrowRight size={18} className="text-text-tertiary" />
                             )}
                          </div>
                       </Card>
                     );
                   })}
                </div>
              ) : (
                <div className="py-24 text-center border border-dashed border-border rounded-[3rem] bg-surface/20">
                   <Zap size={48} className="mx-auto text-text-tertiary mb-6" />
                   <h3 className="text-lg font-bold text-white uppercase">No Active Predictions</h3>
                   <p className="text-sm text-text-secondary max-w-xs mx-auto mt-2">New prediction events are currently being indexed by the system.</p>
                </div>
              )}
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
                 <div className="flex items-center gap-3">
                    <Trophy className="text-accent" size={20} />
                    <h2 className="text-sm font-bold uppercase tracking-widest">Top Forecasters</h2>
                 </div>
                 <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
                            <span className="text-[11px] font-bold text-white/60">Anonymous User</span>
                         </div>
                         <span className="text-[10px] font-mono font-bold text-accent">98.2% ACC</span>
                      </div>
                    ))}
                 </div>
              </Card>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/90 backdrop-blur-xl"
               onClick={() => setSelectedCampaign(null)}
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[2.5rem] overflow-hidden"
             >
                <div className="p-10 space-y-8">
                   <div className="flex justify-between items-start">
                      <div>
                         <p className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mb-2">Execute Forecast</p>
                         <h2 className="text-2xl font-bold text-white uppercase">{selectedCampaign.name}</h2>
                      </div>
                      <button onClick={() => setSelectedCampaign(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                         <X size={24} />
                      </button>
                   </div>

                   <div className="space-y-4">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Select Direction</p>
                      <div className="grid grid-cols-2 gap-4">
                         <button
                           onClick={() => setPrediction('UP')}
                           className={cn(
                             "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4",
                             prediction === 'UP' ? "bg-success/10 border-success text-success" : "bg-white/5 border-white/5 text-white/20 hover:border-success/30"
                           )}
                         >
                            <TrendingUp size={32} />
                            <span className="text-xs font-bold uppercase tracking-widest">Bullish</span>
                         </button>
                         <button
                           onClick={() => setPrediction('DOWN')}
                           className={cn(
                             "p-8 rounded-[2rem] border transition-all flex flex-col items-center gap-4",
                             prediction === 'DOWN' ? "bg-danger/10 border-danger text-danger" : "bg-white/5 border-white/5 text-white/20 hover:border-danger/30"
                           )}
                         >
                            <TrendingDown size={32} />
                            <span className="text-xs font-bold uppercase tracking-widest">Bearish</span>
                         </button>
                      </div>
                   </div>

                   <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                      <div className="flex justify-between items-center text-xs">
                         <span className="text-text-tertiary font-bold uppercase tracking-widest">Forecast Stake</span>
                         <span className="text-white font-mono">100 PTS</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                         <span className="text-text-tertiary font-bold uppercase tracking-widest">Potential Yield</span>
                         <span className="text-success font-mono">+{selectedCampaign.totalPrizePool.toLocaleString()} PTS</span>
                      </div>
                   </div>

                   <Button
                     className="w-full h-16 bg-accent text-white"
                     disabled={!prediction || isSubmitting}
                     isLoading={isSubmitting}
                     onClick={() => handlePredict(selectedCampaign)}
                   >
                      Confirm Forecast
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
