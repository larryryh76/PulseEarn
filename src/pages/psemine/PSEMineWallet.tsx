import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, Lock, ShieldCheck, Info, Link2, Unlink, Send, Landmark, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { requestPayout } from '../../engines/psemine/pseMineApi';
import {
  type StampTone,
  Stamp, StatementHeader, Verdict, CapacityRail, Ledger, LedgerRow,
  Attn, Clause, PSEEmpty, PSELoading, PSEError,
  gbp, gbpHour, shortAddr, shortHash, fmtDateTime, payoutStatusView, CopyField,
  campaignStatusView, campaignTone,
} from '../../components/psemine/pse';
import { PSEMINE_CONSTANTS } from '../../types/psemine';
import toast from 'react-hot-toast';

const EVM = /^0x[0-9a-fA-F]{40}$/;

/** Campaign states after which the payout wallet can no longer be changed
 * (mirrors the backend wallet cutoff semantics; the endpoint re-validates). */
const WALLET_LOCKED_STATES = new Set(['settling', 'payout', 'closed', 'archived']);

export const PAYOUT_REQUEST_MIN_GBP = 10;

/** Stamp tone for a backend payout-request status. */
const payoutTone = (status?: string | null): StampTone => {
  switch (status) {
    case 'paid': return 'live';
    case 'failed':
    case 'reversed': return 'fail';
    case 'under_review':
    case 'processing': return 'attn';
    case 'approved': return 'info';
    default: return 'idle';
  }
};

