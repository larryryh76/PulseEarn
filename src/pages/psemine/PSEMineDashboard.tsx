import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCcw, Wrench, Layers, ArrowRight, Activity as ActivityIcon, Info,
  Wallet, ShieldCheck, PlayCircle, Pause, AlertTriangle, Gauge, Landmark,
} from 'lucide-react';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import {
  gbp, gbpHour, gbpRate, timeAgo, remainingFrom, nowMs, toDateSafe, campaignStatusView,
  cycleStateView, purchaseStatusView, Chip, PageHeader, Verdict, Panel, DataRow, Meter,
  PSEEmpty, PSEError, PSELoading, FeedNotice, ActivityRow,
  ACTIVITY_ICONS, shortHash, CampaignBanner,
} from '../../components/psemine/pse';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import { usePSEMine } from '../../contexts/PSEMineContext';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';

/** Tool name resolution that never invents a tier. */
function toolName(tool: PseStateTool): string {
  if (tool.toolName) return tool.toolName;
  const def = tool.toolId ? LOCKED_PSEMINE_TOOLS[tool.toolId as keyof typeof LOCKED_PSEMINE_TOOLS] : null;
  return def?.name || 'Mining tool';
}
function toolRate(tool: PseStateTool): number {
  if (typeof tool.hourlyRateGBP === 'number') return tool.hourlyRateGBP;
  const def = tool.toolId ? LOCKED_PSEMINE_TOOLS[tool.toolId as keyof typeof LOCKED_PSEMINE_TOOLS] : null;
  return def?.hourlyRateGBP ?? 0;
}

