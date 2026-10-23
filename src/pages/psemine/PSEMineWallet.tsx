import '../../styles/psemine-wallet.css';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { requestPayout, type PseWithdrawal } from '../../engines/psemine/pseMineApi';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  campaignStatusView, copyText, fmtDateTime, gbp, payoutStatusView, shortAddr, shortHash,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice, PseField, PseInput, PseNotice,
  PseSection, PseSkeleton, PseSkeletonRows, PseStatus, type PseStatusTone,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

/**
 * The wallet.
 *
 * IT IS A WALLET, NOT A FINANCE DASHBOARD. The composition follows the surface
 * crypto users already know — a wallet header, one dominant balance, a row of
 * wallet actions, then the transaction ledger — and it uses that familiarity to
 * state PSEmine's own model exactly.
 *
 * THE MONEY MODEL, STATED SO IT CANNOT BE MISREAD.
 *   • Campaign earnings are denominated in GBP. They are accounting, not an
 *     on-chain token: the product holds no BNB balance and this page never
 *     prints one.
 *   • `accrued` and `settlement-available` are different states of the same
 *     money. Only the backend's released figure can be requested, so it is the
 *     hero figure and accrued is stated beside it as unsettled.
 *   • The payout wallet receives BNB on BNB Smart Chain after settlement. The
 *     connected wallet signs purchase payments. They are separate, and every
 *     action that touches either names which one it is.
 *
 * EVERY ACTION IS REAL. Copy copies; connect and disconnect go through the
 * provider; the in-page actions scroll to a section that exists; the network
 * action switches the wallet through the same fail-closed assertion the purchase
 * flow uses; the payout request is re-validated by the backend. There is no
 * deposit button because the product has no receive flow, and no invented asset
 * list because there is no on-chain balance to show.
 *
 * LONG IDENTIFIERS NEVER WIDEN THE PAGE. A hash is truncated in its row and
 * printed in full, with a copy control, in that row's detail panel; an address is
 * printed once in the wallet header as a copyable control.
 */

const EVM = /^0x[0-9a-fA-F]{40}$/;

/** Campaign states after which the payout wallet can no longer be changed
 * (mirrors the backend wallet cutoff semantics; the endpoint re-validates). */
const WALLET_LOCKED_STATES = new Set(['settling', 'payout', 'closed', 'archived']);

export const PAYOUT_REQUEST_MIN_GBP = 10;

const REQUIRED_CHAIN_ID = PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID;

/** The tone of a recorded payout request. The label is always shown too. */
function payoutTone(status?: string | null): PseStatusTone {
  if (status === 'paid') return 'good';
  if (status === 'failed' || status === 'reversed') return 'danger';
  if (status === 'pending' || status === 'under_review' || status === 'approved' || status === 'processing') return 'hold';
  return 'idle';
}

/** The row's direction mark state: in review, settled, or failed. */
function payoutState(status?: string | null): 'pending' | 'paid' | 'failed' | 'idle' {
  if (status === 'paid') return 'paid';
  if (status === 'failed' || status === 'reversed') return 'failed';
  if (status === 'pending' || status === 'under_review' || status === 'approved' || status === 'processing') return 'pending';
  return 'idle';
}

const PENDING_STATUSES = ['pending', 'under_review', 'approved', 'processing'];