/**
 * The wallet.
 *
 * Composition law (Duty & Ledger): VERDICT → RAILS → LEDGERS → NOTES.
 *
 *   VERDICT  what the campaign has EARNED, on the canvas. The single most
 *            dangerous confusion in this product is mistaking GBP campaign
 *            accounting for a crypto balance, so the accrued figure dominates
 *            and the settlement balance is stated beside it, labelled.
 *   RAIL     the canonical capacity register — earnings accrue from capacity.
 *   LEDGERS  settlement, the two BNB addresses (payment vs payout — never the
 *            same thing) and the payout history. Real records only.
 *   NOTES    how settlement works, unframed.
 */
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
    return <div className="pse-gut pt-6"><PSELoading label="Loading your wallet" /></div>;
  }
  if (error && !state) {
    return (
      <div className="pse-gut py-8">
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <div className="pse-gut pse-stack" style={{ paddingTop: 22 }}>
      <StatementHeader
        routeKey="Wallet · balances & addresses"
        title="Wallet"
        objective="Three separate things, deliberately kept apart: what the campaign has earned (GBP), what is settled and available, and the BNB Smart Chain addresses involved. Settlement is paid in crypto; campaign earnings are accounted in GBP."
        status={
          <Stamp tone={campaignTone(campaignStatus)} pulse={campaignView.live} glyph="●">
            {campaignView.label.trim()}
          </Stamp>
        }
        actions={
          <button onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-2 pse-btn-sm">
            {refreshing ? 'Syncing…' : 'Sync balances'}
          </button>
        }
      />

      {/* ══ VERDICT — what the campaign has earned ══ */}
      <Verdict
        label="Campaign earnings accrued"
        value={gbp(user.accruedGBP)}
        status={
          <Stamp tone={campaignView.live ? 'live' : 'idle'} glyph="●">
            {campaignView.live ? 'Accruing' : campaignView.label.trim()}
          </Stamp>
        }
        note={
          <>
            Earned by {gbpHour(capacity)} of capacity and stored server-side. Not withdrawable during the campaign —
            the balance is finalised when the campaign closes and the ledger settles.
          </>
        }
        side={
          <div className="pse-stack-tight">
            <div className="pse-spec-line"><span>Settlement available</span><span className="pse-cyan">{availableStr}</span></div>
            <div className="pse-spec-line"><span>Payout minimum</span><span>{gbp(PAYOUT_REQUEST_MIN_GBP)}</span></div>
            <div className="pse-spec-line">
              <span>Payout wallet</span>
              <span>{payoutWallet ? shortAddr(payoutWallet) : 'Not set'}</span>
            </div>
            <div className="pse-spec-line">
              <span>Payment wallet</span>
              <span>{connectedWallet ? shortAddr(connectedWallet) : 'Not connected'}</span>
            </div>
          </div>
        }
      />

      {/* ══ RAIL — capacity is what produces the earnings ══ */}
      <CapacityRail
        toolCapacity={user.toolCapacityGBPPerHour ?? 0}
        referralCapacity={user.referralCapacityGBPPerHour ?? 0}
        counts={pseUser?.toolOwnershipCounts}
        referralCount={state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0}
        label="Mining capacity"
        meta="Earnings accrue by the hour from this capacity — only while tools are operating"
      />

      {feedErrors.withdrawals && (
        <Attn
          tone="attn"
          title="Payout history is degraded"
          body="Payout records could not be loaded — the history below may be incomplete."
          action={
            <button onClick={() => void refreshFeed('withdrawals')} disabled={refreshing} className="pse-btn pse-btn-2 pse-btn-sm">
              Retry
            </button>
          }
        />
      )}

      {pendingRequest && (
        <Attn
          tone="info"
          title="A payout request is under review"
          body="One request is being reviewed. It stays in the history below until it resolves, and no second request can be submitted meanwhile."
        />
      )}

      {/* ══ LEDGER — settlement ══ */}
      <Ledger
        title="Settlement"
        meta="Backend-reported balance · available only after the campaign ends"
        legend={['Item', 'Value']}
        action={
          <Stamp tone={payoutBlocked ? 'idle' : pendingRequest ? 'attn' : 'live'} glyph="●">
            {payoutBlocked ? 'Opens at settlement' : pendingRequest ? 'Request under review' : 'Open'}
          </Stamp>
        }
        foot={
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
        }
      >
        <LedgerRow
          title="Settlement-available balance"
          sub="Net of payout requests already submitted — never relabelled accrued earnings"
          value={<span className="pse-cyan">{availableStr}</span>}
        />
        <LedgerRow title="Payout minimum" sub="Per request, after settlement" value={gbp(PAYOUT_REQUEST_MIN_GBP)} />
        <LedgerRow title="Payout asset" sub={`${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}`} value="BNB" valueTone="var(--pse-bnb)" />
        <LedgerRow
          title="Requests on record"
          sub={pendingRequest ? 'One is under review' : 'None pending'}
          value={String(withdrawals.length)}
        />
        <LedgerRow title="Accounting currency" sub="Accrual is denominated in GBP" value="GBP (£)" />
      </Ledger>

      {/* ══ LEDGER — the two BNB addresses, one instrument ══ */}
      <Ledger
        title="BNB wallets"
        meta="The wallet you pay from and the address settlement is paid to are different things"
        legend={['Address', 'State']}
      >
        <LedgerRow
          title="Payment wallet"
          sub="Signs tool purchases · never changes where settlement is paid"
          value={
            <Stamp tone={connectedWallet ? 'live' : 'idle'} glyph="●">
              {connectedWallet ? 'Connected' : 'Not connected'}
            </Stamp>
          }
        >
          <div className="flex flex-wrap items-center gap-2.5" style={{ marginTop: 10 }}>
            {connectedWallet ? (
              <>
                <CopyField value={connectedWallet} display={shortAddr(connectedWallet)} label="connected wallet" />
                <button onClick={disconnectWallet} className="pse-btn pse-btn-3 pse-btn-sm">
                  <Unlink size={13} /> Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => void connectWallet()}
                disabled={isConnectingWallet}
                className="pse-btn pse-btn-2 pse-btn-sm"
              >
                <Link2 size={13} /> {isConnectingWallet ? 'Connecting…' : 'Connect wallet'}
              </button>
            )}
            <span className="pse-chain">
              <span className="pse-chain-mark" aria-hidden="true" />
              {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}
            </span>
          </div>
        </LedgerRow>

        <LedgerRow
          title="Payout wallet"
          sub="Stored server-side · payouts are irreversible once processed"
          value={
            <Stamp tone={walletLocked ? 'attn' : payoutWallet ? 'live' : 'fail'} glyph="●">
              {walletLocked ? 'Locked for settlement' : payoutWallet ? 'Configured' : 'Not set'}
            </Stamp>
          }
        >
          <div className="pse-stack-tight" style={{ marginTop: 10 }}>
            {payoutWallet && (
              <div>
                <CopyField value={payoutWallet} display={payoutWallet} label="payout wallet" fullWidth />
                <p className="pse-meta" style={{ marginTop: 8 }}>
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
                <button type="submit" disabled={saving || !payoutInput.trim()} className="pse-btn">
                  <ShieldCheck size={14} /> {saving ? 'Saving…' : 'Set payout wallet'}
                </button>
              </form>
            ) : (
              <div className="pse-sunken pse-pad flex items-start gap-2.5">
                <Lock size={13} className="shrink-0" style={{ color: 'var(--pse-amber)', marginTop: 2 }} />
                <p className="pse-meta">
                  The campaign is {campaignView.label.trim().toLowerCase()} — payout wallet changes are locked. The
                  backend enforces this cutoff server-side.
                </p>
              </div>
            )}
          </div>
        </LedgerRow>
      </Ledger>

      {/* ══ LEDGER — payout history ══ */}
      <Ledger
        title="Payout history"
        meta="Real records only — requests, reviews and completions"
        legend={['Request', 'Amount']}
        action={withdrawals.length === 0
          ? <Stamp tone="idle" glyph="·">Opens at settlement</Stamp>
          : (
            <button onClick={() => void refreshFeed('withdrawals')} className="pse-meta pse-link">
              Refresh
            </button>
          )}
      >
        {withdrawals.length === 0 ? (
          <PSEEmpty
            icon={Wallet}
            title="No payout history yet"
            body="Payout requests become available once the campaign reaches settlement. Anything you request will be listed here with its full status."
          />
        ) : (
          withdrawals.map(w => {
            const view = payoutStatusView(w.status);
            const amount = typeof w.amountGBP === 'number' ? w.amountGBP
              : typeof w.amountMinor === 'number' ? w.amountMinor / 100
              : typeof w.requestedAmountGBP === 'number' ? w.requestedAmountGBP : null;
            const dest = w.destinationWallet || w.payoutWallet;
            const tx = w.payoutTxHash || w.transactionHash;
            return (
              <LedgerRow
                key={w.id}
                title={
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {fmtDateTime(w.createdAt)}
                    <Stamp tone={payoutTone(w.status)} glyph="·">{view.label}</Stamp>
                  </span>
                }
                sub={
                  <>
                    To <span className="pse-mono">{dest ? shortAddr(dest) : '—'}</span>
                    {tx ? <span className="pse-dim-3"> · {shortHash(tx)}</span> : null}
                  </>
                }
                value={amount !== null ? gbp(amount) : undefined}
              />
            );
          })
        )}
      </Ledger>

      {/* ══ NOTES — how settlement works, unframed ══ */}
      <div className="pse-note pse-stack-tight">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="pse-h3">How settlement works</h2>
          <div className="flex items-center gap-4">
            <Landmark size={13} className="pse-blue" />
            <Link to="/mine/activity" className="pse-meta pse-link inline-flex items-center gap-1.5">
              Ledger <ChevronRight size={12} />
            </Link>
            <Link to="/mine/guide" className="pse-meta pse-link inline-flex items-center gap-1.5">
              Campaign guide <ChevronRight size={12} />
            </Link>
          </div>
        </div>
        <Clause no="01" title="Campaign runs its full 90 days" body="Accrual stops at the end — capacity only accrues while the campaign is active." />
        <Clause no="02" title="Balances are finalised" body="Settlement calculates final balances from the append-only mining ledger." />
        <Clause no="03" title="Payout requests open" body={`Requests become available for settled balances of ${gbp(PAYOUT_REQUEST_MIN_GBP)} or more, paid to your configured payout wallet.`} />
        <Clause no="04" title="Review, then payout" body="Each request is reviewed, then processed on BNB Smart Chain and recorded here with its transaction hash." />
      </div>
    </div>
  );
};

