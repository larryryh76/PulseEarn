import '../../styles/psemine-dashboard.css';
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, gbp, gbpHour, shortAddr, timeAgo, useCampaignClock,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseLoading,
} from '../../components/psemine/PseBasics';

const ALL_TIERS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

/** Campaign date, printed short so the timeline head stays on one line. */
function dateLabel(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The chip tone is a statement about the campaign, not decoration. */
function statusTone(status: string | null): 'good' | 'hold' | 'idle' | undefined {
  if (status === 'active') return 'good';
  if (status === 'paused' || status === 'settling' || status === 'payout') return 'hold';
  if (status === 'ended' || status === 'closed' || status === 'archived') return 'idle';
  return undefined;
}

/**
 * PSEMine Dashboard — the account's working surface.
 *
 * One balance, one campaign register, one compact equipment register and the two
 * things that follow from them: settlement state and recent activity. Every
 * figure is read from `usePseState()` / `useAvailableGBP()`; nothing here invents
 * a balance, a rate or a history.
 */
export const PSEMineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    state, campaignStatus, loading, error, refresh, refreshing,
    activities, feedErrors, refreshFeed,
  } = usePseState();
  const availableStr = useAvailableGBP();

  const tools = useMemo(() => state?.tools ?? [], [state?.tools]);
  const user = state?.user;

  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const campaignView = campaignStatusView(campaignStatus);
  const knownStatus = campaignStatus !== null;

  const accruedLabel = typeof user?.accruedGBP === 'number' && Number.isFinite(user.accruedGBP)
    ? gbp(user.accruedGBP)
    : '—';
  const toolCapacity = user?.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user?.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = typeof user?.totalCapacityGBPPerHour === 'number'
    ? user.totalCapacityGBPPerHour
    : toolCapacity + referralCapacity;

  const qualifiedCount = user?.qualifiedReferralsCount ?? 0;
  const maxQualified = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;

  const ownedForTier = (tierId: string) => tools.filter(t => (t.toolId || '') === tierId);
  const lastActivity = activities.slice(0, 5);

  if (loading) return (
    <div className="pse-console-main">
      <div className="pse-loading-surface" role="status" aria-live="polite">
        <PseLoading label="Loading PSEmine account…" />
      </div>
    </div>
  );

  if (error || !state || !user) return (
    <div className="pse-console-main">
      <PseErrorNotice
        error={error ?? { kind: 'data', title: 'Account unavailable', retryable: true, message: 'Please retry.' }}
        onRetry={() => void refresh()}
        retrying={refreshing}
      />
    </div>
  );

  const postMining = campaignStatus === 'ended' || campaignStatus === 'settling'
    || campaignStatus === 'payout' || campaignStatus === 'closed' || campaignStatus === 'archived';
  const campaignFootnote = clock.dayNumber !== null
    ? `Day ${clock.dayNumber} of ${clock.totalDays}${clock.daysLeft !== null ? ` · ${clock.daysLeft} day${clock.daysLeft === 1 ? '' : 's'} left` : ''}`
    : postMining && clock.endMs !== null
      ? `Window closed ${dateLabel(clock.endMs)}`
      : campaignStatus === 'scheduled' && clock.startMs !== null
        ? `Opens ${dateLabel(clock.startMs)}`
        : clock.startMs !== null
          ? `Scheduled from ${dateLabel(clock.startMs)}`
          : 'Campaign dates not reported';

  return (
    <div className="pse-console-main pse-dash">
      <h1 className="sr-only">Mining account</h1>

      {/* STATUS: the campaign and the account's rate, stated once. */}
      <div className="pse-dash-strip">
        <div className="pse-dash-strip-left">
          <span className="pse-chip" data-tone={knownStatus ? statusTone(campaignStatus) : 'idle'}>
            <span className="pse-chip-dot" aria-hidden="true" />
            <span>{knownStatus ? campaignView.label : 'Reading campaign'}</span>
          </span>
          <span className="pse-dash-strip-note">
            {knownStatus ? campaignView.detail : 'Waiting for the campaign’s own status.'}
          </span>
        </div>

        <div className="pse-dash-capacity">
          <span className="pse-dash-capacity-label">Total capacity</span>
          <span className="pse-dash-capacity-value">{gbpHour(totalCapacity)}</span>
        </div>
      </div>

      <div className="pse-dash-grid">
        <div className="pse-dash-column">
          {/* BALANCE — the figure the page exists for. Accrual is not a payout:
              the settlement-available balance is stated separately, from the
              backend’s own field, and never relabelled. */}
          <section className="pse-dash-balance" aria-labelledby="pse-balance-label">
            <div className="pse-dash-balance-head">
              <div className="pse-dash-balance-figure">
                <h2 className="pse-kicker" id="pse-balance-label">Accrued balance</h2>
                <p className="pse-dash-amount">{accruedLabel}</p>
                <p className="pse-dash-caption">
                  Accrued while your units operate. Settlement finalises it before a payout can be requested.
                </p>
              </div>

              <div className="pse-dash-actions">
                <PseButton onClick={() => navigate('/mine/wallet')} variant="primary">Wallet</PseButton>
                <PseButton onClick={() => navigate('/mine/tools')} variant="secondary">Tools</PseButton>
              </div>
            </div>

            <div className="pse-dash-mining">
              <span className="pse-dash-mining-state" data-live={campaignStatus === 'active'}>
                <span className="pse-pulse-dot" aria-hidden="true" />
                {campaignStatus === 'active' ? 'Mining live' : knownStatus ? campaignView.label : 'Status pending'}
              </span>
              <span className="pse-dash-sep" aria-hidden="true" />
              <span className="pse-dash-mining-note">
                {qualifiedCount} of {maxQualified} referral{maxQualified === 1 ? '' : 's'} qualified
              </span>
            </div>

            <dl className="pse-dash-metrics">
              <div className="pse-dash-metric">
                <dt>Unit capacity</dt>
                <dd>{gbpHour(toolCapacity)}</dd>
              </div>
              <div className="pse-dash-metric">
                <dt>Referral capacity</dt>
                <dd>{gbpHour(referralCapacity)}</dd>
              </div>
              <div className="pse-dash-metric">
                <dt>Settlement-available</dt>
                <dd>{availableStr}</dd>
              </div>
            </dl>
          </section>

          {/* CAMPAIGN — the backend's window, and where today sits inside it. */}
          <section className="pse-dash-panel" aria-labelledby="pse-campaign-label">
            <div className="pse-dash-panel-head">
              <h2 className="pse-kicker" id="pse-campaign-label">Campaign</h2>
              <span className="pse-dash-panel-meta">
                {clock.startMs !== null && clock.endMs !== null
                  ? `${dateLabel(clock.startMs)} — ${dateLabel(clock.endMs)}`
                  : 'Dates not reported'}
              </span>
            </div>

            <div
              className="pse-dash-track"
              role="progressbar"
              aria-label="Campaign progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(clock.progress)}
            >
              <div className="pse-dash-track-fill" style={{ width: `${clock.progress}%` }} />
            </div>

            <div className="pse-dash-panel-foot">
              <span>{campaignFootnote}</span>
              <span className="pse-dash-panel-meta">{clock.startMs === null ? 'Awaiting schedule' : `${clock.totalDays}-day window`}</span>
            </div>
          </section>
        </div>

        <div className="pse-dash-column">
          {/* EQUIPMENT — one row per tier, so the fleet can be compared down the
              column instead of read one card at a time. */}
          <section className="pse-dash-panel" aria-labelledby="pse-equipment-label">
            <div className="pse-dash-panel-head">
              <h2 className="pse-kicker" id="pse-equipment-label">Equipment</h2>
              <Link to="/mine/tools" className="pse-dash-link">Manage tools</Link>
            </div>

            <ul className="pse-dash-equipment">
              {ALL_TIERS.map(tier => {
                const owned = ownedForTier(tier.id);
                const count = owned.length;
                const operating = owned.filter(t => t.cycleState === 'active').length;
                const hourly = tier.hourlyRateGBP * count;
                const stateLabel = count === 0
                  ? 'Not owned'
                  : operating === count
                    ? count === 1 ? 'Operating' : 'All operating'
                    : `${operating} of ${count} operating`;

                return (
                  <li key={tier.id} className="pse-dash-equipment-row">
                    <div className="pse-dash-equipment-id">
                      <Link to="/mine/tools" className="pse-dash-equipment-name">{tier.name}</Link>
                      <span className="pse-dash-equipment-note">
                        {count === 0 ? 'Not owned' : `${count} owned · ${stateLabel}`}
                      </span>
                    </div>
                    <div className="pse-dash-equipment-figs">
                      <span className="pse-dash-equipment-rate">{gbpHour(hourly)}</span>
                      <span className="pse-dash-equipment-sub">
                        {gbp(tier.purchasePriceGBP)} · {gbpHour(tier.hourlyRateGBP)} each
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="pse-dash-panel-note">
              The figure is the capacity of the units you own. The status says how many are operating;
              session units stop between sessions until restarted.
            </p>
          </section>

          {/* SETTLEMENT + LEDGER */}
          <section className="pse-dash-panel" aria-labelledby="pse-settlement-label">
            <div className="pse-dash-panel-head">
              <h2 className="pse-kicker" id="pse-settlement-label">Settlement</h2>
              <Link to="/mine/wallet" className="pse-dash-link">Manage wallet</Link>
            </div>

            <div className="pse-dash-settlement">
              <span className="pse-dash-settlement-state">
                {user.payoutWallet ? 'BEP-20 payout wallet connected' : 'No payout wallet set'}
              </span>
              <span className="pse-dash-settlement-addr">
                {user.payoutWallet ? shortAddr(user.payoutWallet) : 'Set one before the wallet cutoff'}
              </span>
            </div>

            <div className="pse-dash-ledger-head">
              <h3 className="pse-kicker">Recent activity</h3>
              <button
                type="button"
                className="pse-dash-link"
                onClick={() => void refreshFeed('activities')}
                disabled={refreshing}
              >
                Refresh
              </button>
            </div>

            {feedErrors.activities && (
              <PseFeedNotice
                message="The activity feed could not be refreshed."
                onRetry={() => void refreshFeed('activities')}
                retrying={refreshing}
              />
            )}

            {lastActivity.length > 0 ? (
              <ul className="pse-dash-ledger" aria-live="polite">
                {lastActivity.map(a => {
                  const hasAmount = typeof a.amountGBP === 'number' && Number.isFinite(a.amountGBP);
                  const amount = a.amountGBP ?? 0;
                  return (
                    <li key={a.id} className="pse-dash-ledger-row">
                      <div className="pse-dash-ledger-id">
                        <span className="pse-dash-ledger-desc">{a.title || a.type || 'Activity'}</span>
                        <span className="pse-dash-ledger-time">{timeAgo(a.createdAt)}</span>
                      </div>
                      <span className={'pse-dash-ledger-amt' + (hasAmount && amount > 0 ? ' is-credit' : '')}>
                        {hasAmount ? (amount > 0 ? `+${gbp(amount)}` : gbp(amount)) : '—'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <PseEmptyNote title="No recent activity">
                Purchases, referrals, maintenance and payouts appear here as the backend records them.
              </PseEmptyNote>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default PSEMineDashboard;
