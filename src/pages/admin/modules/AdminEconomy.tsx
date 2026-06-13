import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  Settings,
  Zap,
  DollarSign,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Minus,
  RefreshCw,
  User,
  ShieldCheck,
  X
} from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where, onSnapshot } from 'firebase/firestore';
import { formatUSD } from '../../../utils/finance';
import { ECONOMY_RULES } from '../../../engines/points/EconomyAuthority';
import { AnimatePresence, motion } from 'framer-motion';
import Button from "../../../components/ui/Button";
import toast from "react-hot-toast";
import { cn } from '../../../utils';

const AdminEconomy = () => {
  const [stats, setStats] = React.useState({
    ecosystemPoints: 0,
    totalUsers: 0,
    pendingWithdrawals: 0,
    totalXp: 0,
    predictionLiability: 0
  });

  const [recentTransactions, setRecentTransactions] = React.useState<any[]>([]);
  const [anomalies, setAnomalies] = React.useState<any[]>([]);

  // Adjustment Modal State
  const [isAdjusting, setIsAdjusting] = React.useState(false);
  const [adjustForm, setAdjustForm] = React.useState({
     userId: '',
     amount: 0,
     type: 'admin_adjustment' as any,
     source: 'Manual Adjustment',
     description: '',
     isXp: false
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersCountSnap = await getCountFromServer(collection(db, 'users'));
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(1000)));
        let totalPts = 0;
        let totalXp = 0;
        usersSnap.forEach(doc => {
          totalPts += (doc.data().points || 0);
          totalXp += (doc.data().xp || 0);
        });

        const withdrawalsSnap = await getCountFromServer(query(
          collection(db, 'withdrawals'),
          where('status', '==', 'PENDING')
        ));

        const activePredictionsSnap = await getDocs(query(
          collection(db, 'user_predictions'),
          where('status', '==', 'ACTIVE')
        ));
        let predLiability = 0;
        activePredictionsSnap.forEach(doc => predLiability += (doc.data().rewardAmount || 0));

        setStats({
          ecosystemPoints: totalPts,
          totalUsers: usersCountSnap.data().count,
          pendingWithdrawals: withdrawalsSnap.data().count,
          totalXp,
          predictionLiability: predLiability
        });
      } catch (err) {
        console.error("Economy stats error:", err);
      }
    };

    fetchStats();

    // Listen for recent transactions
    const txQuery = query(collection(db, 'system_claims'), orderBy('executedAt', 'desc'), limit(10));
    const unsubscribeTx = onSnapshot(txQuery, (snap) => {
      setRecentTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Listen for anomalies
    const anomalyQuery = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(5));
    const unsubscribeAnomalies = onSnapshot(anomalyQuery, (snap) => {
      setAnomalies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTx();
      unsubscribeAnomalies();
    };
  }, []);

  const handleAdjust = async () => {
     if (!adjustForm.userId || adjustForm.amount === 0) return toast.error('Required fields missing');

     setIsSubmitting(true);
     try {
        const { PointTransactionEngine } = await import('../../../engines/points/PointTransactionEngine');
        const claimId = `admin_${Date.now()}_${adjustForm.userId.slice(0, 8)}`;

        const result = await PointTransactionEngine.execute({
           userId: adjustForm.userId,
           amount: adjustForm.isXp ? 0 : adjustForm.amount,
           xpReward: adjustForm.isXp ? adjustForm.amount : 0,
           type: adjustForm.type,
           source: adjustForm.source,
           claimId,
           description: adjustForm.description,
           bypassLock: true
        });

        if (result.success) {
           toast.success('Economy Mutation Authorized');
           setIsAdjusting(false);
           setAdjustForm({ userId: '', amount: 0, type: 'admin_adjustment', source: 'Manual Adjustment', description: '', isXp: false });
        } else {
           toast.error(result.error);
        }
     } catch (err) {
        toast.error('Authority Engine Failure');
     } finally {
        setIsSubmitting(false);
     }
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Economy Control</h1>
          <p className="text-text-secondary text-sm font-medium">Real-time oversight of platform liquidity and reward distribution.</p>
        </div>
        <div className="flex items-center gap-3">
           <button
             onClick={() => setIsAdjusting(true)}
             className="px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
           >
              <RefreshCw size={14} /> Adjust Economy
           </button>
           <div className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Live Authority</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Total Point Supply</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{(stats.ecosystemPoints || 0)?.toLocaleString()}</p>
           <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest"><Zap size={12} /> Liquid Assets</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">USD Global Liability</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{formatUSD((stats.ecosystemPoints || 0) / 1000)}</p>
           <div className="flex items-center gap-2 text-success font-bold text-[10px] uppercase tracking-widest"><DollarSign size={12} /> Total Payout Risk</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Forecast Liability</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{(stats.predictionLiability || 0)?.toLocaleString()}</p>
           <div className="flex items-center gap-2 text-accent font-bold text-[10px] uppercase tracking-widest"><TrendingUp size={12} /> Active Stakes</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">XP Total Authorized</p>
           <p className="text-3xl font-mono font-bold text-white mb-2">{(stats.totalXp || 0)?.toLocaleString()}</p>
           <div className="flex items-center gap-2 text-warning font-bold text-[10px] uppercase tracking-widest"><TrendingUp size={12} /> Progression Data</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
         {/* ADJUSTMENT MODAL */}
         <AnimatePresence>
            {isAdjusting && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsAdjusting(false)}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-lg bg-[#0A0A0F] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                  >
                     <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                              <RefreshCw size={24} />
                           </div>
                           <div>
                              <h3 className="text-xl font-bold text-white tracking-tight uppercase italic leading-none mb-2">Economy Mutation</h3>
                              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Authorized Administrative adjustment</p>
                           </div>
                        </div>
                        <button onClick={() => setIsAdjusting(false)} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl transition-all text-text-tertiary">
                           <X size={18} />
                        </button>
                     </div>

                     <div className="p-10 space-y-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">User Identifier (UID)</label>
                           <div className="relative group">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-primary transition-colors" size={16} />
                              <input
                                value={adjustForm.userId}
                                onChange={e => setAdjustForm(prev => ({ ...prev, userId: e.target.value }))}
                                placeholder="Enter system user ID"
                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-sm text-white focus:border-primary/50 outline-none transition-all font-mono"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Asset Value</label>
                              <div className="relative group">
                                 <input
                                   type="number"
                                   value={adjustForm.amount}
                                   onChange={e => setAdjustForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                   placeholder="0.00"
                                   className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary/50 outline-none transition-all font-mono"
                                 />
                                 <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button onClick={() => setAdjustForm(prev => ({ ...prev, amount: Math.abs(prev.amount) }))} className={cn("p-1 rounded-md transition-all", adjustForm.amount >= 0 ? "bg-success/20 text-success" : "bg-white/5 text-white/20")}><Plus size={12} /></button>
                                    <button onClick={() => setAdjustForm(prev => ({ ...prev, amount: -Math.abs(prev.amount) }))} className={cn("p-1 rounded-md transition-all", adjustForm.amount < 0 ? "bg-danger/20 text-danger" : "bg-white/5 text-white/20")}><Minus size={12} /></button>
                                 </div>
                              </div>
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Ledger Type</label>
                              <select
                                value={adjustForm.isXp ? 'XP' : 'POINTS'}
                                onChange={e => setAdjustForm(prev => ({ ...prev, isXp: e.target.value === 'XP' }))}
                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary/50 outline-none transition-all font-bold uppercase tracking-widest appearance-none"
                              >
                                 <option value="POINTS" className="bg-[#0A0A0F]">Pulse Points</option>
                                 <option value="XP" className="bg-[#0A0A0F]">System XP</option>
                              </select>
                           </div>
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Internal Reference / Notes</label>
                           <textarea
                             rows={3}
                             value={adjustForm.description}
                             onChange={e => setAdjustForm(prev => ({ ...prev, description: e.target.value }))}
                             placeholder="Provide context for this manual adjustment..."
                             className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:border-primary/50 outline-none transition-all font-medium resize-none"
                           />
                        </div>

                        <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-4">
                           <ShieldCheck size={20} className="text-success" />
                           <p className="text-[10px] text-text-tertiary font-medium leading-relaxed italic">This action will be permanently recorded in the immutable audit trail and will trigger a user notification.</p>
                        </div>

                        <div className="flex gap-4 pt-2">
                           <Button
                             onClick={handleAdjust}
                             isLoading={isSubmitting}
                             className="flex-1 py-5 rounded-2xl shadow-xl italic font-black uppercase tracking-[0.2em] text-[11px]"
                           >
                              Authorize Mutation
                           </Button>
                           <button
                             onClick={() => setIsAdjusting(false)}
                             className="px-8 py-5 rounded-2xl bg-white/[0.02] border border-white/10 text-white/20 hover:text-white transition-colors font-bold uppercase tracking-widest text-[9px]"
                           >
                              Abort
                           </button>
                        </div>
                     </div>
                  </motion.div>
               </div>
            )}
         </AnimatePresence>

         <div className="xl:col-span-2 space-y-8">
            <section className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 sm:p-10">
               <div className="flex items-center justify-between mb-10">
                  <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3"><Activity size={18} className="text-primary" /> Real-time Ledger</h2>
                  <button className="text-[10px] font-bold text-text-tertiary hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
                     Audit All Transactions <ArrowUpRight size={14} />
                  </button>
               </div>

               <div className="space-y-2">
                  {recentTransactions.map(tx => (
                     <div key={tx.id} className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-4">
                           <div className={tx.amount > 0 ? "text-success bg-success/5 p-2 rounded-xl" : "text-white bg-white/5 p-2 rounded-xl"}>
                              {tx.amount > 0 ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                           </div>
                           <div>
                              <p className="text-xs font-bold text-white">{tx.source}</p>
                              <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mt-1">{tx.type.replace('_', ' ')}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={tx.amount > 0 ? "text-sm font-mono font-bold text-success" : "text-sm font-mono font-bold text-white"}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                           </p>
                           <p className="text-[8px] font-bold text-text-tertiary font-mono uppercase mt-1">{(tx.executedAt?.toDate?.() || new Date()).toLocaleTimeString()}</p>
                        </div>
                     </div>
                  ))}
                  {recentTransactions.length === 0 && (
                     <div className="py-20 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">Zero current ledger events</p>
                     </div>
                  )}
               </div>
            </section>

            {anomalies.length > 0 && (
               <section className="bg-danger/[0.02] border border-danger/10 rounded-[2.5rem] p-8">
                  <h2 className="text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-3 text-danger"><ShieldAlert size={18} /> System Anomalies</h2>
                  <div className="space-y-3">
                     {anomalies.map(anomaly => (
                        <div key={anomaly.id} className="p-4 rounded-xl bg-danger/5 border border-danger/10 flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <ShieldAlert size={16} className="text-danger" />
                              <div className="min-w-0">
                                 <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-md">{anomaly.error}</p>
                                 <p className="text-[9px] font-bold text-danger/60 uppercase tracking-widest mt-1">Claim: {anomaly.claimId}</p>
                              </div>
                           </div>
                           <p className="text-[9px] font-bold text-text-tertiary font-mono uppercase">{(anomaly.timestamp?.toDate?.() || new Date()).toLocaleTimeString()}</p>
                        </div>
                     ))}
                  </div>
               </section>
            )}
         </div>

         <div className="space-y-8">
            <section className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 sm:p-10">
               <h2 className="text-sm font-bold uppercase tracking-widest mb-10 flex items-center gap-3"><Settings size={18} className="text-primary" /> Authority Rules</h2>
               <div className="space-y-4">
                  {[
                    { label: 'Withdrawal Min', value: `${ECONOMY_RULES.PAYOUTS.MIN_THRESHOLD.toLocaleString()} PTS` },
                    { label: 'Weekly Payout Cap', value: `${ECONOMY_RULES.PAYOUTS.MAX_WEEKLY_VOLUME.toLocaleString()} PTS` },
                    { label: 'Single Reward Cap', value: `${ECONOMY_RULES.REWARDS.MAX_SINGLE_REWARD.toLocaleString()} PTS` },
                    { label: 'Daily Point Cap', value: `${ECONOMY_RULES.REWARDS.DAILY_LIMIT.toLocaleString()} PTS` },
                    { label: 'Daily XP Cap', value: `${ECONOMY_RULES.XP.MAX_XP_PER_DAY.toLocaleString()} XP` },
                    { label: 'Fraud Velocity', value: `${ECONOMY_RULES.FRAUD.VELOCITY_THRESHOLD.toLocaleString()} / HR` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                       <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{item.label}</p>
                       <p className="text-xs font-mono font-bold text-white">{item.value}</p>
                    </div>
                  ))}
               </div>
            </section>

            <section className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 sm:p-10 flex flex-col">
               <h2 className="text-sm font-bold uppercase tracking-widest mb-10 flex items-center gap-3"><BarChart3 size={18} className="text-success" /> Market Activity</h2>
               <div className="flex-grow flex flex-col items-center justify-center border border-dashed border-white/10 rounded-[2rem] bg-black/20 p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success mb-6">
                     <TrendingUp size={24} />
                  </div>
                  <p className="text-2xl font-bold text-white tracking-tighter mb-2">{stats.totalUsers > 0 ? (stats.ecosystemPoints / stats.totalUsers).toFixed(1) : '0'}</p>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary">Average Points Per User</p>
               </div>
            </section>
         </div>
      </div>
    </div>
  );
};

export default AdminEconomy;
