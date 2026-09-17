import React, { useMemo } from 'react';
import { Users, CheckCircle2, Circle, Info, Share2, Link2, XCircle } from 'lucide-react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import {
  Chip, PageHeader, Verdict, Panel, DataRow, Meter, PSEEmpty, PSELoading, PSEError,
  FeedNotice, gbpHour, timeAgo, referralStageView, CopyField, REFERRAL_STAGES,
} from '../../components/psemine/pse';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import toast from 'react-hot-toast';

const MAX_REFERRALS = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
const BONUS = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

export const PSEMineReferrals: React.FC = () => {
  const { referrals, referralCode, loading, error, refresh, refreshing, state, feedErrors, refreshFeed } = usePseState();
  const { userData } = usePSEMineAuth();
  const { pseUser } = usePSEMine();

  const code = referralCode || userData?.referralCode || null;
  const link = code ? `${window.location.origin}/mine/signup?ref=${encodeURIComponent(code)}` : null;
  const qualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const refCapacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;

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
    <div className="pse-section space-y-4 pb-24 pt-5 md:pt-7">
      <PageHeader
        eyebrow="Referrals"
        title="Referral capacity"
        sub={`Each qualified referral adds +£${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals (+${gbpHour(MAX_REFERRALS * BONUS)}).`}
        right={
          <button onClick={() => void share()} disabled={!link} className="pse-btn pse-btn-primary pse-btn-sm">
            <Share2 size={13} /> Share invite link
          </button>
        }
      />

      {/* ═══ POSITION ═══ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Verdict
            label="Qualified referrals"
            value={`${qualified} / ${MAX_REFERRALS}`}
            status={<Chip
              label={qualified >= MAX_REFERRALS ? 'Capacity maxed' : `${Math.max(0, MAX_REFERRALS - qualified)} slots left`}
              chip={qualified >= MAX_REFERRALS ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-blue'}
              dot={false} />}
            sub={`Referral capacity currently contributes ${gbpHour(refCapacity)} on top of your tool capacity. Capacity changes apply from the qualification moment forward — never retroactively.`}
          >
            <div className="mt-5">
              <Meter value={(qualified / MAX_REFERRALS) * 100} tone="purple" label="Referral slots qualified" />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="pse-micro">{qualified} qualified</span>
                <span className="pse-micro">Max referral capacity {gbpHour(MAX_REFERRALS * BONUS)}</span>
              </div>
            </div>
          </Verdict>
        </div>

        {/* Compact qualification progression (segmented, not five wide cards) */}
        <Panel title="Qualification pipeline" meta="Where your invites currently stand">
          <div className="space-y-3 px-5 py-5">
            <div className="flex h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} role="img"
              aria-label={REFERRAL_STAGES.map(s => `${s.label}: ${stageCounts[s.id] || 0}`).join(', ')}>
              {REFERRAL_STAGES.map((s, i) => {
                const count = stageCounts[s.id] || 0;
                if (count === 0 || referrals.length === 0) return null;
                const pct = (count / referrals.length) * 100;
                const colors = ['#6B7480', '#4C9EF8', '#8B7CF6', '#22D3EE', '#2ECE84'];
                return <span key={s.id} style={{ width: `${pct}%`, background: colors[i] }} />;
              })}
            </div>
            <ul className="space-y-2">
              {REFERRAL_STAGES.map((s, i) => (
                <li key={s.id} className="flex items-center justify-between gap-3">
                  <span className="pse-micro flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: ['#6B7480', '#4C9EF8', '#8B7CF6', '#22D3EE', '#2ECE84'][i] }} />
                    {s.label}
                  </span>
                  <span className="pse-num pse-micro" style={{ color: 'var(--pse-text-2)' }}>{stageCounts[s.id] || 0}</span>
                </li>
              ))}
            </ul>
            <p className="pse-micro">
              Qualification settles on the backend when your invite activates their first tool — one auditable path, once per referral.
            </p>
          </div>
        </Panel>
      </div>

      {/* ═══ INVITE ═══ */}
      <Panel title="Your invite link" meta="New miners signing up through this link are attributed to your account automatically">
        <div className="space-y-3 px-5 py-5">
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
      </Panel>

      {/* ═══ LIST ═══ */}
      <Panel
        title="Your referrals"
        meta={`${referrals.length} recorded invite${referrals.length === 1 ? '' : 's'}`}
        action={<button onClick={() => void refreshFeed('referrals')} className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>Refresh</button>}
        bodyClassName={referrals.length === 0 ? '' : 'divide-y'}
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
              <div key={r.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {isQualified
                      ? <CheckCircle2 size={14} style={{ color: 'var(--pse-success)' }} />
                      : isRejected
                        ? <XCircle size={14} style={{ color: 'var(--pse-danger)' }} />
                        : <Circle size={14} style={{ color: 'var(--pse-text-3)' }} />}
                    <p className="pse-caption truncate font-medium" style={{ color: 'var(--pse-text)' }}>{name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="pse-micro">{timeAgo(r.qualifiedAt || r.createdAt)}</span>
                    <Chip label={stage.label} chip={stage.chip} dot={false} />
                  </div>
                </div>
                <p className="pse-micro mt-1.5">{stage.help}</p>
                {/* Compact stage progress for this row */}
                {!isRejected && (
                  <div className="mt-2 flex items-center gap-1" aria-hidden="true">
                    {REFERRAL_STAGES.map((s, i) => (
                      <span key={s.id} className="h-1 flex-1 rounded-full"
                        style={{ background: i < stage.step ? 'var(--pse-blue)' : 'rgba(255,255,255,0.07)' }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </Panel>

      {/* ═══ RULES ═══ */}
      <Panel title="Referral rules" meta="Fixed for the campaign">
        <div className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          <DataRow label="Bonus per qualified referral" value={gbpHour(BONUS)} hint="Added to your hourly mining capacity" />
          <DataRow label="Maximum qualified referrals" value={`${MAX_REFERRALS}`} hint={`Max referral capacity ${gbpHour(MAX_REFERRALS * BONUS)}`} />
          <DataRow label="Qualification" value="First tool activated" hint="Register → connect wallet → purchase → mining active" />
          <DataRow label="Timing" value="From qualification onward" hint="Never applied retroactively to past operating time" />
        </div>
        <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
          <p className="pse-micro flex items-start gap-2">
            <Info size={12} className="mt-0.5 shrink-0" />
            Combined capacity remains capped at {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} — tool capacity
            capped at {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} plus referral capacity capped at{' '}
            {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}.
          </p>
        </div>
      </Panel>
    </div>
  );
};

export default PSEMineReferrals;
