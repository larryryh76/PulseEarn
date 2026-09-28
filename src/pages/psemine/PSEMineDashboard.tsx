import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import {
  campaignStatusView, cycleStateView, gbp, gbpHour, nowMs, remainingFrom, timeAgo,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseLoading, PseNotice,
  PsePage, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';

/**
 * The mining console — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger composition (verdict, rails, ledgers, stamps) was purged in
 * `refactor(psemine): purge legacy design implementation`. Every figure below is
 * still reported by the mining backend (`/api/mine/state`) and every constant
 * still comes from the locked economics; nothing is estimated in the browser.
 */
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
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseLoading label="Loading the mining console" />
      </div>
    );
  }

  const user = state?.user;

  if (error || !state || !user) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseErrorNotice
          error={error ?? {
            kind: 'data', title: "We couldn't load your mining account", retryable: true,
            message: 'The mining backend returned an incomplete account. Please retry.',
          }}
          onRetry={() => void refresh()}
          retrying={refreshing}
        />
      </div>
    );
  }

  const isMiningLive = campaignStatus === 'active';
  const toolCapacity = user.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user.totalCapacityGBPPerHour ?? 0;
  const referralQualified = user.qualifiedReferralsCount ?? 0;
  const counts = pseUser?.toolOwnershipCounts;
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
    return { label: view.label, detail: view.detail };
  })();

  const checkpointEarned = typeof state.checkpoint?.earnedMinor === 'number' ? state.checkpoint.earnedMinor : 0;
  const purchaseOpen = state.campaign?.purchaseEnabled !== false;
  const awaitingPurchases = purchases.filter(p => p.status === 'awaiting_payment').length;
  const latestPurchase = purchases[0] ?? null;

  return (
    <PsePage
      title="Mining console"
      objective="Campaign status, earnings and equipment — every figure below is reported by the mining backend."
      actions={<PseButton onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      <PseSection title="Mining state">
        <p className="text-sm font-semibold text-text-primary" role="status" aria-live="polite">{miningState.label}</p>
        <p className="text-sm text-text-secondary">{miningState.detail}</p>
        {!purchaseOpen && (
          <PseNotice tone="attention">Tool purchases are closed for this campaign status.</PseNotice>
        )}
        {awaitingPurchases > 0 && (
          <PseNotice tone="attention">
            {awaitingPurchases} purchase{awaitingPurchases === 1 ? '' : 's'} awaiting payment.{' '}
            <Link to="/mine/tools" className="underline">Continue on the tools page</Link>.
          </PseNotice>
        )}
      </PseSection>

      <PseSection title="Earnings and capacity">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {([
            ['Accrued (campaign)', gbp(user.accruedGBP)],
            ['Settlement-available', availableStr],
            ['Checkpoint accrued', gbp(checkpointEarned / 100)],
            ['Tool capacity', gbpHour(toolCapacity)],
            ['Referral capacity', gbpHour(referralCapacity)],
            ['Total capacity', gbpHour(totalCapacity)],
            ['Qualified referrals', `${referralQualified}`],
            // A missing payout wallet blocks settlement, so the prompt goes to the
            // page that can fix it instead of a dead end (merged from remote).
            ['Payout wallet', user.payoutWallet
              ? user.payoutWallet
              : <Link to="/mine/wallet" className="underline">Set your payout wallet</Link>],
          ] as Array<[string, React.ReactNode]>).map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-sm text-text-secondary">{k}</dt>
              <dd className="text-sm text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-text-tertiary">
          Settlement-available is the backend-reported figure only; accrued campaign earnings are not withdrawable until
          settlement finalises them.
        </p>
      </PseSection>

      <PseSection title="Your tools" meta={`${tools.length} owned`}>
        {!isMiningLive && needsMaintenance.length > 0 && (
          <PseNotice tone="attention">
            {needsMaintenance.length} tool{needsMaintenance.length === 1 ? '' : 's'} finished a mining session, but
            mining is not live ({view.label.toLowerCase()}) — restarts are closed until the campaign is active again.
          </PseNotice>
        )}
        {tools.length === 0 ? (
          <PseEmptyNote
            title="No tools yet"
            action={
              purchaseOpen ? (
                <Link to="/mine/tools" className="underline">
                  Browse the tool catalogue
                </Link>
              ) : undefined
            }
          >
            {purchaseOpen
              ? 'Capacity comes from tools. A tool is bought with BNB from your own wallet, and its hourly capacity is added to the account when the purchase activates.'
              : 'Purchases are closed for the current campaign status, so no tool can be acquired right now. Existing tools keep their recorded capacity.'}
          </PseEmptyNote>
        ) : (
          <PseTable head={['Tool', 'State', 'Rate', 'Session', 'Next event', 'Action']}>
            {tools.slice(0, 12).map(tool => {
              const def = toolDef(tool);
              const cycle = cycleStateView(tool.cycleState || tool.status);
              const continuous = (tool.operatingModel || def?.operating?.model) === 'continuous';
              const running = tool.cycleState === 'active' && isMiningLive;
              const remaining = running && !continuous ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;
              const restarting = tool.cycleState === 'restarting';
              const restartEta = restarting ? remainingFrom(tool.restartResumesAt, nowMs()) : null;
              // Restart is only offered while mining is actually live: a restart
              // prompt during a paused/settled campaign is a dead end (merged
              // from remote).
              const canMaintain = isMiningLive && (
                tool.maintenanceRequired === true
                || tool.cycleState === 'cycle_complete'
                || tool.cycleState === 'maintenance_required'
              );
              return (
                <PseRow key={tool.id}>
                  <PseCell>{toolName(tool)}</PseCell>
                  <PseCell>{cycle.label}</PseCell>
                  <PseCell>{gbpHour(toolRate(tool))}</PseCell>
                  <PseCell>
                    {continuous ? 'Continuous' : typeof tool.cycleIndex === 'number' ? `#${tool.cycleIndex + 1}` : '—'}
                  </PseCell>
                  <PseCell>
                    {remaining ? remaining.text : restartEta && restartEta.ms > 0 ? `resumes in ${restartEta.text}` : cycle.description}
                  </PseCell>
                  <PseCell>
                    {canMaintain ? (
                      <PseButton onClick={() => void handleMaintain(tool.id)} disabled={maintaining.has(tool.id)}>
                        {maintaining.has(tool.id) ? 'Restarting…' : 'Restart tool'}
                      </PseButton>
                    ) : '—'}
                  </PseCell>
                </PseRow>
              );
            })}
          </PseTable>
        )}
        <p className="text-xs text-text-tertiary">
          Session tools stop accruing when a session ends until they are restarted; Elite runs continuously while the
          campaign is active. Restart timing is derived by the backend.
        </p>
      </PseSection>

      <PseSection
        title="Tool ownership"
        meta={`Total capacity ceiling ${gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}`}
      >
        <PseTable head={['Tool', 'Owned', 'Limit', 'Capacity at limit', 'Operation']}>
          {Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder).map(t => (
            <PseRow key={t.id}>
              <PseCell>{t.name}</PseCell>
              <PseCell>{counts?.[t.id] ?? 0}</PseCell>
              <PseCell>{t.maxPerUser}</PseCell>
              <PseCell>{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</PseCell>
              <PseCell>{t.operating.model === 'continuous' ? 'Continuous' : 'Session — manual restart'}</PseCell>
            </PseRow>
          ))}
        </PseTable>
      </PseSection>

      <PseSection title="Latest purchase">
        {latestPurchase ? (
          <p className="text-sm text-text-secondary">
            {latestPurchase.toolName || latestPurchase.toolId || 'Tool'} · {latestPurchase.status} ·{' '}
            {timeAgo(latestPurchase.createdAt)}. The full record lives in <Link to="/mine/activity" className="underline">activity</Link>.
          </p>
        ) : (
          <PseEmptyNote
            title="No purchases on this account"
            action={
              <Link to="/mine/tools" className="underline">
                View the tool catalogue
              </Link>
            }
          >
            Nothing has been bought yet. A purchase appears here as soon as a BNB payment is verified against the chain
            and its tool is activated — and its whole history stays readable in activity.
          </PseEmptyNote>
        )}
      </PseSection>

      <ActivityFeed />
    </PsePage>
  );
};

/** Recent account records — the same backend activity feed the ledger read. */
const ActivityFeed: React.FC = () => {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const recent = activities.slice(0, 6);

  return (
    <PseSection
      title="Recent records"
      meta={<button type="button" className="underline" onClick={() => void refreshFeed('activities')}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>}
    >
      {feedErrors.activities && (
        <PseFeedNotice
          message="The activity feed could not be refreshed."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}
      {recent.length === 0 ? (
        <PseEmptyNote>
          No activity recorded yet. Tool purchases, maintenance events, referral qualifications and campaign milestones
          appear here as the backend records them.
        </PseEmptyNote>
      ) : (
        <ul className="space-y-1 text-sm">
          {recent.map(a => {
            const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
            const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
            const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
            return (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 border-b border-border py-1.5">
                <span className="text-text-primary">{a.title || 'Account event'}</span>
                <span className="text-xs text-text-tertiary">
                  {timeAgo(a.createdAt)}{a.type ? ` · ${a.type}` : ''}
                </span>
                {displayAmount !== null && displayAmount !== 0 && (
                  <span className="ml-auto text-text-primary">
                    {displayAmount > 0 ? '+' : '−'}{gbp(Math.abs(displayAmount))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm">
        <Link to="/mine/activity" className="underline">Open the full activity ledger</Link>
      </p>
    </PseSection>
  );
};

export default PSEMineDashboard;
