import React, { useState } from 'react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { requestPayout } from '../../engines/psemine/pseMineApi';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, fmtDateTime, gbp, gbpHour, payoutStatusView, shortAddr, shortHash,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseEmptyNote, PseErrorNotice, PseFact, PseFacts, PseField, PseInput,
  PseLoading, PseNotice, PsePage, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

/**
 * The wallet — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger wallet (verdict, capacity register, settlement ledgers) was
 * purged in `refactor(psemine): purge legacy design implementation`. Everything
 * that moves money is preserved exactly: wallet connection and binding, the
 * payout-wallet lock cutoff, the backend re-validated payout request, and the
 * real withdrawal history.
 *
 * GBP campaign accounting is not a crypto balance: the accrued figure and the
 * settlement-available figure stay separate and labelled.
 */
const EVM = /^0x[0-9a-fA-F]{40}$/;

/** Campaign states after which the payout wallet can no longer be changed
 * (mirrors the backend wallet cutoff semantics; the endpoint re-validates). */
const WALLET_LOCKED_STATES = new Set(['settling', 'payout', 'closed', 'archived']);

export const PAYOUT_REQUEST_MIN_GBP = 10;

export const PSEMineWallet: React.FC = () => {
  const {
    pseUser, connectedWallet, connectWallet, disconnectWallet, isConnectingWallet,
    updatePayoutWallet, campaign, injectedWallets, walletConnectAvailable,
    connectWalletConnectTransport, walletName, walletChainId,
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
    return (
      <div className="pse-console-main">
        <PseLoading label="Loading your wallet" />
      </div>
    );
  }
  if (error && !state) {
    return (
      <div className="pse-console-main">
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <PsePage
      title="Wallet & payouts"
      objective="Campaign earnings are denominated in GBP and paid in BNB after settlement, to the payout wallet configured here."
      actions={<PseButton onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      <PseSection title="Campaign and balances" meta={`Campaign ${campaignView.label.toLowerCase()}`}>
        <PseFacts cols={2}>
          <PseFact label="Accrued (campaign)" value={gbp(user.accruedGBP)} />
          <PseFact label="Settlement-available" value={availableStr} />
          <PseFact label="Total capacity" value={gbpHour(user.totalCapacityGBPPerHour ?? 0)} />
          <PseFact label="Tool capacity" value={gbpHour(user.toolCapacityGBPPerHour ?? 0)} />
          <PseFact label="Referral capacity" value={gbpHour(user.referralCapacityGBPPerHour ?? 0)} />
          <PseFact label="Payout minimum" value={gbp(PAYOUT_REQUEST_MIN_GBP)} />
          <PseFact label="Payout network" value={`${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}`} text />
        </PseFacts>
        <p className="pse-block-note">
          {campaignView.detail} Accrued earnings are not withdrawable until the backend finalises settlement and reports
          a settlement-available figure.
        </p>
      </PseSection>

      <PseSection title="Connected wallet" meta={walletChainId ? `chain ${walletChainId}` : 'chain unread'}>
        <PseFacts cols={1}>
          <PseFact
            label="Connected in this browser"
            value={connectedWallet || 'None'}
            text={!connectedWallet}
          />
          <PseFact label="Payout wallet" value={payoutWallet || 'Not set'} text={!payoutWallet} />
          <PseFact label="Provider" value={walletName || '—'} text />
        </PseFacts>
        <p className="pse-block-note">
          {connectedWallet
            ? 'This wallet signs purchase payments in this browser. It is not the payout wallet.'
            : 'No wallet is connected in this browser. A connected wallet is required to sign a purchase payment.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {connectedWallet ? (
            <PseButton onClick={() => void disconnectWallet()}>Disconnect</PseButton>
          ) : (
            <>
              {injectedWallets.map(w => (
                <PseButton key={w.id} onClick={() => void connectWallet(w.id)} disabled={isConnectingWallet}>
                  {w.name}
                </PseButton>
              ))}
              {walletConnectAvailable && (
                <PseButton onClick={() => void connectWalletConnectTransport()} disabled={isConnectingWallet}>
                  WalletConnect
                </PseButton>
              )}
            </>
          )}
        </div>
        {isConnectingWallet && <PseNotice>Waiting for the wallet…</PseNotice>}
        {!connectedWallet && !walletConnectAvailable && injectedWallets.length === 0 && (
          <PseNotice tone="attention">
            No wallet detected. Open PSEmine in your wallet&apos;s browser (Trust, MetaMask) or install an extension.
          </PseNotice>
        )}
        <p className="pse-block-note">
          The payment wallet and the payout wallet are different things: payments are sent to the campaign&apos;s locked
          receiving address, payouts are sent to the payout wallet you configure here.
        </p>
      </PseSection>

      <PseSection title="Payout wallet">
        {walletLocked ? (
          <PseNotice tone="attention">
            The campaign is {campaignView.label.toLowerCase()} — payout wallet changes are locked. The current payout
            wallet stays as configured: {payoutWallet ? shortAddr(payoutWallet) : 'not set'}.
          </PseNotice>
        ) : (
          <form onSubmit={handleSavePayout} className="space-y-3">
            <PseField label="BNB Smart Chain payout address" hint="0x + 40 hex characters" htmlFor="pse-payout-wallet">
              <PseInput
                id="pse-payout-wallet"
                value={payoutInput}
                onChange={e => setPayoutInput(e.target.value)}
                placeholder={payoutWallet || '0x…'}
                autoComplete="off"
                spellCheck={false}
              />
            </PseField>
            <PseButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save payout wallet'}</PseButton>
          </form>
        )}
      </PseSection>

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
            return true;
          }
          toast.error(res.error || 'Payout request failed.');
          return false;
        }}
      />

      <PseSection
        title="Payout history"
        meta={
          <span>
            {withdrawals.length} record{withdrawals.length === 1 ? '' : 's'} ·{' '}
            <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('withdrawals')}>Refresh</button>
          </span>
        }
      >
        {feedErrors.withdrawals && (
          <PseNotice tone="attention">The payout history could not be refreshed.</PseNotice>
        )}
        {withdrawals.length === 0 ? (
          <PseEmptyNote glyph="payout" title="No payout requests yet">
            Payouts open once the campaign reaches settlement and the backend finalises your balance. When a request is
            made it appears here with its status and, once paid, its transaction on BNB Smart Chain.
          </PseEmptyNote>
        ) : (
          <PseTable
            head={['Requested', 'Status', 'Amount', 'Destination', 'Transaction']}
            numeric={[2]}
            caption="Payout requests on this account with their recorded status and transaction"
          >
            {withdrawals.map(w => {
              const view = payoutStatusView(w.status);
              // The backend has reported both spellings across versions; tolerate
              // either rather than showing a blank amount (merged from remote).
              const amount = typeof w.amountGBP === 'number' ? w.amountGBP
                : typeof w.amountGbp === 'number' ? w.amountGbp
                  : typeof w.amountMinor === 'number' ? w.amountMinor / 100
                    : typeof w.requestedAmountGBP === 'number' ? w.requestedAmountGBP : null;
              const dest = w.destinationWallet || w.payoutWallet || w.payoutAddress;
              const tx = w.payoutTxHash || w.transactionHash;
              return (
                <PseRow key={w.id}>
                  <PseCell>{fmtDateTime(w.createdAt)}</PseCell>
                  <PseCell>{view.label}</PseCell>
                  <PseCell numeric>{amount !== null ? gbp(amount) : '—'}</PseCell>
                  <PseCell mono>{dest ? shortAddr(dest) : '—'}</PseCell>
                  <PseCell mono>
                    {tx ? (
                      <a href={`https://bscscan.com/tx/${tx}`} target="_blank" rel="noreferrer" className="pse-link">
                        {shortHash(tx)}
                      </a>
                    ) : '—'}
                  </PseCell>
                </PseRow>
              );
            })}
          </PseTable>
        )}
      </PseSection>

      <PseSection title="How settlement works">
        <ul className="pse-notes">
          <li>Accrual continues while the campaign is active and stops when the campaign ends.</li>
          <li>After settlement finalises your balance, a payout request becomes available for the settled amount.</li>
          <li>Requests are reviewed before payment; an approved payout is sent in BNB to your configured payout wallet.</li>
          <li>
            Requests become available for settled balances of {gbp(PAYOUT_REQUEST_MIN_GBP)} or more. One request is
            reviewed at a time.
          </li>
        </ul>
      </PseSection>
    </PsePage>
  );
};