/* ── Post-settlement payout request ─────────────────────────────────────
 * Availability derives from the BACKEND campaign state (never dates, never
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
      <div className="flex items-start gap-3">
        <Info size={14} className="shrink-0" style={{ color: 'var(--pse-text-3)', marginTop: 2 }} />
        <div>
          <p className="pse-label-b">Payout opens after campaign settlement</p>
          <p className="pse-meta" style={{ marginTop: 6 }}>
            The campaign is {campaignLabel.trim().toLowerCase()}. Once it reaches settlement and earnings are finalised,
            a payout request form appears here — {gbp(PAYOUT_REQUEST_MIN_GBP)} minimum, paid to your configured payout wallet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pse-stack-tight">
      {pending ? (
        <p className="pse-meta">You already have a payout request under review. It appears in your history until it resolves.</p>
      ) : availableMinor < PAYOUT_REQUEST_MIN_GBP * 100 ? (
        <p className="pse-meta">
          A minimum of {gbp(PAYOUT_REQUEST_MIN_GBP)} is required to request a payout. Your settlement-available balance is {gbp(availableMinor / 100)}.
        </p>
      ) : !walletConfigured ? (
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={13} className="shrink-0" style={{ color: 'var(--pse-amber)', marginTop: 2 }} />
          <p className="pse-meta">Set a payout wallet above before requesting your settlement.</p>
        </div>
      ) : (
        <>
          <p className="pse-meta">
            Request up to {gbp(availableGBP)} from your settlement-available balance, paid to your configured payout wallet
            {payoutWallet ? ` (${shortAddr(payoutWallet)})` : ''}.
          </p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const v = parseFloat(amount);
            if (!Number.isFinite(v) || v < PAYOUT_REQUEST_MIN_GBP) { toast.error('Minimum payout request is £10.00.'); return; }
            setBusy(true);
            try { await onSubmit(v); } finally { setBusy(false); setAmount(''); }
          }} className="flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <span className="pse-meta absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--pse-text-3)' }}>£</span>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                className="pse-input w-full pl-6 pr-16"
                placeholder="10.00"
                aria-label="Payout amount in GBP"
              />
              <button
                type="button"
                onClick={() => setAmount(String(availableGBP))}
                className="pse-btn pse-btn-3 pse-btn-sm absolute right-1.5 top-1/2 -translate-y-1/2"
              >
                Max
              </button>
            </div>
            <button type="submit" disabled={busy} className="pse-btn">
              <Send size={14} /> {busy ? 'Submitting…' : 'Request payout'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default PSEMineWallet;
