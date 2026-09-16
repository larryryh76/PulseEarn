import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, RefreshCcw, Wrench, Layers, Plus, Info, Activity as ActivityIcon,
} from 'lucide-react';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import {
  gbp, gbpHour, timeAgo, remainingFrom, nowMs, campaignStatusView, cycleStateView,
  purchaseStatusView, Chip, PageHeader, Stat, PSEEmpty, PSEError, PSELoading, CampaignBanner,
  ACTIVITY_ICONS, shortHash,
} from '../../components/psemine/pse';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import { usePSEMine } from '../../contexts/PSEMineContext';

export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool } = usePSEMine();
  const availableStr = useAvailableGBP();

  const [maintaining, setMaintaining] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // Re-render every 30s for relative times + cycle countdowns (server-anchored).
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const tools = state?.tools ?? [];
  const user = state?.user;

  const toolsNeedingMaintenance = useMemo(
    () => tools.filter(t => t.maintenanceRequired === true || t.cycleState === 'maintenance_required' || t.cycleState === 'cycle_complete'),
    [tools],
  );

  const handleMaintain = async (ownershipId: string) => {
    setMaintaining(prev => new Set(prev).add(ownershipId));
    try { await maintainTool(ownershipId); } finally { await refresh(); 
      setMaintaining(prev => { const n = new Set(prev); n.delete(ownershipId); return n; }); }
  };

  if (loading) return <PSELoading label="Loading your mining state" />;
  if (error || !state || !user) {
    return (
      <div className="pse-section py-10">
        <PSEError
          message={error || 'Your mining state could not be loaded.'}
          onRetry={() => void refresh()}
          retrying={refreshing}
        />
      </div>
    );
  }

  const isMiningLive = campaignStatus === 'active';

  return (
    <div className="pse-section space-y-4 pb-24 pt-6 md:pt-8">
      <CampaignBanner status={campaignStatus} />

      <PageHeader
        eyebrow="Mining console"
        title="Operations overview"
        sub="Balances, capacity, and tool operations — computed by the backend, displayed here."
        right={
          <button onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm">
            <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* ═══ VERDICT ROW ═══ */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="pse-card p-6 md:col-span-1">
          <p className="pse-eyebrow">Accrued campaign earnings</p>
          <p className="pse-num mt-2 text-[34px] font-semibold leading-none md:text-[40px]">{gbp(user.accruedGBP)}</p>
          <p className="pse-micro mt-2.5">
            Not currently withdrawable — settles after the campaign ends.
          </p>
          {state.checkpoint && typeof state.checkpoint.earnedMinor === 'number' && state.checkpoint.earnedMinor > 0 && (
            <p className="pse-micro mt-1" style={{ color: 'var(--pse-success)' }}>
              +{gbp(state.checkpoint.earnedMinor / 100)} settled at this checkpoint
            </p>
          )}
        </div>
        <Stat
          label="Mining capacity"
          value={gbpHour(user.totalCapacityGBPPerHour)}
          sub={`Tools ${gbpHour(user.toolCapacityGBPPerHour)} + Referrals ${gbpHour(user.referralCapacityGBPPerHour)}`}
          accent="var(--pse-cyan)"
        />
        <Stat
          label="Payout wallet"
          value={user.payoutWallet ? `${user.payoutWallet.slice(0, 6)}…${user.payoutWallet.slice(-4)}` : 'Not set'}
          sub={user.payoutWallet ? 'Receives settlement after the campaign' : 'Required before settlement'}
          accent={user.payoutWallet ? 'var(--pse-text)' : 'var(--pse-warning)'}
        />
      </div>

      {/* ═══ MAINTENANCE QUEUE (exception-first) ═══ */}
      {isMiningLive && toolsNeedingMaintenance.length > 0 && (
        <div className="pse-card p-5" style={{ borderColor: 'rgba(245,165,36,0.35)' }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'rgba(245,165,36,0.12)', border: '1px solid rgba(245,165,36,0.3)' }}>
                <Wrench size={16} style={{ color: 'var(--pse-warning)' }} />
              </div>
              <div>
                <p className="pse-h3">
                  {toolsNeedingMaintenance.length === 1
                    ? '1 tool needs maintenance'
                    : `${toolsNeedingMaintenance.length} tools need maintenance`}
                </p>
                <p className="pse-micro mt-0.5">
                  Their operating cycles completed. Maintenance is free and restarts accrual.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {toolsNeedingMaintenance.map(t => (
              <MaintenanceRow key={t.id} tool={t} busy={maintaining.has(t.id)} onMaintain={() => void handleMaintain(t.id)} />
            ))}
          </div>
        </div>
      )}

      {/* ═══ TOOL OPERATIONS ═══ */}
      <section className="pse-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
          <div>
            <p className="pse-h3">Tool operations</p>
            <p className="pse-micro mt-0.5">Live operating cycles — state derived by the backend.</p>
          </div>
          <Link to="/mine/tools" className="pse-btn pse-btn-secondary pse-btn-sm shrink-0">
            <Plus size={13} /> Add tools
          </Link>
        </div>

        {tools.length === 0 ? (
          <PSEEmpty
            icon={Layers}
            title="No mining tools yet"
            body="Purchase a tool from the marketplace to start building hourly capacity for this campaign."
            action={<Link to="/mine/tools" className="pse-btn pse-btn-primary pse-btn-sm">Browse tools</Link>}
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
            {tools.map(t => <ToolOpsRow key={t.id} tool={t} miningLive={isMiningLive} />)}
          </ul>
        )}
      </section>

      {/* ═══ SECONDARY GRIDS ═══ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Purchases in flight */}
        <RecentPurchases />

        {/* Campaign card */}
        <CampaignCard status={campaignStatus} />

        {/* Referrals snapshot */}
        <Link to="/mine/referrals" className="pse-card pse-card-hover p-5">
          <div className="flex items-center justify-between">
            <p className="pse-eyebrow">Referrals</p>
            <ArrowRight size={14} style={{ color: 'var(--pse-text-3)' }} />
          </div>
          <p className="pse-num mt-2 text-[26px] font-semibold">
            {user.qualifiedReferralsCount}<span className="text-[15px]" style={{ color: 'var(--pse-text-3)' }}> / 5 qualified</span>
          </p>
          <p className="pse-micro mt-1">Each qualified referral adds +£0.30/hour — currently +{gbpHour(user.referralCapacityGBPPerHour).replace('/hour', '/hr')}.</p>
        </Link>

        {/* Wallet snapshot */}
        <Link to="/mine/wallet" className="pse-card pse-card-hover p-5">
          <div className="flex items-center justify-between">
            <p className="pse-eyebrow">Wallet</p>
            <ArrowRight size={14} style={{ color: 'var(--pse-text-3)' }} />
          </div>
          <p className="pse-num mt-2 text-[26px] font-semibold">{availableStr}</p>
          <p className="pse-micro mt-1">Settlement-available balance · {user.connectedWallet ? 'viewing wallet connected' : 'no wallet connected'}</p>
        </Link>
      </div>

      {/* ═══ RECENT ACTIVITY ═══ */}
      <RecentActivity />
    </div>
  );
};

