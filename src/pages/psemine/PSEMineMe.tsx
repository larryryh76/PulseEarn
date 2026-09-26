import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, ChevronRight, LogOut, KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle,
  LifeBuoy, Lock, Bell, Mail, Gauge, Layers,
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  Stamp, StatementHeader, Verdict, Ledger, LedgerRow, Attn, PSELoading,
  gbpHour, fmtDateTime, shortAddr, campaignStatusView,
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
 * A ruled record row on the canvas.
 * The account page states seven sections, so only ONE of them may carry a
 * bordered surface (the identity ledger). Everything else is a ruled record on
 * the page itself — the same row shape as a ledger row, without another box.
 */
const SpecRow: React.FC<{ k: string; v: React.ReactNode; hint?: React.ReactNode; mono?: boolean }> = ({ k, v, hint, mono }) => (
  <div className="pse-row">
    <div className="pse-row-k">
      <p className="pse-label-b">{k}</p>
      {hint && <p className="pse-meta" style={{ marginTop: 4 }}>{hint}</p>}
    </div>
    <span className={`pse-row-v ${mono ? 'pse-mono' : ''}`}>{v}</span>
  </div>
);

/** One unframed section of the account workspace. */
const Section: React.FC<{ id: string; title: string; meta?: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  id, title, meta, action, children,
}) => (
  <section id={`pse-sec-${id}`} className="pse-anchor pse-stack-tight">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="pse-h2">{title}</h2>
        {meta && <p className="pse-meta" style={{ marginTop: 4 }}>{meta}</p>}
      </div>
      {action}
    </div>
    <hr className="pse-rule" />
    <div>{children}</div>
  </section>
);

