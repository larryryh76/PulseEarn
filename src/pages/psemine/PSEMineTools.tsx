import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  bnbExactFromWei, cycleStateView, gbp, gbpHour, nowMs, shortAddr, shortHash,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseEmptyNote, PseErrorNotice, PseLoading,
  PseNotice, PsePage, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

/**
 * The mining tool marketplace — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger marketplace (spec matrix, module plates, receipt sheet) was
 * purged in `refactor(psemine): purge legacy design implementation`. What is
 * preserved exactly is the purchase behaviour: quote → bind payer → chain
 * assertion → sign → submit → on-chain verification → activation, with refresh
 * recovery of an in-flight intent. The UI never asserts success before the
 * backend verifies, and every displayed amount comes from the server quote's
 * exact wei value (bnbExactFromWei).
 */
const EVM = /^0x[0-9a-fA-F]{40}$/;

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const dutyOf = (t: PSEMineToolDefinition) => (t.operating?.model === 'continuous' ? 'continuous' as const : 'session' as const);

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

const STEP_ORDER: Array<{ id: FlowStep; label: string }> = [
  { id: 'connect', label: 'Wallet' },
  { id: 'quote', label: 'Quote' },
  { id: 'pay', label: 'Pay in BNB' },
  { id: 'verifying', label: 'Verify' },
  { id: 'result', label: 'Activate' },
];