/* ── Tool operations row ─────────────────────────────────────── */
type OpsTool = {
  id: string; toolId?: string; toolName?: string; hourlyRateGBP?: number;
  status?: string; cycleIndex?: number; cycleState?: string;
  maintenanceRequired?: boolean; cycleEndsAt?: string | null;
};

function ToolOpsRow({ tool, miningLive }: { tool: OpsTool; miningLive: boolean }) {
  const cycle = cycleStateView(tool.cycleState || tool.status);
  const Icon = cycle.icon;
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const running = tool.cycleState === 'active' && miningLive;
  const remaining = running ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;

  const toolDef = tool.toolId ? LOCKED_PSEMINE_TOOLS[tool.toolId as keyof typeof LOCKED_PSEMINE_TOOLS] : null;
  const name = tool.toolName || toolDef?.name || 'Mining tool';

  return (
    <li className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
          <Icon size={17} style={{ color: cycle.live ? 'var(--pse-success)' : 'var(--pse-text-2)' }} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="pse-h3 truncate">{name}</p>
            <Chip label={cycle.label} chip={cycle.chip} pulse={cycle.live && miningLive} dot={!cycle.live} />
            {tool.cycleIndex !== undefined && (
              <span className="pse-micro">Cycle #{tool.cycleIndex + 1}</span>
            )}
          </div>
          <p className="pse-micro mt-1">
            {remaining
              ? remaining.text
              : cycle.live
                ? miningLive ? 'Operating' : 'Idle — campaign not active'
                : cycle.description}
            {' · '}
            <span className="pse-num">{gbpHour(tool.hourlyRateGBP ?? toolDef?.hourlyRateGBP ?? 0)}</span>
          </p>
        </div>
      </div>
    </li>
  );
}

function MaintenanceRow({ tool, busy, onMaintain }: {
  tool: { id: string; toolName?: string; toolId?: string; cycleEndsAt?: string | null };
  busy: boolean; onMaintain: () => void;
}) {
  const toolDef = tool.toolId ? LOCKED_PSEMINE_TOOLS[tool.toolId as keyof typeof LOCKED_PSEMINE_TOOLS] : null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
      <p className="pse-caption truncate">
        <span className="font-semibold" style={{ color: 'var(--pse-text)' }}>{tool.toolName || toolDef?.name || 'Mining tool'}</span>
        {' — cycle complete'}
      </p>
      <button onClick={onMaintain} disabled={busy} className="pse-btn pse-btn-primary pse-btn-sm shrink-0">
        <Wrench size={12} /> {busy ? 'Maintaining…' : 'Maintain tool'}
      </button>
    </div>
  );
}

