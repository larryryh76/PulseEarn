import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCcw, Wrench, Layers, Activity as ActivityIcon } from 'lucide-react';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import {
  gbp, gbpHour, gbpRate, timeAgo, remainingFrom, nowMs,
  campaignStatusView, campaignTone, cycleStateView, purchaseStatusView, operatingModelView,
  Stamp, StatementHeader, Verdict, RailBand, DutyRail, CapacityRail, Ledger, LedgerRow,
  Attn, PSEEmpty, PSEError, PSELoading, FeedNotice,
  ACTIVITY_ICONS, shortHash, useCampaignClock,
} from '../../components/psemine/pse';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { ModuleMark } from '../../components/psemine/PSEBrand';
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
function toolTier(tool: PseStateTool): 1 | 2 | 3 | 4 {
  const def = toolDef(tool);
  const rank = def?.tier ?? 1;
  return Math.min(4, Math.max(1, rank)) as 1 | 2 | 3 | 4;
}

/**
 * The mining console.
 *
 * Composition law (Duty & Ledger): VERDICT → RAILS → LEDGERS → NOTES.
 *
 *   VERDICT  the accrued figure, its rate and the mining state — on the canvas,
 *            never inside a tinted panel.
 *   RAILS    the campaign duty rail (one campaign visual, shared with the shell)
 *            and the capacity register (one capacity visual, shared product-wide).
 *   LEDGERS  equipment, capacity stack, settlement, referral lanes, purchases,
 *            recent activity. The only bordered containers on the page.
 *   NOTES    the exceptions the backend reports, stated plainly.
 *
 * Every figure comes from the mining backend (`/api/mine/state`), every constant
 * from the locked economics. Nothing here is estimated in the browser.
 */
