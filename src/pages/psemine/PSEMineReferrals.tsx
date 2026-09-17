import React, { useMemo } from 'react';
import { Users, CheckCircle2, Circle, Info, Share2, Link2, XCircle } from 'lucide-react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import {
  Chip, WorkbenchHeader, AccentSurface, Surface, MetricRow, KeyValue, KVRow, RowItem,
  Slots, PSEEmpty, PSELoading, PSEError, FeedNotice, gbpHour, timeAgo,
  referralStageView, CopyField, REFERRAL_STAGES, ActionLink,
} from '../../components/psemine/pse';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import toast from 'react-hot-toast';

const MAX_REFERRALS = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
const BONUS = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

/**
 * Referral capacity.
 *
 * Composition (design system v2): ONE accent surface stating the position
 * (qualified X/5, capacity earned, remaining opportunities), then compact ruled
 * groups for the pipeline, the invite link and the recorded invites. The
 * five-slot strip replaces five oversized cards — it stays readable at 375px.
 */
export const PSEMineReferrals: React.FC = () => {
  const { referrals, referralCode, loading, error, refresh, refreshing, state, feedErrors, refreshFeed } = usePseState();
  const { userData } = usePSEMineAuth();
  const { pseUser } = usePSEMine();

  const code = referralCode || userData?.referralCode || null;
  const link = code ? `${window.location.origin}/mine/signup?ref=${encodeURIComponent(code)}` : null;
  const qualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const refCapacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;
  const remainingSlots = Math.max(0, MAX_REFERRALS - qualified);

  /** Stage distribution across the referral base — real rows only. */
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of REFERRAL_STAGES) counts[s.id] = 0;
    for (const r of referrals) {
      const key = String(r.status || 'registered');
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
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
    return <div className="pse-section pt-6 md:pt-8"><PSELoading skeleton label="Loading referrals" /></div>;
  }
  if (error && !state) {
    return (
      <div className="pse-section py-8">
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <div className="pse-section pse-workbench pt-5 md:pt-7">
      <WorkbenchHeader
        title="Referrals"
        purpose={`Each qualified referral adds +£${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals (+${gbpHour(MAX_REFERRALS * BONUS)}). Capacity applies from the qualification moment forward — never retroactively.`}
        status={<Chip
          label={qualified >= MAX_REFERRALS ? 'Capacity maxed' : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`}
          chip={qualified >= MAX_REFERRALS ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-blue'}
          dot={false}
        />}
        actions={
          <button onClick={() => void share()} disabled={!link} className="pse-btn pse-btn-primary pse-btn-sm">
            <Share2 size={13} /> Share invite link
          </button>
        }
      />

      {/* ══ Position ══ */}
      <AccentSurface>
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-4">
          <div>
            <p className="pse-eyebrow">Qualified referrals</p>
            <p className="pse-fig-xl mt-2">
              {qualified}<span className="pse-fig-md" style={{ color: 'var(--pse-text-3)' }}> / {MAX_REFERRALS}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="pse-eyebrow">Capacity earned</p>
            <p className="pse-fig-lg mt-2" style={{ color: 'var(--pse-purple)' }}>+{gbpHour(refCapacity)}</p>
          </div>
        </div>
        <div className="mt-4 px-4 pb-4">
          <Slots filled={qualified} total={MAX_REFERRALS} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="pse-micro">{qualified} qualified · {inProgress} in progress</p>
            <p className="pse-micro">Maximum {gbpHour(MAX_REFERRALS * BONUS)} of referral capacity</p>
          </div>
        </div>
        <div className="pse-rule">
          <MetricRow items={[
            { label: 'Bonus per referral', value: gbpHour(BONUS), sub: 'Added to hourly capacity' },
            { label: 'Qualification', value: 'First tool', sub: 'Register → wallet → purchase → active' },
            { label: 'Timing', value: 'From qualifying', sub: 'Never applied retroactively' },
            { label: 'Your referral capacity', value: gbpHour(refCapacity), tone: 'var(--pse-purple)', sub: `of ${gbpHour(MAX_REFERRALS * BONUS)} maximum` },
          ]} />
        </div>
      </AccentSurface>

      {/* ══ Pipeline ══ */}
      <Surface title="Qualification pipeline" meta="Where your invites currently stand — real records only">
        <KeyValue>
          {REFERRAL_STAGES.map((s, i) => (
            <KVRow
              key={s.id}
              k={`${i + 1}. ${s.label}`}
              v={String(stageCounts[s.id] || 0)}
              hint={i === REFERRAL_STAGES.length - 1 ? 'Adds +£0.30/hour to your capacity' : undefined}
            />
          ))}
        </KeyValue>
        <p className="pse-rule px-4 py-3 pse-micro">
          Qualification settles on the backend when your invite activates their first tool — one auditable path, once per referral.
        </p>
      </Surface>

      {/* ══ Invite ══ */}
      <Surface title="Your invite link" meta="New miners signing up through this link are attributed to your account automatically">
        <div className="space-y-3 px-4 py-4">
          {link ? (
            <>
              <CopyField value={link} display={link} label="referral link" fullWidth />
              <div className="flex flex-wrap items-center gap-2.5">
                <CopyField value={code || ''} display={`Code · ${code}`} label="referral code" />
                <button onClick={() => void share()} className="pse-btn pse-btn-secondary pse-btn-sm">
                  <Share2 size={13} /> Share
                </button>
              </div>
              <div className="pse-inset flex items-start gap-2.5 p-3.5">
                <Link2 size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
                <p className="pse-micro">
                  The code is applied when your invite creates their account. PSEmine attribution is recorded by the
                  backend — self-referrals, duplicates and circular references are rejected by design.
                </p>
              </div>
            </>
          ) : (
            <p className="pse-micro" style={{ color: 'var(--pse-warning)' }}>
              Your referral code hasn&apos;t been issued yet. It appears here as soon as your account has one.
            </p>
          )}
        </div>
      </Surface>

      {/* ══ Recorded invites ══ */}
      <Surface
        title="Your referrals"
        meta={`${referrals.length} recorded invite${referrals.length === 1 ? '' : 's'}`}
        action={<button onClick={() => void refreshFeed('referrals')} className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>Refresh</button>}
        bodyClassName={referrals.length === 0 ? '' : 'pse-rows'}
      >
        {feedErrors.referrals && (
          <FeedNotice
            message="Referral records could not be loaded — this list may be incomplete."
            onRetry={() => void refreshFeed('referrals')}
            retrying={refreshing}
          />
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
            const isQualified = r.status === 'qualified';
            const isRejected = r.status === 'rejected';
            const name = r.refereeUsername || r.refereeEmailMasked || `Miner ${String(r.refereeId || '').slice(0, 6)}`;
            return (
              <RowItem key={r.id} className="items-start">
                <div className="mt-0.5 shrink-0">
                  {isQualified
                    ? <CheckCircle2 size={14} style={{ color: 'var(--pse-success)' }} />
                    : isRejected
                      ? <XCircle size={14} style={{ color: 'var(--pse-danger)' }} />
                      : <Circle size={14} style={{ color: 'var(--pse-text-3)' }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="pse-caption truncate font-medium" style={{ color: 'var(--pse-text)' }}>{name}</p>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="pse-micro">{timeAgo(r.qualifiedAt || r.createdAt)}</span>
                      <Chip label={stage.label} chip={stage.chip} dot={false} />
                    </div>
                  </div>
                  <p className="pse-micro mt-1">{stage.help}</p>
                  {!isRejected && (
                    <div className="mt-2 max-w-[220px]">
                      <Slots filled={stage.step} total={REFERRAL_STAGES.length} />
                    </div>
                  )}
                </div>
              </RowItem>
            );
          })
        )}
      </Surface>

      {/* ══ Rules ══ */}
      <Surface title="Referral rules" meta="Fixed for the campaign">
        <KeyValue>
          <KVRow k="Bonus per qualified referral" v={gbpHour(BONUS)} hint="Added to your hourly mining capacity" />
          <KVRow k="Maximum qualified referrals" v={String(MAX_REFERRALS)} hint={`Max referral capacity ${gbpHour(MAX_REFERRALS * BONUS)}`} />
          <KVRow k="Qualification" v="First tool activated" hint="Register → connect wallet → purchase → mining active" />
          <KVRow k="Timing" v="From qualification onward" hint="Never applied retroactively to past operating time" />
        </KeyValue>
        <div className="pse-rule flex flex-wrap items-start gap-2 px-4 py-3.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          <p className="pse-micro">
            Combined capacity remains capped at {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} — tool capacity
            capped at {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} plus referral capacity capped at{' '}
            {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}.
          </p>
          <div className="ml-auto"><ActionLink to="/mine/guide">How capacity works</ActionLink></div>
        </div>
      </Surface>
    </div>
  );
};

export default PSEMineReferrals;
