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
  CreditCard
} from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, query, where, getCountFromServer, getDocs, limit, Timestamp, orderBy } from 'firebase/firestore';
import { cn } from '../../../utils';
import { formatUSD } from '../../../utils/finance';

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
    totalLiability: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [lastSync, setLastSync] = React.useState<Date>(new Date());
  const [recentLedger, setRecentLedger] = React.useState<any[]>([]);

  const fetchOperationalData = async () => {
    setLoading(true);
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
      volSnap.forEach(d => volume += Math.abs(d.data().amount || 0));

      const liabilitySnap = await getDocs(query(collection(db, 'users'), limit(500)));
      let totalPts = 0;
      liabilitySnap.forEach(d => totalPts += (d.data().points || 0));

      const ledgerSnap = await getDocs(query(
        collection(db, 'system_claims'),
        orderBy('executedAt', 'desc'),
        limit(5)
      ));
      setRecentLedger(ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setStats({
        totalUsers: usersCount.data().count,
        activeCampaigns: campaignsCount.data().count,
        activeTasks: tasksCount.data().count,
        pendingWithdrawals: withdrawalsCount.data().count,
        pendingSupport: supportCount.data().count,
        pendingVerifications: verificationsCount.data().count,
        fraudAnomalies: anomaliesCount.data().count,
        volume24h: volume,
        totalLiability: totalPts
      });
      setLastSync(new Date());
    } catch (error) {
      console.error("[OpsOverview] Authority Sync Failure:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOperationalData();
  }, []);

  const metricItem = (label: string, value: string | number, icon: any, color: string, path?: string) => (
    <div
      onClick={() => path && navigate(path)}
      className={cn(
        "bg-[#0A0A0F] border border-white/5 p-6 rounded-xl hover:border-white/10 transition-all group shadow-2xl",
        path && "cursor-pointer hover:bg-white/[0.02]"
      )}
    >
       <div className="flex justify-between items-start mb-4">
          <div className={cn("p-2.5 rounded-lg bg-white/5 transition-transform group-hover:scale-110 shadow-inner", color)}>
             {React.createElement(icon, { size: 18 })}
          </div>
          {path && <div className="text-[8px] font-black uppercase tracking-widest text-white/10 group-hover:text-primary transition-colors">View Details</div>}
       </div>
       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">{label}</p>
       <p className="text-2xl font-mono font-bold tracking-tighter">
          {loading ? '---' : typeof value === 'number' ? value.toLocaleString() : value}
       </p>
    </div>
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Terminal size={20} />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-white">Ops Control Center</h1>
             </div>
             <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                <span className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                   System Authority: Active
                </span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>Sync Node: {lastSync.toLocaleTimeString()}</span>
             </div>
          </div>
          <button
            onClick={fetchOperationalData}
            className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
          >
             <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
             Reload Matrix
          </button>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricItem('Total Identity Nodes', stats.totalUsers, Users, 'text-primary', '/admin/users')}
          {metricItem('24h Asset Volume', stats.volume24h, Activity, 'text-success', '/admin/ledger')}
          {metricItem('Global USD Liability', formatUSD(stats.totalLiability / 1000), BarChart3, 'text-accent', '/admin/economy')}
          {metricItem('Active Campaigns', stats.activeCampaigns, Target, 'text-indigo-400', '/admin/campaigns')}
       </div>

       <div className="space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 flex items-center gap-3 px-1">
             <Clock size={14} />
             Operational Priority Queues
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div
               onClick={() => navigate('/admin/withdrawals')}
               className={cn(
               "p-8 rounded-2xl bg-[#0A0A0F] border transition-all flex items-center justify-between group cursor-pointer shadow-2xl",
               stats.pendingWithdrawals > 0 ? "border-orange-500/20 hover:border-orange-500/40" : "border-white/5 hover:border-white/10"
             )}>
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Settlement Pressure</p>
                   <p className={cn("text-4xl font-mono font-bold tracking-tighter", stats.pendingWithdrawals > 0 ? "text-orange-500" : "text-white/10")}>
                      {stats.pendingWithdrawals}
                   </p>
                </div>
                <CreditCard size={32} className={cn("transition-all", stats.pendingWithdrawals > 0 ? "text-orange-500" : "text-white/5")} />
             </div>

             <div
               onClick={() => navigate('/admin/validation')}
               className={cn(
               "p-8 rounded-2xl bg-[#0A0A0F] border transition-all flex items-center justify-between group cursor-pointer shadow-2xl",
               stats.pendingVerifications > 0 ? "border-primary/20 hover:border-primary/40" : "border-white/5 hover:border-white/10"
             )}>
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Validation Ingress</p>
                   <p className={cn("text-4xl font-mono font-bold tracking-tighter", stats.pendingVerifications > 0 ? "text-primary" : "text-white/10")}>
                      {stats.pendingVerifications}
                   </p>
                </div>
                <ShieldCheck size={32} className={cn("transition-all", stats.pendingVerifications > 0 ? "text-primary" : "text-white/5")} />
             </div>

             <div
               onClick={() => navigate('/admin/support')}
               className={cn(
               "p-8 rounded-2xl bg-[#0A0A0F] border transition-all flex items-center justify-between group cursor-pointer shadow-2xl",
               stats.pendingSupport > 0 ? "border-indigo-500/20 hover:border-indigo-500/40" : "border-white/5 hover:border-white/10"
             )}>
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Support Signal Flux</p>
                   <p className={cn("text-4xl font-mono font-bold tracking-tighter", stats.pendingSupport > 0 ? "text-indigo-500" : "text-white/10")}>
                      {stats.pendingSupport}
                   </p>
                </div>
                <MessageSquare size={32} className={cn("transition-all", stats.pendingSupport > 0 ? "text-indigo-500" : "text-white/5")} />
             </div>
          </div>
       </div>

       <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-[#0A0A0F] border border-white/5 rounded-2xl p-10 space-y-10 shadow-2xl">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-white/40">
                   <Activity size={18} className="text-primary" />
                   Ecosystem Ledger Stream
                </h3>
             </div>
             <div className="space-y-1">
                {recentLedger.length > 0 ? recentLedger.map((tx) => (
                   <div key={tx.id} onClick={() => navigate('/admin/ledger')} className="flex items-center justify-between p-5 border-b border-white/5 last:border-0 hover:bg-white/[0.01] transition-all cursor-pointer group">
                      <div className="flex items-center gap-5">
                         <div className={cn(
                           "w-1.5 h-1.5 rounded-full transition-all shadow-[0_0_5px_rgba(0,102,255,0.4)]",
                           tx.amount >= 0 ? "bg-success" : "bg-danger"
                         )} />
                         <div>
                            <p className="text-xs font-bold text-white uppercase italic tracking-tight">{tx.source || tx.type?.replace(/_/g, ' ')}</p>
                            <p className="text-[9px] font-mono text-white/20 uppercase mt-1">Ref: {tx.id.slice(0, 12).toUpperCase()}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={cn("text-xs font-mono font-bold italic", tx.amount >= 0 ? "text-success" : "text-danger")}>
                           {tx.amount >= 0 ? '+' : ''}{(tx.amount || 0).toLocaleString()} PTS
                         </p>
                         <p className="text-[9px] font-mono text-white/10 uppercase mt-1">{tx.executedAt?.toDate?.()?.toLocaleTimeString()}</p>
                      </div>
                   </div>
                )) : (
                  <div className="py-20 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">
                    No active ledger signals
                  </div>
                )}
             </div>
          </div>

          <div className="bg-danger/[0.02] border border-danger/10 rounded-2xl p-10 flex flex-col justify-between group shadow-2xl">
             <div className="space-y-8">
                <div className="flex items-center justify-between">
                   <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center text-danger border border-danger/20 group-hover:scale-110 transition-transform shadow-2xl shadow-danger/5">
                      <ShieldAlert size={28} />
                   </div>
                   <div className="px-3 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 text-[8px] font-black uppercase tracking-widest">
                      PERIMETER_SECURE
                   </div>
                </div>
                <div className="space-y-3">
                   <h3 className="text-2xl font-bold text-white uppercase italic tracking-tighter">Security Anomalies</h3>
                   <p className="text-xs text-text-tertiary leading-relaxed font-medium">Ops identifies <span className="text-danger font-bold">{stats.fraudAnomalies}</span> logic violations requiring administrative termination.</p>
                </div>
             </div>
             <button
               onClick={() => navigate('/admin/security')}
               className="w-full py-5 mt-10 bg-danger/10 text-danger border border-danger/20 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-danger/20 transition-all italic"
             >
                Scan Threat Matrix
             </button>
          </div>
       </section>
    </div>
  );
};

export default OpsOverview;
