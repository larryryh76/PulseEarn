import React, { useState } from 'react';
import './PSEMineMe.css';
import { Link, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { updatePassword as firebaseUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { campaignStatusView, shortAddr, timeAgo } from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseFact, PseFacts, PseField, PseInput, PseNotice,
  PsePage, PseSection, PseSkeleton, PseSplit, PseStack, PseStatus,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';
import { mapAuthError } from '../../utils/errors';

/**
 * Account — the console's settings surface.
 *
 * Identity, wallet destinations, security, session and support, grouped as a
 * settings register. Balances and capacity are deliberately absent: they belong
 * to the dashboard and the wallet, and stating them again here would create a
 * second, drift-prone copy of the account's figures. Every control on this page
 * performs its real operation — the password change still reauthenticates against
 * Firebase first, and sign-out uses the PSEmine auth context.
 */
export const PSEMineMe: React.FC = () => {
  const { currentUser, userData, logout } = usePSEMineAuth();
  const { state, campaignStatus, loading, activities, notifications, feedErrors, refreshFeed } = usePseState();
  const navigate = useNavigate();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const payoutWallet = state?.user?.payoutWallet ?? null;
  const connectedWallet = state?.user?.connectedWallet ?? null;
  const isPasswordAccount = (currentUser?.providerData || []).some(p => p.providerId === 'password');

  const handleLogout = async () => {
    try { await logout(); navigate('/mine/login', { replace: true }); }
    catch { toast.error('Sign out failed. Please try again.'); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords don\u2019t match.'); return; }
    setPwBusy(true);
    try {
      const user = auth.currentUser;
      if (!user?.email) throw new Error('Not signed in.');
      const cred = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, cred);
      await firebaseUpdatePassword(user, newPw);
      setPwDone(true);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      toast.success('Password updated.');
    } catch (error) {
      setPwError(mapAuthError(error));
    } finally { setPwBusy(false); }
  };

  /* The account's identity comes from the session, which is already resolved by
     the route guard, so this page never waits on the mining state as a whole:
     the two wallet facts that DO come from it are drawn as skeletons instead. */
  const walletsPending = loading && !state;

  return (
    <PsePage
      title="Account"
      objective="Your identity, the wallets this product uses, security and support. Mining figures live on the dashboard and wallet."
    >
      <section className="pse-account-hero" aria-label="Account overview">
        <div className="pse-account-identity">
          <div className="pse-account-avatar" aria-hidden="true">
            {(userData?.username || currentUser?.email || 'P').trim().charAt(0).toUpperCase()}
          </div>
          <div className="pse-account-person">
            <span className="pse-account-eyebrow">PSEMINE MEMBER</span>
            <h2>{userData?.username || 'Your account'}</h2>
            <p>{currentUser?.email || 'Email unavailable'}</p>
            <span className={`pse-account-verification ${currentUser?.emailVerified ? 'is-verified' : 'is-pending'}`}>
              <span aria-hidden="true" />{currentUser?.emailVerified ? 'Email verified' : 'Verification pending'}
            </span>
          </div>
        </div>
        <div className="pse-account-hero-actions">
          <Link to="/mine/wallet" className="pse-account-shortcut"><span aria-hidden="true">↗</span><span>Wallets</span></Link>
          <Link to="/mine/activity" className="pse-account-shortcut"><span aria-hidden="true">↗</span><span>Activity</span></Link>
          <Link to="/mine/support" className="pse-account-shortcut"><span aria-hidden="true">↗</span><span>Support</span></Link>
        </div>
        <div className="pse-account-id-strip">
          <span>REFERRAL CODE</span><strong>{userData?.referralCode || 'Not assigned'}</strong>
          <span className="pse-account-access">{userData?.productAccess?.psemine ? 'ACCESS ACTIVE' : 'ACCESS NOT ENABLED'}</span>
        </div>
      </section>
      <PseSplit>
        <PseStack>
          <PseSection title="Identity">
            <PseFacts cols={2}>
              <PseFact label="Email" value={currentUser?.email || '—'} text />
              <PseFact
                label="Email verified"
                value={
                  <PseStatus tone={currentUser?.emailVerified ? 'good' : 'hold'}>
                    {currentUser?.emailVerified ? 'Verified' : 'Not verified'}
                  </PseStatus>
                }
              />
              <PseFact label="Display name" value={userData?.username || '—'} text />
              <PseFact label="Referral code" value={userData?.referralCode || '—'} />
              <PseFact label="PSEmine access" value={userData?.productAccess?.psemine ? 'Enabled' : 'Not enabled'} text />
              <PseFact label="Onboarding" value={userData?.onboardingCompleted === false ? 'Not completed' : 'Completed'} text />
            </PseFacts>
            {!currentUser?.emailVerified && (
              <PseNotice tone="attention">
                This account’s email is not verified. Some account operations may require a verified address.
              </PseNotice>
            )}
          </PseSection>

          <PseSection title="Recent activity" meta={activities.length ? `${activities.length} recent records loaded` : 'Account event ledger'}>
            {feedErrors.activities && (
              <PseNotice tone="attention" title="Activity could not be synchronized">
                The recent event list may be out of date. Use the activity page to retry the feed.
              </PseNotice>
            )}
            {activities.length === 0 ? (
              <PseEmptyNote title="No activity records loaded">
                Purchases, wallet changes, referral milestones and campaign events appear here when the backend records them.
              </PseEmptyNote>
            ) : (
              <ul className="pse-notes">
                {activities.slice(0, 3).map(activity => (
                  <li key={activity.id}>
                    <strong>{activity.title || 'Account event'}</strong>
                    {activity.description ? ` — ${activity.description}` : ''}
                    <span className="pse-prose--sm"> · {activity.createdAt ? timeAgo(activity.createdAt) : 'Time not reported'}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pse-actions">
              <Link to="/mine/activity" className="pse-btn pse-btn--secondary pse-btn--sm">Open full activity</Link>
              {feedErrors.activities && (
                <PseButton variant="secondary" size="sm" onClick={() => void refreshFeed('activities')}>Retry activity</PseButton>
              )}
            </div>
          </PseSection>

          <PseSection title="Security">
            {isPasswordAccount ? (
              <form onSubmit={changePassword} className="pse-security-form" noValidate>
                <PseField label="Current password" htmlFor="pse-pw-current">
                  <PseInput id="pse-pw-current" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" required />
                </PseField>
                <PseField label="New password" hint="Minimum 8 characters" htmlFor="pse-pw-new">
                  <PseInput id="pse-pw-new" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" required minLength={8} />
                </PseField>
                <PseField label="Confirm new password" htmlFor="pse-pw-confirm">
                  <PseInput id="pse-pw-confirm" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" required minLength={8} />
                </PseField>
                {pwError && <PseNotice tone="danger" title="Password not changed">{pwError}</PseNotice>}
                {pwDone && <PseNotice tone="good" title="Password updated">Your new password is active on this account.</PseNotice>}
                <div className="pse-actions">
                  <PseButton type="submit" size="sm" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</PseButton>
                  <Link to="/mine/forgot-password" className="pse-textlink">Send a reset link instead</Link>
                </div>
              </form>
            ) : (
              <PseNotice>
                This account signs in with a third-party identity provider, so there is no PSEmine
                password to change. Manage it with your identity provider, or use a reset link from
                the sign-in page.
              </PseNotice>
            )}
          </PseSection>
        </PseStack>

        <PseStack>
          <PseSection title="Wallets">
            <PseFacts cols={1}>
              <PseFact
                label="Connected wallet"
                value={walletsPending
                  ? <PseSkeleton width="9ch" height="0.875rem" />
                  : connectedWallet ? shortAddr(connectedWallet) : 'Not connected'}
                text={!walletsPending && !connectedWallet}
              />
              <PseFact
                label="Payout wallet"
                value={walletsPending
                  ? <PseSkeleton width="9ch" height="0.875rem" />
                  : payoutWallet ? shortAddr(payoutWallet) : 'Not set'}
                text={!walletsPending && !payoutWallet}
              />
            </PseFacts>
            <p className="pse-prose--sm">
              The connected wallet signs purchases in this browser. The payout wallet receives
              settlement, and is set on the wallet page. They are not the same thing.
            </p>
            <div className="pse-actions">
              <Link to="/mine/wallet" className="pse-btn pse-btn--secondary pse-btn--sm">Manage wallets</Link>
            </div>
          </PseSection>

          <PseSection title="Notifications" meta={`${notifications.filter(n => !n.read).length} unread`}>
            <PseFacts cols={2}>
              <PseFact label="Unread" value={String(notifications.filter(n => !n.read).length)} />
              <PseFact label="Loaded" value={String(notifications.length)} />
            </PseFacts>
            {feedErrors.notifications && (
              <PseNotice tone="attention" title="Notifications may be out of date">
                The notification service did not confirm the latest read status.
              </PseNotice>
            )}
            <p className="pse-prose--sm">
              Purchase updates, campaign announcements, referral milestones and account events are delivered through the notification center.
            </p>
            <div className="pse-actions">
              <PseButton variant="secondary" size="sm" onClick={() => window.dispatchEvent(new Event('psemine:open-notifications'))}>
                Open notifications
              </PseButton>
              {feedErrors.notifications && (
                <PseButton variant="secondary" size="sm" onClick={() => void refreshFeed('notifications')}>Sync notifications</PseButton>
              )}
            </div>
          </PseSection>

          <PseSection
            title="Account session"
            meta={campaignStatus !== null ? `Campaign ${campaignStatusView(campaignStatus).label.toLowerCase()}` : 'Campaign status not reported'}
          >
            <p className="pse-prose--sm">
              Signing out ends this browser’s session. Your mining account, ownership records and
              balances are unaffected; they remain with the account.
            </p>
            <div className="pse-actions">
              <PseButton tone="danger" variant="secondary" size="sm" onClick={() => void handleLogout()}>
                Sign out
              </PseButton>
            </div>
          </PseSection>

          <PseSection title="Help and documentation">
            <ul className="pse-notes">
              <li>
                <Link to="/mine/guide" className="pse-link">How PSEmine works</Link> — the guide opens over
                the console: tools, capacity, referrals, payments, settlement and the campaign end.
              </li>
              <li>
                <Link to="/mine/guide/onboarding" className="pse-link">Onboarding walkthrough</Link> — the same
                guide, in the order it was first shown.
              </li>
              <li><Link to="/mine/support" className="pse-link">Support and the document index</Link></li>
              <li>
                <Link to="/mine/terms" className="pse-link">Terms</Link> ·{' '}
                <Link to="/mine/privacy" className="pse-link">Privacy</Link> ·{' '}
                <Link to="/mine/risk" className="pse-link">Risk disclosure</Link>
              </li>
            </ul>
          </PseSection>
        </PseStack>
      </PseSplit>
    </PsePage>
  );
};

export default PSEMineMe;
