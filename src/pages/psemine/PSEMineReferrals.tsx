import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import {
  CopyField, PSELoading, PSEError,
  gbpHour, timeAgo, referralStageView, REFERRAL_STAGES,
} from '../../components/psemine/pse';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
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
      <header>
        <p>Referrals · capacity</p>
        <h1>Referral capacity</h1>
        <p>Each qualified referral adds +£{BONUS.toFixed(2)}/hour to your mining capacity, up to {MAX_REFERRALS} referrals (+{gbpHour(maxReferralCapacity)}). Capacity applies from the qualification moment forward — never retroactively.</p>
        <p role="status">
          {qualified >= MAX_REFERRALS ? 'Capacity maxed' : `${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} left`}
        </p>
        <button type="button" onClick={() => void share()} disabled={!link}>
          Share invite link
        </button>
      </header>

      <section aria-labelledby="qualified-capacity-heading">
        <h2 id="qualified-capacity-heading">Qualified referral capacity</h2>
        <p>{gbpHour(refCapacity)}</p>
        <p role="status">{qualified} of {MAX_REFERRALS} qualified</p>
        <p>
          {qualified >= MAX_REFERRALS
            ? `Referral capacity is at its campaign maximum of ${gbpHour(maxReferralCapacity)}.`
            : qualified === 0
              ? `No referral has qualified yet, so no referral capacity is accruing. ${remainingSlots} slot${remainingSlots === 1 ? '' : 's'} remain.`
              : `${gbpHour(remainingSlots * BONUS)} of referral capacity is still available across ${remainingSlots} remaining slot${remainingSlots === 1 ? '' : 's'}.`}
        </p>
        <dl>
          <div><dt>Bonus per referral</dt><dd>{gbpHour(BONUS)}</dd></div>
          <div><dt>In progress</dt><dd>{inProgress} of {referrals.length} invites</dd></div>
          <div><dt>Tool capacity</dt><dd>{gbpHour(toolCapacity)}</dd></div>
          <div><dt>Total capacity</dt><dd>{gbpHour(totalCapacity)}</dd></div>
        </dl>
      </section>

      <section aria-label="Mining capacity">
        <h2>Mining capacity</h2>
        <p>Referral lanes add to the tool lanes — one combined £/hour</p>
        <ul>
          {Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder).map(tool => {
            const owned = counts[tool.id] ?? 0;
            const potential = tool.hourlyRateGBP * tool.maxPerUser;
            return (
              <li key={tool.id}>
                {tool.name.replace(' Miner', '')}: {owned} of {tool.maxPerUser} owned; {gbpHour(owned * tool.hourlyRateGBP)} held{owned === 0 ? `; potential ${gbpHour(potential)} at the limit` : ''}.
              </li>
            );
          })}
          <li>
            Referrals: {qualified} of {MAX_REFERRALS} qualified; {gbpHour(refCapacity)} held{qualified === 0 ? `; up to ${gbpHour(maxReferralCapacity)} if all qualify` : ''}.
          </li>
        </ul>
        <p>Tools: {gbpHour(toolCapacity)}. Referrals: {gbpHour(refCapacity)}. Total: {gbpHour(toolCapacity + refCapacity)}.</p>
        <p>Maximums: {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} from tools, plus {gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} from referrals; theoretical ceiling {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.</p>
      </section>

      {!code && (
        <aside aria-label="Referral code notice">
          <h2>No referral code issued yet</h2>
          <p>Your invite link appears here as soon as your account has a referral code. Until then no invite can be attributed to you.</p>
        </aside>
      )}

      {qualified >= MAX_REFERRALS && (
        <aside aria-label="Referral capacity notice">
          <h2>Referral capacity at maximum</h2>
          <p>{MAX_REFERRALS} qualified referrals is the campaign limit. Further invites still register, but they cannot add more than {gbpHour(maxReferralCapacity)} of referral capacity.</p>
        </aside>
      )}

      <section aria-labelledby="qualification-pipeline-heading">
        <h2 id="qualification-pipeline-heading">Qualification pipeline</h2>
        <p>Where your invites currently stand — real records only</p>
        <dl>
          {REFERRAL_STAGES.map((s, i) => (
            <div key={s.id}>
              <dt>{String(i + 1).padStart(2, '0')} — {s.label}</dt>
              {i === REFERRAL_STAGES.length - 1 && <dd>Adds +£0.30/hour to your capacity</dd>}
              <dd>{String(stageCounts[s.id] || 0)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="invite-link-heading">
        <h2 id="invite-link-heading">Your invite link</h2>
        <p>New miners signing up through this link are attributed to your account by the backend</p>
        {link ? (
          <dl>
            <div>
              <dt>Invite link</dt>
              <dd>
                <p>Anyone who registers through it is attributed to you</p>
                <CopyField value={link} display={link} label="referral link" fullWidth />
              </dd>
            </div>
            <div>
              <dt>Referral code</dt>
              <dd>
                <p>Applied when your invite creates their account</p>
                <CopyField value={code || ''} display={code || ''} label="referral code" />
              </dd>
            </div>
            <div>
              <dt>Attribution</dt>
              <dd>
                <p>Recorded server-side — self-referrals, duplicates and circular references are rejected by design</p>
                Backend
              </dd>
            </div>
          </dl>
        ) : (
          <>
            <p>No referral code yet</p>
            <p>Your code is issued with your mining account and appears here automatically.</p>
          </>
        )}
      </section>

      <section aria-labelledby="your-referrals-heading">
        <h2 id="your-referrals-heading">Your referrals</h2>
        <p>{referrals.length} recorded invite{referrals.length === 1 ? '' : 's'}</p>
        <button type="button" onClick={() => void refreshFeed('referrals')}>Refresh</button>
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
          <>
            <p>No referrals yet</p>
            <p>Share your invite link. When someone registers through it, they appear here with their live qualification stage.</p>
          </>
        ) : (
          <ol>
          {referrals.map(r => {
            const stage = referralStageView(r.status);
            const name = r.refereeUsername || r.refereeEmailMasked || `Miner ${String(r.refereeId || '').slice(0, 6)}`;
            return (
              <li key={r.id}>
                <h3>{name}</h3>
                <p role="status">{stage.label}</p>
                <p>{stage.help} · {timeAgo(r.qualifiedAt || r.createdAt)}</p>
                <p>Step {stage.step} of {REFERRAL_STAGES.length}</p>
              </li>
            );
          })}
          </ol>
        )}
      </section>

      <section aria-labelledby="referral-rules-heading">
        <h2 id="referral-rules-heading">Referral rules</h2>
        <ol>
          <li><h3>Bonus per qualified referral</h3><p>{gbpHour(BONUS)}, added to your hourly mining capacity.</p></li>
          <li><h3>Maximum {MAX_REFERRALS} qualified referrals</h3><p>Referral capacity is capped at {gbpHour(maxReferralCapacity)}.</p></li>
          <li><h3>Qualification</h3><p>Register → connect a wallet → purchase a mining tool → mining active. Qualification settles on the backend when the invite's first tool activates — one auditable event, once per referral.</p></li>
          <li><h3>Timing</h3><p>Capacity applies from the qualification moment onward and is never applied retroactively to past operating time.</p></li>
        </ol>
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
