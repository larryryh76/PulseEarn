import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { updatePassword as firebaseUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { campaignStatusView, fmtDateTime, gbpHour } from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseField, PseInput, PseLoading, PseNotice, PsePage, PseRow, PseSection, PseTable,
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
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
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
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[
            ['Email', currentUser?.email || '—'],
            ['Email verified', currentUser?.emailVerified ? 'Yes' : 'No'],
            ['Display name', userData?.username || '—'],
            ['Referral code', userData?.referralCode || '—'],
            ['PSEmine account', userData?.productAccess?.psemine ? 'Enabled' : 'Not enabled'],
            ['Onboarding', userData?.onboardingCompleted === false ? 'Not completed' : 'Completed'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-sm text-text-secondary">{k}</dt>
              <dd className="text-sm text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      </PseSection>

      <PseSection title="Mining account">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[
            ['Campaign status', campaignView.label],
            ['Total capacity', gbpHour(capacity)],
            ['Connected wallet', connectedWallet || 'Not connected'],
            ['Payout wallet', payoutWallet || 'Not set'],
            ['Settlement-available', state?.user?.availableMinor !== undefined ? `£${(state.user.availableMinor / 100).toFixed(2)}` : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-sm text-text-secondary">{k}</dt>
              <dd className="text-sm text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm">
          <Link to="/mine/wallet" className="underline">Manage wallets and payouts</Link>
        </p>
      </PseSection>

      <PseSection title="Notifications" meta={`${unreadNotifications} unread of ${notifications.length}`}>
        {notifications.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No notifications yet. New notifications appear in the console footer as the backend records them.
          </p>
        ) : (
          <PseTable head={['Notification', 'Type', 'When', 'State']}>
            {notifications.slice(0, 8).map(n => (
              <PseRow key={n.id}>
                <PseCell>
                  {n.title || 'Notification'}
                  {n.message ? <span className="block text-xs text-text-tertiary">{n.message}</span> : null}
                </PseCell>
                <PseCell>{n.type || '—'}</PseCell>
                <PseCell>{fmtDateTime(n.createdAt)}</PseCell>
                <PseCell>{n.read ? 'Read' : 'Unread'}</PseCell>
              </PseRow>
            ))}
          </PseTable>
        )}
        {lastNotification && (
          <p className="text-xs text-text-tertiary">
            Most recent: {lastNotification.title || lastNotification.type || 'notification'} · {fmtDateTime(lastNotification.createdAt)}
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
            {pwError && <PseNotice tone="danger">{pwError}</PseNotice>}
            {pwDone && <PseNotice>Password updated.</PseNotice>}
            <div className="flex flex-wrap gap-2">
              <PseButton type="submit" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</PseButton>
              <Link to="/mine/forgot-password" className="text-sm underline">Send a reset link instead</Link>
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
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
          <li><Link to="/mine/guide" className="underline">How PSEmine works</Link> — tools, operating cycles, referrals, payments and settlement.</li>
          <li><Link to="/mine/guide/onboarding" className="underline">Onboarding walkthrough</Link></li>
          <li><Link to="/help" className="underline">Support center</Link></li>
          <li><Link to="/terms" className="underline">Terms</Link> · <Link to="/privacy" className="underline">Privacy</Link></li>
        </ul>
      </PseSection>
    </PsePage>
  );
};

export default PSEMineMe;
