import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import {
  campaignStatusView, cycleStateView, gbp, gbpHour, nowMs, remainingFrom, timeAgo, toDateSafe,
  useCampaignClock,
} from '../../components/psemine/pseCore';
import { CampaignRail, CapacityInstrument } from '../../components/psemine/PseInstruments';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFact, PseFacts, PseFeedNotice,
  PseLoading, PseNotice, PsePage, PseSection, PseSplit, PseStack,
} from '../../components/psemine/PseBasics';

/**
 * The mining dashboard — the console's operational instrument.
 *
 * WHAT IT ANSWERS, in the order a miner asks it:
 *
 *   What is happening?     the mining state, in one sentence      → the verdict line
 *   What am I earning, and
 *   can I have it yet?     accrued vs settlement-available, and
 *                          the payout state, as a position       → the statement
 *   What is my capacity?   tools + qualified referrals → total     → the capacity rail
 *   How long is left?      the campaign window, from server dates   → the campaign rail
 *   What do I own?         the equipment register                   → the register
 *   What has happened?     the most recent records                  → the register
 *
 * COMPOSITION, and why it is in this order. Three movements, nothing between
 * them:
 *
 *   THE VERDICT     what is happening on the account right now, then what it is
 *                   worth and where the money stands: the accrued figure as the
 *                   one lead number on the page, beside settlement-available,
 *                   capacity and the payout state. Money first, because that is
 *                   the question the screen exists to answer.
 *   THE RAILS       exactly two instruments — one capacity, one campaign window.
 *                   The composition of the lead figure, and the clock it runs on.
 *   THE REGISTERS   the records behind those instruments: equipment, referrals,
 *                   recent activity. Reference, not headline.
 *
 * ONE OWNER PER FACT. There is deliberately ONE capacity visualization and ONE
 * campaign visualization on the page, and the shell's status band no longer draws
 * a rail of its own: the campaign's position is owned here, and the band is
 * reduced to context. An earlier version stated the campaign day in the shell
 * strip, again in the page objective and again in a settlement sentence — three
 * chances to disagree about one date. The page objective now names the page's job
 * rather than repeating a figure the statement already carries.
 *
 * A SCREEN, NOT A DOCUMENT. The page is three movements, not eleven stacked
 * registers, and the reference material that used to sit at the bottom of it is
 * one register plus the guide — a separate surface. Nothing here is prose that
 * could be read instead of the figures.
 *
 * Everything shown is the backend's. Capacity is scaled against the campaign's
 * true ceiling; accrual separates accrued from settlement-available; the equipment
 * register only offers a restart when a restart can actually succeed. No figure is
 * estimated in the browser, and no empty collection is given a record to fill it.
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

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

function shortDate(value: unknown): string {
  const date = toDateSafe(value);
  return date ? date.toLocaleDateString('en-GB', DATE_FORMAT) : '—';
}

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

  /* ONE campaign clock for the whole page, from the backend's own window. */
  const clock = useCampaignClock(state?.campaign, campaignStatus);
  /**
   * The day the page prints. `useCampaignClock` only numbers a day while the
   * campaign is live, which is right for a countdown and wrong for a closed
   * campaign: after the window has run, the campaign IS at its final day, and
   * saying "—" there would hide a fact the reader already has. Both branches read
   * the backend's window; neither is derived from a browser guess.
   */
  const campaignDay = clock.dayNumber
    ?? (clock.startMs !== null && clock.endMs !== null && nowMs() >= clock.endMs ? clock.totalDays : null);
  const campaignProgress = campaignDay === null
    ? null
    : Math.min(100, Math.max(0, (campaignDay / clock.totalDays) * 100));

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
      return { label: 'Mining active', tone: 'good' as const, detail: `${activeTools.length} of ${tools.length} tool${tools.length === 1 ? '' : 's'} operating and accruing on schedule.` };
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
  const campaignEndMs = clock.endMs;
  const remaining = remainingFrom(state.campaign?.endAt, nowMs());

  /**
   * The four states a campaign balance passes through, and where THIS account is.
   * Stage 0 is reached while the account accrues; the later stages are read from
   * the backend's payout records, so the scale never claims progress the account
   * has not been granted. A payout leaves 'paid' only when its own status says so.
   */
  const payoutStatuses = payouts.map(p => String(p.status));
  /**
   * WHERE THE MONEY IS, as one word and one qualifying line. Read from the
   * backend's own payout records, never from the campaign clock: a campaign that
   * has ended with no payout record has NOT been paid, and saying so would be the
   * product inventing a fact about someone's money. The latest record is the one
   * the reader cares about, so the note names it rather than summarising the set.
   */
  const payoutPosition = (() => {
    const latest = payouts[0] ?? null;
    const outstanding = payoutStatuses.some(s => s === 'pending' || s === 'under_review' || s === 'approved' || s === 'processing');
    if (outstanding) {
      return {
        label: 'In progress',
        note: latest ? `Latest payout ${latest.status.replace(/_/g, ' ')}` : 'A payout is with the backend',
        tone: 'hold' as const,
      };
    }
    if (payoutStatuses.includes('paid')) {
      return { label: 'Paid', note: 'Sent to your payout wallet', tone: 'good' as const };
    }
    if (payoutStatuses.includes('failed')) {
      return { label: 'Failed', note: 'The last payout did not complete', tone: 'bad' as const };
    }
    return isMiningLive
      ? { label: 'Not opened', note: 'Settlement opens after the campaign closes', tone: undefined }
      : { label: 'Awaiting settlement', note: 'No payout has been finalised yet', tone: undefined };
  })();
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
      objective="Your campaign position, capacity, and equipment."
      actions={
        <>
          <Link to="?guide=1" className="pse-btn pse-btn--secondary pse-btn--sm">How PSEmine works</Link>
          <PseButton variant="secondary" size="sm" onClick={() => void refresh()} busy={refreshing}>
            {refreshing ? 'Syncing…' : 'Sync'}
          </PseButton>
        </>
      }
    >
      {/* ═══ THE VERDICT — what is happening, what it is worth, where the money is ═══
        *
        * The first movement of the page, and the only one that is a panel: a
        * statement about money is a bounded document, so it is the one thing here
        * that earns a frame. Everything below it is a ruled register.
        *
        * The sentence comes before the figures, then the figures as one band. The
        * accrued balance leads because it is the number the whole campaign exists
        * to move, and it is the only oversized type on the page — which is what
        * makes the eye land in the right place before it reads anything else. */}
      <section className="pse-verdict" aria-labelledby="pse-verdict-title">
        <div className="pse-verdict-head">
          <span className="pse-chip" data-tone={miningState.tone}>
            <span className="pse-chip-dot" aria-hidden="true" />
            Mining
          </span>
          <h2 className="pse-verdict-title" id="pse-verdict-title" role="status" aria-live="polite">
            {miningState.label}
          </h2>
          <span className="pse-micro pse-verdict-meta">
            Campaign {view.label.toLowerCase()}
            {campaignDay === null ? '' : ` · day ${campaignDay} of ${clock.totalDays}`}
          </span>
        </div>
        <p className="pse-verdict-note">{miningState.detail}</p>

        {/* FOUR FIGURES, ONE BAND, EACH STATED ONCE.
          *
          * Accrued leads. Settlement-available sits beside it because the pair is
          * the whole point: accrued is what the campaign has produced, available is
          * what the backend has finalised and can be requested. Reading them
          * together is what stops the lead figure being read as withdrawable.
          *
          * Capacity is the composition of the lead figure and the payout state is
          * where the money actually stands, so the band is the whole account in one
          * row. The campaign day is stated once, in this panel's head, and the rail
          * below measures it — not three times, as an earlier draft did. */}
        <dl className="pse-verdict-facts">
          <div className="pse-verdict-fact" data-lead="true">
            <dt>Accrued this campaign</dt>
            <dd>{gbp(user.accruedGBP)}</dd>
            <dd>Not yet withdrawable</dd>
          </div>
          <div className="pse-verdict-fact">
            <dt>Settlement-available</dt>
            <dd>{availableStr}</dd>
            <dd>{user.payoutWallet ? 'Payable to your payout wallet' : 'Set a payout wallet'}</dd>
          </div>
          <div className="pse-verdict-fact">
            <dt>Mining capacity</dt>
            <dd>
              {gbpHour(totalCapacity).replace('/hour', '')}
              <span className="pse-verdict-unit">/hour</span>
            </dd>
            <dd>{`${gbpHour(toolCapacity)} tools + ${gbpHour(referralCapacity)} referrals`}</dd>
          </div>
          <div className="pse-verdict-fact">
            <dt>Payout state</dt>
            <dd>{payoutPosition.label}</dd>
            <dd>{payoutPosition.note}</dd>
          </div>
        </dl>

        {/* The two states that need the reader to act, and only those. A notice
            that fires when nothing is wrong is a notice nobody reads. */}
        {(!purchaseOpen || awaitingPurchases > 0) && (
          <div className="pse-verdict-foot">
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
        )}
      </section>

      {/* ═══ THE RAILS — the two instruments the statement is read against ═══
        *
        * Capacity explains the lead figure's composition; the campaign rail states
        * the clock it runs on. Exactly two, and this grid is what makes that a rule
        * of the composition rather than a convention someone can forget. */}
      <div className="pse-rails">
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
            totalLabel="Mining capacity"
            scale
          />
          <p className="pse-block-note">
            Tool capacity plus referral capacity is the mining capacity: the hourly rate this account produces while
            mining is live. Scaled against the campaign maximum of{' '}
            {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.
          </p>
        </PseSection>

        <PseSection title="Campaign" meta={view.label}>
          <CampaignRail
            progress={campaignProgress}
            markers={[
              { key: 'start', label: 'Start', value: shortDate(state.campaign?.startAt) },
              { key: 'current', label: 'Current day', value: campaignDay === null ? '—' : `${campaignDay} / ${clock.totalDays}`, current: campaignDay !== null },
              { key: 'end', label: 'End', value: shortDate(state.campaign?.endAt) },
            ]}
            note={
              <>
                {Number.isFinite(campaignEndMs)
                  ? <>Campaign ends {shortDate(state.campaign?.endAt)}, {remaining.text} remaining. </>
                  : <>The campaign window has not been reported by the backend yet. </>}
                Time is read from the backend's campaign window, not from this browser.
              </>
            }
          />
        </PseSection>
      </div>

      {/* ═══ THE REGISTERS — the records behind the statement ═══ */}
      <PseSplit>
        <PseStack>
          <PseSection
            title="Equipment"
            meta={`${tools.length} owned · ${gbpHour(toolCapacity)}`}
          >
            {!isMiningLive && needsMaintenance.length > 0 && (
              <PseNotice tone="attention">
                {needsMaintenance.length} tool{needsMaintenance.length === 1 ? '' : 's'} finished a mining session, but
                mining is not live ({view.label.toLowerCase()}) — restarts are closed until the campaign is active again.
              </PseNotice>
            )}
            {tools.length === 0 ? (
              <PseEmptyNote
                glyph="activate"
                title="No equipment yet"
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
                  const cycleRemaining = running && !continuous ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;
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
                    : cycleRemaining
                      ? `Session #${(tool.cycleIndex ?? 0) + 1} ends in ${cycleRemaining.text}`
                      : restartEta && restartEta.ms > 0
                        ? `Next session resumes in ${restartEta.text}`
                        : cycle.description;
                  return (
                    <li className="pse-equip-row" key={tool.id} data-running={running ? 'true' : undefined}>
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

            {/* The ownership register: how many of each tool this account holds,
                against the tier's real limit. Owned quantity is a fact about the
                account, so it is stated once, here. */}
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
          {/* Referrals are part of the capacity system, not a social list: what
              this account's referrals contribute to the mining rate above. */}
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

      {/* ═══ NOTES — what the figures mean, and what happens next ═══ */}
      <PseSection title="Settlement & payout" meta="Where the money goes">
        <PseFacts cols={2}>
          <PseFact label="Accrued this campaign" value={gbp(user.accruedGBP)} />
          <PseFact label="Settlement-available" value={availableStr} />
          <PseFact label="Checkpoint accrued" value={gbp(checkpointEarned / 100)} />
          <PseFact label="Payout wallet" value={user.payoutWallet ? 'Set' : 'Not set'} text />
        </PseFacts>

        <ol className="pse-checks">
          {settlementStages.map((stage, i) => (
            <li className="pse-checks-item" key={stage.label} data-state={stage.reached ? 'ok' : undefined}>
              <span className="pse-checks-mark" aria-hidden="true">
                {stage.reached ? '\u2713' : i + 1}
              </span>
              <span>{stage.label}</span>
            </li>
          ))}
        </ol>

        <p className="pse-block-note">
          Right now: {currentStageLabel.toLowerCase()}. Accrued and settlement-available are different accounting
          states: accrued earnings become withdrawable only after the campaign ends and the backend finalises
          settlement, and settlement is never derived in the browser.{' '}
          {user.payoutWallet
            ? <Link to="/mine/wallet" className="pse-link">Manage the payout wallet</Link>
            : <Link to="/mine/wallet" className="pse-link">Set a payout wallet to receive settlement</Link>}
          {' '}· <Link to="?guide=1" className="pse-link">How settlement and payout work</Link>.
        </p>
      </PseSection>
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
                <div className="min-w-0">
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
