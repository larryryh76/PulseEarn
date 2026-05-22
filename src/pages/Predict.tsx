import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, Clock, AlertCircle, Sparkles, Target, Activity, BarChart3, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  const [amount, setAmount] = useState(10);
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
      toast.error('Insufficient Pulse points');
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
        toast.error(result.error || 'Failed to submit prediction');
        return;
      }

      await addDoc(collection(db, 'users', currentUser.uid, 'predictions'), {
        asset: 'BTC/USD',
        direction: prediction,
        amount,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // Update local user stats for profile
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        'stats.predictionsCount': increment(1)
      });

      toast.success('Prediction submitted!');
      setPrediction(null);
    } catch (error) {
      toast.error('Failed to submit prediction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 text-primary mb-2">
             <Sparkles size={16} />
             <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Oracle Protocol</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Market Forecasting</h1>
          <p className="text-white/40 text-sm mt-1">Submit high-confidence predictions to multiply your capital.</p>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar">
           {['BTC', 'ETH', 'SOL', 'TON'].map(asset => (
             <button key={asset} className={cn(
               "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap",
               asset === 'BTC' ? "bg-primary border-primary shadow-[0_4px_15px_rgba(0,112,255,0.2)]" : "bg-white/[0.02] border-white/[0.05] text-white/40"
             )}>
                {asset}/USD
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          {/* Main Terminal Card */}
          <Card className="p-0 border-white/[0.05] bg-[#0A0A0F] overflow-hidden">
            <div className="p-6 md:p-8 border-b border-white/[0.03] flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="w-16 h-16 rounded-[1.5rem] bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                  <span className="text-orange-500 font-bold text-3xl">₿</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white leading-none">Bitcoin</h3>
                  <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-2">Asset Identifier: BTC-USDT</p>
                </div>
              </div>

              <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                <div className="text-right">
                  <p className="text-3xl font-mono font-bold text-white tracking-tighter">$64,242.10</p>
                  <div className="flex items-center justify-end gap-1 text-green-500 text-[10px] font-bold mt-1">
                    <TrendingUp size={12} />
                    +2.45%
                  </div>
                </div>
                <div className="h-10 w-[1px] bg-white/5 hidden md:block" />
                <div className="text-right">
                   <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Volatility</p>
                   <p className="text-sm font-mono font-bold text-white/80">Low (1.2%)</p>
                </div>
              </div>
            </div>

            {/* Trading Visualization Mock */}
            <div className="p-8 bg-gradient-to-b from-white/[0.01] to-transparent">
               <div className="h-64 relative flex items-end gap-1 mb-8">
                  {[40, 55, 45, 60, 75, 50, 45, 65, 80, 70, 85, 95, 80, 90, 85, 100, 110, 95, 105, 120, 115, 130, 145].map((h, i) => (
                    <div key={i} className="flex-1 group relative">
                       <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        className={cn(
                          "w-full rounded-t-sm transition-all duration-500",
                          i > 15 ? "bg-green-500/40 group-hover:bg-green-500/60" : "bg-primary/20 group-hover:bg-primary/40"
                        )}
                       />
                    </div>
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-full h-[1px] bg-white/[0.03] border-dashed border-t" />
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                <button
                  onClick={() => setPrediction('up')}
                  className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all relative overflow-hidden group",
                    prediction === 'up'
                      ? "bg-green-500/10 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                      : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                  )}
                >
                  <ArrowUpRight size={48} className={prediction === 'up' ? "text-green-500" : "text-white/10"} />
                  <span className={cn("font-bold uppercase tracking-[0.2em] text-xs", prediction === 'up' ? "text-green-500" : "text-white/40")}>Long (Up)</span>
                  <div className="absolute -bottom-1 left-0 w-full h-1 bg-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                <button
                  onClick={() => setPrediction('down')}
                  className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-3xl border transition-all relative overflow-hidden group",
                    prediction === 'down'
                      ? "bg-red-500/10 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                      : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                  )}
                >
                  <ArrowDownRight size={48} className={prediction === 'down' ? "text-red-500" : "text-white/10"} />
                  <span className={cn("font-bold uppercase tracking-[0.2em] text-xs", prediction === 'down' ? "text-red-500" : "text-white/40")}>Short (Down)</span>
                  <div className="absolute -bottom-1 left-0 w-full h-1 bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>

            <div className="p-8 border-t border-white/[0.03] bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="w-full md:max-w-md space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">
                  <span>Stake Amount</span>
                  <span>Available: {userData?.points.toLocaleString()} PTS</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[10, 50, 100, 500].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className={cn(
                        "py-3 rounded-xl border text-xs font-mono font-bold transition-all",
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
                className="w-full md:w-64 py-5 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-[0.2em] text-xs shadow-[0_10px_40px_rgba(0,112,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                   <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : <Target size={18} />}
                {isSubmitting ? 'Transmitting...' : 'Submit Order'}
              </button>
            </div>
          </Card>

          {/* History Terminal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
               <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Market Order History</h3>
               <span className="text-[10px] font-mono text-white/20 uppercase">Last 10 Records</span>
            </div>
            <Card className="p-0 overflow-hidden border-white/[0.03] bg-[#0A0A0F]">
              <div className="divide-y divide-white/[0.02]">
                {history.length === 0 ? (
                  <div className="p-12 text-center text-white/10 text-[10px] font-bold uppercase tracking-[0.3em]">
                    No execution records found
                  </div>
                ) : history.map((p) => (
                  <div key={p.id} className="p-5 flex items-center justify-between hover:bg-white/[0.01] transition-colors">
                    <div className="flex items-center gap-5">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform",
                        p.direction === 'up' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                      )}>
                        {p.direction === 'up' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-bold text-white/90">{p.asset}</p>
                           <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border border-white/5", p.direction === 'up' ? "text-green-500" : "text-red-500")}>
                              {p.direction === 'up' ? 'Long' : 'Short'}
                           </span>
                        </div>
                        <p className="text-[9px] text-white/20 font-bold uppercase mt-1">
                          {p.timestamp?.toDate().toLocaleString() || 'Syncing...'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-bold text-white">{p.amount.toLocaleString()} PTS</p>
                      <span className={cn(
                        "text-[9px] font-bold uppercase mt-1 block",
                        p.status === 'pending' ? "text-primary animate-pulse" :
                        p.status === 'won' ? "text-green-500" : "text-red-500"
                      )}>
                        ● {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border-white/[0.05] bg-[#0A0A0F] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
               <Clock size={40} className="text-primary" />
            </div>
            <div className="flex items-center gap-3 mb-6 text-primary relative z-10">
              <Activity size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Next Settlement</h3>
            </div>
            <p className="text-4xl font-mono font-bold mb-2 text-white">14:22:05</p>
            <p className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">Remaining for current period</p>
          </Card>

          <Card className="p-6 border-white/[0.05] bg-[#0A0A0F]">
            <div className="flex items-center gap-3 mb-8 text-accent">
              <BarChart3 size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Oracle Performance</h3>
            </div>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Global Win Rate</span>
                <div className="flex items-baseline gap-1">
                   <span className="text-lg font-mono font-bold text-white">64</span>
                   <span className="text-[10px] font-bold text-white/40">%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Total Yield</span>
                <span className="text-lg font-mono font-bold text-green-500">+1,240 PTS</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Active Orders</span>
                <span className="text-lg font-mono font-bold text-primary">3</span>
              </div>
            </div>
          </Card>

          <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/10 space-y-4">
            <div className="flex gap-3">
               <AlertCircle size={18} className="text-primary shrink-0" />
               <h4 className="text-xs font-bold uppercase tracking-widest text-white/80">Market Logic</h4>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Oracle settlements occur daily at 00:00 UTC based on weighted spot averages from major exchanges.
              Incorrect forecasts result in staked capital loss.
            </p>
            <button className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">
               Read Whitepaper <ChevronRight size={10} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predict;