export const PSEMineTools: React.FC = () => {
  const { pseUser, campaign } = usePSEMine();
  const { state, refresh, loading, error, refreshing } = usePseState();
  const [purchasing, setPurchasing] = useState<PSEMineToolDefinition | null>(null);

  const counts = pseUser?.toolOwnershipCounts || { starter: 0, builder: 0, advanced: 0, elite: 0 };
  const purchaseOpen = campaign?.purchaseEnabled !== false && campaign?.status === 'active';
  // Every ownership the backend reports is listed: filtering to "operating"
  // statuses hid settling/ended tools and under-reported equipment (merged from
  // remote, which found the same defect).
  const ownedTools = useMemo(() => state?.tools ?? [], [state?.tools]);

  const toolCapacity = state?.user?.toolCapacityGBPPerHour ?? pseUser?.toolCapacityGBPPerHour ?? 0;
  const totalCapacity = state?.user?.totalCapacityGBPPerHour ?? pseUser?.totalCapacityGBPPerHour ?? 0;
  const referralCapacity = state?.user?.referralCapacityGBPPerHour ?? pseUser?.referralCapacityGBPPerHour ?? 0;
  const referralQualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const headroom = Math.max(0, PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR - toolCapacity);
  const totalOwned = TOOLS.reduce((a, t) => a + (counts[t.id] || 0), 0);
  const tierSlotsLeft = TOOLS.reduce((acc, t) => acc + Math.max(0, t.maxPerUser - (counts[t.id] || 0)), 0);

  // ══ Refresh recovery: which pending purchase deserves the top notice ══════
  //   1. an IN-FLIGHT submission (transaction_submitted / confirming);
  //   2. otherwise the newest quote window (a live one is resumable as-is).
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
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseLoading label="Loading the marketplace" />
      </div>
    );
  }
  if (error && !state) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  if (purchasing) {
    const pending = pendingPurchase && pendingPurchase.toolId === purchasing.id ? pendingPurchase : null;
    return <PurchaseFlow tool={purchasing} pending={pending} onClose={() => { setPurchasing(null); void refresh(); }} />;
  }

  return (
    <PsePage
      title="Mining tools"
      objective="Tool capacity adds to your hourly mining capacity. Each tool has a fixed GBP price and a fixed hourly rate; purchases are paid in BNB."
      actions={<PseButton onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      <PseSection title="Your position">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[
            ['Tool capacity', gbpHour(toolCapacity)],
            ['Referral capacity', `${gbpHour(referralCapacity)} · ${referralQualified} qualified`],
            ['Total capacity', gbpHour(totalCapacity)],
            ['Tool capacity headroom', gbpHour(headroom)],
            ['Tools owned', `${totalOwned}`],
            ['Tier slots remaining', `${tierSlotsLeft}`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-sm text-text-secondary">{k}</dt>
              <dd className="text-sm text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
      </PseSection>

      {pendingPurchase && (
        <PseNotice tone="attention">
          {pendingInFlight
            ? `A payment for ${pendingPurchase.toolName || pendingPurchase.toolId} is being verified by the backend.`
            : pendingQuoteLive
              ? `You have a live quote for ${pendingPurchase.toolName || pendingPurchase.toolId} awaiting payment.`
              : `Your previous quote for ${pendingPurchase.toolName || pendingPurchase.toolId} expired — a fresh quote is required.`}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              const def = TOOLS.find(t => t.id === pendingPurchase.toolId);
              if (def) setPurchasing(def);
            }}
          >
            Continue this purchase
          </button>
        </PseNotice>
      )}

      {!purchaseOpen && (
        <PseNotice tone="attention">
          Tool purchases are closed: the campaign status is {campaign?.status || 'scheduled'}. Nothing can be bought
          until the campaign is active again.
        </PseNotice>
      )}

      <PseSection title="Catalogue" meta={`Prices and rates are fixed in GBP · paid in BNB on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}`}>
        <PseTable head={['Tool', 'Price', 'Capacity', 'Owned / limit', 'At limit', 'Operation', '']}>
          {TOOLS.map(tool => {
            const owned = counts[tool.id] || 0;
            const atLimit = owned >= tool.maxPerUser;
            const continuous = dutyOf(tool) === 'continuous';
            return (
              <PseRow key={tool.id}>
                <PseCell>{tool.name}</PseCell>
                <PseCell>{gbp(tool.purchasePriceGBP)}</PseCell>
                <PseCell>{gbpHour(tool.hourlyRateGBP)}</PseCell>
                <PseCell>{owned} / {tool.maxPerUser}</PseCell>
                <PseCell>{gbpHour(tool.hourlyRateGBP * tool.maxPerUser)}</PseCell>
                <PseCell>{continuous ? 'Continuous' : 'Session — manual restart'}</PseCell>
                <PseCell>
                  <PseButton onClick={() => setPurchasing(tool)} disabled={!purchaseOpen || atLimit}>
                    {atLimit ? 'Limit reached' : purchaseOpen ? 'Buy' : 'Closed'}
                  </PseButton>
                </PseCell>
              </PseRow>
            );
          })}
        </PseTable>
        <p className="text-xs text-text-tertiary">
          A session tool stops mining when its session ends until it is restarted; restart timing is derived by the
          backend. Elite runs continuously while the campaign is active.
        </p>
      </PseSection>

      <PseSection title="Your equipment" meta={`${ownedTools.length} ownership record${ownedTools.length === 1 ? '' : 's'}`}>
        {ownedTools.length === 0 ? (
          <PseEmptyNote>No tools are owned on this account yet.</PseEmptyNote>
        ) : (
          <PseTable head={['Tool', 'State', 'Rate', 'Directive']}>
            {ownedTools.map(t => {
              const cycle = cycleStateView(t.cycleState || t.status);
              return (
                <PseRow key={t.id}>
                  <PseCell>{t.toolName || t.toolId || 'Mining tool'}</PseCell>
                  <PseCell>{cycle.label}</PseCell>
                  <PseCell>{gbpHour(t.hourlyRateGBP ?? 0)}</PseCell>
                  <PseCell>{cycle.description}</PseCell>
                </PseRow>
              );
            })}
          </PseTable>
        )}
        <p className="text-sm">
          <a href="/mine/dashboard" className="underline">Restart tools and see the mining state on the console</a>
        </p>
      </PseSection>

      <PseSection title="Purchase mechanics">
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
          <li>The GBP price is fixed; you pay it in BNB at the rate quoted when you request the purchase.</li>
          <li>The quote fixes the exact BNB amount for its window — underpayments are detected and activate nothing.</li>
          <li>Nothing is signed until you approve it in your own wallet; PSEmine never sends automatically.</li>
          <li>The purchase becomes bound to the paying wallet before any signature exists, and only that wallet can complete it.</li>
          <li>The backend verifies sender, recipient, exact amount and confirmation depth on-chain before activation.</li>
        </ul>
      </PseSection>
    </PsePage>
  );
};

/* ── Purchase flow (logic preserved; presentation minimal) ──────────────
 * ORDER IS THE POINT: quote → bind payer → chain assertion → sign → submit
 * hash. Refresh recovery resumes an existing intent with its ORIGINAL quote
 * and payer instead of creating a second one.
 * ═══════════════════════════════════════════════════════════════════════ */