/**
 * The account centre.
 *
 * Composition law (Duty & Ledger): VERDICT → RAILS → LEDGERS → NOTES.
 *
 *   VERDICT  the account's own state — its capacity and its identity standing —
 *            on the canvas.
 *   LEDGER   ONE bordered container: the identity record shared with PulseEarn.
 *   NOTES    the remaining sections as ruled records on the page. Only
 *            PSEmine-relevant settings exist here; PulseEarn preferences live in
 *            the PulseEarn product.
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
    <div className="pse-gut pse-stack" style={{ paddingTop: 22 }}>
      <StatementHeader
        routeKey="Account · identity"
        title="Account"
        objective="Your PSEmine identity, security, wallets and campaign information. PulseEarn settings live in the PulseEarn product and are not shown here."
        status={<Stamp tone="live" glyph="●">PSEmine access</Stamp>}
      />

      {loading && !state && <PSELoading label="Loading account details" />}

      {/* ══ VERDICT — the account's own state ══ */}
      <Verdict
        label="Account capacity"
        value={gbpHour(capacity)}
        status={
          <Stamp tone={currentUser?.emailVerified ? 'live' : 'attn'} glyph="●">
            {currentUser?.emailVerified ? 'Verified' : 'Verification pending'}
          </Stamp>
        }
        note={
          currentUser?.emailVerified
            ? 'One Firebase identity is shared across PulseEarn and PSEmine; product access is separate and explicit — this account is enrolled in PSEmine.'
            : 'Email verification is required before the console enables purchases and payouts.'
        }
        side={
          <div className="pse-stack-tight">
            <div className="pse-spec-line"><span>Campaign</span><span>{campaignView.label.trim()}</span></div>
            <div className="pse-spec-line"><span>Operating tools</span><span>{String((state?.tools ?? []).length)}</span></div>
            <div className="pse-spec-line"><span>Sign-in</span><span>{isPasswordAccount ? 'Email & password' : 'Google'}</span></div>
            <div className="pse-spec-line"><span>Member since</span><span>{fmtDateTime(userData?.createdAt)}</span></div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[186px_minmax(0,1fr)]" style={{ alignItems: 'start' }}>
        {/* Section rail (desktop) */}
        <nav aria-label="Account sections" className="hidden lg:block">
          <div className="pse-stack-tight" style={{ position: 'sticky', top: 96 }}>
            <p className="pse-np">Sections</p>
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(s.id)}
                aria-current={active === s.id ? 'true' : undefined}
                style={{
                  display: 'block', width: '100%', minHeight: 40, textAlign: 'left',
                  background: 'none', border: 0, borderLeft: '2px solid',
                  borderLeftColor: active === s.id ? 'var(--pse-success-ink)' : 'var(--pse-line)',
                  paddingLeft: 12, cursor: 'pointer', font: 'inherit',
                  fontSize: 13.5, fontWeight: 500,
                  color: active === s.id ? 'var(--pse-bone)' : 'var(--pse-text-3)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="min-w-0 pse-stack">
          {/* Mobile jump row */}
          <div className="lg:hidden">
            <div className="pse-seg flex-wrap">
              {SECTIONS.map(s => (
                <button key={s.id} type="button" data-active={active === s.id} onClick={() => goTo(s.id)}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* ── ACCOUNT — the page's only bordered surface ── */}
          <Ledger
            title="Account identity"
            meta="Shared sign-in identity · PSEmine entitlement"
            legend={['Record', 'Value']}
          >
            <LedgerRow
              title={userData?.username || 'PSEmine miner'}
              sub={currentUser?.email || '—'}
              value={
                <Stamp tone={currentUser?.emailVerified ? 'live' : 'attn'} glyph="●">
                  {currentUser?.emailVerified ? 'Verified' : 'Action needed'}
                </Stamp>
              }
            />
            <LedgerRow title="Member since" value={fmtDateTime(userData?.createdAt)} />
            <LedgerRow title="Sign-in methods" value={isPasswordAccount ? 'Email & password' : 'Google'} />
            <LedgerRow title="Display name" value={userData?.username || '—'} />
            <LedgerRow
              title="Email status"
              sub={currentUser?.emailVerified ? 'Payouts and purchases enabled' : 'Verification is required for the console'}
              value={currentUser?.emailVerified ? 'Verified' : 'Not verified'}
            />
          </Ledger>

          <Attn
            tone="info"
            title="One identity, two products"
            body="Your Firebase sign-in is shared with PulseEarn, but points, tasks and rewards never apply in PSEmine. Campaign earnings here are GBP-denominated and settled in BNB."
          />

          {/* ── SECURITY ── */}
          <Section
            id="security"
            title="Security"
            meta="Identity protection for this account"
            action={
              isPasswordAccount ? (
                <button
                  onClick={() => { setPwOpen(v => !v); setPwError(null); }}
                  className="pse-btn pse-btn-2 pse-btn-sm"
                >
                  <KeyRound size={13} /> {pwOpen ? 'Close' : 'Change password'}
                </button>
              ) : (
                <Stamp tone="idle" glyph="·">Managed by Google</Stamp>
              )
            }
          >
            <SpecRow
              k="Password"
              v={isPasswordAccount ? 'Set' : 'Not applicable'}
              hint={isPasswordAccount ? 'Changing it requires your current password' : 'Your Google account manages credentials'}
            />
            <SpecRow k="Email verification" v={currentUser?.emailVerified ? 'Complete' : 'Pending'} />

            {pwOpen && isPasswordAccount && (
              <div className="pse-sunken pse-pad" style={{ marginTop: 14 }}>
                {pwDone ? (
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="pse-cyan" />
                    <p className="pse-label">Password updated. Use it next time you sign in.</p>
                  </div>
                ) : (
                  <form onSubmit={changePassword} className="pse-stack-tight" noValidate>
                    {pwError && (
                      <div role="alert" className="pse-attn" data-tone="fail">
                        <div className="pse-attn-body flex items-start gap-2">
                          <AlertCircle size={14} className="shrink-0 pse-red" style={{ marginTop: 2 }} />
                          <p className="pse-label" style={{ color: 'var(--pse-red)' }}>{pwError}</p>
                        </div>
                      </div>
                    )}
                    <label className="pse-field">
                      <span className="pse-field-label"><span className="pse-np">Current password</span></span>
                      <div className="relative">
                        <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
                        <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                          className="pse-input pl-10" autoComplete="current-password" required />
                      </div>
                    </label>
                    <div className="pse-grid-2">
                      <label className="pse-field">
                        <span className="pse-field-label">
                          <span className="pse-np">New password</span>
                          <span className="pse-meta">Min 8 characters</span>
                        </span>
                        <div className="relative">
                          <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                            className="pse-input pr-11" autoComplete="new-password" minLength={8} required />
                          <button type="button" onClick={() => setShowPw(s => !s)}
                            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md"
                            style={{ color: 'var(--pse-text-3)' }}
                            aria-label={showPw ? 'Hide passwords' : 'Show passwords'}>
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </label>
                      <label className="pse-field">
                        <span className="pse-field-label"><span className="pse-np">Confirm new password</span></span>
                        <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                          className="pse-input" autoComplete="new-password" minLength={8} required />
                      </label>
                    </div>
                    <div>
                      <button type="submit" disabled={pwBusy} className="pse-btn pse-btn-sm">
                        {pwBusy ? 'Updating…' : 'Update password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </Section>

          {/* ── WALLETS ── */}
          <Section
            id="wallets"
            title="Wallets & payout"
            meta="The wallet you pay from and the address settlement is paid to are different things"
            action={<Link to="/mine/wallet" className="pse-btn pse-btn-2 pse-btn-sm">Manage in wallet</Link>}
          >
            <SpecRow
              k="Payment wallet (BNB)"
              v={connectedWallet ? shortAddr(connectedWallet) : 'Not connected'}
              mono={Boolean(connectedWallet)}
              hint="Used to sign tool purchases"
            />
            <SpecRow
              k="Payout wallet (BNB)"
              v={payoutWallet ? shortAddr(payoutWallet) : 'Not set'}
              mono={Boolean(payoutWallet)}
              hint={payoutWallet ? 'Receives your campaign settlement' : 'Required before settlement'}
            />
            <SpecRow k="Payout asset" v="BNB" hint="BNB Smart Chain (chain 56)" />
            <SpecRow k="Payout minimum" v="£10.00" hint="Per request, after settlement" />
            <SpecRow k="Accounting currency" v="GBP (£)" hint="Campaign earnings are GBP-denominated" />
          </Section>

          {/* ── NOTIFICATIONS ── */}
          <Section
            id="notifications"
            title="Notifications"
            meta="PSEmine notification feed only — opened from the bell in the product bar"
            action={
              <Stamp tone={unreadNotifications > 0 ? 'info' : 'idle'} glyph="·">
                {unreadNotifications > 0 ? `${unreadNotifications} unread` : 'All read'}
              </Stamp>
            }
          >
            <SpecRow k="Notifications received" v={String(notifications.length)} />
            <SpecRow
              k="Most recent"
              v={lastNotification ? (lastNotification.title || 'Notification') : '—'}
              hint={lastNotification
                ? `${fmtDateTime(lastNotification.createdAt)} · ${lastNotification.read ? 'read' : 'unread'}`
                : 'Nothing recorded yet'}
            />
            <p className="pse-meta flex items-start gap-2" style={{ marginTop: 12 }}>
              <Bell size={12} className="shrink-0" style={{ marginTop: 2 }} />
              PSEmine reads its own notification records only. PulseEarn notifications never appear in this console.
            </p>
          </Section>

          {/* ── CAMPAIGN ── */}
          <Section id="campaign" title="Campaign information" meta="Read-only — derived from backend state">
            <SpecRow k="Campaign status" v={campaignView.label.trim()} />
            <SpecRow k="Your capacity" v={gbpHour(capacity)} hint="Tools plus qualified referrals" />
            <SpecRow
              k="Operating tools"
              v={String((state?.tools ?? []).length)}
              hint={state?.tools?.length ? 'Cycle state is on the dashboard' : 'No tools purchased yet'}
            />
            <SpecRow k="Campaign duration" v="90 days" hint="Fixed, then settlement" />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2" style={{ marginTop: 14 }}>
              <Link to="/mine/guide" className="pse-label pse-link inline-flex items-center gap-1.5">
                <Gauge size={12} /> Campaign guide
              </Link>
              <Link to="/mine/activity" className="pse-label pse-link inline-flex items-center gap-1.5">
                <Gauge size={12} /> Activity ledger
              </Link>
              <Link to="/mine/tools" className="pse-label pse-link inline-flex items-center gap-1.5">
                <Layers size={12} /> Mining tools
              </Link>
            </div>
          </Section>

          {/* ── SUPPORT ── */}
          <Section id="support" title="Support" meta="Questions about tools, payments or settlement">
            <Link to="/help" className="pse-row pse-link" style={{ textDecoration: 'none' }}>
              <span className="pse-row-k flex items-center gap-3">
                <LifeBuoy size={15} className="pse-cyan" />
                <span>
                  <span className="pse-label-b" style={{ display: 'block' }}>Contact support</span>
                  <span className="pse-meta" style={{ display: 'block', marginTop: 4 }}>
                    Include your account email and any transaction hash.
                  </span>
                </span>
              </span>
              <ChevronRight size={16} className="pse-dim-3" />
            </Link>
            <SpecRow
              k="Terms of service"
              v={<Link to="/terms" className="pse-link">Open</Link>}
            />
            <SpecRow
              k="Privacy policy"
              v={<Link to="/privacy" className="pse-link">Open</Link>}
            />
          </Section>

          {/* ── SESSION ── */}
          <Section id="session" title="Session">
            <div className="pse-row" data-stack="true">
              <div className="pse-row-k flex items-start gap-3">
                <ShieldCheck size={16} className="shrink-0 pse-cyan" style={{ marginTop: 2 }} />
                <span>
                  <span className="pse-label-b" style={{ display: 'block' }}>Sign out of PSEmine</span>
                  <span className="pse-meta" style={{ display: 'block', marginTop: 4 }}>
                    Ends the session on this device. Tools, balances and settlement are unaffected.
                  </span>
                </span>
              </div>
              <button onClick={() => void handleLogout()} className="pse-btn pse-btn-danger">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </Section>

          <p className="pse-meta flex items-center gap-2">
            <Mail size={12} />
            <Link to="/help" className="pse-link">Account questions? Support</Link>
            <span className="pse-dim-3">·</span>
            <Link to="/mine/guide" className="pse-link">Guide</Link>
          </p>
        </div>
      </div>

    </div>
  );
};

export default PSEMineMe;
