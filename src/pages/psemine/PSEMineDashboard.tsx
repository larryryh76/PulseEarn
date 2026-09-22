import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCcw, Wrench, Layers, Activity as ActivityIcon } from 'lucide-react';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import {
  gbp, gbpHour, gbpRate, timeAgo, remainingFrom, nowMs, toDateSafe,
  campaignStatusView, cycleStateView, purchaseStatusView, operatingModelView,
  Chip, WorkbenchHeader, AccentSurface, Surface, MetricRow, KeyValue, KVRow,
  RowItem, Meter, PSEEmpty, PSEError, PSELoading, FeedNotice,
  ActivityRow, ACTIVITY_ICONS, shortHash, CampaignBanner, Slots, ActionLink,
} from '../../components/psemine/pse';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { MinerArt } from '../../components/psemine/PSEBrand';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';

/** Tool name/rate resolution that never invents a tier. */
function toolDef(tool: PseStateTool) {
  const id = (tool.toolId || '') as keyof typeof LOCKED_PSEMINE_TOOLS;
  return LOCKED_PSEMINE_TOOLS[id] || null;
}
function toolName(tool: PseStateTool): string {
  return tool.toolName || toolDef(tool)?.name || 'Mining tool';
}
function toolRate(tool: PseStateTool): number {
  if (typeof tool.hourlyRateGBP === 'number') return tool.hourlyRateGBP;
  return toolDef(tool)?.hourlyRateGBP ?? 0;
}