export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool, pseUser } = usePSEMine();
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
  // Hooks must run on EVERY render, so the campaign clock is anchored here —
  // above the loading/error early returns. Called after them, a transition from
  // a loaded console into an error state changed the hook count between renders
  // and React threw "Rendered fewer hooks than expected" instead of showing the
  // error screen it was asked for.
  const clock = useCampaignClock(state?.campaign, campaignStatus);

  const needsMaintenance = useMemo(
    () => tools.filter(t => t.maintenanceRequired === true || t.cycleState === 'maintenance_required' || t.cycleState === 'cycle_complete'),
    [tools],
  );
  const activeTools = useMemo(() => tools.filter(t => t.cycleState === 'active'), [tools]);
  const restartingTools = useMemo(() => tools.filter(t => t.cycleState === 'restarting'), [tools]);

  /**
   * TOOL STACKING: every owned tool is listed individually (three Advanced
   * Miners are three stacked tools, never one Elite) and tier totals are summed
   * from the backend's ownership records. The authoritative tool capacity is
   * user.toolCapacityGBPPerHour.
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
      <div className="pse-gut pt-6">
        <PSELoading label="Loading the mining console" />
      </div>
    );
  }

  if (error || !state || !user) {
    return (
      <div className="pse-gut py-8">
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
  const view = campaignStatusView(campaignStatus);

  /** The single answer to "is mining active?" — derived from backend state only. */
  const miningState = (() => {
    if (isMiningLive && tools.length === 0) {
      return { label: 'No capacity yet', detail: 'No tools are operating, so nothing is accruing. Purchase a tool to begin.', tone: 'idle' as const };
    }
    if (isMiningLive && needsMaintenance.length > 0) {
      return {
        label: 'Partially interrupted',
        detail: `${needsMaintenance.length} tool${needsMaintenance.length === 1 ? '' : 's'} finished a mining session and stopped accruing — restart them to resume.`,
        tone: 'attn' as const,
      };
    }
    if (isMiningLive && restartingTools.length > 0 && activeTools.length === 0) {
      return {
        label: 'Restarting',
        detail: `${restartingTools.length} tool${restartingTools.length === 1 ? '' : 's'} restarting — mining resumes at the backend-scheduled time. No earnings accrue until then.`,
        tone: 'info' as const,
      };
    }
    if (isMiningLive && activeTools.length > 0) {
      return { label: 'Mining active', detail: `${activeTools.length} tool${activeTools.length === 1 ? '' : 's'} operating and accruing on schedule.`, tone: 'live' as const };
    }
    if (isMiningLive) {
      return { label: 'Mining idle', detail: 'No tool is currently mining — sessions are complete, restarting, or awaiting a restart.', tone: 'attn' as const };
    }
    return { label: view.label.trim(), detail: view.detail, tone: campaignTone(campaignStatus) };
  })();

  const checkpointEarned = typeof state.checkpoint?.earnedMinor === 'number' ? state.checkpoint.earnedMinor : 0;
  const recentTools = tools.slice(0, 8);
  const purchaseOpen = state.campaign?.purchaseEnabled !== false;
  const referralQualified = user.qualifiedReferralsCount ?? 0;
  const counts = pseUser?.toolOwnershipCounts;

  return (
    <div className="pse-gut pse-stack" style={{ paddingTop: 22 }}>
      <StatementHeader
        routeKey="Mining console"
        title="Where this campaign stands"
        objective="Campaign status, earnings and equipment — every figure below is reported by the mining backend."
        status={<Stamp tone={miningState.tone} pulse={miningState.tone === 'live'} glyph="●">{miningState.label}</Stamp>}
        actions={
          <button onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-2 pse-btn-sm">
            <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing…' : 'Sync now'}
          </button>
        }
      />

      {/* ══ VERDICT — the answer, on the canvas ══ */}
      <Verdict
        label="Accrued campaign earnings"
        value={gbp(user.accruedGBP)}
        status={<Stamp tone="live" glyph="≈">{gbpHour(totalCapacity)}</Stamp>}
        note={
          <>
            {miningState.detail}
            {isMiningLive
              ? ' Accrual is written hourly by the backend while a tool’s duty cycle is open; the balance settles after the campaign ends.'
              : ' Accrual is not running; earnings settle after the campaign ends.'}
          </>
        }
        side={
          <div className="pse-stack-tight">
            <div className="pse-spec-line"><span>Settlement-available</span><span className="pse-jade">{availableStr}</span></div>
            <div className="pse-spec-line"><span>Operating tools</span><span>{activeTools.length} / {tools.length}</span></div>
            <div className="pse-spec-line">
              <span>Qualified referrals</span>
              <span>{referralQualified} / {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}</span>
            </div>
            <div className="pse-spec-line">
              <span>Campaign</span>
              <span>{clock.dayNumber !== null ? `Day ${clock.dayNumber} of ${clock.totalDays}` : 'Schedule pending'}</span>
            </div>
            {checkpointEarned > 0 && (
              <p className="pse-meta">+{gbp(checkpointEarned / 100)} settled at the last checkpoint</p>
            )}
          </div>
        }
      />

      {/* ══ RAILS — the campaign clock, then the capacity register ══ */}
      <RailBand
        label="Campaign clock"
        meta={`${clock.totalDays}-day campaign · backend dates`}
        right={<Link to="/mine/guide" className="pse-meta pse-link">How the campaign runs</Link>}
      >
        <DutyRail campaign={state.campaign} status={campaignStatus} />
      </RailBand>

      <CapacityRail
        toolCapacity={toolCapacity}
        referralCapacity={referralCapacity}
        counts={counts}
        referralCount={referralQualified}
        label="Mining capacity"
      />

      {/* ══ NOTES — exceptions the backend reports, in priority order ══ */}
      {isMiningLive && needsMaintenance.length > 0 && (
        <Attn
          tone="attn"
          title={needsMaintenance.length === 1 ? '1 mining session completed' : `${needsMaintenance.length} mining sessions completed`}
          body="Mining stopped for these tools. Restarting begins the next session; the backend needs a short restart period before mining resumes, and nothing accrues while it restarts."
        />
      )}
      {isMiningLive && restartingTools.length > 0 && (
        <Attn
          tone="info"
          title={restartingTools.length === 1 ? '1 tool restarting' : `${restartingTools.length} tools restarting`}
          body="The backend is preparing the next mining session. No earnings accrue during the restart period."
        />
      )}
      {!purchaseOpen && (
        <Attn
          tone="attn"
          title="Tool purchases are closed for this campaign"
          body="Existing tools continue to follow their operating model until the campaign settles."
        />
      )}

      {/* ══ LEDGERS — equipment beside the account reads ══ */}
      <div className="pse-split">
        <div className="pse-stack">
          <Ledger
            title="Your equipment"
            meta={tools.length === 0
              ? 'No tools held'
              : `${tools.length} tool${tools.length === 1 ? '' : 's'} · operating state derived by the backend`}
            legend={['Tool', '£ / hour']}
            action={<Link to="/mine/tools" className="pse-btn pse-btn-2 pse-btn-sm">Browse tools</Link>}
          >
            {recentTools.length === 0 ? (
              <PSEEmpty
                icon={Layers}
                title="No mining tools yet"
                body="Purchase a tool to start building hourly capacity. Session tools accrue only while a mining session is active; Elite mines continuously."
                action={<Link to="/mine/tools" className="pse-btn pse-btn-sm">Open the marketplace</Link>}
              />
            ) : (
              recentTools.map(t => (
                <ToolRow
                  key={t.id}
                  tool={t}
                  miningLive={isMiningLive}
                  onMaintain={handleMaintain}
                  maintaining={maintaining.has(t.id)}
                />
              ))
            )}
          </Ledger>

          {/* Day 0: the decision aid is the product itself, at its real prices. */}
          {tools.length === 0 && (
            <Ledger
              title="Build your first capacity"
              meta="Four tiers · fixed price · fixed £ per hour · fixed ownership limit"
              legend={['Tier', '£ / hour · price']}
            >
              {Object.values(LOCKED_PSEMINE_TOOLS)
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map(t => (
                  <LedgerRow
                    key={t.id}
                    leading={<ModuleMark tier={t.tier as 1 | 2 | 3 | 4} size={54} active={false} />}
                    title={t.name}
                    sub={`Max ${t.maxPerUser} per account · at limit ${gbpHour(t.hourlyRateGBP * t.maxPerUser)} · ${t.operating.model === 'continuous' ? 'continuous duty' : 'session duty'}`}
                    value={<>{gbpHour(t.hourlyRateGBP)}<span className="pse-meta" style={{ marginLeft: 10 }}>{gbp(t.purchasePriceGBP)}</span></>}
                  />
                ))}
            </Ledger>
          )}

          {tierStack.length > 0 && (
            <Ledger
              title="Capacity stack"
              meta="Owned tools grouped by tier — each entry is its own operating session"
              legend={['Tier', 'Contribution']}
            >
              {tierStack.map(g => (
                <LedgerRow
                  key={g.name}
                  title={`${g.name} × ${g.count}`}
                  sub={`${gbpHour(g.rate)} each · ${operatingModelView(g.model).label}`}
                  value={`+${gbpHour(g.count * g.rate)}`}
                  valueTone="var(--pse-jade-ink)"
                />
              ))}
              <LedgerRow
                title="Total tool capacity"
                sub={`Backend-reported · capped at ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}`}
                value={gbpHour(toolCapacity)}
              />
            </Ledger>
          )}

          <Ledger
            title="Recent activity"
            meta="Canonical backend ledger"
            legend={['Event', 'Amount']}
            legendCols={3}
            action={<Link to="/mine/activity" className="pse-meta pse-link">Full ledger</Link>}
          >
            <ActivityPreview />
          </Ledger>
        </div>

        <div className="pse-stack">
          <Ledger title="Settlement & payout" legend={['Field', 'Value']} action={<Link to="/mine/wallet" className="pse-meta pse-link">Wallet</Link>}>
            <LedgerRow title="Settlement-available" sub="Backend-reported figure only" value={availableStr} valueTone="var(--pse-jade-ink)" />
            <LedgerRow
              title="Payout wallet"
              sub={user.payoutWallet ? 'Receives settlement' : 'Required before settlement'}
              value={user.payoutWallet ? `${user.payoutWallet.slice(0, 6)}…${user.payoutWallet.slice(-4)}` : 'Not set'}
            />
            <LedgerRow
              title="Payout opens"
              sub={`Minimum £10.00 per request`}
              value={isMiningLive ? 'At settlement' : campaignStatusView(campaignStatus).label.trim()}
            />
          </Ledger>

          <Ledger
            title="Referral capacity"
            legend={['Field', 'Value']}
            action={<Link to="/mine/referrals" className="pse-meta pse-link">Manage</Link>}
          >
            <LedgerRow
              title="Qualified lanes"
              sub={`Each lane adds ${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} from qualification forward`}
              value={`${referralQualified} / ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}`}
              children={
                <span className="pse-ticks" style={{ marginTop: 8 }} role="img" aria-label={`${referralQualified} of ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} referral lanes qualified`}>
                  {Array.from({ length: PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS }, (_, i) => (
                    <span key={i} className="pse-tick" data-on={i < referralQualified ? 'true' : 'false'} />
                  ))}
                </span>
              }
            />
            <LedgerRow
              title="Referral capacity"
              sub={`Capped at ${gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}`}
              value={`+${gbpHour(referralCapacity)}`}
              valueTone={referralCapacity > 0 ? 'var(--pse-jade-ink)' : undefined}
            />
          </Ledger>

          <RecentPurchases />
        </div>
      </div>
    </div>
  );
};

