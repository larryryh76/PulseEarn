import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ChevronRight, LogOut, KeyRound, Eye, EyeOff,
  CheckCircle2, AlertCircle, BookOpen, LifeBuoy, Lock, Bell,
  User as UserIcon, Mail, Clock, Gauge, Layers,
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  PageHeader, Panel, DataRow, Chip, gbpHour, fmtDateTime, shortAddr,
  campaignStatusView, Field, PSELoading,
} from '../../components/psemine/pse';
import { updatePassword as firebaseUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import { mapAuthError } from '../../utils/errors';

export const PSEMineMe: React.FC = () => {
  const { currentUser, userData, logout } = usePSEMineAuth();
  const { state, campaignStatus, notifications, unreadNotifications, loading } = usePseState();
  const navigate = useNavigate();

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
  const capacity = state?.user?.totalCapacityGBPPerHour ?? 0;
  const isPasswordAccount = (currentUser?.providerData || []).some(p => p.providerId === 'password');
  const lastNotification = notifications[0];

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

  return (
    <div className="pse-section max-w-4xl space-y-4 pb-24 pt-5 md:pt-7">
      <PageHeader
        eyebrow="Account"
        title="Account center"
        sub="Your PSEmine identity, security, wallets and campaign information. PulseEarn settings live in the PulseEarn product and are not shown here."
      />

      {loading && !state && <PSELoading skeleton label="Loading account details" />}

      {/* ═══ ACCOUNT ═══ */}
      <Panel title="Account" meta="Shared sign-in identity · PSEmine entitlement">
        <div className="flex items-center gap-3.5 px-5 py-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-bold"
            style={{ background: 'rgba(76,158,248,0.12)', color: 'var(--pse-blue)', border: '1px solid rgba(76,158,248,0.3)' }}>
            {(userData?.username || currentUser?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="pse-h3 truncate">{userData?.username || 'PSEmine miner'}</p>
            <p className="pse-micro truncate">{currentUser?.email}</p>
          </div>
          <div className="ml-auto hidden shrink-0 sm:block">
            <Chip label="PSEmine access" chip="pse-chip pse-chip-success" dot={false} />
          </div>
        </div>
        <div className="divide-y border-t" style={{ borderColor: 'var(--pse-line)' }}>
          <DataRow
            label="Email status"
            value={currentUser?.emailVerified ? 'Verified' : 'Not verified'}
            hint={currentUser?.emailVerified ? 'Payouts and purchases enabled' : 'Verification is required for the console'}
            right={<Chip
              label={currentUser?.emailVerified ? 'Verified' : 'Action needed'}
              chip={currentUser?.emailVerified ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-warning'}
              dot={false} />}
          />
          <DataRow label="Member since" value={fmtDateTime(userData?.createdAt)} mono />
          <DataRow label="Sign-in methods" value={isPasswordAccount ? 'Email & password' : 'Google'} />
          <DataRow label="Display name" value={userData?.username || '—'} />
        </div>
        <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
          <p className="pse-micro flex items-start gap-2">
            <UserIcon size={12} className="mt-0.5 shrink-0" />
            One Firebase identity is shared across PulseEarn and PSEmine. Product access is separate and explicit — this
            account is enrolled in PSEmine.
          </p>
        </div>
      </Panel>

      {/* ═══ SECURITY ═══ */}
      <Panel
        title="Security"
        meta="Identity protection for this account"
        action={
          isPasswordAccount ? (
            <button onClick={() => { setPwOpen(v => !v); setPwError(null); }} className="pse-btn pse-btn-secondary pse-btn-sm">
              <KeyRound size={13} /> {pwOpen ? 'Close' : 'Change password'}
            </button>
          ) : (
            <Chip label="Managed by Google" chip="pse-chip pse-chip-blue" dot={false} />
          )
        }
      >
        <div className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          <DataRow label="Password" value={isPasswordAccount ? 'Set' : 'Not applicable'} hint={isPasswordAccount ? 'Changing it requires your current password' : 'Your Google account manages credentials'} />
          <DataRow label="Email verification" value={currentUser?.emailVerified ? 'Complete' : 'Pending'} />
        </div>

        {pwOpen && isPasswordAccount && (
          <div className="border-t px-5 py-5" style={{ borderColor: 'var(--pse-line)' }}>
            {pwDone ? (
              <div className="pse-inset flex items-center gap-2.5 p-3.5">
                <CheckCircle2 size={15} style={{ color: 'var(--pse-success)' }} />
                <p className="pse-caption">Password updated. Use it next time you sign in.</p>
              </div>
            ) : (
              <form onSubmit={changePassword} className="space-y-3" noValidate>
                {pwError && (
                  <div role="alert" className="flex items-start gap-2 rounded-lg border px-3.5 py-2.5"
                    style={{ borderColor: 'rgba(240,68,56,0.35)', background: 'rgba(240,68,56,0.08)' }}>
                    <AlertCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-danger)' }} />
                    <p className="pse-caption" style={{ color: 'var(--pse-danger)' }}>{pwError}</p>
                  </div>
                )}
                <Field label="Current password">
                  <div className="relative">
                    <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
                    <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                      className="pse-input pl-10" autoComplete="current-password" required />
                  </div>
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="New password" hint="Min 8 characters">
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                        className="pse-input pr-11" autoComplete="new-password" minLength={8} required />
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg"
                        style={{ color: 'var(--pse-text-3)' }}
                        aria-label={showPw ? 'Hide passwords' : 'Show passwords'}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm new password">
                    <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                      className="pse-input" autoComplete="new-password" minLength={8} required />
                  </Field>
                </div>
                <button type="submit" disabled={pwBusy} className="pse-btn pse-btn-primary pse-btn-sm">
                  {pwBusy ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        )}
      </Panel>

      {/* ═══ WALLETS & PAYOUT PREFERENCES ═══ */}
      <Panel
        title="Wallets & payout"
        meta="Viewing wallet and settlement destination are separate addresses"
        action={<Link to="/mine/wallet" className="pse-btn pse-btn-secondary pse-btn-sm">Manage in wallet</Link>}
      >
        <div className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          <DataRow
            label="Payout wallet"
            value={payoutWallet ? shortAddr(payoutWallet) : 'Not set'}
            mono
            hint={payoutWallet ? 'Receives your campaign settlement' : 'Required before settlement'}
            right={<Chip
              label={payoutWallet ? 'Configured' : 'Required'}
              chip={payoutWallet ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-warning'}
              dot={false} />}
          />
          <DataRow label="Payout asset" value="BNB" hint="BNB Smart Chain (chain 56)" />
          <DataRow label="Payout minimum" value="£10.00" hint="Applies after settlement" />
          <DataRow label="Accounting currency" value="GBP (£)" hint="Campaign earnings are GBP-denominated" />
        </div>
      </Panel>

      {/* ═══ NOTIFICATIONS ═══ */}
      <Panel
        title="Notifications"
        meta="PSEmine notification feed only — opened from the bell in the product bar"
        action={<Chip
          label={unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All read'}
          chip={unreadNotifications > 0 ? 'pse-chip pse-chip-blue' : 'pse-chip pse-chip-neutral'}
          dot={false} />}
      >
        <div className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          <DataRow label="Notifications received" value={String(notifications.length)} />
          <DataRow
            label="Most recent"
            value={lastNotification ? (lastNotification.title || 'Notification') : '—'}
            hint={lastNotification ? `${fmtDateTime(lastNotification.createdAt)} · ${lastNotification.read ? 'read' : 'unread'}` : 'Nothing recorded yet'}
          />
        </div>
        <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
          <p className="pse-micro flex items-start gap-2">
            <Bell size={12} className="mt-0.5 shrink-0" />
            PSEmine reads its own notification records only. PulseEarn notifications never appear in this console.
          </p>
        </div>
      </Panel>

      {/* ═══ CAMPAIGN INFORMATION ═══ */}
      <Panel title="Campaign information" meta="Read-only — derived from backend state">
        <div className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
          <DataRow
            label="Campaign status"
            value={campaignView.label.trim()}
            right={<Chip label={campaignView.label.trim()} chip={campaignView.chip} pulse={campaignView.live} />}
          />
          <DataRow label="Your capacity" value={gbpHour(capacity)} hint="Tools plus qualified referrals" />
          <DataRow
            label="Operating tools"
            value={String((state?.tools ?? []).length)}
            hint={state?.tools?.length ? 'Cycle state is on the dashboard' : 'No tools purchased yet'}
          />
          <DataRow label="Campaign duration" value="90 days" hint="Fixed, then settlement" />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
          <Link to="/mine/guide" className="pse-micro inline-flex items-center gap-1.5 font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
            <BookOpen size={12} /> Campaign guide
          </Link>
          <Link to="/mine/activity" className="pse-micro inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--pse-text-2)' }}>
            <Clock size={12} /> Activity ledger
          </Link>
          <Link to="/mine/tools" className="pse-micro inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--pse-text-2)' }}>
            <Layers size={12} /> Tool marketplace
          </Link>
          <Link to="/mine/dashboard" className="pse-micro inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--pse-text-2)' }}>
            <Gauge size={12} /> Mining console
          </Link>
        </div>
      </Panel>

      {/* ═══ SUPPORT ═══ */}
      <Panel title="Support" meta="Questions about tools, payments or settlement">
        <Link to="/help" className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
              <LifeBuoy size={16} style={{ color: 'var(--pse-cyan)' }} />
            </div>
            <div>
              <p className="pse-h3">Contact support</p>
              <p className="pse-micro mt-0.5">Include your account email and any transaction hash.</p>
            </div>
          </div>
          <ChevronRight size={16} style={{ color: 'var(--pse-text-3)' }} />
        </Link>
        <div className="divide-y border-t" style={{ borderColor: 'var(--pse-line)' }}>
          <Link to="/terms" className="block px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
            <p className="pse-caption">Terms of service</p>
          </Link>
          <Link to="/privacy" className="block px-5 py-3.5 transition-colors hover:bg-white/[0.02]">
            <p className="pse-caption">Privacy policy</p>
          </Link>
        </div>
      </Panel>

      {/* ═══ SIGN OUT ═══ */}
      <Panel title="Session">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
            <div>
              <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>
                Sign out of PSEmine
              </p>
              <p className="pse-micro mt-0.5">
                Ends the session on this device. Tools, balances and settlement are unaffected.
              </p>
            </div>
          </div>
          <button onClick={() => void handleLogout()} className="pse-btn pse-btn-danger justify-center">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </Panel>

      <div className="flex items-center gap-2 px-1">
        <Mail size={12} style={{ color: 'var(--pse-text-3)' }} />
        <p className="pse-micro">
          Account questions? <Link to="/help" className="underline hover:text-[#F2F4F7]">Support</Link> ·{' '}
          <Link to="/mine/guide" className="underline hover:text-[#F2F4F7]">Guide</Link>
        </p>
      </div>
    </div>
  );
};

export default PSEMineMe;
