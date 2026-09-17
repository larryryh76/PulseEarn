import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ChevronRight, LogOut, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
  LifeBuoy, Lock, Bell, Mail, Gauge, Layers,
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  WorkbenchHeader, Surface, KeyValue, KVRow, Chip, gbpHour, fmtDateTime, shortAddr,
  campaignStatusView, Field, PSELoading, ActionLink,
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

/**
 * The account centre.
 *
 * Composition (design system v2): a settings workspace — a sticky section rail
 * on desktop (a segmented jump row on mobile) beside ruled surfaces. Only
 * PSEmine-relevant settings exist here; PulseEarn preferences live in the
 * PulseEarn product.
 */
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
    const el = document.getElementById(`pse-sec-${id}`);
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
    <div className="pse-section pse-workbench pt-5 md:pt-7">
      <WorkbenchHeader
        title="Account"
        purpose="Your PSEmine identity, security, wallets and campaign information. PulseEarn settings live in the PulseEarn product and are not shown here."
        status={<Chip label="PSEmine access" chip="pse-chip pse-chip-success" dot={false} />}
      />

      {loading && !state && <PSELoading skeleton label="Loading account details" />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[186px_minmax(0,1fr)]">
        {/* Section rail (desktop) */}
        <nav aria-label="Account sections" className="hidden lg:block">
          <div className="sticky top-24 space-y-0.5">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(s.id)}
                aria-current={active === s.id ? 'true' : undefined}
                className="block w-full rounded-lg px-3 py-2 text-left pse-caption font-medium transition-colors"
                style={{
                  color: active === s.id ? 'var(--pse-text)' : 'var(--pse-text-2)',
                  background: active === s.id ? 'rgba(255,255,255,0.05)' : undefined,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          {/* Mobile jump row */}
          <div className="lg:hidden">
            <div className="pse-seg flex-wrap">
              {SECTIONS.map(s => (
                <button key={s.id} type="button" data-active={active === s.id} onClick={() => goTo(s.id)}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* ── ACCOUNT ── */}
          <div id="pse-sec-account" className="scroll-mt-28">
            <Surface title="Account" meta="Shared sign-in identity · PSEmine entitlement">
              <div className="flex items-center gap-3.5 px-4 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-bold"
                  style={{ background: 'rgba(76,158,248,0.12)', color: 'var(--pse-blue)', border: '1px solid rgba(76,158,248,0.3)' }}>
                  {(userData?.username || currentUser?.email || '?').slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="pse-h3 truncate">{userData?.username || 'PSEmine miner'}</p>
                  <p className="pse-micro truncate">{currentUser?.email}</p>
                </div>
                <div className="ml-auto hidden shrink-0 sm:block">
                  <Chip label={currentUser?.emailVerified ? 'Verified' : 'Action needed'} chip={currentUser?.emailVerified ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-warning'} dot={false} />
                </div>
              </div>
              <KeyValue className="pse-rule">
                <KVRow k="Member since" v={fmtDateTime(userData?.createdAt)} />
                <KVRow k="Sign-in methods" v={isPasswordAccount ? 'Email & password' : 'Google'} />
                <KVRow k="Display name" v={userData?.username || '—'} />
                <KVRow k="Email status" v={currentUser?.emailVerified ? 'Verified' : 'Not verified'} hint={currentUser?.emailVerified ? 'Payouts and purchases enabled' : 'Verification is required for the console'} />
              </KeyValue>
              <p className="pse-rule px-4 py-3 pse-micro">
                One Firebase identity is shared across PulseEarn and PSEmine. Product access is separate and explicit — this
                account is enrolled in PSEmine.
              </p>
            </Surface>
          </div>

          {/* ── SECURITY ── */}
          <div id="pse-sec-security" className="scroll-mt-28">
            <Surface
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
              <KeyValue>
                <KVRow k="Password" v={isPasswordAccount ? 'Set' : 'Not applicable'} hint={isPasswordAccount ? 'Changing it requires your current password' : 'Your Google account manages credentials'} />
                <KVRow k="Email verification" v={currentUser?.emailVerified ? 'Complete' : 'Pending'} />
              </KeyValue>

              {pwOpen && isPasswordAccount && (
                <div className="pse-rule px-4 py-4">
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
            </Surface>
          </div>

          {/* ── WALLETS ── */}
          <div id="pse-sec-wallets" className="scroll-mt-28">
            <Surface
              title="Wallets & payout"
              meta="The wallet you pay from and the address settlement is paid to are different things"
              action={<Link to="/mine/wallet" className="pse-btn pse-btn-secondary pse-btn-sm">Manage in wallet</Link>}
            >
              <KeyValue>
                <KVRow k="Payment wallet (BNB)" v={connectedWallet ? shortAddr(connectedWallet) : 'Not connected'} mono={Boolean(connectedWallet)} hint="Used to sign tool purchases" />
                <KVRow k="Payout wallet (BNB)" v={payoutWallet ? shortAddr(payoutWallet) : 'Not set'} mono={Boolean(payoutWallet)} hint={payoutWallet ? 'Receives your campaign settlement' : 'Required before settlement'} />
                <KVRow k="Payout asset" v="BNB" hint="BNB Smart Chain (chain 56)" />
                <KVRow k="Payout minimum" v="£10.00" hint="Per request, after settlement" />
                <KVRow k="Accounting currency" v="GBP (£)" hint="Campaign earnings are GBP-denominated" />
              </KeyValue>
            </Surface>
          </div>

          {/* ── NOTIFICATIONS ── */}
          <div id="pse-sec-notifications" className="scroll-mt-28">
            <Surface
              title="Notifications"
              meta="PSEmine notification feed only — opened from the bell in the product bar"
              action={<Chip
                label={unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All read'}
                chip={unreadNotifications > 0 ? 'pse-chip pse-chip-blue' : 'pse-chip pse-chip-neutral'}
                dot={false}
              />}
            >
              <KeyValue>
                <KVRow k="Notifications received" v={String(notifications.length)} />
                <KVRow
                  k="Most recent"
                  v={lastNotification ? (lastNotification.title || 'Notification') : '—'}
                  hint={lastNotification ? `${fmtDateTime(lastNotification.createdAt)} · ${lastNotification.read ? 'read' : 'unread'}` : 'Nothing recorded yet'}
                />
              </KeyValue>
              <div className="pse-rule flex items-start gap-2 px-4 py-3">
                <Bell size={12} className="mt-0.5 shrink-0" />
                <p className="pse-micro">
                  PSEmine reads its own notification records only. PulseEarn notifications never appear in this console.
                </p>
              </div>
            </Surface>
          </div>

          {/* ── CAMPAIGN ── */}
          <div id="pse-sec-campaign" className="scroll-mt-28">
            <Surface title="Campaign information" meta="Read-only — derived from backend state">
              <KeyValue>
                <KVRow k="Campaign status" v={campaignView.label.trim()} />
                <KVRow k="Your capacity" v={gbpHour(capacity)} hint="Tools plus qualified referrals" />
                <KVRow k="Operating tools" v={String((state?.tools ?? []).length)} hint={state?.tools?.length ? 'Cycle state is on the dashboard' : 'No tools purchased yet'} />
                <KVRow k="Campaign duration" v="90 days" hint="Fixed, then settlement" />
              </KeyValue>
              <div className="pse-rule flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5">
                <ActionLink to="/mine/guide">Campaign guide</ActionLink>
                <Link to="/mine/activity" className="pse-micro inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--pse-text-2)' }}><Gauge size={12} /> Activity ledger</Link>
                <Link to="/mine/tools" className="pse-micro inline-flex items-center gap-1.5 hover:underline" style={{ color: 'var(--pse-text-2)' }}><Layers size={12} /> Tool marketplace</Link>
              </div>
            </Surface>
          </div>

          {/* ── SUPPORT ── */}
          <div id="pse-sec-support" className="scroll-mt-28">
            <Surface title="Support" meta="Questions about tools, payments or settlement">
              <Link to="/help" className="pse-row-item transition-colors hover:bg-white/[0.02]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
                  <LifeBuoy size={16} style={{ color: 'var(--pse-cyan)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>Contact support</p>
                  <p className="pse-micro mt-0.5">Include your account email and any transaction hash.</p>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--pse-text-3)' }} />
              </Link>
              <KeyValue className="pse-rule">
                <KVRow k="Terms of service" v={<Link to="/terms" className="hover:underline">Open</Link>} />
                <KVRow k="Privacy policy" v={<Link to="/privacy" className="hover:underline">Open</Link>} />
              </KeyValue>
            </Surface>
          </div>

          {/* ── SESSION ── */}
          <div id="pse-sec-session" className="scroll-mt-28">
            <Surface title="Session">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
                  <div>
                    <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>Sign out of PSEmine</p>
                    <p className="pse-micro mt-0.5">Ends the session on this device. Tools, balances and settlement are unaffected.</p>
                  </div>
                </div>
                <button onClick={() => void handleLogout()} className="pse-btn pse-btn-danger justify-center">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </Surface>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Mail size={12} style={{ color: 'var(--pse-text-3)' }} />
            <p className="pse-micro">
              Account questions? <Link to="/help" className="underline hover:text-[#F2F4F7]">Support</Link> ·{' '}
              <Link to="/mine/guide" className="underline hover:text-[#F2F4F7]">Guide</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PSEMineMe;
