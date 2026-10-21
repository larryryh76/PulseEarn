import '../../styles/psemine-dashboard.css';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  gbp, gbpHour, gbpRate, timeAgo, useCampaignClock,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice,
  PseLoading,
} from '../../components/psemine/PseBasics';

// Presentational helpers
import MiniSparkline from '../../components/psemine/MiniSparkline';
import CapacityRing from '../../components/psemine/CapacityRing';

const ALL_TIERS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

/** Campaign date, printed short so the timeline head stays on one line. */
function dateLabel(ms: number | null): string {
  if (ms === null) return '—';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Rebuilt PSEMine Dashboard — visual layer only. Preserves all business logic,
 * hooks and actions supplied by the providers. Mobile-first, compact, and
 * intentionally restrained.
 */
export const PSEMineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    state, campaignStatus, loading, error, refresh, refreshing,
    activities, feedErrors, refreshFeed,
  } = usePseState();
  const availableStr = useAvailableGBP();

  // Keeps relative timestamps in the activity ledger honest between state reads.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const tools = useMemo(() => state?.tools ?? [], [state?.tools]);
  const user = state?.user;

  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const campaignDay = clock.dayNumber ?? null;

  const isMiningLive = campaignStatus === 'active';

  const toolCapacity = user?.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user?.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = toolCapacity + referralCapacity;

  const ownedCountForTier = (tierId: string) => tools.filter(t => (t.toolId || '') === tierId).length;
  // Oldest → newest, so the sparkline reads left to right. Real amounts only.
  const activitySpark = activities.slice(0, 8).map(a => a.amountGBP ?? 0).reverse();
  const qualifiedCount = user?.qualifiedReferralsCount ?? 0;
  const maxQualified = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;

  // Dashboard must not carry a Guide button — the shell does that.

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
        error={error ?? { kind: 'data', title: "Account unavailable", retryable: true, message: 'Please retry.' }}
        onRetry={() => void refresh()}
        retrying={refreshing}
      />
    </div>
  );

  return (
    <div className="pse-console-main pse-dash">
      {/* STATUS STRIP: minimal, authoritative */}
      <div className="pse-status-strip">
        <div className="pse-status-strip-left">
          <span className="pse-chip" data-tone={isMiningLive ? 'good' : 'idle'}>
            <span className="pse-chip-dot" aria-hidden />
            <span className="pse-strip-label">{isMiningLive ? 'Active' : campaignStatus ?? 'Scheduled'}</span>
          </span>
          <span className="pse-status-strip-clock font-mono">{campaignDay !== null ? `Day ${campaignDay}` : 'Pre-launch'}</span>
        </div>

        <div className="pse-status-strip-right">
          <CapacityRing
            value={totalCapacity}
            max={PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR}
            size={52}
            label={gbpRate(totalCapacity)}
            ariaLabel={`Capacity ${gbpRate(totalCapacity)} of ${gbpRate(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}`}
          />
        </div>
      </div>

      {/* HERO: primary balance + compact metrics */}
      <section className="pse-hero-grid" aria-label="Primary workspace">
        <div className="pse-hero-left">
          <div className="pse-balance-card" aria-hidden={false}>
            <div className="pse-balance-head">
              <div>
                <div className="pse-kicker">Accrued balance</div>
                <div className="pse-balance-hero">
                  <div className="pse-balance-amount">{gbp(user.accruedGBP)}</div>
                  <div className="pse-balance-sub">GBP — accrues hourly</div>
                </div>
                <div className="pse-mining-meta">
                  <span className="pse-status-indicator"><span className="pse-pulse-dot" />{isMiningLive ? 'Mining' : 'Standby'}</span>
                  <span className="pse-dot-sep" />
                  <span className="pse-hourly">{gbpHour(totalCapacity)} / hr</span>
                </div>
              </div>

              <div className="pse-hero-actions">
                <PseButton onClick={() => navigate('/mine/wallet')} variant="primary">Wallet</PseButton>
                <PseButton onClick={() => navigate('/mine/tools')} variant="secondary">Tools</PseButton>
              </div>
            </div>

            <div className="pse-hero-foot">
              <div className="pse-hero-metrics">
                <div className="pse-metric"><div className="pse-metric-label">Tool</div><div className="pse-metric-val">{gbpHour(toolCapacity)}/hr</div></div>
                <div className="pse-metric"><div className="pse-metric-label">Referral</div><div className="pse-metric-val">{gbpHour(referralCapacity)}/hr</div></div>
                <div className="pse-metric"><div className="pse-metric-label">Referrals</div><div className="pse-metric-val">{qualifiedCount}/{maxQualified}</div></div>
                <div className="pse-metric"><div className="pse-metric-label">Available</div><div className="pse-metric-val">{availableStr}</div></div>
              </div>
              {activitySpark.length > 1 && (
                <div className="pse-hero-spark">
                  <MiniSparkline data={activitySpark} width={110} height={22} title="Recent activity amounts" />
                </div>
              )}
            </div>
          </div>

          <div className="pse-timeline-card" aria-label="Campaign timeline">
            <div className="pse-timeline-head">
              <div className="pse-kicker">Campaign</div>
              <div className="pse-timeline-dates">{dateLabel(clock.startMs)} — {dateLabel(clock.endMs)}</div>
            </div>
            <div className="pse-timeline-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clock.progress)}>
              <div className="pse-timeline-progress" style={{ width: `${clock.progress}%` }} />
            </div>
          </div>
        </div>

        <aside className="pse-hero-right" aria-label="Equipment and settlement">
          <div className="pse-equipment-grid" role="list">
            {ALL_TIERS.slice(0, 4).map(t => {
              const id = t.id;
              const count = ownedCountForTier(id as string);
              const hourly = (t.hourlyRateGBP || 0) * count;
              return (
                <div key={id} className="pse-equipment-tile" role="listitem" aria-label={t.name}>
                  <div className="pse-equipment-head">
                    <div className="pse-equipment-title">{t.name}</div>
                    <div className="pse-equipment-count">{count}</div>
                  </div>

                  <div className="pse-equipment-body">
                    <div className="pse-equipment-rate">{gbpHour(hourly)}</div>
                    <div className="pse-equipment-price">{gbp(t.purchasePriceGBP)}</div>
                  </div>

                  <div className="pse-equipment-foot">
                    <button className="pse-link" onClick={() => navigate('/mine/tools')}>Manage</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pse-settlement-card">
            <div className="pse-settlement-row">
              <div>
                <div className="pse-kicker">Settlement</div>
                <div className="pse-settlement-status">{user.payoutWallet ? 'BEP-20 wallet connected' : 'No wallet'}</div>
              </div>
              <div>
                <PseButton onClick={() => navigate('/mine/wallet')} variant="secondary">Manage</PseButton>
              </div>
            </div>

            <div className="pse-recent-activity">
              <div className="pse-recent-head">
                <div className="pse-kicker">Recent activity</div>
                <button
                  type="button"
                  className="pse-link"
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
              {activities.length > 0 ? (
                <ul className="pse-ledger" aria-live="polite">
                  {activities.slice(0, 5).map(a => (
                    <li key={a.id} className="pse-ledger-row">
                      <div>
                        <div className="pse-ledger-desc">{a.title || a.type || 'Activity'}</div>
                        <div className="pse-ledger-time">{timeAgo(a.createdAt)}</div>
                      </div>
                      <div className={"pse-ledger-amt " + ((a.amountGBP ?? 0) > 0 ? 'pos' : 'neg')}>
                        {typeof a.amountGBP === 'number' ? (a.amountGBP > 0 ? '+' + gbp(a.amountGBP) : gbp(a.amountGBP)) : '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <PseEmptyNote title="No recent activity">
                  Purchases, accrual checkpoints and payouts appear here as the account moves.
                </PseEmptyNote>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default PSEMineDashboard;
