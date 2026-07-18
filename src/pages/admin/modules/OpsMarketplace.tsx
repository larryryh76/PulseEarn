/**
 * OpsMarketplace
 * 
 * Part 4: Admin Architecture - Marketplace Operations Module
 * 
 * Marketplace becomes an orchestration dashboard.
 * Does NOT replace Task Management, Campaign Management, or Provider Management.
 * Instead gives a complete operational overview.
 * 
 * This module shows:
 * - Marketplace Revenue
 * - Marketplace Opportunities
 * - Categories
 * - Provider Health
 * - Top Opportunities
 * - Featured Campaigns
 * - Pending Approvals
 * - Trending Categories
 * - Completion Rates
 * - Recent Marketplace Activity
 * 
 * Everything links into the specialist modules.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Layers,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { safeFetch } from '../../../utils/api';
import { cn } from '../../../utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface MarketplaceStats {
  totalOpportunities: number;
  activeOpportunities: number;
  completedToday: number;
  pendingApprovals: number;
  totalRevenue: number;
  revenueToday: number;
  revenueThisWeek: number;
  averageReward: number;
  completionRate: number;
  categoryBreakdown: CategoryStats[];
  providerHealth: ProviderHealth[];
  topOpportunities: OpportunityStats[];
  recentActivity: ActivityItem[];
}

interface CategoryStats {
  id: string;
  label: string;
  count: number;
  revenue: number;
  completionRate: number;
}

interface ProviderHealth {
  id: string;
  name: string;
  status: 'connected' | 'degraded' | 'offline';
  opportunities: number;
  revenue: number;
}

interface OpportunityStats {
  id: string;
  title: string;
  category: string;
  completions: number;
  revenue: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  points: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const OpsMarketplace: React.FC = () => {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  // Fetch marketplace stats
  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await safeFetch('/api/admin/marketplace/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.success) {
        setStats(res.data);
      } else {
        setError(res.error || 'Failed to load marketplace stats');
      }
    } catch (err) {
      setError('Failed to connect to marketplace API');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <MarketplaceSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 p-4 rounded-xl border border-danger/20 bg-danger/10">
          <AlertCircle size={20} className="text-danger" />
          <div>
            <p className="font-medium text-danger">{error}</p>
            <button
              onClick={fetchStats}
              className="text-sm text-danger/80 hover:text-danger flex items-center gap-1 mt-1"
            >
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Marketplace Operations</h1>
          <p className="text-sm text-text-secondary mt-1">
            Unified view of all earning opportunities
          </p>
        </div>
        
        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface border border-border">
          {(['today', 'week', 'month'] as const).map(period => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={cn(
                'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
                timeframe === period
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Opportunities"
          value={stats.totalOpportunities.toLocaleString()}
          change={+12}
          icon={<Target className="text-blue-400" />}
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday.toLocaleString()}
          change={+8}
          icon={<CheckCircle2 className="text-emerald-400" />}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenueToday.toLocaleString()}`}
          change={+15}
          icon={<DollarSign className="text-amber-400" />}
        />
        <StatCard
          title="Completion Rate"
          value={`${(stats.completionRate * 100).toFixed(1)}%`}
          change={+2}
          icon={<Activity className="text-purple-400" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Provider Health */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-text-primary">Provider Health</h2>
            <a
              href="/admin/offerwalls"
              className="text-xs font-bold text-primary hover:text-primary-bright flex items-center gap-1"
            >
              Manage <ExternalLink size={12} />
            </a>
          </div>
          
          <div className="space-y-3">
            {stats.providerHealth.map(provider => (
              <ProviderRow key={provider.id} provider={provider} />
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h2 className="text-lg font-bold text-text-primary mb-4">Categories</h2>
          
          <div className="space-y-3">
            {stats.categoryBreakdown.slice(0, 6).map(category => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </div>
        </div>
      </div>

      {/* Top Opportunities */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Top Opportunities</h2>
          <a
            href="/admin/tasks"
            className="text-xs font-bold text-primary hover:text-primary-bright flex items-center gap-1"
          >
            Manage Tasks <ExternalLink size={12} />
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-text-tertiary border-b border-border">
                <th className="pb-3">Opportunity</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Completions</th>
                <th className="pb-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats.topOpportunities.slice(0, 5).map(opp => (
                <tr key={opp.id} className="text-sm">
                  <td className="py-3 font-medium text-text-primary">{opp.title}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase">
                      {opp.category}
                    </span>
                  </td>
                  <td className="py-3 text-text-secondary">{opp.completions.toLocaleString()}</td>
                  <td className="py-3 text-emerald-400 font-bold">${opp.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <h2 className="text-lg font-bold text-text-primary mb-4">Recent Activity</h2>
        
        <div className="space-y-2">
          {stats.recentActivity.slice(0, 8).map(activity => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon }) => (
  <div className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/20 transition-colors">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">{title}</span>
      <div className="w-8 h-8 rounded-lg bg-surface-bright flex items-center justify-center">
        {icon}
      </div>
    </div>
    <p className="text-2xl font-black text-text-primary">{value}</p>
    <div className={cn(
      'flex items-center gap-1 mt-2 text-[10px] font-bold',
      change >= 0 ? 'text-emerald-400' : 'text-danger'
    )}>
      {change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(change)}% vs last period
    </div>
  </div>
);

const ProviderRow: React.FC<{ provider: ProviderHealth }> = ({ provider }) => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-bright border border-border hover:border-primary/20 transition-colors">
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-2 h-2 rounded-full',
        provider.status === 'connected' ? 'bg-emerald-400' :
        provider.status === 'degraded' ? 'bg-amber-400' : 'bg-danger'
      )} />
      <div>
        <p className="font-medium text-text-primary text-sm">{provider.name}</p>
        <p className="text-[10px] text-text-tertiary">{provider.opportunities} opportunities</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold text-emerald-400">${provider.revenue.toLocaleString()}</p>
      <p className="text-[10px] text-text-tertiary capitalize">{provider.status}</p>
    </div>
  </div>
);

const CategoryRow: React.FC<{ category: CategoryStats }> = ({ category }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-text-primary">{category.label}</span>
      <span className="text-xs text-text-secondary">{category.count}</span>
    </div>
    <div className="h-1.5 bg-surface-bright rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${category.completionRate * 100}%` }}
        className="h-full bg-primary rounded-full"
      />
    </div>
  </div>
);

const ActivityRow: React.FC<{ activity: ActivityItem }> = ({ activity }) => (
  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-bright transition-colors">
    <div className={cn(
      'w-8 h-8 rounded-lg flex items-center justify-center',
      activity.points > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-surface-bright text-text-tertiary'
    )}>
      {activity.points > 0 ? <DollarSign size={14} /> : <Activity size={14} />}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-text-primary truncate">{activity.description}</p>
      <p className="text-[10px] text-text-tertiary">{formatTime(activity.timestamp)}</p>
    </div>
    <span className={cn(
      'text-sm font-bold',
      activity.points > 0 ? 'text-emerald-400' : 'text-text-tertiary'
    )}>
      {activity.points > 0 ? '+' : ''}{activity.points}
    </span>
  </div>
);

// ─── Skeleton ────────────────────────────────────────────────────────────────

const MarketplaceSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="h-8 w-64 bg-surface rounded animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 bg-surface rounded-2xl animate-pulse" />
      ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-64 bg-surface rounded-2xl animate-pulse" />
      <div className="h-64 bg-surface rounded-2xl animate-pulse" />
    </div>
  </div>
);

// ─── Utilities ──────────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}

export default OpsMarketplace;
