import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, X, Wallet, ShieldCheck, Loader2, ChevronRight, ExternalLink,
  Layers, RefreshCcw, Smartphone, Info,
} from 'lucide-react';
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
  Stamp, StatementHeader, Verdict, CapacityRail, Ledger, LedgerRow,
  Attn, Clause, CopyField, PSEEmpty, PSELoading, PSEError,
  gbp, gbpHour, gbpRate, shortAddr, shortHash, nowMs, cycleStateView,
  bnbExactFromWei,
} from '../../components/psemine/pse';
import { ModulePlate, ModuleMark } from '../../components/psemine/PSEBrand';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const EVM = /^0x[0-9a-fA-F]{40}$/;

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const dutyOf = (t: PSEMineToolDefinition) => (t.operating?.model === 'continuous' ? 'continuous' as const : 'session' as const);

/**
 * The mining tool marketplace.
 *
 * Composition law (Duty & Ledger): VERDICT → RAILS → LEDGERS → NOTES.
 *
 *   VERDICT  the buyer's position: tool capacity deployed, and the headroom left
 *            against the campaign cap — on the canvas, not inside a panel.
 *   RAIL     the canonical capacity register (shared with every other surface).
 *   LEDGERS  the catalogue, the operator's own equipment, the purchase
 *            mechanics and the campaign limits.
 *
 * The catalogue is a PRODUCT spec matrix, not four feature cards: every tier is
 * drawn as its module with a nameplate, its price, its hourly capacity, the
 * capacity it holds at its ownership limit, its duty model and its real
 * ownership limit — the same rows in the same order for all four, so tiers are
 * compared by scanning. Nothing in this store is a task, an offer, a survey or a
 * provider opportunity: it sells mining tools.
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
    return <div className="pse-gut pt-6"><PSELoading label="Loading the marketplace" /></div>;
  }
  if (error && !state) {
    return <div className="pse-gut py-8"><PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} /></div>;
  }

  return (
    <div className="pse-gut pse-stack" style={{ paddingTop: 22 }}>
      <StatementHeader
        routeKey="Mining tools · marketplace"
        title="Buy mining capacity"
        objective="Four tool tiers with fixed GBP prices, fixed hourly capacity and fixed ownership limits. Paid in BNB — activated only after the backend verifies the transaction on-chain."
        status={
          <Stamp tone={purchaseOpen ? 'live' : 'idle'} pulse={purchaseOpen} glyph="●">
            {purchaseOpen ? 'Purchases open' : campaign?.status === 'active' ? 'Purchases closed' : `Campaign ${campaign?.status || 'unavailable'}`}
          </Stamp>
        }
        actions={<Link to="/mine/dashboard" className="pse-btn pse-btn-2 pse-btn-sm">Operating console</Link>}
      />

      {/* ══ VERDICT — position, on the canvas ══ */}
      <Verdict
        label="Tool capacity deployed"
        value={gbpHour(toolCapacity)}
        status={<Stamp tone={headroom > 0 ? 'info' : 'attn'} glyph="▮">{headroom > 0 ? `${gbpHour(headroom)} headroom` : 'At the tool cap'}</Stamp>}
        note={
          headroom > 0
            ? `Up to ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} of tool capacity can be held across the four tiers' ownership limits. ${
                toolCapacity === 0
                  ? 'No tools are held yet, so nothing is accruing.'
                  : `${gbpHour(headroom)} of that ceiling is still available.`
              }`
            : 'Tool capacity is at the campaign maximum. Qualified referrals can still add capacity.'
        }
        side={
          <div className="pse-stack-tight">
            <div className="pse-spec-line"><span>Tools owned</span><span>{totalOwned}</span></div>
            <div className="pse-spec-line"><span>Ownership slots left</span><span>{tierSlotsLeft} across all tiers</span></div>
            <div className="pse-spec-line"><span>Total capacity</span><span className="pse-cyan">{gbpHour(totalCapacity)}</span></div>
            <div className="pse-spec-line">
              <span>Network</span>
              <span>{PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}</span>
            </div>
          </div>
        }
      />

      {/* ══ RAIL — canonical capacity register ══ */}
      <CapacityRail
        toolCapacity={toolCapacity}
        referralCapacity={referralCapacity}
        counts={counts}
        referralCount={referralQualified}
        label="Mining capacity"
        meta="Tool lanes are what this page changes · referrals add capacity too"
      />

      {/* ══ NOTES — an open purchase is never silently replaced ══ */}
      {pendingPurchase && (
        <Attn
          tone="attn"
          title={pendingInFlight ? 'Payment in flight' : pendingQuoteLive ? 'Purchase in flight' : 'Purchase record open'}
          body={
            <>
              {pendingPurchase.toolName || pendingPurchase.toolId || 'Mining tool'} ·{' '}
              {pendingInFlight
                ? 'A transaction was submitted for this purchase and the backend is verifying it. Nothing further is needed from you.'
                : pendingQuoteLive
                  ? 'Open the tool below to resume this purchase with its original quote and payment wallet.'
                  : 'This record’s quote window has lapsed, so it can no longer be paid. Requesting a fresh quote keeps the stored record as audit history and never rewrites it.'}
              {' '}Recovered from the backend — no second purchase record is created.
            </>
          }
          action={
            <button
              onClick={() => {
                const def = TOOLS.find(t => t.id === pendingPurchase.toolId);
                if (def) setPurchasing(def);
              }}
              className="pse-btn pse-btn-sm"
            >
              {pendingInFlight ? 'View payment status' : pendingQuoteLive ? 'Resume purchase' : 'Start fresh quote'}
            </button>
          }
        />
      )}

      {campaign && campaign.status !== 'active' && (
        <Attn
          tone="attn"
          title={campaign.status === 'scheduled' ? 'Tool purchases have not opened yet' : `Purchases are closed — the campaign is ${campaign.status}`}
          body={campaign.status === 'scheduled'
            ? 'The campaign has not started. Tool economics are fixed and shown in full below.'
            : 'Existing tools continue to follow their operating model until the campaign settles.'}
        />
      )}

      {/* ══ LEDGER — the catalogue (spec matrix) ══ */}
      <section className="pse-stack-tight">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h2 className="pse-h3">Mining tools</h2>
            <p className="pse-meta mt-1">Fixed price · fixed £ per hour · fixed ownership limit · fixed duty model</p>
          </div>
          <p className="pse-np">Four tiers · all additive</p>
        </div>

        <div className="pse-specs">
          {TOOLS.map(t => {
            const owned = counts[t.id] || 0;
            const isMax = owned >= t.maxPerUser;
            const remaining = Math.max(0, t.maxPerUser - owned);
            const continuous = dutyOf(t) === 'continuous';
            return (
              <div key={t.id} className="pse-spec-col">
                <ModulePlate
                  tier={t.tier as 1 | 2 | 3 | 4}
                  name={t.name}
                  rateGBPPerHour={t.hourlyRateGBP}
                  priceGBP={t.purchasePriceGBP}
                  maxPerUser={t.maxPerUser}
                  owned={owned}
                  duty={dutyOf(t)}
                  artSize={170}
                  state={isMax ? 'limit' : owned > 0 ? 'owned' : 'available'}
                >
                  <div className="pse-rule" style={{ marginTop: 4, paddingTop: 10 }}>
                    <div className="pse-spec-line">
                      <span>Capacity at limit</span>
                      <span>{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</span>
                    </div>
                    <div className="pse-spec-line" style={{ marginTop: 6 }}>
                      <span>Duty model</span>
                      <span>{continuous ? 'Continuous' : 'Session · 24h'}</span>
                    </div>
                    <div className="pse-spec-line" style={{ marginTop: 6 }}>
                      <span>Your contribution</span>
                      <span className={owned > 0 ? 'pse-cyan' : undefined}>{owned > 0 ? `+${gbpRate(owned * t.hourlyRateGBP)}` : '—'}</span>
                    </div>
                    <div className="pse-spec-line" style={{ marginTop: 6 }}>
                      <span>Available to you</span>
                      <span>{remaining} of {t.maxPerUser}</span>
                    </div>
                  </div>

                  {!t.enabled ? (
                    <button disabled className="pse-btn pse-btn-2 pse-btn-sm pse-btn-full" style={{ marginTop: 10 }}>Unavailable</button>
                  ) : isMax ? (
                    <button disabled className="pse-btn pse-btn-2 pse-btn-sm pse-btn-full" style={{ marginTop: 10 }}>
                      <Check size={13} /> Maximum owned
                    </button>
                  ) : !purchaseOpen ? (
                    <button disabled className="pse-btn pse-btn-2 pse-btn-sm pse-btn-full" style={{ marginTop: 10 }}>
                      {campaign?.status === 'active' ? 'Purchases closed' : `Campaign ${campaign?.status || 'inactive'}`}
                    </button>
                  ) : (
                    <button onClick={() => setPurchasing(t)} className="pse-btn pse-btn-sm pse-btn-full" style={{ marginTop: 10 }}>
                      Purchase with BNB <ChevronRight size={13} />
                    </button>
                  )}
                </ModulePlate>
              </div>
            );
          })}
        </div>

        <p className="pse-meta pse-measure">
          Tier is carried by the module's construction and its nameplate — bay count, vent bank, service rail,
          crest — never by being drawn larger. Prices and hourly rates are fixed in GBP; you pay the fixed GBP
          price in BNB at the live rate quoted when you request a purchase.
        </p>
      </section>

      {/* ══ LEDGER — the operator's own equipment ══ */}
      <Ledger
        title="Your operating tools"
        meta={ownedTools.length === 0
          ? 'No tools operating yet'
          : 'Session state and restart timing are derived by the backend, per tool'}
        legend={['Tool', '£ / hour']}
        action={<Link to="/mine/dashboard" className="pse-meta pse-link">Operating console</Link>}
      >
        {ownedTools.length === 0 ? (
          <PSEEmpty
            icon={Layers}
            title="No tools operating yet"
            body="Once a purchase is verified on BNB Smart Chain, the tool appears here with its live operating state."
          />
        ) : (
          ownedTools.map(t => {
            const cycle = cycleStateView(t.cycleState || t.status);
            const meta = LOCKED_PSEMINE_TOOLS[t.toolId as keyof typeof LOCKED_PSEMINE_TOOLS] || null;
            const continuous = (t.operatingModel || meta?.operating?.model) === 'continuous';
            const rate = typeof t.hourlyRateGBP === 'number' ? t.hourlyRateGBP : (meta?.hourlyRateGBP ?? 0);
            return (
              <LedgerRow
                key={t.id}
                leading={<ModuleMark tier={(meta?.tier ?? 1) as 1 | 2 | 3 | 4} size={54} active={t.cycleState === 'active'} stopped={t.cycleState === 'cycle_complete' || t.cycleState === 'maintenance_required'} />}
                title={
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {t.toolName || meta?.name || 'Mining tool'}
                    <Stamp tone={t.cycleState === 'active' ? 'live' : t.cycleState === 'restarting' ? 'info' : 'attn'} glyph="·">{cycle.label}</Stamp>
                    {continuous && <span className="pse-np pse-np-2">Continuous</span>}
                  </span>
                }
                sub={cycle.description}
                value={gbpHour(rate)}
              />
            );
          })
        )}
      </Ledger>

      {/* ══ LEDGERS — mechanics beside the campaign limits ══ */}
      <div className="pse-split">
        <div className="pse-ledger pse-pad pse-stack">
          <div>
            <h2 className="pse-h3">How a purchase works</h2>
            <p className="pse-meta mt-1">Five ordered steps — nothing activates before verification</p>
          </div>
          <Clause no="01" title="Quote" body="The backend converts the fixed GBP price to an exact BNB amount at the live rate and binds it to your account for a short window." />
          <Clause no="02" title="Payment" body={`You send exactly that amount to the campaign receiving wallet on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} (chain ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}).`} />
          <Clause no="03" title="On-chain verification" body="The backend checks sender, recipient, amount and confirmation depth against the quote. The app never self-confirms." />
          <Clause no="04" title="Activation" body="A verified purchase activates the tool and adds its hourly capacity to your account." />
          <Clause no="05" title="Operation" body="Starter, Builder and Advanced run finite mining sessions — when a session ends, mining stops until you restart it, and the backend needs a short restart period before mining resumes. Elite runs continuously while the campaign is active." />
        </div>

        <Ledger title="Campaign limits" meta="Fixed for the campaign" legend={['Limit', 'Value']}>
          <LedgerRow title="Tool capacity cap" sub="Across all four ownership limits" value={gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} />
          <LedgerRow title="Session tools" sub="Session ends → restart → restart period → mining resumes" value="Manual restart" />
          <LedgerRow title="Elite Miner" sub="No manual session restart while the campaign runs" value="Continuous" />
          <LedgerRow title="Payment asset" sub={`${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · chain ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}`} value="BNB" valueTone="var(--pse-bnb)" />
          <LedgerRow title="Accounting currency" sub="Accrual is denominated in GBP" value="GBP (£)" />
          <LedgerRow title="Maximum total capacity" sub="Tools plus qualified referrals" value={gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} />
        </Ledger>
      </div>

      {purchasing && (
        <PurchaseFlow
          tool={purchasing}
          pending={pendingPurchase}
          onClose={() => { setPurchasing(null); void refresh(); }}
        />
      )}
    </div>
  );
};

