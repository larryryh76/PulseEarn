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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const usersCount = await getCountFromServer(collection(db, 'users'));

        const campaignsCount = await getCountFromServer(query(collection(db, 'campaigns'), where('active', '==', true)));

        const claimsCount = await getCountFromServer(query(collection(db, 'task_claims'), where('validationState', '==', 'PENDING')));

        const withdrawalsCount = await getCountFromServer(query(collection(db, 'system_claims'), where('type', '==', 'withdrawal_debit'), where('adminStatus', '==', 'PENDING')));

        setStats({
          totalUsers: usersCount.data()?.count || 0,
          activeCampaigns: campaignsCount.data()?.count || 0,
          pendingValidations: claimsCount.data()?.count || 0,
          fraudAlerts: 0,
          pendingWithdrawals: withdrawalsCount.data()?.count || 0,
          transactionVolume: 0
        });
        setError(null);
      } catch (err) {
        console.error("Overview stats fetch failed:", err);
        setError("Failed to fetch operational metrics.");
        // Set stats to 0 to prevent toLocaleString crashes if partial data failed
        setStats({
          totalUsers: 0,
          activeCampaigns: 0,
          pendingValidations: 0,
          fraudAlerts: 0,
          pendingWithdrawals: 0,
          transactionVolume: 0
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const metricCards = [
    { label: 'Total Users', val: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Active Campaigns', val: stats.activeCampaigns, icon: Target, color: 'text-success' },
    { label: 'Pending Reviews', val: stats.pendingValidations, icon: ShieldCheck, color: 'text-warning' },
    { label: 'Fraud Alerts', val: stats.fraudAlerts, icon: ShieldAlert, color: 'text-danger' },
    { label: 'Withdrawal Queue', val: stats.pendingWithdrawals, icon: Wallet, color: 'text-accent' },
    { label: 'System Status', val: 'Operational', icon: Activity, color: 'text-white/40' },
  ];

  return (
    <div className="space-y-12 pb-24">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">System Overview</h1>
        <p className="text-text-secondary text-sm font-medium">Real-time platform performance and operational metrics.</p>
      </header>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs font-bold uppercase tracking-widest flex items-center gap-3">
          <ShieldAlert size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map(card => (
          <div key={card.label} className={cn(
            "bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] group hover:border-primary/20 transition-all",
            loading && "animate-pulse"
          )}>
            <div className={cn("p-2.5 rounded-xl bg-white/5 w-fit mb-4 group-hover:scale-110 transition-transform", card.color)}>
              <card.icon size={20} />
            </div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1 truncate">{card.label}</p>
            <p className="text-xl sm:text-2xl font-mono font-bold truncate">
              {loading ? '---' : typeof card.val === 'number' ? (card.val || 0).toLocaleString() : (card.val || '---')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminOverview;
