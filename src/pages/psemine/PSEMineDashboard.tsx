import { useEffect, useMemo, useState } from 'react';
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
import { PSEMineCampaignRail, PSEMineCapacityRegister, PSEMineToolVisual } from '../../components/psemine/PSEMineProductVisuals';

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

/** Summarizes campaign state, operating tools, capacity, balances, and recent activity with maintenance actions. */
export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing, activities } = usePseState();
  const { maintainTool, pseUser, purchases } = usePSEMine();
  const available = useAvailableGBP();
  const [maintaining, setMaintaining] = useState<Set<string>>(new Set());
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setClockTick(value => value + 1), 20_000);
    return () => window.clearInterval(interval);
  }, []);

  const serverNowMs = useMemo(() => nowMs(), [clockTick]);
  const tools = useMemo(() => state?.tools ?? [], [state?.tools]);
  const user = state?.user;
  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const needsMaintenance = useMemo(
    () => tools.filter(tool => tool.maintenanceRequired === true || tool.cycleState === 'maintenance_required' || tool.cycleState === 'cycle_complete'),
    [tools],
  );
  const activeTools = tools.filter(tool => tool.cycleState === 'active');
  const restartingTools = tools.filter(tool => tool.cycleState === 'restarting');

  const maintain = async (ownershipId: string) => {
    setMaintaining(previous => new Set(previous).add(ownershipId));
    try { await maintainTool(ownershipId); } finally {
      await refresh();
      setMaintaining(previous => { const next = new Set(previous); next.delete(ownershipId); return next; });
    }
  };

  if (loading) return <main className="pm-page"><p role="status">Loading your PSEmine console…</p></main>;
  if (error || !state || !user) {
    const loadError = error || { title: 'We could not load your mining account', message: 'The mining backend returned an incomplete account.', retryable: true };
    return <main className="pm-product"><section className="pm-page" role="alert"><h1>{loadError.title}</h1><p>{loadError.message}</p><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Retrying…' : 'Retry'}</button></section></main>;
  }

  const miningLive = campaignStatus === 'active';
  const toolCapacity = user.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user.totalCapacityGBPPerHour ?? 0;
  const statusView = campaignStatusView(campaignStatus);
  const miningPosition = !miningLive
    ? `${statusView.label.trim()}. ${statusView.detail}`
    : tools.length === 0
      ? 'No tools are operating, so no capacity is accruing.'
      : needsMaintenance.length > 0
        ? `${needsMaintenance.length} tool${needsMaintenance.length === 1 ? '' : 's'} need a restart.`
        : restartingTools.length > 0 && activeTools.length === 0
          ? `${restartingTools.length} tool${restartingTools.length === 1 ? '' : 's'} restarting; nothing accrues until operation resumes.`
          : activeTools.length > 0
            ? `${activeTools.length} tool${activeTools.length === 1 ? '' : 's'} operating. Accrual is recorded by the backend.`
            : 'No tool is currently operating.';
  const purchaseOpen = state.campaign?.purchaseEnabled === true && campaignStatus === 'active';
  const walletLocked = ['settling', 'payout', 'closed', 'archived'].includes(campaignStatus || '');
  const counts = pseUser?.toolOwnershipCounts;
  const qualified = user.qualifiedReferralsCount ?? 0;
  const canRestart = miningLive && needsMaintenance.length > 0;
  const nextAction = canRestart
    ? 'Restart a completed session'
    : tools.length === 0
      ? purchaseOpen ? 'Choose a mining tool' : 'Check tool availability'
      : !user.payoutWallet && !walletLocked
        ? 'Set your payout wallet before settlement'
        : campaignStatus === 'active'
          ? 'Review your operating tools'
          : 'Review campaign status and settlement';
  const nextActionHref = nextAction === 'Set your payout wallet before settlement'
    ? '/mine/wallet'
    : canRestart || (campaignStatus === 'active' && tools.length > 0)
      ? '/mine/dashboard#equipment'
      : tools.length === 0
        ? '/mine/tools'
        : '/mine/wallet';
  const recentActivities = activities.slice(0, 5);
  const latestPurchase = purchases[0] ?? null;

  return (
    <main className="pm-page">
      <header>
        <p className="pm-eyebrow">PSEmine console</p>
        <div className="pm-verdict">
          <div>
            <h1>Campaign position</h1>
            <p className="pm-eyebrow">Accrued earnings · backend recorded</p>
            <div className="pm-value">{gbp(user.accruedGBP)}</div>
            <p>{miningPosition} Accrued earnings remain separate from the settlement-available balance.</p>
            <div className="pm-inline-actions">
              <Link className="pm-button pm-button-primary" to={nextActionHref}>{nextAction}</Link>
              <button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync account'}</button>
            </div>
          </div>
          <div className="pm-verdict-side">
            <div><span>Capacity</span><strong>{gbpHour(totalCapacity)}</strong></div>
            <div><span>Tools held</span><strong>{tools.length}</strong></div>
            <div><span>Qualified referrals</span><strong>{qualified} / {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}</strong></div>
            <div><span>Settlement available</span><strong>{available}</strong></div>
          </div>
        </div>
      </header>

      <section aria-labelledby="campaign-position-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Campaign</p><h2 id="campaign-position-heading">{state.campaign?.name || 'Campaign lifecycle'}</h2></div><span>{statusView.label.trim()}</span></div>
        <p>{statusView.detail} {clock.dayNumber !== null ? `Day ${clock.dayNumber} of ${clock.totalDays}.` : `${clock.totalDays}-day campaign.`}{clockTick >= 0 && null}</p>
        <PSEMineCampaignRail status={campaignStatus} />
      </section>

      <section aria-labelledby="capacity-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Capacity</p><h2 id="capacity-heading">One reported capacity register</h2></div><Link to="/mine/referrals">Referral lanes</Link></div>
        <PSEMineCapacityRegister counts={counts} qualifiedReferrals={qualified} toolCapacity={toolCapacity} referralCapacity={referralCapacity} totalCapacity={totalCapacity} />
      </section>

      <section id="equipment" aria-labelledby="equipment-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Equipment</p><h2 id="equipment-heading">Owned tools</h2></div><Link className="pm-button pm-button-secondary" to="/mine/tools">Open tool marketplace</Link></div>
        {tools.length === 0 ? (
          <>
            <div className="pm-empty"><h3>No tools yet</h3><p>There are no verified tool ownership records for this account. Tool visuals below identify the four available products.</p></div>
            <div className="pm-tool-family">
              {Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder).map(tool => (
                <article className={`pm-tool-product pm-tool-product-${tool.id}`} key={tool.id}>
                  <PSEMineToolVisual tier={tool.id} size="compact" />
                  <p className="pm-eyebrow">Tier {tool.tier}</p>
                  <h3>{tool.name}</h3>
                  <p>{gbp(tool.purchasePriceGBP)} · {gbpHour(tool.hourlyRateGBP)} · {tool.maxPerUser} max</p>
                </article>
              ))}
            </div>
            <p><Link className="pm-button pm-button-primary" to="/mine/tools">Choose a tool</Link></p>
          </>
        ) : (
          <div className="pm-tool-ledger">
            {tools.map(tool => <ToolRow key={tool.id} tool={tool} miningLive={miningLive} serverNowMs={serverNowMs} onMaintain={maintain} maintaining={maintaining.has(tool.id)} />)}
          </div>
        )}
        {latestPurchase && <p className="pm-note">Latest purchase: {latestPurchase.toolName || latestPurchase.toolId} · {purchaseStatusView(latestPurchase.status).label}{latestPurchase.transactionHash ? ` · ${shortHash(latestPurchase.transactionHash)}` : ''}</p>}
      </section>

      <section aria-labelledby="settlement-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Settlement</p><h2 id="settlement-heading">Position and payout readiness</h2></div><Link to="/mine/wallet">Open statement</Link></div>
        <dl>
          <div><dt>Accrued earnings</dt><dd>{gbp(user.accruedGBP)} · campaign accounting in GBP</dd></div>
          <div><dt>Settlement available</dt><dd>{available} · backend-reported only</dd></div>
          <div><dt>Payout wallet</dt><dd>{user.payoutWallet ? `${user.payoutWallet.slice(0, 6)}…${user.payoutWallet.slice(-4)}` : 'Not configured'}</dd></div>
          <div><dt>Request minimum</dt><dd>£10.00 after settlement</dd></div>
        </dl>
        <p className="pm-micro">No payout date or amount is forecast here. The backend must complete settlement and report availability before a request can be made.</p>
      </section>

      <section aria-labelledby="activity-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Ledger</p><h2 id="activity-heading">Recent recorded activity</h2></div><Link to="/mine/activity">Full activity ledger</Link></div>
        <ActivityPreview activities={recentActivities} />
      </section>
    </main>
  );
};

