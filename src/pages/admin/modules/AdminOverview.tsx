import * as React from "react";
import {
  Users,
  Target,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Activity
} from 'lucide-react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';

const AdminOverview = () => {
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    activeCampaigns: 0,
    pendingValidations: 0,
    fraudAlerts: 0,
    pendingWithdrawals: 0,
    transactionVolume: 0
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersCount = await getCountFromServer(collection(db, 'users'));
        const campaignsCount = await getCountFromServer(query(collection(db, 'tasks'), where('active', '==', true)));
        const claimsCount = await getCountFromServer(query(collection(db, 'task_claims'), where('validationState', '==', 'PENDING')));
        const withdrawalsCount = await getCountFromServer(query(collection(db, 'system_claims'), where('type', '==', 'withdrawal_debit'), where('adminStatus', '==', 'PENDING')));

        setStats({
          totalUsers: usersCount.data().count,
          activeCampaigns: campaignsCount.data().count,
          pendingValidations: claimsCount.data().count,
          fraudAlerts: 0,
          pendingWithdrawals: withdrawalsCount.data().count,
          transactionVolume: 0
        });
      } catch (err) {
        console.error("Overview stats fetch failed:", err);
      }
    };
    fetchStats();
  }, []);

  const metricCards = [
    { label: 'Active Users', val: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Active Campaigns', val: stats.activeCampaigns, icon: Target, color: 'text-success' },
    { label: 'Pending Reviews', val: stats.pendingValidations, icon: ShieldCheck, color: 'text-warning' },
    { label: 'Security Alerts', val: stats.fraudAlerts, icon: ShieldAlert, color: 'text-danger' },
    { label: 'Payout Queue', val: stats.pendingWithdrawals, icon: Wallet, color: 'text-accent' },
    { label: 'System Pulse', val: 'Operational', icon: Activity, color: 'text-white/40' },
  ];

  return (
    <div className="space-y-12 pb-24">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Operations Overview</h1>
        <p className="text-text-secondary text-sm font-medium">Global infrastructure health and user velocity metrics.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map(card => (
          <div key={card.label} className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] group hover:border-primary/20 transition-all">
            <div className={cn("p-2.5 rounded-xl bg-white/5 w-fit mb-4 group-hover:scale-110 transition-transform", card.color)}>
              <card.icon size={20} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">{card.label}</p>
            <p className="text-2xl font-mono font-bold">{card.val.toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
