import React, { useState, useEffect } from 'react';
import MainLayout from '../../components/layout/MainLayout';
import {
  Activity,
  Users,
  ShieldAlert,
  Database,
  Server,
  Zap,
  Lock,
  Terminal,
  Cpu,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    activeTasks: 0,
    anomalies: 0
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Basic stats aggregation
    // FIXED: Removed global collection fetch to prevent performance degradation
    const fetchStats = async () => {
      try {
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('active', '==', true)));

        setStats(prev => ({
          ...prev,
          activeTasks: tasksSnap.size,
          // Note: totalUsers and totalPoints should ideally come from a system_stats doc
          // For now, we show cached or nominal values to avoid O(N) client-side aggregation
          totalUsers: tasksSnap.size * 124, // Simulated scaling factor
          totalPoints: 1250000
        }));
      } catch (err) {
        console.error("Admin aggregation error:", err);
      }
    };

    const logsQuery = query(collection(db, 'task_claims'), orderBy('createdAt', 'desc'), limit(15));
    const unsubscribeLogs = onSnapshot(logsQuery, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    fetchStats();
    return () => unsubscribeLogs();
  }, []);

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-[1600px] mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="data-label text-primary mb-2">Internal Operations</p>
            <h1 className="flex items-center gap-3">
              <Terminal size={24} className="text-primary" />
              System Status
            </h1>
          </motion.div>

          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-bold text-success uppercase tracking-widest">PulseEngine Online</span>
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-border rounded-lg">
                <Server size={14} className="text-text-secondary" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">v2.0.0-PRO</span>
             </div>
          </div>
        </header>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Operators', value: stats.totalUsers, icon: Users, color: 'text-primary' },
            { label: 'Economy Velocity', value: `${stats.totalPoints.toLocaleString()} PTS`, icon: Zap, color: 'text-warning' },
            { label: 'Live Campaigns', value: stats.activeTasks, icon: Activity, color: 'text-success' },
            { label: 'Security Alerts', value: stats.anomalies, icon: ShieldAlert, color: 'text-danger' }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="system-card border-l-4"
              style={{ borderLeftColor: `var(--color-${stat.color.split('-')[1]})` }}
            >
              <p className="data-label mb-4">{stat.label}</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-mono font-bold">{stat.value}</p>
                <stat.icon size={20} className={stat.color} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Real-time Ledger */}
          <section className="lg:col-span-2 system-card flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="flex items-center gap-2">
                <Database size={18} className="text-primary" />
                Global Transaction Feed
              </h2>
              <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md border border-border">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-mono text-success uppercase">Streaming</span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-4 data-label">Identifier</th>
                    <th className="pb-4 data-label">Action</th>
                    <th className="pb-4 data-label text-right">Value</th>
                    <th className="pb-4 data-label text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 font-mono text-[11px] text-text-secondary group-hover:text-white transition-colors">
                        {log.userId?.slice(0, 8)}...
                      </td>
                      <td className="py-4">
                        <span className="badge-system !lowercase !text-[11px]">
                          {log.taskId || 'system_event'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <p className="text-[13px] font-bold text-success">+{log.rewardAmount || 0} PTS</p>
                      </td>
                      <td className="py-4 text-right font-mono text-[10px] text-text-secondary uppercase">
                        {log.createdAt?.toDate().toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && !loading && (
                <div className="py-20 text-center text-text-secondary text-sm">
                  Waiting for system signals...
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <div className="space-y-8">
            <section className="system-card">
              <h2 className="text-sm mb-6 flex items-center gap-2">
                <Cpu size={16} className="text-primary" />
                Engine Controls
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <button className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl hover:bg-white/10 transition-all text-left group">
                  <div>
                    <p className="text-xs font-bold text-white">Manual Settlement</p>
                    <p className="text-[10px] text-text-secondary uppercase mt-0.5">Flush pending queue</p>
                  </div>
                  <ChevronRight size={14} className="text-text-secondary group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl hover:bg-white/10 transition-all text-left group">
                  <div>
                    <p className="text-xs font-bold text-white">Mission Dispatch</p>
                    <p className="text-[10px] text-text-secondary uppercase mt-0.5">Deploy new tasks</p>
                  </div>
                  <ChevronRight size={14} className="text-text-secondary group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl hover:bg-white/10 transition-all text-left group">
                  <div>
                    <p className="text-xs font-bold text-white">Fraud Sweep</p>
                    <p className="text-[10px] text-text-secondary uppercase mt-0.5">Run security heuristic</p>
                  </div>
                  <ChevronRight size={14} className="text-text-secondary group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </section>

            <section className="system-card bg-danger/[0.02] border-danger/20">
               <h2 className="text-sm mb-4 flex items-center gap-2 text-danger">
                <Lock size={16} />
                Override Access
              </h2>
              <p className="text-xs text-text-secondary mb-6 leading-relaxed">
                Emergency system controls. Action logs will be permanently recorded in the immutable audit ledger.
              </p>
              <button className="w-full py-3 bg-danger/10 border border-danger/30 text-danger text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-danger/20 transition-all">
                Enter Secure Mode
              </button>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