/* ── Recent purchases (real purchase states) ────────────────────────── */
function RecentPurchases() {
  const { state } = usePseState();
  const { purchases } = usePSEMine();
  const recent = purchases.slice(0, 3);

  return (
    <div className="pse-card p-5">
      <div className="flex items-center justify-between">
        <p className="pse-eyebrow">Purchases</p>
        <Link to="/mine/activity" className="pse-micro hover:underline" style={{ color: 'var(--pse-blue)' }}>View all</Link>
      </div>
      {recent.length === 0 ? (
        <p className="pse-micro mt-4">No purchases yet. Your purchase history appears here with its verification state.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {recent.map(p => {
            const view = purchaseStatusView(p.status);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="pse-caption truncate font-medium" style={{ color: 'var(--pse-text)' }}>
                    {p.toolName || p.toolId} · {gbp(p.quotedGBPAmount)}
                  </p>
                  <p className="pse-micro">
                    {p.transactionHash ? shortHash(p.transactionHash) : 'No transaction yet'} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <Chip label={view.label} chip={view.chip} dot={false} />
              </li>
            );
          })}
        </ul>
      )}
      {state?.campaign?.purchaseEnabled === false && (
        <p className="pse-micro mt-4 flex items-center gap-1.5" style={{ color: 'var(--pse-warning)' }}>
          <Info size={12} /> Tool purchases are currently closed.
        </p>
      )}
    </div>
  );
}

/* ── Campaign card ──────────────────────────────────────────────────── */
function CampaignCard({ status }: { status: string | null }) {
  const { state } = usePseState();
  const view = campaignStatusView(status);
  const c = state?.campaign;
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const totalDays = c?.durationDays && c.durationDays > 0 ? c.durationDays : 90;
  const endMs = c?.endAt ? new Date(c.endAt).getTime() : NaN;
  const startMs = c?.startAt ? new Date(c.startAt).getTime() : NaN;
  const now = nowMs();
  const dayNumber = Number.isFinite(startMs)
    ? Math.min(totalDays, Math.max(1, Math.floor((now - startMs) / 86_400_000) + 1))
    : null;
  const daysLeft = Number.isFinite(endMs) ? Math.max(0, Math.ceil((endMs - now) / 86_400_000)) : null;
  const progress = dayNumber !== null ? Math.min(100, Math.max(0, (dayNumber / totalDays) * 100)) : 0;

  return (
    <div className="pse-card p-5">
      <div className="flex items-center justify-between">
        <p className="pse-eyebrow">Campaign</p>
        <Chip label={view.label} chip={view.chip} pulse={view.live} />
      </div>
      <p className="pse-h3 mt-2.5">{c?.name || 'PSEmine 90-day campaign'}</p>
      {view.live ? (
        <>
          <div className="pse-meter mt-4">
            <div className="pse-meter-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="pse-micro mt-2">
            {dayNumber !== null ? `Day ${dayNumber} of ${totalDays}` : 'In progress'}
            {daysLeft !== null ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining` : ''}
          </p>
        </>
      ) : (
        <p className="pse-micro mt-2">{view.detail}</p>
      )}
    </div>
  );
}

/* ── Recent activity ────────────────────────────────────────────────── */
function RecentActivity() {
  // D1: canonical backend activity — same source as /mine/activity.
  const { activities } = usePseState();
  const recent = activities.slice(0, 6);

  return (
    <section className="pse-card overflow-hidden">
      <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
        <p className="pse-h3">Recent activity</p>
        <Link to="/mine/activity" className="pse-micro hover:underline" style={{ color: 'var(--pse-blue)' }}>Full ledger</Link>
      </div>
      {recent.length === 0 ? (
        <PSEEmpty icon={ActivityIcon} title="No activity yet" body="Tool purchases, maintenance events, and referrals will appear here." />
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          {recent.map(a => {
            const Icon = ACTIVITY_ICONS[(a.type || '').toLowerCase()] || ActivityIcon;
            const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
            const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
            const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
            return (
              <li key={a.id} className="flex items-center gap-3.5 px-5 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
                  <Icon size={14} style={{ color: 'var(--pse-text-2)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="pse-caption truncate font-medium" style={{ color: 'var(--pse-text)' }}>{a.title}</p>
                  {a.description && <p className="pse-micro truncate">{a.description}</p>}
                </div>
                <div className="shrink-0 text-right">
                  {displayAmount !== null && displayAmount !== 0 && (
                    <p className="pse-num pse-caption font-semibold">{gbp(displayAmount)}</p>
                  )}
                  <p className="pse-micro">{timeAgo(a.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default PSEMineDashboard;
