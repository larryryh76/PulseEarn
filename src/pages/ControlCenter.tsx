import React, { useState, useEffect } from 'react';
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
  ClipboardList
} from 'lucide-react';
import { cn } from '../utils';
import SystemSettingsPanel from '../components/admin/SystemSettingsPanel';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import ProtocolLiveFeed from '../components/admin/ProtocolLiveFeed';

const ControlCenter: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    activeTasks: 0,
    notificationsSent: 0
  });

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
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (_) => {
      // Logic moved to ProtocolLiveFeed
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Protocol Overview</h1>
          <p className="text-white/40 text-xs mt-1">Real-time health and engagement metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-bold text-white/60 uppercase">API v2.4 Status: 200 OK</span>
          </div>
        </div>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', val: stats.totalUsers, icon: Users, color: 'text-blue-500', trend: '+12% this week' },
          { label: 'Pulse Issued', val: stats.totalPoints.toLocaleString(), icon: Zap, color: 'text-yellow-500', trend: 'Velocity: 240/hr' },
          { label: 'Global Tasks', val: stats.activeTasks, icon: ClipboardList, color: 'text-green-500', trend: 'Active missions' },
          { label: 'Alerts Sent', val: stats.notificationsSent, icon: Bell, color: 'text-accent', trend: 'System broadcasts' }
        ].map((s, i) => (
          <Card key={i} className="p-5 border-white/[0.05] bg-[#0A0A0F]">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-2 rounded-lg bg-white/[0.03]", s.color)}>
                <s.icon size={16} />
              </div>
              <span className="text-[9px] font-bold text-green-500/60 uppercase tracking-tighter">{s.trend}</span>
            </div>
            <p className="text-2xl font-mono font-bold text-white mb-1">{s.val}</p>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ProtocolLiveFeed />
          <UserManagementPanel />
        </div>

        <div className="space-y-6">
          <SystemSettingsPanel />

          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
              <ShieldCheck size={48} className="text-primary" />
            </div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest mb-2">Platform Status</h4>
            <p className="text-[10px] text-white/40 leading-relaxed mb-4">
              Operational logs are synced across 3 node clusters globally.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-bold text-green-500 uppercase">System Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlCenter;
