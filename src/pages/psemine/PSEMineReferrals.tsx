import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import {
  Stamp, StatementHeader, Verdict, CapacityRail, Ledger, LedgerRow,
  Attn, Clause, CopyField, PSEEmpty, PSELoading, PSEError,
  gbpHour, timeAgo, referralStageView, REFERRAL_STAGES,
} from '../../components/psemine/pse';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import toast from 'react-hot-toast';

const MAX_REFERRALS = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
const BONUS = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

/**
 * Referral capacity. Referrals add capacity once they qualify; they are not
 * mining tools or tasks.
 */
export const PSEMineReferrals: React.FC = () => {
  const { referrals, referralCode, loading, error, refresh, refreshing, state, feedErrors, refreshFeed } = usePseState();
  const { userData } = usePSEMineAuth();
  const { pseUser } = usePSEMine();

  const code = referralCode || userData?.referralCode || null;
  const link = code ? `${window.location.origin}/mine/signup?ref=${encodeURIComponent(code)}` : null;
  const qualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const refCapacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;
  const toolCapacity = state?.user?.toolCapacityGBPPerHour ?? pseUser?.toolCapacityGBPPerHour ?? 0;
  const totalCapacity = state?.user?.totalCapacityGBPPerHour ?? pseUser?.totalCapacityGBPPerHour ?? 0;
  const counts = pseUser?.toolOwnershipCounts || { starter: 0, builder: 0, advanced: 0, elite: 0 };
  const remainingSlots = Math.max(0, MAX_REFERRALS - qualified);
  const maxReferralCapacity = MAX_REFERRALS * BONUS;

  const stageCounts = useMemo(() => {
    const counts_: Record<string, number> = {};
    for (const s of REFERRAL_STAGES) counts_[s.id] = 0;
    for (const r of referrals) {
      const key = String(r.status || 'registered');
      counts_[key] = (counts_[key] || 0) + 1;
    }
    return counts_;
  }, [referrals]);

  const inProgress = referrals.filter(r => r.status !== 'qualified' && r.status !== 'rejected').length;

  const share = async () => {
    if (!link) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'PSEmine — 90-day campaign mining', url: link });
        return;
      } catch {
        // Dismissal falls through to copying the link.
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
    return <main><PSELoading label="Loading referral capacity" /></main>;
  }
  if (error && !state) {
    return (
      <main>
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </main>
    );
  }

  return (
    <main>
      <StatementHeader
        routeKey="Referrals · capacity"
        title="Referral capacity"
        objective={`Each qualified referral adds +£${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals (+${gbpHour(maxReferralCapacity)}). Capacity applies from the qualification moment forward — never retroactively.`}
        status={
          <Stamp tone={qualified >= MAX_REFERRALS ? 'live' : 'info'}>
            {qualified >= MAX_REFERRALS ? 'Capacity maxed' : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`}
          </Stamp>
        }
        actions={
          <button type="button" onClick={() => void share()} disabled={!link}>
            Share invite link
          </button>
        }
      />

      <Verdict
        label="Qualified referral capacity"
        value={gbpHour(refCapacity)}
        status={<Stamp tone={qualified > 0 ? 'live' : 'idle'}>{qualified} of {MAX_REFERRALS} qualified</Stamp>}
        note={
          qualified >= MAX_REFERRALS
            ? `Referral capacity is at its campaign maximum of ${gbpHour(maxReferralCapacity)}.`
            : qualified === 0
              ? `No referral has qualified yet, so no referral capacity is accruing. ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remain.`
              : `${gbpHour(remainingSlots * BONUS)} of referral capacity is still available across ${remainingSlots} remaining slot${remainingSlots === 1 ? '' : 's'}.`
        }
        side={
          <dl>
            <div><dt>Bonus per referral</dt><dd>{gbpHour(BONUS)}</dd></div>
            <div><dt>In progress</dt><dd>{inProgress} of {referrals.length} invites</dd></div>
            <div><dt>Tool capacity</dt><dd>{gbpHour(toolCapacity)}</dd></div>
            <div><dt>Total capacity</dt><dd>{gbpHour(totalCapacity)}</dd></div>
          </dl>
        }
      />

      <CapacityRail
        toolCapacity={toolCapacity}
        referralCapacity={refCapacity}
        counts={counts}
        referralCount={qualified}
        label="Mining capacity"
        meta="Referral lanes add to the tool lanes — one combined £/hour"
      />

      {!code && (
        <Attn
          title="No referral code issued yet"
          body="Your invite link appears here as soon as your account has a referral code. Until then no invite can be attributed to you."
        />
      )}

      {qualified >= MAX_REFERRALS && (
        <Attn
          title="Referral capacity at maximum"
          body={`${MAX_REFERRALS} qualified referrals is the campaign limit. Further invites still register, but they cannot add more than ${gbpHour(maxReferralCapacity)} of referral capacity.`}
        />
      )}

      <Ledger
        title="Qualification pipeline"
        meta="Where your invites currently stand — real records only"
        legend={['Stage', 'Invites']}
      >
        {REFERRAL_STAGES.map((s, i) => (
          <LedgerRow
            key={s.id}
            title={<>{String(i + 1).padStart(2, '0')} — {s.label}</>}
            sub={i === REFERRAL_STAGES.length - 1 ? 'Adds +£0.30/hour to your capacity' : undefined}
            value={String(stageCounts[s.id] || 0)}
          />
        ))}
      </Ledger>

      <Ledger
        title="Your invite link"
        meta="New miners signing up through this link are attributed to your account by the backend"
        legend={['Instrument', 'Value']}
      >
        {link ? (
          <>
            <LedgerRow title="Invite link" sub="Anyone who registers through it is attributed to you">
              <CopyField value={link} display={link} label="referral link" fullWidth />
            </LedgerRow>
            <LedgerRow
              title="Referral code"
              sub="Applied when your invite creates their account"
              value={<CopyField value={code || ''} display={code || ''} label="referral code" />}
            />
            <LedgerRow
              title="Attribution"
              sub="Recorded server-side — self-referrals, duplicates and circular references are rejected by design"
              value="Backend"
            />
          </>
        ) : (
          <PSEEmpty

            title="No referral code yet"
            body="Your code is issued with your mining account and appears here automatically."
          />
        )}
      </Ledger>

      <Ledger
        title="Your referrals"
        meta={`${referrals.length} recorded invite${referrals.length === 1 ? '' : 's'}`}
        legend={['Miner', 'Stage']}
        action={<button type="button" onClick={() => void refreshFeed('referrals')}>Refresh</button>}
      >
        {feedErrors.referrals && (
          <aside aria-label="Referral feed notice">
            <h3>Referral feed degraded</h3>
            <p>Referral records could not be loaded — this list may be incomplete.</p>
            <button
              type="button"
              onClick={() => void refreshFeed('referrals')}
              disabled={refreshing}
            >
              Retry
            </button>
          </aside>
        )}
        {referrals.length === 0 ? (
          <PSEEmpty

            title="No referrals yet"
            body="Share your invite link. When someone registers through it, they appear here with their live qualification stage."
          />
        ) : (
          referrals.map(r => {
            const stage = referralStageView(r.status);
            const name = r.refereeUsername || r.refereeEmailMasked || `Miner ${String(r.refereeId || '').slice(0, 6)}`;
            const tone = r.status === 'qualified' ? 'live' : r.status === 'rejected' ? 'fail' : 'idle';
            return (
              <LedgerRow
                key={r.id}
                title={<><span>{name}</span> <Stamp tone={tone}>{stage.label}</Stamp></>}
                sub={<>{stage.help} · {timeAgo(r.qualifiedAt || r.createdAt)}</>}
                value={`Step ${stage.step} of ${REFERRAL_STAGES.length}`}
              />
            );
          })
        )}
      </Ledger>

      <section aria-labelledby="referral-rules-heading">
        <h2 id="referral-rules-heading">Referral rules</h2>
        <Clause no="01" title="Bonus per qualified referral" body={`${gbpHour(BONUS)}, added to your hourly mining capacity.`} />
        <Clause no="02" title={`Maximum ${MAX_REFERRALS} qualified referrals`} body={`Referral capacity is capped at ${gbpHour(maxReferralCapacity)}.`} />
        <Clause no="03" title="Qualification" body="Register → connect a wallet → purchase a mining tool → mining active. Qualification settles on the backend when the invite's first tool activates — one auditable event, once per referral." />
        <Clause no="04" title="Timing" body="Capacity applies from the qualification moment onward and is never applied retroactively to past operating time." />
        <p>
          Combined capacity remains capped at {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} — tool capacity capped at{' '}
          {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} plus referral capacity capped at{' '}
          {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}.{' '}
          <Link to="/mine/guide">How capacity works</Link>
        </p>
      </section>
    </main>
  );
};

export default PSEMineReferrals;
