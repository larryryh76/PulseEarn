import * as React from 'react';
import {
  Globe,
  Plus,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  BarChart3,
  Settings,
  List,
  ChevronDown,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { safeFetch } from '../../../utils/api';
import ProviderManagerModal from './modals/ProviderManagerModal';
import toast from 'react-hot-toast';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helper Components ────────────────────────────────────────────────────────

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const color =
    status === 'connected' || status === 'ok' ? 'bg-success shadow-[0_0_6px_rgba(16,185,129,0.5)]'
    : status === 'degraded' || status === 'unknown' ? 'bg-warning shadow-[0_0_6px_rgba(245,158,11,0.4)]'
    : 'bg-danger shadow-[0_0_6px_rgba(239,68,68,0.4)]';
  return <span className={cn('inline-block w-2 h-2 rounded-full', color)} />;
};

const StatChip: React.FC<{ label: string; value: React.ReactNode; variant?: 'default' | 'success' | 'danger' | 'warning' }> = ({ label, value, variant = 'default' }) => {
  const colors = {
    default: 'bg-surface-bright border-border text-text-primary',
    success: 'bg-success/5 border-success/15 text-success',
    danger: 'bg-danger/5 border-danger/15 text-danger',
    warning: 'bg-warning/5 border-warning/15 text-warning',
  };
  return (
    <div className={cn('flex flex-col gap-1 p-3 rounded-xl border', colors[variant])}>
      <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
    </div>
  );
};

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }> = ({ icon, title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 mb-5">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-bold text-text-primary tracking-tight">{title}</h3>
        {subtitle && <p className="text-[11px] text-text-tertiary mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const TabButton: React.FC<{ label: string; icon: React.ReactNode; active: boolean; onClick: () => void; badge?: number }> = ({ label, icon, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap',
      active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-tertiary hover:text-text-primary hover:bg-surface-bright'
    )}
  >
    {icon}
    {label}
    {badge !== undefined && badge > 0 && (
      <span className={cn('px-1.5 py-0.5 rounded-md text-[9px] font-bold', active ? 'bg-white/20 text-white' : 'bg-danger/10 text-danger border border-danger/20')}>
        {badge}
      </span>
    )}
  </button>
);

// ─── Operational Status Badge (9 backend-derived states) ──────────────────────
const SEVERITY_STYLE: Record<string, string> = {
  ok: 'bg-success/8 border-success/20 text-success',
  warning: 'bg-warning/8 border-warning/20 text-warning',
  error: 'bg-danger/8 border-danger/20 text-danger',
  neutral: 'bg-surface-bright border-border text-text-tertiary',
};
const OperationalBadge: React.FC<{ health?: any }> = ({ health }) => {
  const h = health || { label: 'Unknown', severity: 'neutral' };
  return (
    <span
      title={h.reason || ''}
      className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border', SEVERITY_STYLE[h.severity] || SEVERITY_STYLE.neutral)}
    >
      {h.label}
    </span>
  );
};

