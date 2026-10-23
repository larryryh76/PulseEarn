import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  copyText, gbpHour, referralStageView, timeAgo,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseNotice,
  PsePage, PseSection, PseSkeleton, PseSkeletonRows, PseStat, PseStatBar,
  PseStatus, type PseStatusTone,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

const MAX_REFERRALS = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
const BONUS = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

/** A referral's tone follows its recorded stage; "registered" is not a win. */
function stageTone(stage?: string | null): PseStatusTone {
  if (stage === 'qualified') return 'good';
  if (stage === 'rejected') return 'danger';
  if (stage === 'mining_active' || stage === 'tool_purchased') return 'hold';
  return 'idle';
}

/**
 * Referral management.
 *
 * The page is built around the invite itself: the real code, the link, and the
 * actions that hand it over. Qualification is explained in plain language and
 * the recorded invite ledger uses only backend rows.
 *
 * The referral engine is untouched: attribution, qualification stages and
 * capacity all come from the backend. Only qualified referrals add capacity,
 * once each, from the qualification moment — a signup is not a qualified
 * referral and this page never implies otherwise.
 */
export const PSEMineReferrals: React.FC = () => {
  const { referrals, referralCode, loading, error, refresh, refreshing, state, feedErrors, refreshFeed } = usePseState();
  const { userData } = usePSEMineAuth();
  const { pseUser } = usePSEMine();

  const code = referralCode || userData?.referralCode || null;
  const link = code ? `${window.location.origin}/mine/signup?ref=${encodeURIComponent(code)}` : null;
  const qualified = typeof state?.user?.qualifiedReferralsCount === 'number'
    ? state.user.qualifiedReferralsCount
    : typeof pseUser?.qualifiedReferralsCount === 'number' ? pseUser.qualifiedReferralsCount : null;
  const refCapacity = typeof state?.user?.referralCapacityGBPPerHour === 'number'
    ? state.user.referralCapacityGBPPerHour
    : typeof pseUser?.referralCapacityGBPPerHour === 'number' ? pseUser.referralCapacityGBPPerHour : null;
  const totalCapacity = typeof state?.user?.totalCapacityGBPPerHour === 'number'
    ? state.user.totalCapacityGBPPerHour
    : typeof pseUser?.totalCapacityGBPPerHour === 'number' ? pseUser.totalCapacityGBPPerHour : null;
  const remainingSlots = qualified !== null ? Math.max(0, MAX_REFERRALS - qualified) : null;
  const maxReferralCapacity = MAX_REFERRALS * BONUS;

  const inProgress = referrals.filter(r => r.status !== 'qualified' && r.status !== 'rejected').length;

  const copy = async (value: string, message: string) => {
    const ok = await copyText(value);
    if (ok) toast.success(message);
    else toast.error('Could not copy. Select the value and copy it manually.');
  };

  const share = async () => {
    if (!link) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'PSEmine — 90-day campaign mining', url: link });
        return;
      } catch {
        // dismissed — fall through to copy
      }
    }
    await copy(link, 'Referral link copied.');
  };

  if (loading && !state) {
    return (
      <PsePage
        title="Referrals"
        objective={`Each qualified referral adds £${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals (+${gbpHour(maxReferralCapacity)}). Capacity applies from the qualification moment forward — never retroactively.`}
      >
        <section className="pse-invite" aria-busy="true" aria-live="polite" role="status">
          <span className="sr-only">Loading your referral code</span>
          <div className="pse-invite-id">
            <PseSkeleton width="10ch" height="0.625rem" />
            <PseSkeleton width="12ch" height="1.75rem" />
            <PseSkeleton width="34ch" height="0.6875rem" />
          </div>
          <div className="pse-invite-actions">
            <PseSkeleton width="6.5rem" height="2.75rem" />
            <PseSkeleton width="6.5rem" height="2.75rem" />
          </div>
        </section>
        <PseStatBar cols={4}>
          {['Qualified referrals', 'Referral capacity', 'In progress', 'Total capacity'].map(label => (
            <PseStat key={label} label={label} value={<PseSkeleton width="5ch" height="1.0625rem" />} />
          ))}
        </PseStatBar>
        <PseSplit>
          <PseStack>
            <PseSection title="Recorded invites" meta="Reading the ledger">
              <PseSkeletonRows rows={4} label="Loading recorded invites" />
            </PseSection>
          </PseStack>
          <PseStack>
            <PseSection title="Qualification stages" meta="Reading stages">
              <PseSkeletonRows rows={4} label="Loading qualification stages" />
            </PseSection>
          </PseStack>
        </PseSplit>
      </PsePage>
    );
  }
  if (error && !state) {
    return (
      <PsePage title="Referrals" objective="Your referral code, the capacity it has earned and the recorded invites behind it.">
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </PsePage>
    );
  }

  return (
    <PsePage
      title="Referrals"
      objective={`Each qualified referral adds £${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals (+${gbpHour(maxReferralCapacity)}). Capacity applies from the qualification moment forward — never retroactively.`}
      actions={
        <>
          <PseButton size="sm" onClick={() => void share()} disabled={!link}>Share invite link</PseButton>
          <PseButton variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>
        </>
      }
    >
      {/* THE INVITE — the one object this page exists to hand over. */}
      <section className="pse-invite" aria-labelledby="pse-invite-label">
        <div className="pse-invite-id">
          <p className="pse-money-label" id="pse-invite-label">Your referral code</p>
          <p className="pse-invite-code">{code || 'Not issued yet'}</p>
          <p className="pse-invite-link">
            {link || 'A referral code is issued by the backend when the account is enrolled.'}
          </p>
        </div>
        <div className="pse-invite-actions">
          <PseButton
            variant="secondary"
            size="sm"
            onClick={() => void copy(code || '', 'Referral code copied.')}
            disabled={!code}
          >
            Copy code
          </PseButton>
          <PseButton
            variant="secondary"
            size="sm"
            onClick={() => void copy(link || '', 'Referral link copied.')}
            disabled={!link}
          >
            Copy link
          </PseButton>
          <PseButton size="sm" onClick={() => void share()} disabled={!link}>Share</PseButton>
        </div>
      </section>

      <PseStatBar cols={4}>
        <PseStat
          label="Qualified referrals"
          value={qualified !== null ? `${qualified} / ${MAX_REFERRALS}` : '—'}
          note={remainingSlots !== null ? `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remaining` : 'Not reported'}
        />
        <PseStat
          label="Referral capacity"
          value={refCapacity !== null ? gbpHour(refCapacity) : '—'}
          note={`Maximum ${gbpHour(maxReferralCapacity)}`}
        />
        <PseStat
          label="In progress"
          value={`${inProgress}`}
          note="Recorded, not yet qualified"
        />
        <PseStat
          label="Total capacity"
          value={totalCapacity !== null ? gbpHour(totalCapacity) : '—'}
          note="Equipment and referrals"
        />
      </PseStatBar>

      {qualified !== null && qualified >= MAX_REFERRALS && (
        <PseNotice tone="good" title="Referral capacity maxed">
          All {MAX_REFERRALS} qualifying referrals are recorded. Further invites do not add capacity to this account.
        </PseNotice>
      )}

      <PseSection
        title="Invite ledger"
        meta={
          <span>
            {referrals.length} record{referrals.length === 1 ? '' : 's'}
            {' · '}
            <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('referrals')}>Refresh</button>
          </span>
        }
      >
        {feedErrors.referrals && (
          <PseFeedNotice
            message="The referral feed could not be read."
            onRetry={() => void refreshFeed('referrals')}
            retrying={refreshing}
          />
        )}
        {referrals.length === 0 ? (
          <PseEmptyNote
            title="No referrals yet"
            action={link ? <PseButton variant="secondary" size="sm" onClick={() => void share()}>Share invite</PseButton> : undefined}
          >
            Share your code to start your invite ledger.
          </PseEmptyNote>
        ) : (
          <ul className="pse-log">
            {referrals.map(r => {
              const stage = referralStageView(r.status);
              const name = r.refereeUsername || r.refereeEmailMasked || `Miner ${String(r.refereeId || '').slice(0, 6)}`;
              return (
                <li key={r.id} className="pse-log-row">
                  <span className="pse-log-when">{timeAgo(r.createdAt)}</span>
                  <span className="pse-log-body">
                    <span className="pse-log-title">{name}</span>
                    <span className="pse-log-note">
                      {r.qualifiedAt
                        ? `Qualified ${timeAgo(r.qualifiedAt)} · +${gbpHour(r.bonusHourlyRate ?? BONUS)}`
                        : stage.help}
                    </span>
                  </span>
                  <span className="pse-log-amount">
                    <PseStatus tone={stageTone(r.status)}>{stage.label}</PseStatus>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </PseSection>
    </PsePage>
  );
};

export default PSEMineReferrals;
