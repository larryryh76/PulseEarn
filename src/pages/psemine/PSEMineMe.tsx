import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Wallet, ShieldCheck, ChevronRight, LogOut, KeyRound, Eye, EyeOff,
  CheckCircle2, AlertCircle, BookOpen, LifeBuoy, Lock,
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  PageHeader, shortAddr, fmtDateTime, Chip, gbpHour, campaignStatusView,
} from '../../components/psemine/pse';
import { updatePassword as firebaseUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';
import { mapAuthError } from '../../utils/errors';

export const PSEMineMe: React.FC = () => {
  const { currentUser, userData, logout } = usePSEMineAuth();
  const { state, campaignStatus } = usePseState();
  const navigate = useNavigate();

  // Password change (requires reauthentication — Firebase security requirement)
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  const campaignView = campaignStatusView(campaignStatus);

  const handleLogout = async () => {
    try { await logout(); navigate('/mine/login', { replace: true }); }
    catch { toast.error('Sign out failed. Please try again.'); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { toast.error('New passwords don\u2019t match.'); return; }
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
      toast.error(mapAuthError(error));
    } finally { setPwBusy(false); }
  };

  return (
    <div className="pse-section max-w-3xl space-y-4 pb-24 pt-6 md:pt-8">
      <PageHeader eyebrow="Account" title="Account & settings" sub="Your PSEmine identity, security, and campaign information." />

      {/* Account */}
      <section className="pse-card p-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold"
            style={{ background: 'rgba(46,144,250,0.12)', color: 'var(--pse-blue)', border: '1px solid rgba(46,144,250,0.3)' }}>
            {(currentUser?.email || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="pse-h3 truncate">{userData?.username || 'PSEmine miner'}</p>
            <p className="pse-micro truncate">{currentUser?.email}</p>
          </div>
        </div>
        <div className="pse-divider my-4" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="pse-inset p-3.5">
            <p className="pse-eyebrow">Email status</p>
            <p className="pse-caption mt-1 flex items-center gap-1.5 font-medium" style={{ color: currentUser?.emailVerified ? 'var(--pse-success)' : 'var(--pse-warning)' }}>
              {currentUser?.emailVerified ? <><CheckCircle2 size={13} /> Verified</> : <><AlertCircle size={13} /> Not verified</>}
            </p>
          </div>
          <div className="pse-inset p-3.5">
            <p className="pse-eyebrow">Member since</p>
            <p className="pse-caption mt-1 font-medium">{fmtDateTime(userData?.createdAt) || '—'}</p>
          </div>
        </div>
      </section>

      {/* Wallet summary */}
      <Link to="/mine/wallet" className="pse-card pse-card-hover p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
            <Wallet size={16} style={{ color: 'var(--pse-blue)' }} />
          </div>
          <div>
            <p className="pse-h3">Wallet & payouts</p>
            <p className="pse-micro mt-0.5">
              {state?.user?.payoutWallet ? `Payout to ${shortAddr(state.user.payoutWallet)}` : 'Payout wallet not yet set'}
            </p>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--pse-text-3)' }} />
      </Link>

      {/* Security */}
      <section className="pse-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--pse-success)' }} />
            </div>
            <div>
              <p className="pse-h3">Security</p>
              <p className="pse-micro mt-0.5">Password changes require reauthentication.</p>
            </div>
          </div>
          <button onClick={() => setPwOpen(v => !v)} className="pse-btn pse-btn-secondary pse-btn-sm shrink-0">
            <KeyRound size={13} /> {pwOpen ? 'Close' : 'Change password'}
          </button>
        </div>

        {pwOpen && (
          pwDone ? (
            <div className="pse-inset mt-4 flex items-center gap-2.5 p-3.5">
              <CheckCircle2 size={15} style={{ color: 'var(--pse-success)' }} />
              <p className="pse-caption">Password updated. Use it next time you sign in.</p>
            </div>
          ) : (
            <form onSubmit={changePassword} className="mt-4 space-y-3">
              <label className="block">
                <span className="pse-caption mb-1.5 block font-medium" style={{ color: 'var(--pse-text-2)' }}>Current password</span>
                <div className="relative">
                  <Lock size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }} />
                  <input type={showPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                    className="pse-input pl-10" autoComplete="current-password" required />
                </div>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="pse-caption mb-1.5 block font-medium" style={{ color: 'var(--pse-text-2)' }}>New password</span>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                      className="pse-input pr-10" autoComplete="new-password" minLength={8} required />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }}
                      aria-label={showPw ? 'Hide passwords' : 'Show passwords'}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="pse-caption mb-1.5 block font-medium" style={{ color: 'var(--pse-text-2)' }}>Confirm new password</span>
                  <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    className="pse-input" autoComplete="new-password" minLength={8} required />
                </label>
              </div>
              <button type="submit" disabled={pwBusy} className="pse-btn pse-btn-primary pse-btn-sm">
                {pwBusy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )
        )}
      </section>

      {/* Campaign information */}
      <section className="pse-card p-5">
        <p className="pse-h3">Campaign information</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="pse-inset p-3.5">
            <p className="pse-eyebrow">Campaign status</p>
            <div className="mt-1.5"><Chip label={campaignView.label} chip={campaignView.chip} pulse={campaignView.live} /></div>
          </div>
          <div className="pse-inset p-3.5">
            <p className="pse-eyebrow">Your capacity</p>
            <p className="pse-num pse-caption mt-1.5 font-semibold">{gbpHour(state?.user?.totalCapacityGBPPerHour)}</p>
          </div>
        </div>
        <Link to="/mine/guide" className="pse-caption mt-4 inline-flex items-center gap-1.5 font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
          <BookOpen size={13} /> Campaign guide
        </Link>
      </section>

      {/* Support */}
      <Link to="/help" className="pse-card pse-card-hover p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
            <LifeBuoy size={16} style={{ color: 'var(--pse-cyan)' }} />
          </div>
          <div>
            <p className="pse-h3">Support</p>
            <p className="pse-micro mt-0.5">Questions about tools, payments, or settlement.</p>
          </div>
        </div>
        <ChevronRight size={16} style={{ color: 'var(--pse-text-3)' }} />
      </Link>

      {/* Sign out */}
      <button onClick={() => void handleLogout()} className="pse-btn pse-btn-danger w-full justify-center py-3">
        <LogOut size={14} /> Sign out of PSEmine
      </button>
    </div>
  );
};

export default PSEMineMe;