// ─── Provider Status Card ─────────────────────────────────────────────────────
const ProviderStatusCard: React.FC<{
  provider: any;
  currentUser: any;
  onEdit: () => void;
  onChanged: () => void;
}> = ({ provider, currentUser, onEdit, onChanged }) => {
  const [expanded, setExpanded] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [diagnostics, setDiagnostics] = React.useState<any>(null);
  const stats = provider.stats || {};

  const runTest = async () => {
    setTesting(true);
    setDiagnostics(null);
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await safeFetch(`/api/offerwall/providers/${provider.id}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      setDiagnostics(res);
      if (res.code === 'OK') toast.success('Connection test passed');
      else toast.error(res.message || res.code || 'Test failed');
      onChanged();
    } catch {
      toast.error('Test request failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="border border-border bg-surface rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-bright transition-all" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
            <Globe size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-bold text-text-primary">{provider.name || provider.id}</span>
              <OperationalBadge health={provider.health} />
              {provider.specLabel && (
                <span className="text-[9px] font-medium text-text-tertiary px-1.5 py-0.5 rounded bg-surface-bright border border-border">
                  {provider.sigMethod || provider.specLabel}
                </span>
              )}
            </div>
            {provider.health?.reason && (
              <p className="text-[10px] text-text-tertiary mt-1 max-w-md">{provider.health.reason}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-success tabular-nums">+{(stats.lifetimeRevenue || 0).toLocaleString()}</p>
            <p className="text-[9px] text-text-tertiary uppercase tracking-wide">Lifetime PTS</p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); runTest(); }}
            disabled={testing}
            className="px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-primary text-[9px] font-bold uppercase tracking-widest hover:bg-primary/10 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {testing ? <div className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" /> : <Activity size={12} />}
            Test
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-lg border border-border text-text-tertiary hover:bg-surface-bright hover:text-primary transition-all"
          >
            <Settings size={14} />
          </button>
          {expanded ? <ChevronDown size={16} className="text-text-tertiary" /> : <ChevronRight size={16} className="text-text-tertiary" />}
        </div>
      </div>

      {/* Diagnostics panel (from Test Connection) */}
      <AnimatePresence>
        {diagnostics && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                {diagnostics.code === 'OK' ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
                <span className={cn('text-[11px] font-bold', diagnostics.code === 'OK' ? 'text-success' : 'text-danger')}>
                  {diagnostics.code}: {diagnostics.message}
                </span>
              </div>
              <div className="space-y-1.5">
                {(diagnostics.checks || []).map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[10px]">
                    {c.ok ? <CheckCircle2 size={12} className="text-success mt-0.5 shrink-0" /> : <XCircle size={12} className="text-danger mt-0.5 shrink-0" />}
                    <span className="font-semibold text-text-primary">{c.name}:</span>
                    <span className="text-text-tertiary">{c.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded stats */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-4 space-y-4">
              {/* Status row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-bright border border-border space-y-1">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Last Success</p>
                  <p className="text-[11px] font-medium text-text-primary">
                    {stats.lastSuccessfulSync
                      ? new Date(stats.lastSuccessfulSync?.seconds * 1000).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-bright border border-border space-y-1">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Last Failed</p>
                  <p className="text-[11px] font-medium text-text-primary">
                    {stats.lastFailedSync
                      ? new Date(stats.lastFailedSync?.seconds * 1000).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-surface-bright border border-border space-y-1">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Pending CB</p>
                  <p className="text-sm font-bold text-warning tabular-nums">{stats.pendingCallbacks || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface-bright border border-border space-y-1">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Failed CB</p>
                  <p className="text-sm font-bold text-danger tabular-nums">{stats.failedCallbacks || 0}</p>
                </div>
              </div>

              {/* Reward counters */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <StatChip label="Pending" value={stats.pendingRewards || 0} variant="warning" />
                <StatChip label="Approved" value={stats.approvedRewards || 0} variant="success" />
                <StatChip label="Rejected" value={stats.rejectedRewards || 0} variant="danger" />
                <StatChip label="Duplicates" value={stats.duplicateCallbackAttempts || 0} />
                <StatChip label="Fraud" value={stats.fraudAlerts || 0} variant="danger" />
                <StatChip label="Today PTS" value={`+${(stats.revenueToday || 0).toLocaleString()}`} variant="success" />
              </div>

              {/* Revenue row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-success/5 border border-success/15 text-center">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">This Week</p>
                  <p className="text-sm font-bold text-success tabular-nums">+{(stats.revenueThisWeek || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-success/5 border border-success/15 text-center">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">This Month</p>
                  <p className="text-sm font-bold text-success tabular-nums">+{(stats.revenueThisMonth || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                  <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Lifetime</p>
                  <p className="text-sm font-bold text-primary tabular-nums">+{(stats.lifetimeRevenue || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Withdrawal forecasting */}
              <div className="p-4 rounded-xl border border-border bg-surface-bright space-y-3">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Withdrawal Forecast</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[9px] text-text-tertiary">Provider Balance</p>
                    <p className="text-sm font-bold text-text-primary tabular-nums">{(stats.currentProviderBalance || 0).toLocaleString()} PTS</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">Min Payout</p>
                    <p className="text-sm font-bold text-text-primary tabular-nums">{(stats.minimumPayout || 0).toLocaleString()} PTS</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">Remaining</p>
                    <p className="text-sm font-bold text-warning tabular-nums">{(stats.remainingUntilPayout || 0).toLocaleString()} PTS</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">Est. Payout</p>
                    <p className="text-sm font-bold text-text-primary">
                      {stats.estimatedPayoutDate ? new Date(stats.estimatedPayoutDate?.seconds * 1000).toLocaleDateString() : 'TBD'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">Expected Revenue</p>
                    <p className="text-sm font-bold text-success tabular-nums">{(stats.expectedPlatformRevenue || 0).toLocaleString()} PTS</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">User Liability</p>
                    <p className="text-sm font-bold text-danger tabular-nums">{(stats.outstandingUserLiability || 0).toLocaleString()} PTS</p>
                  </div>
                </div>
              </div>

              {/* Callback URL */}
              <CallbackUrlDisplay providerId={provider.id} callbackUrl={provider.callbackUrl} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Callback URL copy helper
const CallbackUrlDisplay: React.FC<{ providerId: string; callbackUrl?: string }> = ({ providerId, callbackUrl }) => {
  const [copied, setCopied] = React.useState(false);
  const url = callbackUrl || `${window.location.origin}/api/offerwall/callback/${providerId}`;

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-bright border border-border">
      <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest shrink-0">Callback URL</span>
      <span className="flex-1 text-[10px] font-mono text-text-secondary truncate">{url}</span>
      <button onClick={copy} className="p-1.5 rounded-lg hover:bg-surface-accent text-text-tertiary hover:text-primary transition-all">
        {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
      </button>
    </div>
  );
};

// ─── Analytics Tab ────────────────────────────────────────────────────────────
const AnalyticsTab: React.FC<{ analytics: any }> = ({ analytics }) => {
  if (!analytics) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  const { summary = {}, providers = [] } = analytics;

  return (
    <div className="space-y-6">
      {/* Summary grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gross Revenue', value: `${(summary.grossRevenue || 0).toLocaleString()} PTS`, variant: 'success' as const },
          { label: 'User Rewards', value: `${(summary.userRewards || 0).toLocaleString()} PTS`, variant: 'default' as const },
          { label: 'Platform Revenue', value: `${(summary.platformRevenue || 0).toLocaleString()} PTS`, variant: 'success' as const },
          { label: 'Pending Liabilities', value: `${(summary.pendingLiabilities || 0).toLocaleString()} PTS`, variant: 'warning' as const },
        ].map(s => <StatChip key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Today', value: `${(summary.revenueToday || 0).toLocaleString()} PTS` },
          { label: 'This Week', value: `${(summary.revenueThisWeek || 0).toLocaleString()} PTS` },
          { label: 'This Month', value: `${(summary.revenueThisMonth || 0).toLocaleString()} PTS` },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-surface text-center space-y-1">
            <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">{s.label}</p>
            <p className="text-base font-bold text-text-primary tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Rate metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-success/15 bg-success/5 text-center space-y-1">
          <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Conversion</p>
          <p className="text-xl font-bold text-success tabular-nums">{summary.conversionRate || 0}%</p>
        </div>
        <div className="p-4 rounded-xl border border-warning/15 bg-warning/5 text-center space-y-1">
          <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Rejection</p>
          <p className="text-xl font-bold text-warning tabular-nums">{summary.rejectionRate || 0}%</p>
        </div>
        <div className="p-4 rounded-xl border border-danger/15 bg-danger/5 text-center space-y-1">
          <p className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold">Fraud</p>
          <p className="text-xl font-bold text-danger tabular-nums">{summary.fraudRate || 0}%</p>
        </div>
      </div>

      {/* Provider comparison table */}
      {providers.length > 0 && (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Provider Comparison</p>
          </div>
          <div className="divide-y divide-border">
            {[...providers].sort((a, b) => b.lifetimeRevenue - a.lifetimeRevenue).map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <StatusDot status={p.connectionStatus || 'offline'} />
                  <span className="text-[12px] font-semibold text-text-primary">{p.name}</span>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-[9px] text-text-tertiary">Today</p>
                    <p className="text-[11px] font-bold text-success tabular-nums">+{(p.revenueToday || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">Month</p>
                    <p className="text-[11px] font-bold text-success tabular-nums">+{(p.revenueThisMonth || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">Lifetime</p>
                    <p className="text-[11px] font-bold text-primary tabular-nums">+{(p.lifetimeRevenue || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-text-tertiary">Fraud</p>
                    <p className="text-[11px] font-bold text-danger tabular-nums">{p.fraudAlerts || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Callback Log Tab ─────────────────────────────────────────────────────────
const CallbackLogTab: React.FC<{ callbacks: any[]; loading: boolean }> = ({ callbacks, loading }) => {
  const statusColors: Record<string, string> = {
    REWARD_ISSUED: 'text-success bg-success/8 border-success/15',
    PENDING: 'text-warning bg-warning/8 border-warning/15',
    DUPLICATE: 'text-text-tertiary bg-surface-bright border-border',
    INVALID_SIGNATURE: 'text-danger bg-danger/8 border-danger/15',
    FRAUD_BLOCKED: 'text-danger bg-danger/8 border-danger/15',
    REWARD_FAILED: 'text-danger bg-danger/8 border-danger/15',
    VALIDATED: 'text-primary bg-primary/8 border-primary/15',
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (callbacks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary">
        <List size={20} />
      </div>
      <p className="text-sm text-text-tertiary">No callbacks recorded yet</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-bright">
              {['Provider', 'User', 'Offer', 'Amount', 'Status', 'Sig', 'Time'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[9px] font-bold text-text-tertiary uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {callbacks.map(cb => (
              <tr key={cb.id} className="hover:bg-surface-bright transition-all">
                <td className="px-4 py-3 text-[11px] font-semibold text-text-primary">{cb.providerName || cb.providerId}</td>
                <td className="px-4 py-3 text-[10px] font-mono text-text-tertiary">{cb.userId?.slice(0, 8)}…</td>
                <td className="px-4 py-3 text-[11px] text-text-secondary max-w-[140px] truncate">{cb.offerName}</td>
                <td className="px-4 py-3 text-[11px] font-bold text-success tabular-nums">
                  {cb.status === 'REWARD_ISSUED' ? `+${(cb.userPoints || 0).toLocaleString()}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border', statusColors[cb.status] || 'text-text-tertiary bg-surface-bright border-border')}>
                    {cb.status?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {cb.signatureValid
                    ? <CheckCircle2 size={14} className="text-success" />
                    : <XCircle size={14} className="text-danger" />}
                </td>
                <td className="px-4 py-3 text-[10px] text-text-tertiary whitespace-nowrap">
                  {cb.receivedAt?.seconds ? new Date(cb.receivedAt.seconds * 1000).toLocaleTimeString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
type Tab = 'operations' | 'analytics' | 'config' | 'callbacks';

const OpsOfferwalls: React.FC = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = React.useState<Tab>('operations');
  const [providers, setProviders] = React.useState<any[]>([]);
  const [analytics, setAnalytics] = React.useState<any | null>(null);
  const [callbacks, setCallbacks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [callbacksLoading, setCallbacksLoading] = React.useState(false);
  const [analyticsLoading, setAnalyticsLoading] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedProviderId, setSelectedProviderId] = React.useState<string | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  // Single source of truth: load providers from the backend (Admin SDK).
  // Client-side Firestore reads are blocked by security rules, which is why
  // the list showed 0 while backend analytics saw providers.
  const loadProviders = React.useCallback(async () => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/providers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success && Array.isArray(res.providers)) {
        setProviders(res.providers);
      }
    } catch (err) {
      console.error('[OpsOfferwalls] Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const loadAnalytics = React.useCallback(async () => {
    if (!currentUser) return;
    setAnalyticsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) setAnalytics(res);
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [currentUser]);

  const loadCallbacks = React.useCallback(async () => {
    if (!currentUser) return;
    setCallbacksLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/callbacks?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) setCallbacks(res.callbacks || []);
    } catch (err) {
      toast.error('Failed to load callbacks');
    } finally {
      setCallbacksLoading(false);
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
    if (tab === 'callbacks') loadCallbacks();
  }, [tab, loadAnalytics, loadCallbacks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProviders();
    if (tab === 'analytics') await loadAnalytics();
    if (tab === 'callbacks') await loadCallbacks();
    setRefreshing(false);
    toast.success('Refreshed');
  };

  const [scanning, setScanning] = React.useState(false);
  const runFailoverScan = async () => {
    if (!currentUser) return;
    setScanning(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await safeFetch('/api/offerwall/failover/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) {
        if (res.count > 0) toast.error(`${res.count} unhealthy provider(s) auto-disabled`);
        else toast.success('All active providers healthy');
        await loadProviders();
      } else {
        toast.error('Failover scan failed');
      }
    } catch {
      toast.error('Failover scan request failed');
    } finally {
      setScanning(false);
    }
  };

  const totalFraud = providers.reduce((acc, p) => acc + (p.stats?.fraudAlerts || 0), 0);
  const totalRevenue = providers.reduce((acc, p) => acc + (p.stats?.lifetimeRevenue || 0), 0);
  const activeCount = providers.filter(p => p.enabled).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Layers size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Offerwall Operations Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Offerwall Platform</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-[10px] text-text-tertiary">{providers.length} providers</span>
            <span className="text-[10px] text-success">{activeCount} active</span>
            <span className="text-[10px] text-text-primary font-bold">{totalRevenue.toLocaleString()} PTS total</span>
            {totalFraud > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-danger font-bold">
                <AlertTriangle size={10} /> {totalFraud} fraud alerts
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-border text-text-tertiary hover:bg-surface-bright hover:text-text-primary transition-all"
          >
            <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} />
          </button>
          <button
            onClick={runFailoverScan}
            disabled={scanning}
            title="Scan providers and auto-disable any in an error state"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-warning/25 bg-warning/5 text-warning text-[11px] font-bold uppercase tracking-widest hover:bg-warning/10 transition-all disabled:opacity-50"
          >
            {scanning ? <div className="w-3.5 h-3.5 border border-warning/40 border-t-warning rounded-full animate-spin" /> : <AlertTriangle size={14} />}
            Failover Scan
          </button>
          <button
            onClick={() => { setSelectedProviderId(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-primary-bright transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={14} /> Add Provider
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <TabButton label="Operations" icon={<Activity size={13} />} active={tab === 'operations'} onClick={() => setTab('operations')} />
        <TabButton label="Analytics" icon={<BarChart3 size={13} />} active={tab === 'analytics'} onClick={() => setTab('analytics')} />
        <TabButton label="Config" icon={<Settings size={13} />} active={tab === 'config'} onClick={() => setTab('config')} badge={providers.filter(p => !p.secret).length} />
        <TabButton label="Callback Log" icon={<List size={13} />} active={tab === 'callbacks'} onClick={() => setTab('callbacks')} />
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'operations' && (
            <div className="space-y-4">
              <SectionHeader
                icon={<Activity size={16} />}
                title="Provider Status"
                subtitle="Real-time connection, API, and callback health for all providers"
              />
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : providers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 border border-dashed border-border rounded-2xl">
                  <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary">
                    <Globe size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-text-primary">No providers configured</p>
                    <p className="text-xs text-text-tertiary mt-1">Add your first offerwall provider to start earning.</p>
                  </div>
                  <button
                    onClick={() => { setSelectedProviderId(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-primary-bright transition-all"
                  >
                    <Plus size={13} /> Add Provider
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {providers.map(p => (
                    <ProviderStatusCard
                      key={p.id}
                      provider={p}
                      currentUser={currentUser}
                      onEdit={() => { setSelectedProviderId(p.id); setIsModalOpen(true); }}
                      onChanged={loadProviders}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'analytics' && (
            <div className="space-y-4">
              <SectionHeader
                icon={<BarChart3 size={16} />}
                title="Revenue Analytics"
                subtitle="Gross revenue, user rewards, platform profit, and conversion metrics"
                action={
                  <button onClick={loadAnalytics} disabled={analyticsLoading} className="p-2 rounded-xl border border-border text-text-tertiary hover:bg-surface-bright transition-all">
                    <RefreshCw size={13} className={cn(analyticsLoading && 'animate-spin')} />
                  </button>
                }
              />
              <AnalyticsTab analytics={analytics} />
            </div>
          )}

          {tab === 'config' && (
            <div className="space-y-4">
              <SectionHeader
                icon={<Settings size={16} />}
                title="Provider Configuration"
                subtitle="Edit affiliate IDs, API keys, secrets, reward multipliers, and fraud rules"
              />
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {providers.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProviderId(p.id); setIsModalOpen(true); }}
                      className="flex items-start justify-between p-4 rounded-xl border border-border bg-surface hover:bg-surface-bright hover:border-border-bright transition-all group text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-primary">
                          <Globe size={15} />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-bold text-text-primary group-hover:text-primary transition-colors">{p.name || p.id}</p>
                          <p className="text-[10px] text-text-tertiary font-mono">{p.id}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn('text-[9px] font-bold uppercase tracking-widest', p.enabled ? 'text-success' : 'text-danger')}>
                              {p.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                            <span className="text-text-tertiary/40">·</span>
                            <span className="text-[9px] text-text-tertiary">
                              {((p.userSharePct || 0) * 100).toFixed(0)}% user share
                            </span>
                          </div>
                        </div>
                      </div>
                      <Settings size={14} className="text-text-tertiary/40 group-hover:text-primary transition-colors mt-1 shrink-0" />
                    </button>
                  ))}
                  <button
                    onClick={() => { setSelectedProviderId(null); setIsModalOpen(true); }}
                    className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/[0.02] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                      <Plus size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-text-tertiary group-hover:text-primary transition-colors uppercase tracking-widest">Add Provider</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'callbacks' && (
            <div className="space-y-4">
              <SectionHeader
                icon={<List size={16} />}
                title="Callback Log"
                subtitle="Every provider callback — validated, duplicated, fraud-blocked, or rewarded"
                action={
                  <button onClick={loadCallbacks} disabled={callbacksLoading} className="p-2 rounded-xl border border-border text-text-tertiary hover:bg-surface-bright transition-all">
                    <RefreshCw size={13} className={cn(callbacksLoading && 'animate-spin')} />
                  </button>
                }
              />
              <CallbackLogTab callbacks={callbacks} loading={callbacksLoading} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <ProviderManagerModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); loadProviders(); }}
        providerId={selectedProviderId}
      />
    </div>
  );
};

export default OpsOfferwalls;
