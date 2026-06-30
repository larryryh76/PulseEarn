import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Target,
  Activity,
  ShieldAlert,
  BarChart3,
  Clock,
  Terminal,
  RefreshCcw,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../../firebase/config';
import { collection, query, where, getCountFromServer, getDocs, limit, Timestamp, doc, onSnapshot, orderBy, startAfter } from 'firebase/firestore';
import { cn } from '../../../utils';
import { formatUSD } from '../../../utils/finance';
import DataTable from '../../../components/admin/common/DataTable';

const OpsOverview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    activeCampaigns: 0,
    activeTasks: 0,
    pendingWithdrawals: 0,
    pendingSupport: 0,
    pendingVerifications: 0,
    fraudAnomalies: 0,
    volume24h: 0,
    totalLiability: 0,
    offerwallEarnings24h: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [lastSync, setLastSync] = React.useState<Date>(new Date());
  const [recentLedger, setRecentLedger] = React.useState<any[]>([]);
  const [hasMore, setHasMore] = React.useState(true);
  const [lastDoc, setLastDoc] = React.useState<any>(null);

  const fetchCountsRef = React.useRef<() => Promise<void>>(async () => {});

  const fetchLedger = async (isNext = false) => {
    try {
      let q = query(
        collection(db, 'system_claims'),
        orderBy('executedAt', 'desc'),
        limit(10)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'system_claims'),
          orderBy('executedAt', 'desc'),
          startAfter(lastDoc),
          limit(10)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isNext) {
        setRecentLedger(prev => [...prev, ...data]);
      } else {
        setRecentLedger(data);
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 10);
    } catch (err) {
      console.error("[OpsOverview] Ledger Fetch Error:", err);
    }
  };

  React.useEffect(() => {
    setLoading(true);

    // Live metrics from system_config
    const metricsUnsub = onSnapshot(doc(db, 'system_config', 'global_metrics'), (snap) => {
      if (snap.exists()) {
        setStats(prev => ({ ...prev, totalLiability: snap.data().totalPTSLiability || 0 }));
      }
      setLastSync(new Date());
    });

    // Counts - aggregate listener (simulated by frequent polling or direct onSnapshot if supported by collection)
    const fetchCounts = async () => {
      try {
        const [
          usersCount,
          campaignsCount,
          tasksCount,
          withdrawalsCount,
          supportCount,
          verificationsCount,
          anomaliesCount
        ] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'campaigns'), where('active', '==', true))),
          getCountFromServer(query(collection(db, 'tasks'), where('active', '==', true))),
          getCountFromServer(query(collection(db, 'withdrawals'), where('status', '==', 'PENDING'))),
          getCountFromServer(query(collection(db, 'support_tickets'), where('status', '==', 'OPEN'))),
          getCountFromServer(query(collection(db, 'task_claims'), where('validationState', '==', 'PENDING'))),
          getCountFromServer(collection(db, 'system_anomalies'))
        ]);

        const dayAgo = new Date();
        dayAgo.setHours(dayAgo.getHours() - 24);
        const volSnap = await getDocs(query(
          collection(db, 'system_claims'),
          where('executedAt', '>=', Timestamp.fromDate(dayAgo))
        ));
        let volume = 0;
        let offerwallVolume = 0;
        volSnap.forEach(d => {
            const data = d.data();
            const amount = Math.abs(data.amount || 0);
            volume += amount;
            if (data.type?.startsWith('offerwall_')) {
                offerwallVolume += amount;
            }
        });

        setStats(prev => ({
          ...prev,
          totalUsers: usersCount.data().count,
          activeCampaigns: campaignsCount.data().count,
          activeTasks: tasksCount.data().count,
          pendingWithdrawals: withdrawalsCount.data().count,
          pendingSupport: supportCount.data().count,
          pendingVerifications: verificationsCount.data().count,
          fraudAnomalies: anomaliesCount.data().count,
          volume24h: volume,
          offerwallEarnings24h: offerwallVolume
        }));
        setLoading(false);
      } catch (err) {
        console.error("OpsOverview Polling Error:", err);
      }
    };

    fetchCounts();
    fetchLedger();
    fetchCountsRef.current = fetchCounts;
    const interval = setInterval(fetchCounts, 30000);

    return () => {
      metricsUnsub();
      clearInterval(interval);
    };
  }, []);

  const metricItem = (label: string, value: string | number, icon: any, color: string, path?: string) => (
    <motion.div
      layout
      onClick={() => path && navigate(path)}
      className={cn(
        "bg-surface border border-border p-5 md:p-6 rounded-xl hover:border-border-bright transition-all group shadow-2xl",
        path && "cursor-pointer hover:bg-surface-bright"
      )}
    >
       <div className="flex justify-between items-start mb-3 md:mb-4">
          <div className={cn("p-2 md:p-2.5 rounded-lg bg-surface-bright transition-transform group-hover:scale-110 shadow-inner", color)}>
             {React.createElement(icon, { size: 16 })}
          </div>
          {path && <div className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-text-tertiary/50 group-hover:text-primary transition-colors">Audit</div>}
       </div>
       <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary mb-0.5 md:mb-1 truncate">{label}</p>
       <motion.p
          key={value}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-mono font-bold tracking-tighter truncate"
       >
          {loading ? '---' : typeof value === 'number' ? value.toLocaleString() : value}
       </motion.p>
    </motion.div>
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Terminal size={20} />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase italic text-text-primary">Overview</h1>
             </div>
             <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                <span className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                   System: Online
                </span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-surface-accent" />
                <span>Sync: {lastSync.toLocaleTimeString()}</span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-surface-accent" />
                <span className="text-primary italic">Engine: 5.0.0-PRO</span>
                {stats.totalLiability === 0 && !loading && (
                   <span className="text-danger flex items-center gap-1.5 animate-bounce ml-4">
                      <ShieldAlert size={12} />
                      CRITICAL: Liability Reporting Offline
                   </span>
                )}
             </div>
          </div>
          <button
            onClick={() => { fetchCountsRef.current?.(); fetchLedger(); }}
            className="w-full md:w-auto px-6 py-2.5 bg-surface-bright border border-border-bright rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-surface-accent transition-all flex items-center justify-center gap-2"
          >
             <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
             Refresh Feed
          </button>
       </header>

       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
          {metricItem('Total Users', stats.totalUsers, Users, 'text-primary', '/admin/users')}
          {metricItem('24h PTS Volume', stats.volume24h, Activity, 'text-success', '/admin/ledger')}
          {metricItem('24h Offerwall', stats.offerwallEarnings24h, ShieldCheck, 'text-indigo-400', '/admin/economy')}
          {metricItem('USD Liability', formatUSD(stats.totalLiability / 1000), BarChart3, 'text-accent', '/admin/economy')}
          {metricItem('Active Campaigns', stats.activeCampaigns, Target, 'text-orange-400', '/admin/campaigns')}
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
             <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-3 px-1">
                <Activity size={14} />
                Live Event Feed
             </h2>
             <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                   {recentLedger.slice(0, 5).map((tx, idx) => (
                      <motion.button
                         key={tx.id}
                         initial={{ opacity: 0, x: -20 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ delay: idx * 0.1 }}
                         className="w-full p-6 flex items-center justify-between hover:bg-surface-bright transition-colors group cursor-pointer text-left appearance-none outline-none"
                         onClick={() => navigate('/admin/ledger')}
                      >
                         <div className="flex items-center gap-4">
                            <div className={cn(
                               "w-10 h-10 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110 shadow-inner",
                               tx.amount >= 0 ? "bg-success/5 border-success/10 text-success" : "bg-danger/5 border-danger/10 text-danger"
                            )}>
                               {tx.amount >= 0 ? <UserPlus size={18} /> : <CreditCard size={18} />}
                            </div>
                            <div>
                               <p className="text-xs font-bold text-text-primary uppercase italic tracking-tight">{tx.source || tx.type?.replace(/_/g, ' ')}</p>
                               <p className="text-[9px] font-mono text-text-tertiary uppercase mt-1">{tx.userId.slice(0, 12)}...</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className={cn("text-sm font-mono font-bold", tx.amount >= 0 ? "text-success" : "text-danger")}>
                               {tx.amount >= 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()}
                            </p>
                            <p className="text-[8px] font-black text-text-tertiary/30 uppercase mt-1 tracking-widest">{tx.executedAt?.toDate?.()?.toLocaleTimeString()}</p>
                         </div>
                      </motion.button>
                   ))}
                </AnimatePresence>
             </div>
          </div>

          <div className="space-y-8">
             <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-3 px-1">
                <ShieldAlert size={14} />
                Critical Attention
             </h2>
             <div className="space-y-4">
                {[
                   { label: 'Pending Payouts', count: stats.pendingWithdrawals, path: '/admin/withdrawals', icon: CreditCard, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                   { label: 'Open Inquiries', count: stats.pendingSupport, path: '/admin/support', icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
                   { label: 'Unresolved Threats', count: stats.fraudAnomalies, path: '/admin/security', icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10' }
                ].map(item => (
                   <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className="w-full p-6 bg-surface border border-border rounded-2xl flex items-center justify-between group cursor-pointer hover:border-border-bright transition-all shadow-xl text-left appearance-none outline-none"
                   >
                      <div className="flex items-center gap-4">
                         <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-transparent shadow-inner transition-transform group-hover:scale-110", item.bg, item.color)}>
                            <item.icon size={18} />
                         </div>
                         <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{item.label}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={cn("text-xl font-mono font-bold tracking-tighter", item.count > 0 ? item.color : "text-text-tertiary/20")}>
                            {item.count}
                         </span>
                         <ArrowRight size={14} className="text-text-tertiary/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </div>
                   </button>
                ))}
             </div>
          </div>
       </div>

       <div className="space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-3 px-1">
             <Clock size={14} />
             Operational Priority Queues
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
             <div
               onClick={() => navigate('/admin/withdrawals')}
               className={cn(
               "p-8 rounded-2xl bg-surface border transition-all flex items-center justify-between group cursor-pointer shadow-2xl",
               stats.pendingWithdrawals > 0 ? "border-orange-500/20 hover:border-orange-500/40" : "border-border hover:border-border-bright"
             )}>
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Pending Withdrawals</p>
                   <p className={cn("text-4xl font-mono font-bold tracking-tighter", stats.pendingWithdrawals > 0 ? "text-orange-500" : "text-text-tertiary/50")}>
                      {stats.pendingWithdrawals}
                   </p>
                </div>
                <CreditCard size={32} className={cn("transition-all", stats.pendingWithdrawals > 0 ? "text-orange-500" : "text-text-primary/5")} />
             </div>

             <div
               onClick={() => navigate('/admin/validation')}
               className={cn(
               "p-8 rounded-2xl bg-surface border transition-all flex items-center justify-between group cursor-pointer shadow-2xl",
               stats.pendingVerifications > 0 ? "border-primary/20 hover:border-primary/40" : "border-border hover:border-border-bright"
             )}>
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Pending Approvals</p>
                   <p className={cn("text-4xl font-mono font-bold tracking-tighter", stats.pendingVerifications > 0 ? "text-primary" : "text-text-tertiary/50")}>
                      {stats.pendingVerifications}
                   </p>
                </div>
                <ShieldCheck size={32} className={cn("transition-all", stats.pendingVerifications > 0 ? "text-primary" : "text-text-primary/5")} />
             </div>

             <div
               onClick={() => navigate('/admin/support')}
               className={cn(
               "p-8 rounded-2xl bg-surface border transition-all flex items-center justify-between group cursor-pointer shadow-2xl",
               stats.pendingSupport > 0 ? "border-indigo-500/20 hover:border-indigo-500/40" : "border-border hover:border-border-bright"
             )}>
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Open Tickets</p>
                   <p className={cn("text-4xl font-mono font-bold tracking-tighter", stats.pendingSupport > 0 ? "text-indigo-500" : "text-text-tertiary/50")}>
                      {stats.pendingSupport}
                   </p>
                </div>
                <MessageSquare size={32} className={cn("transition-all", stats.pendingSupport > 0 ? "text-indigo-500" : "text-text-primary/5")} />
             </div>
          </div>
       </div>

       <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-text-secondary px-1">
                   <Activity size={16} className="text-primary" />
                   Recent Transactions
                </h3>
             </div>

             <DataTable
                columns={[
                  {
                    header: 'Transaction',
                    accessor: (tx: any) => (
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all shadow-[0_0_5px_rgba(0,102,255,0.4)]",
                            tx.amount >= 0 ? "bg-success" : "bg-danger"
                          )} />
                          <div>
                             <p className="text-[11px] md:text-xs font-bold text-text-primary uppercase italic tracking-tight">{tx.source || tx.type?.replace(/_/g, ' ')}</p>
                             <p className="text-[8px] md:text-[9px] font-mono text-text-tertiary uppercase mt-1">ID: {tx.id.slice(0, 10).toUpperCase()}</p>
                          </div>
                       </div>
                    )
                  },
                  {
                    header: 'Amount',
                    className: 'text-right',
                    accessor: (tx: any) => (
                       <div>
                          <p className={cn("text-[11px] md:text-xs font-mono font-bold italic", tx.amount >= 0 ? "text-success" : "text-danger")}>
                            {tx.amount >= 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()} PTS
                          </p>
                          <p className="text-[8px] md:text-[9px] font-mono text-text-tertiary/50 uppercase mt-1">{tx.executedAt?.toDate?.()?.toLocaleTimeString()}</p>
                       </div>
                    )
                  }
                ]}
                data={recentLedger}
                isLoading={loading}
                onRowClick={() => navigate('/admin/ledger')}
                onLoadMore={() => fetchLedger(true)}
                hasMore={hasMore}
             />
          </div>

          <div className="bg-danger/[0.02] border border-danger/10 rounded-2xl p-6 md:p-10 flex flex-col justify-between group shadow-2xl h-fit">
             <div className="space-y-6 md:space-y-8">
                <div className="flex items-center justify-between">
                   <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-danger/10 flex items-center justify-center text-danger border border-danger/20 group-hover:scale-110 transition-transform shadow-2xl shadow-danger/5">
                      <ShieldAlert size={24} />
                   </div>
                   <div className="px-3 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 text-[7px] md:text-[8px] font-black uppercase tracking-widest">
                      SYSTEM_SECURE
                   </div>
                </div>
                <div className="space-y-2 md:space-y-3">
                   <h3 className="text-xl md:text-2xl font-bold text-text-primary uppercase italic tracking-tighter">Security Alerts</h3>
                   <p className="text-[11px] md:text-xs text-text-tertiary leading-relaxed font-medium">System detected <span className="text-danger font-bold">{stats.fraudAnomalies}</span> security alerts requiring administrative review.</p>
                </div>
             </div>
             <button
               onClick={() => navigate('/admin/security')}
               className="w-full py-4 md:py-5 mt-8 md:mt-10 bg-danger/10 text-danger border border-danger/20 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] hover:bg-danger/20 transition-all italic"
             >
                Review Security
             </button>
          </div>
       </section>
    </div>
  );
};

export default OpsOverview;
