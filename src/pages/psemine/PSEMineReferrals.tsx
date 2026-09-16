import React from 'react';
import { Users, CheckCircle2, Circle, Info } from 'lucide-react';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import {
  Chip, PageHeader, PSEEmpty, PSELoading, gbpHour, timeAgo,
  referralStageView, CopyField,
} from '../../components/psemine/pse';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';

const MAX_REFERRALS = 5;
const BONUS = 0.30;

export const PSEMineReferrals: React.FC = () => {
  const { referrals, referralCode, loading, error, refresh, refreshing, state } = usePseState();
  const { userData } = usePSEMineAuth();
  const { pseUser } = usePSEMine();

  const code = referralCode || userData?.referralCode || null;
  const link = code ? `${window.location.origin}/mine/signup?ref=${encodeURIComponent(code)}` : null;
  const qualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const refCapacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;

  if (loading) return <div className="pse-section py-10"><PSELoading label="Loading referrals" /></div>;

  return (
    <div className="pse-section space-y-4 pb-24 pt-6 md:pt-8">
      <PageHeader
        eyebrow="Referrals"
        title="Referral capacity"
        sub={`Each qualified referral adds +£${BONUS.toFixed(2)}/hour to your mining capacity, up to ${MAX_REFERRALS} referrals.`}
      />

      {/* Verdict row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="pse-card p-6">
          <p className="pse-eyebrow">Qualified referrals</p>
          <p className="pse-num mt-2 text-[32px] font-semibold leading-none">
            {qualified}<span className="text-[16px] font-medium" style={{ color: 'var(--pse-text-3)' }}> / {MAX_REFERRALS}</span>
          </p>
          <div className="pse-meter mt-4">
            <div className="pse-meter-fill" style={{ width: `${Math.min(100, (qualified / MAX_REFERRALS) * 100)}%` }} />
          </div>
        </div>
        <div className="pse-card p-6">
          <p className="pse-eyebrow">Referral capacity</p>
          <p className="pse-num mt-2 text-[32px] font-semibold leading-none" style={{ color: 'var(--pse-purple)' }}>
            +{gbpHour(refCapacity).replace('/hour', '/hr')}
          </p>
          <p className="pse-micro mt-2.5">Added on top of your tool capacity — never retroactively.</p>
        </div>
        <div className="pse-card p-6">
          <p className="pse-eyebrow">Slots remaining</p>
          <p className="pse-num mt-2 text-[32px] font-semibold leading-none">
            {Math.max(0, MAX_REFERRALS - qualified)}
          </p>
          <p className="pse-micro mt-2.5">
            {qualified >= MAX_REFERRALS ? 'All referral slots are in use.' : 'Each remaining slot is worth +£0.30/hour once qualified.'}
          </p>
        </div>
      </div>

      {/* Invite link */}
      <section className="pse-card p-5">
        <p className="pse-h3">Your referral link</p>
        <p className="pse-micro mt-1">New miners who sign up through your link are attributed to you automatically.</p>
        {link ? (
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <CopyField value={link} display={link.length > 46 ? `${link.slice(0, 46)}…` : link} label="referral link" />
            </div>
            <CopyField value={code || ''} display={`Code: ${code}`} label="referral code" />
          </div>
        ) : (
          <p className="pse-micro mt-3" style={{ color: 'var(--pse-warning)' }}>
            Your referral code hasn't been issued yet. It appears here as soon as your account has one.
          </p>
        )}
      </section>

      {/* Qualification path explainer */}
      <section className="pse-card p-5">
        <p className="pse-h3">How a referral qualifies</p>
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
          {['Registered', 'Wallet Connected', 'Tool Purchased', 'Mining Active', 'Qualified'].map((s, i) => (
            <div key={s} className="pse-inset p-3.5 text-center">
              <p className="pse-micro" style={{ color: 'var(--pse-text-3)' }}>Step {i + 1}</p>
              <p className="pse-caption mt-1 font-semibold" style={{ color: i === 4 ? 'var(--pse-success)' : 'var(--pse-text)' }}>{s}</p>
            </div>
          ))}
        </div>
        <p className="pse-micro mt-3 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          Qualification settles on the backend when your invite's first tool activates — capacity changes apply from that moment forward.
        </p>
      </section>

      {/* Referral list */}
      <section className="pse-card overflow-hidden">
        <div className="border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
          <p className="pse-h3">Your referrals</p>
          <p className="pse-micro mt-0.5">Actual qualification stage for each miner you invited.</p>
        </div>
        {error ? (
          <div className="p-5">
            <p className="pse-caption" style={{ color: 'var(--pse-danger)' }}>{error}</p>
            <button onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm mt-3">
              {refreshing ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        ) : referrals.length === 0 ? (
          <PSEEmpty
            icon={Users}
            title="No referrals yet"
            body="Share your referral link. When someone registers through it, they appear here with their live qualification stage."
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
            {referrals.map(r => {
              const stage = referralStageView(r.status);
              const isQualified = r.status === 'qualified';
              const isRejected = r.status === 'rejected';
              return (
                <li key={r.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isQualified
                        ? <CheckCircle2 size={14} style={{ color: 'var(--pse-success)' }} />
                        : isRejected
                          ? <Circle size={14} style={{ color: 'var(--pse-danger)' }} />
                          : <Circle size={14} style={{ color: 'var(--pse-text-3)' }} />}
                      <p className="pse-caption truncate font-medium" style={{ color: 'var(--pse-text)' }}>
                        {r.refereeUsername || r.refereeEmailMasked || `Miner ${String(r.refereeId || '').slice(0, 6)}`}
                      </p>
                    </div>
                    <p className="pse-micro mt-1 pl-6">{stage.help}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 pl-6 sm:pl-0">
                    <span className="pse-micro">{timeAgo(r.qualifiedAt || r.createdAt)}</span>
                    <Chip label={stage.label} chip={stage.chip} dot={false} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default PSEMineReferrals;
