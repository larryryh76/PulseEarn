import '../../styles/psemine-dashboard.css';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, gbp, gbpHour, shortAddr, timeAgo, toDateSafe,
  useCampaignClock,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseNotice,
  PseOwnedUnit, PseSkeleton, PseSkeletonRows, PseStatus,
} from '../../components/psemine/PseBasics';

/** Campaign date, printed short so the register head stays on one line. */
function dateLabel(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', year: 'numeric' });
}

/** The tone is a statement about the campaign, not decoration. */
function campaignTone(status: string | null): 'good' | 'hold' | 'idle' {
  if (status === 'active') return 'good';
  if (status === 'paused' || status === 'settling' || status === 'payout') return 'hold';
  return 'idle';
}

/**
 * PSEMine Dashboard — the account overview.
 *
 * OWNERSHIP IS THE AXIS OF THIS PAGE. The equipment register is built only from
 * `state.tools`, the backend's projection of this account's ownership records.
 * No catalogue entry, price, or purchase attempt is ever rendered as equipment.
 * An account with no ownership records gets an honest empty register and one
 * route to the marketplace — never a list of products it could buy, and never a
 * "Manage" action for something it does not own.
 *
 * Financial labels are exact: the dominant figure is ACCRUED (campaign earnings,
 * not withdrawable); settlement-available is stated separately from the backend's
 * own `availableMinor` and never promoted to the hero position.
 *
 * Every other value is read from the canonical `/api/mine/state` response or the
 * real activity / withdrawal feeds. Where the backend has not reported a value,
 * the page prints an em dash and says so rather than filling the gap.
 */
