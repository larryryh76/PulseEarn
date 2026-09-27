import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import {
  gbp, gbpHour, shortAddr, shortHash, fmtDateTime, payoutStatusView, CopyField,
  campaignStatusView,
} from '../../components/psemine/pse';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import { requestPayout } from '../../engines/psemine/pseMineApi';
import toast from 'react-hot-toast';

const EVM = /^0x[0-9a-fA-F]{40}$/;
const WALLET_LOCKED_STATES = new Set(['settling', 'payout', 'closed', 'archived']);
export const PAYOUT_REQUEST_MIN_GBP = 10;

/** Displays earnings and settlement records with connected-wallet, payout-wallet, and payout-request controls. */
export const PSEMineWallet: React.FC = () => {
  const { pseUser, connectedWallet, connectWallet, disconnectWallet, isConnectingWallet, updatePayoutWallet, campaign } = usePSEMine();
  const { state, withdrawals, loading, error, refresh, refreshing, campaignStatus, feedErrors, refreshFeed } = usePseState();
  const available = useAvailableGBP();
  const [payoutInput, setPayoutInput] = useState('');
  const [saving, setSaving] = useState(false);

  const payoutBlocked = campaignStatus === 'active' || campaignStatus === 'paused';
  const pendingRequest = withdrawals.some(withdrawal => ['pending', 'under_review', 'processing'].includes(String(withdrawal.status)));
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

  const savePayoutWallet = async (event: React.FormEvent) => {
    event.preventDefault();
    const address = payoutInput.trim();
    if (!EVM.test(address)) {
      toast.error('Enter a valid BNB Smart Chain address (0x + 40 hex characters).');
      return;
    }
    setSaving(true);
    try {
      const result = await updatePayoutWallet(address);
      if (result.success) { setPayoutInput(''); await refresh(); }
    } finally { setSaving(false); }
  };

  if (loading && !state) return <main className="pm-page"><p role="status">Loading your settlement statement…</p></main>;
  if (error && !state) {
    return <main className="pm-page" role="alert"><h1>{error.title || 'Your statement could not be loaded'}</h1><p>{error.message || 'Please retry loading your wallet.'}</p><button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Retrying…' : 'Retry'}</button></main>;
  }

  return (
    <main className="pm-page">
      <header>
        <p className="pm-eyebrow">Statement · {campaignView.label.trim()}</p>
        <h1>Wallet &amp; settlement</h1>
        <p>Campaign earnings are accounted in GBP. BNB appears only where a payment or payout uses BNB Smart Chain.</p>
        <button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync statement'}</button>
      </header>

      <section aria-labelledby="earnings-heading">
        <p className="pm-eyebrow">01 · Campaign earnings</p>
        <h2 id="earnings-heading">Accrued earnings</h2>
        <div className="pm-value">{gbp(user.accruedGBP)}</div>
        <p>Recorded by the backend against operating capacity. Accrued earnings are not available for withdrawal until settlement is completed.</p>
      </section>

      <section aria-labelledby="capacity-heading">
        <p className="pm-eyebrow">02 · Current capacity</p>
        <h2 id="capacity-heading">Reported hourly position</h2>
        <dl>
          <div><dt>Tools</dt><dd>{gbpHour(user.toolCapacityGBPPerHour ?? 0)}</dd></div>
          <div><dt>Qualified referrals</dt><dd>{gbpHour(user.referralCapacityGBPPerHour ?? 0)}</dd></div>
          <div><dt>Total</dt><dd>{gbpHour(user.totalCapacityGBPPerHour ?? 0)}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="availability-heading">
        <p className="pm-eyebrow">03 · Settlement availability</p>
        <h2 id="availability-heading">Balance available to request</h2>
        <div className="pm-value">{available}</div>
        <p>Backend-reported settlement balance only. This figure is not inferred from accrued earnings and may remain £0.00 until settlement is finalised.</p>
        <dl><div><dt>Minimum request</dt><dd>{gbp(PAYOUT_REQUEST_MIN_GBP)}</dd></div><div><dt>Accounting currency</dt><dd>GBP (£)</dd></div></dl>
      </section>

      <section aria-labelledby="payout-status-heading">
        <p className="pm-eyebrow">04 · Payout position</p>
        <h2 id="payout-status-heading">{payoutBlocked ? 'Requests open after settlement' : pendingRequest ? 'Request under review' : 'Payout requests available'}</h2>
        <p>{payoutBlocked ? `The campaign is ${campaignView.label.trim().toLowerCase()}. Payout eligibility is rechecked by the backend after settlement.` : pendingRequest ? 'A request is being reviewed. A second request is not available until it resolves.' : 'Requests require a settlement-available balance of at least £10 and a configured payout wallet.'}</p>
        <PayoutRequestSection
          blocked={payoutBlocked}
          pending={pendingRequest}
          availableMinor={availableMinor}
          payoutWallet={payoutWallet}
          campaignLabel={campaignView.label}
          onSubmit={async amountGbp => {
            const result = await requestPayout(amountGbp);
            if (result.success) { toast.success('Payout request submitted for review.'); await refresh(); }
            else toast.error(result.message || 'Payout request could not be submitted.');
            return result.success;
          }}
        />
      </section>

      <section aria-labelledby="payout-wallet-heading">
        <p className="pm-eyebrow">05 · Payout destination</p>
        <h2 id="payout-wallet-heading">Payout wallet</h2>
        <p>The server-stored destination for settlement payouts. It is separate from the wallet that signs tool purchases. Processed payouts are irreversible.</p>
        <p>{walletLocked ? 'Locked for settlement' : payoutWallet ? 'Configured' : 'Not set'}</p>
        {payoutWallet && <><CopyField value={payoutWallet} display={payoutWallet} label="payout wallet" fullWidth /><p className="pm-micro">Updated {pseUser?.payoutWalletUpdatedAt ? fmtDateTime(pseUser.payoutWalletUpdatedAt) : 'previously'}.</p></>}
        {!walletLocked ? (
          <form onSubmit={savePayoutWallet}>
            <label htmlFor="payout-wallet-address">Payout wallet address
              <input id="payout-wallet-address" value={payoutInput} onChange={event => setPayoutInput(event.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" />
            </label>
            <button type="submit" disabled={saving || !payoutInput.trim()}>{saving ? 'Saving…' : payoutWallet ? 'Update payout wallet' : 'Set payout wallet'}</button>
          </form>
        ) : <p>The campaign cutoff has passed; the backend enforces the wallet lock.</p>}
      </section>

      <section aria-labelledby="payment-wallet-heading">
        <p className="pm-eyebrow">06 · Tool payment wallet</p>
        <h2 id="payment-wallet-heading">Connected wallet</h2>
        <p>This wallet signs a purchase from your browser. Connecting or disconnecting it never changes the payout destination.</p>
        {connectedWallet ? <><CopyField value={connectedWallet} display={connectedWallet} label="connected wallet" fullWidth /><button type="button" onClick={() => void disconnectWallet()}>Disconnect payment wallet</button></> : <button type="button" onClick={() => void connectWallet()} disabled={isConnectingWallet}>{isConnectingWallet ? 'Connecting…' : 'Connect payment wallet'}</button>}
      </section>

      <section aria-labelledby="network-heading">
        <p className="pm-eyebrow">07 · Network</p>
        <h2 id="network-heading">BNB Smart Chain</h2>
        <p>Network context for tool payments and processed payouts only.</p>
        <dl><div><dt>Network</dt><dd>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}</dd></div><div><dt>Chain ID</dt><dd>{PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}</dd></div><div><dt>Payment asset</dt><dd>BNB</dd></div></dl>
      </section>

      <section aria-labelledby="payout-history-heading">
        <p className="pm-eyebrow">08 · Recorded requests</p>
        <div className="pm-page-section-heading"><h2 id="payout-history-heading">Payout history</h2><button type="button" onClick={() => void refreshFeed('withdrawals')} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh history'}</button></div>
        {feedErrors.withdrawals && <div role="alert" className="pm-note"><p>Payout records could not be loaded; this history may be incomplete.</p><button type="button" onClick={() => void refreshFeed('withdrawals')} disabled={refreshing}>Retry</button></div>}
        {withdrawals.length === 0 ? <div className="pm-empty"><p>No payout requests recorded. Available history is reported by the backend.</p></div> : (
          <div className="pm-ledger-wrap"><table className="pm-ledger"><thead><tr><th>Requested</th><th>Amount</th><th>Destination</th><th>Reference</th><th>Status</th></tr></thead><tbody>
            {withdrawals.map(withdrawal => {
              const amount = typeof withdrawal.amountGBP === 'number' ? withdrawal.amountGBP : typeof withdrawal.amountGbp === 'number' ? withdrawal.amountGbp : typeof withdrawal.amountMinor === 'number' ? withdrawal.amountMinor / 100 : typeof withdrawal.requestedAmountGBP === 'number' ? withdrawal.requestedAmountGBP : null;
              const destination = withdrawal.destinationWallet || withdrawal.payoutWallet || withdrawal.payoutAddress;
              const tx = withdrawal.payoutTxHash || withdrawal.transactionHash;
              return <tr key={withdrawal.id}><td>{fmtDateTime(withdrawal.createdAt)}</td><td className="pm-amount">{amount === null ? '—' : gbp(amount)}</td><td>{destination ? <span className="pm-mono">{shortAddr(destination)}</span> : '—'}</td><td>{tx ? <span className="pm-mono">{shortHash(tx)}</span> : '—'}</td><td>{payoutStatusView(withdrawal.status).label}</td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>
      <p><Link to="/mine/activity">Open account ledger</Link> · <Link to="/mine/guide">Read settlement rules</Link></p>
    </main>
  );
};

/** Shows payout eligibility feedback or a GBP request form; the backend rechecks submitted amounts. */
function PayoutRequestSection({ blocked, pending, availableMinor, payoutWallet, campaignLabel, onSubmit }: {
  blocked: boolean; pending: boolean; availableMinor: number; payoutWallet: string | null;
  campaignLabel: string; onSubmit: (amountGbp: number) => Promise<boolean>;
}) {
  const availableGBP = availableMinor / 100;
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  if (blocked) return <div className="pm-note"><p>The campaign is {campaignLabel.trim().toLowerCase()}. Requests open after settlement finalises the balance.</p></div>;
  if (pending) return <p>A payout request is already under review.</p>;
  if (availableMinor < PAYOUT_REQUEST_MIN_GBP * 100) return <p>A minimum of {gbp(PAYOUT_REQUEST_MIN_GBP)} is required. Current availability is {gbp(availableGBP)}.</p>;
  if (!payoutWallet) return <p>Set a payout wallet above before requesting a payment.</p>;

  return (
    <form onSubmit={async event => {
      event.preventDefault();
      const value = parseFloat(amount);
      if (!Number.isFinite(value) || value < PAYOUT_REQUEST_MIN_GBP) { toast.error('Minimum payout request is £10.00.'); return; }
      if (value > availableGBP) { toast.error(`Maximum payout request is ${gbp(availableGBP)}.`); return; }
      setBusy(true);
      try { if (await onSubmit(value)) setAmount(''); } finally { setBusy(false); }
    }}>
      <p>Request up to {gbp(availableGBP)} to {shortAddr(payoutWallet)}.</p>
      <label htmlFor="payout-request-amount">Payout amount in GBP
        <input id="payout-request-amount" value={amount} onChange={event => setAmount(event.target.value)} inputMode="decimal" placeholder="10.00" />
      </label>
      <div className="pm-inline-actions"><button type="button" onClick={() => setAmount(String(availableGBP))}>Use available balance</button><button className="pm-button-primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Request payout'}</button></div>
    </form>
  );
}

export default PSEMineWallet;
