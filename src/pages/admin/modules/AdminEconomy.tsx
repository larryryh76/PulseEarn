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
  ArrowDownLeft
} from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where, onSnapshot } from 'firebase/firestore';
import { formatUSD } from '../../../utils/finance';
import { ECONOMY_RULES } from '../../../engines/points/EconomyAuthority';

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
          collection(db, 'system_claims'),
          where('type', '==', 'withdrawal_debit'),
          where('adminStatus', '==', 'PENDING')
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

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Economy Control</h1>
          <p className="text-text-secondary text-sm font-medium">Real-time oversight of platform liquidity and reward distribution.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">System Sync Active</span>
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
