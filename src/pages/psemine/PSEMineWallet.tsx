import React, { useState } from 'react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { requestPayout } from '../../engines/psemine/pseMineApi';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, fmtDateTime, gbp, payoutStatusView, shortAddr, shortHash,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseField, PseInput, PseLoading,
  PseNotice, PsePage, PseSection, PseSplit, PseStack, PseStatus, type PseStatusTone,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

/**
 * The wallet — the campaign's financial account and payout ledger.
 *
 * Everything that moves money is preserved exactly: wallet connection and
 * binding, the payout-wallet lock cutoff, the backend re-validated payout
 * request, and the real withdrawal history.
 *
 * GBP campaign accounting is not a crypto balance. The accrued figure and the
 * settlement-available figure are separate cells with separate labels: accrued
 * money has not been settled and cannot be requested, and this page never
 * presents it as though it could. The payout ledger is a responsive list, not a
 * table that scrolls the page sideways on a phone.
 */
const EVM = /^0x[0-9a-fA-F]{40}$/;

/** Campaign states after which the payout wallet can no longer be changed
 * (mirrors the backend wallet cutoff semantics; the endpoint re-validates). */
const WALLET_LOCKED_STATES = new Set(['settling', 'payout', 'closed', 'archived']);

export const PAYOUT_REQUEST_MIN_GBP = 10;

