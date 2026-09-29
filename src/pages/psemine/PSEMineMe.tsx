import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { updatePassword as firebaseUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { campaignStatusView, fmtDateTime, gbpHour } from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseEmptyNote, PseFact, PseFacts, PseField, PseInput, PseLoading, PseNotice,
  PsePage, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';
import { mapAuthError } from '../../utils/errors';

/**
 * Account — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger account surface (section rail, stamps, verdict) was purged in
 * `refactor(psemine): purge legacy design implementation`. Account operations are
 * unchanged: password change still reauthenticates against Firebase first,
 * sign-out uses the PSEmine auth context, and the facts shown come from the
 * backend state and the account document.
 */
export const PSEMineMe: React.FC = () => {
  const { currentUser, userData, logout } = usePSEMineAuth();
  const { state, campaignStatus, notifications, unreadNotifications, loading } = usePseState();
  const navigate = useNavigate();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const campaignView = campaignStatusView(campaignStatus);
  const payoutWallet = state?.user?.payoutWallet ?? null;
  const connectedWallet = state?.user?.connectedWallet ?? null;
  const capacity = state?.user?.totalCapacityGBPPerHour ?? 0;
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

  if (loading && !state && !currentUser) {
    return (
      <div className="pse-console-main">
        <PseLoading label="Loading your account" />
      </div>
    );
  }

  const lastNotification = notifications[0] ?? null;

  return (
    <PsePage
      title="Account"
      objective="Your identity, mining account facts, notifications and security settings."
      actions={<PseButton onClick={() => void handleLogout()}>Sign out</PseButton>}
    >
      <PseSection title="Identity">
        <PseFacts cols={2}>
          <PseFact label="Email" value={currentUser?.email || '—'} text />
          <PseFact label="Email verified" value={currentUser?.emailVerified ? 'Verified' : 'Not verified'} text />
          <PseFact label="Display name" value={userData?.username || '—'} text />
          <PseFact label="Referral code" value={userData?.referralCode || '—'} />
          <PseFact label="PSEmine account" value={userData?.productAccess?.psemine ? 'Enabled' : 'Not enabled'} text />
          <PseFact label="Onboarding" value={userData?.onboardingCompleted === false ? 'Not completed' : 'Completed'} text />
        </PseFacts>
      </PseSection>

      <PseSection title="Mining account" meta={`Campaign ${campaignView.label.toLowerCase()}`}>
        <PseFacts cols={2}>
          <PseFact label="Total capacity" value={gbpHour(capacity)} />
          <PseFact label="Settlement-available" value={state?.user?.availableMinor !== undefined ? `£${(state.user.availableMinor / 100).toFixed(2)}` : '—'} />
          <PseFact label="Connected wallet" value={connectedWallet || 'Not connected'} text={!connectedWallet} />
          <PseFact label="Payout wallet" value={payoutWallet || 'Not set'} text={!payoutWallet} />
        </PseFacts>
        <p className="pse-block-note">
          <Link to="/mine/wallet" className="pse-link">Manage wallets and payouts</Link>{' '}
          — the connected wallet signs purchases, the payout wallet receives settlement. They are not the same thing.
        </p>
      </PseSection>

      <PseSection title="Notifications" meta={`${unreadNotifications} unread of ${notifications.length}`}>
        {notifications.length === 0 ? (
          <PseEmptyNote glyph="audit" title="No notifications yet">
            New notifications appear in the console as the backend records them — a purchase verified, a session
            finishing, a referral qualifying, a campaign milestone. This list is a view of those records, not a
            separate channel.
          </PseEmptyNote>
        ) : (
          <PseTable
            head={['Notification', 'Type', 'When', 'State']}
            caption="Notifications recorded on this account"
          >
            {notifications.slice(0, 8).map(n => (
              <PseRow key={n.id}>
                <PseCell sub={n.message || undefined}>{n.title || 'Notification'}</PseCell>
                <PseCell>{n.type || '—'}</PseCell>
                <PseCell>{fmtDateTime(n.createdAt)}</PseCell>
                <PseCell>{n.read ? 'Read' : 'Unread'}</PseCell>
              </PseRow>
            ))}
          </PseTable>
        )}
        {lastNotification && (
          <p className="pse-block-note">
            Most recent: {lastNotification.title || lastNotification.type || 'notification'} ·{' '}
            {fmtDateTime(lastNotification.createdAt)}. The full list opens from the bell in the console bar.
          </p>
        )}
      </PseSection>

      <PseSection title="Security">
        {isPasswordAccount ? (
          <form onSubmit={changePassword} className="max-w-md space-y-3" noValidate>
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
            <div className="flex flex-wrap gap-2">
              <PseButton type="submit" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</PseButton>
              <Link to="/mine/forgot-password" className="pse-link">Send a reset link instead</Link>
            </div>
          </form>
        ) : (
          <PseNotice>
            This account signs in with a third-party identity provider, so there is no PSEmine password to change.
            Manage it with your identity provider, or use a reset link from the sign-in page.
          </PseNotice>
        )}
      </PseSection>

      <PseSection title="Help and documentation">
        <ul className="pse-notes">
          <li>
            <Link to="/mine/guide" className="pse-link">How PSEmine works</Link> — the guide opens over the console:
            tools, capacity, referrals, payments, settlement and the campaign end.
          </li>
          <li>
            <Link to="/mine/guide/onboarding" className="pse-link">Onboarding walkthrough</Link> — the same guide, in
            the order it was first shown.
          </li>
          <li><Link to="/mine/support" className="pse-link">Support and the document index</Link></li>
          <li>
            <Link to="/mine/terms" className="pse-link">Terms</Link> ·{' '}
            <Link to="/mine/privacy" className="pse-link">Privacy</Link> ·{' '}
            <Link to="/mine/risk" className="pse-link">Risk disclosure</Link>
          </li>
        </ul>
      </PseSection>
    </PsePage>
  );
};

export default PSEMineMe;
