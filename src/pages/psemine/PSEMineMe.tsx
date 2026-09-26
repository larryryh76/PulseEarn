import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  PSELoading, gbpHour, fmtDateTime, shortAddr, campaignStatusView,
} from '../../components/psemine/pse';
import { updatePassword as firebaseUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import { mapAuthError } from '../../utils/errors';

const SECTIONS = [
  { id: 'account', label: 'Account' },
  { id: 'security', label: 'Security' },
  { id: 'wallets', label: 'Wallets' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'campaign', label: 'Campaign' },
  { id: 'support', label: 'Support' },
  { id: 'session', label: 'Session' },
];

const SpecRow: React.FC<{ k: string; v: React.ReactNode; hint?: React.ReactNode }> = ({ k, v, hint }) => (
  <div>
    <strong>{k}</strong>
    <p>{v}</p>
    {hint && <p>{hint}</p>}
  </div>
);

const Section: React.FC<{ id: string; title: string; meta?: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  id, title, meta, action, children,
}) => (
  <section id={`account-section-${id}`}>
    <header>
      <h2>{title}</h2>
      {meta && <p>{meta}</p>}
      {action}
    </header>
    {children}
  </section>
);

/** Account identity, security, wallets and campaign information. */
export const PSEMineMe: React.FC = () => {
  const { currentUser, userData, logout } = usePSEMineAuth();
  const { state, campaignStatus, notifications, unreadNotifications, loading } = usePseState();
  const navigate = useNavigate();

  const [active, setActive] = useState('account');
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const campaignView = campaignStatusView(campaignStatus);
  const payoutWallet = state?.user?.payoutWallet ?? null;
  const connectedWallet = state?.user?.connectedWallet ?? null;
  const capacity = state?.user?.totalCapacityGBPPerHour ?? 0;
  const isPasswordAccount = (currentUser?.providerData || []).some(p => p.providerId === 'password');
  const lastNotification = notifications.reduce<typeof notifications[number] | null>((acc, n) => {
    if (!acc) return n;
    const a = new Date(String(acc.createdAt ?? '')).getTime();
    const b = new Date(String(n.createdAt ?? '')).getTime();
    return (Number.isFinite(b) ? b : 0) > (Number.isFinite(a) ? a : 0) ? n : acc;
  }, null);

  const goTo = (id: string) => {
    setActive(id);
    const el = document.getElementById(`account-section-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/mine/login', { replace: true }); }
    catch { toast.error('Sign out failed. Please try again.'); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('New passwords don’t match.'); return; }
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

  return (
    <main>
      <header>
        <p>Account · identity</p>
        <h1>Account</h1>
        <p role="status">PSEmine access</p>
        <p>Your PSEmine identity, security, wallets and campaign information. PulseEarn settings live in the PulseEarn product and are not shown here.</p>
      </header>

      {loading && !state && <PSELoading label="Loading account details" />}

      <section aria-labelledby="account-capacity-heading">
        <h2 id="account-capacity-heading">Account capacity</h2>
        <p>{gbpHour(capacity)}</p>
        <p role="status">{currentUser?.emailVerified ? 'Verified' : 'Verification pending'}</p>
        <p>
          {currentUser?.emailVerified
            ? 'One Firebase identity is shared across PulseEarn and PSEmine; product access is separate and explicit — this account is enrolled in PSEmine.'
            : 'Email verification is required before the console enables purchases and payouts.'}
        </p>
        <dl>
          <div><dt>Campaign</dt><dd>{campaignView.label.trim()}</dd></div>
          <div><dt>Operating tools</dt><dd>{String((state?.tools ?? []).length)}</dd></div>
          <div><dt>Sign-in</dt><dd>{isPasswordAccount ? 'Email & password' : 'Google'}</dd></div>
          <div><dt>Member since</dt><dd>{fmtDateTime(userData?.createdAt)}</dd></div>
        </dl>
      </section>

      <nav aria-label="Account sections">
        <h2>Sections</h2>
        <ul>
          {SECTIONS.map(s => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => goTo(s.id)}
                aria-current={active === s.id ? 'true' : undefined}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="account-identity-heading">
        <header>
          <h2 id="account-identity-heading">Account identity</h2>
          <p>Shared sign-in identity · PSEmine entitlement</p>
        </header>
        <dl>
          <div>
            <dt>Identity</dt>
            <dd>{userData?.username || 'PSEmine miner'}</dd>
            <dd>{currentUser?.email || '—'}</dd>
            <dd>Email status: {currentUser?.emailVerified ? 'Verified' : 'Action needed'}</dd>
          </div>
          <div><dt>Member since</dt><dd>{fmtDateTime(userData?.createdAt)}</dd></div>
          <div><dt>Sign-in methods</dt><dd>{isPasswordAccount ? 'Email & password' : 'Google'}</dd></div>
          <div><dt>Display name</dt><dd>{userData?.username || '—'}</dd></div>
          <div>
            <dt>Email status</dt>
            <dd>{currentUser?.emailVerified ? 'Verified' : 'Not verified'}</dd>
            <dd>{currentUser?.emailVerified ? 'Payouts and purchases enabled' : 'Verification is required for the console'}</dd>
          </div>
        </dl>
      </section>

      <aside>
        <h2>One identity, two products</h2>
        <p>Your Firebase sign-in is shared with PulseEarn, but points, tasks and rewards never apply in PSEmine. Campaign earnings here are GBP-denominated and settled in BNB.</p>
      </aside>

      <Section
        id="security"
        title="Security"
        meta="Identity protection for this account"
        action={isPasswordAccount ? (
          <button
            type="button"
            onClick={() => { setPwOpen(v => !v); setPwError(null); }}
          >
            {pwOpen ? 'Close' : 'Change password'}
          </button>
        ) : <p>Managed by Google</p>}
      >
        <SpecRow
          k="Password"
          v={isPasswordAccount ? 'Set' : 'Not applicable'}
          hint={isPasswordAccount ? 'Changing it requires your current password' : 'Your Google account manages credentials'}
        />
        <SpecRow k="Email verification" v={currentUser?.emailVerified ? 'Complete' : 'Pending'} />

        {pwOpen && isPasswordAccount && (
          <div>
            {pwDone ? (
              <p role="status">Password updated. Use it next time you sign in.</p>
            ) : (
              <form onSubmit={changePassword} noValidate>
                {pwError && <p role="alert">{pwError}</p>}
                <label>
                  Current password
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  New password — minimum 8 characters
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide passwords' : 'Show passwords'}>
                  {showPw ? 'Hide passwords' : 'Show passwords'}
                </button>
                <button type="submit" disabled={pwBusy}>
                  {pwBusy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        )}
      </Section>

      <Section
        id="wallets"
        title="Wallets & payout"
        meta="The wallet you pay from and the address settlement is paid to are different things"
        action={<Link to="/mine/wallet">Manage in wallet</Link>}
      >
        <SpecRow
          k="Payment wallet (BNB)"
          v={connectedWallet ? shortAddr(connectedWallet) : 'Not connected'}
          hint="Used to sign tool purchases"
        />
        <SpecRow
          k="Payout wallet (BNB)"
          v={payoutWallet ? shortAddr(payoutWallet) : 'Not set'}
          hint={payoutWallet ? 'Receives your campaign settlement' : 'Required before settlement'}
        />
        <SpecRow k="Payout asset" v="BNB" hint="BNB Smart Chain (chain 56)" />
        <SpecRow k="Payout minimum" v="£10.00" hint="Per request, after settlement" />
        <SpecRow k="Accounting currency" v="GBP (£)" hint="Campaign earnings are GBP-denominated" />
      </Section>

      <Section
        id="notifications"
        title="Notifications"
        meta="PSEmine notification feed only — opened from the bell in the product bar"
        action={<p>{unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All read'}</p>}
      >
        <SpecRow k="Notifications received" v={String(notifications.length)} />
        <SpecRow
          k="Most recent"
          v={lastNotification ? (lastNotification.title || 'Notification') : '—'}
          hint={lastNotification
            ? `${fmtDateTime(lastNotification.createdAt)} · ${lastNotification.read ? 'read' : 'unread'}`
            : 'Nothing recorded yet'}
        />
        <p>PSEmine reads its own notification records only. PulseEarn notifications never appear in this console.</p>
      </Section>

      <Section id="campaign" title="Campaign information" meta="Read-only — derived from backend state">
        <SpecRow k="Campaign status" v={campaignView.label.trim()} />
        <SpecRow k="Your capacity" v={gbpHour(capacity)} hint="Tools plus qualified referrals" />
        <SpecRow
          k="Operating tools"
          v={String((state?.tools ?? []).length)}
          hint={state?.tools?.length ? 'Cycle state is on the dashboard' : 'No tools purchased yet'}
        />
        <SpecRow k="Campaign duration" v="90 days" hint="Fixed, then settlement" />
        <ul>
          <li><Link to="/mine/guide">Campaign guide</Link></li>
          <li><Link to="/mine/activity">Activity ledger</Link></li>
          <li><Link to="/mine/tools">Mining tools</Link></li>
        </ul>
      </Section>

      <Section id="support" title="Support" meta="Questions about tools, payments or settlement">
        <p>
          <Link to="/help">Contact support</Link>. Include your account email and any transaction hash.
        </p>
        <SpecRow k="Terms of service" v={<Link to="/terms">Open</Link>} />
        <SpecRow k="Privacy policy" v={<Link to="/privacy">Open</Link>} />
      </Section>

      <Section id="session" title="Session">
        <p>Sign out of PSEmine. Ends the session on this device. Tools, balances and settlement are unaffected.</p>
        <button type="button" onClick={() => void handleLogout()}>Sign out</button>
      </Section>

      <p>
        <Link to="/help">Account questions? Support</Link>
        {' · '}
        <Link to="/mine/guide">Guide</Link>
      </p>
    </main>
  );
};

export default PSEMineMe;