export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool } = usePSEMine();
  const availableStr = useAvailableGBP();

  const [maintaining, setMaintaining] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // Re-render every 20s so relative times and cycle countdowns stay honest.
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const tools = useMemo(() => state?.tools ?? [], [state?.tools]);
  const user = state?.user;

  const needsMaintenance = useMemo(
    () => tools.filter(t => t.maintenanceRequired === true || t.cycleState === 'maintenance_required' || t.cycleState === 'cycle_complete'),
    [tools],
  );
  const activeTools = useMemo(() => tools.filter(t => t.cycleState === 'active'), [tools]);

  const handleMaintain = async (ownershipId: string) => {
    setMaintaining(prev => new Set(prev).add(ownershipId));
    try { await maintainTool(ownershipId); } finally {
      await refresh();
      setMaintaining(prev => { const n = new Set(prev); n.delete(ownershipId); return n; });
    }
  };

  if (loading) {
    return (
      <div className="pse-section pt-6 md:pt-8">
        <PSELoading skeleton label="Loading your mining state" />
      </div>
    );
  }

  if (error || !state || !user) {
    return (
      <div className="pse-section py-8">
        {error
          ? <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
          : <PSEError
              error={{
                kind: 'data', title: "We couldn't load your mining account", retryable: true,
                message: 'The mining backend returned an incomplete account. Please retry.',
              }}
              onRetry={() => void refresh()}
              retrying={refreshing}
            />}
      </div>
    );
  }

  const isMiningLive = campaignStatus === 'active';
  const referralCapacity = user.referralCapacityGBPPerHour ?? 0;
  const toolCapacity = user.toolCapacityGBPPerHour ?? 0;
  const totalCapacity = user.totalCapacityGBPPerHour ?? 0;
  const toolShare = totalCapacity > 0 ? (toolCapacity / totalCapacity) * 100 : 0;

  return (
    <div className="pse-section space-y-4 pb-24 pt-5 md:pt-7">
      <CampaignBanner status={campaignStatus} />

      <PageHeader
        eyebrow="Mining console"
        title="Campaign overview"
        sub="Balances, capacity and tool operations — computed by the backend, displayed here."
        right={
          <button onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm">
            <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing…' : 'Sync now'}
          </button>
        }
      />

      {/* ═══ 1–3 · EARNINGS · MINING STATUS · CAPACITY ═══ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Verdict
            label="Accrued campaign earnings"
            value={gbp(user.accruedGBP)}
            status={
              <Chip
                label={isMiningLive ? 'Accruing now' : campaignStatusView(campaignStatus).label}
                chip={isMiningLive ? 'pse-chip pse-chip-success' : campaignStatusView(campaignStatus).chip}
                pulse={isMiningLive}
              />
            }
            sub={
              isMiningLive
                ? `Accruing at ${gbpHour(totalCapacity)} from trained capacity. Settles after the campaign ends — accrued earnings are not withdrawable mid-campaign.`
                : 'Accrual is not running. Earnings settle after the campaign ends.'
            }
            footnote={state.checkpoint && typeof state.checkpoint.earnedMinor === 'number' && state.checkpoint.earnedMinor > 0 ? (
              <p className="pse-micro mt-1.5" style={{ color: 'var(--pse-success)' }}>
                +{gbp(state.checkpoint.earnedMinor / 100)} settled at this checkpoint
              </p>
            ) : null}
          >
            {/* Capacity composition — the reason the number moves */}
            <div className="mt-5 space-y-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="pse-micro">Capacity composition</span>
                <span className="pse-num pse-caption font-semibold">{gbpHour(totalCapacity)}</span>
              </div>
              <Meter value={toolShare} label="Tool share of total capacity" />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <span className="pse-micro flex items-center gap-1.5">
                  <span className="pse-dot" style={{ background: 'var(--pse-blue)' }} />
                  Tools <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(toolCapacity)}</span>
                </span>
                <span className="pse-micro flex items-center gap-1.5">
                  <span className="pse-dot" style={{ background: 'var(--pse-purple)' }} />
                  Referrals <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(referralCapacity)}</span>
                </span>
                <Link to="/mine/tools" className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
                  Add capacity →
                </Link>
              </div>
            </div>
          </Verdict>
        </div>

        <MiningStatusCard
          campaignStatus={campaignStatus}
          activeTools={activeTools.length}
          totalTools={tools.length}
          maintenanceDue={needsMaintenance.length}
        />
      </div>

      {/* ═══ 4 · MAINTENANCE QUEUE (exception-first) ═══ */}
      {isMiningLive && needsMaintenance.length > 0 && (
        <Panel
          tone="warning"
          title={needsMaintenance.length === 1 ? '1 tool needs attention' : `${needsMaintenance.length} tools need attention`}
          meta="Maintenance is free and restarts accrual for the next 24-hour cycle."
          action={<Chip label="Action required" chip="pse-chip pse-chip-warning" dot={false} />}
          bodyClassName="divide-y"
        >
          {needsMaintenance.map(t => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              style={{ borderColor: 'var(--pse-line)' }}>
              <div className="min-w-0">
                <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{toolName(t)}</p>
                <p className="pse-micro mt-0.5">
                  {cycleStateView(t.cycleState || t.status).description}
                  {' · '}
                  <span className="pse-num">{gbpRate(toolRate(t))}</span>
                </p>
              </div>
              <button onClick={() => void handleMaintain(t.id)} disabled={maintaining.has(t.id)}
                className="pse-btn pse-btn-primary pse-btn-sm shrink-0">
                <Wrench size={12} /> {maintaining.has(t.id) ? 'Maintaining…' : 'Run maintenance'}
              </button>
            </div>
          ))}
        </Panel>
      )}

      {/* ═══ 5 · CAMPAIGN TIMELINE ═══ */}
      <CampaignTimeline status={campaignStatus} campaign={state.campaign} />

      {/* ═══ 6–9 · OPERATIONS, REFERRALS, PAYOUT, PURCHASES ═══ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Tool operations"
            meta="Live operating cycles, derived by the backend."
            action={<Link to="/mine/tools" className="pse-btn pse-btn-secondary pse-btn-sm">Browse tools</Link>}
            bodyClassName={tools.length === 0 ? '' : 'divide-y'}
          >
            {tools.length === 0 ? (
              <PSEEmpty
                icon={Layers}
                title="No mining tools yet"
                body="Purchase a tool to start building hourly capacity for this campaign. Tools run 24-hour cycles and accrue their rate while active."
                action={<Link to="/mine/tools" className="pse-btn pse-btn-primary pse-btn-sm">Open the marketplace</Link>}
              />
            ) : (
              tools.map(t => <ToolOpsRow key={t.id} tool={t} miningLive={isMiningLive} />)
            )}
          </Panel>
        </div>

        <div className="space-y-3">
          {/* Payout state */}
          <Panel title="Payout state">
            <div className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
              <DataRow label="Settlement-available" value={availableStr} emphasis hint="Backend-reported figure only" />
              <DataRow
                label="Payout wallet"
                value={user.payoutWallet ? `${user.payoutWallet.slice(0, 6)}…${user.payoutWallet.slice(-4)}` : 'Not set'}
                mono={Boolean(user.payoutWallet)}
                hint={user.payoutWallet ? 'Receives settlement' : 'Required before settlement'}
                right={<Chip
                  label={user.payoutWallet ? 'Configured' : 'Required'}
                  chip={user.payoutWallet ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-warning'}
                  dot={false} />}
              />
            </div>
            <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
              <Link to="/mine/wallet" className="pse-caption inline-flex items-center gap-1.5 font-medium hover:underline"
                style={{ color: 'var(--pse-blue)' }}>
                <Wallet size={13} /> Wallet & payouts <ArrowRight size={12} />
              </Link>
            </div>
          </Panel>

          {/* Referrals snapshot */}
          <Panel
            title="Referral capacity"
            action={<Link to="/mine/referrals" className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>Manage</Link>}
          >
            <div className="px-5 py-4">
              <div className="flex items-baseline gap-2">
                <span className="pse-num text-[26px] font-semibold leading-none">{user.qualifiedReferralsCount ?? 0}</span>
                <span className="pse-caption" style={{ color: 'var(--pse-text-3)' }}>/ 5 qualified</span>
              </div>
              <Meter value={((user.qualifiedReferralsCount ?? 0) / 5) * 100} tone="purple" label="Referral slots used" />
              <p className="pse-micro mt-2.5">
                Each qualified referral adds +£0.30/hour. Currently contributing +{gbpHour(referralCapacity)}.
              </p>
            </div>
          </Panel>

          <RecentPurchases />
        </div>
      </div>

      {/* ═══ 10 · ACTIVITY ═══ */}
      <RecentActivity />
    </div>
  );
};