/**
 * The mining console.
 *
 * Composition rule (design system v2): exactly ONE accent surface carries the
 * financial verdict — is mining running, what has it earned, at what rate, and
 * how much campaign is left. Everything after it is a ruled, quieter group, so
 * the first viewport answers the six operational questions in order:
 *   mining active? → earning? → capacity? → what do I own? → attention? → when does it end?
 */
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
  const restartingTools = useMemo(() => tools.filter(t => t.cycleState === 'restarting'), [tools]);

  /**
   * TOOL STACKING view: every owned tool is listed individually (so three
   * Advanced Miners are three stacked tools, never one Elite), and the tier
   * totals are summed from the BACKEND's ownership records — counts and per-tool
   * rates come from the state payload; only the displayed multiplication is
   * local. The authoritative tool capacity is user.toolCapacityGBPPerHour.
   */
  const tierStack = useMemo(() => {
    const groups = new Map<string, { tier: number; name: string; count: number; rate: number; model: string }>();
    for (const t of tools) {
      const key = String(t.toolId || 'unknown');
      const def = LOCKED_PSEMINE_TOOLS[key as keyof typeof LOCKED_PSEMINE_TOOLS];
      const rate = typeof t.hourlyRateGBP === 'number' ? t.hourlyRateGBP : (def?.hourlyRateGBP ?? 0);
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, {
          tier: def?.tier ?? 9,
          name: t.toolName || def?.name || 'Mining tool',
          count: 1,
          rate,
          model: t.operatingModel || def?.operating?.model || 'session',
        });
      }
    }
    return [...groups.values()].sort((a, b) => a.tier - b.tier);
  }, [tools]);

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
  const toolCapacity = user.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user.totalCapacityGBPPerHour ?? 0;
  const capacityShare = (totalCapacity / PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR) * 100;
  const view = campaignStatusView(campaignStatus);

  // Campaign clock (backend campaign document only — never local dates).
  const c = state.campaign;
  const totalDays = c?.durationDays && c.durationDays > 0 ? c.durationDays : 90;
  const startMs = toDateSafe(c?.startAt)?.getTime();
  const endMs = toDateSafe(c?.endAt)?.getTime();
  const now = nowMs();
  const dayNumber = typeof startMs === 'number'
    ? Math.min(totalDays, Math.max(1, Math.floor((now - startMs) / 86_400_000) + 1))
    : null;
  const daysLeft = typeof endMs === 'number' ? Math.max(0, Math.ceil((endMs - now) / 86_400_000)) : null;

  // The single answer to "is mining active?" — derived from backend state only.
  const miningState = (() => {
    if (isMiningLive && tools.length === 0) {
      return { label: 'No capacity yet', tone: 'var(--pse-text-2)', detail: 'No tools are operating, so nothing is accruing. Purchase a tool to begin.' };
    }
    if (isMiningLive && needsMaintenance.length > 0) {
      return {
        label: 'Partially interrupted', tone: 'var(--pse-warning)',
        detail: `${needsMaintenance.length} tool${needsMaintenance.length === 1 ? '' : 's'} finished a mining session and stopped accruing — restart them to resume.`,
      };
    }
    if (isMiningLive && restartingTools.length > 0 && activeTools.length === 0) {
      return {
        label: 'Restarting', tone: 'var(--pse-blue)',
        detail: `${restartingTools.length} tool${restartingTools.length === 1 ? '' : 's'} restarting — mining resumes at the backend-scheduled time. No earnings accrue until then.`,
      };
    }
    if (isMiningLive && activeTools.length > 0) {
      return { label: 'Mining active', tone: 'var(--pse-success)', detail: `${activeTools.length} tool${activeTools.length === 1 ? '' : 's'} operating and accruing on schedule.` };
    }
    if (isMiningLive) {
      return { label: 'Mining idle', tone: 'var(--pse-warning)', detail: 'No tool is currently mining — sessions are complete, restarting, or awaiting a restart.' };
    }
    return { label: view.label.trim(), tone: view.tone, detail: view.detail };
  })();

  const checkpointEarned = typeof state.checkpoint?.earnedMinor === 'number' ? state.checkpoint.earnedMinor : 0;
  const recentTools = tools.slice(0, 6);

  return (
    <div className="pse-section pse-workbench pt-5 md:pt-7">
      <CampaignBanner status={campaignStatus} />

      <WorkbenchHeader
        title="Mining console"
        purpose="Campaign status, earnings and equipment — every figure below is reported by the mining backend."
        status={<Chip label={view.label.trim()} chip={view.chip} pulse={view.live} />}
        actions={
          <button onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm">
            <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing…' : 'Sync now'}
          </button>
        }
      />

      {/* ══ THE PRIMARY SURFACE ══════════════════════════════════════════
          Mining state, earnings, rate, capacity and the campaign clock in one
          coherent block — the reason the rest of the page exists. */}
      <AccentSurface>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pt-4">
          <span className="pse-dot" style={{ background: miningState.tone, width: 7, height: 7 }} />
          <p className="pse-caption font-semibold" style={{ color: miningState.tone }}>{miningState.label}</p>
          <span className="pse-micro">·</span>
          <p className="pse-micro">{miningState.detail}</p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-y-4 px-4 pb-4 sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] sm:gap-x-8">
          <div>
            <p className="pse-eyebrow">Accrued campaign earnings</p>
            <p className="pse-fig-1 mt-2" style={{ color: 'var(--pse-text)' }}>{gbp(user.accruedGBP)}</p>
            <p className="pse-micro mt-2">
              {isMiningLive
                ? `Accruing at ${gbpHour(totalCapacity)}. Settles after the campaign ends — accrued earnings are not withdrawable mid-campaign.`
                : 'Accrual is not running. Earnings settle after the campaign ends.'}
            </p>
            {checkpointEarned > 0 && (
              <p className="pse-micro mt-1.5" style={{ color: 'var(--pse-success)' }}>
                +{gbp(checkpointEarned / 100)} settled at this checkpoint
              </p>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="pse-eyebrow">Capacity composition</p>
              <p className="pse-fig-2" style={{ color: 'var(--pse-text)' }}>{gbpHour(totalCapacity)}</p>
            </div>
            <div className="mt-2.5"><Meter value={capacityShare} label="Capacity against the campaign maximum" /></div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="pse-micro">Tools <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(toolCapacity)}</span></span>
              <span className="pse-micro">Referrals <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(referralCapacity)}</span></span>
            </div>
            <div className="mt-2.5">
              <ActionLink to="/mine/tools">Add capacity</ActionLink>
            </div>
          </div>
        </div>

        <div className="pse-rule">
          <MetricRow items={[
            {
              label: 'Settlement-available',
              value: availableStr,
              tone: 'var(--pse-cyan)',
              sub: 'Backend-reported · opens at settlement',
            },
            {
              label: 'Operating tools',
              value: `${activeTools.length} / ${tools.length}`,
              sub: tools.length === 0
                ? 'No equipment purchased'
                : needsMaintenance.length > 0
                  ? `${needsMaintenance.length} need a restart`
                  : restartingTools.length > 0
                    ? `${restartingTools.length} restarting`
                    : 'All sessions healthy',
            },
            {
              label: 'Qualified referrals',
              value: `${user.qualifiedReferralsCount ?? 0} / ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}`,
              sub: `+${gbpHour(referralCapacity)} of capacity`,
            },
            {
              label: 'Campaign',
              value: dayNumber !== null ? `Day ${dayNumber}` : '—',
              sub: dayNumber !== null ? `of ${totalDays}${daysLeft !== null ? ` · ${daysLeft}d left` : ''}` : 'Schedule pending',
            },
          ]} />
        </div>

        {/* Campaign progress — the 90-day arc, anchored to backend dates. */}
        {dayNumber !== null && (
          <div className="pse-rule px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="pse-eyebrow">Campaign progress</p>
              <p className="pse-micro">Day {dayNumber} of {totalDays}{daysLeft !== null ? ` · ${daysLeft}d remaining` : ''}</p>
            </div>
            <div className="mt-2.5">
              <Meter value={(dayNumber / totalDays) * 100} label="Campaign progress through the 90-day arc" />
            </div>
          </div>
        )}
      </AccentSurface>

      {/* ══ ATTENTION (exception-first) ══ */}
      {isMiningLive && needsMaintenance.length > 0 && (
        <Surface
          tone="warning"
          title={needsMaintenance.length === 1 ? '1 mining session completed' : `${needsMaintenance.length} mining sessions completed`}
          meta="Mining stopped for these tools. Restarting starts the next session — the backend needs a short restart period before mining resumes, and nothing accrues while it restarts."
          action={<Chip label="Restart required" chip="pse-chip pse-chip-warning" dot={false} />}
          bodyClassName="pse-rows"
        >
          {needsMaintenance.map(t => (
            <RowItem key={t.id} className="flex-wrap sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{toolName(t)}</p>
                <p className="pse-micro mt-0.5">
                  Mining stopped — session complete · <span className="pse-num">{gbpRate(toolRate(t))}</span>
                </p>
              </div>
              <button
                onClick={() => void handleMaintain(t.id)}
                disabled={maintaining.has(t.id)}
                className="pse-btn pse-btn-primary pse-btn-sm shrink-0"
              >
                <Wrench size={12} /> {maintaining.has(t.id) ? 'Restarting…' : 'Restart miner'}
              </button>
            </RowItem>
          ))}
        </Surface>
      )}

      {/* Restart in progress — the resume time is the backend's, never a guess. */}
      {isMiningLive && restartingTools.length > 0 && (
        <Surface
          title={restartingTools.length === 1 ? '1 tool restarting' : `${restartingTools.length} tools restarting`}
          meta="The backend is preparing the next mining session. No earnings accrue during the restart period."
          action={<Chip label="Restarting" chip="pse-chip pse-chip-blue" pulse />}
          bodyClassName="pse-rows"
        >
          {restartingTools.map(t => {
            const eta = remainingFrom(t.restartResumesAt, nowMs());
            return (
              <RowItem key={t.id} className="flex-wrap sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{toolName(t)}</p>
                  <p className="pse-micro mt-0.5">
                    Mining resumes {t.restartResumesAt ? `at ${new Date(t.restartResumesAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC` : 'shortly'}
                    {eta.ms > 0 && ` · ${eta.text}`}
                  </p>
                </div>
                <span className="pse-num pse-caption shrink-0" style={{ color: 'var(--pse-text-3)' }}>{gbpRate(toolRate(t))}</span>
              </RowItem>
            );
          })}
        </Surface>
      )}

      {/* ══ TOOL STACK ══════════════════════════════════════════════════
          Every owned tool is its own operating unit: totals are grouped from
          the backend's ownership records, so Advanced ×3 stays three stacked
          tools (each with its own session state) rather than one tool. */}
      {tierStack.length > 0 && (
        <Surface
          title="Capacity stack"
          meta="Your owned tools grouped by tier — each entry is its own operating session"
          action={<ActionLink to="/mine/tools">Add capacity</ActionLink>}
          bodyClassName="pse-rows"
        >
          {tierStack.map(g => (
            <RowItem key={g.name}>
              <div className="min-w-0 flex-1">
                <p className="pse-caption font-medium" style={{ color: 'var(--pse-text)' }}>
                  {g.name} × {g.count}
                </p>
                <p className="pse-micro mt-0.5">
                  {gbpHour(g.rate)} each · {operatingModelView(g.model).label}
                </p>
              </div>
              <span className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-cyan)' }}>
                +{gbpHour(g.count * g.rate)}
              </span>
            </RowItem>
          ))}
          <RowItem>
            <div className="min-w-0 flex-1">
              <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>Total tool capacity</p>
              <p className="pse-micro mt-0.5">Backend-reported · cap {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</p>
            </div>
            <span className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{gbpHour(toolCapacity)}</span>
          </RowItem>
        </Surface>
      )}

      {/* ══ EQUIPMENT + SIDE RAIL ══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Surface
          title="Equipment"
          meta="Live operating cycles, derived by the backend"
          action={<Link to="/mine/tools" className="pse-btn pse-btn-secondary pse-btn-sm">Browse tools</Link>}
          bodyClassName={recentTools.length === 0 ? '' : 'pse-rows'}
        >
          {recentTools.length === 0 ? (
            <PSEEmpty
              icon={Layers}
              title="No mining tools yet"
              body="Purchase a tool to start building hourly capacity. Session tools accrue only while a mining session is active; Elite mines continuously."
              action={<Link to="/mine/tools" className="pse-btn pse-btn-primary pse-btn-sm">Open the marketplace</Link>}
            />
          ) : (
            recentTools.map(t => <ToolRow key={t.id} tool={t} miningLive={isMiningLive} onMaintain={handleMaintain} maintaining={maintaining.has(t.id)} />)
          )}
        </Surface>

        <div className="flex flex-col gap-4">
          <Surface title="Campaign timeline" meta={state.campaign?.name || 'PSEmine 90-day campaign'}>
            {view.live && dayNumber !== null ? (
              <>
                <div className="px-4 pt-4"><Meter value={(dayNumber / totalDays) * 100} label="Campaign progress" /></div>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2 pb-4">
                  <p className="pse-caption">Day <span className="pse-num font-semibold" style={{ color: 'var(--pse-text)' }}>{dayNumber}</span> of {totalDays}</p>
                  {daysLeft !== null && <p className="pse-micro">{daysLeft} day{daysLeft === 1 ? '' : 's'} remaining</p>}
                </div>
              </>
            ) : (
              <p className="px-4 py-4 pse-caption">{view.detail}</p>
            )}
            <KeyValue className="pse-rule-t">
              <KVRow k="Phase" v={view.label.trim()} />
              <KVRow k="Duration" v={`${totalDays} days`} hint="Fixed, then settlement" />
              <KVRow k="Accounting" v="GBP" hint="Fixed hourly rates" />
              <KVRow k="Session tools" v="Manual restart" hint="No earnings during a restart period" />
              <KVRow k="Elite Miner" v="Continuous" hint="No manual session restart" />
            </KeyValue>
          </Surface>

          <Surface title="Payout state" action={<ActionLink to="/mine/wallet">Wallet</ActionLink>}>
            <KeyValue>
              <KVRow k="Settlement-available" v={availableStr} emphasis hint="Backend-reported figure only" />
              <KVRow
                k="Payout wallet"
                v={user.payoutWallet ? `${user.payoutWallet.slice(0, 6)}…${user.payoutWallet.slice(-4)}` : 'Not set'}
                mono={Boolean(user.payoutWallet)}
                hint={user.payoutWallet ? 'Receives settlement' : 'Required before settlement'}
              />
            </KeyValue>
          </Surface>

          <Surface title="Referral capacity" action={<ActionLink to="/mine/referrals">Manage</ActionLink>}>
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="pse-fig-2">{user.qualifiedReferralsCount ?? 0}<span className="pse-caption" style={{ color: 'var(--pse-text-3)' }}> / {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}</span></p>
                <p className="pse-caption pse-num" style={{ color: 'var(--pse-text-2)' }}>+{gbpHour(referralCapacity)}</p>
              </div>
              <Slots filled={user.qualifiedReferralsCount ?? 0} total={PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} />
              <p className="pse-micro">Each qualified referral adds +£0.30/hour, applied from qualification forward.</p>
            </div>
          </Surface>

          <RecentPurchases />
        </div>
      </div>

      <RecentActivity />
    </div>
  );
};

/* ── Tool row: dense, with its own action when the backend says it needs one ── */
function ToolRow({ tool, miningLive, onMaintain, maintaining }: {
  tool: PseStateTool; miningLive: boolean; onMaintain: (id: string) => void; maintaining: boolean;
}) {
  const cycle = cycleStateView(tool.cycleState || tool.status);
  const def = toolDef(tool);
  const rank = def?.displayOrder ?? 1;
  const continuous = (tool.operatingModel || def?.operating?.model) === 'continuous';
  const running = tool.cycleState === 'active' && miningLive;
  // Continuous tools expose no session end — never invent a countdown for them.
  const remaining = running && !continuous ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;
  const restarting = tool.cycleState === 'restarting';
  const restartEta = restarting ? remainingFrom(tool.restartResumesAt, nowMs()) : null;
  const needsAction = miningLive && !continuous && (
    tool.maintenanceRequired === true ||
    tool.cycleState === 'cycle_complete' ||
    tool.cycleState === 'maintenance_required'
  );
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <RowItem className="flex-wrap sm:flex-nowrap">
      <MinerArt tier={rank as 1 | 2 | 3 | 4} size={40} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{toolName(tool)}</p>
          <Chip label={cycle.label} chip={cycle.chip} dot={false} />
          {continuous && <Chip label="Continuous" chip="pse-chip pse-chip-cyan" dot={false} />}
          {!continuous && typeof tool.cycleIndex === 'number' && <span className="pse-micro">Session #{tool.cycleIndex + 1}</span>}
        </div>
        <p className="pse-micro mt-0.5">
          {remaining
            ? `Mining active — session remaining: ${remaining.text}`
            : restartEta
              ? `Mining stopped — restarting. Mining resumes${tool.restartResumesAt ? ` at ${new Date(tool.restartResumesAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC` : ''}${restartEta.ms > 0 ? ` · ${restartEta.text}` : ''}`
              : continuous
                ? (miningLive ? 'Mining active — continuous operation, no restart required' : 'Idle — campaign not active')
                : cycle.live
                  ? (miningLive ? 'Mining active — accruing hourly' : 'Idle — campaign not active')
                  : cycle.description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(toolRate(tool))}</span>
        {needsAction && (
          <button onClick={() => onMaintain(tool.id)} disabled={maintaining} className="pse-btn pse-btn-secondary pse-btn-sm">
            <Wrench size={12} /> {maintaining ? 'Restarting…' : 'Restart'}
          </button>
        )}
      </div>
    </RowItem>
  );
}

/* ── Purchases (real records only) ── */
function RecentPurchases() {
  const { state } = usePseState();
  const { purchases } = usePSEMine();
  const recent = purchases.slice(0, 3);
  const purchaseOpen = state?.campaign?.purchaseEnabled !== false;

  return (
    <Surface title="Purchases" meta="On-chain verified activations" action={<ActionLink to="/mine/activity">Ledger</ActionLink>}
      bodyClassName={recent.length === 0 ? '' : 'pse-rows'}>
      {recent.length === 0 ? (
        <p className="px-4 py-4 pse-micro">
          No purchases yet. Each purchase is quoted, paid in BNB, verified on BNB Smart Chain, then activated.
        </p>
      ) : (
        recent.map(p => {
          const v = purchaseStatusView(p.status);
          return (
            <RowItem key={p.id}>
              <div className="min-w-0 flex-1">
                <p className="pse-caption font-medium truncate" style={{ color: 'var(--pse-text)' }}>
                  {p.toolName || p.toolId} · <span className="pse-num">{gbp(p.quotedGBPAmount)}</span>
                </p>
                <p className="pse-micro mt-0.5">
                  {p.transactionHash ? shortHash(p.transactionHash) : 'No transaction yet'} · {timeAgo(p.createdAt)}
                </p>
              </div>
              <Chip label={v.label} chip={v.chip} dot={false} />
            </RowItem>
          );
        })
      )}
      {!purchaseOpen && (
        <p className="pse-rule px-4 py-3 pse-micro" style={{ color: 'var(--pse-warning)' }}>
          Tool purchases are currently closed for this campaign.
        </p>
      )}
    </Surface>
  );
}

/* ── Ledger preview ── */
function RecentActivity() {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const recent = activities.slice(0, 6);

  return (
    <Surface
      title="Recent activity"
      meta="Canonical backend ledger"
      action={<ActionLink to="/mine/activity">Full ledger</ActionLink>}
      bodyClassName={recent.length === 0 ? '' : 'pse-rows'}
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
          body="Tool purchases, maintenance events, referral qualifications and campaign milestones appear here."
        />
      ) : (
        <ul>
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
    </Surface>
  );
}

export default PSEMineDashboard;
