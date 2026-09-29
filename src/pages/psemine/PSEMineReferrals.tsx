import React, { useMemo } from 'react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbpHour, referralStageView, timeAgo, REFERRAL_STAGES } from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseEmptyNote, PseErrorNotice, PseFact, PseFacts, PseLoading, PseNotice,
  PsePage, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

const MAX_REFERRALS = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
const BONUS = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

/**
 * Referral capacity — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger referral surface was purged in
 * `refactor(psemine): purge legacy design implementation`. The referral engine is
 * untouched: attribution, qualification stages and capacity are all read from
 * the backend. Referrals only ever contribute hourly capacity, once each, from
 * the qualification moment — they are not a separate economy and not a task.
 */
export const PSEMineReferrals: React.FC = () => {
  const { referrals, referralCode, loading, error, refresh, refreshing, state, feedErrors, refreshFeed } = usePseState();
  const { userData } = usePSEMineAuth();
  const { pseUser } = usePSEMine();

  const code = referralCode || userData?.referralCode || null;
  const link = code ? `${window.location.origin}/mine/signup?ref=${encodeURIComponent(code)}` : null;
  const qualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const refCapacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = state?.user?.totalCapacityGBPPerHour ?? pseUser?.totalCapacityGBPPerHour ?? 0;
  const remainingSlots = Math.max(0, MAX_REFERRALS - qualified);
  const maxReferralCapacity = MAX_REFERRALS * BONUS;

  /** Stage distribution across the referral base — real rows only. */
  const stageCounts = useMemo(() => {
    const counted: Record<string, number> = {};
    for (const s of REFERRAL_STAGES) counted[s.id] = 0;
    for (const r of referrals) {
      const key = String(r.status || 'registered');
      counted[key] = (counted[key] || 0) + 1;
    }
    return counted;
  }, [referrals]);

  const inProgress = referrals.filter(r => r.status !== 'qualified' && r.status !== 'rejected').length;

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
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Referral link copied.');
    } catch {
      toast.error('Could not copy the link. Select and copy it manually.');
    }
  };

  if (loading && !state) {
    return (
      <div className="pse-console-main">
        <PseLoading label="Loading referral capacity" />
      </div>
    );
  }
  if (error && !state) {
    return (
      <div className="pse-console-main">
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <PsePage
      title="Referral capacity"
      objective={`Each qualified referral adds +£${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals (+${gbpHour(maxReferralCapacity)}). Capacity applies from the qualification moment forward — never retroactively.`}
      actions={
        <>
          <PseButton onClick={() => void share()} disabled={!link}>Share invite link</PseButton>
          <PseButton onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>
        </>
      }
    >
      <PseSection title="Referral capacity" meta={`${remainingSlots} of ${MAX_REFERRALS} slots open`}>
        <PseFacts cols={2}>
          <PseFact label="Qualified referral capacity" value={gbpHour(refCapacity)} />
          <PseFact label="Qualified referrals" value={`${qualified} / ${MAX_REFERRALS}`} />
          <PseFact label="Slots remaining" value={`${remainingSlots}`} />
          <PseFact label="Referrals in progress" value={`${inProgress}`} />
          <PseFact label="Total capacity" value={gbpHour(totalCapacity)} />
          <PseFact label="Referral maximum" value={gbpHour(maxReferralCapacity)} />
        </PseFacts>
        {qualified >= MAX_REFERRALS && (
          <PseNotice tone="good" title="Referral capacity maxed">
            All {MAX_REFERRALS} qualifying referrals are recorded. Further invites do not add capacity to this account.
          </PseNotice>
        )}
      </PseSection>

      <PseSection title="Your invite link" meta={code ? `code ${code}` : 'no code yet'}>
        {link ? (
          <>
            <span className="pse-code">
              <span className="pse-code-value">{link}</span>
            </span>
            <div className="pse-empty-actions">
              <PseButton variant="secondary" size="sm" onClick={() => void navigator.clipboard?.writeText(link)}>
                Copy invite link
              </PseButton>
            </div>
          </>
        ) : (
          <PseEmptyNote glyph="select" title="No referral code yet">
            A referral code is issued by the backend when the account is enrolled. It appears here as soon as it exists.
          </PseEmptyNote>
        )}
      </PseSection>

      <PseSection title="Qualification pipeline">
        <PseTable head={['Stage', 'Meaning', 'Invites']} numeric={[2]} caption="Invites recorded at each qualification stage">
          {REFERRAL_STAGES.map(s => (
            <PseRow key={s.id}>
              <PseCell>{s.label}</PseCell>
              <PseCell>{referralStageView(s.id).help}</PseCell>
              <PseCell numeric>{stageCounts[s.id] || 0}</PseCell>
            </PseRow>
          ))}
        </PseTable>
        <p className="pse-block-note">
          Qualification settles on the backend when the invite&apos;s first tool activates — one auditable event, once
          per referral. A stage count of zero means no invite is at that stage, not that the stage is unavailable.
        </p>
      </PseSection>

      <PseSection
        title="Recorded invites"
        meta={
          <span>
            {referrals.length} record{referrals.length === 1 ? '' : 's'} ·{' '}
            <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('referrals')}>Refresh</button>
          </span>
        }
      >
        {feedErrors.referrals && <PseNotice tone="attention">The referral feed could not be refreshed.</PseNotice>}
        {referrals.length === 0 ? (
          <PseEmptyNote
            glyph="select"
            title="No referrals recorded yet"
            action={link ?          <PseButton variant="secondary" size="sm" onClick={() => void share()} disabled={!link}>Share invite link</PseButton>
            : undefined}
          >
            Invites appear here as accounts register with your code, and their stage advances as the backend records real
            account events — a registration, a connected wallet, a purchased tool, live mining. Nothing here is recorded
            until it has happened.
          </PseEmptyNote>
        ) : (
          <PseTable
            head={['Referral', 'Stage', 'Recorded', 'Qualified']}
            caption="Accounts recorded against this referral code"
          >
            {referrals.map(r => {
              const stage = referralStageView(r.status);
              const name = r.refereeUsername || r.refereeEmailMasked || `Miner ${String(r.refereeId || '').slice(0, 6)}`;
              return (
                <PseRow key={r.id}>
                  <PseCell>{name}</PseCell>
                  <PseCell>{stage.label}</PseCell>
                  <PseCell>{timeAgo(r.createdAt)}</PseCell>
                  <PseCell>{r.qualifiedAt ? timeAgo(r.qualifiedAt) : '—'}</PseCell>
                </PseRow>
              );
            })}
          </PseTable>
        )}
      </PseSection>

      <PseSection title="Referral rules">
        <ul className="pse-notes">
          <li>Register → connect a wallet → purchase a mining tool → mining active → qualified.</li>
          <li>Only qualified referrals add capacity, and only from the qualification moment forward.</li>
          <li>At most {MAX_REFERRALS} referrals count per account ({gbpHour(maxReferralCapacity)}).</li>
          <li>Referral fraud controls and qualification are enforced by the backend, not in the browser.</li>
        </ul>
      </PseSection>
    </PsePage>
  );
};

export default PSEMineReferrals;
