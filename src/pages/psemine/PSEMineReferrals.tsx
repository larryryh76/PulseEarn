import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { CopyField, PSEError, PSELoading, gbpHour, timeAgo, referralStageView, REFERRAL_STAGES } from '../../components/psemine/pse';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import toast from 'react-hot-toast';

const MAX_REFERRALS = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
const BONUS = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR;

/** Displays referral qualification, reported capacity, invitation sharing, and backend referral records. */
export const PSEMineReferrals: React.FC = () => {
  const { referrals, referralCode, loading, error, refresh, refreshing, state, feedErrors, refreshFeed } = usePseState();
  const { userData } = usePSEMineAuth();
  const { pseUser } = usePSEMine();
  const code = referralCode || userData?.referralCode || null;
  const link = code ? `${window.location.origin}/mine/signup?ref=${encodeURIComponent(code)}` : null;
  const qualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const capacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;
  const inProgress = referrals.filter(referral => referral.status !== 'qualified' && referral.status !== 'rejected').length;

  const stageCounts = useMemo(() => {
    const result: Record<string, number> = Object.fromEntries(REFERRAL_STAGES.map(stage => [stage.id, 0]));
    for (const referral of referrals) result[String(referral.status || 'registered')] = (result[String(referral.status || 'registered')] || 0) + 1;
    return result;
  }, [referrals]);

  const share = async () => {
    if (!link) return;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ title: 'PSEmine campaign', url: link }); return; }
      catch { /* Share dismissal falls through to copy. */ }
    }
    try { await navigator.clipboard.writeText(link); toast.success('Referral link copied.'); }
    catch { toast.error('Could not copy the link. Select and copy it manually.'); }
  };

  if (loading && !state) return <main className="pm-page"><PSELoading label="Loading referral records" /></main>;
  if (error && !state) return <main className="pm-page"><PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} /></main>;

  return (
    <main className="pm-page">
      <header>
        <p className="pm-eyebrow">Referrals · capacity lanes</p>
        <h1>Five lanes. One clear qualification rule.</h1>
        <p>Each referral adds {gbpHour(BONUS)} after qualifying, up to {MAX_REFERRALS} referrals. Capacity starts at qualification and is never backdated.</p>
        <div className="pm-verdict"><div><p className="pm-eyebrow">Qualified capacity</p><div className="pm-value">{gbpHour(capacity)}</div><p>{qualified} / {MAX_REFERRALS} qualified</p></div><div className="pm-verdict-side"><div><span>Per qualified referral</span><strong>{gbpHour(BONUS)}</strong></div><div><span>Qualification pipeline</span><strong>{inProgress} in progress</strong></div></div></div>
      </header>

      <section aria-labelledby="referral-lanes-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Referral capacity</p><h2 id="referral-lanes-heading">Qualification lanes</h2></div><Link to="/mine/dashboard">View total capacity register</Link></div>
        <ol className="pm-lane-list">
          {Array.from({ length: MAX_REFERRALS }, (_, index) => {
            const isQualified = index < qualified;
            return <li key={index}><span className="pm-lane-number">{String(index + 1).padStart(2, '0')}</span><span>{isQualified ? 'Qualified capacity active' : 'Available qualification lane'}</span><strong className={isQualified ? 'pm-status-positive' : ''}>{isQualified ? `+${gbpHour(BONUS)}` : 'Not yet qualified'}</strong></li>;
          })}
        </ol>
        <p>Current referral capacity: {gbpHour(capacity)}. Qualification is confirmed only by the backend after the referred miner’s first tool activates.</p>
      </section>

      <section aria-labelledby="qualification-pipeline-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Qualification pipeline</p><h2 id="qualification-pipeline-heading">Where recorded invites stand</h2></div><button type="button" onClick={() => void refreshFeed('referrals')} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh referrals'}</button></div>
        {feedErrors.referrals && <div role="alert" className="pm-note"><p>Referral records could not be loaded; the pipeline may be incomplete.</p><button type="button" onClick={() => void refreshFeed('referrals')} disabled={refreshing}>Retry referral feed</button></div>}
        <dl>{REFERRAL_STAGES.map(stage => <div key={stage.id}><dt>{stage.label}</dt><dd>{stageCounts[stage.id] || 0} records</dd></div>)}</dl>
      </section>

      <section aria-labelledby="invite-link-heading">
        <p className="pm-eyebrow">Invitation</p><h2 id="invite-link-heading">Your referral link</h2>
        {link ? <>
          <p>The backend attributes signups made through this link. Self-referrals, duplicates and circular references are rejected.</p>
          <p><CopyField value={link} display={link} label="referral link" fullWidth /></p>
          <p>Code: <CopyField value={code || ''} display={code || ''} label="referral code" /></p>
          <button type="button" onClick={() => void share()}>Share invite link</button>
        </> : <div className="pm-empty"><p>No referral code has been returned for this account. An invite link is not available yet.</p></div>}
      </section>

      <section aria-labelledby="referral-ledger-heading">
        <div className="pm-page-section-heading"><div><p className="pm-eyebrow">Ledger</p><h2 id="referral-ledger-heading">Recorded referrals</h2></div><span>{referrals.length} records</span></div>
        {referrals.length === 0 ? <div className="pm-empty"><p>No referrals recorded. When someone registers through your link, their backend-reported qualification stage appears here.</p></div> : (
          <div className="pm-ledger-wrap"><table className="pm-ledger"><thead><tr><th>Miner</th><th>Registered</th><th>Stage</th><th>Qualified</th><th>Capacity added</th></tr></thead><tbody>
            {referrals.map(referral => {
              const stage = referralStageView(referral.status);
              const name = referral.refereeUsername || referral.refereeEmailMasked || `Miner ${String(referral.refereeId || '').slice(0, 6)}`;
              const isQualified = referral.status === 'qualified';
              return <tr key={referral.id}><td>{name}</td><td>{timeAgo(referral.createdAt)}</td><td>{stage.label}</td><td>{referral.qualifiedAt ? timeAgo(referral.qualifiedAt) : '—'}</td><td>{isQualified ? `+${gbpHour(BONUS)}` : '—'}</td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>

      <section aria-labelledby="referral-rules-heading"><p className="pm-eyebrow">Rules</p><h2 id="referral-rules-heading">Qualification, once and from that point forward</h2>
        <ol><li>Invitee registers through your code.</li><li>Invitee connects a BNB Smart Chain payment wallet.</li><li>Invitee purchases a tool; backend verification completes.</li><li>First tool activates and qualification is recorded once.</li><li>{gbpHour(BONUS)} is added to your referral capacity from qualification forward, up to five qualified lanes.</li></ol>
        <p><Link to="/mine/guide">Read the capacity and referral guide</Link></p>
      </section>
    </main>
  );
};

export default PSEMineReferrals;