/* ── Mining status component (state comes from backend data only) ────── */
function MiningStatusCard({ campaignStatus, activeTools, totalTools, maintenanceDue }: {
  campaignStatus: string | null; activeTools: number; totalTools: number; maintenanceDue: number;
}) {
  const view = campaignStatusView(campaignStatus);

  const status = (() => {
    if (campaignStatus === 'active') {
      if (totalTools === 0) return { icon: Gauge, label: 'No capacity yet', tone: 'var(--pse-text-2)', body: 'No tools are operating. Purchase a tool to begin accruing.' };
      if (maintenanceDue > 0) return { icon: AlertTriangle, label: 'Mining partially interrupted', tone: 'var(--pse-warning)', body: `${maintenanceDue} tool${maintenanceDue === 1 ? '' : 's'} stopped accruing and need maintenance.` };
      if (activeTools > 0) return { icon: PlayCircle, label: 'Mining active', tone: 'var(--pse-success)', body: `${activeTools} tool${activeTools === 1 ? '' : 's'} operating and accruing on schedule.` };
      return { icon: Pause, label: 'Mining idle', tone: 'var(--pse-warning)', body: 'No tool is currently inside an active operating cycle.' };
    }
    if (campaignStatus === 'scheduled') return { icon: Gauge, label: 'Scheduled', tone: 'var(--pse-purple)', body: view.detail };
    if (campaignStatus === 'paused') return { icon: Pause, label: 'Mining paused', tone: 'var(--pse-warning)', body: view.detail };
    if (campaignStatus === 'settling') return { icon: Landmark, label: 'Campaign settling', tone: 'var(--pse-cyan)', body: view.detail };
    return { icon: ShieldCheck, label: view.label.trim(), tone: 'var(--pse-text-2)', body: view.detail };
  })();

  const Icon = status.icon;
  return (
    <Panel title="Mining status" meta="Derived from backend campaign and cycle state">
      <div className="px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-inset)' }}>
            <Icon size={17} style={{ color: status.tone }} />
          </span>
          <div>
            <p className="pse-h3" style={{ color: status.tone }}>{status.label}</p>
            <p className="pse-micro mt-0.5">Campaign {view.label.trim().toLowerCase()}</p>
          </div>
        </div>
        <p className="pse-caption mt-3.5">{status.body}</p>
      </div>
      <div className="divide-y border-t" style={{ borderColor: 'var(--pse-line)' }}>
        <DataRow label="Operating tools" value={`${activeTools} / ${totalTools}`} />
        <DataRow label="Maintenance due" value={String(maintenanceDue)} />
      </div>
    </Panel>
  );
}

