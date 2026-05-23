import React, { useState, useEffect } from 'react';
import { CardPremium } from '../components/ui/PremiumModules';
import { db } from '../firebase/config';
import {
  collection,
  getDocs
} from 'firebase/firestore';
import {
  Users,
  Zap,
  Bell,
  ShieldCheck,
  ClipboardList,
  Activity,
  Globe,
  Cpu
} from 'lucide-react';
import { cn } from '../utils';
import SystemSettingsPanel from '../components/admin/SystemSettingsPanel';
import UserManagementPanel from '../components/admin/UserManagementPanel';
import SystemLiveFeed from '../components/admin/SystemLiveFeed';

const ControlCenter: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPoints: 0,
    activeTasks: 0,
    notificationsSent: 0
  });

  useEffect(() => {
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
        notificationsSent: 0
      });
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
             <Cpu size={14} />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Pulse Core Interface</span>
          </div>
          <h1 className="text-4xl font-financial text-white tracking-tight">Control Center</h1>
          <p className="text-white/30 text-xs font-medium">Platform-wide governance and ecosystem resource management.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(0,255,163,0.5)]" />
            <span className="text-[10px] font-financial text-white/60 uppercase tracking-widest">Ecosystem Active</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/20">
             <Globe size={18} />
          </div>
        </div>
      </div>

      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Members', val: stats.totalUsers, icon: Users, color: 'text-blue-500', trend: '+12% Δ' },
          { label: 'Circulating Pulse', val: stats.totalPoints.toLocaleString(), icon: Zap, color: 'text-yellow-500', trend: '240/hr velocity' },
          { label: 'Operational Tasks', val: stats.activeTasks, icon: ClipboardList, color: 'text-success', trend: 'System ready' },
          { label: 'Global Alerts', val: stats.notificationsSent, icon: Bell, color: 'text-accent', trend: 'Standby' }
        ].map((s, i) => (
          <CardPremium key={i} variant="standard" className="bg-[#0A0A0F] border-white/[0.05]">
            <div className="flex items-center justify-between mb-6">
              <div className={cn("p-2.5 rounded-xl bg-white/5", s.color)}>
                <s.icon size={18} />
              </div>
              <span className="text-[9px] font-bold text-success uppercase tracking-widest">{s.trend}</span>
            </div>
            <p className="text-3xl font-financial text-white mb-1">{s.val}</p>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{s.label}</p>
          </CardPremium>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <Activity size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">System Event Stream</h3>
             </div>
             <SystemLiveFeed />
          </div>
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <Users size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">User Directory</h3>
             </div>
             <UserManagementPanel />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-2">
                <Cpu size={14} className="text-primary" />
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">System Configuration</h3>
             </div>
             <SystemSettingsPanel />
          </div>

          <CardPremium variant="standard" className="bg-primary/5 border-primary/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform pointer-events-none">
              <ShieldCheck size={80} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-4">
               <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck size={18} />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">System Integrity</h4>
               </div>
               <p className="text-xs text-white/40 leading-relaxed font-medium">
                  Platform-wide encryption is active across all user segments. All administrative actions are recorded in the immutable audit ledger.
               </p>
               <div className="flex items-center gap-2 pt-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(0,255,163,0.5)]" />
                  <span className="text-[9px] font-bold text-success uppercase tracking-widest">Environment Secure</span>
               </div>
            </div>
          </CardPremium>
        </div>
      </div>
    </div>
  );
};

export default ControlCenter;
