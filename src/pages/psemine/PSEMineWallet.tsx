import React, { useState } from 'react';
import {
  Wallet, Lock, ShieldCheck, Info, Link2, Unlink, Clock, Send,
  Landmark, AlertTriangle,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { requestPayout } from '../../engines/psemine/pseMineApi';
import {
  Chip, PageHeader, Verdict, Panel, DataRow, Meter, PSEEmpty, PSELoading, PSEError,
  FeedNotice, gbp, gbpHour, shortAddr, shortHash, fmtDateTime, payoutStatusView,
  CopyField, campaignStatusView,
} from '../../components/psemine/pse';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
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

  const { state, withdrawals, loading, error, refresh, refreshing, campaignStatus, feedErrors, refreshFeed } = usePseState();
  const availableStr = useAvailableGBP();

  const [payoutInput, setPayoutInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Mirror the backend gate exactly: create_payout_request blocks while the
  // effective campaign status is active/paused. Everything else (minimum £10,
  // configured wallet, balance, single pending request) is re-validated server-side.
  const payoutBlocked = campaignStatus === 'active' || campaignStatus === 'paused';
  const pendingRequest = withdrawals.some(w => ['pending', 'under_review', 'processing'].includes(String(w.status)));
  const availableMinor = state?.user?.availableMinor ?? 0;
  const payoutWallet = state?.user?.payoutWallet ?? pseUser?.payoutWallet ?? null;

  const campaignView = campaignStatusView(campaign?.status);
  const walletLocked = WALLET_LOCKED_STATES.has(campaign?.status || '') ||
    (state?.effectiveCampaignStatus !== undefined && WALLET_LOCKED_STATES.has(state.effectiveCampaignStatus));

  const user = state?.user ?? {
    accruedGBP: pseUser?.totalAccruedGBP ?? 0,
    totalCapacityGBPPerHour: pseUser?.totalCapacityGBPPerHour ?? 0,
    toolCapacityGBPPerHour: pseUser?.toolCapacityGBPPerHour ?? 0,
    referralCapacityGBPPerHour: pseUser?.referralCapacityGBPPerHour ?? 0,
    payoutWallet: pseUser?.payoutWallet ?? null,
    connectedWallet: pseUser?.connectedWallet ?? null,
  };

  const capacity = user.totalCapacityGBPPerHour ?? 0;
  const capacityShare = (capacity / PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR) * 100;

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

  if (loading && !state) {
    return <div className="pse-section pt-6 md:pt-8"><PSELoading skeleton label="Loading your wallet" /></div>;
  }
  if (error && !state) {
    return (
      <div className="pse-section py-8">
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <div className="pse-section space-y-4 pb-24 pt-5 md:pt-7">
      <PageHeader
        eyebrow="Wallet"
        title="Earnings & settlement"
        sub="Three separate things, deliberately kept apart: what the campaign has earned (GBP), what is settled and available, and where a payout would be sent (BNB Smart Chain)."
      />

      {/* ═══ ZONE A · CAMPAIGN EARNINGS (GBP) ═══ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Verdict
            label="Campaign earnings — accrued to date"
            value={gbp(user.accruedGBP)}
            status={<Chip label={campaignView.live ? 'Accruing' : campaignView.label} chip={campaignView.live ? 'pse-chip pse-chip-success' : campaignView.chip} pulse={campaignView.live} />}
            sub="Campaign earnings are GBP and accrue hourly against capacity while tools are in an active operating cycle. They are not withdrawable during the campaign — they settle when it ends."
            footnote={<p className="pse-micro mt-2">Accounting currency: GBP (£) · fixed rates</p>}
          >
            <div className="mt-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="pse-micro">Accrual rate vs campaign maximum</span>
                <span className="pse-num pse-caption font-semibold">{gbpHour(capacity)}</span>
              </div>
              <div className="mt-2.5">
                <Meter value={capacityShare} tone="purple" label="Capacity against the campaign maximum" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="pse-micro">Tools <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(user.toolCapacityGBPPerHour)}</span></span>
                <span className="pse-micro">Referrals <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(user.referralCapacityGBPPerHour)}</span></span>
              </div>
            </div>
          </Verdict>
        </div>

        {/* ═══ ZONE B · SETTLEMENT ═══ */}
        <Panel title="Settlement" meta="Backend-reported, after the campaign ends">
          <div className="px-5 py-5">
            <p className="pse-eyebrow">Settlement-available balance</p>
            <p className="pse-num mt-2 text-[28px] font-semibold leading-none" style={{ color: 'var(--pse-cyan)' }}>{availableStr}</p>
            <p className="mt-2.5 pse-micro">
              Net of payout requests already submitted. This figure comes from the backend — accrued earnings are never
              relabelled as available.
            </p>
          </div>
          <div className="divide-y border-t" style={{ borderColor: 'var(--pse-line)' }}>
            <DataRow label="Request state" value={payoutBlocked ? 'Opens at settlement' : pendingRequest ? 'Request under review' : 'Open'} />
            <DataRow label="Payout minimum" value={gbp(PAYOUT_REQUEST_MIN_GBP)} />
          </div>
        </Panel>
      </div>

      {/* ═══ ZONE C · WALLETS (kept visibly distinct) ═══ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Connected viewing wallet */}
        <Panel
          title="Connected wallet"
          meta="BNB Smart Chain · used to view and pay"
          action={<Chip label="Not your payout address" chip="pse-chip pse-chip-blue" dot={false} />}
        >
          <div className="space-y-4 px-5 py-5">
            <p className="pse-micro">
              Connect the wallet you pay from. Connecting a wallet never changes where settlement is paid — that is a
              separate, server-stored address.
            </p>
            <div className="flex flex-wrap items-center gap-3">
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
            <div className="pse-inset flex items-start gap-2.5 p-3.5">
              <Info size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-text-3)' }} />
              <p className="pse-micro">Network: BNB Smart Chain (chain 56). Payments and settlements happen only on this network.</p>
            </div>
          </div>
        </Panel>

        {/* Payout destination */}
        <Panel
          title="Payout wallet"
          meta="BNB Smart Chain · receives your settlement"
          tone={walletLocked ? 'warning' : undefined}
          action={
            <Chip
              label={walletLocked ? 'Locked for settlement' : user.payoutWallet ? 'Configured' : 'Not set'}
              chip={walletLocked ? 'pse-chip pse-chip-warning' : user.payoutWallet ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-danger'}
              dot={false}
            />
          }
        >
          <div className="space-y-4 px-5 py-5">
            <p className="pse-micro">
              {user.payoutWallet
                ? 'This address receives your campaign settlement after review. Double-check any change — payouts are irreversible once processed.'
                : 'Set the BNB Smart Chain address that will receive your campaign settlement after review.'}
            </p>

            {user.payoutWallet && (
              <div>
                <CopyField value={user.payoutWallet} display={user.payoutWallet} label="payout wallet" fullWidth />
                <p className="pse-micro mt-2">
                  Updated {pseUser?.payoutWalletUpdatedAt ? fmtDateTime(pseUser.payoutWalletUpdatedAt) : 'previously'}.
                </p>
              </div>
            )}

            {!walletLocked ? (
              <form onSubmit={handleSavePayout} className="flex flex-col gap-2.5 sm:flex-row">
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
              <div className="pse-inset flex items-start gap-2.5 p-3.5" style={{ borderColor: 'rgba(245,165,36,0.3)' }}>
                <Lock size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
                <p className="pse-micro">
                  The campaign is {campaignView.label.trim().toLowerCase()} — payout wallet changes are locked. The backend
                  enforces this cutoff server-side.
                </p>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* ═══ PAYOUT REQUEST ═══ */}
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

      {/* ═══ PAYOUT HISTORY ═══ */}
      <Panel
        title="Payout history"
        meta="Real records only — requests, reviews and completions."
        action={withdrawals.length === 0 && campaignStatus === 'active'
          ? <Chip label="Opens at settlement" chip="pse-chip pse-chip-neutral" dot={false} />
          : <button onClick={() => void refreshFeed('withdrawals')} className="pse-micro font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>Refresh</button>}
        bodyClassName={withdrawals.length === 0 ? '' : ''}
      >
        {feedErrors.withdrawals ? (
          <FeedNotice
            message="Payout history could not be loaded — this list may be incomplete."
            onRetry={() => void refreshFeed('withdrawals')}
            retrying={refreshing}
          />
        ) : null}
        {withdrawals.length === 0 ? (
          <PSEEmpty
            icon={Wallet}
            title="No payout history yet"
            body="Payout requests become available once the campaign reaches settlement. Anything you request will be listed here with its full status."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
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
            {/* Mobile list (no clipped table) */}
            <ul className="divide-y md:hidden" style={{ borderColor: 'var(--pse-line)' }}>
              {withdrawals.map(w => {
                const view = payoutStatusView(w.status);
                const amount = typeof w.amountGBP === 'number' ? w.amountGBP
                  : typeof w.amountMinor === 'number' ? w.amountMinor / 100
                  : typeof w.requestedAmountGBP === 'number' ? w.requestedAmountGBP : null;
                const dest = w.destinationWallet || w.payoutWallet;
                const tx = w.payoutTxHash || w.transactionHash;
                return (
                  <li key={w.id} className="space-y-2 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="pse-num pse-h3">{amount !== null ? gbp(amount) : '—'}</span>
                      <Chip label={view.label} chip={view.chip} dot={false} />
                    </div>
                    <p className="pse-micro">{fmtDateTime(w.createdAt)}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="pse-micro">To <span className="pse-mono">{dest ? shortAddr(dest) : '—'}</span></span>
                      {tx && <span className="pse-hash">{shortHash(tx)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Panel>

      {/* ═══ HOW SETTLEMENT WORKS ═══ */}
      <Panel title="How settlement works">
        <ol className="space-y-3 px-5 py-5">
          {[
            ['Campaign runs its full 90 days', 'Accrual stops at the end — capacity only accrues while the campaign is active.'],
            ['Balances are finalised', 'Settlement calculates final balances from the append-only mining ledger.'],
            ['Payout requests open', 'Requests become available for settled balances of £10 or more, paid to your configured payout wallet.'],
            ['Review, then payout', 'Each request is reviewed, then processed on BNB Smart Chain and recorded here with its transaction hash.'],
          ].map(([title, body], i) => (
            <li key={title} className="flex items-start gap-3">
              <span className="pse-step pse-step-active">{i + 1}</span>
              <div>
                <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{title}</p>
                <p className="pse-micro mt-0.5">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
};

/* ── Post-settlement payout request ─────────────────────────────────────
 * Availability derives from the BACKEND campaign state (never dates, never
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
      <Panel title="Payout" meta="Available after campaign settlement">
        <div className="flex items-start gap-3 px-5 py-5">
          <Clock size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
          <div>
            <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>
              Payout opens after campaign settlement
            </p>
            <p className="pse-micro mt-1.5">
              The campaign is {campaignLabel.trim().toLowerCase()}. Once it reaches settlement and earnings are finalised, a
              payout request form appears here — £10.00 minimum, paid to your configured payout wallet.
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Request payout" meta="Paid to your configured payout wallet on BNB Smart Chain">
      <div className="px-5 py-5">
        {pending ? (
          <p className="pse-micro">You already have a payout request under review. It appears in your history until it resolves.</p>
        ) : availableMinor < PAYOUT_REQUEST_MIN_GBP * 100 ? (
          <p className="pse-micro">
            A minimum of £10.00 is required to request a payout. Your settlement-available balance is {gbp(availableMinor / 100)}.
          </p>
        ) : !walletConfigured ? (
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
            <p className="pse-micro">Set a payout wallet above before requesting your settlement.</p>
          </div>
        ) : (
          <>
            <p className="pse-micro">
              Request up to {gbp(availableGBP)} from your settlement-available balance. Paid to your configured payout wallet
              {payoutWallet ? ` (${shortAddr(payoutWallet)})` : ''}.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const v = parseFloat(amount);
              if (!Number.isFinite(v) || v < PAYOUT_REQUEST_MIN_GBP) { toast.error('Minimum payout request is £10.00.'); return; }
              setBusy(true);
              try { await onSubmit(v); } finally { setBusy(false); setAmount(''); }
            }} className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
              <div className="relative flex-1">
                <span className="pse-micro absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }}>£</span>
                <input
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  inputMode="decimal"
                  className="pse-input w-full pl-6 pr-16"
                  placeholder="10.00"
                  aria-label="Payout amount in GBP"
                />
                <button type="button" onClick={() => setAmount(String(availableGBP))}
                  className="pse-btn pse-btn-ghost pse-btn-sm absolute right-1.5 top-1/2 -translate-y-1/2">
                  Max
                </button>
              </div>
              <button type="submit" disabled={busy} className="pse-btn pse-btn-primary justify-center">
                <Send size={14} /> {busy ? 'Submitting…' : 'Request payout'}
              </button>
            </form>
          </>
        )}
      </div>
      <div className="border-t" style={{ borderColor: 'var(--pse-line)' }}>
        <DataRow label="Payout asset" value="BNB" hint="BNB Smart Chain (chain 56)" />
        <div className="border-t flex items-center gap-2 px-5 py-3" style={{ borderColor: 'var(--pse-line)' }}>
          <Landmark size={13} style={{ color: 'var(--pse-cyan)' }} />
          <span className="pse-micro">Settlement is paid in crypto; campaign earnings are accounted in GBP.</span>
        </div>
      </div>
    </Panel>
  );
}

export default PSEMineWallet;