/** The recorded amount of a payout, whichever spelling the backend used. */
function payoutAmount(w: PseWithdrawal): number | null {
  if (typeof w.amountGBP === 'number') return w.amountGBP;
  if (typeof w.amountGbp === 'number') return w.amountGbp;
  if (typeof w.amountMinor === 'number') return w.amountMinor / 100;
  if (typeof w.requestedAmountGBP === 'number') return w.requestedAmountGBP;
  return null;
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export const PSEMineWallet: React.FC = () => {
  const {
    pseUser, campaign, connectedWallet, connectWallet, disconnectWallet, isConnectingWallet,
    updatePayoutWallet, injectedWallets, walletConnectAvailable, connectWalletConnectTransport,
    walletName, walletChainId, ensurePaymentChain, refreshWalletChain,
  } = usePSEMine();

  const {
    state, withdrawals, loading, error, refresh, refreshing, campaignStatus, feedErrors, refreshFeed,
  } = usePseState();
  const availableStr = useAvailableGBP();

  const [payoutInput, setPayoutInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [walletTab, setWalletTab] = useState<'overview' | 'activity' | 'manage'>('overview');

  // Mirror the backend gate exactly: create_payout_request blocks while the
  // effective campaign status is active/paused. Everything else (minimum £10,
  // configured wallet, balance, single pending request) is re-validated server-side.
  // Fail closed when the campaign status is unknown: a missing status is not
  // evidence that settlement has released a balance. The backend re-validates
  // every request anyway.
  const payoutBlocked = campaignStatus === null || campaignStatus === 'scheduled'
    || campaignStatus === 'active' || campaignStatus === 'paused';
  const pendingRequest = withdrawals.some(w => PENDING_STATUSES.includes(String(w.status)));
  const availableMinor = state?.user?.availableMinor ?? 0;
  const payoutWallet = state?.user?.payoutWallet ?? pseUser?.payoutWallet ?? null;

  // An unreported status is stated as unreported, never defaulted to Scheduled.
  const campaignView = campaignStatus !== null
    ? campaignStatusView(campaignStatus)
    : { label: 'Status not reported', detail: 'The backend has not reported the campaign’s status yet.', live: false };
  const walletLocked = WALLET_LOCKED_STATES.has(campaign?.status || '') ||
    (state?.effectiveCampaignStatus !== undefined && WALLET_LOCKED_STATES.has(state.effectiveCampaignStatus));

  const user = state?.user ?? {
    accruedGBP: pseUser?.totalAccruedGBP ?? null,
    totalCapacityGBPPerHour: pseUser?.totalCapacityGBPPerHour ?? 0,
    payoutWallet: pseUser?.payoutWallet ?? null,
    connectedWallet: pseUser?.connectedWallet ?? null,
  };

  const accruedDisplay = typeof user.accruedGBP === 'number' && Number.isFinite(user.accruedGBP)
    ? gbp(user.accruedGBP)
    : '—';

  /** Payouts recorded as in review. `—` when the feed could not be read: an
   *  unread ledger is not a zero. */
  const inReview = useMemo(() => {
    if (feedErrors.withdrawals) return null;
    const total = withdrawals.reduce((sum, w) => (
      PENDING_STATUSES.includes(String(w.status)) ? sum + (payoutAmount(w) ?? 0) : sum
    ), 0);
    return total;
  }, [withdrawals, feedErrors.withdrawals]);

  const chainKnown = typeof walletChainId === 'number';
  const chainIsRequired = walletChainId === REQUIRED_CHAIN_ID;
  const networkLabel = !connectedWallet
    ? 'Wallet not connected'
    : !chainKnown
      ? 'Network not reported'
      : chainIsRequired
        ? `BNB Smart Chain · ${walletChainId}`
        : `Wrong network · chain ${walletChainId}`;
  const networkTone: 'good' | 'hold' | 'idle' = !connectedWallet
    ? 'idle'
    : !chainKnown
      ? 'idle'
      : chainIsRequired ? 'good' : 'hold';

  const copy = async (value: string, message: string) => {
    const ok = await copyText(value);
    if (ok) toast.success(message);
    else toast.error('Could not copy. Select the value and copy it manually.');
  };

  const switchNetwork = async () => {
    setSwitching(true);
    try {
      const ok = await ensurePaymentChain(REQUIRED_CHAIN_ID);
      if (ok) {
        await refreshWalletChain();
        toast.success('Wallet is on BNB Smart Chain.');
      } else {
        toast.error('The wallet did not switch network. Purchase payments require BNB Smart Chain.');
      }
    } finally {
      setSwitching(false);
    }
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

  /* A blocking failure keeps the page's own header and states the failure in the
     place the balance would be — never a bare spinner and never £0.00. */
  if (error && !state) {
    return (
      <div className="pse-console-main pse-wallet">
        <WalletHead
          walletName={walletName}
          connectedWallet={connectedWallet}
          networkLabel={networkLabel}
          networkTone={networkTone}
          onCopy={() => undefined}
        />
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  const initialLoading = loading && !state;

  return (
    <div className="pse-console-main pse-wallet">
      <WalletHead
        walletName={walletName}
        connectedWallet={connectedWallet}
        networkLabel={networkLabel}
        networkTone={networkTone}
        onCopy={connectedWallet ? () => void copy(connectedWallet, 'Wallet address copied.') : undefined}
        actions={(
          <PseButton variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing} busy={refreshing}>
            {refreshing ? 'Syncing…' : 'Sync'}
          </PseButton>
        )}
      />

      {/* THE BALANCE: settlement-available is what can be requested, so it is
          the figure the page leads with. Accrued and in-review sit beside it. */}
      {initialLoading ? (
        <div className="pse-w-skel-balance" role="status" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading your wallet balances</span>
          <PseSkeleton width="9ch" height="0.625rem" />
          <PseSkeleton width="13ch" height="2.5rem" />
          <PseSkeleton width="34ch" height="0.75rem" />
          <div className="pse-w-figures" style={{ borderTop: 0 }}>
            <div className="pse-w-figure">
              <PseSkeleton width="6ch" height="0.5rem" />
              <PseSkeleton width="7ch" height="0.9375rem" />
            </div>
            <div className="pse-w-figure">
              <PseSkeleton width="5ch" height="0.5rem" />
              <PseSkeleton width="6ch" height="0.9375rem" />
            </div>
            <div className="pse-w-figure">
              <PseSkeleton width="7ch" height="0.5rem" />
              <PseSkeleton width="9ch" height="0.9375rem" />
            </div>
          </div>
        </div>
      ) : (
        <section className="pse-w-balance" aria-labelledby="pse-w-available-label">
          <div className="pse-w-hero">
            <p className="pse-w-hero-label" id="pse-w-available-label">
              Settlement-available
            </p>
            <p className="pse-w-hero-figure">
              {availableStr}
              <span className="pse-w-hero-unit">GBP</span>
            </p>
            <p className="pse-w-hero-note">
              Released by campaign settlement and available to request. A payout is reviewed before
              BNB is sent to your payout wallet.
            </p>
          </div>

          <dl className="pse-w-figures">
            <div className="pse-w-figure">
              <dt>Accrued</dt>
              <dd>{accruedDisplay}</dd>
              <dd className="pse-w-figure-note">Unsettled campaign earnings</dd>
            </div>
            <div className="pse-w-figure">
              <dt>In review</dt>
              <dd>{inReview === null ? '—' : gbp(inReview)}</dd>
              <dd className="pse-w-figure-note">
                {inReview === null ? 'Payout history could not be read' : 'Payout requests under review'}
              </dd>
            </div>
            <div className="pse-w-figure">
              <dt>Payout wallet</dt>
              <dd>{payoutWallet ? shortAddr(payoutWallet) : 'Not set'}</dd>
              <dd className="pse-w-figure-note">Receives BNB after settlement</dd>
            </div>
          </dl>
        </section>
      )}

      {/* THE ACTIONS — each one performs the operation it names. */}
      <div className="pse-w-actions" aria-label="Wallet actions">
        <button type="button" className="pse-w-action pse-w-action--primary" onClick={() => setWalletTab('overview')}>
          <span className="pse-w-action-glyph" aria-hidden="true"><PayoutGlyph /></span>
          <span className="pse-w-action-label">Payout</span>
        </button>

        <button
          type="button"
          className="pse-w-action"
          onClick={() => void copy(connectedWallet || '', 'Wallet address copied.')}
          disabled={!connectedWallet}
          aria-label={connectedWallet ? `Copy connected wallet address ${connectedWallet}` : 'Copy connected wallet address'}
        >
          <span className="pse-w-action-glyph" aria-hidden="true"><CopyGlyph /></span>
          <span className="pse-w-action-label">Copy wallet</span>
        </button>

        <button type="button" className="pse-w-action" onClick={() => setWalletTab('activity')}>
          <span className="pse-w-action-glyph" aria-hidden="true"><HistoryGlyph /></span>
          <span className="pse-w-action-label">History</span>
        </button>

        {connectedWallet ? (
          <button type="button" className="pse-w-action" onClick={() => void disconnectWallet()}>
            <span className="pse-w-action-glyph" aria-hidden="true"><DisconnectGlyph /></span>
            <span className="pse-w-action-label">Disconnect</span>
          </button>
        ) : (
          <button
            type="button"
            className="pse-w-action"
            onClick={() => void connectWallet()}
            disabled={isConnectingWallet}
          >
            <span className="pse-w-action-glyph" aria-hidden="true"><ConnectGlyph /></span>
            <span className="pse-w-action-label">{isConnectingWallet ? 'Connecting…' : 'Connect'}</span>
          </button>
        )}

        {connectedWallet && chainKnown && !chainIsRequired && (
          <button type="button" className="pse-w-action" onClick={() => void switchNetwork()} disabled={switching}>
            <span className="pse-w-action-glyph" aria-hidden="true"><NetworkGlyph /></span>
            <span className="pse-w-action-label">{switching ? 'Switching…' : 'Switch network'}</span>
          </button>
        )}
      </div>

      {!connectedWallet && (
        <PseNotice>
          No wallet is connected in this browser. A connected wallet is only needed to sign a tool
          purchase — your balances, payout wallet and history below do not depend on it.
        </PseNotice>
      )}

      {connectedWallet && chainKnown && !chainIsRequired && (
        <PseNotice tone="attention" title="Wallet network">
          This wallet is on chain {walletChainId}, and PSEmine payments are made on BNB Smart Chain
          (chain {REQUIRED_CHAIN_ID}). Balances and payouts are unaffected; switch the wallet before a
          purchase.
        </PseNotice>
      )}

      {/* THE PAYOUT REQUEST sits immediately under the balance and its actions:
          it is the one thing a settled balance is for. */}
      <nav className="pse-wallet-tabs" aria-label="Wallet sections">
        <button type="button" className={walletTab === 'overview' ? 'is-active' : ''} aria-current={walletTab === 'overview' ? 'page' : undefined} onClick={() => setWalletTab('overview')}>Overview</button>
        <button type="button" className={walletTab === 'activity' ? 'is-active' : ''} aria-current={walletTab === 'activity' ? 'page' : undefined} onClick={() => setWalletTab('activity')}>Activity <span>{withdrawals.length}</span></button>
        <button type="button" className={walletTab === 'manage' ? 'is-active' : ''} aria-current={walletTab === 'manage' ? 'page' : undefined} onClick={() => setWalletTab('manage')}>Manage wallet</button>
      </nav>

      {walletTab === 'overview' && (
        <div className="pse-wallet-view pse-wallet-overview">
                <div id="pse-payout-request" className="pse-w-anchor">
                  <PayoutRequestSection
                    blocked={payoutBlocked}
                    pending={pendingRequest}
                    availableMinor={availableMinor}
                    payoutWallet={payoutWallet}
                    campaignLabel={campaignStatus ? campaignView.label : null}
                    loading={initialLoading}
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
                </div>
          <div className="pse-wallet-settlement-note">
            <span className="pse-wallet-note-mark" aria-hidden="true">i</span>
            <p><strong>How PSEmine pays you</strong><span>Campaign earnings are accounted for in GBP. Once settlement releases your balance, an eligible payout request is reviewed and paid in BNB on BNB Smart Chain. Minimum request: {gbp(PAYOUT_REQUEST_MIN_GBP)}.</span></p>
            <Link to="/mine/payout-policy" className="pse-link">Payout policy ↗</Link>
          </div>
        </div>
      )}

      {walletTab === 'activity' && (
        <div className="pse-wallet-view pse-wallet-activity">
                    <section className="pse-block" id="pse-tx-history" aria-labelledby="pse-tx-history-title">
                      <div className="pse-block-head">
                        <h2 className="pse-block-title" id="pse-tx-history-title">Transactions</h2>
                        <span className="pse-block-meta">
                          {feedErrors.withdrawals
                            ? 'Not readable'
                            : `${withdrawals.length} record${withdrawals.length === 1 ? '' : 's'}`}
                          {' · '}
                          <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('withdrawals')}>
                            Refresh
                          </button>
                        </span>
                      </div>
          
                      {feedErrors.withdrawals && (
                        <PseFeedNotice
                          message="The payout history could not be read, so this ledger is incomplete rather than empty."
                          onRetry={() => void refreshFeed('withdrawals')}
                          retrying={refreshing}
                        />
                      )}
          
                      {initialLoading ? (
                        <PseSkeletonRows rows={4} label="Loading payout transactions" />
                      ) : withdrawals.length === 0 ? (
                        <PseEmptyNote
                          title="No transactions yet"
                          action={<button type="button" className="pse-btn pse-btn--secondary pse-btn--sm" onClick={() => setWalletTab('overview')}>View payout options</button>}
                        >
                          Payouts appear here once settlement releases your balance and you request a payout — with
                          the recorded status and, once paid, the transaction on BNB Smart Chain.
                        </PseEmptyNote>
                      ) : (
                        <ul className="pse-w-txlist">
                          {withdrawals.map(w => <PayoutRecord key={w.id} record={w} onCopy={copy} />)}
                        </ul>
                      )}
                    </section>
        </div>
      )}

      {walletTab === 'manage' && (
        <div className="pse-wallet-view pse-wallet-manage">
          <div className="pse-wallet-manage-grid">
            <div className="pse-wallet-manage-primary">
                    <PseSection title="Payout wallet" meta={payoutWallet ? shortAddr(payoutWallet) : 'Not set'}>
                      {initialLoading ? (
                        <PseSkeletonRows rows={2} label="Loading payout wallet" />
                      ) : (
                        <>
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
                                {payoutWallet && (
                                  <PseButton variant="secondary" size="sm" onClick={() => void copy(payoutWallet, 'Payout address copied.')}>
                                    Copy address
                                  </PseButton>
                                )}
                              </div>
                            </form>
                          )}
                          <p className="pse-prose--sm">
                            Payments are sent to the campaign’s locked receiving address. Payouts are sent to this
                            wallet. They are different wallets, and this is the only place the payout wallet is set.
                          </p>
                        </>
                      )}
                    </PseSection>
            </div>
            <div className="pse-wallet-manage-secondary">
                    <PseSection title="Network and assets" meta={`Chain ${REQUIRED_CHAIN_ID}`}>
                      <dl className="pse-w-net">
                        <div className="pse-w-net-row">
                          <span className="pse-w-net-key">Campaign accounting</span>
                          <span className="pse-w-net-val">GBP (off-chain)</span>
                        </div>
                        <div className="pse-w-net-row">
                          <span className="pse-w-net-key">Settlement asset</span>
                          <span className="pse-w-net-val">BNB</span>
                        </div>
                        <div className="pse-w-net-row">
                          <span className="pse-w-net-key">Settlement network</span>
                          <span className="pse-w-net-val">
                            {state?.campaign?.paymentNetwork || PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}
                          </span>
                        </div>
                        <div className="pse-w-net-row">
                          <span className="pse-w-net-key">Connected chain</span>
                          <span className="pse-w-net-val">
                            {connectedWallet
                              ? chainKnown ? `Chain ${walletChainId}${chainIsRequired ? ' · payment network' : ''}` : 'Not reported'
                              : 'No wallet connected'}
                          </span>
                        </div>
                      </dl>
                      <p className="pse-prose--sm">
                        PSEmine balances are campaign accounting in GBP, not an on-chain token balance. BNB is
                        the rail settlement is paid on.
                      </p>
                      {(injectedWallets.length > 0 || walletConnectAvailable) && !connectedWallet && (
                        <div className="pse-actions">
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
                        </div>
                      )}
                    </PseSection>
                    <PseSection
                      title="Signing wallet"
                      meta={walletName ? (chainKnown ? `${walletName} · chain ${walletChainId}` : walletName) : 'Not connected'}
                    >
                      <div className="pse-w-net">
                        <div className="pse-w-net-row">
                          <span className="pse-w-net-key">In this browser</span>
                          <span className="pse-w-net-val">{connectedWallet ? shortAddr(connectedWallet) : 'None connected'}</span>
                        </div>
                        <div className="pse-w-net-row">
                          <span className="pse-w-net-key">Provider</span>
                          <span className="pse-w-net-val">{walletName || '—'}</span>
                        </div>
                        <div className="pse-w-net-row">
                          <span className="pse-w-net-key">Network</span>
                          <span className="pse-w-net-val">{networkLabel}</span>
                        </div>
                      </div>
          
                      <div className="pse-actions">
                        {connectedWallet ? (
                          <>
                            <PseButton variant="secondary" size="sm" onClick={() => void disconnectWallet()}>Disconnect</PseButton>
                            {chainKnown && !chainIsRequired && (
                              <PseButton size="sm" onClick={() => void switchNetwork()} disabled={switching}>
                                {switching ? 'Switching…' : 'Switch to BNB Smart Chain'}
                              </PseButton>
                            )}
                          </>
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
                      <p className="pse-prose--sm">
                        {connectedWallet
                          ? 'This wallet signs purchase payments in this browser. It is not the payout wallet.'
                          : 'No wallet is connected in this browser. A connected wallet is required to sign a purchase payment.'}
                      </p>
                    </PseSection>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Wallet header ─────────────────────────────────────────────────────── */

const WalletHead: React.FC<{
  walletName: string | null;
  connectedWallet: string | null;
  networkLabel: string;
  networkTone: 'good' | 'hold' | 'idle';
  onCopy?: () => void;
  actions?: React.ReactNode;
}> = ({ walletName, connectedWallet, networkLabel, networkTone, onCopy, actions }) => (
  <header className="pse-w-head">
    <div className="pse-w-head-id">
      <p className="pse-eyebrow">Campaign account</p>
      <h1 className="pse-w-title">Wallet</h1>
      <p className="pse-w-head-note">
        Campaign earnings in GBP, settlement released to your payout wallet in BNB on BNB Smart Chain.
      </p>
    </div>

    <div className="pse-w-head-side">
      <span className="pse-w-chip" data-tone={connectedWallet ? 'good' : 'idle'}>
        {connectedWallet ? 'Connected' : 'Disconnected'}
      </span>
      <span className="pse-w-chip" data-tone={networkTone}>
        <span className="pse-w-chip-value">{networkLabel}</span>
      </span>

      {connectedWallet && onCopy && (
        <button
          type="button"
          className="pse-w-addr"
          onClick={onCopy}
          aria-label={`Copy wallet address ${connectedWallet}${walletName ? ` (${walletName})` : ''}`}
        >
          <span className="pse-w-addr-text">{shortAddr(connectedWallet)}</span>
          <span className="pse-w-addr-copy" aria-hidden="true"><CopyGlyph size={14} /></span>
        </button>
      )}

      {actions}
    </div>
  </header>
);

/* ── One payout record ─────────────────────────────────────────────────── */

/**
 * A wallet transaction row.
 *
 * The row is a control because the record has more to it than fits: the full
 * destination, the full hash and the backend reference live in its detail panel.
 * The row itself prints the truncated forms, so a 66-character hash can never
 * widen the page — and the copy control in the panel is the accessible way to
 * take the exact value away.
 */
const PayoutRecord: React.FC<{
  record: PseWithdrawal;
  onCopy: (value: string, message: string) => Promise<void>;
}> = ({ record, onCopy }) => {
  const [open, setOpen] = useState(false);
  const view = payoutStatusView(record.status);
  const amount = payoutAmount(record);
  const failed = payoutState(record.status) === 'failed';
  const dest = record.destinationWallet || record.payoutWallet || record.payoutAddress || null;
  const tx = record.payoutTxHash || record.transactionHash || null;
  const panelId = `pse-tx-${record.id}`;

  return (
    <li className="pse-w-tx" data-state={payoutState(record.status)}>
      <button
        type="button"
        className="pse-w-txrow"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(v => !v)}
      >
        <span className="pse-w-txmark" aria-hidden="true"><PayoutGlyph /></span>
        <span className="pse-w-txid">
          <span className="pse-w-txtitle">
            Payout
            <PseStatus tone={payoutTone(record.status)}>{view.label}</PseStatus>
          </span>
          <span className="pse-w-txmeta">
            <span>{fmtDateTime(record.createdAt)}</span>
            {dest && <span className="pse-w-txhash">to {shortAddr(dest)}</span>}
            {tx && <span className="pse-w-txhash">{shortHash(tx, 8)}</span>}
          </span>
        </span>
        <span className="pse-w-txfig">
          <span className="pse-w-txamount">
            {amount === null ? '—' : `${failed ? '' : '−'}${gbp(amount)}`}
          </span>
          <span className="pse-w-txwhen">{open ? 'Hide' : 'Details'}</span>
        </span>
      </button>

      {open && (
        <div className="pse-w-txdetail" id={panelId}>
          <div className="pse-w-kv">
            <span className="pse-w-kv-key">Recorded</span>
            <span className="pse-w-kv-val">
              {fmtDateTime(record.createdAt)}
              {record.updatedAt ? ` · updated ${fmtDateTime(record.updatedAt)}` : ''}
            </span>
          </div>
          <div className="pse-w-kv">
            <span className="pse-w-kv-key">Destination</span>
            <span className="pse-w-kv-val">
              {dest || 'Not reported'}
              {dest && (
                <button type="button" className="pse-textlink" onClick={() => void onCopy(dest, 'Payout address copied.')}>
                  Copy
                </button>
              )}
            </span>
          </div>
          <div className="pse-w-kv">
            <span className="pse-w-kv-key">Transaction</span>
            <span className="pse-w-kv-val">
              {tx ? (
                <>
                  <a href={`https://bscscan.com/tx/${tx}`} target="_blank" rel="noreferrer" className="pse-link">
                    {shortHash(tx, 10)}
                  </a>
                  <span>BscScan</span>
                  <button type="button" className="pse-textlink" onClick={() => void onCopy(tx, 'Transaction hash copied.')}>
                    Copy hash
                  </button>
                </>
              ) : record.status === 'paid'
                ? 'Paid, but no transaction hash was reported'
                : 'Not submitted yet'}
            </span>
          </div>
          <div className="pse-w-kv">
            <span className="pse-w-kv-key">Reference</span>
            <span className="pse-w-kv-val">
              {record.id}
              <button type="button" className="pse-textlink" onClick={() => void onCopy(record.id, 'Reference copied.')}>
                Copy
              </button>
            </span>
          </div>
          {record.reviewNotes && (
            <div className="pse-w-kv">
              <span className="pse-w-kv-key">Review note</span>
              <span className="pse-w-kv-val">{record.reviewNotes}</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

/* ── Payout request ─────────────────────────────────────────────────────
 * Availability derives from the BACKEND campaign state (never dates, never
 * browser time). While active/paused → explanation only. Post-settlement → the
 * real request form; the server re-validates every condition. */
function PayoutRequestSection({ blocked, pending, availableMinor, payoutWallet, campaignLabel, loading, onSubmit }: {
  blocked: boolean; pending: boolean; availableMinor: number; payoutWallet: string | null;
  campaignLabel: string | null; loading: boolean; onSubmit: (amountGbp: number) => Promise<boolean>;
}) {
  const availableGBP = availableMinor / 100;
  const walletConfigured = Boolean(payoutWallet);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <PseSection title="Request a payout" meta={blocked ? 'Opens after settlement' : 'Settlement-available'}>
      {loading ? (
        <PseSkeletonRows rows={2} label="Loading payout availability" />
      ) : blocked ? (
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
        <div className="pse-w-request">
          <div className="pse-w-request-head">
            <p className="pse-prose">
              Request up to the released balance, paid to your payout wallet
              {payoutWallet ? ` (${shortAddr(payoutWallet)})` : ''}. The amount stays denominated in GBP until it is
              paid in BNB.
            </p>
            <span className="pse-w-request-figure">{gbp(availableGBP)}</span>
          </div>
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
            className="pse-w-request-form"
          >
            <PseField label="Amount (GBP)" htmlFor="pse-payout-amount">
              <PseInput
                id="pse-payout-amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="10.00"
              />
            </PseField>
            <PseButton variant="secondary" size="sm" onClick={() => setAmount(String(availableGBP))}>Max</PseButton>
            <PseButton type="submit" size="sm" disabled={busy}>{busy ? 'Submitting…' : 'Request payout'}</PseButton>
          </form>
        </div>
      )}
    </PseSection>
  );
}

/* ── Glyphs ────────────────────────────────────────────────────────────────
 * One 20x20 grid, one stroke width — the wallet's marks read as one family. */

const PayoutGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="M10 15.2V4.8M6 8.6 10 4.6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CopyGlyph: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <rect x="7.2" y="7.2" width="8.6" height="8.6" rx="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M12.8 7.2V5.9A1.7 1.7 0 0 0 11.1 4.2H5.9A1.7 1.7 0 0 0 4.2 5.9v5.2c0 .94.76 1.7 1.7 1.7h1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const HistoryGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="6.4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M10 6.6V10l2.6 1.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ConnectGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="M8.4 5.2H5.9A1.9 1.9 0 0 0 4 7.1v5.8a1.9 1.9 0 0 0 1.9 1.9h2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M11.6 6.9 14.7 10l-3.1 3.1M8.2 10h6.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DisconnectGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="M11.6 5.2h2.5A1.9 1.9 0 0 1 16 7.1v5.8a1.9 1.9 0 0 1-1.9 1.9h-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M8.4 6.9 5.3 10l3.1 3.1M11.8 10H5.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NetworkGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="6.4" stroke="currentColor" strokeWidth="1.3" />
    <path d="M3.8 10h12.4M10 3.6c1.7 1.7 2.6 4 2.6 6.4s-.9 4.7-2.6 6.4c-1.7-1.7-2.6-4-2.6-6.4s.9-4.7 2.6-6.4Z" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export default PSEMineWallet;