/* ── Tool row: dense ledger record, with its own action when the backend says it needs one ── */
function ToolRow({ tool, miningLive, onMaintain, maintaining }: {
  tool: PseStateTool; miningLive: boolean; onMaintain: (id: string) => void; maintaining: boolean;
}) {
  const cycle = cycleStateView(tool.cycleState || tool.status);
  const def = toolDef(tool);
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
    <LedgerRow
      leading={<ModuleMark tier={toolTier(tool)} size={54} active={running || restarting} stopped={needsAction} />}
      title={
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {toolName(tool)}
          <Stamp tone={needsAction ? 'attn' : running ? 'live' : restarting ? 'info' : 'idle'} glyph={needsAction ? '▲' : running ? '●' : '·'}>
            {cycle.label}
          </Stamp>
          {continuous && <span className="pse-np pse-np-2">Continuous</span>}
          {!continuous && typeof tool.cycleIndex === 'number' && (
            <span className="pse-np pse-np-2">Session #{tool.cycleIndex + 1}</span>
          )}
        </span>
      }
      sub={
        remaining
          ? `Mining active — session remaining: ${remaining.text}`
          : restartEta
            ? `Mining stopped — restarting. Mining resumes${tool.restartResumesAt ? ` at ${new Date(tool.restartResumesAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC` : ''}${restartEta.ms > 0 ? ` · ${restartEta.text}` : ''}`
            : continuous
              ? (miningLive ? 'Mining active — continuous operation, no restart required' : 'Idle — campaign not active')
              : cycle.live
                ? (miningLive ? 'Mining active — accruing hourly' : 'Idle — campaign not active')
                : cycle.description
      }
      value={
        <span className="flex items-center gap-3">
          {gbpRate(toolRate(tool))}
          {needsAction && (
            <button onClick={() => onMaintain(tool.id)} disabled={maintaining} className="pse-btn pse-btn-2 pse-btn-sm">
              <Wrench size={12} /> {maintaining ? 'Restarting…' : 'Restart'}
            </button>
          )}
        </span>
      }
    />
  );
}

/* ── Purchases (real records only) ── */
function RecentPurchases() {
  const { state } = usePseState();
  const { purchases } = usePSEMine();
  const recent = purchases.slice(0, 4);
  const purchaseOpen = state?.campaign?.purchaseEnabled !== false;

  return (
    <Ledger
      title="Purchases"
      meta="On-chain verified activations"
      legend={['Tool', 'Status']}
      action={<Link to="/mine/activity" className="pse-meta pse-link">Ledger</Link>}
      foot={!purchaseOpen ? <p className="pse-meta pse-amber">Tool purchases are currently closed for this campaign.</p> : undefined}
    >
      {recent.length === 0 ? (
        <PSEEmpty
          icon={Layers}
          title="No purchases yet"
          body="Each purchase is quoted, paid in BNB, verified on BNB Smart Chain, then activated."
        />
      ) : (
        recent.map(p => {
          const v = purchaseStatusView(p.status);
          return (
            <LedgerRow
              key={p.id}
              title={`${p.toolName || p.toolId} · ${gbp(p.quotedGBPAmount)}`}
              sub={`${p.transactionHash ? shortHash(p.transactionHash) : 'No transaction yet'} · ${timeAgo(p.createdAt)}`}
              value={<Stamp tone={v.terminal ? 'info' : 'attn'} glyph="·">{v.label}</Stamp>}
            />
          );
        })
      )}
    </Ledger>
  );
}

/* ── Activity preview — real ledger entries ── */
function ActivityPreview() {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const recent = activities.slice(0, 6);

  if (feedErrors.activities) {
    return (
      <FeedNotice
        message="The activity feed could not be loaded — entries may be missing."
        onRetry={() => void refreshFeed('activities')}
        retrying={refreshing}
      />
    );
  }
  if (recent.length === 0) {
    return (
      <PSEEmpty
        icon={ActivityIcon}
        title="No activity yet"
        body="Tool purchases, maintenance events, referral qualifications and campaign milestones appear here as the backend records them."
      />
    );
  }
  return (
    <>
      {recent.map(a => {
        const Icon = ACTIVITY_ICONS[(a.type || '').toLowerCase()] || ActivityIcon;
        const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
        const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
        const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
        const credited = displayAmount !== null && displayAmount > 0;
        return (
          <LedgerRow
            key={a.id}
            sign={displayAmount === null || displayAmount === 0 ? '' : credited ? 'credit' : 'debit'}
            leading={<Icon size={14} style={{ color: 'var(--pse-text-3)' }} />}
            title={a.title || 'Account event'}
            sub={`${timeAgo(a.createdAt)}${a.type ? ` · ${a.type}` : ''}`}
            value={displayAmount !== null && displayAmount !== 0
              ? `${credited ? '+' : ''}${gbp(Math.abs(displayAmount))}`
              : '—'}
            valueTone={credited ? 'var(--pse-jade-ink)' : undefined}
          />
        );
      })}
    </>
  );
}

export default PSEMineDashboard;
