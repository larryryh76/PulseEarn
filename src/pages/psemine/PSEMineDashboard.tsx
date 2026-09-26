import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import {
  gbp, gbpHour, gbpRate, timeAgo, remainingFrom, nowMs,
  campaignStatusView, cycleStateView, purchaseStatusView,
  shortHash, useCampaignClock,
} from '../../components/psemine/pse';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { usePSEMine } from '../../contexts/PSEMineContext';
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

/** Mining account status and actions reported by the mining backend. */
export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool, pseUser, purchases } = usePSEMine();
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
  // The campaign clock is anchored above loading/error returns to keep hook order stable.
  const clock = useCampaignClock(state?.campaign, campaignStatus);

  const needsMaintenance = useMemo(
    () => tools.filter(t => t.maintenanceRequired === true || t.cycleState === 'maintenance_required' || t.cycleState === 'cycle_complete'),
    [tools],
  );
  const activeTools = useMemo(() => tools.filter(t => t.cycleState === 'active'), [tools]);
  const restartingTools = useMemo(() => tools.filter(t => t.cycleState === 'restarting'), [tools]);

  const handleMaintain = async (ownershipId: string) => {
    setMaintaining(prev => new Set(prev).add(ownershipId));
    try { await maintainTool(ownershipId); } finally {
      await refresh();
      setMaintaining(prev => { const n = new Set(prev); n.delete(ownershipId); return n; });
    }
  };

  if (loading) {
    return <p role="status">Loading the mining console…</p>;
  }

  if (error || !state || !user) {
    const loadError = error || {
      kind: 'data', title: "We couldn't load your mining account", retryable: true,
      message: 'The mining backend returned an incomplete account. Please retry.',
    };
    return (
      <section aria-labelledby="mine-dashboard-error">
        <h1 id="mine-dashboard-error">{loadError.title || "We couldn't load your mining account"}</h1>
        <p>{loadError.message || 'The mining account could not be loaded.'}</p>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Retrying…' : 'Retry'}
        </button>
      </section>
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
      return { label: 'No capacity yet', detail: 'No tools are operating, so nothing is accruing. Purchase a tool to begin.' };
    }
    if (isMiningLive && needsMaintenance.length > 0) {
      return {
        label: 'Partially interrupted',
        detail: `${needsMaintenance.length} tool${needsMaintenance.length === 1 ? '' : 's'} finished a mining session and stopped accruing — restart them to resume.`,
      };
    }
    if (isMiningLive && restartingTools.length > 0 && activeTools.length === 0) {
      return {
        label: 'Restarting',
        detail: `${restartingTools.length} tool${restartingTools.length === 1 ? '' : 's'} restarting — mining resumes at the backend-scheduled time. No earnings accrue until then.`,
      };
    }
    if (isMiningLive && activeTools.length > 0) {
      return { label: 'Mining active', detail: `${activeTools.length} tool${activeTools.length === 1 ? '' : 's'} operating and accruing on schedule.` };
    }
    if (isMiningLive) {
      return { label: 'Mining idle', detail: 'No tool is currently mining — sessions are complete, restarting, or awaiting a restart.' };
    }
    return { label: view.label.trim(), detail: view.detail };
  })();

  const checkpointEarned = typeof state.checkpoint?.earnedMinor === 'number' ? state.checkpoint.earnedMinor : 0;
  const recentTools = tools.slice(0, 8);
  const purchaseOpen = state.campaign?.purchaseEnabled !== false;
  const referralQualified = user.qualifiedReferralsCount ?? 0;
  const counts = pseUser?.toolOwnershipCounts;
  const latestPurchase = purchases[0] ?? null;
  const awaitingPurchases = purchases.filter(p => p.status === 'awaiting_payment').length;

  return (
    <main>
      <header>
        <p>Mining console</p>
        <h1>Where this campaign stands</h1>
        <p>Campaign status, earnings and equipment — every figure below is reported by the mining backend.</p>
        <p role="status" aria-live="polite">Mining status: {miningState.label}. {miningState.detail}</p>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Syncing…' : 'Sync now'}
        </button>
      </header>

      <section aria-labelledby="earnings-heading">
        <h2 id="earnings-heading">Accrued campaign earnings</h2>
        <p>{gbp(user.accruedGBP)}</p>
        <p>Current total capacity: {gbpHour(totalCapacity)}</p>
        <p>{miningState.detail}{isMiningLive
          ? ' Accrual is written hourly by the backend while a tool’s duty cycle is open; the balance settles after the campaign ends.'
          : ' Accrual is not running; earnings settle after the campaign ends.'}</p>
        <dl>
          <div><dt>Settlement-available</dt><dd>{availableStr}</dd></div>
          <div><dt>Operating tools</dt><dd>{activeTools.length} / {tools.length}</dd></div>
          <div><dt>Qualified referrals</dt><dd>{referralQualified} / {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}</dd></div>
          <div><dt>Campaign</dt><dd>{clock.dayNumber !== null ? `Day ${clock.dayNumber} of ${clock.totalDays}` : 'Schedule pending'}</dd></div>
          {checkpointEarned > 0 && <div><dt>Last checkpoint</dt><dd>{gbp(checkpointEarned / 100)} settled</dd></div>}
        </dl>
      </section>

      <section aria-labelledby="campaign-clock-heading">
        <h2 id="campaign-clock-heading">Campaign clock</h2>
        <p>{clock.totalDays}-day campaign · backend dates</p>
        <p>Campaign status: {view.label.trim()}. {view.detail}</p>
        <Link to="/mine/guide">How the campaign runs</Link>
      </section>

      <section aria-labelledby="capacity-heading">
        <h2 id="capacity-heading">Mining capacity</h2>
        <dl>
          <div><dt>Tool capacity</dt><dd>{gbpHour(toolCapacity)}</dd></div>
          <div><dt>Referral capacity</dt><dd>{gbpHour(referralCapacity)}</dd></div>
          {counts && Object.entries(counts).map(([tier, count]) => (
            <div key={tier}><dt>{tier} tools owned</dt><dd>{count}</dd></div>
          ))}
          <div><dt>Qualified referrals</dt><dd>{referralQualified}</dd></div>
        </dl>
      </section>

      {isMiningLive && needsMaintenance.length > 0 && (
        <section aria-labelledby="maintenance-notice">
          <h2 id="maintenance-notice">{needsMaintenance.length === 1 ? '1 mining session completed' : `${needsMaintenance.length} mining sessions completed`}</h2>
          <p>Mining stopped for these tools. Restarting begins the next session; the backend needs a short restart period before mining resumes, and nothing accrues while it restarts.</p>
        </section>
      )}
      {isMiningLive && restartingTools.length > 0 && (
        <section aria-labelledby="restarting-notice">
          <h2 id="restarting-notice">{restartingTools.length === 1 ? '1 tool restarting' : `${restartingTools.length} tools restarting`}</h2>
          <p>The backend is preparing the next mining session. No earnings accrue during the restart period.</p>
        </section>
      )}
      {!purchaseOpen && (
        <section aria-labelledby="purchases-closed">
          <h2 id="purchases-closed">Tool purchases are closed for this campaign</h2>
          <p>Existing tools continue to follow their operating model until the campaign settles.</p>
        </section>
      )}

      <section aria-labelledby="equipment-heading">
        <h2 id="equipment-heading">Your equipment</h2>
        <p>{tools.length === 0
          ? 'No tools held — every tier at its real price, rate and ownership limit.'
          : `${tools.length} tool${tools.length === 1 ? '' : 's'} · operating state derived by the backend`}</p>
        <p><Link to="/mine/tools">{tools.length === 0 ? 'Open the marketplace' : 'Browse tools'}</Link></p>
        {latestPurchase && (
          <p>
            Latest purchase: {latestPurchase.toolName || latestPurchase.toolId}
            {latestPurchase.transactionHash ? ` · ${shortHash(latestPurchase.transactionHash)}` : ''} · {purchaseStatusView(latestPurchase.status).label}
            {awaitingPurchases > 0 ? ` · ${awaitingPurchases} awaiting BNB payment` : ''}
          </p>
        )}
        {recentTools.length === 0 ? (
          <ul>
            {Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder).map(t => (
              <li key={t.id}>
                <h3>{t.name}</h3>
                <p>Max {t.maxPerUser} per account · at limit {gbpHour(t.hourlyRateGBP * t.maxPerUser)} · {t.operating.model === 'continuous' ? 'continuous duty' : 'session duty'}</p>
                <p>Rate: {gbpHour(t.hourlyRateGBP)} · Price: {gbp(t.purchasePriceGBP)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <ul>
            {recentTools.map(t => (
              <ToolRow key={t.id} tool={t} miningLive={isMiningLive} onMaintain={handleMaintain} maintaining={maintaining.has(t.id)} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="activity-heading">
        <h2 id="activity-heading">Recent activity</h2>
        <p>Canonical backend ledger</p>
        <Link to="/mine/activity">Full ledger</Link>
        <ActivityPreview />
      </section>

      <section aria-labelledby="account-heading">
        <h2 id="account-heading">Account position</h2>
        <p>Settlement, payout and referral figures reported by the backend.</p>
        <p><Link to="/mine/wallet">Wallet</Link> · <Link to="/mine/referrals">Referrals</Link></p>
        <dl>
          <div><dt>Settlement-available</dt><dd>{availableStr}. Backend-reported figure only.</dd></div>
          <div><dt>Payout wallet</dt><dd>{user.payoutWallet ? `${user.payoutWallet.slice(0, 6)}…${user.payoutWallet.slice(-4)} — receives settlement` : 'Not set — required before settlement'}</dd></div>
          <div><dt>Payout opens</dt><dd>Minimum £10.00 per request. {isMiningLive ? 'At settlement' : campaignStatusView(campaignStatus).label.trim()}</dd></div>
          <div><dt>Qualified referral lanes</dt><dd>{referralQualified} / {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}; each lane adds {gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} from qualification forward, capped at {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}. Current referral capacity: {gbpHour(referralCapacity)}.</dd></div>
        </dl>
      </section>
    </main>
  );
};

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

  const statusText = remaining
    ? `Mining active — session remaining: ${remaining.text}`
    : restartEta
      ? `Mining stopped — restarting. Mining resumes${tool.restartResumesAt ? ` at ${new Date(tool.restartResumesAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} UTC` : ''}${restartEta.ms > 0 ? ` · ${restartEta.text}` : ''}`
      : continuous
        ? (miningLive ? 'Mining active — continuous operation, no restart required' : 'Idle — campaign not active')
        : cycle.live
          ? (miningLive ? 'Mining active — accruing hourly' : 'Idle — campaign not active')
          : cycle.description;

  return (
    <li>
      <h3>{toolName(tool)}</h3>
      <p>Status: {cycle.label}. {continuous ? 'Continuous operation.' : typeof tool.cycleIndex === 'number' ? `Session #${tool.cycleIndex + 1}.` : ''}</p>
      <p>{statusText}</p>
      <p>Hourly rate: {gbpRate(toolRate(tool))}</p>
      {needsAction && (
        <button type="button" onClick={() => onMaintain(tool.id)} disabled={maintaining}>
          {maintaining ? 'Restarting…' : 'Restart'}
        </button>
      )}
    </li>
  );
}

function ActivityPreview() {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const recent = activities.slice(0, 6);

  if (feedErrors.activities) {
    return (
      <div role="status">
        <p>The activity feed could not be loaded — entries may be missing.</p>
        <button type="button" onClick={() => void refreshFeed('activities')} disabled={refreshing}>
          {refreshing ? 'Retrying…' : 'Retry activity feed'}
        </button>
      </div>
    );
  }
  if (recent.length === 0) {
    return <p>No activity yet. Tool purchases, maintenance events, referral qualifications and campaign milestones appear here as the backend records them.</p>;
  }
  return (
    <ul>
      {recent.map(a => {
        const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
        const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
        const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
        const credited = displayAmount !== null && displayAmount > 0;
        return (
          <li key={a.id}>
            <h3>{a.title || 'Account event'}</h3>
            <p>{timeAgo(a.createdAt)}{a.type ? ` · ${a.type}` : ''}</p>
            <p>{displayAmount !== null && displayAmount !== 0
              ? `${credited ? '+' : ''}${gbp(Math.abs(displayAmount))}`
              : 'No amount reported'}</p>
          </li>
        );
      })}
    </ul>
  );
}

export default PSEMineDashboard;
