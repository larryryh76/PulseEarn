import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  type PsePaymentSubmissionState,
  canRetryPayment,
  isSubmissionUncertain,
  resolvePaymentPayer,
} from '../../engines/psemine/pseWallet';
import { type PsePendingPurchase } from '../../engines/psemine/pseMineApi';
import { PSEMineToolDefinition, PSEMineQuote, PSEMINE_CONSTANTS, LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import {
  CopyField, PSELoading, PSEError,
  gbp, gbpHour, gbpRate, shortAddr, shortHash, nowMs, cycleStateView,
  bnbExactFromWei,
} from '../../components/psemine/pse';
import toast from 'react-hot-toast';

const EVM = /^0x[0-9a-fA-F]{40}$/;

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const dutyOf = (t: PSEMineToolDefinition) => (t.operating?.model === 'continuous' ? 'continuous' as const : 'session' as const);

/**
 * The mining tool marketplace.
 *
 * The marketplace presents tool tiers, capacity facts, operating tools and
 * purchase mechanics as plain semantic content.
 *
 * The purchase flow's behaviour is unchanged: quote → bind payer → chain
 * assertion → sign → submit → on-chain verification → activation. The UI never
 * asserts success before the backend verifies, and every displayed amount comes
 * from the server quote's exact wei value (bnbExactFromWei).
 */
export const PSEMineTools: React.FC = () => {
  const { pseUser, campaign } = usePSEMine();
  const { state, refresh, loading, error, refreshing } = usePseState();
  const [purchasing, setPurchasing] = useState<PSEMineToolDefinition | null>(null);

  const counts = pseUser?.toolOwnershipCounts || { starter: 0, builder: 0, advanced: 0, elite: 0 };
  const purchaseOpen = campaign?.purchaseEnabled !== false && campaign?.status === 'active';
  const ownedTools = useMemo(
    () => (state?.tools ?? []).filter(t => ['active', 'cycle_complete', 'maintenance_required', 'restarting'].includes(String(t.status))),
    [state?.tools],
  );

  const toolCapacity = state?.user?.toolCapacityGBPPerHour ?? pseUser?.toolCapacityGBPPerHour ?? 0;
  const totalCapacity = state?.user?.totalCapacityGBPPerHour ?? pseUser?.totalCapacityGBPPerHour ?? 0;
  const referralCapacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;
  const referralQualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const headroom = Math.max(0, PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR - toolCapacity);
  const totalOwned = TOOLS.reduce((a, t) => a + (counts[t.id] || 0), 0);
  const tierSlotsLeft = TOOLS.reduce((acc, t) => acc + Math.max(0, t.maxPerUser - (counts[t.id] || 0)), 0);

  // ══ Refresh recovery: which pending purchase deserves the top strip ══════
  //   1. an IN-FLIGHT submission (transaction_submitted / confirming) — the
  //      backend is verifying it, so it is the most urgent thing to surface;
  //   2. otherwise the newest quote window (a live one is resumable as-is).
  // A lapsed awaiting_payment record is still shown (it must never be silently
  // forgotten) but is labelled honestly: its quote can no longer be paid, so
  // the action is a FRESH quote — the backend supersedes the dead record and
  // keeps it as audit history.
  const pendingPurchase = useMemo(() => {
    const rows = state?.pendingPurchases || [];
    if (rows.length === 0) return null;
    const rank = (p: PsePendingPurchase) => {
      const inFlight = p.status === 'transaction_submitted' || p.status === 'confirming';
      const parsed = p.expiresAt ? Date.parse(p.expiresAt) : NaN;
      return { inFlight, exp: Number.isNaN(parsed) ? 0 : parsed };
    };
    return [...rows].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra.inFlight !== rb.inFlight) return ra.inFlight ? -1 : 1;
      return rb.exp - ra.exp;
    })[0];
  }, [state?.pendingPurchases]);
  const pendingInFlight = pendingPurchase?.status === 'transaction_submitted' || pendingPurchase?.status === 'confirming';
  const pendingQuoteLive = Boolean(
    pendingPurchase?.expiresAt && Date.parse(pendingPurchase.expiresAt) > nowMs(),
  );

  if (loading && !state) {
    return <main><PSELoading label="Loading the marketplace" /></main>;
  }
  if (error && !state) {
    return <main><PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} /></main>;
  }

  return (
    <main>
      <header>
        <p>Mining tools · marketplace</p>
        <h1>Buy mining capacity</h1>
        <p>{purchaseOpen ? 'Purchases open' : campaign?.status === 'active' ? 'Purchases closed' : `Campaign ${campaign?.status || 'unavailable'}`}</p>
        <p>Four tool tiers with fixed GBP prices, fixed hourly capacity and fixed ownership limits. Paid in BNB — activated only after the backend verifies the transaction on-chain.</p>
        <Link to="/mine/dashboard">Operating console</Link>
      </header>

      <section aria-labelledby="capacity-heading">
        <h2 id="capacity-heading">Tool capacity deployed</h2>
        <p>{gbpHour(toolCapacity)}</p>
        <p>{headroom > 0 ? `${gbpHour(headroom)} headroom` : 'At the tool cap'}</p>
        <p>
          {headroom > 0
            ? `Up to ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of tool capacity can be held across the four tiers' ownership limits. ${
                toolCapacity === 0
                  ? 'No tools are held yet, so nothing is accruing.'
                  : `${gbpHour(headroom)} of that ceiling is still available.`
              }`
            : 'Tool capacity is at the campaign maximum. Qualified referrals can still add capacity.'}
        </p>
        <dl>
          <div><dt>Tools owned</dt><dd>{totalOwned}</dd></div>
          <div><dt>Ownership slots left</dt><dd>{tierSlotsLeft} across all tiers</dd></div>
          <div><dt>Total capacity</dt><dd>{gbpHour(totalCapacity)}</dd></div>
          <div><dt>Referral capacity</dt><dd>{gbpHour(referralCapacity)}</dd></div>
          <div><dt>Qualified referrals</dt><dd>{referralQualified} of {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}</dd></div>
          <div><dt>Tool capacity limit</dt><dd>{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}</dd></div>
          <div><dt>Maximum referral capacity</dt><dd>{gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}</dd></div>
          <div><dt>Network</dt><dd>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}</dd></div>
        </dl>
      </section>

      {pendingPurchase && (
        <aside>
          <h2>{pendingInFlight ? 'Payment in flight' : pendingQuoteLive ? 'Purchase in flight' : 'Purchase record open'}</h2>
          <p>
            {pendingPurchase.toolName || pendingPurchase.toolId || 'Mining tool'} ·{' '}
            {pendingInFlight
              ? 'A transaction was submitted for this purchase and the backend is verifying it. Nothing further is needed from you.'
              : pendingQuoteLive
                ? 'Open the tool below to resume this purchase with its original quote and payment wallet.'
                : 'This record’s quote window has lapsed, so it can no longer be paid. Requesting a fresh quote keeps the stored record as audit history and never rewrites it.'}
            {' '}Recovered from the backend — no second purchase record is created.
          </p>
          <button
            type="button"
            onClick={() => {
              const def = TOOLS.find(t => t.id === pendingPurchase.toolId);
              if (def) setPurchasing(def);
            }}
          >
            {pendingInFlight ? 'View payment status' : pendingQuoteLive ? 'Resume purchase' : 'Start fresh quote'}
          </button>
        </aside>
      )}

      {campaign && campaign.status !== 'active' && (
        <aside>
          <h2>{campaign.status === 'scheduled' ? 'Tool purchases have not opened yet' : `Purchases are closed — the campaign is ${campaign.status}`}</h2>
          <p>{campaign.status === 'scheduled'
            ? 'The campaign has not started. Tool economics are fixed and shown in full below.'
            : 'Existing tools continue to follow their operating model until the campaign settles.'}</p>
        </aside>
      )}

      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading">Mining tools</h2>
        <p>Fixed price · fixed £ per hour · fixed ownership limit · fixed duty model</p>
        <p>Four tiers · all additive</p>
        {TOOLS.map(t => {
          const owned = counts[t.id] || 0;
          const isMax = owned >= t.maxPerUser;
          const remaining = Math.max(0, t.maxPerUser - owned);
          const continuous = dutyOf(t) === 'continuous';
          return (
            <section key={t.id} aria-labelledby={`tool-${t.id}-heading`}>
              <h3 id={`tool-${t.id}-heading`}>{t.name}</h3>
              <p>Tier {t.tier}</p>
              <dl>
                <div><dt>Price</dt><dd>{gbp(t.purchasePriceGBP)}</dd></div>
                <div><dt>Hourly capacity</dt><dd>{gbpHour(t.hourlyRateGBP)}</dd></div>
                <div><dt>Ownership limit</dt><dd>{t.maxPerUser}</dd></div>
                <div><dt>You own</dt><dd>{owned} of {t.maxPerUser}</dd></div>
                <div><dt>Capacity at limit</dt><dd>{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</dd></div>
                <div><dt>Duty model</dt><dd>{continuous ? 'Continuous' : 'Session · 24h'}</dd></div>
                <div><dt>Your contribution</dt><dd>{owned > 0 ? `+${gbpRate(owned * t.hourlyRateGBP)}` : '—'}</dd></div>
                <div><dt>Available to you</dt><dd>{remaining} of {t.maxPerUser}</dd></div>
              </dl>
              {!t.enabled ? (
                <button type="button" disabled>Unavailable</button>
              ) : isMax ? (
                <button type="button" disabled>Maximum owned</button>
              ) : !purchaseOpen ? (
                <button type="button" disabled>
                  {campaign?.status === 'active' ? 'Purchases closed' : `Campaign ${campaign?.status || 'inactive'}`}
                </button>
              ) : (
                <button type="button" onClick={() => setPurchasing(t)}>Purchase with BNB</button>
              )}
            </section>
          );
        })}
        <p>Prices and hourly rates are fixed in GBP; you pay the fixed GBP price in BNB at the live rate quoted when you request a purchase.</p>
      </section>

      <section aria-labelledby="owned-tools-heading">
        <h2 id="owned-tools-heading">Your operating tools</h2>
        <p>{ownedTools.length === 0
          ? 'No tools operating yet'
          : 'Session state and restart timing are derived by the backend, per tool'}</p>
        {ownedTools.length === 0 ? (
          <p aria-label="No tools operating yet">Once a purchase is verified on BNB Smart Chain, the tool appears here with its live operating state.</p>
        ) : (
          <ul>
            {ownedTools.map(t => {
              const cycle = cycleStateView(t.cycleState || t.status);
              const meta = LOCKED_PSEMINE_TOOLS[t.toolId as keyof typeof LOCKED_PSEMINE_TOOLS] || null;
              const continuous = (t.operatingModel || meta?.operating?.model) === 'continuous';
              const rate = typeof t.hourlyRateGBP === 'number' ? t.hourlyRateGBP : (meta?.hourlyRateGBP ?? 0);
              return (
                <li key={t.id}>
                  <h3>{t.toolName || meta?.name || 'Mining tool'}</h3>
                  <p>Status: {cycle.label}{continuous ? ' · Continuous' : ''}</p>
                  <p>{cycle.description}</p>
                  <p>{gbpHour(rate)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="purchase-process-heading">
        <h2 id="purchase-process-heading">How a purchase works</h2>
        <p>Five ordered steps — nothing activates before verification</p>
        <ol>
          <li><h3>Quote</h3><p>The backend converts the fixed GBP price to an exact BNB amount at the live rate and binds it to your account for a short window.</p></li>
          <li><h3>Payment</h3><p>You send exactly that amount to the campaign receiving wallet on {PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} (chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}).</p></li>
          <li><h3>On-chain verification</h3><p>The backend checks sender, recipient, amount and confirmation depth against the quote. The app never self-confirms.</p></li>
          <li><h3>Activation</h3><p>A verified purchase activates the tool and adds its hourly capacity to your account.</p></li>
          <li><h3>Operation</h3><p>Starter, Builder and Advanced run finite mining sessions — when a session ends, mining stops until you restart it, and the backend needs a short restart period before mining resumes. Elite runs continuously while the campaign is active.</p></li>
        </ol>
      </section>

      <section aria-labelledby="campaign-limits-heading">
        <h2 id="campaign-limits-heading">Campaign limits</h2>
        <p>Fixed for the campaign</p>
        <dl>
          <div><dt>Tool capacity cap</dt><dd>{gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} — across all four ownership limits</dd></div>
          <div><dt>Session tools</dt><dd>Manual restart · session ends, restart period, then mining resumes</dd></div>
          <div><dt>Elite Miner</dt><dd>Continuous · no manual session restart while the campaign runs</dd></div>
          <div><dt>Payment asset</dt><dd>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID} · BNB</dd></div>
          <div><dt>Accounting currency</dt><dd>GBP (£) · accrual is denominated in GBP</dd></div>
          <div><dt>Maximum total capacity</dt><dd>{gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} · tools plus qualified referrals</dd></div>
        </dl>
      </section>

      {purchasing && (
        <PurchaseFlow
          tool={purchasing}
          pending={pendingPurchase}
          onClose={() => { setPurchasing(null); void refresh(); }}
        />
      )}
    </main>
  );
};

/* Purchase flow. Displayed BNB values are derived from the exact server quote;
 * refresh recovery resumes an existing purchase rather than creating a second
 * intent, and the one-send-attempt protection remains in pseWallet.
 */
type FlowStep = 'connect' | 'quote' | 'pay' | 'verifying' | 'result';

/** Human wording for the submission state machine (see pseWallet.ts). */
const SUBMISSION_LABEL: Record<PsePaymentSubmissionState, string> = {
  NOT_SUBMITTED: 'Awaiting your confirmation',
  SUBMISSION_IN_PROGRESS: 'Awaiting wallet confirmation',
  SUBMITTED: 'Transaction submitted',
  UNKNOWN_SUBMISSION_STATE: 'Submission state unknown',
  CONFIRMING: 'Confirming on BNB Smart Chain',
  VERIFIED: 'Payment verified',
};

/** An in-flight purchase recovered from the backend state projection. */
type ResumeState =
  | { kind: 'live'; quote: PSEMineQuote; purchase: PsePendingPurchase }
  | { kind: 'submitted'; purchase: PsePendingPurchase }
  | { kind: 'expired'; purchase: PsePendingPurchase };

const PurchaseFlow: React.FC<{ tool: PSEMineToolDefinition; pending: PsePendingPurchase | null; onClose: () => void }> = ({ tool, pending, onClose }) => {
  const {
    connectedWallet, walletChainId, walletTransport, pseUser,
    requestQuote, activeQuote, clearQuote, bindPurchaseIntent, submitPurchaseTx,
    sendPayment, ensurePaymentChain, refreshWalletChain,
  } = usePSEMine();
  const { refresh } = usePseState();

  // Start on the wallet step when no wallet is connected yet.
  const [step, setStep] = useState<FlowStep>(() => (connectedWallet ? 'quote' : 'connect'));
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string; hash?: string; uncertain?: boolean; recheckable?: boolean } | null>(null);
  // Payer binding + submission state. The purchase is bound to a wallet BEFORE
  // anything is signed, and the submission state decides whether a retry is
  // even permitted (never after UNKNOWN_SUBMISSION_STATE).
  const [boundPayer, setBoundPayer] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [submissionState, setSubmissionState] = useState<PsePaymentSubmissionState>('NOT_SUBMITTED');
  // Refresh recovery: the existing in-flight purchase for THIS tool, if any.
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [rechecking, setRechecking] = useState(false);

  /** Forget the local binding (expired quote, wallet disconnect, restart). */
  const resetBinding = useCallback(() => { setBoundPayer(null); setPurchaseId(null); }, []);

  // ── Refresh recovery (runs before the quote effect) ────────────────────────
  // A live awaiting_payment intent is resumed with its ORIGINAL quote and payer;
  // a submitted intent opens the verification-recovery panel; an expired one
  // falls through to a fresh quote (the backend supersedes the dead intent and
  // keeps the old record as audit evidence).
  useEffect(() => {
    if (resume || !pending || pending.toolId !== tool.id) return;
    if (pending.status && pending.status !== 'awaiting_payment') {
      setResume({ kind: 'submitted', purchase: pending });
      setSubmissionState('CONFIRMING');
      setStep('verifying');
      return;
    }
    const expiresAt = pending.expiresAt;
    const live = expiresAt ? Date.parse(expiresAt) > nowMs() : false;
    if (live && expiresAt && pending.quoteId && pending.receiverWallet) {
      setResume({
        kind: 'live',
        purchase: pending,
        quote: {
          quoteId: pending.quoteId,
          userId: pseUser?.uid || '',
          toolId: tool.id,
          toolVersion: tool.version,
          gbpPrice: tool.purchasePriceGBP,
          bnbAmount: Number(pending.quotedBNBAmount ?? 0),
          bnbAmountWei: pending.quotedBNBWei || undefined,
          exchangeRateBNBGBP: 0,
          receiverWallet: pending.receiverWallet,
          network: 'BNB Smart Chain',
          chainId: pending.chainId || 56,
          createdAt: '',
          expiresAt,
        },
      });
      setStep('pay');
      return;
    }
    if (!live) setResume({ kind: 'expired', purchase: pending });
  }, [resume, pending, tool.id, tool.version, tool.purchasePriceGBP, pseUser?.uid]);

  // Fetch a quote on open — unless a live/submitted intent is being resumed
  // (re-quoting there would re-price and re-bind an existing purchase).
  useEffect(() => {
    if (resume && resume.kind !== 'expired') return;
    let cancelled = false;
    setQuoteLoading(true);
    resetBinding();
    setSubmissionState('NOT_SUBMITTED');
    requestQuote(tool.id)
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; clearQuote(); };
  }, [tool.id, requestQuote, clearQuote, resetBinding, resume]);

  // The amounts the user sees. A live resume ALWAYS uses its own quote, never a
  // freshly fetched one, so the binding can never drift to another quote.
  const quote = resume?.kind === 'live' ? resume.quote : activeQuote;

  // Quote countdown (server expiry, locally interpolated)
  useEffect(() => {
    if (!quote) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - nowMs()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [quote]);

  useEffect(() => {
    if (quote && secondsLeft === 0 && step === 'pay') {
      if (resume?.kind === 'live') {
        // The resumed quote lapsed: drop the resume and fall back to a fresh
        // quote. The backend supersedes the dead intent; nothing is rewritten.
        setResume(null);
        setBoundPayer(null);
        setPurchaseId(null);
        setSubmissionState('NOT_SUBMITTED');
        setStep('quote');
        return;
      }
      clearQuote();
      resetBinding();
      setQuoteLoading(true);
      requestQuote(tool.id).finally(() => setQuoteLoading(false));
      toast('Quote expired — refreshed with the live BNB rate.', { icon: '⏳' });
    }
  }, [secondsLeft, quote, step, clearQuote, requestQuote, tool.id, resetBinding, resume]);

  const counts = pseUser?.toolOwnershipCounts;
  const owned = counts ? (counts as Record<string, number>)[tool.id] || 0 : 0;

  // Return-from-wallet continuity: if the connection completes while the user
  // sits on the connect step (deep-link return from a mobile wallet app, or
  // extension approval), the flow advances into the quote automatically.
  useEffect(() => {
    if (step === 'connect' && connectedWallet && walletTransport !== null) setStep('quote');
  }, [step, connectedWallet, walletTransport]);

  // Safety: if the wallet disconnects mid-flow, no payment UI may remain active —
  // drop back to connect and drop the local binding. The 'verifying' step
  // intentionally stays: the transaction may already be broadcast.
  useEffect(() => {
    if (!connectedWallet && (step === 'pay' || step === 'quote')) {
      setStep('connect');
      resetBinding();
    }
  }, [connectedWallet, step, resetBinding]);

  // ── The exact amount, everywhere ───────────────────────────────────────────
  const exactBnb = useMemo(
    () => bnbExactFromWei(quote?.bnbAmountWei, typeof quote?.bnbAmount === 'number' ? quote.bnbAmount : null),
    [quote],
  );

  // ── Pre-payment state (the clauses the pay button obeys) ───────────────────
  const requiredChainId = quote?.chainId || 56;
  const networkName = quote?.network || 'BNB Smart Chain';
  // An address remembered for this ACCOUNT is not a usable payer: signing needs
  // a live EIP-1193 provider in THIS browser.
  const walletLive = Boolean(connectedWallet) && walletTransport !== null;
  const chainUnknown = walletChainId === null;
  const wrongChain = !chainUnknown && walletChainId !== requiredChainId;
  const onRequiredChain = walletChainId === requiredChainId;
  const payerAligned = !boundPayer || !connectedWallet || connectedWallet.toLowerCase() === boundPayer.toLowerCase();
  const walletChanged = Boolean(boundPayer && connectedWallet && !payerAligned);
  const quoteValid = Boolean(quote) && secondsLeft > 0;
  const ownershipOk = owned < tool.maxPerUser;
  const showingRecovery = resume?.kind === 'submitted';

  const blockedReason = (() => {
    if (!connectedWallet) return 'Connect a wallet to continue.';
    if (!walletLive) return 'Reconnect your wallet in this browser — the payment must be signed by the wallet that pays, and this session has no live wallet connection.';
    if (walletChanged) return `This purchase is locked to ${shortAddr(boundPayer)} — reconnect that wallet to pay.`;
    // Fail closed on an UNREADABLE chain: the backend verifies the transfer on
    // chain 56, so paying from an unknown network is a dead end, not a warning.
    if (chainUnknown) return `Your wallet’s network could not be read. Reconnect the wallet, or switch it to ${networkName} (chain ${requiredChainId}), before paying.`;
    if (wrongChain) return `Switch your wallet to ${networkName} (chain ${requiredChainId}) — chain ${walletChainId} cannot be verified.`;
    if (!quoteValid) return 'The quote expired. Refresh it to continue — the backend will not accept a stale quote.';
    if (!ownershipOk) return `Maximum ownership reached for ${tool.name}.`;
    return null;
  })();
  const payBlocked = blockedReason !== null;

  const switchChain = async () => {
    const ok = await ensurePaymentChain(requiredChainId);
    if (!ok) {
      toast.error(`Switch your wallet to ${networkName} in the wallet app — the request was refused or unsupported.`);
      return;
    }
    const chain = await refreshWalletChain();
    if (chain === requiredChainId) {
      toast.success(`Wallet switched to ${networkName}.`);
    } else {
      toast(`Confirm ${networkName} in your wallet to continue.`, { icon: '⏳' });
    }
  };

  const refreshQuoteNow = () => {
    setResume(null);
    resetBinding();
    setSubmissionState('NOT_SUBMITTED');
    clearQuote();
    setQuoteLoading(true);
    setStep('quote');
    requestQuote(tool.id).finally(() => setQuoteLoading(false));
  };

  /**
   * Proceeds to the wallet-signed payment.
   * ORDER IS THE POINT: quote → BIND PAYER → chain assertion → sign → submit hash.
   */
  const payNow = async () => {
    if (!quote) return;
    if (!connectedWallet || !EVM.test(connectedWallet)) {
      setStep('connect');
      toast.error('Connect a valid BNB Smart Chain wallet first.');
      return;
    }
    if (!canRetryPayment(submissionState)) {
      toast.error('This payment is not in a submittable state — check your wallet activity before trying again.');
      return;
    }
    if (payBlocked) {
      toast.error(blockedReason || 'This purchase is not ready to pay.');
      return;
    }
    setStep('verifying');
    try {
      // 1. BIND THE PAYER — server-side, against this account and this quote,
      //    BEFORE any signature exists.
      let payer = boundPayer;
      let intentId = purchaseId;
      if (!intentId || !payer) {
        const bound = await bindPurchaseIntent(quote);
        if (!bound.success || !bound.purchaseId || !bound.payerWallet) {
          setSubmissionState('NOT_SUBMITTED');
          setResult({ ok: false, message: bound.error || 'Could not bind this purchase to your wallet.' });
          setStep('result');
          return;
        }
        intentId = bound.purchaseId;
        payer = bound.payerWallet;
        setPurchaseId(intentId);
        setBoundPayer(payer);
      }

      // 2. The wallet about to sign must still be the bound payer.
      const payerCheck = resolvePaymentPayer(payer, connectedWallet);
      if (!payerCheck.ok) {
        setSubmissionState('NOT_SUBMITTED');
        setResult({
          ok: false,
          message: payerCheck.code === 'WALLET_MISMATCH'
            ? `WALLET_MISMATCH — this purchase is bound to ${shortAddr(payer)}. Reconnect that wallet to pay, or close this and start a new purchase with ${shortAddr(connectedWallet)}. Nothing was sent and the binding was not changed.`
            : 'This purchase has no bound payer wallet. Start the purchase again.',
        });
        setStep('result');
        return;
      }

      // 3. NETWORK ASSERTION — fail-closed, through the ACTIVE provider.
      const chainOk = await ensurePaymentChain(quote.chainId || 56);
      if (!chainOk) {
        setStep('pay');
        toast.error(`Switch your wallet to ${networkName} before paying.`);
        return;
      }

      // 4. to + value come VERBATIM from the server quote; from is the BOUND payer.
      const wei = quote.bnbAmountWei;
      if (!wei || !/^[0-9]+$/.test(String(wei))) {
        throw new Error('The server quote is missing its exact BNB amount. Request a new quote.');
      }

      // 5. EXACTLY ONE broadcast attempt.
      setSubmissionState('SUBMISSION_IN_PROGRESS');
      let txHash: string;
      try {
        txHash = await sendPayment({
          from: payer,
          to: quote.receiverWallet,
          value: String(wei),
        });
      } catch (sendErr) {
        if (isSubmissionUncertain(sendErr)) {
          setSubmissionState('UNKNOWN_SUBMISSION_STATE');
          setResult({
            ok: false,
            uncertain: true,
            message: 'PAYMENT_SUBMISSION_UNCERTAIN — your wallet did not report whether this payment was broadcast, so nothing was sent again. Check your wallet activity (or BscScan) for a pending transfer before doing anything else. If one exists, keep the wallet that sent it; support can reconcile it from the on-chain record.',
          });
          setStep('result');
          return;
        }
        throw sendErr;
      }
      if (!txHash) throw new Error('Transaction was not submitted.');
      setSubmissionState('SUBMITTED');

      // 6. Backend verifies on-chain; activation is server-authoritative.
      setSubmissionState('CONFIRMING');
      const res = await submitPurchaseTx(intentId, txHash, payer);
      if (res.success) {
        setSubmissionState('VERIFIED');
        setResult({ ok: true, message: `${tool.name} activated. Its hourly capacity is now live on your dashboard.`, hash: txHash });
      } else {
        const stillConfirming = res.code === 'INSUFFICIENT_CONFIRMATIONS';
        setSubmissionState(stillConfirming ? 'CONFIRMING' : 'SUBMITTED');
        setResult({
          ok: false,
          recheckable: stillConfirming,
          message: res.error || 'Verification failed. If you already sent the payment, keep the transaction hash — support can reconcile it from the on-chain record.',
          hash: txHash,
        });
      }
      setStep('result');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment could not be submitted.';
      if (/user rejected|user denied|4001/i.test(msg)) {
        setSubmissionState('NOT_SUBMITTED');
        setStep('pay');
        toast('Payment cancelled in your wallet.');
      } else {
        setResult({ ok: false, message: msg });
        setStep('result');
      }
    }
  };

  /** Re-run backend verification for a hash that is still gathering confirmations. */
  const recheckVerification = async (hash: string) => {
    if (!purchaseId) return;
    setRechecking(true);
    try {
      const res = await submitPurchaseTx(purchaseId, hash, boundPayer || connectedWallet || '');
      if (res.success) {
        setSubmissionState('VERIFIED');
        setResult({ ok: true, message: `${tool.name} activated. Its hourly capacity is now live on your dashboard.`, hash });
        setStep('result');
      } else if (res.code === 'INSUFFICIENT_CONFIRMATIONS') {
        toast('Still confirming on-chain — try again in a moment.', { icon: '⏳' });
      } else {
        toast.error(res.error || 'Verification has not completed for this transaction yet.');
      }
    } finally {
      setRechecking(false);
      void refresh();
    }
  };

  /** Re-run backend verification for a purchase recovered after a refresh. */
  const recheckRecovered = async () => {
    if (resume?.kind !== 'submitted') return;
    const p = resume.purchase;
    if (!p.transactionHash) return;
    setRechecking(true);
    try {
      const res = await submitPurchaseTx(p.purchaseId, p.transactionHash, p.paymentWallet || '');
      if (res.success) {
        setResume(null);
        setSubmissionState('VERIFIED');
        setResult({ ok: true, message: `${tool.name} activated. Its hourly capacity is now live on your dashboard.`, hash: p.transactionHash });
        setStep('result');
      } else if (res.code === 'INSUFFICIENT_CONFIRMATIONS') {
        toast('Still confirming on-chain — the backend needs more block confirmations.', { icon: '⏳' });
      } else {
        toast.error(res.error || 'Verification has not completed for this transaction yet.');
      }
    } finally {
      setRechecking(false);
      void refresh();
    }
  };

  /** Restart from a fresh quote — the only route out of an uncertain or failed
   *  submission, and only ever at the user's explicit request. */
  const restartPurchase = () => {
    setResult(null);
    resetBinding();
    setSubmissionState('NOT_SUBMITTED');
    clearQuote();
    setQuoteLoading(true);
    setStep('quote');
    requestQuote(tool.id).finally(() => setQuoteLoading(false));
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const continuous = dutyOf(tool) === 'continuous';

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-flow-title"
      onClick={event => {
        if (event.target === event.currentTarget && step !== 'verifying') onClose();
      }}
    >
      <header>
        <p>Purchase</p>
        <h2 id="purchase-flow-title">{tool.name} · {gbp(tool.purchasePriceGBP)}</h2>
        <p>{continuous ? 'Continuous duty' : 'Session duty · 24h'} · adds {gbpHour(tool.hourlyRateGBP)} of capacity</p>
        <button
          type="button"
          onClick={onClose}
          disabled={step === 'verifying' && !showingRecovery}
          aria-label="Close purchase"
        >
          Close
        </button>
      </header>

      {showingRecovery && resume?.kind === 'submitted' && (
        <section aria-labelledby="recovered-purchase-heading">
          <h3 id="recovered-purchase-heading">{resume.purchase.status === 'confirming' ? 'Confirming payment' : 'Transaction submitted'}</h3>
          <p>
            {tool.name} — a transaction was submitted for this purchase and the backend is verifying it on
            BNB Smart Chain.
          </p>
          <p>This state was recovered from the backend after your refresh, so no new purchase was created.</p>
          {resume.purchase.transactionHash && (
            <p>
              <a
                href={`https://bscscan.com/tx/${resume.purchase.transactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View {shortHash(resume.purchase.transactionHash)} on BscScan
              </a>
            </p>
          )}
          <p>The backend needs a few block confirmations before the tool activates. Do not send the payment again — the same transaction hash is reused for every verification check.</p>
          <button
            type="button"
            onClick={() => void recheckRecovered()}
            disabled={rechecking || !resume.purchase.transactionHash}
          >
            {rechecking ? 'Checking…' : 'Check verification again'}
          </button>
          <button type="button" onClick={onClose}>Close</button>
        </section>
      )}

      {!showingRecovery && step === 'connect' && <WalletConnectStep />}

      {!showingRecovery && step === 'quote' && (
        quoteLoading || !quote ? (
          <p role="status" aria-live="polite">Requesting a live BNB quote from the server…</p>
        ) : (
          <>
            {resume?.kind === 'expired' && (
              <aside>
                <h3>Your previous quote expired</h3>
                <p>BNB pricing has changed, so the earlier purchase could not be completed. A fresh quote is prepared below; the earlier record is kept for audit and was not rewritten.</p>
              </aside>
            )}

            <dl>
              <div><dt>Tool</dt><dd>{tool.name}</dd></div>
              <div><dt>Fixed price</dt><dd>{gbp(quote.gbpPrice)}</dd></div>
              <div><dt>Live rate</dt><dd>{quote.exchangeRateBNBGBP > 0 ? `1 BNB = £${Number(quote.exchangeRateBNBGBP).toFixed(2)}` : '—'}</dd></div>
              <div><dt>You pay, exactly</dt><dd>{exactBnb} BNB</dd></div>
              <div><dt>Network</dt><dd>{networkName} · {requiredChainId}</dd></div>
              <div><dt>Receiving wallet</dt><dd><CopyField value={quote.receiverWallet} display={shortAddr(quote.receiverWallet)} label="receiving wallet" /></dd></div>
              <div><dt>Quote window</dt><dd>{mm}:{ss}</dd></div>
              <div><dt>Quote id</dt><dd>{shortHash(quote.quoteId, 8)}</dd></div>
            </dl>

            <p>
              The quoted BNB amount is fixed for this window so the GBP price you pay never drifts.
              {secondsLeft === 0 && ' This quote has expired — refresh it before paying.'}
            </p>
            <p>
              Adds {gbpHour(tool.hourlyRateGBP)} of capacity. You will own {owned} of {tool.maxPerUser} after this purchase.{' '}
              {continuous
                ? 'Elite mines continuously — no manual session restarts.'
                : 'This tier mines in sessions: when a session ends, mining stops until you restart the tool.'}
            </p>

            {owned >= tool.maxPerUser ? (
              <p role="status">Maximum ownership for this tool reached.</p>
            ) : !walletLive ? (
              <button type="button" onClick={() => setStep('connect')}>
                {connectedWallet ? 'Reconnect your wallet to continue' : 'Connect a wallet to continue'}
              </button>
            ) : !quoteValid ? (
              <button type="button" onClick={refreshQuoteNow}>Refresh quote</button>
            ) : (
              <button type="button" onClick={() => setStep('pay')}>Continue to payment</button>
            )}
            {connectedWallet && <p>Paying from {shortAddr(connectedWallet)}</p>}
          </>
        )
      )}

      {!showingRecovery && step === 'pay' && quote && (
        <>
          {resume?.kind === 'live' && (
            <aside>
              <h3>Resuming your pending purchase</h3>
              <p>The original quote and payment wallet are unchanged, and no second purchase was created.</p>
            </aside>
          )}

          <dl>
            <div><dt>Tool</dt><dd>{tool.name}</dd></div>
            <div><dt>Price</dt><dd>{gbp(tool.purchasePriceGBP)}</dd></div>
            <div><dt>Network</dt><dd>{networkName} · chain {requiredChainId}</dd></div>
            <div><dt>Payment wallet</dt><dd>{boundPayer ? shortAddr(boundPayer) : (connectedWallet ? shortAddr(connectedWallet) : '—')}</dd></div>
            <div><dt>Receiving wallet</dt><dd><CopyField value={quote.receiverWallet} display={shortAddr(quote.receiverWallet)} label="receiving wallet" /></dd></div>
            <div><dt>Quote expires</dt><dd>{mm}:{ss}</dd></div>
          </dl>

          <p>You pay exactly {exactBnb} BNB</p>
          <CopyField value={exactBnb} display="Copy amount" label="BNB amount" />
          <p>Send the exact amount — underpayments are detected and will not activate a tool.</p>

          {boundPayer && (
            <section aria-labelledby="bound-payer-heading">
              <h3 id="bound-payer-heading">Bound payer</h3>
              <CopyField value={boundPayer} display={boundPayer} label="payer wallet" fullWidth />
              <p>Only this wallet can complete this purchase — the backend compares the on-chain sender against it.</p>
            </section>
          )}

          <ul aria-label="Payment requirements">
            {[
              {
                ok: walletLive && Boolean(connectedWallet && EVM.test(connectedWallet)),
                warn: Boolean(connectedWallet) && !walletLive,
                label: !connectedWallet
                  ? 'Connect a wallet'
                  : walletLive
                    ? `Wallet connected — ${shortAddr(connectedWallet)}`
                    : `Not connected in this browser — ${shortAddr(connectedWallet)} is only the remembered payer; reconnect it to sign`,
              },
              {
                ok: payerAligned,
                warn: walletChanged,
                label: walletChanged
                  ? `Wallet changed — this purchase is locked to ${shortAddr(boundPayer)}`
                  : boundPayer
                    ? `Payer binding verified — only ${shortAddr(boundPayer)} can complete this purchase`
                    : 'Payer is bound to this wallet before anything is signed',
              },
              {
                ok: onRequiredChain && walletLive,
                warn: wrongChain || (walletLive && chainUnknown),
                label: !walletLive
                  ? `Network verified once the wallet is reconnected — must be ${networkName} (chain ${requiredChainId})`
                  : onRequiredChain
                    ? `${networkName} (chain ${requiredChainId})`
                    : chainUnknown
                      ? `Network unreadable — reconnect or switch to ${networkName} (chain ${requiredChainId})`
                      : `Wrong network — wallet is on chain ${walletChainId}`,
              },
              { ok: quoteValid, warn: !quoteValid, label: quoteValid ? `Quote valid — expires in ${mm}:${ss}` : 'Quote expired — refresh before paying' },
              { ok: ownershipOk, warn: !ownershipOk, label: ownershipOk ? `Ownership available — ${owned} / ${tool.maxPerUser} owned` : `Ownership limit reached (${tool.maxPerUser})` },
            ].map(c => (
              <li key={c.label}>
                {c.ok ? 'Ready: ' : c.warn ? 'Attention: ' : 'Pending: '}{c.label}
              </li>
            ))}
          </ul>

          {walletChanged && (
            <aside>
              <h3>Wallet changed</h3>
              <p>This purchase is locked to {shortAddr(boundPayer)}. Reconnect that wallet to pay — the connected wallet will not replace the payer. To pay with a different wallet, wait for the quote window to lapse and start a new purchase.</p>
            </aside>
          )}

          {connectedWallet && wrongChain && (
            <aside>
              <h3>Wrong network</h3>
              <p>This payment must be sent on {networkName} (chain {requiredChainId}) — your wallet is on chain {walletChainId}, and a transaction signed elsewhere can never be verified.</p>
              <button type="button" onClick={() => void switchChain()}>Switch to BNB Smart Chain</button>
            </aside>
          )}

          <button type="button" onClick={() => void payNow()} disabled={payBlocked}>
            Open wallet &amp; pay {exactBnb} BNB
          </button>
          {payBlocked && <p role="alert">{blockedReason}</p>}
          {!walletLive && (
            <button type="button" onClick={() => setStep('connect')}>
              {connectedWallet ? 'Reconnect this wallet' : 'Connect a wallet'}
            </button>
          )}
          <button type="button" onClick={() => (quoteValid ? setStep('quote') : refreshQuoteNow())}>
            {quoteValid ? 'Back to quote' : 'Refresh quote'}
          </button>

          <p>After you send, the backend verifies your transaction on-chain — sender, recipient, exact amount and confirmation depth — before the tool activates.</p>
        </>
      )}

      {!showingRecovery && step === 'verifying' && (
        <section aria-labelledby="verification-heading" aria-live="polite">
          <h3 id="verification-heading">Verifying on BNB Smart Chain</h3>
          <p>Confirming sender, recipient, amount and network confirmations. Don&apos;t close this window.</p>
          <p>{submissionState} · {SUBMISSION_LABEL[submissionState]}</p>
        </section>
      )}

      {!showingRecovery && step === 'result' && result && (
        <section aria-labelledby="purchase-result-heading">
          <h3 id="purchase-result-heading">
            {result.ok
              ? 'Tool activated'
              : result.recheckable
                ? 'Confirming payment'
                : result.uncertain
                  ? 'Submission uncertain'
                  : 'Verification incomplete'}
          </h3>
          <p>{result.message}</p>
          {result.hash && (
            <p>
              <a href={`https://bscscan.com/tx/${result.hash}`} target="_blank" rel="noreferrer">
                View {shortHash(result.hash)} on BscScan
              </a>
            </p>
          )}

          {result.uncertain && (
            <aside>
              <h4>Nothing was sent twice</h4>
              <p>Check your wallet's activity (or the address on BscScan) for a pending transfer. If one exists, do not send again — keep its hash and the wallet that sent it; support reconciles it from the on-chain record. If none exists, start a new purchase below.</p>
            </aside>
          )}
          {!result.ok && !result.recheckable && !result.uncertain && (
            <aside>
              <h4>No tool was activated</h4>
              <p>Nothing was lost: unverified payments are recorded as recovery evidence for manual review — that record exists so an administrator can reconcile it, and it is not an automatic activation.</p>
            </aside>
          )}
          {result.ok && (
            <p>
              {continuous
                ? 'This tool mines continuously while the campaign is active — there is no manual session restart.'
                : 'This tool now runs in mining sessions. When a session completes, mining stops until you restart it; each restart needs a short backend period before mining resumes.'}
            </p>
          )}

          <button type="button" onClick={onClose}>{result.ok ? 'Go to console' : 'Close'}</button>
          {!result.ok && result.recheckable && result.hash && (
            <button
              type="button"
              onClick={() => void recheckVerification(result.hash as string)}
              disabled={rechecking}
            >
              {rechecking ? 'Checking…' : 'Check verification again'}
            </button>
          )}
          {!result.ok && !result.recheckable && (
            <button type="button" onClick={restartPurchase}>
              {result.uncertain ? 'Start a new purchase' : 'Try again with a new quote'}
            </button>
          )}
        </section>
      )}
    </section>
  );
};


/* ── Wallet connection step ────────────────────────────────────────────── */
const WalletConnectStep: React.FC = () => {
  const {
    injectedWallets, walletConnectAvailable, connectWallet,
    connectWalletConnectTransport, isConnectingWallet,
  } = usePSEMine();
  return (
    <section aria-labelledby="connect-wallet-heading">
      <h3 id="connect-wallet-heading">Connect a wallet</h3>
      <p>
        A wallet is required to sign the payment. PSEmine never requests automatic transfers — every payment must
        be approved in your wallet.
      </p>

      {injectedWallets.map(w => (
        <button
          type="button"
          key={w.id}
          onClick={() => void connectWallet(w.id)}
          disabled={isConnectingWallet}
        >
          {w.name}
        </button>
      ))}

      {walletConnectAvailable && (
        <button
          type="button"
          onClick={() => void connectWalletConnectTransport()}
          disabled={isConnectingWallet}
        >
          WalletConnect — mobile &amp; extension wallets
        </button>
      )}

      {isConnectingWallet && <p role="status" aria-live="polite">Waiting for the wallet…</p>}

      {!walletConnectAvailable && injectedWallets.length === 0 && (
        <aside>
          <h4>No wallet detected</h4>
          <p>Open PSEmine in your wallet's browser (Trust, MetaMask), install an extension, or configure WalletConnect for this deployment.</p>
        </aside>
      )}
    </section>
  );
};

export default PSEMineTools;