/** The tone of a recorded payout request. The label is always shown too. */
function payoutTone(status?: string | null): PseStatusTone {
  if (status === 'paid') return 'good';
  if (status === 'failed' || status === 'reversed') return 'danger';
  if (status === 'pending' || status === 'under_review' || status === 'approved' || status === 'processing') return 'hold';
  return 'idle';
}

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
  // Fail closed when the campaign status is unknown: a missing status is not
  // evidence that settlement has released a balance. The backend re-validates
  // every request anyway.
  const payoutBlocked = campaignStatus === null || campaignStatus === 'scheduled'
    || campaignStatus === 'active' || campaignStatus === 'paused';
  const pendingRequest = withdrawals.some(w => ['pending', 'under_review', 'processing'].includes(String(w.status)));
  const availableMinor = state?.user?.availableMinor ?? 0;
  const payoutWallet = state?.user?.payoutWallet ?? pseUser?.payoutWallet ?? null;

  // An unreported status is stated as unreported, never defaulted to Scheduled.
  const campaignView = campaignStatus !== null
    ? campaignStatusView(campaignStatus)
    : { label: 'Status not reported', detail: 'The backend has not reported the campaign’s status yet.', live: false };
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

  const accruedDisplay = typeof user.accruedGBP === 'number' && Number.isFinite(user.accruedGBP)
    ? gbp(user.accruedGBP)
    : '—';

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
      objective="Campaign earnings are denominated in GBP and paid in BNB after settlement, to the payout wallet configured here. The wallet that signs purchases is a separate connection."
      actions={<PseButton variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      {/* THE TWO BALANCES, SIDE BY SIDE AND LABELLED EXACTLY. */}
      <section className="pse-money" aria-label="Campaign balances">
        <div className="pse-money-cell">
          <p className="pse-money-label">Accrued balance</p>
          <p className="pse-money-figure">{accruedDisplay}</p>
          <p className="pse-money-note">
            Campaign earnings accrued while your equipment operates. This balance has not been
            settled and is not withdrawable.
          </p>
        </div>
        <div className="pse-money-cell">
          <p className="pse-money-label">Settlement-available</p>
          <p className="pse-money-figure pse-money-figure--settled">{availableStr}</p>
          <p className="pse-money-note">
            Released by campaign settlement. A payout request is reviewed before BNB is sent to
            your payout wallet.
          </p>
          <p className="pse-money-foot">
            <span>Minimum {gbp(PAYOUT_REQUEST_MIN_GBP)}</span>
            <span>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}</span>
          </p>
        </div>
      </section>

      <p className="pse-prose--sm">
        Settlement-available is the backend’s own released figure; accrued earnings remain campaign
        accounting until settlement finalises them. {campaignView.detail}
      </p>

      <PseSplit>
        <PseStack>
          <PayoutRequestSection
            blocked={payoutBlocked}
            pending={pendingRequest}
            availableMinor={availableMinor}
            payoutWallet={payoutWallet}
            campaignLabel={campaignStatus ? campaignView.label : null}
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
                {withdrawals.length} record{withdrawals.length === 1 ? '' : 's'}
                {' · '}
                <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('withdrawals')}>Refresh</button>
              </span>
            }
          >
            {feedErrors.withdrawals && (
              <PseFeedNotice
                message="The payout history could not be read."
                onRetry={() => void refreshFeed('withdrawals')}
                retrying={refreshing}
              />
            )}
            {withdrawals.length === 0 ? (
              <PseEmptyNote title="No payout requests yet">
                Payouts open once the campaign reaches settlement and the backend finalises your
                balance. A request appears here with its recorded status and, once paid, its
                transaction on BNB Smart Chain.
              </PseEmptyNote>
            ) : (
              <ul className="pse-log">
                {withdrawals.map(w => {
                  const view = payoutStatusView(w.status);
                  // The backend has reported both spellings across versions; tolerate
                  // either rather than showing a blank amount.
                  const amount = typeof w.amountGBP === 'number' ? w.amountGBP
                    : typeof w.amountGbp === 'number' ? w.amountGbp
                      : typeof w.amountMinor === 'number' ? w.amountMinor / 100
                        : typeof w.requestedAmountGBP === 'number' ? w.requestedAmountGBP : null;
                  const dest = w.destinationWallet || w.payoutWallet || w.payoutAddress;
                  const tx = w.payoutTxHash || w.transactionHash;
                  return (
                    <li key={w.id} className="pse-log-row">
                      <span className="pse-log-when">{fmtDateTime(w.createdAt)}</span>
                      <span className="pse-log-body">
                        <span className="pse-log-title">
                          <PseStatus tone={payoutTone(w.status)}>{view.label}</PseStatus>
                        </span>
                        <span className="pse-log-note">
                          To {dest ? shortAddr(dest) : 'wallet not reported'}
                          {tx && (
                            <>
                              {' · '}
                              <a href={`https://bscscan.com/tx/${tx}`} target="_blank" rel="noreferrer" className="pse-link">
                                {shortHash(tx)}
                              </a>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="pse-log-amount">{amount !== null ? gbp(amount) : '—'}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </PseSection>
        </PseStack>

        <PseStack>
          <PseSection
            title="Payout wallet"
            meta={payoutWallet ? shortAddr(payoutWallet) : 'not set'}
          >
            {walletLocked ? (
              <PseNotice tone="attention">
                The campaign is {campaignView.label.toLowerCase()} — payout wallet changes are locked. The
                current payout wallet stays as configured: {payoutWallet ? shortAddr(payoutWallet) : 'not set'}.
              </PseNotice>
            ) : (
              <form onSubmit={handleSavePayout} className="pse-stack-form">
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
                <div className="pse-actions">
                  <PseButton type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save payout wallet'}</PseButton>
                </div>
              </form>
            )}
            <p className="pse-prose--sm">
              Payments are sent to the campaign’s locked receiving address. Payouts are sent to this
              wallet. They are different wallets, and this is the only place the payout wallet is set.
            </p>
          </PseSection>

          <PseSection title="Connected wallet" meta={walletChainId ? `chain ${walletChainId}` : 'chain not read'}>
            <div className="pse-settle">
              <div className="pse-settle-row">
                <span className="pse-settle-key">In this browser</span>
                <span className="pse-settle-val">{connectedWallet ? shortAddr(connectedWallet) : 'None connected'}</span>
              </div>
              <div className="pse-settle-row">
                <span className="pse-settle-key">Provider</span>
                <span className="pse-settle-val">{walletName || '—'}</span>
              </div>
            </div>

            <p className="pse-prose--sm">
              {connectedWallet
                ? 'This wallet signs purchase payments in this browser. It is not the payout wallet.'
                : 'No wallet is connected in this browser. A connected wallet is required to sign a purchase payment.'}
            </p>

            <div className="pse-actions">
              {connectedWallet ? (
                <PseButton variant="secondary" size="sm" onClick={() => void disconnectWallet()}>Disconnect</PseButton>
              ) : (
                <>
                  {injectedWallets.map(w => (
                    <PseButton key={w.id} size="sm" onClick={() => void connectWallet(w.id)} disabled={isConnectingWallet}>
                      {w.name}
                    </PseButton>
                  ))}
                  {walletConnectAvailable && (
                    <PseButton size="sm" onClick={() => void connectWalletConnectTransport()} disabled={isConnectingWallet}>
                      WalletConnect
                    </PseButton>
                  )}
                </>
              )}
            </div>

            {isConnectingWallet && <PseNotice>Waiting for the wallet…</PseNotice>}
            {!connectedWallet && !walletConnectAvailable && injectedWallets.length === 0 && (
              <PseNotice tone="attention">
                No wallet detected. Open PSEmine in your wallet’s browser (Trust, MetaMask) or install an extension.
              </PseNotice>
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
        </PseStack>
      </PseSplit>
    </PsePage>
  );
};

/* ── Post-settlement payout request ─────────────────────────────────────
 * Availability derives from the BACKEND campaign state (never dates, never
 * browser time). While active/paused → explanation only. Post-settlement → the
 * real request form; the server re-validates every condition. */
function PayoutRequestSection({ blocked, pending, availableMinor, payoutWallet, campaignLabel, onSubmit }: {
  blocked: boolean; pending: boolean; availableMinor: number; payoutWallet: string | null;
  campaignLabel: string | null; onSubmit: (amountGbp: number) => Promise<boolean>;
}) {
  const availableGBP = availableMinor / 100;
  const walletConfigured = Boolean(payoutWallet);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <PseSection title="Request a payout">
      {blocked ? (
        <PseNotice>
          Payout opens after campaign settlement.{' '}
          {campaignLabel
            ? `The campaign is ${campaignLabel.toLowerCase()}.`
            : 'The campaign status has not been reported yet.'}{' '}
          Once it reaches settlement and earnings are finalised, a payout request form appears here —{' '}
          {gbp(PAYOUT_REQUEST_MIN_GBP)} minimum, paid to your configured payout wallet.
        </PseNotice>
      ) : pending ? (
        <PseNotice>You already have a payout request under review. It appears in your history until it resolves.</PseNotice>
      ) : availableMinor < PAYOUT_REQUEST_MIN_GBP * 100 ? (
        <PseNotice>
          A minimum of {gbp(PAYOUT_REQUEST_MIN_GBP)} is required to request a payout. Your settlement-available balance
          is {gbp(availableMinor / 100)}.
        </PseNotice>
      ) : !walletConfigured ? (
        <PseNotice tone="attention">Set a payout wallet before requesting your settlement.</PseNotice>
      ) : (
        <>
          <p className="pse-prose">
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
              // told before a round trip.
              if (v > availableGBP) { toast.error(`Maximum payout request is ${gbp(availableGBP)}.`); return; }
              setBusy(true);
              // Keep the typed amount when the request did not succeed, so a
              // rejected request never silently clears what the user entered.
              try { if (await onSubmit(v)) setAmount(''); } finally { setBusy(false); }
            }}
            className="pse-payout-form"
          >
            <div className="pse-payout-field">
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
            <PseButton variant="secondary" size="sm" onClick={() => setAmount(String(availableGBP))}>Max</PseButton>
            <PseButton type="submit" size="sm" disabled={busy}>{busy ? 'Submitting…' : 'Request payout'}</PseButton>
          </form>
        </>
      )}
    </PseSection>
  );
}

export default PSEMineWallet;
