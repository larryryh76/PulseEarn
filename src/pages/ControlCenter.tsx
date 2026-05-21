import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import {
  Users,
  Zap,
  Bell,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react';
import { cn } from '../utils';

const ControlCenter: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    activeTasks: 0,
    notificationsSent: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  useEffect(() => {
    // Basic stats fetch
    const fetchStats = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      let points = 0;
      usersSnap.forEach(doc => {
        points += doc.data().points || 0;
      });

      const tasksSnap = await getDocs(collection(db, 'tasks'));

      setStats({
        totalUsers: usersSnap.size,
        totalPoints: points,
        activeTasks: tasksSnap.size,
        notificationsSent: 0 // Placeholder
      });
    };

    fetchStats();

    // Global activity listener (simplified for now)
    // Real admin apps might listen to a global activities log or use Cloud Functions
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecentActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Protocol Admin</span>
          </div>
          <h1 className="text-2xl font-bold">Control Center</h1>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase">
          Root Access
        </div>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', val: stats.totalUsers, icon: Users, color: 'text-blue-500' },
          { label: 'Pulse Issued', val: stats.totalPoints.toLocaleString(), icon: Zap, color: 'text-yellow-500' },
          { label: 'Global Tasks', val: stats.activeTasks, icon: ClipboardList, color: 'text-green-500' },
          { label: 'Alerts Sent', val: stats.notificationsSent, icon: Bell, color: 'text-accent' }
        ].map((s, i) => (
          <Card key={i} className="p-5 border-white/[0.05] bg-white/[0.01]">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-white/[0.03]", s.color)}>
                <s.icon size={16} />
              </div>
              <ArrowUpRight size={14} className="text-white/20" />
            </div>
            <p className="text-2xl font-mono font-bold text-white mb-1">{s.val}</p>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-0 overflow-hidden border-white/[0.05] bg-white/[0.01]">
            <div className="p-5 border-b border-white/[0.05] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Global Live Feed</h3>
              </div>
              <span className="text-[10px] text-white/20 font-bold uppercase">Real-time</span>
            </div>
            <div className="divide-y divide-white/[0.02]">
              {recentActivities.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/10">Waiting for protocol events...</p>
                </div>
              ) : (
                recentActivities.map(act => (
                  <div key={act.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <div>
                        <p className="text-xs font-bold">{act.type}</p>
                        <p className="text-[9px] text-white/40">{act.description}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-white/20">
                      {act.timestamp?.toDate().toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 border-white/[0.05] bg-white/[0.02]">
            <h3 className="text-[11px] font-bold uppercase tracking-widest mb-6">Management Console</h3>
            <div className="space-y-3">
              {['Broadcast Alert', 'Create Task', 'Reward Audit', 'User Lookup'].map(action => (
                <button
                  key={action}
                  className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all text-left flex items-center justify-between group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white">{action}</span>
                  <ArrowUpRight size={12} className="text-white/20 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </Card>

          <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck size={48} className="text-primary" />
            </div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2">Protocol Integrity</h4>
            <p className="text-[10px] text-white/40 leading-relaxed mb-4">
              All administrative actions are logged and subject to governance verification.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-green-500 uppercase">System Secure</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ControlCenter;
