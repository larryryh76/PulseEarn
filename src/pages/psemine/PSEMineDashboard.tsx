import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import {
  campaignStatusView, cycleStateView, gbp, gbpHour, nowMs, remainingFrom, timeAgo,
} from '../../components/psemine/pseCore';
import { CapacityInstrument } from '../../components/psemine/PseInstruments';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFact, PseFacts, PseFeedNotice,
  PseLoading, PseNotice, PsePage, PseSection, PseSplit, PseStack,
} from '../../components/psemine/PseBasics';

/**
 * The mining dashboard.
 *
 * WHAT IT ANSWERS, in the order a miner asks it:
 *
 *   What is happening?     the mining state, in one sentence
 *   What am I earning?     ONE figure — accrued this campaign — and the rate behind it
 *   What is my capacity?   tools + qualified referrals = the hourly rate, drawn as an instrument
 *   What do I own?         the equipment list, with the next event on each tool
 *   Where is my money?     accrued → approved → paid, and the campaign window it settles in
 *   What has happened?     the most recent records, with the full ledger one link away
 *
 * COMPOSITION RULE: one dominant figure, one instrument, two lists. The earlier
 * version gave every register the same 11px mono label and the same weight, which
 * is why it read as a wall of ledgers however correct its figures were.
 *
 * Everything shown is the backend's. Capacity is scaled against the campaign's
 * true ceiling; accrual separates accrued from settlement-available; the equipment
 * list only offers a restart when a restart can actually succeed. No figure is
 * estimated in the browser and no empty collection is given a record to fill it.
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
const DAY_MS = 86_400_000;

export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool, pseUser, purchases, payouts } = usePSEMine();
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
      <div className="pse-console-main">
        <PseLoading label="Loading your mining account" />
      </div>
    );
  }

  const user = state?.user;

  if (error || !state || !user) {
    return (
      <div className="pse-console-main">
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

  /* Campaign time, from the backend's own window — never invented. */
  const campaignStartMs = state.campaign?.startAt ? new Date(state.campaign.startAt).getTime() : NaN;
  const campaignEndMs = state.campaign?.endAt ? new Date(state.campaign.endAt).getTime() : NaN;
  const durationDays = state.campaign?.durationDays ?? PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS;
  const dayIndex = Number.isFinite(campaignStartMs)
    ? Math.min(durationDays, Math.max(1, Math.floor((nowMs() - campaignStartMs) / DAY_MS) + 1))
    : null;

  /**
   * The single answer to "is mining active?" — derived from backend state only.
   * `tone` is the state's severity, not its colour: the layer paints it.
   */
  const miningState = (() => {
    if (isMiningLive && tools.length === 0) {
      return { label: 'No capacity yet', tone: 'hold' as const, detail: 'Nothing is accruing. A tool adds capacity to this account.' };
    }
    if (isMiningLive && needsMaintenance.length > 0) {
      return {
        label: 'Partially interrupted',
        tone: 'hold' as const,
        detail: `${needsMaintenance.length} tool${needsMaintenance.length === 1 ? '' : 's'} finished a mining session and stopped accruing. Restart them to resume.`,
      };
    }
    if (isMiningLive && restartingTools.length > 0 && activeTools.length === 0) {
      return {
        label: 'Restarting',
        tone: 'idle' as const,
        detail: `${restartingTools.length} tool${restartingTools.length === 1 ? '' : 's'} restarting. Mining resumes at the backend-scheduled time; nothing accrues until then.`,
      };
    }
    if (isMiningLive && activeTools.length > 0) {
      return { label: 'Mining', tone: 'good' as const, detail: `${activeTools.length} tool${activeTools.length === 1 ? '' : 's'} operating and accruing on schedule.` };
    }
    if (isMiningLive) {
      return { label: 'Mining idle', tone: 'idle' as const, detail: 'No tool is currently mining — sessions are complete, restarting, or awaiting a restart.' };
    }
    return { label: view.label, tone: 'idle' as const, detail: view.detail };
  })();

  const checkpointEarned = typeof state.checkpoint?.earnedMinor === 'number' ? state.checkpoint.earnedMinor : 0;
  const purchaseOpen = state.campaign?.purchaseEnabled !== false;
  const awaitingPurchases = purchases.filter(p => p.status === 'awaiting_payment').length;
  const latestPurchase = purchases[0] ?? null;
  const referralSlots = Math.max(0, PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS - referralQualified);

  /**
   * Settlement position, read from the account rather than assumed:
   * 0 accrued (nothing finalised) · 1 approved and available · 2 paid.
   * Only the backend moves this forward, so the scale never claims progress.
   */
  /**
   * The four states a campaign balance passes through, and where THIS account is.
   * Stage 0 is reached while the account accrues; the later stages are read from
   * the backend's payout records, so the scale never claims progress the account
   * has not been granted. A payout leaves 'paid' only when its own status says so.
   */
  const payoutStatuses = payouts.map(p => String(p.status));
  const settlementStages = [
    { label: 'Accruing while mining is live', reached: isMiningLive || (user.accruedGBP ?? 0) > 0 },
    { label: 'Final approved once settlement runs', reached: payouts.length > 0 },
    { label: 'Payout processing', reached: payoutStatuses.some(s => s === 'pending' || s === 'under_review' || s === 'approved' || s === 'processing') },
    { label: 'Paid to your payout wallet', reached: payoutStatuses.includes('paid') },
  ];
  /** Where the balance is standing, in the words the reader would use. */
  const currentStageLabel = [...settlementStages].reverse().find(s => s.reached)?.label ?? settlementStages[0].label;

  return (
    <PsePage
      title="Dashboard"
      objective={
        dayIndex
          ? `Campaign day ${dayIndex} of ${durationDays} · ${view.label}`
          : `Campaign ${view.label}`
      }
      actions={<PseButton variant="secondary" onClick={() => void refresh()} busy={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      {/* ── WHERE THE ACCOUNT STANDS ─────────────────────────────────────── */}
      <section className="pse-verdict">
        <div className="pse-verdict-head">
          <span className="pse-chip" data-tone={miningState.tone}>
            <span className="pse-chip-dot" aria-hidden="true" />
            Mining
          </span>
          <h2 className="pse-verdict-title" role="status" aria-live="polite">
            {miningState.label}
          </h2>
        </div>
        <p className="pse-verdict-note">{miningState.detail}</p>

        {(!purchaseOpen || awaitingPurchases > 0) && (
          <div className="pse-verdict-foot">
            <div className="grid w-full gap-2">
              {!purchaseOpen && (
                <PseNotice tone="attention">
                  Tool purchases are closed while the campaign is {view.label.toLowerCase()}. Existing tools keep their
                  recorded capacity and their recorded accrual.
                </PseNotice>
              )}
              {awaitingPurchases > 0 && (
                <PseNotice tone="attention">
                  {awaitingPurchases} purchase{awaitingPurchases === 1 ? '' : 's'} awaiting payment.{' '}
                  <Link to="/mine/tools" className="pse-link">Continue on the tools page</Link>.
                </PseNotice>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── THE FIGURE ───────────────────────────────────────────────────── */}
      <section className="pse-lead" aria-labelledby="pse-lead-label">
        <span className="pse-lead-label" id="pse-lead-label">Accrued this campaign</span>
        <p className="pse-lead-figure">
          {gbp(user.accruedGBP)}
        </p>
        <p className="pse-lead-rate">
          Accruing at <b>{gbpHour(totalCapacity)}</b>
          {isMiningLive ? ' while mining is live' : ` while the campaign is ${view.label.toLowerCase()}`}
          {activeTools.length > 0 && <> · {activeTools.length} of {tools.length} tools operating</>}
        </p>
        <dl className="pse-lead-facts">
          <div className="pse-lead-fact">
            <dt>Accrued, not yet withdrawable</dt>
            <dd>{gbp(user.accruedGBP)}</dd>
          </div>
          <div className="pse-lead-fact">
            <dt>Settlement-available</dt>
            <dd>{availableStr}</dd>
          </div>
          <div className="pse-lead-fact">
            <dt>Payout wallet</dt>
            <dd>{user.payoutWallet ? 'Set' : 'Not set'}</dd>
          </div>
          <div className="pse-lead-fact">
            <dt>Capacity</dt>
            <dd>{gbpHour(totalCapacity)}</dd>
          </div>
        </dl>
        <p className="pse-lead-note">
          Accrued and settlement-available are different accounting states: accrued earnings become withdrawable only
          after the campaign ends and the backend finalises settlement.{' '}
          {user.payoutWallet
            ? <Link to="/mine/wallet" className="pse-link">Manage the payout wallet</Link>
            : <Link to="/mine/wallet" className="pse-link">Set a payout wallet to receive settlement</Link>}
          .
        </p>
      </section>

      <PseSplit>
        <PseStack>
          {/* ── CAPACITY ─────────────────────────────────────────────────── */}
          <PseSection
            title="Capacity"
            meta={`${gbpHour(toolCapacity)} tools + ${gbpHour(referralCapacity)} referrals`}
          >
            <CapacityInstrument
              ceiling={PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
              units={toolCapacity}
              referrals={referralCapacity}
              unitLabel="Tool capacity"
              referralLabel="Referral capacity"
              totalLabel="Total capacity"
              scale
            />
            <p className="pse-block-note">
              Scaled against the campaign maximum of {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.
              Capacity is the hourly rate this account produces while mining is live.
            </p>
          </PseSection>

          {/* ── EQUIPMENT ────────────────────────────────────────────────── */}
          <PseSection title="Equipment" meta={`${tools.length} owned`}>
            {!isMiningLive && needsMaintenance.length > 0 && (
              <PseNotice tone="attention">
                {needsMaintenance.length} tool{needsMaintenance.length === 1 ? '' : 's'} finished a mining session, but
                mining is not live ({view.label.toLowerCase()}) — restarts are closed until the campaign is active again.
              </PseNotice>
            )}
            {tools.length === 0 ? (
              <PseEmptyNote
                glyph="activate"
                title="No tools yet"
                action={
                  purchaseOpen ? (
                    <Link to="/mine/tools" className="pse-btn pse-btn--secondary pse-btn--sm">
                      Browse the tool catalogue
                    </Link>
                  ) : undefined
                }
              >
                {purchaseOpen
                  ? 'A tool is bought with BNB from your own wallet. When the purchase activates, its hourly capacity is added to this account and it starts accruing.'
                  : 'Purchases are closed for the current campaign status, so no tool can be acquired right now. Existing tools keep their recorded capacity.'}
              </PseEmptyNote>
            ) : (
              <ul className="pse-equip">
                {tools.map(tool => {
                  const def = toolDef(tool);
                  const cycle = cycleStateView(tool.cycleState || tool.status);
                  const continuous = (tool.operatingModel || def?.operating?.model) === 'continuous';
                  const running = tool.cycleState === 'active' && isMiningLive;
                  const remaining = running && !continuous ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;
                  const restartEta = tool.cycleState === 'restarting' ? remainingFrom(tool.restartResumesAt, nowMs()) : null;
                  // Restart is only offered while mining is actually live: a restart
                  // prompt during a paused or settled campaign is a dead end.
                  const canMaintain = isMiningLive && (
                    tool.maintenanceRequired === true
                    || tool.cycleState === 'cycle_complete'
                    || tool.cycleState === 'maintenance_required'
                  );
                  const next = continuous
                    ? 'Continuous duty while the campaign is live'
                    : remaining
                      ? `Session #${(tool.cycleIndex ?? 0) + 1} ends in ${remaining.text}`
                      : restartEta && restartEta.ms > 0
                        ? `Next session resumes in ${restartEta.text}`
                        : cycle.description;
                  return (
                    <li className="pse-equip-row" key={tool.id}>
                      <div className="pse-equip-id">
                        <span className="pse-equip-name">{toolName(tool)}</span>
                        <span className="pse-equip-rate">{gbpHour(toolRate(tool))}</span>
                        <span className="pse-equip-next">{next}</span>
                      </div>
                      <div className="pse-equip-side">
                        <span className="pse-chip" data-tone={canMaintain ? 'hold' : running ? 'good' : 'idle'}>
                          <span className="pse-chip-dot" aria-hidden="true" />
                          {cycle.label}
                        </span>
                        {canMaintain ? (
                          <PseButton
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleMaintain(tool.id)}
                            busy={maintaining.has(tool.id)}
                          >
                            {maintaining.has(tool.id) ? 'Restarting…' : 'Restart'}
                          </PseButton>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="pse-headroom">
              {Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder).map(t => (
                <div className="pse-headroom-cell" key={t.id}>
                  <span className="pse-headroom-key">{t.name} · {gbpHour(t.hourlyRateGBP)}</span>
                  <span className="pse-headroom-val">{counts?.[t.id] ?? 0} / {t.maxPerUser}</span>
                </div>
              ))}
            </div>

            <p className="pse-block-note">
              {latestPurchase
                ? <>Last purchase: {latestPurchase.toolName || latestPurchase.toolId} · {timeAgo(latestPurchase.createdAt)}. Full record in <Link to="/mine/activity" className="pse-link">activity</Link>.</>
                : <>No purchases on this account yet. Session tools stop accruing when a session ends until they are restarted; Elite runs continuously while the campaign is active.</>}
            </p>
          </PseSection>
        </PseStack>

        <PseStack>
          {/* ── SETTLEMENT ───────────────────────────────────────────────── */}
          <PseSection title="Settlement" meta="Where the money goes">
            <PseFacts cols={1}>
              <PseFact label="Accrued this campaign" value={gbp(user.accruedGBP)} />
              <PseFact label="Settlement-available" value={availableStr} />
              <PseFact label="Checkpoint accrued" value={gbp(checkpointEarned / 100)} />
              <PseFact label="Payout wallet" value={user.payoutWallet ? 'Set' : 'Not set'} text />
            </PseFacts>
            <ol className="pse-checks">
              {settlementStages.map((stage, i) => (
                <li className="pse-checks-item" key={stage.label}>
                  <span className="pse-checks-mark" aria-hidden="true">
                    {stage.reached ? '\u2713' : i + 1}
                  </span>
                  <span>{stage.label}</span>
                </li>
              ))}
            </ol>
            <p className="pse-block-note">
              Right now: {currentStageLabel.toLowerCase()}.{' '}
              {Number.isFinite(campaignEndMs)
                ? <>Campaign ends {new Date(campaignEndMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ({remainingFrom(state.campaign?.endAt, nowMs()).text} remaining). </>
                : null}
              Settlement is finalised by the backend after mining ends; it is never derived in the browser.{' '}
              <Link to="/mine/wallet" className="pse-link">Payout policy and wallet</Link>.
            </p>
          </PseSection>

          {/* ── REFERRALS ────────────────────────────────────────────────── */}
          <PseSection
            title="Referrals"
            meta={`${referralQualified} of ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} qualified`}
          >
            <PseFacts cols={1}>
              <PseFact label="Referral capacity" value={gbpHour(referralCapacity)} />
              <PseFact label="Each qualified referral" value={gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} />
              <PseFact label="Slots remaining" value={`${referralSlots}`} />
            </PseFacts>
            <p className="pse-block-note">
              Only qualified referrals add capacity, and only from the moment they qualify.{' '}
              <Link to="/mine/referrals" className="pse-link">Open referrals</Link>.
            </p>
          </PseSection>

          <RecentRecords />
        </PseStack>
      </PseSplit>
    </PsePage>
  );
};

/** The most recent account records — the same feed the ledger page reads in full. */
const RecentRecords: React.FC = () => {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const recent = activities.slice(0, 5);

  return (
    <PseSection
      title="Recent records"
      meta={
        <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('activities')} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
      {feedErrors.activities && (
        <PseFeedNotice
          message="The activity feed could not be refreshed."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}
      {recent.length === 0 ? (
        <PseEmptyNote glyph="audit" title="No activity recorded yet">
          Purchases, restarts, referral qualifications and campaign milestones appear here as the backend records them —
          never before.
        </PseEmptyNote>
      ) : (
        <ul className="pse-feed">
          {recent.map(a => {
            const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
            const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
            const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;
            return (
              <li className="pse-feed-row" key={a.id}>
                <div>
                  <p className="pse-feed-title">{a.title || 'Account event'}</p>
                  <p className="pse-feed-meta">
                    {a.description ? `${a.description} · ` : ''}{timeAgo(a.createdAt)}
                  </p>
                </div>
                <span className="pse-feed-amount">
                  {displayAmount !== null && displayAmount !== 0
                    ? `${displayAmount > 0 ? '+' : '−'}${gbp(Math.abs(displayAmount))}`
                    : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="pse-block-note">
        <Link to="/mine/activity" className="pse-link">Open the full activity ledger</Link>
      </p>
    </PseSection>
  );
};

export default PSEMineDashboard;
