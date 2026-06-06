import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import AdminOpsLayout from '../../components/layout/admin/AdminOpsLayout';
import {
  Users,
  ShieldAlert,
  Cpu,
  Layers,
  ShieldCheck,
  Activity,
  ChevronRight,
  Database,
  BarChart3,
  Server,
  Key,
  Clock
} from 'lucide-react';
import { cn } from '../../utils';
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  limit
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import Card from '../../components/ui/Card';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    pendingClaims: 0,
    totalCampaigns: 0,
    ecosystemPoints: 0
  });
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const usersCount = await getCountFromServer(collection(db, 'users'));
        const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('active', '==', true)));
        const claimsSnap = await getCountFromServer(query(collection(db, 'task_claims'), where('validationState', '==', 'PENDING')));
        const campaignSnap = await getCountFromServer(collection(db, 'campaigns'));

        const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
        const totalPoints = usersSnap.docs.reduce((acc, doc) => acc + (doc.data().points || 0), 0);

        setStats({
          totalUsers: usersCount.data().count,
          activeTasks: tasksSnap.size,
          pendingClaims: claimsSnap.data().count,
          totalCampaigns: campaignSnap.data().count,
          ecosystemPoints: totalPoints
        });
      } catch (err) {
        console.error("Stats aggregation error:", err);
      }
    };

    fetchGlobalStats();
  }, []);

  const modules = [
    { title: 'Intelligence', desc: 'Global metrics and infrastructure health monitoring.', icon: BarChart3, path: '/admin/overview', color: 'text-primary' },
    { title: 'Campaigns', desc: 'Orchestrate strategic reward initiatives.', icon: Layers, path: '/admin/campaigns', color: 'text-success' },
    { title: 'Validation', desc: 'Authorize user proof-of-work submissions.', icon: ShieldCheck, path: '/admin/validation', color: 'text-warning' },
    { title: 'Ledger', desc: 'Audit global economic injections and debits.', icon: Database, path: '/admin/ledger', color: 'text-accent' },
    { title: 'Users', desc: 'Manage user registry, roles and integrity.', icon: Users, path: '/admin/users', color: 'text-white' },
    { title: 'Fraud Center', desc: 'Monitor anomalies and multi-vector threats.', icon: ShieldAlert, path: '/admin/security', color: 'text-danger' },
  ];

  return (
    <AdminOpsLayout>
      <div className="space-y-16 pb-32">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Administrative Shell v5.2.0</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Operations <span className="text-text-tertiary">Hub</span></h1>
          </div>

          <div className="flex items-center gap-4 bg-surface-bright/50 border border-border p-2 rounded-2xl">
             <div className="flex items-center gap-3 px-4 py-2 border-r border-border">
                <Server size={14} className="text-success" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Master Node: Active</span>
             </div>
             <div className="flex items-center gap-3 px-4 py-2">
                <Key size={14} className="text-primary" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Admin Authorization: High</span>
             </div>
          </div>
        </header>

        {/* CORE ANALYTICS STRIP */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { label: 'Ecosystem Supply', value: stats.ecosystemPoints.toLocaleString(), unit: 'PTS', icon: Activity },
             { label: 'Verified Users', value: stats.totalUsers.toLocaleString(), unit: 'NODES', icon: Users },
             { label: 'Active Campaigns', value: stats.totalCampaigns.toLocaleString(), unit: 'LIVE', icon: Layers },
             { label: 'Pending Audit', value: stats.pendingClaims.toLocaleString(), unit: 'QUEUE', icon: Clock, warning: stats.pendingClaims > 0 },
           ].map((item, i) => (
             <Card key={i} variant="compact" className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                   <p className="data-label">{item.label}</p>
                   <item.icon size={16} className={cn("text-text-tertiary", item.warning && "text-warning animate-pulse")} />
                </div>
                <div>
                   <p className={cn("text-3xl font-bold tracking-tighter text-white", item.warning && "text-warning")}>{item.value}</p>
                   <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1">{item.unit}</p>
                </div>
             </Card>
           ))}
        </section>

        {/* MODULAR ENTRY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
           {modules.map((mod) => (
             <Card
               key={mod.title}
               onClick={() => navigate(mod.path)}
               className="group p-10 rounded-[2.5rem] bg-surface-bright/20 hover:bg-surface-bright/50 transition-all border-white/5 relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.02] blur-3xl rounded-full" />

                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-10 bg-background/60 border border-white/5 transition-all group-hover:scale-110 group-hover:border-primary/20", mod.color)}>
                   <mod.icon size={28} />
                </div>

                <div className="space-y-4">
                   <h3 className="text-base font-bold text-white uppercase tracking-[0.15em] leading-none">{mod.title}</h3>
                   <p className="text-[13px] text-text-tertiary font-medium leading-relaxed mb-6 h-10 line-clamp-2">{mod.desc}</p>
                </div>

                <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                   <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all">Initialize Access</span>
                   <div className="w-10 h-10 rounded-xl bg-background/60 border border-white/5 flex items-center justify-center text-text-tertiary group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                      <ChevronRight size={18} />
                   </div>
                </div>
             </Card>
           ))}
        </div>

        {/* SYSTEM STATUS ARCHITECTURE */}
        <Card className="bg-surface/30 border-dashed border-border py-12 px-10 flex flex-col lg:flex-row items-center justify-between gap-12">
           <div className="flex items-center gap-8 text-center lg:text-left">
              <div className="w-20 h-20 rounded-[2rem] bg-primary/5 flex items-center justify-center border border-primary/10 shadow-premium">
                 <Cpu className="text-primary" size={32} />
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-bold tracking-tight text-white">System Heartbeat</h2>
                 <p className="text-sm text-text-tertiary font-medium">Monitoring global distribution latency and database consistency.</p>
              </div>
           </div>

           <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { label: 'API LATENCY', value: '42ms', status: 'optimal' },
                { label: 'DB UPTIME', value: '99.99%', status: 'optimal' },
                { label: 'AUTH SYNC', value: 'NOMINAL', status: 'optimal' },
              ].map((s, i) => (
                <div key={i} className="px-6 py-3 rounded-xl bg-background/40 border border-white/5 space-y-1">
                   <p className="text-[8px] font-bold text-text-tertiary uppercase tracking-widest">{s.label}</p>
                   <p className="text-sm font-mono font-bold text-success">{s.value}</p>
                </div>
              ))}
           </div>
        </Card>
      </div>
    </AdminOpsLayout>
  );
};

export default AdminDashboard;