const PurchaseFlow: React.FC<{ tool: PSEMineToolDefinition; pending: PsePendingPurchase | null; onClose: () => void }> = ({ tool, pending, onClose }) => {
  const {
    connectedWallet, walletChainId, walletTransport, pseUser,
    requestQuote, activeQuote, clearQuote, bindPurchaseIntent, submitPurchaseTx,
    sendPayment, ensurePaymentChain, refreshWalletChain,
  } = usePSEMine();
  const { refresh } = usePseState();

  // Start on the wallet step when no wallet is connected yet; the flow opens the
  // connection step immediately instead of a dead quote screen.
  const [step, setStep] = useState<FlowStep>(() => (connectedWallet ? 'quote' : 'connect'));
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string; hash?: string; uncertain?: boolean; recheckable?: boolean } | null>(null);
  // Payer binding + submission state. The purchase is bound to a wallet BEFORE
  // anything is signed, and the submission state decides whether a retry is even
  // permitted (never after UNKNOWN_SUBMISSION_STATE).
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
    if (chainUnknown) return `Your wallet's network could not be read. Reconnect the wallet, or switch it to ${networkName} (chain ${requiredChainId}), before paying.`;
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
  const stepIndex = STEP_ORDER.findIndex(s => s.id === step);
  const continuous = dutyOf(tool) === 'continuous';

  return (
    <PsePage
      title={`Purchase ${tool.name}`}
      objective={`${continuous ? 'Continuous duty' : 'Session duty'} · ${gbp(tool.purchasePriceGBP)} · adds ${gbpHour(tool.hourlyRateGBP)} of capacity`}
      actions={<PseButton onClick={onClose} disabled={step === 'verifying' && !showingRecovery}>Close</PseButton>}
    >
      <p className="text-sm text-text-secondary">
        Step {Math.max(1, stepIndex + 1)} of {STEP_ORDER.length} — {STEP_ORDER[Math.max(0, stepIndex)]?.label}
      </p>

      {/* ── Recovered purchase: a transaction was already submitted ── */}
      {showingRecovery && resume?.kind === 'submitted' && (
        <PseSection title={resume.purchase.status === 'confirming' ? 'Confirming payment' : 'Transaction submitted'}>
          <p className="text-sm text-text-secondary">
            {tool.name} — a transaction was submitted for this purchase and the backend is verifying it on
            BNB Smart Chain. This state was recovered from the backend after your refresh, so no new purchase was created.
          </p>
          {resume.purchase.transactionHash && (
            <p className="text-sm">
              <a href={`https://bscscan.com/tx/${resume.purchase.transactionHash}`} target="_blank" rel="noreferrer" className="underline">
                View {shortHash(resume.purchase.transactionHash)} on BscScan
              </a>
            </p>
          )}
          <PseNotice tone="attention">
            The backend needs a few block confirmations before the tool activates. Do not send the payment again — the
            same transaction hash is reused for every verification check.
          </PseNotice>
          <div className="flex flex-wrap gap-2">
            <PseButton onClick={() => void recheckRecovered()} disabled={rechecking || !resume.purchase.transactionHash}>
              {rechecking ? 'Checking…' : 'Check verification again'}
            </PseButton>
            <PseButton onClick={onClose}>Close</PseButton>
          </div>
        </PseSection>
      )}

      {/* ── Step: connect ── */}
      {!showingRecovery && step === 'connect' && <WalletConnectStep />}

      {/* ── Step: quote ── */}
      {!showingRecovery && step === 'quote' && (
        quoteLoading || !quote ? (
          <PseLoading label="Requesting a live BNB quote from the server" />
        ) : (
          <PseSection title="Quote">
            {resume?.kind === 'expired' && (
              <PseNotice tone="attention">
                Your previous quote expired — BNB pricing changed, so the earlier purchase could not be completed. A
                fresh quote is prepared below; the earlier record is kept for audit and was not rewritten.
              </PseNotice>
            )}
            <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {[
                ['Tool', tool.name],
                ['Fixed price', gbp(quote.gbpPrice)],
                ['Live rate', quote.exchangeRateBNBGBP > 0 ? `1 BNB = £${Number(quote.exchangeRateBNBGBP).toFixed(2)}` : '—'],
                ['You pay, exactly', `${exactBnb} BNB`],
                ['Network', `${networkName} · ${requiredChainId}`],
                ['Receiving wallet', shortAddr(quote.receiverWallet)],
                ['Quote window', `${mm}:${ss}`],
                ['Quote id', shortHash(quote.quoteId, 8)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
                  <dt className="text-sm text-text-secondary">{k}</dt>
                  <dd className="font-mono text-sm text-text-primary">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-text-tertiary">
              The quoted BNB amount is fixed for this window so the GBP price you pay never drifts.
              {secondsLeft === 0 && ' This quote has expired — refresh it before paying.'}
            </p>
            <p className="text-sm text-text-secondary">
              Adds {gbpHour(tool.hourlyRateGBP)} of capacity. You will own {owned} of {tool.maxPerUser} after this
              purchase. {continuous
                ? 'Elite mines continuously — no manual session restarts.'
                : 'This tier mines in sessions: when a session ends, mining stops until you restart the tool.'}
            </p>
            <PseButton onClick={() => void navigator.clipboard?.writeText(quote.receiverWallet)}>
              Copy receiving wallet {shortAddr(quote.receiverWallet)}
            </PseButton>

            <div className="flex flex-wrap gap-2">
              {owned >= tool.maxPerUser ? (
                <PseNotice tone="attention">Maximum ownership for this tool reached.</PseNotice>
              ) : !walletLive ? (
                <PseButton onClick={() => setStep('connect')}>
                  {connectedWallet ? 'Reconnect your wallet to continue' : 'Connect a wallet to continue'}
                </PseButton>
              ) : !quoteValid ? (
                <PseButton onClick={refreshQuoteNow}>Refresh quote</PseButton>
              ) : (
                <PseButton onClick={() => setStep('pay')}>Continue to payment</PseButton>
              )}
            </div>
            {connectedWallet && (
              <p className="text-xs text-text-tertiary">Paying from {shortAddr(connectedWallet)}</p>
            )}
          </PseSection>
        )
      )}

      {/* ── Step: pay ── */}
      {!showingRecovery && step === 'pay' && quote && (
        <PseSection title="Pay in BNB">
          {resume?.kind === 'live' && (
            <PseNotice>
              Resuming your pending purchase — the original quote and payment wallet are unchanged, and no second
              purchase was created.
            </PseNotice>
          )}

          <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {[
              ['Tool', tool.name],
              ['Price', gbp(tool.purchasePriceGBP)],
              ['Network', `${networkName} · chain ${requiredChainId}`],
              ['Payment wallet', boundPayer ? shortAddr(boundPayer) : connectedWallet ? shortAddr(connectedWallet) : '—'],
              ['Receiving wallet', shortAddr(quote.receiverWallet)],
              ['Quote expires', `${mm}:${ss}`],
              ['You pay exactly', `${exactBnb} BNB`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
                <dt className="text-sm text-text-secondary">{k}</dt>
                <dd className="font-mono text-sm text-text-primary">{v}</dd>
              </div>
            ))}
          </dl>

          <PseButton onClick={() => void navigator.clipboard?.writeText(exactBnb)}>Copy exact BNB amount</PseButton>
          <PseNotice tone="attention">
            Send the exact amount — underpayments are detected and will not activate a tool.
          </PseNotice>

          {boundPayer && (
            <p className="text-sm text-text-secondary">
              Bound payer {shortAddr(boundPayer)} — only this wallet can complete this purchase; the backend compares
              the on-chain sender against it.
            </p>
          )}

          <ul className="space-y-1 text-sm">
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
              <li key={c.label} className={c.warn ? 'text-text-primary' : 'text-text-secondary'}>
                {c.ok ? '✓' : c.warn ? '!' : '·'} {c.label}
              </li>
            ))}
          </ul>

          {walletChanged && (
            <PseNotice tone="danger">
              Wallet changed — this purchase is locked to {shortAddr(boundPayer)}. Reconnect that wallet to pay; the
              connected wallet will not replace the payer. To pay with a different wallet, wait for the quote window to
              lapse and start a new purchase.
            </PseNotice>
          )}

          {connectedWallet && wrongChain && (
            <PseNotice tone="attention">
              Wrong network — this payment must be sent on {networkName} (chain {requiredChainId}); your wallet is on
              chain {walletChainId}, and a transaction signed elsewhere can never be verified.{' '}
              <button type="button" className="underline" onClick={() => void switchChain()}>Switch to BNB Smart Chain</button>
            </PseNotice>
          )}

          <div className="flex flex-wrap gap-2">
            <PseButton onClick={() => void payNow()} disabled={payBlocked}>
              Open wallet &amp; pay {exactBnb} BNB
            </PseButton>
            {!walletLive && (
              <PseButton onClick={() => setStep('connect')}>
                {connectedWallet ? 'Reconnect this wallet' : 'Connect a wallet'}
              </PseButton>
            )}
            <PseButton onClick={() => (quoteValid ? setStep('quote') : refreshQuoteNow())}>
              {quoteValid ? 'Back to quote' : 'Refresh quote'}
            </PseButton>
          </div>
          {payBlocked && <PseNotice tone="attention">{blockedReason}</PseNotice>}
          <p className="text-xs text-text-tertiary">
            After you send, the backend verifies your transaction on-chain — sender, recipient, exact amount and
            confirmation depth — before the tool activates.
          </p>
        </PseSection>
      )}

      {/* ── Step: verifying ── */}
      {!showingRecovery && step === 'verifying' && (
        <PseSection title="Verifying on BNB Smart Chain">
          <p className="text-sm text-text-secondary" role="status" aria-live="polite">
            Confirming sender, recipient, amount and network confirmations. Don&apos;t close this window.
          </p>
          <p className="font-mono text-xs text-text-tertiary">{submissionState} · {SUBMISSION_LABEL[submissionState]}</p>
        </PseSection>
      )}

      {/* ── Step: result ── */}
      {!showingRecovery && step === 'result' && result && (
        <PseSection
          title={
            result.ok ? 'Tool activated'
              : result.recheckable ? 'Confirming payment'
                : result.uncertain ? 'Submission uncertain'
                  : 'Verification incomplete'
          }
        >
          <p className="text-sm text-text-primary">{result.message}</p>
          {result.hash && (
            <p className="text-sm">
              <a href={`https://bscscan.com/tx/${result.hash}`} target="_blank" rel="noreferrer" className="underline">
                View {shortHash(result.hash)} on BscScan
              </a>
            </p>
          )}

          {result.uncertain && (
            <PseNotice tone="danger">
              Nothing was sent twice. Check your wallet&apos;s activity (or the address on BscScan) for a pending
              transfer. If one exists, do not send again — keep its hash and the wallet that sent it; support reconciles
              it from the on-chain record. If none exists, start a new purchase below.
            </PseNotice>
          )}
          {!result.ok && !result.recheckable && !result.uncertain && (
            <PseNotice tone="attention">
              No tool was activated. Nothing was lost: unverified payments are recorded as recovery evidence for manual
              review — that record exists so an administrator can reconcile it, and it is not an automatic activation.
            </PseNotice>
          )}
          {result.ok && (
            <PseNotice>
              {continuous
                ? 'This tool mines continuously while the campaign is active — there is no manual session restart.'
                : 'This tool now runs in mining sessions. When a session completes, mining stops until you restart it; each restart needs a short backend period before mining resumes.'}
            </PseNotice>
          )}

          <div className="flex flex-wrap gap-2">
            <PseButton onClick={onClose}>{result.ok ? 'Go to console' : 'Close'}</PseButton>
            {!result.ok && result.recheckable && result.hash && (
              <PseButton onClick={() => void recheckVerification(result.hash as string)} disabled={rechecking}>
                {rechecking ? 'Checking…' : 'Check verification again'}
              </PseButton>
            )}
            {!result.ok && !result.recheckable && (
              <PseButton onClick={restartPurchase}>
                {result.uncertain ? 'Start a new purchase' : 'Try again with a new quote'}
              </PseButton>
            )}
          </div>
        </PseSection>
      )}
    </PsePage>
  );
};

