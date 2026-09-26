import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import {
  type StampTone,
  gbp, gbpHour, shortAddr, shortHash, fmtDateTime, payoutStatusView, CopyField,
  campaignStatusView,
} from '../../components/psemine/pse';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import toast from 'react-hot-toast';

const EVM = /^0x[0-9a-fA-F]{40}$/;

/** Campaign states after which the payout wallet can no longer be changed
 * (mirrors the backend wallet cutoff semantics; the endpoint re-validates). */
const WALLET_LOCKED_STATES = new Set(['settling', 'payout', 'closed', 'archived']);

export const PAYOUT_REQUEST_MIN_GBP = 10;

/** Retain the backend payout status descriptions without visual status tokens. */
const payoutStatusLabel = (status?: string | null): string => {
  const label = payoutStatusView(status).label;
  return label || status || 'Status unavailable';
};

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
  // effective campaign status is active/paused. Everything else is re-validated server-side.
  const payoutBlocked = campaignStatus === 'active' || campaignStatus === 'paused';
  const pendingRequest = withdrawals.some(w => ['pending', 'under_review', 'processing'].includes(String(w.status)));
  const availableMinor = state?.user?.availableMinor ?? 0;
  const payoutWallet = state?.user?.payoutWallet ?? pseUser?.payoutWallet ?? null;

  const campaignView = campaignStatusView(campaignStatus);
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
    return <p role="status">Loading your wallet…</p>;
  }
  if (error && !state) {
    return (
      <section aria-labelledby="wallet-error-heading">
        <h1 id="wallet-error-heading">{error.title || 'Your wallet could not be loaded'}</h1>
        <p>{error.message || 'Please retry loading your wallet.'}</p>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Retrying…' : 'Retry'}
        </button>
      </section>
    );
  }

  return (
    <main>
      <header>
        <p>Wallet · balances &amp; addresses</p>
        <h1>Wallet</h1>
        <p>Three separate things, deliberately kept apart: what the campaign has earned (GBP), what is settled and available, and the BNB Smart Chain addresses involved. Settlement is paid in crypto; campaign earnings are accounted in GBP.</p>
        <p>Campaign status: {campaignView.label.trim()}</p>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Syncing…' : 'Sync balances'}
        </button>
      </header>

      <section aria-labelledby="earnings-heading">
        <h2 id="earnings-heading">Campaign earnings accrued</h2>
        <p>{gbp(user.accruedGBP)}</p>
        <p>Earned by {gbpHour(capacity)} of capacity and stored server-side. Not withdrawable during the campaign — the balance is finalised when the campaign closes and the ledger settles.</p>
        <dl>
          <div><dt>Settlement available</dt><dd>{availableStr}</dd></div>
          <div><dt>Payout minimum</dt><dd>{gbp(PAYOUT_REQUEST_MIN_GBP)}</dd></div>
          <div><dt>Payout wallet</dt><dd>{payoutWallet ? shortAddr(payoutWallet) : 'Not set'}</dd></div>
          <div><dt>Payment wallet</dt><dd>{connectedWallet ? shortAddr(connectedWallet) : 'Not connected'}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="capacity-heading">
        <h2 id="capacity-heading">Mining capacity</h2>
        <p>Earnings accrue by the hour from this capacity — only while tools are operating.</p>
        <dl>
          <div><dt>Tool capacity</dt><dd>{gbpHour(user.toolCapacityGBPPerHour ?? 0)}</dd></div>
          <div><dt>Referral capacity</dt><dd>{gbpHour(user.referralCapacityGBPPerHour ?? 0)}</dd></div>
          <div><dt>Total capacity</dt><dd>{gbpHour(capacity)}</dd></div>
          <div><dt>Qualified referrals</dt><dd>{state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0}</dd></div>
        </dl>
      </section>

      {feedErrors.withdrawals && (
        <section aria-labelledby="payout-history-warning">
          <h2 id="payout-history-warning">Payout history is degraded</h2>
          <p>Payout records could not be loaded — the history below may be incomplete.</p>
          <button type="button" onClick={() => void refreshFeed('withdrawals')} disabled={refreshing}>
            {refreshing ? 'Retrying…' : 'Retry payout history'}
          </button>
        </section>
      )}

      {pendingRequest && (
        <section aria-labelledby="pending-payout-heading">
          <h2 id="pending-payout-heading">A payout request is under review</h2>
          <p>One request is being reviewed. It stays in the history below until it resolves, and no second request can be submitted meanwhile.</p>
        </section>
      )}

      <section aria-labelledby="settlement-heading">
        <h2 id="settlement-heading">Settlement</h2>
        <p>Backend-reported balance · available only after the campaign ends.</p>
        <p>{payoutBlocked ? 'Payout requests open at settlement.' : pendingRequest ? 'A payout request is under review.' : 'Payout requests are open, subject to the minimum and configured payout wallet.'}</p>
        <dl>
          <div><dt>Settlement-available balance</dt><dd>{availableStr}. Net of payout requests already submitted — never relabelled accrued earnings.</dd></div>
          <div><dt>Payout minimum</dt><dd>{gbp(PAYOUT_REQUEST_MIN_GBP)} per request, after settlement</dd></div>
          <div><dt>Payout asset</dt><dd>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID} · BNB</dd></div>
          <div><dt>Requests on record</dt><dd>{withdrawals.length} ({pendingRequest ? 'one under review' : 'none pending'})</dd></div>
          <div><dt>Accounting currency</dt><dd>GBP (£)</dd></div>
        </dl>
        <PayoutRequestSection
          blocked={payoutBlocked}
          pending={pendingRequest}
          availableMinor={availableMinor}
          payoutWallet={payoutWallet}
          campaignLabel={campaignView.label}
          onSubmit={async (amountGbp) => {
            const res = await requestPayout(amountGbp);
            if (res.success) {
              toast.success('Payout request submitted for review.');
              await refresh();
            } else {
              toast.error(res.message || 'Payout request could not be submitted.');
            }
            return res.success;
          }}
        />
      </section>

      <section aria-labelledby="wallet-addresses-heading">
        <h2 id="wallet-addresses-heading">BNB wallets</h2>
        <p>The wallet you pay from and the address settlement is paid to are different things.</p>
        <section aria-labelledby="payment-wallet-heading">
          <h3 id="payment-wallet-heading">Payment wallet</h3>
          <p>Signs tool purchases · never changes where settlement is paid.</p>
          <p>{connectedWallet ? 'Connected' : 'Not connected'}</p>
          {connectedWallet ? (
            <>
              <CopyField value={connectedWallet} display={shortAddr(connectedWallet)} label="connected wallet" />
              <button type="button" onClick={disconnectWallet}>Disconnect</button>
            </>
          ) : (
            <button type="button" onClick={() => void connectWallet()} disabled={isConnectingWallet}>
              {isConnectingWallet ? 'Connecting…' : 'Connect wallet'}
            </button>
          )}
          <p>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}</p>
        </section>

        <section aria-labelledby="payout-wallet-heading">
          <h3 id="payout-wallet-heading">Payout wallet</h3>
          <p>Stored server-side · payouts are irreversible once processed.</p>
          <p>{walletLocked ? 'Locked for settlement' : payoutWallet ? 'Configured' : 'Not set'}</p>
          {payoutWallet && (
            <>
              <CopyField value={payoutWallet} display={payoutWallet} label="payout wallet" fullWidth />
              <p>Updated {pseUser?.payoutWalletUpdatedAt ? fmtDateTime(pseUser.payoutWalletUpdatedAt) : 'previously'}.</p>
            </>
          )}

          {!walletLocked ? (
            <form onSubmit={handleSavePayout}>
              <label htmlFor="payout-wallet-address">Payout wallet address</label>
              <input
                id="payout-wallet-address"
                value={payoutInput}
                onChange={e => setPayoutInput(e.target.value)}
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
              />
              <button type="submit" disabled={saving || !payoutInput.trim()}>
                {saving ? 'Saving…' : 'Set payout wallet'}
              </button>
            </form>
          ) : (
            <p>The campaign is {campaignView.label.trim().toLowerCase()} — payout wallet changes are locked. The backend enforces this cutoff server-side.</p>
          )}
        </section>
      </section>

      <section aria-labelledby="payout-history-heading">
        <h2 id="payout-history-heading">Payout history</h2>
        <p>Real records only — requests, reviews and completions.</p>
        <button type="button" onClick={() => void refreshFeed('withdrawals')} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh payout history'}
        </button>
        {withdrawals.length === 0 ? (
          <p>No payout history yet. Payout requests become available once the campaign reaches settlement. Anything you request will be listed here with its full status.</p>
        ) : (
          <ol>
            {withdrawals.map(w => {
              const view = payoutStatusView(w.status);
              const amount = typeof w.amountGBP === 'number' ? w.amountGBP
                : typeof w.amountMinor === 'number' ? w.amountMinor / 100
                : typeof w.requestedAmountGBP === 'number' ? w.requestedAmountGBP : null;
              const dest = w.destinationWallet || w.payoutWallet;
              const tx = w.payoutTxHash || w.transactionHash;
              return (
                <li key={w.id}>
                  <h3>{fmtDateTime(w.createdAt)}</h3>
                  <p>Status: {payoutStatusLabel(w.status) || view.label}</p>
                  <p>To {dest ? shortAddr(dest) : '—'}{tx ? ` · Transaction ${shortHash(tx)}` : ''}</p>
                  {amount !== null && <p>Amount: {gbp(amount)}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="settlement-details-heading">
        <h2 id="settlement-details-heading">How settlement works</h2>
        <p><Link to="/mine/activity">Ledger</Link> · <Link to="/mine/guide">Campaign guide</Link></p>
        <ol>
          <li><h3>Campaign runs its full 90 days</h3><p>Accrual stops at the end — capacity only accrues while the campaign is active.</p></li>
          <li><h3>Balances are finalised</h3><p>Settlement calculates final balances from the append-only mining ledger.</p></li>
          <li><h3>Payout requests open</h3><p>Requests become available for settled balances of {gbp(PAYOUT_REQUEST_MIN_GBP)} or more, paid to your configured payout wallet.</p></li>
          <li><h3>Review, then payout</h3><p>Each request is reviewed, then processed on BNB Smart Chain and recorded here with its transaction hash.</p></li>
        </ol>
      </section>
    </main>
  );
};

/* Availability derives from the backend campaign state (never dates, never
 * browser time). While active/paused → explanation only. Post-settlement →
 * the real request form; the server re-validates every condition. */
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
      <div>
        <h3>Payout opens after campaign settlement</h3>
        <p>The campaign is {campaignLabel.trim().toLowerCase()}. Once it reaches settlement and earnings are finalised, a payout request form appears here — {gbp(PAYOUT_REQUEST_MIN_GBP)} minimum, paid to your configured payout wallet.</p>
      </div>
    );
  }

  return (
    <div>
      {pending ? (
        <p>You already have a payout request under review. It appears in your history until it resolves.</p>
      ) : availableMinor < PAYOUT_REQUEST_MIN_GBP * 100 ? (
        <p>A minimum of {gbp(PAYOUT_REQUEST_MIN_GBP)} is required to request a payout. Your settlement-available balance is {gbp(availableMinor / 100)}.</p>
      ) : !walletConfigured ? (
        <p>Set a payout wallet above before requesting your settlement.</p>
      ) : (
        <>
          <p>Request up to {gbp(availableGBP)} from your settlement-available balance, paid to your configured payout wallet{payoutWallet ? ` (${shortAddr(payoutWallet)})` : ''}.</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const v = parseFloat(amount);
            if (!Number.isFinite(v) || v < PAYOUT_REQUEST_MIN_GBP) { toast.error('Minimum payout request is £10.00.'); return; }
            setBusy(true);
            try { await onSubmit(v); } finally { setBusy(false); setAmount(''); }
          }}>
            <label htmlFor="payout-request-amount">Payout amount in GBP</label>
            <div>
              <span aria-hidden="true">£</span>
              <input
                id="payout-request-amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="10.00"
              />
              <button type="button" onClick={() => setAmount(String(availableGBP))}>Max</button>
            </div>
            <button type="submit" disabled={busy}>
              {busy ? 'Submitting…' : 'Request payout'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default PSEMineWallet;
