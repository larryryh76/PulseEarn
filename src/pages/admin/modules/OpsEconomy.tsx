import * as React from 'react';
import {
  Shield,
  BarChart3,
  RefreshCw,
  Zap,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  X,
  User,
  Plus,
  Minus
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  limit,
  getCountFromServer,
  where,
  onSnapshot,
  doc,
  orderBy,
  getDocs,
  startAfter
} from 'firebase/firestore';
import { formatUSD } from '../../../utils/finance';
import { motion, AnimatePresence } from 'framer-motion';
import Button from "../../../components/ui/Button";
import toast from "react-hot-toast";
import { cn } from '../../../utils';
import { EconomyConfigEngine } from '../../../engines/system/EconomyConfigEngine';
import { safeFetch } from '../../../utils/api';
import ProviderManagerModal from './modals/ProviderManagerModal';
import DataTable from '../../../components/admin/common/DataTable';

const OpsEconomy: React.FC = () => {
  const [stats, setStats] = React.useState({
    ecosystemPoints: 0,
    totalUsers: 0,
    totalXp: 0,
    predictionLiability: 0
  });

  const [recentTransactions, setRecentTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [economyConfig, setEconomyConfig] = React.useState<any>(null);
  const [isConfiguring, setIsConfiguring] = React.useState(false);

  const [isAdjusting, setIsAdjusting] = React.useState(false);
  const [isManagingProviders, setIsManagingProviders] = React.useState(false);
  const activeClaimIdRef = React.useRef<string | null>(null);
  const [adjustForm, setAdjustForm] = React.useState({
     userId: '',
     amount: 0,
     type: 'admin_adjustment' as any,
     source: 'Manual Adjustment',
     description: '',
     isXp: false
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchHistory = async (isNext = false) => {
    setLoading(true);
    try {
      let q = query(
        collection(db, 'system_claims'),
        orderBy('executedAt', 'desc'),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'system_claims'),
          orderBy('executedAt', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isNext) {
        setRecentTransactions(prev => [...prev, ...data]);
      } else {
        setRecentTransactions(data);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error("[OpsEconomy] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const metricsUnsub = onSnapshot(doc(db, 'system_config', 'global_metrics'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStats(prev => ({
          ...prev,
          ecosystemPoints: data.totalPTSLiability || 0,
          totalXp: data.totalXpDistributed || 0
        }));
      }
    });

    (async () => {
      try {
        const snap = await getCountFromServer(collection(db, 'users'));
        setStats(prev => ({ ...prev, totalUsers: snap.data().count }));
      } catch (err) {}
    })();

    const activePredUnsub = onSnapshot(query(collection(db, 'user_predictions'), where('status', '==', 'ACTIVE')), (snap) => {
      let predLiability = 0;
      snap.forEach(doc => predLiability += (doc.data().rewardAmount || 0));
      setStats(prev => ({ ...prev, predictionLiability: predLiability }));
    });

    fetchHistory();

    const fetchConfig = async () => {
       const config = await EconomyConfigEngine.getConfig();
       setEconomyConfig(config);
    };
    fetchConfig();

    return () => {
      metricsUnsub();
      activePredUnsub();
    };
  }, []);

  const handleUpdateConfig = async (newConfig: any) => {
     setIsSubmitting(true);
     try {
        await EconomyConfigEngine.updateConfig(newConfig);
        setEconomyConfig(newConfig);
        toast.success('Global Economy Configuration Updated');
        setIsConfiguring(false);
     } catch (err) {
        toast.error('Config Update Failure');
     } finally {
        setIsSubmitting(false);
     }
  };

  const handleAdjust = async () => {
     if (!adjustForm.userId || adjustForm.amount === 0) return toast.error('Authority requires complete vector data');

     setIsSubmitting(true);
     try {
        if (!activeClaimIdRef.current) {
           activeClaimIdRef.current = `admin_${Date.now()}_${adjustForm.userId.slice(0, 8)}`;
        }
        const claimId = activeClaimIdRef.current;
        const res = await safeFetch('/api/execute-transaction', {
           method: 'POST',
           body: JSON.stringify({
              userId: adjustForm.userId,
              amount: adjustForm.isXp ? 0 : adjustForm.amount,
              xpReward: adjustForm.isXp ? adjustForm.amount : 0,
              type: adjustForm.type || 'admin_adjustment',
              source: adjustForm.source || 'Manual Adjustment',
              claimId,
              description: adjustForm.description || 'Admin manual adjustment'
           })
        });

        if (res && res.success) {
           toast.success('Economy Adjustment Synchronized via Backend Authority');
           setIsAdjusting(false);
           activeClaimIdRef.current = null;
           setAdjustForm({ userId: '', amount: 0, type: 'admin_adjustment', source: 'Manual Adjustment', description: '', isXp: false });
           fetchHistory();
        } else {
           toast.error((res && res.error) || 'Backend Transaction Authority Rejected Request');
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic">Economy Controls</h1>
             </div>
             <p className="text-[11px] md:text-xs font-medium text-text-tertiary">Manage platform rewards, liquidity, and administrative adjustments.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
             <button
               onClick={() => setIsConfiguring(true)}
               className="w-full sm:w-auto px-6 md:px-8 py-3 bg-surface-bright border border-border-bright text-text-primary rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-surface-accent transition-all flex items-center justify-center gap-2"
             >
                <Settings size={14} /> Update Config
             </button>
             <button
               onClick={() => setIsManagingProviders(true)}
               className="w-full sm:w-auto px-6 md:px-8 py-3 bg-surface-bright border border-border-bright text-text-primary rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-surface-accent transition-all flex items-center justify-center gap-2"
             >
                <Shield size={14} /> Offerwalls
             </button>
             <button
               onClick={() => setIsAdjusting(true)}
               className="w-full sm:w-auto px-6 md:px-8 py-3 bg-primary text-text-primary rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
             >
                <RefreshCw size={14} /> Adjustment
             </button>
          </div>
       </header>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface border border-border p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-3 md:mb-4">Total PTS Supply</p>
             <p className="text-2xl md:text-3xl font-mono font-bold text-text-primary mb-1 md:mb-2 truncate">{(stats.ecosystemPoints || 0)?.toLocaleString()}</p>
             <div className="flex items-center gap-2 text-primary font-bold text-[8px] md:text-[9px] uppercase tracking-[0.2em]"><Zap size={12} /> PTS Supply</div>
          </div>
          <div className="bg-surface border border-border p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-3 md:mb-4">USD Liability</p>
             <p className="text-2xl md:text-3xl font-mono font-bold text-text-primary mb-1 md:mb-2 truncate">{formatUSD((stats.ecosystemPoints || 0) / 1000)}</p>
             <div className="flex items-center gap-2 text-success font-bold text-[8px] md:text-[9px] uppercase tracking-[0.2em]"><DollarSign size={12} /> Payout Exposure</div>
          </div>
          <div className="bg-surface border border-border p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-3 md:mb-4">Prediction Liability</p>
             <p className="text-2xl md:text-3xl font-mono font-bold text-text-primary mb-1 md:mb-2 truncate">{(stats.predictionLiability || 0)?.toLocaleString()}</p>
             <div className="flex items-center gap-2 text-indigo-400 font-bold text-[8px] md:text-[9px] uppercase tracking-[0.2em]"><TrendingUp size={12} /> Forecast Stakes</div>
          </div>
          <div className="bg-surface border border-border p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-3 md:mb-4">Total XP Distributed</p>
             <p className="text-2xl md:text-3xl font-mono font-bold text-text-primary mb-1 md:mb-2 truncate">{(stats.totalXp || 0)?.toLocaleString()}</p>
             <div className="flex items-center gap-2 text-warning font-bold text-[8px] md:text-[9px] uppercase tracking-[0.2em]"><Zap size={12} /> XP Reward Hub</div>
          </div>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
             <DataTable
                columns={[
                  {
                    header: 'Transaction Details',
                    accessor: (tx: any) => (
                       <div className="flex items-center gap-5">
                          <div className={tx.amount > 0 ? "text-success bg-success/5 p-3 rounded-xl border border-success/10" : "text-text-primary bg-surface-bright p-3 rounded-xl border border-border"}>
                             {tx.amount > 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                          </div>
                          <div>
                             <p className="text-xs font-bold text-text-primary uppercase italic">{tx.source}</p>
                             <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest mt-1.5">{tx.type.replace(/_/g, ' ')}</p>
                          </div>
                       </div>
                    )
                  },
                  {
                    header: 'Delta',
                    className: 'text-right',
                    accessor: (tx: any) => (
                       <p className={cn("text-sm font-mono font-bold", tx.amount > 0 ? "text-success" : "text-text-primary")}>
                          {tx.amount > 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()}
                       </p>
                    )
                  },
                  {
                    header: 'Execution Time',
                    className: 'text-right',
                    accessor: (tx: any) => (
                       <p className="text-[9px] font-mono text-text-tertiary uppercase">{(tx.executedAt?.toDate?.() || new Date()).toLocaleTimeString()}</p>
                    )
                  }
                ]}
                data={recentTransactions}
                isLoading={loading}
                onLoadMore={() => fetchHistory(true)}
                hasMore={hasMore}
             />
          </div>

          <div className="space-y-8">
             <section className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl">
                <h2 className="text-sm font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3 mb-10">
                   <Settings size={18} className="text-primary" /> Live Configuration
                </h2>
                <div className="space-y-4">
                   {[
                     { label: 'Daily Login', value: `+${economyConfig?.rewards?.dailyLoginPoints || 50} PTS` },
                     { label: 'Referrer Bonus', value: `+${economyConfig?.rewards?.referralBonusPointsReferrer || 50} PTS` },
                     { label: 'Referee Bonus', value: `+${economyConfig?.rewards?.referralBonusPointsReferee || 30} PTS` },
                     { label: 'Win Multiplier', value: `${economyConfig?.rewards?.predictionWinMultiplier?.toFixed(1) || '2.0'}X` },
                     { label: 'Predict Unlock', value: `LVL ${economyConfig?.thresholds?.predictionUnlockLevel || 5}` },
                     { label: 'Min Withdrawal', value: `${(economyConfig?.thresholds?.minWithdrawalPoints || 10000).toLocaleString()} PTS` },
                     { label: 'Daily Point Cap', value: `${(economyConfig?.security?.dailyRewardCap || 5000).toLocaleString()} PTS` },
                     { label: 'Min Stake', value: `${(economyConfig?.rewards?.minPredictionStake || 10).toLocaleString()} PTS` },
                     { label: 'Max Stake', value: `${(economyConfig?.rewards?.maxPredictionStake || 10000).toLocaleString()} PTS` },
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
          {isConfiguring && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsConfiguring(false)}
                  className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 30 }}
                  className="relative w-full max-w-2xl bg-surface border border-border-bright rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
                >
                   <div className="p-6 md:p-10 border-b border-border flex items-center justify-between bg-surface-bright/50">
                      <div className="flex items-center gap-4 md:gap-6">
                         <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                            <Settings size={24} className="md:w-7 md:h-7" />
                         </div>
                         <div>
                            <h3 className="text-lg md:text-2xl font-bold text-text-primary tracking-tight uppercase italic leading-none mb-1 md:mb-2">Economy Rebalance</h3>
                            <p className="text-text-secondary text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none">Global Variable Control Hub</p>
                         </div>
                      </div>
                      <button onClick={() => setIsConfiguring(false)} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                         <X size={24} />
                      </button>
                   </div>

                   <div className="p-10 overflow-y-auto max-h-[70vh] space-y-12 no-scrollbar">
                      <section className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Reward Coefficients</h4>
                         <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Daily Login Points</label>
                               <input type="number" value={economyConfig.rewards.dailyLoginPoints} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, dailyLoginPoints: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Daily Login XP</label>
                               <input type="number" value={economyConfig.rewards.dailyLoginXP} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, dailyLoginXP: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Referrer Points</label>
                               <input type="number" value={economyConfig.rewards.referralBonusPointsReferrer} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, referralBonusPointsReferrer: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Referee Points</label>
                               <input type="number" value={economyConfig.rewards.referralBonusPointsReferee} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, referralBonusPointsReferee: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Referral XP</label>
                               <input type="number" value={economyConfig.rewards.referralBonusXP} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, referralBonusXP: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Welcome Bonus Points</label>
                               <input type="number" value={economyConfig.rewards.welcomeBonusPoints} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, welcomeBonusPoints: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Welcome Bonus XP</label>
                               <input type="number" value={economyConfig.rewards.welcomeBonusXP} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, welcomeBonusXP: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Win Multiplier</label>
                               <input type="number" step="0.1" value={economyConfig.rewards.predictionWinMultiplier} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, predictionWinMultiplier: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                         </div>
                      </section>

                      <section className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">System Thresholds</h4>
                         <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Prediction Unlock (LVL)</label>
                               <input type="number" value={economyConfig.thresholds.predictionUnlockLevel} onChange={e => setEconomyConfig({...economyConfig, thresholds: {...economyConfig.thresholds, predictionUnlockLevel: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Min Withdrawal Points</label>
                               <input type="number" value={economyConfig.thresholds.minWithdrawalPoints} onChange={e => setEconomyConfig({...economyConfig, thresholds: {...economyConfig.thresholds, minWithdrawalPoints: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Min Prediction Stake</label>
                               <input type="number" value={economyConfig.rewards.minPredictionStake} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, minPredictionStake: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Max Prediction Stake</label>
                               <input type="number" value={economyConfig.rewards.maxPredictionStake} onChange={e => setEconomyConfig({...economyConfig, rewards: {...economyConfig.rewards, maxPredictionStake: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">XP Per Level</label>
                               <input type="number" value={economyConfig.thresholds.xpPerLevel} onChange={e => setEconomyConfig({...economyConfig, thresholds: {...economyConfig.thresholds, xpPerLevel: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                         </div>
                      </section>

                      <section className="space-y-6">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Security & Protection</h4>
                         <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Max Single Reward</label>
                               <input type="number" value={economyConfig.security.maxSingleReward} onChange={e => setEconomyConfig({...economyConfig, security: {...economyConfig.security, maxSingleReward: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Daily Reward Cap</label>
                               <input type="number" value={economyConfig.security.dailyRewardCap} onChange={e => setEconomyConfig({...economyConfig, security: {...economyConfig.security, dailyRewardCap: Number(e.target.value)}})} className="w-full bg-surface-bright border border-border rounded-xl px-4 py-3 text-sm font-mono" />
                            </div>
                         </div>
                      </section>

                      <div className="pt-6 flex gap-4">
                         <Button onClick={() => handleUpdateConfig(economyConfig)} isLoading={isSubmitting} className="flex-1 py-6 rounded-2xl shadow-2xl font-black uppercase tracking-[0.2em] text-[11px]">
                            Commit Global State
                         </Button>
                         <button onClick={() => setIsConfiguring(false)} className="px-10 py-6 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]">
                            Abort
                         </button>
                      </div>
                   </div>
                </motion.div>
             </div>
          )}

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
                   <div className="p-6 md:p-10 border-b border-border flex items-center justify-between bg-surface-bright/50">
                      <div className="flex items-center gap-4 md:gap-6">
                         <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                            <RefreshCw size={24} className="md:w-7 md:h-7" />
                         </div>
                         <div>
                            <h3 className="text-lg md:text-2xl font-bold text-text-primary tracking-tight uppercase italic leading-none mb-1 md:mb-2">Adjustment</h3>
                            <p className="text-text-secondary text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none">Authorized Reward Update</p>
                         </div>
                      </div>
                      <button onClick={() => setIsAdjusting(false)} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                         <X size={24} />
                      </button>
                   </div>

                   <div className="p-10 space-y-10">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1 flex items-center gap-2">
                            <User size={12} /> Target User ID
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
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Asset Hub</label>
                            <select
                              value={adjustForm.isXp ? 'XP' : 'POINTS'}
                              onChange={e => setAdjustForm(prev => ({ ...prev, isXp: e.target.value === 'XP' }))}
                              className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-black uppercase tracking-widest appearance-none"
                            >
                               <option value="POINTS" className="bg-surface">Pulse PTS</option>
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
                            Apply Adjustment
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
          <ProviderManagerModal isOpen={isManagingProviders} onClose={() => setIsManagingProviders(false)} />
       </AnimatePresence>
    </div>
  );
};

export default OpsEconomy;
