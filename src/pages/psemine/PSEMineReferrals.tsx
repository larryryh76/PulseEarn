import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Share2, ChevronRight } from 'lucide-react';
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
 * Referral capacity.
 *
 * Composition law (Duty & Ledger): VERDICT → RAILS → LEDGERS → NOTES.
 *
 *   VERDICT  the qualified referral capacity this account actually holds, on the
 *            canvas — not inside a tinted panel.
 *   RAIL     the canonical capacity register (the same component the console and
 *            the tool marketplace render), so the referral lanes sit in their
 *            real place: capacity ADDS to tool capacity, it is not a separate
 *            economy.
 *   LEDGERS  the qualification pipeline, the invite instrument and the recorded
 *            invites. Real rows only.
 *   NOTES    the referral rules, unframed.
 *
 * Nothing here is a mining tool and nothing here is a task: referrals only ever
 * contribute £/hour of capacity, once each, from the qualification moment.
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

  /** Stage distribution across the referral base — real rows only. */
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
    return <div className="pse-gut pt-6"><PSELoading label="Loading referral capacity" /></div>;
  }
  if (error && !state) {
    return (
      <div className="pse-gut py-8">
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <div className="pse-gut pse-stack" style={{ paddingTop: 22 }}>
      <StatementHeader
        routeKey="Referrals · capacity"
        title="Referral capacity"
        objective={`Each qualified referral adds +£${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals (+${gbpHour(maxReferralCapacity)}). Capacity applies from the qualification moment forward — never retroactively.`}
        status={
          <Stamp tone={qualified >= MAX_REFERRALS ? 'live' : 'info'} glyph={qualified >= MAX_REFERRALS ? '✓' : '▮'}>
            {qualified >= MAX_REFERRALS ? 'Capacity maxed' : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`}
          </Stamp>
        }
        actions={
          <button onClick={() => void share()} disabled={!link} className="pse-btn pse-btn-sm">
            <Share2 size={13} /> Share invite link
          </button>
        }
      />

      {/* ══ VERDICT — the capacity this account actually holds ══ */}
      <Verdict
        label="Qualified referral capacity"
        value={gbpHour(refCapacity)}
        status={
          <Stamp tone={qualified > 0 ? 'live' : 'idle'} glyph="●">
            {qualified} of {MAX_REFERRALS} qualified
          </Stamp>
        }
        note={
          qualified >= MAX_REFERRALS
            ? `Referral capacity is at its campaign maximum of ${gbpHour(maxReferralCapacity)}.`
            : qualified === 0
              ? `No referral has qualified yet, so no referral capacity is accruing. ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remain.`
              : `${gbpHour(remainingSlots * BONUS)} of referral capacity is still available across ${remainingSlots} remaining slot${remainingSlots === 1 ? '' : 's'}.`
        }
        side={
          <div className="pse-stack-tight">
            <div className="pse-spec-line"><span>Bonus per referral</span><span>{gbpHour(BONUS)}</span></div>
            <div className="pse-spec-line"><span>In progress</span><span>{inProgress} of {referrals.length} invites</span></div>
            <div className="pse-spec-line"><span>Tool capacity</span><span className="pse-cyan">{gbpHour(toolCapacity)}</span></div>
            <div className="pse-spec-line"><span>Total capacity</span><span className="pse-cyan">{gbpHour(totalCapacity)}</span></div>
          </div>
        }
      />

      {/* ══ RAIL — the canonical capacity register ══ */}
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
          tone="attn"
          title="No referral code issued yet"
          body="Your invite link appears here as soon as your account has a referral code. Until then no invite can be attributed to you."
        />
      )}

      {qualified >= MAX_REFERRALS && (
        <Attn
          tone="info"
          title="Referral capacity at maximum"
          body={`${MAX_REFERRALS} qualified referrals is the campaign limit. Further invites still register, but they cannot add more than ${gbpHour(maxReferralCapacity)} of referral capacity.`}
        />
      )}

      {/* ══ LEDGER — the qualification pipeline ══ */}
      <Ledger
        title="Qualification pipeline"
        meta="Where your invites currently stand — real records only"
        legend={['Stage', 'Invites']}
      >
        {REFERRAL_STAGES.map((s, i) => (
          <LedgerRow
            key={s.id}
            title={
              <span className="flex items-baseline gap-2.5">
                <span className="pse-row-sign" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                {s.label}
              </span>
            }
            sub={i === REFERRAL_STAGES.length - 1 ? 'Adds +£0.30/hour to your capacity' : undefined}
            value={String(stageCounts[s.id] || 0)}
          />
        ))}
      </Ledger>

      {/* ══ LEDGER — the invite instrument ══ */}
      <Ledger
        title="Your invite link"
        meta="New miners signing up through this link are attributed to your account by the backend"
        legend={['Instrument', 'Value']}
      >
        {link ? (
          <>
            <LedgerRow title="Invite link" sub="Anyone who registers through it is attributed to you">
              <div style={{ marginTop: 10 }}>
                <CopyField value={link} display={link} label="referral link" fullWidth />
              </div>
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
            icon={Users}
            title="No referral code yet"
            body="Your code is issued with your mining account and appears here automatically."
          />
        )}
      </Ledger>

      {/* ══ LEDGER — the recorded invites ══ */}
      <Ledger
        title="Your referrals"
        meta={`${referrals.length} recorded invite${referrals.length === 1 ? '' : 's'}`}
        legend={['Miner', 'Stage']}
        action={
          <button onClick={() => void refreshFeed('referrals')} className="pse-meta pse-link">
            Refresh
          </button>
        }
      >
        {feedErrors.referrals && (
          <div className="pse-attn" data-tone="info">
            <div className="pse-attn-body">
              <p className="pse-label-b">Referral feed degraded</p>
              <p className="pse-meta" style={{ marginTop: 4 }}>
                Referral records could not be loaded — this list may be incomplete.
              </p>
            </div>
            <button
              onClick={() => void refreshFeed('referrals')}
              disabled={refreshing}
              className="pse-btn pse-btn-2 pse-btn-sm"
            >
              Retry
            </button>
          </div>
        )}
        {referrals.length === 0 ? (
          <PSEEmpty
            icon={Users}
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
                title={
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {name}
                    <Stamp tone={tone} glyph="·">{stage.label}</Stamp>
                  </span>
                }
                sub={
                  <>
                    {stage.help}
                    {' '}
                    <span className="pse-dim-3">· {timeAgo(r.qualifiedAt || r.createdAt)}</span>
                  </>
                }
                value={
                  <span className="pse-meta" style={{ display: 'block' }}>
                    Step {stage.step} of {REFERRAL_STAGES.length}
                  </span>
                }
              />
            );
          })
        )}
      </Ledger>

      {/* ══ NOTES — the referral rules, unframed ══ */}
      <div className="pse-note pse-stack-tight">
        <h2 className="pse-h3">Referral rules</h2>
        <Clause no="01" title="Bonus per qualified referral" body={`${gbpHour(BONUS)}, added to your hourly mining capacity.`} />
        <Clause no="02" title={`Maximum ${MAX_REFERRALS} qualified referrals`} body={`Referral capacity is capped at ${gbpHour(maxReferralCapacity)}.`} />
        <Clause no="03" title="Qualification" body="Register → connect a wallet → purchase a mining tool → mining active. Qualification settles on the backend when the invite's first tool activates — one auditable event, once per referral." />
        <Clause no="04" title="Timing" body="Capacity applies from the qualification moment onward and is never applied retroactively to past operating time." />
        <p className="pse-meta">
          Combined capacity remains capped at {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} — tool capacity capped at{' '}
          {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} plus referral capacity capped at{' '}
          {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}.{' '}
          <Link to="/mine/guide" className="pse-link inline-flex items-center gap-1.5">
            How capacity works <ChevronRight size={13} />
          </Link>
        </p>
      </div>
    </div>
  );
};

export default PSEMineReferrals;