export const PSEMineDashboard: React.FC = () => {
  const {
    state, campaignStatus, loading, error, refresh, refreshing,
    activities, withdrawals, feedErrors, refreshFeed,
  } = usePseState();
  const { maintainTool } = usePSEMine();
  const availableStr = useAvailableGBP();
  const [restarting, setRestarting] = useState<string | null>(null);

  const user = state?.user;
  const ownedTools = useMemo(() => state?.tools ?? [], [state?.tools]);

  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const campaignView = campaignStatusView(campaignStatus);
  const knownStatus = campaignStatus !== null;
  const campaignDatesKnown = clock.startMs !== null && clock.endMs !== null;

  const accruedLabel = typeof user?.accruedGBP === 'number' && Number.isFinite(user.accruedGBP)
    ? gbp(user.accruedGBP)
    : '—';
  const toolCapacity = typeof user?.toolCapacityGBPPerHour === 'number' ? user.toolCapacityGBPPerHour : null;
  const referralCapacity = typeof user?.referralCapacityGBPPerHour === 'number' ? user.referralCapacityGBPPerHour : null;
  const totalCapacity = typeof user?.totalCapacityGBPPerHour === 'number'
    ? user.totalCapacityGBPPerHour
    : toolCapacity !== null
      ? toolCapacity + (referralCapacity ?? 0)
      : null;

  const qualifiedCount = typeof user?.qualifiedReferralsCount === 'number'
    ? user.qualifiedReferralsCount
    : null;
  const ownedCount = ownedTools.length;
  const pendingPurchases = state?.pendingPurchases ?? [];
  const pendingPaymentOrder = pendingPurchases.find(order =>
    ['created', 'awaiting_payment', 'transaction_submitted', 'confirming', 'underpaid', 'manual_review'].includes(String(order.status))
  ) ?? null;
  const activeCount = ownedTools.filter(t => (t.cycleState || t.status) === 'active').length;
  const payoutWallet = user?.payoutWallet ?? null;
  const pendingPayout = withdrawals.some(w => ['pending', 'under_review', 'processing'].includes(String(w.status)));

  const recentActivity = useMemo(
    () => [...activities]
      .sort((a, b) => (toDateSafe(b.createdAt)?.getTime() ?? 0) - (toDateSafe(a.createdAt)?.getTime() ?? 0))
      .slice(0, 4),
    [activities],
  );

  const postMining = campaignStatus === 'ended' || campaignStatus === 'settling'
    || campaignStatus === 'payout' || campaignStatus === 'closed' || campaignStatus === 'archived';

  // One actionable next step makes this an operations dashboard rather than a
  // page of repeated campaign facts. Priority is based on real account state.
  const nextAction = !payoutWallet
    ? { title: 'Set payout destination', detail: 'Add the wallet that should receive eligible settlements.', to: '/mine/wallet', label: 'Set up wallet' }
    : ownedCount === 0
      ? { title: 'Add your first tool', detail: 'Your equipment register is empty.', to: '/mine/tools', label: 'Browse tools' }
      : postMining
        ? { title: 'Review settlement', detail: 'The campaign is in its settlement or closed phase.', to: '/mine/wallet', label: 'View wallet' }
        : { title: 'Monitor equipment', detail: ownedCount ? (activeCount + ' of ' + ownedCount + ' owned units currently operating.') : 'No equipment owned.', to: '/mine/tools', label: 'Manage tools' };

  const campaignPosition = campaignDatesKnown
    ? clock.dayNumber !== null
      ? `Day ${clock.dayNumber} of ${clock.totalDays}${clock.daysLeft !== null ? ` · ${clock.daysLeft} day${clock.daysLeft === 1 ? '' : 's'} left` : ''}`
      : postMining
        ? `Window closed ${dateLabel(clock.endMs)}`
        : campaignStatus === 'scheduled'
          ? `Opens ${dateLabel(clock.startMs)}`
          : `Window ${dateLabel(clock.startMs)} — ${dateLabel(clock.endMs)}`
    : null;

  const restart = async (ownershipId: string) => {
    setRestarting(ownershipId);
    try {
      const res = await maintainTool(ownershipId);
      if (!res.success) return;  // the provider reports the backend's reason
      await refresh();
    } finally {
      setRestarting(null);
    }
  };

  /* THE HEAD IS REAL BEFORE THE FIGURES ARE. The shell, the campaign status and
     the page's own title are already known at mount, so the account's structure
     is drawn with skeletons in the exact places its figures will land. This
     replaces a centred loader that hid the page it was loading. */
  if (!state && (loading || error)) {
    return (
      <div className="pse-console-main pse-route-dashboard pse-dash">
        <header className="pse-dash-head">
          <div className="pse-dash-head-id">
            <p className="pse-eyebrow">Mining account</p>
            <h1 className="pse-dash-title">Account overview</h1>
          </div>
          <div className="pse-dash-head-side">
            <PseStatus tone={knownStatus ? campaignTone(campaignStatus) : 'idle'}>
              {knownStatus ? campaignView.label : 'Reading campaign'}
            </PseStatus>
            <span className="pse-dash-head-note">
              {knownStatus ? campaignPosition ?? 'Campaign dates not reported' : 'Reading the campaign window'}
            </span>
          </div>
        </header>

        {error ? (
          <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
        ) : (
          <>
            <section className="pse-account-band" aria-busy="true" aria-live="polite" role="status">
              <span className="sr-only">Loading your accrued balance and account figures</span>
              <div className="pse-account-main">
                <div className="pse-account-topline">
                  <PseSkeleton width="11rem" height="0.625rem" />
                  <PseSkeleton width="5rem" height="0.625rem" />
                </div>
                <PseSkeleton width="13rem" height="3.5rem" />
                <PseSkeleton width="20rem" height="0.75rem" />
                <div className="pse-account-bottom">
                  <div className="pse-account-available">
                    <PseSkeleton width="8rem" height="0.625rem" />
                    <PseSkeleton width="6rem" height="1.25rem" />
                  </div>
                  <div className="pse-account-actions">
                    <PseSkeleton width="8rem" height="2.5rem" />
                    <PseSkeleton width="7rem" height="2.5rem" />
                  </div>
                </div>
              </div>
              <aside className="pse-account-aside">
                <PseSkeleton width="6rem" height="0.625rem" />
                <PseSkeleton width="7rem" height="1.5rem" />
                <PseSkeleton width="9rem" height="1rem" />
                <PseSkeleton width="9rem" height="1rem" />
              </aside>
            </section>

            <dl className="pse-account-metrics" aria-label="Loading mining account metrics" aria-busy="true">
              {[0, 1, 2].map(i => (
                <div className="pse-account-metric" key={i}>
                  <PseSkeleton width="8ch" height="0.5rem" />
                  <PseSkeleton width="7ch" height="1.25rem" />
                  <PseSkeleton width="12ch" height="0.625rem" />
                </div>
              ))}
            </dl>

            {pendingPaymentOrder && (
        <PseNotice tone={Boolean(pendingPaymentOrder.reviewReason) || pendingPaymentOrder.status === 'manual_review' ? 'attention' : 'info'}
          title={pendingPaymentOrder.reviewRequired || pendingPaymentOrder.status === 'review' ? 'Payment needs review' : 'Checkout in progress'}>
          <p>
            {pendingPaymentOrder.reviewRequired || pendingPaymentOrder.status === 'review'
              ? 'A payment needs administrator reconciliation. Do not send another payment.'
              : pendingPaymentOrder.status === 'transaction_submitted' || pendingPaymentOrder.status === 'confirming'
                ? "We are checking your BNB Smart Chain transaction and confirmations. Please do not send another payment while this check is pending."
                : pendingPaymentOrder.status === 'underpaid'
                  ? 'The invoice reports an incomplete payment. Open the same tool checkout to review its current status.'
                  : 'You have a purchase waiting for payment. Resume the same purchase to avoid creating a duplicate order.'}
          </p>
          <Link className="pse-inline-link" to="/mine/tools">
            {pendingPaymentOrder.reviewRequired || pendingPaymentOrder.status === 'review' ? 'View tools and status' : 'Resume checkout'}
            <span aria-hidden="true"> →</span>
          </Link>
        </PseNotice>
      )}

      <div className="pse-dash-grid">
              <div className="pse-dash-col">
                <section className="pse-block" aria-busy="true">
                  <div className="pse-block-head">
                    <h2 className="pse-block-title">Your equipment</h2>
                    <span className="pse-block-meta">Reading ownership</span>
                  </div>
                  <PseSkeletonRows rows={2} label="Loading your equipment" />
                </section>
                <section className="pse-block" aria-busy="true">
                  <div className="pse-block-head">
                    <h2 className="pse-block-title">Recent activity</h2>
                    <span className="pse-block-meta">Reading the ledger</span>
                  </div>
                  <PseSkeletonRows rows={3} label="Loading recent activity" />
                </section>
              </div>
              <div className="pse-dash-col">
                <section className="pse-block" aria-busy="true">
                  <div className="pse-block-head">
                    <h2 className="pse-block-title">Campaign</h2>
                  </div>
                  <PseSkeletonRows rows={2} label="Loading the campaign register" />
                </section>
                <section className="pse-block" aria-busy="true">
                  <div className="pse-block-head">
                    <h2 className="pse-block-title">Settlement</h2>
                  </div>
                  <PseSkeletonRows rows={3} label="Loading settlement" />
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (error || !state || !user) return (
    <div className="pse-console-main">
      <PseErrorNotice
        error={error ?? { kind: 'data', title: 'Account unavailable', retryable: true, message: 'Please retry.' }}
        onRetry={() => void refresh()}
        retrying={refreshing}
      />
    </div>
  );

  return (
    <div className="pse-console-main pse-route-dashboard pse-dash">
      {/* A. ACCOUNT HEAD + CAMPAIGN STATUS — the context for every figure. */}
      <header className="pse-dash-head">
        <div className="pse-dash-head-id">
          <p className="pse-eyebrow">Mining account</p>
          <h1 className="pse-dash-title">Account overview</h1>
        </div>
        <div className="pse-dash-head-side">
          <PseStatus tone={knownStatus ? campaignTone(campaignStatus) : 'idle'}>
            {knownStatus ? campaignView.label : 'Reading campaign'}
          </PseStatus>
          <span className="pse-dash-head-note">
            {campaignPosition ?? 'Campaign dates not reported'}
          </span>
        </div>
      </header>

      {/* B + C. THE BALANCE, AND THE FEW FIGURES THAT OPERATE IT. */}
      <section className="pse-account-band" aria-labelledby="pse-balance-label">
        <div className="pse-account-main">
          <div className="pse-account-topline">
            <p className="pse-account-label" id="pse-balance-label">Total accrued earnings</p>
            <span className="pse-account-live"><span aria-hidden="true" />Live account</span>
          </div>
          <p className="pse-account-figure">{accruedLabel}</p>
          <div className="pse-account-bottom">
            <div className="pse-account-available">
              <span>Available to withdraw</span>
              <strong>{availableStr}</strong>
            </div>
            <div className="pse-account-actions">
              <Link to="/mine/wallet" className="pse-btn pse-btn--sm">
                {payoutWallet ? 'Open wallet' : 'Set up wallet'}
              </Link>
              <Link to="/mine/tools" className="pse-btn pse-btn--secondary pse-btn--sm">
                Explore tools
              </Link>
            </div>
          </div>
        </div>
        <aside className="pse-account-aside" aria-label="Recommended next action">
          <div className="pse-account-status">
            <span className="pse-account-aside-label">Next action</span>
            <span className="pse-account-action-mark" aria-hidden="true">↗</span>
          </div>
          <h2 className="pse-account-next-title">{nextAction.title}</h2>
          <p className="pse-account-next-detail">{nextAction.detail}</p>
          <Link to={nextAction.to} className="pse-account-next-link">
            {nextAction.label}<span aria-hidden="true"> →</span>
          </Link>
          <div className="pse-account-aside-foot">
            Campaign <strong>{knownStatus ? campaignView.label : 'status pending'}</strong>
            {campaignPosition ? <span> · {campaignPosition}</span> : null}
          </div>
        </aside>
      </section>

      <dl className="pse-account-metrics" aria-label="Mining account metrics">
        <div className="pse-account-metric">
          <dt>Mining capacity</dt>
          <dd>{totalCapacity !== null ? gbpHour(totalCapacity) : '—'}</dd>
          <dd className="pse-account-metric-note">
            {toolCapacity !== null ? `${gbpHour(toolCapacity)} equipment` : 'Equipment capacity not reported'}
            {referralCapacity !== null && referralCapacity > 0 ? ` · ${gbpHour(referralCapacity)} referrals` : ''}
          </dd>
        </div>
        <div className="pse-account-metric">
          <dt>Equipment owned</dt>
          <dd>{ownedCount}</dd>
          <dd className="pse-account-metric-note">
            {ownedCount === 0 ? 'No units owned' : `${activeCount} of ${ownedCount} operating`}
          </dd>
        </div>
        <div className="pse-account-metric">
          <dt>Qualified referrals</dt>
          <dd>{qualifiedCount !== null ? `${qualifiedCount} / ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}` : '—'}</dd>
          <dd className="pse-account-metric-note">
            {qualifiedCount === null
              ? 'Not reported by the backend'
              : qualifiedCount === 0
                ? 'No referral capacity yet'
                : `${gbpHour(qualifiedCount * PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} capacity`}
          </dd>
        </div>
      </dl>

      <div className="pse-dash-grid">
        <div className="pse-dash-col">
          {/* E. OWNED EQUIPMENT — only records this account owns. */}
          <section className="pse-block" aria-labelledby="pse-equipment-label">
            <div className="pse-block-head">
              <h2 className="pse-block-title" id="pse-equipment-label">Your equipment</h2>
              <span className="pse-block-meta">
                {ownedCount === 0 ? 'No units owned' : `${ownedCount} unit${ownedCount === 1 ? '' : 's'}`}
              </span>
            </div>

            {ownedCount === 0 ? (
              <div className="pse-eq-empty">
                <p className="pse-eq-empty-title">No mining equipment on this account</p>
                <p className="pse-eq-empty-note">
                  Your owned equipment and live capacity will appear here.
                </p>
                <div className="pse-eq-empty-actions">
                  <Link to="/mine/tools" className="pse-btn pse-btn--sm">Browse mining tools</Link>
                  <Link
                    to={{ pathname: '/mine/dashboard', search: '?guide=1' }}
                    className="pse-btn pse-btn--secondary pse-btn--sm"
                  >
                    How PSEmine works
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="pse-rowlist">
                {ownedTools.map(tool => {
                  const needsRestart = tool.cycleState === 'cycle_complete'
                    || tool.cycleState === 'maintenance_required';
                  return (
                    <PseOwnedUnit
                      key={tool.id}
                      tool={tool}
                      action={needsRestart ? (
                        <PseButton
                          variant="secondary"
                          size="sm"
                          onClick={() => void restart(tool.id)}
                          busy={restarting === tool.id}
                          disabled={restarting !== null}
                        >
                          {restarting === tool.id ? 'Requesting…' : 'Maintain & restart · Free'}
                        </PseButton>
                      ) : undefined}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          {/* F. RECENT ACTIVITY — real backend events only. */}
          <section className="pse-block" aria-labelledby="pse-activity-label">
            <div className="pse-block-head">
              <h2 className="pse-block-title" id="pse-activity-label">Recent activity</h2>
              <span className="pse-block-meta">
                <Link to="/mine/activity" className="pse-textlink">Full ledger</Link>
              </span>
            </div>

            {feedErrors.activities && (
              <PseFeedNotice
                message="The activity feed could not be read."
                onRetry={() => void refreshFeed('activities')}
                retrying={refreshing}
              />
            )}

            {recentActivity.length === 0 ? (
              <PseEmptyNote title="No activity yet">
                Purchases, referrals and payouts appear here.
              </PseEmptyNote>
            ) : (
              <ul className="pse-log pse-dash-activity">
                {recentActivity.map(a => {
                  const amount = typeof a.amountGBP === 'number' && Number.isFinite(a.amountGBP)
                    ? a.amountGBP
                    : null;
                  return (
                    <li key={a.id} className="pse-log-row">
                      <span className="pse-log-when">{timeAgo(a.createdAt)}</span>
                      <span className="pse-log-body">
                        <span className="pse-log-title">{a.title || 'Account event'}</span>
                        {a.description && <span className="pse-log-note">{a.description}</span>}
                        <span className="pse-log-meta">{a.type || 'event'}</span>
                      </span>
                      <span className={'pse-log-amount' + (amount !== null && amount > 0 ? ' is-credit' : '')}>
                        {amount === null
                          ? '—'
                          : `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${gbp(Math.abs(amount))}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="pse-dash-col">
          {/* D. CAMPAIGN — the backend's window and where today sits inside it. */}
          <section className="pse-block" aria-labelledby="pse-campaign-label">
            <div className="pse-block-head">
              <h2 className="pse-block-title" id="pse-campaign-label">Campaign</h2>
              {knownStatus && <PseStatus tone={campaignTone(campaignStatus)}>{campaignView.label}</PseStatus>}
            </div>

            {campaignDatesKnown ? (
              <div className="pse-campaign">
                <div className="pse-campaign-dates">
                  <span>{dateLabel(clock.startMs)} — {dateLabel(clock.endMs)}</span>
                  <span>{clock.daysLeft !== null ? `${clock.daysLeft} day${clock.daysLeft === 1 ? '' : 's'} remaining` : '—'}</span>
                </div>

                <div
                  className="pse-campaign-track"
                  role="progressbar"
                  aria-label="Campaign progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(clock.progress)}
                >
                  <div className="pse-campaign-fill" style={{ width: `${clock.progress}%` }} />
                </div>

                <div className="pse-phase-rail" aria-hidden="true">
                  {clock.phases.map(phase => (
                    <span key={phase.key} className="pse-phase-seg" data-state={phase.state} />
                  ))}
                </div>
                <ol className="pse-phase-labels" aria-label="Campaign phases">
                  {clock.phases.map(phase => (
                    <li
                      key={phase.key}
                      data-state={phase.state}
                      aria-current={phase.state === 'current' ? 'step' : undefined}
                    >
                      {phase.label}
                    </li>
                  ))}
                </ol>
                <p className="pse-phase-caption">
                  <strong>{clock.phases[clock.phaseIndex]?.label ?? 'Launch'}</strong>
                  <span>Phase {clock.phaseIndex + 1} of {clock.phases.length}</span>
                </p>

                <p className="pse-campaign-foot">
                  <span>{campaignPosition}</span>
                  <span>{clock.totalDays}-day window</span>
                </p>
              </div>
            ) : (
              <p className="pse-campaign-unavailable">
                Campaign dates will appear when available.
              </p>
            )}

          </section>

          {/* SETTLEMENT — the payout wallet, and what settlement has released. */}
          <section className="pse-block" aria-labelledby="pse-settlement-label">
            <div className="pse-block-head">
              <h2 className="pse-block-title" id="pse-settlement-label">Settlement</h2>
              <Link to="/mine/wallet" className="pse-textlink">Manage wallet</Link>
            </div>

            <div className="pse-settle">
              <div className="pse-settle-row">
                <span className="pse-settle-key">Payout wallet</span>
                <span className="pse-settle-val">
                  {payoutWallet ? shortAddr(payoutWallet) : 'Not set'}
                </span>
              </div>
              <div className="pse-settle-row">
                <span className="pse-settle-key">Settlement-available</span>
                <span className="pse-settle-val">{availableStr}</span>
              </div>
              <div className="pse-settle-row">
                <span className="pse-settle-key">Payout requests</span>
                <span className="pse-settle-val">
                  {pendingPayout ? 'One under review' : withdrawals.length > 0 ? `${withdrawals.length} recorded` : 'None recorded'}
                </span>
              </div>
            </div>

            <div className="pse-settle-actions">
              <Link to="/mine/wallet" className="pse-btn pse-btn--secondary pse-btn--sm">
                {payoutWallet ? 'Payout settings' : 'Set payout wallet'}
              </Link>
              {!payoutWallet && (
                <span className="pse-prose--sm">
                  Settlements are paid to this wallet only. It can be changed until the campaign reaches settlement.
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PSEMineDashboard;
