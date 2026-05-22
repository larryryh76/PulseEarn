import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, TrendingDown, Clock, Wallet, AlertCircle } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { cn } from '../utils';
import { awardPoints } from '../utils/economy';

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Price Prediction</h1>
        <p className="text-white/40 text-sm">Predict market movements and multiply your Pulse.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Game Card */}
          <Card className="p-8 border-white/[0.05] bg-gradient-to-br from-[#0A0A0F] to-[#12121A]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <span className="text-orange-500 font-bold text-lg">₿</span>
                </div>
                <div>
                  <h3 className="font-bold">BTC / USD</h3>
                  <p className="text-[10px] text-white/20 uppercase tracking-widest">Bitcoin 24h Forecast</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-bold">$64,242.10</p>
                <p className="text-[10px] text-green-500 font-bold">+2.4% Today</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setPrediction('up')}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all",
                  prediction === 'up'
                    ? "bg-green-500/10 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                    : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                )}
              >
                <TrendingUp size={32} className={prediction === 'up' ? "text-green-500" : "text-white/20"} />
                <span className={cn("font-bold uppercase tracking-widest text-xs", prediction === 'up' ? "text-green-500" : "text-white/40")}>Going Up</span>
              </button>

              <button
                onClick={() => setPrediction('down')}
                className={cn(
                  "flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all",
                  prediction === 'down'
                    ? "bg-red-500/10 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                )}
              >
                <TrendingDown size={32} className={prediction === 'down' ? "text-red-500" : "text-white/20"} />
                <span className={cn("font-bold uppercase tracking-widest text-xs", prediction === 'down' ? "text-red-500" : "text-white/40")}>Going Down</span>
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
                <span>Staking Amount</span>
                <span>Balance: {userData?.points} PTS</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[10, 50, 100, 500].map(val => (
                  <button
                    key={val}
                    onClick={() => setAmount(val)}
                    className={cn(
                      "py-2 rounded-lg border text-[11px] font-bold transition-all",
                      amount === val ? "bg-primary border-primary" : "bg-white/5 border-white/5 hover:bg-white/10"
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
              className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-[0.2em] text-sm shadow-[0_10px_30px_rgba(0,112,255,0.3)] transition-all active:scale-[0.98]"
            >
              {isSubmitting ? 'Processing...' : 'Submit Prediction'}
            </button>
          </Card>

          {/* History */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 px-2">Prediction History</h3>
            <Card className="p-0 overflow-hidden border-white/[0.03] bg-white/[0.01]">
              <div className="divide-y divide-white/[0.02]">
                {history.length === 0 ? (
                  <div className="p-10 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                    No history found
                  </div>
                ) : history.map((p) => (
                  <div key={p.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        p.direction === 'up' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {p.direction === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold">{p.asset}</p>
                        <p className="text-[9px] text-white/20 font-bold uppercase">
                          {p.timestamp?.toDate().toLocaleString() || 'Pending...'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-bold">{p.amount} PTS</p>
                      <span className={cn(
                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                        p.status === 'pending' ? "bg-white/10 text-white/40" :
                        p.status === 'won' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border-white/[0.05] bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4 text-primary">
              <Clock size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Next Settlement</h3>
            </div>
            <p className="text-3xl font-mono font-bold mb-2">14:22:05</p>
            <p className="text-[10px] text-white/20 uppercase font-bold tracking-tighter">Remaining for current period</p>
          </Card>

          <Card className="p-6 border-white/[0.05] bg-white/[0.02]">
            <div className="flex items-center gap-3 mb-4 text-accent">
              <Wallet size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Prediction Stats</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-white/20 uppercase">Win Rate</span>
                <span className="text-xs font-mono font-bold">64%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-white/20 uppercase">Total Profit</span>
                <span className="text-xs font-mono font-bold text-green-500">+1,240 PTS</span>
              </div>
            </div>
          </Card>

          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
            <AlertCircle size={16} className="text-primary shrink-0" />
            <p className="text-[10px] text-white/40 leading-relaxed">
              Predictions are settled every 24 hours based on Binance global spot prices.
              Incorrect forecasts will result in the loss of staked Pulse.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Predict;