/* ── Post-settlement payout request ─────────────────────────────────────
 * Availability derives from the BACKEND campaign state (never dates, never
 * browser time). While active/paused → explanation only. Post-settlement → the
 * real request form; the server re-validates every condition. */
function PayoutRequestSection({ blocked, pending, availableMinor, payoutWallet, campaignLabel, onSubmit }: {
  blocked: boolean; pending: boolean; availableMinor: number; payoutWallet: string | null;
  campaignLabel: string; onSubmit: (amountGbp: number) => Promise<boolean>;
}) {
  const availableGBP = availableMinor / 100;
  const walletConfigured = Boolean(payoutWallet);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <PseSection title="Request a payout">
      {blocked ? (
        <PseNotice>
          Payout opens after campaign settlement. The campaign is {campaignLabel.toLowerCase()}. Once it reaches
          settlement and earnings are finalised, a payout request form appears here — {gbp(PAYOUT_REQUEST_MIN_GBP)}{' '}
          minimum, paid to your configured payout wallet.
        </PseNotice>
      ) : pending ? (
        <PseNotice>You already have a payout request under review. It appears in your history until it resolves.</PseNotice>
      ) : availableMinor < PAYOUT_REQUEST_MIN_GBP * 100 ? (
        <PseNotice>
          A minimum of {gbp(PAYOUT_REQUEST_MIN_GBP)} is required to request a payout. Your settlement-available balance
          is {gbp(availableMinor / 100)}.
        </PseNotice>
      ) : !walletConfigured ? (
        <PseNotice tone="attention">Set a payout wallet above before requesting your settlement.</PseNotice>
      ) : (
        <>
        <p className="pse-block-note">
          Request up to {gbp(availableGBP)} from your settlement-available balance, paid to your configured payout
          wallet{payoutWallet ? ` (${shortAddr(payoutWallet)})` : ''}. The requested amount stays denominated in GBP
          until it is paid in BNB.
        </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const v = parseFloat(amount);
              if (!Number.isFinite(v) || v < PAYOUT_REQUEST_MIN_GBP) { toast.error('Minimum payout request is £10.00.'); return; }
              // The backend rejects an over-request; fail here first so the user is
              // told before a round trip (merged from remote).
              if (v > availableGBP) { toast.error(`Maximum payout request is ${gbp(availableGBP)}.`); return; }
              setBusy(true);
              // Keep the typed amount when the request did not succeed, so a
              // rejected request never silently clears what the user entered.
              try { if (await onSubmit(v)) setAmount(''); } finally { setBusy(false); }
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="min-w-[200px] flex-1">
              <PseField label="Amount (GBP)" htmlFor="pse-payout-amount">
                <PseInput
                  id="pse-payout-amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="10.00"
                />
              </PseField>
            </div>
            <PseButton onClick={() => setAmount(String(availableGBP))}>Max</PseButton>
            <PseButton type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Request payout'}</PseButton>
          </form>
        </>
      )}
    </PseSection>
  );
}

export default PSEMineWallet;
