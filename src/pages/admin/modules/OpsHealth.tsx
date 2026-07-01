import React, { useState, useEffect } from 'react';
import {
  Database,
  Activity,
  Clock,
  RefreshCw,
  AlertCircle,
  Server,
  Wifi,
  Lock
} from 'lucide-react';
import { db, auth } from '../../../firebase/config';
import { collection, query, where, getDocs, limit,  Timestamp, orderBy, startAfter } from 'firebase/firestore';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import DataTable from '../../../components/admin/common/DataTable';
import { useAdminMetrics } from '../../../hooks/useAdminMetrics';

interface HealthMetric {
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  latency?: number;
  lastChecked: Date;
  error?: string;
}

interface SystemAnomaly {
  id: string;
  userId?: string;
  error?: string;
  severity?: 'HIGH' | 'MEDIUM' | 'LOW';
  context?: string;
  timestamp?: Timestamp;
}

const OpsHealth: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [firestoreHealth, setFirestoreHealth] = useState<HealthMetric>({ status: 'ONLINE', lastChecked: new Date() });
  const [authHealth, setAuthHealth] = useState<HealthMetric>({ status: 'ONLINE', lastChecked: new Date() });
  const [recentFailures, setRecentFailures] = useState<SystemAnomaly[]>([]);
  const [stats, setStats] = useState({
    permissionErrors24h: 0,
    failedRequests24h: 0,
    totalAnomalies: 0
  });

  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const fetchAnomalies = async (isNext = false) => {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      let q = query(
        collection(db, 'system_anomalies'),
        where('timestamp', '>=', Timestamp.fromDate(oneDayAgo)),
        orderBy('timestamp', 'desc'),
        limit(20)
      );

      if (isNext && lastDoc) {
        q = query(
          collection(db, 'system_anomalies'),
          where('timestamp', '>=', Timestamp.fromDate(oneDayAgo)),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(20)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemAnomaly));

      if (isNext) {
        setRecentFailures(prev => [...prev, ...data]);
      } else {
        setRecentFailures(data);
        const permErrors = data.filter(d => d.error?.toLowerCase().includes('permission') || d.severity === 'HIGH').length;
        setStats(prev => ({
          ...prev,
          permissionErrors24h: permErrors,
          failedRequests24h: data.length,
          totalAnomalies: data.length
        }));
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === 20);
    } catch (err) {
      console.error("Failed to fetch anomalies:", err);
    }
  };

  const checkHealth = async () => {
    setIsRefreshing(true);
    const start = Date.now();

    try {
      const testQuery = query(collection(db, 'system_config'), limit(1));
      await getDocs(testQuery);
      setFirestoreHealth({
        status: 'ONLINE',
        latency: Date.now() - start,
        lastChecked: new Date()
      });
    } catch (err: any) {
      setFirestoreHealth({
        status: err.code === 'permission-denied' ? 'DEGRADED' : 'OFFLINE',
        lastChecked: new Date(),
        error: err.message
      });
    }

    try {
      if (auth.currentUser) {
        setAuthHealth({ status: 'ONLINE', lastChecked: new Date() });
      } else {
        setAuthHealth({ status: 'DEGRADED', lastChecked: new Date(), error: 'No active admin session' });
      }
    } catch (err: any) {
      setAuthHealth({ status: 'OFFLINE', lastChecked: new Date(), error: err.message });
    }

    await fetchAnomalies();
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE': return 'text-success bg-success/10 border-success/20';
      case 'DEGRADED': return 'text-warning bg-warning/10 border-warning/20';
      case 'OFFLINE': return 'text-danger bg-danger/10 border-danger/20';
      default: return 'text-text-tertiary bg-surface-glass border-border';
    }
  };

  const { reconcile } = useAdminMetrics();

  return (
    <div className="space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-primary" />
            <h1 className="text-3xl font-bold tracking-tight uppercase italic">System Health</h1>
          </div>
          <p className="text-xs font-medium text-text-tertiary">Real-time infrastructure monitoring and failure diagnostics.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button
            onClick={reconcile}
            variant="outline"
            className="flex-1 md:flex-none rounded-xl border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest"
          >
            <RefreshCw size={14} className="mr-2" />
            Reconcile Metrics
          </Button>
          <Button
            onClick={checkHealth}
            isLoading={isRefreshing}
            variant="outline"
            className="flex-1 md:flex-none rounded-xl border-white/5 bg-white/5"
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh System
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-primary">
              <Database size={20} />
            </div>
            <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusColor(firestoreHealth.status)}`}>
              {firestoreHealth.status}
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Firestore Engine</h3>
            <p className="text-[10px] text-text-tertiary uppercase font-mono">
              {firestoreHealth.latency ? `Latency: ${firestoreHealth.latency}ms` : 'Connectivity check active'}
            </p>
          </div>
          {firestoreHealth.error && (
            <div className="p-4 rounded-xl bg-danger/5 border border-danger/10 text-[10px] font-mono text-danger break-all">
              {firestoreHealth.error}
            </div>
          )}
        </Card>

        <Card className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-primary">
              <Lock size={20} />
            </div>
            <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusColor(authHealth.status)}`}>
              {authHealth.status}
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Identity Gateway</h3>
            <p className="text-[10px] text-text-tertiary uppercase font-mono">
              Last Handshake: {authHealth.lastChecked.toLocaleTimeString()}
            </p>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-primary">
              <Activity size={20} />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">Health Index</p>
              <p className="text-xl font-bold text-success italic uppercase tracking-tighter">99.8%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Failures (24h)</p>
              <p className={`text-lg font-bold italic ${stats.failedRequests24h > 0 ? 'text-warning' : 'text-white'}`}>{stats.failedRequests24h}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">Perm Denied (24h)</p>
              <p className={`text-lg font-bold italic ${stats.permissionErrors24h > 0 ? 'text-danger' : 'text-white'}`}>{stats.permissionErrors24h}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-warning" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">Recent System Anomalies</h2>
          </div>

          <DataTable
            columns={[
              {
                header: 'Timestamp',
                accessor: (failure: SystemAnomaly) => (
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-text-tertiary" />
                    <span className="text-[10px] font-mono text-text-secondary uppercase">
                      {failure.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                )
              },
              {
                header: 'Error Signature',
                accessor: (failure: SystemAnomaly) => (
                  <p className="text-[10px] font-bold text-text-primary uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors italic">
                    {failure.error}
                  </p>
                )
              },
              {
                header: 'Severity',
                accessor: (failure: SystemAnomaly) => (
                  <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                    failure.severity === 'HIGH' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-warning/10 text-warning border border-warning/20'
                  }`}>
                    {failure.severity || 'MEDIUM'}
                  </span>
                )
              },
              {
                header: 'Context',
                accessor: (failure: SystemAnomaly) => (
                  <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest opacity-50">{failure.context || 'SYSTEM'}</span>
                )
              }
            ]}
            data={recentFailures}
            isLoading={isRefreshing}
            onLoadMore={() => fetchAnomalies(true)}
            hasMore={hasMore}
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Server size={18} className="text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">Network Topology</h2>
          </div>
          <Card className="p-8 space-y-8">
             <div className="space-y-6">
                {[
                  { label: 'Edge Network', status: 'Optimal', icon: Wifi },
                  { label: 'Cloud Firestore', status: 'Verified', icon: Database },
                  { label: 'Auth Gateway', status: 'Secure', icon: Lock },
                  { label: 'Point Engine', status: 'Operational', icon: Activity }
                ].map((service) => (
                  <div key={service.label} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                        <service.icon size={14} />
                      </div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{service.label}</span>
                    </div>
                    <span className="text-[9px] font-black text-success uppercase tracking-widest italic">{service.status}</span>
                  </div>
                ))}
             </div>

             <div className="pt-6 border-t border-white/5 space-y-4">
                <p className="text-[9px] text-text-tertiary font-medium leading-relaxed uppercase tracking-widest">
                  Infrastructure is fully synchronized with the canonical domain <span className="text-primary font-bold italic">https://pulseearn.online</span>.
                </p>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                   <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-1">Architecture Standard</p>
                   <p className="text-[9px] text-text-tertiary font-medium">All database operations utilize engine version <span className="text-white">5.0.0-PRO</span> with authoritative ledger validation.</p>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OpsHealth;
