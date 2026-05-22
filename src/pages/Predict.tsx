import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { CardPremium } from '../components/ui/PremiumModules';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Sparkles,
  History
} from 'lucide-react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { cn } from '../utils';
import { awardPoints } from '../utils/economy';
import { motion } from 'framer-motion';

interface Prediction {
  id: string;
  asset: string;
  direction: 'up' | 'down';
  amount: number;
  status: 'pending' | 'won' | 'lost';
  timestamp: any;
}

const Predict: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [prediction, setPrediction] = useState<'up' | 'down' | null>(null);
  const [amount, setAmount] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<Prediction[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'users', currentUser.uid, 'predictions'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction)));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!currentUser || !userData || !prediction) return;

    if (userData.points < amount) {
      toast.error('Insufficient PTS for this prediction');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await awardPoints(
        currentUser.uid,
        -amount,
        'prediction_stake',
        `Prediction: BTC/USD ${prediction.toUpperCase()}`
      );

      if (!result.success) {
        toast.error(result.error || 'Execution failed');
        return;
      }

      await addDoc(collection(db, 'users', currentUser.uid, 'predictions'), {
        asset: 'BTC/USD',
        direction: prediction,
        amount,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        'stats.predictionsCount': increment(1)
      });

      toast.success('Prediction Placed', {
        style: { background: '#0D0D12', color: '#fff', border: '1px solid rgba(0,255,163,0.2)' }
      });
      setPrediction(null);
    } catch (error) {
      toast.error('Prediction Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-10">

        {/* CLEAN HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold">
               <Sparkles size={14} />
               <span className="text-[10px] uppercase tracking-[0.2em]">Market Oracle</span>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">BTC/USD Prediction</h1>
            <p className="text-white/40 text-sm">Predict market movement and earn rewards.</p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl">
             {['BTC', 'ETH', 'SOL'].map(asset => (
               <button key={asset} className={cn(
                 "px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                 asset === 'BTC' ? "bg-primary text-white" : "text-white/40 hover:text-white/60"
               )}>
                  {asset}
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-6">
            {/* CLEAN CHART MODULE */}
            <CardPremium className="p-0 border-white/[0.05] overflow-hidden">
               <div className="p-6 flex justify-between items-center bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 text-xl font-bold">₿</div>
                     <div>
                        <p className="text-2xl font-bold text-white">$64,281.40</p>
                        <p className="text-[9px] font-bold text-success uppercase tracking-widest">+2.45% (24h)</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Market Status</p>
                     <div className="flex items-center gap-1.5 text-[10px] font-bold text-success uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        Live
                     </div>
                  </div>
               </div>

               <div className="h-48 relative px-6 py-4">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
                     <path d="M0 80 Q 200 70, 400 85 T 700 50 T 1000 30 L 1000 100 L 0 100 Z" fill="rgba(0, 112, 255, 0.05)" />
                     <motion.path
                        d="M0 80 Q 200 70, 400 85 T 700 50 T 1000 30"
                        fill="none" stroke="#0070ff" strokeWidth="2"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.5 }}
                     />
                  </svg>
               </div>

               {/* PREDICTION INPUTS */}
               <div className="p-8 border-t border-white/[0.05] space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                     <button
                        onClick={() => setPrediction('up')}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all",
                          prediction === 'up' ? "bg-success/10 border-success shadow-lg shadow-success/5" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                        )}
                     >
                        <TrendingUp size={24} className={prediction === 'up' ? "text-success" : "text-white/20"} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", prediction === 'up' ? "text-success" : "text-white/40")}>Price Up</span>
                     </button>
                     <button
                        onClick={() => setPrediction('down')}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all",
                          prediction === 'down' ? "bg-danger/10 border-danger shadow-lg shadow-danger/5" : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                        )}
                     >
                        <TrendingDown size={24} className={prediction === 'down' ? "text-danger" : "text-white/20"} />
                        <span className={cn("text-[10px] font-bold uppercase tracking-widest", prediction === 'down' ? "text-danger" : "text-white/40")}>Price Down</span>
                     </button>
                  </div>

                  <div className="space-y-4">
                     <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Commit PTS</span>
                        <span className="text-[10px] font-bold text-white/20">Wallet: {userData?.points.toLocaleString()}</span>
                     </div>
                     <div className="grid grid-cols-4 gap-2">
                        {[50, 100, 250, 500].map(val => (
                           <button
                              key={val}
                              onClick={() => setAmount(val)}
                              className={cn(
                                 "py-2.5 rounded-xl border text-[10px] font-bold transition-all",
                                 amount === val ? "bg-primary border-primary text-white" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                              )}
                           >
                              {val}
                           </button>
                        ))}
                     </div>
                  </div>

                  <button
                     disabled={!prediction || isSubmitting}
                     onClick={handleSubmit}
                     className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                     {isSubmitting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Target size={16} />}
                     Place Prediction
                  </button>
               </div>
            </CardPremium>
          </div>

          <div className="space-y-6">
            {/* INFO PANEL */}
            <CardPremium className="bg-primary/5 border-primary/10">
               <div className="flex items-center gap-2 text-primary mb-4">
                  <Zap size={16} />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">Oracle Rules</h3>
               </div>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                     <span className="text-white/30 uppercase">Settlement</span>
                     <span className="text-white/60">Every 24h</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                     <span className="text-white/30 uppercase">Multiplier</span>
                     <span className="text-success">x1.8</span>
                  </div>
               </div>
            </CardPremium>

            {/* PERFORMANCE */}
            <CardPremium className="space-y-6">
               <div className="flex items-center gap-2 text-white/40">
                  <Activity size={16} />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">My Performance</h3>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Win Rate</p>
                     <p className="text-xl font-bold text-white">62%</p>
                  </div>
                  <div>
                     <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Total Earned</p>
                     <p className="text-xl font-bold text-success">+1,240</p>
                  </div>
               </div>
            </CardPremium>
          </div>
        </div>

        {/* HISTORY */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 px-1">
              <History size={16} className="text-white/20" />
              <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Prediction History</h3>
           </div>

           <CardPremium className="p-0 border-white/[0.05]">
              <div className="divide-y divide-white/[0.03]">
                 {history.length === 0 ? (
                    <div className="p-12 text-center text-white/10 text-[10px] font-bold uppercase tracking-widest">No predictions yet</div>
                 ) : history.map((p) => (
                    <div key={p.id} className="p-5 flex items-center justify-between hover:bg-white/[0.01]">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center border",
                             p.direction === 'up' ? "bg-success/5 border-success/10 text-success" : "bg-danger/5 border-danger/10 text-danger"
                          )}>
                             {p.direction === 'up' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                          </div>
                          <div>
                             <p className="text-xs font-bold text-white">BTC/USD {p.direction.toUpperCase()}</p>
                             <p className="text-[9px] font-bold text-white/20 uppercase mt-0.5">
                                {p.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-xs font-bold text-white">{p.amount} PTS</p>
                          <p className={cn(
                             "text-[9px] font-bold uppercase mt-0.5",
                             p.status === 'pending' ? "text-primary" : p.status === 'won' ? "text-success" : "text-danger"
                          )}>{p.status}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </CardPremium>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predict;
