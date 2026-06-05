import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import AdminOpsLayout from '../../components/layout/admin/AdminOpsLayout';
import {
  Users,
  ShieldAlert,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  Activity,
  ChevronRight
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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    pendingClaims: 0,
    totalCampaigns: 0,
    ecosystemPoints: 0
  });
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalStats();
  }, []);

  const modules = [
    { title: 'Intelligence', desc: 'Global metrics and infrastructure health.', icon: Terminal, path: '/admin/overview', color: 'text-primary' },
    { title: 'Campaigns', desc: 'Orchestrate strategic marketing initiatives.', icon: Layers, path: '/admin/campaigns', color: 'text-success' },
    { title: 'Validation', desc: 'Authorize operator proof-of-work.', icon: ShieldCheck, path: '/admin/validation', color: 'text-warning' },
    { title: 'Ledger', desc: 'Audit global economic injections.', icon: Activity, path: '/admin/ledger', color: 'text-accent' },
    { title: 'Operators', desc: 'Manage user registry and integrity.', icon: Users, path: '/admin/users', color: 'text-white' },
    { title: 'Security', desc: 'Monitor fraud and system anomalies.', icon: ShieldAlert, path: '/admin/security', color: 'text-danger' },
  ];

  return (
    <AdminOpsLayout>
      <div className="space-y-12 pb-24">
        <header>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Operations Center</h1>
          <p className="text-text-secondary text-sm font-medium">Strategic gateway to PulseEarn infrastructure and economic management.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
           {modules.map((mod) => (
             <div
               key={mod.title}
               onClick={() => navigate(mod.path)}
               className="group bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-white/5 border border-white/5 group-hover:scale-110 transition-transform", mod.color)}>
                   <mod.icon size={24} />
                </div>

                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-2">{mod.title}</h3>
                <p className="text-xs text-text-secondary font-medium leading-relaxed mb-6">{mod.desc}</p>

                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all group-hover:gap-3">
                   Initialize Module
                   <ChevronRight size={14} />
                </div>
             </div>
           ))}
        </div>

        <section className="bg-white/[0.01] border border-white/5 p-10 rounded-[3rem]">
           <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
                 <Cpu size={18} className="text-primary" />
                 System Pulse
              </h2>
              <span className="px-3 py-1 rounded-full bg-success/10 text-success text-[8px] font-bold uppercase tracking-widest border border-success/20">
                {loading ? 'Synchronizing...' : 'All Systems Nominal'}
              </span>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Total Supply</p>
                 <p className="text-xl font-mono font-bold">{stats.ecosystemPoints.toLocaleString()}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Active Ops</p>
                 <p className="text-xl font-mono font-bold">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Pending Validations</p>
                 <p className="text-xl font-mono font-bold text-warning">{stats.pendingClaims}</p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Active Campaigns</p>
                 <p className="text-xl font-mono font-bold">{stats.totalCampaigns}</p>
              </div>
           </div>
        </section>
      </div>
    </AdminOpsLayout>
  );
};

export default AdminDashboard;
