import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { CardPremium } from '../components/ui/PremiumModules';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Activity,
  BarChart3,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { cn } from '../utils';
import { awardPoints } from '../utils/economy';
import { motion, AnimatePresence } from 'framer-motion';

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
      toast.error('Insufficient capital for this order');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await awardPoints(
        currentUser.uid,
        -amount,
        'prediction_stake',
        `Oracle Execution: BTC/USD ${prediction.toUpperCase()}`
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

      toast.success('Position Opened Successfully', {
        style: { background: '#0D0D12', color: '#fff', border: '1px solid rgba(0,255,163,0.2)' }
      });
      setPrediction(null);
    } catch (error) {
      toast.error('Market Execution Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {/* TERMINAL HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold">
               <Sparkles size={16} />
               <span className="text-[10px] uppercase tracking-[0.3em]">Institutional Oracle Protocol</span>
            </div>
            <h1 className="text-5xl font-financial text-white tracking-tight">BTC/USD Terminal</h1>
            <p className="text-white/30 text-sm font-medium">Precision forecasting engine for cryptographic assets.</p>
          </div>

          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] p-1.5 rounded-2xl">
             {['BTC', 'ETH', 'SOL', 'TON'].map(asset => (
               <button key={asset} className={cn(
                 "px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                 asset === 'BTC' ? "bg-primary text-white shadow-[0_4px_15px_rgba(0,112,255,0.3)]" : "text-white/30 hover:text-white/60"
               )}>
                  {asset}
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: TRADING AREA */}
          <div className="lg:col-span-8 space-y-8">

            {/* MAIN CHART MODULE */}
            <CardPremium variant="deep" className="p-0 border-white/[0.08] overflow-hidden">
               {/* Terminal Status Bar */}
               <div className="flex items-center justify-between px-8 py-4 bg-white/[0.02] border-b border-white/[0.05]">
                  <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        <span className="text-[10px] font-bold text-success uppercase tracking-widest">Market Open</span>
                     </div>
                     <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">ID: 0x92..F2A</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-financial">
                     <span className="text-white/20 uppercase">Spread:</span>
                     <span className="text-white/60">0.02%</span>
                     <div className="w-[1px] h-3 bg-white/10" />
                     <span className="text-white/20 uppercase">Leverage:</span>
                     <span className="text-primary">x1.0</span>
                  </div>
               </div>

               {/* Asset Price Display */}
               <div className="px-8 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <span className="text-orange-500 text-2xl font-bold">₿</span>
                     </div>
                     <div>
                        <div className="flex items-baseline gap-3">
                           <span className="text-4xl font-financial text-white">$64,281.40</span>
                           <span className="text-success text-sm font-bold flex items-center gap-1">
                              <ArrowUpRight size={14} /> +2.45%
                           </span>
                        </div>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Bitcoin / US Dollar Spot</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 text-right">
                     <div>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">High</p>
                        <p className="text-sm font-financial text-white/80">$65,102</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Low</p>
                        <p className="text-sm font-financial text-white/80">$63,890</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Vol (24h)</p>
                        <p className="text-sm font-financial text-white/80">32.4B</p>
                     </div>
                  </div>
               </div>

               {/* Mock Candlestick / Area Chart */}
               <div className="h-72 px-8 py-10 relative group/chart">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                     <defs>
                        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                           <stop offset="0%" stopColor="#0070ff" stopOpacity="0.15" />
                           <stop offset="100%" stopColor="#0070ff" stopOpacity="0" />
                        </linearGradient>
                     </defs>
                     <motion.path
                        d="M0 150 Q 100 140, 200 160 T 400 120 T 600 100 T 800 60 T 1000 40"
                        fill="none" stroke="#0070ff" strokeWidth="3"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 2 }}
                     />
                     <path
                        d="M0 150 Q 100 140, 200 160 T 400 120 T 600 100 T 800 60 T 1000 40 L 1000 200 L 0 200 Z"
                        fill="url(#chartGrad)"
                     />
                     {/* Horizontal Grid Lines */}
                     {[40, 80, 120, 160].map(y => (
                        <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="white" strokeOpacity="0.03" strokeWidth="1" />
                     ))}
                  </svg>
                  {/* Floating Price Tracker */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute right-8 top-10 flex items-center gap-2"
                  >
                     <div className="px-3 py-1 rounded bg-primary text-white text-[10px] font-financial shadow-[0_0_15px_rgba(0,112,255,0.4)]">
                        $64,281.40
                     </div>
                     <div className="w-[100px] h-[1px] bg-primary/40 border-dashed border-t" />
                  </motion.div>
               </div>

               {/* EXECUTION PANEL */}
               <div className="bg-white/[0.02] border-t border-white/[0.05] p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <button
                        onClick={() => setPrediction('up')}
                        className={cn(
                          "relative group flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border transition-all duration-500",
                          prediction === 'up'
                            ? "bg-success/10 border-success shadow-[0_0_40px_rgba(0,255,163,0.15)]"
                            : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] grayscale group-hover:grayscale-0"
                        )}
                     >
                        <div className={cn(
                           "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500",
                           prediction === 'up' ? "bg-success text-black scale-110" : "bg-white/5 text-success group-hover:bg-success group-hover:text-black"
                        )}>
                           <TrendingUp size={32} strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                           <p className={cn("text-xs font-bold uppercase tracking-[0.3em]", prediction === 'up' ? "text-success" : "text-white/40")}>Predict Growth</p>
                           <p className="text-[10px] font-bold text-white/20 mt-1 uppercase">Institutional Long</p>
                        </div>
                        {prediction === 'up' && (
                           <motion.div layoutId="pred-glow" className="absolute -inset-1 rounded-[1.8rem] border-2 border-success/40 blur-sm" />
                        )}
                     </button>

                     <button
                        onClick={() => setPrediction('down')}
                        className={cn(
                          "relative group flex flex-col items-center justify-center gap-4 p-8 rounded-3xl border transition-all duration-500",
                          prediction === 'down'
                            ? "bg-danger/10 border-danger shadow-[0_0_40px_rgba(255,46,91,0.15)]"
                            : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] grayscale group-hover:grayscale-0"
                        )}
                     >
                        <div className={cn(
                           "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500",
                           prediction === 'down' ? "bg-danger text-white scale-110" : "bg-white/5 text-danger group-hover:bg-danger group-hover:text-white"
                        )}>
                           <TrendingDown size={32} strokeWidth={2.5} />
                        </div>
                        <div className="text-center">
                           <p className={cn("text-xs font-bold uppercase tracking-[0.3em]", prediction === 'down' ? "text-danger" : "text-white/40")}>Predict Decline</p>
                           <p className="text-[10px] font-bold text-white/20 mt-1 uppercase">Institutional Short</p>
                        </div>
                        {prediction === 'down' && (
                           <motion.div layoutId="pred-glow" className="absolute -inset-1 rounded-[1.8rem] border-2 border-danger/40 blur-sm" />
                        )}
                     </button>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-4">
                     <div className="w-full md:w-80 space-y-3">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">
                           <span>Commit Capital</span>
                           <span>Wallet: {userData?.points.toLocaleString()} PTS</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                           {[50, 100, 250, 500].map(val => (
                              <button
                                 key={val}
                                 onClick={() => setAmount(val)}
                                 className={cn(
                                    "py-3 rounded-xl border text-[11px] font-financial transition-all",
                                    amount === val ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
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
                        className="w-full md:w-72 h-16 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-bold uppercase tracking-[0.3em] text-white shadow-[0_10px_40px_rgba(0,112,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 overflow-hidden group"
                     >
                        <AnimatePresence mode="wait">
                           {isSubmitting ? (
                              <motion.div
                                 key="loading"
                                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                 className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"
                              />
                           ) : (
                              <motion.div
                                 key="ready"
                                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                 className="flex items-center gap-3"
                              >
                                 <Target size={18} className="group-hover:scale-110 transition-transform" />
                                 Execute Order
                              </motion.div>
                           )}
                        </AnimatePresence>
                     </button>
                  </div>
               </div>
            </CardPremium>

            {/* MARKET EXECUTION LEDGER */}
            <div className="space-y-4">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                     <div className="w-1 h-4 bg-white/20 rounded-full" />
                     <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">Execution Ledger</h3>
                  </div>
                  <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Real-time History</span>
               </div>

               <CardPremium className="p-0 border-white/[0.05] bg-[#050507]/60">
                  <div className="divide-y divide-white/[0.03]">
                     {history.length === 0 ? (
                        <div className="p-16 text-center">
                           <Layers size={40} className="mx-auto text-white/5 mb-4" />
                           <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.4em]">No active positions found</p>
                        </div>
                     ) : history.map((p) => (
                        <div key={p.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.01] transition-colors">
                           <div className="flex items-center gap-6">
                              <div className={cn(
                                 "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                 p.direction === 'up' ? "bg-success/5 border-success/20 text-success" : "bg-danger/5 border-danger/20 text-danger"
                              )}>
                                 {p.direction === 'up' ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                              </div>
                              <div>
                                 <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-white">{p.asset}</span>
                                    <div className={cn(
                                       "px-2 py-0.5 rounded text-[8px] font-bold uppercase border",
                                       p.direction === 'up' ? "bg-success/10 border-success/20 text-success" : "bg-danger/10 border-danger/20 text-danger"
                                    )}>
                                       {p.direction === 'up' ? 'Long' : 'Short'}
                                    </div>
                                 </div>
                                 <p className="text-[9px] font-financial text-white/20 uppercase tracking-widest mt-1">
                                    Executed: {p.timestamp?.toDate().toLocaleTimeString()}
                                 </p>
                              </div>
                           </div>

                           <div className="flex items-center gap-12 text-right">
                              <div>
                                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Capital</p>
                                 <p className="text-sm font-financial text-white">{p.amount.toLocaleString()} PTS</p>
                              </div>
                              <div className="min-w-[100px]">
                                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Status</p>
                                 <div className="flex items-center justify-end gap-2">
                                    <div className={cn(
                                       "w-1.5 h-1.5 rounded-full",
                                       p.status === 'pending' ? "bg-primary animate-pulse shadow-[0_0_8px_#0070ff]" :
                                       p.status === 'won' ? "bg-success" : "bg-danger"
                                    )} />
                                    <span className={cn(
                                       "text-[10px] font-bold uppercase",
                                       p.status === 'pending' ? "text-primary" :
                                       p.status === 'won' ? "text-success" : "text-danger"
                                    )}>{p.status}</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </CardPremium>
            </div>
          </div>

          {/* RIGHT: ANALYTICS SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">

            {/* NEXT SETTLEMENT */}
            <CardPremium variant="standard" className="bg-[#0A0A0F] border-white/[0.08] relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all">
                  <Clock size={60} className="text-primary" />
               </div>
               <div className="flex items-center gap-3 mb-8 text-primary relative z-10">
                  <Zap size={16} />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Next Settlement</h3>
               </div>
               <div className="space-y-1">
                  <p className="text-5xl font-financial text-white tracking-tighter">14:22:05</p>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Protocol Sync in progress</p>
               </div>
               <div className="mt-8 pt-6 border-t border-white/[0.03]">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                     <span className="text-white/20">Oracle Confidence</span>
                     <span className="text-success">98.2%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                     <motion.div animate={{ width: "98.2%" }} className="h-full bg-success shadow-[0_0_8px_rgba(0,255,163,0.5)]" />
                  </div>
               </div>
            </CardPremium>

            {/* PERFORMANCE STATS */}
            <CardPremium variant="standard" className="bg-[#0A0A0F] border-white/[0.08]">
               <div className="flex items-center gap-3 mb-10 text-accent">
                  <BarChart3 size={18} />
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Oracle Intel</h3>
               </div>
               <div className="space-y-8">
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Global Success Rate</p>
                        <p className="text-xl font-financial text-white">64.5%</p>
                     </div>
                     <div className="w-12 h-1 bg-white/5 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-accent w-[64.5%] shadow-[0_0_8px_rgba(0,242,255,0.5)]" />
                     </div>
                  </div>
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Active Positions</p>
                        <p className="text-xl font-financial text-white">3</p>
                     </div>
                     <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Activity size={18} />
                     </div>
                  </div>
                  <div className="flex justify-between items-center">
                     <div>
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Volatility Index</p>
                        <p className="text-xl font-financial text-danger">High (72.4)</p>
                     </div>
                     <div className="p-2 rounded-lg bg-danger/10 text-danger">
                        <TrendingDown size={18} />
                     </div>
                  </div>
               </div>
            </CardPremium>

            {/* MARKET NOTICE */}
            <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 space-y-4">
               <div className="flex items-center gap-3 text-primary">
                  <Shield size={18} />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Execution Protocol</h4>
               </div>
               <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                  Positions are settled daily at 00:00 UTC using institutional spot price averages.
                  Once an order is submitted to the Oracle, it is immutable and cannot be withdrawn.
               </p>
               <button className="inline-flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline pt-2">
                  Protocol Documentation <ChevronRight size={10} />
               </button>
            </div>

            {/* SENTIMENT HEATMAP */}
            <CardPremium variant="thin" className="p-6">
               <h4 className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-6">Market Sentiment Heatmap</h4>
               <div className="flex gap-1 h-12">
                  {[...Array(20)].map((_, i) => (
                     <div
                        key={i}
                        className={cn(
                           "flex-1 rounded-sm",
                           i < 14 ? "bg-success/20" : "bg-danger/20"
                        )}
                     />
                  ))}
               </div>
               <div className="flex justify-between mt-3 text-[8px] font-bold uppercase tracking-widest">
                  <span className="text-success">Bullish</span>
                  <span className="text-danger">Bearish</span>
               </div>
            </CardPremium>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predict;