/* ── Campaign timeline ───────────────────────────────────────────────── */
function CampaignTimeline({ status, campaign }: {
  status: string | null; campaign: { name?: string; startAt?: string; endAt?: string; durationDays?: number } | null;
}) {
  const view = campaignStatusView(status);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const totalDays = campaign?.durationDays && campaign.durationDays > 0 ? campaign.durationDays : 90;
  const startMs = toDateSafe(campaign?.startAt)?.getTime();
  const endMs = toDateSafe(campaign?.endAt)?.getTime();
  const now = nowMs();
  const dayNumber = typeof startMs === 'number'
    ? Math.min(totalDays, Math.max(1, Math.floor((now - startMs) / 86_400_000) + 1))
    : null;
  const daysLeft = typeof endMs === 'number' ? Math.max(0, Math.ceil((endMs - now) / 86_400_000)) : null;
  const progress = dayNumber !== null ? (dayNumber / totalDays) * 100 : 0;

  const phases = [
    { id: 'scheduled', label: 'Start', detail: 'Purchases open' },
    { id: 'active', label: 'Operations', detail: 'Cycles accrue hourly' },
    { id: 'settling', label: 'Settlement', detail: 'Balances finalised' },
    { id: 'payout', label: 'Payout', detail: 'Reviewed and paid' },
  ];
  const currentPhase =
    status === 'scheduled' ? 0 :
    status === 'active' || status === 'paused' ? 1 :
    status === 'settling' || status === 'closed' || status === 'archived' ? 2 : 3;
  const index = status === 'payout' ? 3 : currentPhase;

  return (
    <Panel title="Campaign timeline" meta={campaign?.name || 'PSEmine 90-day campaign'}
      action={<Chip label={view.label} chip={view.chip} pulse={view.live} />}>
      <div className="space-y-4 px-5 py-5">
        {view.live && dayNumber !== null ? (
          <>
            <Meter value={progress} label="Campaign progress" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="pse-caption">
                Day <span className="pse-num font-semibold" style={{ color: 'var(--pse-text)' }}>{dayNumber}</span> of {totalDays}
              </p>
              {daysLeft !== null && (
                <p className="pse-micro">{daysLeft} day{daysLeft === 1 ? '' : 's'} remaining</p>
              )}
            </div>
          </>
        ) : (
          <p className="pse-caption">{view.detail}</p>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {phases.map((p, i) => {
            const done = i < index;
            const current = i === index;
            return (
              <div key={p.id} className="pse-inset p-3">
                <div className="flex items-center gap-2">
                  <span className={done ? 'pse-step pse-step-done' : current ? 'pse-step pse-step-active' : 'pse-step'}>
                    {done ? '✓' : i + 1}
                  </span>
                  <span className="pse-caption font-semibold" style={{ color: current ? 'var(--pse-text)' : 'var(--pse-text-2)' }}>
                    {p.label}
                  </span>
                </div>
                <p className="pse-micro mt-1.5">{p.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

/* ── Tool operations row ─────────────────────────────────────────────── */
function ToolOpsRow({ tool, miningLive }: { tool: PseStateTool; miningLive: boolean }) {
  const cycle = cycleStateView(tool.cycleState || tool.status);
  const Icon = cycle.icon;
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const running = tool.cycleState === 'active' && miningLive;
  const remaining = running ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--pse-line)' }}>
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
          <Icon size={17} style={{ color: cycle.live ? 'var(--pse-success)' : 'var(--pse-text-2)' }} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="pse-h3 truncate">{toolName(tool)}</p>
            <Chip label={cycle.label} chip={cycle.chip} pulse={cycle.live && miningLive} dot={!cycle.live} />
            {typeof tool.cycleIndex === 'number' && <span className="pse-micro">Cycle #{tool.cycleIndex + 1}</span>}
          </div>
          <p className="pse-micro mt-1">
            {remaining
              ? remaining.text
              : cycle.live
                ? miningLive ? 'Operating — accruing hourly' : 'Idle — campaign not active'
                : cycle.description}
            {' · '}
            <span className="pse-num">{gbpHour(toolRate(tool))}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Recent purchases ────────────────────────────────────────────────── */
function RecentPurchases() {
  const { state, purchases } = usePSEMineStateSafe();
  const recent = purchases.slice(0, 3);
  const purchaseOpen = state?.campaign?.purchaseEnabled !== false;

  return (
    <Panel
      title="Purchases"
      meta="On-chain verified activations"
      action={<Link to="/mine/activity" className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>History</Link>}
    >
      {recent.length === 0 ? (
        <div className="px-5 py-4">
          <p className="pse-micro">
            No purchases yet. Each purchase is quoted, paid in BNB, verified on BNB Smart Chain, then activated.
          </p>
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          {recent.map(p => {
            const view = purchaseStatusView(p.status);
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="pse-caption truncate font-medium" style={{ color: 'var(--pse-text)' }}>
                    {p.toolName || p.toolId} · <span className="pse-num">{gbp(p.quotedGBPAmount)}</span>
                  </p>
                  <p className="pse-micro mt-0.5">
                    {p.transactionHash ? shortHash(p.transactionHash) : 'No transaction yet'} · {timeAgo(p.createdAt)}
                  </p>
                </div>
                <Chip label={view.label} chip={view.chip} dot={false} />
              </li>
            );
          })}
        </ul>
      )}
      {!purchaseOpen && (
        <div className="border-t px-5 py-3" style={{ borderColor: 'var(--pse-line)' }}>
          <p className="pse-micro flex items-center gap-1.5" style={{ color: 'var(--pse-warning)' }}>
            <Info size={12} /> Tool purchases are currently closed.
          </p>
        </div>
      )}
    </Panel>
  );
}

/** Local hook so tool/purchase context is read once per component. */
function usePSEMineStateSafe() {
  const { state } = usePseState();
  const { purchases } = usePSEMine();
  return { state, purchases };
}

/* ── Recent activity ─────────────────────────────────────────────────── */
function RecentActivity() {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const recent = activities.slice(0, 6);

  return (
    <Panel
      title="Recent activity"
      meta="Canonical backend ledger"
      action={<Link to="/mine/activity" className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>View all</Link>}
      bodyClassName={recent.length === 0 ? '' : 'divide-y'}
    >
      {feedErrors.activities ? (
        <FeedNotice
          message="Activity could not be loaded."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      ) : recent.length === 0 ? (
        <PSEEmpty
          icon={ActivityIcon}
          title="No activity yet"
          body="Tool purchases, maintenance events, referral qualifications and campaign milestones will appear here."
        />
      ) : (
        <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          {recent.map(a => {
            const Icon = ACTIVITY_ICONS[(a.type || '').toLowerCase()] || ActivityIcon;
            const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
            const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
            const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
            return (
              <ActivityRow
                key={a.id}
                icon={Icon}
                title={a.title || 'Account event'}
                description={a.description}
                time={timeAgo(a.createdAt)}
                amount={displayAmount !== null && displayAmount !== 0 ? (
                  <p className="pse-num pse-caption font-semibold" style={{ color: displayAmount > 0 ? 'var(--pse-success)' : 'var(--pse-text)' }}>
                    {displayAmount > 0 ? '+' : ''}{gbp(displayAmount)}
                  </p>
                ) : undefined}
              />
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export default PSEMineDashboard;
