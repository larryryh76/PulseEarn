import React, { useState } from 'react';
import {
  Wallet, Lock, ShieldCheck, Info, Link2, Unlink, Clock, Send,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { requestPayout } from '../../engines/psemine/pseMineApi';
import {
  Chip, PageHeader, Stat, PSEEmpty, PSELoading, gbp, gbpHour, shortAddr, shortHash,
  fmtDateTime, payoutStatusView, CopyField, campaignStatusView,
} from '../../components/psemine/pse';
import toast from 'react-hot-toast';

const EVM = /^0x[0-9a-fA-F]{40}$/;

/** Campaign states after which the payout wallet can no longer be changed
 * (mirrors the backend wallet cutoff semantics; the endpoint re-validates). */
const WALLET_LOCKED_STATES = new Set(['settling', 'payout', 'closed', 'archived']);

export const PSEMineWallet: React.FC = () => {
  const {
    pseUser, connectedWallet, connectWallet, disconnectWallet, isConnectingWallet,
    updatePayoutWallet, campaign,
  } = usePSEMine();
  const { state, withdrawals, loading, error, refresh, refreshing, campaignStatus } = usePseState();
  const availableStr = useAvailableGBP();

  const [payoutInput, setPayoutInput] = useState('');
  const [saving, setSaving] = useState(false);

  // D4: mirror the backend gate exactly — create_payout_request blocks ONLY
  // when the effective campaign status is active/paused. Everything else
  // (minimum £10, configured wallet, balance, single pending request) is
  // re-validated server-side at submission time.
  const payoutBlocked = campaignStatus === 'active' || campaignStatus === 'paused';
  const pendingRequest = withdrawals.some(w => ['pending', 'under_review', 'processing'].includes(String(w.status)));
  const availableMinor = state?.user?.availableMinor ?? 0;
  const payoutWallet = state?.user?.payoutWallet ?? pseUser?.payoutWallet ?? null;

  const campaignView = campaignStatusView(campaign?.status);
  const walletLocked = WALLET_LOCKED_STATES.has(campaign?.status || '') ||
    state?.effectiveCampaignStatus !== undefined && WALLET_LOCKED_STATES.has(state.effectiveCampaignStatus);

  const user = state?.user ?? {
    accruedGBP: pseUser?.totalAccruedGBP ?? 0,
    totalCapacityGBPPerHour: pseUser?.totalCapacityGBPPerHour ?? 0,
    toolCapacityGBPPerHour: pseUser?.toolCapacityGBPPerHour ?? 0,
    referralCapacityGBPPerHour: pseUser?.referralCapacityGBPPerHour ?? 0,
    payoutWallet: pseUser?.payoutWallet ?? null,
    connectedWallet: pseUser?.connectedWallet ?? null,
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = payoutInput.trim();
    if (!EVM.test(w)) {
      toast.error('Enter a valid BNB Smart Chain address (0x + 40 hex characters).');
      return;
    }
    setSaving(true);
    try {
      const res = await updatePayoutWallet(w);
      if (res.success) {
        setPayoutInput('');
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pse-section py-10"><PSELoading label="Loading wallet" /></div>;
  if (error && !state) {
    return (
      <div className="pse-section py-10">
        <PSEErrorStub message={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <div className="pse-section space-y-4 pb-24 pt-6 md:pt-8">
      <PageHeader
        eyebrow="Wallet"
        title="Earnings & settlement"
        sub="Campaign earnings, capacity, and your settlement payout configuration."
      />

      {/* Verdict row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="pse-card p-6">
          <p className="pse-eyebrow">Accrued campaign earnings</p>
          <p className="pse-num mt-2 text-[32px] font-semibold leading-none">{gbp(user.accruedGBP)}</p>
          <p className="pse-micro mt-2.5">Total earned this campaign — settles after it ends.</p>
        </div>
        <Stat
          label="Settlement-available balance"
          value={availableStr}
          sub="Net of payout requests already submitted"
          accent="var(--pse-cyan)"
        />
        <Stat
          label="Mining capacity"
          value={gbpHour(user.totalCapacityGBPPerHour)}
          sub={`Tools ${gbpHour(user.toolCapacityGBPPerHour)} · Referrals ${gbpHour(user.referralCapacityGBPPerHour)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Connected viewing wallet */}
        <section className="pse-card p-5">
          <div className="flex items-center justify-between">
            <p className="pse-h3">Connected wallet</p>
            <Chip label="Viewing only" chip="pse-chip pse-chip-blue" dot={false} />
          </div>
          <p className="pse-micro mt-1.5">
            The wallet you browse and pay from. Connecting it never changes your payout destination.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {connectedWallet ? (
              <>
                <CopyField value={connectedWallet} display={shortAddr(connectedWallet)} label="connected wallet" />
                <button onClick={disconnectWallet} className="pse-btn pse-btn-ghost pse-btn-sm">
                  <Unlink size={13} /> Disconnect
                </button>
              </>
            ) : (
              <button onClick={() => void connectWallet()} disabled={isConnectingWallet} className="pse-btn pse-btn-secondary pse-btn-sm">
                <Link2 size={13} /> {isConnectingWallet ? 'Connecting…' : 'Connect wallet'}
              </button>
            )}
          </div>
          <div className="pse-inset mt-4 flex items-start gap-2.5 p-3.5">
            <Info size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-text-3)' }} />
            <p className="pse-micro">
              Network: BNB Smart Chain (chain 56). Payments and settlements happen only on this network.
            </p>
          </div>
        </section>

        {/* Payout wallet */}
        <section className="pse-card p-5">
          <div className="flex items-center justify-between">
            <p className="pse-h3">Payout wallet</p>
            <Chip
              label={walletLocked ? 'Locked for settlement' : (user.payoutWallet ? 'Configured' : 'Not set')}
              chip={walletLocked ? 'pse-chip pse-chip-warning' : user.payoutWallet ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-danger'}
              dot={false}
            />
          </div>
          <p className="pse-micro mt-1.5">
            {user.payoutWallet
              ? 'Receives your campaign settlement. Keep it secure and double-check any change.'
              : 'Set the BNB Smart Chain address that will receive your settlement after the campaign.'}
          </p>

          {user.payoutWallet && (
            <div className="mt-4">
              <CopyField value={user.payoutWallet} display={shortAddr(user.payoutWallet)} label="payout wallet" />
              <p className="pse-micro mt-2">Updated {pseUser?.payoutWalletUpdatedAt ? fmtDateTime(pseUser.payoutWalletUpdatedAt) : 'previously'}.</p>
            </div>
          )}

          {!walletLocked ? (
            <form onSubmit={handleSavePayout} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <input
                value={payoutInput}
                onChange={e => setPayoutInput(e.target.value)}
                className="pse-input flex-1 pse-mono"
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
                aria-label="Payout wallet address"
              />
              <button type="submit" disabled={saving || !payoutInput.trim()} className="pse-btn pse-btn-primary justify-center">
                <ShieldCheck size={14} /> {saving ? 'Saving…' : 'Set payout wallet'}
              </button>
            </form>
          ) : (
            <div className="pse-inset mt-4 flex items-start gap-2.5 p-3.5" style={{ borderColor: 'rgba(245,165,36,0.3)' }}>
              <Lock size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
              <p className="pse-micro">
                The campaign is {campaignView.label.toLowerCase()} — payout wallet changes are locked. The backend enforces this cutoff server-side.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* D4: payout request — availability derives from backend campaign state only. */}
      <PayoutRequestSection
        blocked={payoutBlocked}
        pending={pendingRequest}
        availableMinor={availableMinor}
        payoutWallet={payoutWallet}
        campaignLabel={campaignView.label}
        onSubmit={async (amountGbp) => {
          const res = await requestPayout(amountGbp, payoutWallet || '');
          if (res.success) {
            toast.success('Payout request submitted for review.');
            await refresh();
          } else {
            toast.error(res.message || 'Payout request could not be submitted.');
          }
          return res.success;
        }}
      />

      {/* Payout history */}
      <section className="pse-card overflow-hidden">
        <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
          <div>
            <p className="pse-h3">Payout history</p>
            <p className="pse-micro mt-0.5">Real records only — requests, reviews, and completions.</p>
          </div>
          {/* FIX 11: the future-state label only makes sense before any payout
              exists; backend campaign state decides, never a hardcoded date. */}
          {withdrawals.length === 0 && campaignStatus === 'active' && (
            <Chip label="Opens at settlement" chip="pse-chip pse-chip-neutral" dot={false} />
          )}
        </div>
        {withdrawals.length === 0 ? (
          <PSEEmpty
            icon={Wallet}
            title="No payout history yet"
            body="Payout requests become available once the campaign reaches settlement. Anything you request will be listed here with its full status."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="pse-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th className="pse-num-cell">Amount</th>
                  <th>Status</th>
                  <th>Destination</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map(w => {
                  const view = payoutStatusView(w.status);
                  const amount = typeof w.amountGBP === 'number' ? w.amountGBP
                    : typeof w.amountMinor === 'number' ? w.amountMinor / 100
                    : typeof w.requestedAmountGBP === 'number' ? w.requestedAmountGBP : null;
                  const dest = w.destinationWallet || w.payoutWallet;
                  const tx = w.payoutTxHash || w.transactionHash;
                  return (
                    <tr key={w.id}>
                      <td className="pse-caption" style={{ color: 'var(--pse-text-2)' }}>{fmtDateTime(w.createdAt)}</td>
                      <td className="pse-num-cell font-semibold">{amount !== null ? gbp(amount) : '—'}</td>
                      <td><Chip label={view.label} chip={view.chip} dot={false} /></td>
                      <td><span className="pse-mono">{dest ? shortAddr(dest) : '—'}</span></td>
                      <td>{tx ? <span className="pse-hash">{shortHash(tx)}</span> : <span className="pse-micro">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* How settlement works */}
      <div className="pse-card p-5">
        <div className="flex items-start gap-3">
          <Clock size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
          <div>
            <p className="pse-h3">How settlement works</p>
            <ol className="pse-caption mt-2 list-decimal space-y-1 pl-4">
              <li>The campaign runs its full 90 days; accrual stops at the end.</li>
              <li>At settlement, payout requests open for balances of £10 or more.</li>
              <li>Each request is reviewed, then processed to your payout wallet.</li>
              <li>Completion is recorded with the on-chain transaction hash here.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── D4: post-settlement payout request ─────────────────────────────────────
 * Availability is derived from the BACKEND campaign state (never dates, never
 * browser time). While active/paused → explanation only. Post-settlement →
 * the real request form; the server re-validates every condition. */
export const PAYOUT_REQUEST_MIN_GBP = 10;
function PayoutRequestSection({ blocked, pending, availableMinor, payoutWallet, campaignLabel, onSubmit }: {
  blocked: boolean; pending: boolean; availableMinor: number; payoutWallet: string | null;
  campaignLabel: string; onSubmit: (amountGbp: number) => Promise<boolean>;
}) {
  const availableGBP = availableMinor / 100;
  const walletConfigured = Boolean(payoutWallet);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (blocked) {
    return (
      <section className="pse-card p-5">
        <div className="flex items-start gap-3">
          <Clock size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
          <div>
            <p className="pse-h3">Payout opens after campaign settlement</p>
            <p className="pse-micro mt-1.5">
              The campaign is {campaignLabel.toLowerCase()}. Once the campaign reaches settlement and earnings are finalized,
              a payout request form will appear here — £10.00 minimum, paid to your configured payout wallet.
            </p>
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="pse-card p-5">
      <div className="flex items-start gap-3">
        <Send size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-cyan)' }} />
        <div className="min-w-0 flex-1">
          <p className="pse-h3">Request payout</p>
          {pending ? (
            <p className="pse-micro mt-1.5">You already have a payout request under review. It will appear in your history once resolved.</p>
          ) : availableMinor < PAYOUT_REQUEST_MIN_GBP * 100 ? (
            <p className="pse-micro mt-1.5">
              A minimum of £10.00 is required to request a payout. Your settlement-available balance is {gbp(availableMinor / 100)}.
            </p>
          ) : !walletConfigured ? (
            <p className="pse-micro mt-1.5">Set a payout wallet above before requesting your settlement.</p>
          ) : (
            <>
              <p className="pse-micro mt-1.5">
                Request up to {gbp(availableGBP)} from your settlement-available balance. Paid to your configured payout wallet{payoutWallet ? ` (${shortAddr(payoutWallet)})` : ''}.
              </p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const v = parseFloat(amount);
                if (!Number.isFinite(v) || v < PAYOUT_REQUEST_MIN_GBP) { toast.error('Minimum payout request is £10.00.'); return; }
                setBusy(true);
                try { await onSubmit(v); } finally { setBusy(false); setAmount(''); }
              }} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <span className="pse-micro absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }}>£</span>
                  <input
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    inputMode="decimal"
                    className="pse-input w-full pl-6"
                    placeholder="10.00"
                    aria-label="Payout amount in GBP"
                  />
                  <button type="button" onClick={() => setAmount(String(availableGBP))} className="pse-btn pse-btn-ghost pse-btn-sm absolute right-1.5 top-1/2 -translate-y-1/2">Max</button>
                </div>
                <button type="submit" disabled={busy} className="pse-btn pse-btn-primary justify-center">
                  {busy ? 'Submitting…' : 'Request payout'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PSEErrorStub({ message, onRetry, retrying }: { message: string | null; onRetry: () => void; retrying: boolean }) {
  return (
    <div className="pse-card flex flex-col items-center gap-3 p-10 text-center">
      <p className="pse-h3">Couldn't load your wallet</p>
      <p className="pse-micro max-w-sm">{message || 'Please try again.'}</p>
      <button onClick={onRetry} disabled={retrying} className="pse-btn pse-btn-secondary pse-btn-sm">
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  );
}

export default PSEMineWallet;