/* ── Wallet connection step (inside the purchase flow) ─────────────────── */
const WalletConnectStep: React.FC = () => {
  const {
    injectedWallets, walletConnectAvailable, connectWallet,
    connectWalletConnectTransport, isConnectingWallet,
  } = usePSEMine();

  return (
    <PseSection title="Connect a wallet">
      <p className="text-sm text-text-secondary">
        A wallet is required to sign the payment. PSEmine never requests automatic transfers — every payment must be
        approved in your wallet.
      </p>

      <div className="flex flex-wrap gap-2">
        {injectedWallets.map(w => (
          <PseButton key={w.id} onClick={() => void connectWallet(w.id)} disabled={isConnectingWallet}>
            {w.name}
          </PseButton>
        ))}
        {walletConnectAvailable && (
          <PseButton onClick={() => void connectWalletConnectTransport()} disabled={isConnectingWallet}>
            WalletConnect — mobile &amp; extension wallets
          </PseButton>
        )}
      </div>

      {isConnectingWallet && <PseNotice>Waiting for the wallet…</PseNotice>}

      {!walletConnectAvailable && injectedWallets.length === 0 && (
        <PseNotice tone="attention">
          No wallet detected. Open PSEmine in your wallet&apos;s browser (Trust, MetaMask), install an extension, or
          configure WalletConnect for this deployment.
        </PseNotice>
      )}
    </PseSection>
  );
};

export default PSEMineTools;