/** Displays one owned tool with its operating state, countdown, capacity, and eligible restart action. */
function ToolRow({ tool, miningLive, serverNowMs, onMaintain, maintaining }: {
  tool: PseStateTool; miningLive: boolean; serverNowMs: number; onMaintain: (id: string) => void; maintaining: boolean;
}) {
  const definition = toolDef(tool);
  const tier = toolDef(tool)?.id ?? 'starter';
  const cycle = cycleStateView(tool.cycleState || tool.status);
  const continuous = (tool.operatingModel || definition?.operating?.model) === 'continuous';
  const running = tool.cycleState === 'active' && miningLive;
  const remaining = running && !continuous ? remainingFrom(tool.cycleEndsAt, serverNowMs) : null;
  const restartEta = tool.cycleState === 'restarting' ? remainingFrom(tool.restartResumesAt, serverNowMs) : null;
  const needsAction = miningLive && !continuous && (tool.maintenanceRequired === true || tool.cycleState === 'cycle_complete' || tool.cycleState === 'maintenance_required');
  const statusText = remaining ? `Active · session ends in ${remaining.text}`
    : restartEta ? `Restarting${restartEta.ms > 0 ? ` · resumes in ${restartEta.text}` : ''}`
      : continuous ? (miningLive ? 'Active · continuous operation' : 'Idle · campaign not active')
        : miningLive && cycle.live ? 'Active · accruing hourly' : cycle.label;

  return (
    <article className="pm-tool-ledger-row">
      <PSEMineToolVisual tier={tier} size="compact" />
      <div><h3>{toolName(tool)}</h3><p>{cycle.description}</p></div>
      <div><span className="pm-micro">Status</span><strong>{statusText}</strong></div>
      <div><span className="pm-micro">Capacity</span><strong>{gbpRate(toolRate(tool))}</strong></div>
      {needsAction && <button type="button" onClick={() => onMaintain(tool.id)} disabled={maintaining}>{maintaining ? 'Restarting…' : 'Restart session'}</button>}
    </article>
  );
}

/** Renders the supplied activity records as a compact ledger, preferring minor-unit amounts when present. */
function ActivityPreview({ activities }: { activities: ReturnType<typeof usePseState>['activities'] }) {
  if (activities.length === 0) return <div className="pm-empty"><p>No backend activity records yet. Purchases, referral qualifications and campaign milestones appear when recorded.</p></div>;
  return (
    <div className="pm-ledger-wrap">
      <table className="pm-ledger">
        <thead><tr><th>When</th><th>Event</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>{activities.map(activity => {
          const amount = typeof activity.amountMinor === 'number' ? activity.amountMinor / 100 : activity.amountGBP;
          return <tr key={activity.id}><td>{timeAgo(activity.createdAt)}</td><td>{activity.title || 'Account event'}</td><td>{activity.type || '—'}</td><td className="pm-amount">{amount == null ? '—' : gbp(amount)}</td><td>Recorded</td></tr>;
        })}</tbody>
      </table>
    </div>
  );
}

export default PSEMineDashboard;