/* ═══════════════════════════ THE RECEIPT ═════════════════════════════════
 * The purchase is presented as a financial document, not a checkout card:
 * Tool → fixed GBP price → live BNB quote → receiving address → quote expiry →
 * BNB Smart Chain → verification state. Success is never shown before the
 * backend verifies the transaction on-chain.
 *
 * Every displayed amount comes from ONE value: bnbExactFromWei(quote.bnbAmountWei),
 * so the receipt lines, the payment summary and the pay button cannot disagree.
 *
 * Refresh recovery: an in-flight purchase is detected from the backend state
 * projection and RESUMED (original quote + payer binding) instead of creating a
 * second intent. The one-send-attempt protection in pseWallet is untouched.
 * ════════════════════════════════════════════════════════════════════════ */
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
  { id: 'quote', label: 'Quote' },
  { id: 'pay', label: 'Pay in BNB' },
  { id: 'verifying', label: 'Verify' },
  { id: 'result', label: 'Activate' },
];

const PurchaseFlow: React.FC<{ tool: PSEMineToolDefinition; pending: PsePendingPurchase | null; onClose: () => void }> = ({ tool, pending, onClose }) => {
  const {
    connectedWallet, walletChainId, walletTransport, pseUser,
    requestQuote, activeQuote, clearQuote, bindPurchaseIntent, submitPurchaseTx,
    sendPayment, ensurePaymentChain, refreshWalletChain,
  } = usePSEMine();
  const { refresh } = usePseState();

  // Start on the wallet step when no wallet is connected yet; the receipt opens
  // the connection flow immediately instead of a dead quote screen.
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

  /* Meter denominator comes from the SERVER-issued quote window
   * (createdAt → expiresAt); the fallback only applies when the backend quote
   * omits createdAt. */
  const quoteDurationSec = (() => {
    if (!quote) return 900;
    const exp = new Date(quote.expiresAt).getTime();
    const created = quote.createdAt ? new Date(quote.createdAt as unknown as string).getTime() : NaN;
    if (Number.isFinite(exp) && Number.isFinite(created) && exp > created) return Math.round((exp - created) / 1000);
    return 900;
  })();
  const meterPct = Math.min(100, Math.max(0, (secondsLeft / quoteDurationSec) * 100));
  const stepIndex = STEP_ORDER.findIndex(s => s.id === step);
  const continuous = dutyOf(tool) === 'continuous';

  return (
    <div className="pse-scrim" role="dialog" aria-modal="true" aria-label={`Purchase ${tool.name}`}>
      <div className="pse-scrim-bg" onClick={step === 'verifying' ? undefined : onClose} />
      <div className="pse-scope pse-receipt">
        {/* ── Receipt head: what is being bought, and where the flow stands ── */}
        <div className="pse-receipt-head">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="pse-np">Purchase receipt</p>
              <p className="pse-h3 mt-1">
                {tool.name} · <span className="pse-n pse-bone">{gbp(tool.purchasePriceGBP)}</span>
              </p>
              <p className="pse-meta mt-1">
                {continuous ? 'Continuous duty' : 'Session duty · 24h'} · adds {gbpHour(tool.hourlyRateGBP)} of capacity
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={step === 'verifying' && !showingRecovery}
              className="pse-btn pse-btn-3 pse-btn-sm"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1" style={{ marginTop: 12 }}>
            {STEP_ORDER.map((s, i) => (
              <span
                key={s.id}
                className="pse-np"
                style={{ color: i < stepIndex ? 'var(--pse-success-ink)' : i === stepIndex ? 'var(--pse-bone)' : 'var(--pse-text-4)' }}
              >
                {String(i + 1).padStart(2, '0')} {s.label}
              </span>
            ))}
          </div>
        </div>

        <div className="pse-receipt-body">
          {/* ── Recovered purchase: a transaction was already submitted ── */}
          {showingRecovery && resume?.kind === 'submitted' && (
            <>
              <div className="pse-stack-tight">
                <p className="pse-np pse-amber">
                  {resume.purchase.status === 'confirming' ? 'Confirming payment' : 'Transaction submitted'}
                </p>
                <p className="pse-label-b">
                  {tool.name} — a transaction was submitted for this purchase and the backend is verifying it on
                  BNB Smart Chain.
                </p>
                <p className="pse-meta">
                  This state was recovered from the backend after your refresh, so no new purchase was created.
                </p>
                {resume.purchase.transactionHash && (
                  <a
                    href={`https://bscscan.com/tx/${resume.purchase.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pse-meta pse-link inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={12} /> View {shortHash(resume.purchase.transactionHash)} on BscScan
                  </a>
                )}
              </div>
              <div className="pse-sunken pse-pad">
                <p className="pse-meta">
                  The backend needs a few block confirmations before the tool activates. Do not send the payment
                  again — the same transaction hash is reused for every verification check.
                </p>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  onClick={() => void recheckRecovered()}
                  disabled={rechecking || !resume.purchase.transactionHash}
                  className="pse-btn pse-btn-full"
                >
                  {rechecking ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                  {rechecking ? 'Checking…' : 'Check verification again'}
                </button>
                <button onClick={onClose} className="pse-btn pse-btn-2 pse-btn-full">Close</button>
              </div>
            </>
          )}

          {/* ── Step: connect ── */}
          {!showingRecovery && step === 'connect' && <WalletConnectStep />}

          {/* ── Step: quote ── */}
          {!showingRecovery && step === 'quote' && (
            quoteLoading || !quote ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 size={22} className="animate-spin pse-cyan" />
                <p className="pse-meta">Requesting a live BNB quote from the server…</p>
              </div>
            ) : (
              <>
                {resume?.kind === 'expired' && (
                  <Attn
                    tone="attn"
                    title="Your previous quote expired"
                    body="BNB pricing has changed, so the earlier purchase could not be completed. A fresh quote is prepared below; the earlier record is kept for audit and was not rewritten."
                  />
                )}

                <div className="pse-receipt-lines">
                  <div className="pse-receipt-line">
                    <span className="pse-label">Tool</span>
                    <span className="pse-label-b">{tool.name}</span>
                  </div>
                  <div className="pse-receipt-line">
                    <span className="pse-label">Fixed price</span>
                    <span className="pse-n pse-fig-d pse-bone">{gbp(quote.gbpPrice)}</span>
                  </div>
                  <div className="pse-receipt-line">
                    <span className="pse-label">Live rate</span>
                    <span className="pse-n pse-label-b">
                      {quote.exchangeRateBNBGBP > 0 ? `1 BNB = £${Number(quote.exchangeRateBNBGBP).toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="pse-receipt-line">
                    <span className="pse-label">You pay, exactly</span>
                    <span className="pse-mono pse-bone">{exactBnb} BNB</span>
                  </div>
                  <div className="pse-receipt-line">
                    <span className="pse-label">Network</span>
                    <span className="pse-chain"><span className="pse-chain-mark" aria-hidden="true" />{networkName} · {requiredChainId}</span>
                  </div>
                  <div className="pse-receipt-line">
                    <span className="pse-label">Receiving wallet</span>
                    <CopyField value={quote.receiverWallet} display={shortAddr(quote.receiverWallet)} label="receiving wallet" />
                  </div>
                  <div className="pse-receipt-line">
                    <span className="pse-label">Quote window</span>
                    <span className="pse-mono pse-n" style={{ color: secondsLeft < 120 ? 'var(--pse-amber)' : undefined }}>{mm}:{ss}</span>
                  </div>
                  <div className="pse-receipt-line">
                    <span className="pse-label">Quote id</span>
                    <span className="pse-mono pse-dim-3">{shortHash(quote.quoteId, 8)}</span>
                  </div>
                </div>

                <div>
                  <div className="pse-progress" role="progressbar" aria-label="Quote validity" aria-valuenow={Math.round(meterPct)} aria-valuemin={0} aria-valuemax={100}>
                    <span className="pse-progress-fill" style={{ width: `${meterPct}%` }} />
                  </div>
                  <p className="pse-meta" style={{ marginTop: 8 }}>
                    The quoted BNB amount is fixed for this window so the GBP price you pay never drifts.
                    {secondsLeft === 0 && ' This quote has expired — refresh it before paying.'}
                  </p>
                </div>

                <div className="pse-sunken pse-pad">
                  <p className="pse-meta">
                    Adds <span className="pse-n pse-bone">{gbpHour(tool.hourlyRateGBP)}</span> of capacity. You will own{' '}
                    {owned} of {tool.maxPerUser} after this purchase.{' '}
                    {continuous
                      ? 'Elite mines continuously — no manual session restarts.'
                      : 'This tier mines in sessions: when a session ends, mining stops until you restart the tool.'}
                  </p>
                </div>

                {owned >= tool.maxPerUser ? (
                  <p className="pse-label pse-amber">Maximum ownership for this tool reached.</p>
                ) : !walletLive ? (
                  <button onClick={() => setStep('connect')} className="pse-btn pse-btn-full">
                    <Wallet size={15} /> {connectedWallet ? 'Reconnect your wallet to continue' : 'Connect a wallet to continue'}
                  </button>
                ) : !quoteValid ? (
                  <button onClick={refreshQuoteNow} className="pse-btn pse-btn-full">
                    <RefreshCcw size={15} /> Refresh quote
                  </button>
                ) : (
                  <button onClick={() => setStep('pay')} className="pse-btn pse-btn-full">
                    Continue to payment <ChevronRight size={15} />
                  </button>
                )}
                {connectedWallet && (
                  <p className="pse-meta" style={{ textAlign: 'center' }}>
                    Paying from <span className="pse-mono">{shortAddr(connectedWallet)}</span>
                  </p>
                )}
              </>
            )
          )}

          {/* ── Step: pay ── */}
          {!showingRecovery && step === 'pay' && quote && (
            <>
              {resume?.kind === 'live' && (
                <Attn
                  tone="info"
                  title="Resuming your pending purchase"
                  body="The original quote and payment wallet are unchanged, and no second purchase was created."
                />
              )}

              <div className="pse-receipt-lines">
                <div className="pse-receipt-line"><span className="pse-label">Tool</span><span className="pse-label-b">{tool.name}</span></div>
                <div className="pse-receipt-line"><span className="pse-label">Price</span><span className="pse-n pse-label-b">{gbp(tool.purchasePriceGBP)}</span></div>
                <div className="pse-receipt-line"><span className="pse-label">Network</span><span className="pse-label-b">{networkName} · chain {requiredChainId}</span></div>
                <div className="pse-receipt-line">
                  <span className="pse-label">Payment wallet</span>
                  <span className="pse-mono">{boundPayer ? shortAddr(boundPayer) : (connectedWallet ? shortAddr(connectedWallet) : '—')}</span>
                </div>
                <div className="pse-receipt-line">
                  <span className="pse-label">Receiving wallet</span>
                  <CopyField value={quote.receiverWallet} display={shortAddr(quote.receiverWallet)} label="receiving wallet" />
                </div>
                <div className="pse-receipt-line"><span className="pse-label">Quote expires</span><span className="pse-mono pse-n">{mm}:{ss}</span></div>
              </div>

              <div className="pse-receipt-total">
                <div>
                  <p className="pse-np">You pay exactly</p>
                  <p className="pse-fig-b pse-mono pse-bone" style={{ marginTop: 6 }}>{exactBnb} BNB</p>
                </div>
                <CopyField value={exactBnb} display="Copy amount" label="BNB amount" />
              </div>
              <p className="pse-meta pse-amber">
                Send the exact amount — underpayments are detected and will not activate a tool.
              </p>

              {boundPayer && (
                <div>
                  <p className="pse-np">Bound payer</p>
                  <CopyField value={boundPayer} display={boundPayer} label="payer wallet" fullWidth />
                  <p className="pse-meta" style={{ marginTop: 8 }}>
                    Only this wallet can complete this purchase — the backend compares the on-chain sender against it.
                  </p>
                </div>
              )}

              {/* Pre-payment clauses — exactly what the pay button requires */}
              <div>
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
                ].map((c, i) => (
                  <div key={c.label} className="pse-receipt-clause" data-state={c.ok ? 'done' : c.warn ? 'current' : 'pending'}>
                    <span className="pse-receipt-clause-no">{String(i + 1).padStart(2, '0')}</span>
                    <p className={c.ok ? 'pse-meta' : 'pse-label'} style={!c.ok && c.warn ? { color: 'var(--pse-amber)' } : undefined}>
                      {c.label}
                    </p>
                  </div>
                ))}
              </div>

              {walletChanged && (
                <Attn
                  tone="fail"
                  title="Wallet changed"
                  body={`This purchase is locked to ${shortAddr(boundPayer)}. Reconnect that wallet to pay — the connected wallet will not replace the payer. To pay with a different wallet, wait for the quote window to lapse and start a new purchase.`}
                />
              )}

              {connectedWallet && wrongChain && (
                <Attn
                  tone="attn"
                  title="Wrong network"
                  body={`This payment must be sent on ${networkName} (chain ${requiredChainId}) — your wallet is on chain ${walletChainId}, and a transaction signed elsewhere can never be verified.`}
                  action={<button onClick={() => void switchChain()} className="pse-btn pse-btn-2 pse-btn-sm">Switch to BNB Smart Chain</button>}
                />
              )}

              <button
                onClick={() => void payNow()}
                disabled={payBlocked}
                className={cn('pse-btn pse-btn-full pse-btn-lg', payBlocked && 'pse-btn-2')}
              >
                <Wallet size={15} /> Open wallet &amp; pay {exactBnb} BNB
              </button>
              {payBlocked && <p className="pse-meta pse-amber" style={{ textAlign: 'center' }}>{blockedReason}</p>}
              {!walletLive && (
                <button onClick={() => setStep('connect')} className="pse-btn pse-btn-2 pse-btn-full">
                  <Wallet size={15} /> {connectedWallet ? 'Reconnect this wallet' : 'Connect a wallet'}
                </button>
              )}
              <button onClick={() => (quoteValid ? setStep('quote') : refreshQuoteNow())} className="pse-btn pse-btn-3 pse-btn-full">
                {quoteValid ? 'Back to quote' : 'Refresh quote'}
              </button>

              <div className="pse-sunken pse-pad flex items-start gap-2.5">
                <ShieldCheck size={15} className="shrink-0 pse-cyan" style={{ marginTop: 2 }} />
                <p className="pse-meta">
                  After you send, the backend verifies your transaction on-chain — sender, recipient, exact amount
                  and confirmation depth — before the tool activates.
                </p>
              </div>
            </>
          )}

          {/* ── Step: verifying ── */}
          {!showingRecovery && step === 'verifying' && (
            <div className="pse-stack-tight" style={{ alignItems: 'center', paddingBlock: 32 }}>
              <Loader2 size={24} className="animate-spin pse-cyan" />
              <p className="pse-h3">Verifying on BNB Smart Chain</p>
              <p className="pse-meta" style={{ textAlign: 'center', maxWidth: 340 }}>
                Confirming sender, recipient, amount and network confirmations. Don&apos;t close this window.
              </p>
              <div className="pse-receipt-clause" data-state="current" style={{ width: '100%', maxWidth: 380 }}>
                <span className="pse-receipt-clause-no">·</span>
                <p className="pse-mono pse-meta">{submissionState} · {SUBMISSION_LABEL[submissionState]}</p>
              </div>
            </div>
          )}

          {/* ── Step: result ── */}
          {!showingRecovery && step === 'result' && result && (
            <>
              <div className="pse-stack-tight">
                <Stamp
                  tone={result.ok ? 'live' : result.recheckable ? 'info' : result.uncertain ? 'attn' : 'fail'}
                  glyph={result.ok ? '✓' : result.recheckable ? '◷' : '▲'}
                >
                  {result.ok
                    ? 'Tool activated'
                    : result.recheckable
                      ? 'Confirming payment'
                      : result.uncertain
                        ? 'Submission uncertain'
                        : 'Verification incomplete'}
                </Stamp>
                <p className="pse-label-b">{result.message}</p>
                {result.hash && (
                  <a
                    href={`https://bscscan.com/tx/${result.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="pse-meta pse-link inline-flex items-center gap-1.5"
                  >
                    <ExternalLink size={12} /> View {shortHash(result.hash)} on BscScan
                  </a>
                )}
              </div>

              {result.uncertain && (
                <Attn
                  tone="fail"
                  title="Nothing was sent twice"
                  body="Check your wallet's activity (or the address on BscScan) for a pending transfer. If one exists, do not send again — keep its hash and the wallet that sent it; support reconciles it from the on-chain record. If none exists, start a new purchase below."
                />
              )}
              {!result.ok && !result.recheckable && !result.uncertain && (
                <Attn
                  tone="attn"
                  title="No tool was activated"
                  body="Nothing was lost: unverified payments are recorded as recovery evidence for manual review — that record exists so an administrator can reconcile it, and it is not an automatic activation."
                />
              )}
              {result.ok && (
                <div className="pse-sunken pse-pad flex items-start gap-2.5">
                  <Info size={14} className="shrink-0 pse-cyan" style={{ marginTop: 2 }} />
                  <p className="pse-meta">
                    {continuous
                      ? 'This tool mines continuously while the campaign is active — there is no manual session restart.'
                      : 'This tool now runs in mining sessions. When a session completes, mining stops until you restart it; each restart needs a short backend period before mining resumes.'}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button onClick={onClose} className="pse-btn pse-btn-full">{result.ok ? 'Go to console' : 'Close'}</button>
                {!result.ok && result.recheckable && result.hash && (
                  <button
                    onClick={() => void recheckVerification(result.hash as string)}
                    disabled={rechecking}
                    className="pse-btn pse-btn-2 pse-btn-full"
                  >
                    {rechecking ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                    {rechecking ? 'Checking…' : 'Check verification again'}
                  </button>
                )}
                {!result.ok && !result.recheckable && (
                  <button onClick={restartPurchase} className="pse-btn pse-btn-2 pse-btn-full">
                    {result.uncertain ? 'Start a new purchase' : 'Try again with a new quote'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


/* ── Wallet connection step (inside the receipt) ───────────────────────── */
const WalletConnectStep: React.FC = () => {
  const {
    injectedWallets, walletConnectAvailable, connectWallet,
    connectWalletConnectTransport, isConnectingWallet,
  } = usePSEMine();
  return (
    <div className="pse-stack-tight">
      <div className="pse-sunken pse-pad">
        <p className="pse-label-b">Connect a wallet</p>
        <p className="pse-meta" style={{ marginTop: 6 }}>
          A wallet is required to sign the payment. PSEmine never requests automatic transfers — every payment must
          be approved in your wallet.
        </p>
      </div>

      {injectedWallets.map(w => (
        <button
          key={w.id}
          onClick={() => void connectWallet(w.id)}
          disabled={isConnectingWallet}
          className="pse-btn pse-btn-2 pse-btn-full"
          style={{ justifyContent: 'space-between' }}
        >
          <span className="flex items-center gap-2.5">
            {w.icon
              ? <img src={w.icon} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
              : <Wallet size={16} />}
            <span className="pse-label-b">{w.name}</span>
          </span>
          <ChevronRight size={14} />
        </button>
      ))}

      {walletConnectAvailable && (
        <button
          onClick={() => void connectWalletConnectTransport()}
          disabled={isConnectingWallet}
          className="pse-btn pse-btn-2 pse-btn-full"
          style={{ justifyContent: 'space-between' }}
        >
          <span className="flex items-center gap-2.5">
            <Smartphone size={16} />
            <span className="pse-label-b">WalletConnect — mobile &amp; extension wallets</span>
          </span>
          <ChevronRight size={14} />
        </button>
      )}

      {isConnectingWallet && (
        <p className="pse-meta flex items-center gap-2">
          <Loader2 size={13} className="animate-spin" /> Waiting for the wallet…
        </p>
      )}

      {!walletConnectAvailable && injectedWallets.length === 0 && (
        <Attn
          tone="attn"
          title="No wallet detected"
          body="Open PSEmine in your wallet's browser (Trust, MetaMask), install an extension, or configure WalletConnect for this deployment."
        />
      )}
    </div>
  );
};

export default PSEMineTools;
