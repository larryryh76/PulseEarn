import React, { useMemo } from 'react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbpHour, referralStageView, timeAgo, REFERRAL_STAGES } from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseEmptyNote, PseErrorNotice, PseLoading, PseNotice,
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
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseLoading label="Loading referral capacity" />
      </div>
    );
  }
  if (error && !state) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
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
      <PseSection title="Referral capacity">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[
            ['Qualified referral capacity', gbpHour(refCapacity)],
            ['Qualified referrals', `${qualified} of ${MAX_REFERRALS}`],
            ['Slots remaining', `${remainingSlots}`],
            ['Referrals in progress', `${inProgress}`],
            ['Total capacity', gbpHour(totalCapacity)],
            ['Referral maximum', gbpHour(maxReferralCapacity)],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-sm text-text-secondary">{k}</dt>
              <dd className="text-sm text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        {qualified >= MAX_REFERRALS && <PseNotice>Capacity maxed — {MAX_REFERRALS} qualified referrals reached.</PseNotice>}
      </PseSection>

      <PseSection title="Your invite link" meta={code ? `code ${code}` : 'no code yet'}>
        {link ? (
          <>
            <p className="break-all font-mono text-xs text-text-primary">{link}</p>
            <PseButton onClick={() => void navigator.clipboard?.writeText(link)}>Copy invite link</PseButton>
          </>
        ) : (
          <PseEmptyNote>A referral code is issued by the backend; it will appear here once it exists.</PseEmptyNote>
        )}
      </PseSection>

      <PseSection title="Qualification pipeline">
        <PseTable head={['Stage', 'Meaning', 'Count']}>
          {REFERRAL_STAGES.map(s => (
            <PseRow key={s.id}>
              <PseCell>{s.label}</PseCell>
              <PseCell>{referralStageView(s.id).help}</PseCell>
              <PseCell>{stageCounts[s.id] || 0}</PseCell>
            </PseRow>
          ))}
        </PseTable>
        <p className="text-xs text-text-tertiary">
          Qualification settles on the backend when the invite&apos;s first tool activates — one auditable event, once
          per referral.
        </p>
      </PseSection>

      <PseSection
        title="Recorded invites"
        meta={
          <span>
            {referrals.length} record{referrals.length === 1 ? '' : 's'} ·{' '}
            <button type="button" className="underline" onClick={() => void refreshFeed('referrals')}>Refresh</button>
          </span>
        }
      >
        {feedErrors.referrals && <PseNotice tone="attention">The referral feed could not be refreshed.</PseNotice>}
        {referrals.length === 0 ? (
          <PseEmptyNote>
            No referrals recorded yet. Invites appear here as accounts register with your code.
          </PseEmptyNote>
        ) : (
          <PseTable head={['Referral', 'Stage', 'Recorded', 'Qualified']}>
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
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
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
