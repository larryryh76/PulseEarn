import * as React from 'react';
import {
  BarChart3,
  RefreshCw,
  Zap,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Plus,
  Minus,
  X,
  User
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  limit,
  getDocs,
  getCountFromServer,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { formatUSD } from '../../../utils/finance';
import { ECONOMY_RULES } from '../../../engines/points/EconomyAuthority';
import { motion, AnimatePresence } from 'framer-motion';
import Button from "../../../components/ui/Button";
import toast from "react-hot-toast";
import { cn } from '../../../utils';

const OpsEconomy: React.FC = () => {
  const [stats, setStats] = React.useState({
    ecosystemPoints: 0,
    totalUsers: 0,
    totalXp: 0,
    predictionLiability: 0
  });

  const [recentTransactions, setRecentTransactions] = React.useState<any[]>([]);

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
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
        let totalPts = 0;
        let totalXp = 0;
        usersSnap.forEach(doc => {
          totalPts += (doc.data().points || 0);
          totalXp += (doc.data().xp || 0);
        });

        const activePredictionsSnap = await getDocs(query(
          collection(db, 'user_predictions'),
          where('status', '==', 'ACTIVE')
        ));
        let predLiability = 0;
        activePredictionsSnap.forEach(doc => predLiability += (doc.data().rewardAmount || 0));

        setStats({
          ecosystemPoints: totalPts,
          totalUsers: usersCountSnap.data().count,
          totalXp,
          predictionLiability: predLiability
        });
      } catch (err) {
        console.error("[OpsEconomy] Stats fetch failed:", err);
      }
    };

    fetchStats();

    const txQuery = query(collection(db, 'system_claims'), orderBy('executedAt', 'desc'), limit(10));
    const unsubscribeTx = onSnapshot(txQuery, (snap) => {
      setRecentTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeTx();
    };
  }, []);

  const handleAdjust = async () => {
     if (!adjustForm.userId || adjustForm.amount === 0) return toast.error('Authority requires complete vector data');

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
           toast.success('Economy Mutation Synchronized');
           setIsAdjusting(false);
           setAdjustForm({ userId: '', amount: 0, type: 'admin_adjustment', source: 'Manual Adjustment', description: '', isXp: false });
        } else {
           toast.error(result.error);
        }
     } catch (err) {
        toast.error('Transaction Authority Failure');
     } finally {
        setIsSubmitting(false);
     }
  };

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Economy Hub</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Platform liquidity management and administrative asset mutations.</p>
          </div>

          <div className="flex items-center gap-3">
             <button
               onClick={() => setIsAdjusting(true)}
               className="px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
             >
                <RefreshCw size={14} /> Adjust Ledger
             </button>
          </div>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface border border-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-4">Point Supply (Sample)</p>
             <p className="text-3xl font-mono font-bold text-text-primary mb-2">{(stats.ecosystemPoints || 0)?.toLocaleString()}</p>
             <div className="flex items-center gap-2 text-primary font-bold text-[9px] uppercase tracking-[0.2em]"><Zap size={12} /> Liquid Economy</div>
          </div>
          <div className="bg-surface border border-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-4">Total USD Liability</p>
             <p className="text-3xl font-mono font-bold text-text-primary mb-2">{formatUSD((stats.ecosystemPoints || 0) / 1000)}</p>
             <div className="flex items-center gap-2 text-success font-bold text-[9px] uppercase tracking-[0.2em]"><DollarSign size={12} /> Payout Exposure</div>
          </div>
          <div className="bg-surface border border-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-4">Market Liability</p>
             <p className="text-3xl font-mono font-bold text-text-primary mb-2">{(stats.predictionLiability || 0)?.toLocaleString()}</p>
             <div className="flex items-center gap-2 text-indigo-400 font-bold text-[9px] uppercase tracking-[0.2em]"><TrendingUp size={12} /> Forecast Stakes</div>
          </div>
          <div className="bg-surface border border-border p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-4">XP Provisioned</p>
             <p className="text-3xl font-mono font-bold text-text-primary mb-2">{(stats.totalXp || 0)?.toLocaleString()}</p>
             <div className="flex items-center gap-2 text-warning font-bold text-[9px] uppercase tracking-[0.2em]"><Zap size={12} /> Progression</div>
          </div>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
             <section className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3 mb-10">
                   <Activity size={18} className="text-primary" /> Real-time Feed
                </h2>
                <div className="space-y-1">
                   {recentTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-5 rounded-2xl bg-surface-bright/50 border-b border-border last:border-0 hover:bg-surface-accent transition-all">
                         <div className="flex items-center gap-5">
                            <div className={tx.amount > 0 ? "text-success bg-success/5 p-3 rounded-xl" : "text-text-primary bg-surface-bright p-3 rounded-xl"}>
                               {tx.amount > 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                            </div>
                            <div>
                               <p className="text-xs font-bold text-text-primary uppercase italic">{tx.source}</p>
                               <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1.5">{tx.type.replace(/_/g, ' ')}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className={cn("text-sm font-mono font-bold", tx.amount > 0 ? "text-success" : "text-text-primary")}>
                               {tx.amount > 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-[9px] font-mono text-text-tertiary uppercase mt-1">{(tx.executedAt?.toDate?.() || new Date()).toLocaleTimeString()}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </section>
          </div>

          <div className="space-y-8">
             <section className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3 mb-10">
                   <Settings size={18} className="text-primary" /> Rules
                </h2>
                <div className="space-y-4">
                   {[
                     { label: 'Min Payout', value: `${ECONOMY_RULES.PAYOUTS.MIN_THRESHOLD.toLocaleString()} PTS` },
                     { label: 'Daily Cap', value: `${ECONOMY_RULES.REWARDS.DAILY_LIMIT.toLocaleString()} PTS` },
                     { label: 'Fraud THR', value: `${ECONOMY_RULES.FRAUD.VELOCITY_THRESHOLD.toLocaleString()} / HR` },
                   ].map((item) => (
                     <div key={item.label} className="flex items-center justify-between p-5 rounded-2xl bg-surface-bright/50 border border-border group hover:border-primary/20 transition-all">
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{item.label}</p>
                        <p className="text-xs font-mono font-bold text-text-primary group-hover:text-primary transition-all">{item.value}</p>
                     </div>
                   ))}
                </div>
             </section>
          </div>
       </div>

       <AnimatePresence>
          {isAdjusting && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsAdjusting(false)}
                  className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 30 }}
                  className="relative w-full max-w-lg bg-surface border border-border-bright rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
                >
                   <div className="p-10 border-b border-border flex items-center justify-between bg-surface-bright/50">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                            <RefreshCw size={28} />
                         </div>
                         <div>
                            <h3 className="text-2xl font-bold text-text-primary tracking-tight uppercase italic leading-none mb-2">Economy Mutation</h3>
                            <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none">Authorized Admin Logic Vector</p>
                         </div>
                      </div>
                      <button onClick={() => setIsAdjusting(false)} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                         <X size={24} />
                      </button>
                   </div>

                   <div className="p-10 space-y-10">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1 flex items-center gap-2">
                            <User size={12} /> Target User Identifier
                         </label>
                         <input
                           value={adjustForm.userId}
                           onChange={e => setAdjustForm(prev => ({ ...prev, userId: e.target.value }))}
                           placeholder="Scan or enter system UID..."
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-mono"
                         />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Asset Delta</label>
                            <div className="relative group">
                               <input
                                 type="number"
                                 value={adjustForm.amount}
                                 onChange={e => setAdjustForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                 placeholder="0.00"
                                 className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-mono"
                               />
                               <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1.5">
                                  <button onClick={() => setAdjustForm(prev => ({ ...prev, amount: Math.abs(prev.amount) }))} className={cn("p-1.5 rounded-lg transition-all", adjustForm.amount >= 0 ? "bg-success/20 text-success" : "bg-surface-bright text-text-tertiary")}><Plus size={14} /></button>
                                  <button onClick={() => setAdjustForm(prev => ({ ...prev, amount: -Math.abs(prev.amount) }))} className={cn("p-1.5 rounded-lg transition-all", adjustForm.amount < 0 ? "bg-danger/20 text-danger" : "bg-surface-bright text-text-tertiary")}><Minus size={14} /></button>
                               </div>
                            </div>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Asset Matrix</label>
                            <select
                              value={adjustForm.isXp ? 'XP' : 'POINTS'}
                              onChange={e => setAdjustForm(prev => ({ ...prev, isXp: e.target.value === 'XP' }))}
                              className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-black uppercase tracking-widest appearance-none"
                            >
                               <option value="POINTS" className="bg-surface">Pulse Points</option>
                               <option value="XP" className="bg-surface">System XP</option>
                            </select>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Operational Rationale</label>
                         <textarea
                           rows={3}
                           value={adjustForm.description}
                           onChange={e => setAdjustForm(prev => ({ ...prev, description: e.target.value }))}
                           placeholder="Detail the requirement for manual settlement..."
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm text-text-primary h-32 resize-none focus:border-primary/50 outline-none transition-all font-medium leading-relaxed"
                         />
                      </div>

                      <div className="pt-4 flex gap-4">
                         <Button
                           onClick={handleAdjust}
                           isLoading={isSubmitting}
                           className="flex-1 py-6 rounded-2xl shadow-2xl italic font-black uppercase tracking-[0.2em] text-[11px]"
                         >
                            Authorize Mutation
                         </Button>
                         <button
                           type="button"
                           onClick={() => setIsAdjusting(false)}
                           className="px-10 py-6 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]"
                         >
                            Abort
                         </button>
                      </div>
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};

export default OpsEconomy;
