import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, X, Wallet, ShieldCheck, Loader2, Clock, ChevronRight, ExternalLink,
  Layers, Gauge, AlertTriangle, Info, Smartphone, RefreshCcw,
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
  Chip, WorkbenchHeader, AccentSurface, Surface, MetricRow, KeyValue, KVRow, RowItem,
  Meter, gbp, gbpHour, gbpRate, shortAddr, shortHash, nowMs, cycleStateView,
  operatingModelView, bnbExactFromWei,
  CopyField, PSEEmpty, PSELoading, PSEError, ActionLink,
} from '../../components/psemine/pse';
import { MinerArt } from '../../components/psemine/PSEBrand';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

const EVM = /^0x[0-9a-fA-F]{40}$/;

/**
 * What each tier actually gives you BEYOND its hourly rate.
 *
 * Rule: every bullet must correspond to a capability that exists. Day-to-day
 * tier differences are: how the tool operates (session vs continuous) and how
 * much of the console is built around it (stacking view, per-tier analytics,
 * session history). No bullet may imply extra capacity, higher payouts,
 * guaranteed earnings or priority payouts — none of those exist.
 */
const TIER_FEATURES: Record<string, string[]> = {
  starter: [
    'Entry-level mining capacity',
    'Standard earnings tracking',
    'Standard activity history',
    'Session-based operation with restart control',
  ],
  builder: [
    'Enhanced tool statistics',
    'Clear capacity contribution per tier',
    'Tool performance history',
    'Session-based operation with restart control',
  ],
  advanced: [
    'Stacking view — run up to 3 as separate tools',
    'Per-tier capacity contribution breakdown',
    'Historical accrual view in the ledger',
    'Detailed mining performance per tool',
  ],
  elite: [
    'Continuous mining — no manual restarts',
    'Premium tool identity and treatment',
    'Advanced capacity analytics',
    'Detailed campaign performance reporting',
  ],
};

/**
 * The equipment marketplace.
 *
 * Composition (design system v2): the page opens with the buyer's OWN capacity
 * position — the reason to be here — then presents the four tiers as aligned,
 * scannable rows (tier mark · identity · operating model · comparable specs ·
 * one action), then the tools already operating, then the purchase mechanics.
 *
 * The purchase flow below is unchanged in behaviour: quote → bind payer →
 * chain assertion → pay → on-chain verify → activate. The UI never asserts
 * success before the backend verifies, and every displayed amount comes from
 * the server quote's exact wei value (see bnbExactFromWei).
 */
export const PSEMineTools: React.FC = () => {
  const { tools, pseUser, campaign } = usePSEMine();
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
  const headroom = Math.max(0, PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR - toolCapacity);
  const totalOwned = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
  const tierSlotsLeft = tools.reduce((acc, t) => acc + Math.max(0, t.maxPerUser - (counts[t.id] || 0)), 0);
  // ══ Refresh recovery: which pending purchase deserves the top card ══════
  // The backend returns every open record in no particular order, so the
  // client ranks them instead of trusting index 0:
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
    return <div className="pse-section pt-6 md:pt-8"><PSELoading skeleton label="Loading the marketplace" /></div>;
  }
  if (error && !state) {
    return (
      <div className="pse-section py-8">
        <PSEError error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </div>
    );
  }

  return (
    <div className="pse-section pse-workbench pt-5 md:pt-7">
      <WorkbenchHeader
        title="Equipment"
        purpose="Four tool tiers with fixed GBP prices, fixed hourly capacity and fixed ownership limits. Paid in BNB — activated only after the backend verifies the transaction on-chain."
        status={
          <Chip
            label={purchaseOpen ? 'Purchases open' : `Purchases ${campaign?.status === 'active' ? 'closed' : String(campaign?.status || 'unavailable')}`}
            chip={purchaseOpen ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-neutral'}
            pulse={purchaseOpen}
          />
        }
        actions={<Link to="/mine/dashboard" className="pse-btn pse-btn-secondary pse-btn-sm">Operating cycles</Link>}
      />

      {/* ══ Position: what capacity you already run and what headroom is left ══ */}
      <AccentSurface>
        <div className="flex flex-wrap items-baseline justify-between gap-3 px-4 pt-4">
          <div>
            <p className="pse-eyebrow">Tool capacity deployed</p>
            <p className="pse-fig-lg mt-1.5">{gbpHour(toolCapacity)}</p>
          </div>
          <p className="pse-micro max-w-sm">
            {headroom > 0
              ? `${gbpHour(headroom)} of tool capacity headroom remains (cap ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}).`
              : 'Tool capacity is at the campaign maximum. Referral capacity can still add +£0.30/hour per qualified referral.'}
          </p>
        </div>
        <div className="mt-3 px-4 pb-4">
          <Meter
            value={(toolCapacity / PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR) * 100}
            label="Tool capacity against the campaign cap"
          />
        </div>
        <div className="pse-rule">
          <MetricRow items={[
            { label: 'Tools owned', value: String(totalOwned), sub: `${ownedTools.length} operating` },
            { label: 'Ownership slots left', value: String(tierSlotsLeft), sub: 'Across all tiers' },
            { label: 'Total capacity', value: gbpHour(totalCapacity), sub: 'Tools + referrals' },
            { label: 'Marketplace', value: purchaseOpen ? 'Open' : 'Closed', sub: campaign?.status ? `Campaign ${campaign.status}` : 'State unavailable' },
          ]} />
        </div>
      </AccentSurface>

      {/* ══ A pending purchase is never silently replaced ══ */}
      {pendingPurchase && (
        <Surface
          tone="warning"
          title={pendingInFlight ? 'Payment in flight' : pendingQuoteLive ? 'Purchase in flight' : 'Purchase record open'}
          meta="Recovered from the backend — no second purchase record is created."
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="pse-caption font-medium" style={{ color: 'var(--pse-text)' }}>
                {pendingPurchase.toolName || pendingPurchase.toolId || 'Mining tool'} ·{' '}
                {pendingInFlight ? 'Verifying on-chain' : pendingQuoteLive ? 'Awaiting payment' : 'Quote lapsed'}
              </p>
              <p className="pse-micro mt-0.5">
                {pendingInFlight
                  ? 'A transaction was submitted for this purchase and the backend is verifying it. Nothing further is needed from you.'
                  : pendingQuoteLive
                    ? 'Open the tool below to resume this purchase with its original quote and payment wallet.'
                    : 'This record\u2019s quote window has lapsed, so it can no longer be paid. Requesting a fresh quote keeps the stored record as audit history and never rewrites it.'}
              </p>
            </div>
            <button
              onClick={() => {
                const def = tools.find(t => t.id === pendingPurchase.toolId);
                if (def) setPurchasing(def);
              }}
              className="pse-btn pse-btn-primary pse-btn-sm shrink-0"
            >
              {pendingInFlight ? 'View payment status' : pendingQuoteLive ? 'Resume purchase' : 'Start fresh quote'}
            </button>
          </div>
        </Surface>
      )}

      {campaign && campaign.status !== 'active' && (
        <Surface tone="warning">
          <div className="flex items-start gap-2.5 px-4 py-3.5">
            <Clock size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
            <p className="pse-caption">
              {campaign.status === 'scheduled'
                ? 'Purchases are not open yet — the campaign has not started. Tool economics are fixed and shown in full below.'
                : `Purchases are closed — the campaign is ${campaign.status}. Existing tools continue to follow their operating model.`}
            </p>
          </div>
        </Surface>
      )}

      {/* ══ The marketplace rows ══ */}
      <Surface
        title="Mining tools"
        meta="Fixed price · fixed hourly capacity · fixed ownership limit · backend-defined operating model"
        bodyClassName="pse-rows"
      >
        {/* Desktop column legend — the rows below align to it */}
        <div className="pse-rule-t hidden px-4 py-2 lg:flex" style={{ background: 'var(--pse-inset)' }}>
          <span className="pse-eyebrow flex-1">Tier</span>
          <span className="pse-eyebrow w-[92px]">Price</span>
          <span className="pse-eyebrow w-[104px]">Capacity</span>
          <span className="pse-eyebrow w-[96px]">Ownership</span>
          <span className="pse-eyebrow w-[104px]">Your rate</span>
          <span className="pse-eyebrow w-[168px] text-right">Action</span>
        </div>

        {tools.map(tool => {
          const owned = counts[tool.id] || 0;
          const isMax = owned >= tool.maxPerUser;
          const remaining = Math.max(0, tool.maxPerUser - owned);
          const contribution = owned * tool.hourlyRateGBP;
          const om = operatingModelView(tool.operating?.model);
          const continuous = (tool.operating?.model || 'session') === 'continuous';

          return (
            <RowItem key={tool.id} className="flex-wrap gap-y-3 lg:flex-nowrap">
              {/* Identity + operating model + real tier features */}
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <MinerArt tier={tool.tier as 1 | 2 | 3 | 4} size={56} className="shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{tool.name}</p>
                    <span className="pse-micro pse-num" style={{ color: 'var(--pse-text-3)' }}>Tier {tool.tier}</span>
                    {owned > 0 && <Chip label={`${owned} owned`} chip="pse-chip pse-chip-success" dot={false} />}
                    {isMax && <Chip label="Limit reached" chip="pse-chip pse-chip-neutral" dot={false} />}
                  </div>
                  <p className="pse-micro mt-1 max-w-md">{tool.tagline}</p>

                  {/* Operating model — the real behavioral difference between tiers */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Chip label={om.label} chip={om.chip} dot={false} />
                    <span className="pse-micro">{om.detail}</span>
                  </div>

                  <ul className="mt-2 grid max-w-md grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                    {(TIER_FEATURES[tool.id] || []).map(f => (
                      <li key={f} className="pse-micro flex items-start gap-1.5">
                        <Check size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="pse-micro mt-1.5 lg:hidden">
                    {om.label} · {owned} of {tool.maxPerUser} owned · {remaining} available
                  </p>
                </div>
              </div>

              {/* Comparable specs — aligned columns on desktop, inline on mobile */}
              <div className="grid w-full grid-cols-2 gap-y-2 sm:grid-cols-4 lg:flex lg:w-auto lg:shrink-0 lg:items-center">
                <Spec className="lg:w-[92px]" label="Price" value={gbp(tool.purchasePriceGBP)} sub="one-time" />
                <Spec className="lg:w-[104px]" label="Capacity" value={gbpHour(tool.hourlyRateGBP)} sub={continuous ? 'continuous' : 'per active session'} accent="var(--pse-blue)" />
                <Spec className="lg:w-[96px]" label="Ownership" value={`${owned} / ${tool.maxPerUser}`} sub={`${remaining} left`} />
                <Spec className="lg:w-[104px]" label="Your rate" value={gbpRate(contribution)} sub="from this tier" accent={contribution > 0 ? 'var(--pse-cyan)' : undefined} />
              </div>

              {/* Action */}
              <div className="w-full shrink-0 lg:w-[168px]">
                {!tool.enabled ? (
                  <button disabled className="pse-btn pse-btn-secondary w-full justify-center">Unavailable</button>
                ) : isMax ? (
                  <button disabled className="pse-btn pse-btn-secondary w-full justify-center">
                    <Check size={14} style={{ color: 'var(--pse-success)' }} /> Maximum owned
                  </button>
                ) : !purchaseOpen ? (
                  <button disabled className="pse-btn pse-btn-secondary w-full justify-center">
                    {campaign?.status === 'active' ? 'Purchases closed' : `Campaign ${campaign?.status || 'inactive'}`}
                  </button>
                ) : (
                  <button onClick={() => setPurchasing(tool)} className="pse-btn pse-btn-primary w-full justify-center">
                    Purchase with BNB <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </RowItem>
          );
        })}
      </Surface>

      {/* ══ Tools already operating ══ */}
      <Surface
        title="Your operating tools"
        meta="Session state and restart timing are derived by the backend, per tool."
        action={<ActionLink to="/mine/dashboard">Operating console</ActionLink>}
        bodyClassName={ownedTools.length === 0 ? '' : 'pse-rows'}
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
            const meta = (LOCKED_PSEMINE_TOOLS[t.toolId as keyof typeof LOCKED_PSEMINE_TOOLS] || null);
            return (
              <RowItem key={t.id}>
                <MinerArt tier={(meta?.tier ?? 1) as 1 | 2 | 3 | 4} size={40} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="pse-caption font-medium" style={{ color: 'var(--pse-text)' }}>
                      {t.toolName || meta?.name || 'Mining tool'}
                    </p>
                    <Chip label={cycle.label} chip={cycle.chip} dot={false} />
                    {(t.operatingModel || meta?.operating?.model) === 'continuous' && (
                      <Chip label="Continuous" chip="pse-chip pse-chip-cyan" dot={false} />
                    )}
                  </div>
                  <p className="pse-micro mt-0.5">{cycle.description}</p>
                </div>
                <span className="pse-num pse-caption shrink-0" style={{ color: 'var(--pse-text-2)' }}>
                  {gbpHour(typeof t.hourlyRateGBP === 'number' ? t.hourlyRateGBP : (meta?.hourlyRateGBP ?? 0))}
                </span>
              </RowItem>
            );
          })
        )}
      </Surface>

      {/* ══ Mechanics ══ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Surface title="How a purchase works" meta="Five ordered steps — nothing activates before verification">
          <ol className="pse-rows">
            {[
              ['Quote', 'The backend converts the fixed GBP price to an exact BNB amount at the live rate and binds it to your account.'],
              ['Payment', 'You send exactly that amount to the campaign receiving wallet on BNB Smart Chain (chain 56).'],
              ['On-chain verification', 'The backend checks sender, recipient, amount and confirmation depth. The app never self-confirms.'],
              ['Activation', 'A verified purchase activates the tool and adds its hourly capacity to your account.'],
              ['Operation', 'Starter, Builder and Advanced miners run finite mining sessions — when a session ends, mining stops until you restart it, and the backend needs a short restart period before mining resumes. Elite runs continuously while the campaign is active.'],
            ].map(([title, body], i) => (
              <li key={title} className="pse-row-item items-start">
                <span className="pse-step pse-step-active">{i + 1}</span>
                <div className="min-w-0">
                  <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{title}</p>
                  <p className="pse-micro mt-0.5">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Surface>

        <Surface title="Campaign limits" meta="Fixed for the 90-day campaign">
          <KeyValue>
            <KVRow k="Tool capacity cap" v={gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} />
            <KVRow k="Session tools" v="Manual restart" hint="Session ends → restart → restart period → mining resumes" />
            <KVRow k="Elite Miner" v="Continuous" hint="No manual session restart while the campaign runs" />
            <KVRow k="Payment asset" v="BNB" hint="BNB Smart Chain · chain 56" />
            <KVRow k="Accounting currency" v="GBP (£)" hint="Earnings are GBP-denominated" />
          </KeyValue>
        </Surface>
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

/** One aligned spec column in a marketplace row. */
function Spec({ label, value, sub, accent, className }: {
  label: string; value: string; sub?: string; accent?: string; className?: string;
}) {
  return (
    <div className={className}>
      <p className="pse-eyebrow">{label}</p>
      <p className="pse-num mt-1 pse-caption font-semibold" style={{ color: accent || 'var(--pse-text)' }}>{value}</p>
      {sub && <p className="pse-micro mt-0.5">{sub}</p>}
    </div>
  );
}

/** One pre-payment requirement line. */
function ChecklistItem({ ok, label, warn }: { ok: boolean; label: string; warn?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {ok
        ? <Check size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
        : warn
          ? <AlertTriangle size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
          : <X size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-text-3)' }} />}
      <span className="pse-micro" style={{ color: ok ? 'var(--pse-text-2)' : 'var(--pse-text)' }}>{label}</span>
    </li>
  );
}

/* ═══════════════════════ WALLET CONNECT STEP ═══════════════════════ */
const WalletConnectStep: React.FC = () => {
  const {
    injectedWallets, walletConnectAvailable, connectWallet,
    connectWalletConnectTransport, isConnectingWallet,
  } = usePSEMine();
  return (
    <div className="space-y-2.5">
      <div className="pse-inset p-4">
        <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>Connect a wallet</p>
        <p className="pse-micro mt-1">
          A wallet is required to sign the payment. PSEmine never requests automatic
          transfers — every payment must be approved in your wallet.
        </p>
      </div>
      {injectedWallets.map(w => (
        <button
          key={w.id}
          onClick={() => void connectWallet(w.id)}
          disabled={isConnectingWallet}
          className="pse-btn pse-btn-secondary w-full justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2.5">
            {w.icon
              ? <img src={w.icon} alt="" width={22} height={22} className="rounded-md" />
              : <Wallet size={16} />}
            <span className="pse-caption font-medium">{w.name}</span>
          </span>
          <ChevronRight size={14} />
        </button>
      ))}
      {walletConnectAvailable && (
        <button
          onClick={() => void connectWalletConnectTransport()}
          disabled={isConnectingWallet}
          className="pse-btn pse-btn-secondary w-full justify-between px-4 py-3"
        >
          <span className="flex items-center gap-2.5">
            <Smartphone size={16} />
            <span className="pse-caption font-medium">WalletConnect — mobile &amp; extension wallets</span>
          </span>
          <ChevronRight size={14} />
        </button>
      )}
      {isConnectingWallet && (
        <p className="pse-micro flex items-center gap-2 pt-1" style={{ color: 'var(--pse-text-2)' }}>
          <Loader2 size={13} className="animate-spin" /> Waiting for the wallet…
        </p>
      )}
      {!walletConnectAvailable && injectedWallets.length === 0 && (
        <p className="pse-micro p-3 rounded-xl" style={{ background: 'var(--pse-inset)', color: 'var(--pse-warning)' }}>
          No wallet detected. Open PSEmine in your wallet&apos;s browser (Trust, MetaMask),
          install an extension, or configure WalletConnect for this deployment.
        </p>
      )}
    </div>
  );
};

/* ═══════════════════════════ PURCHASE FLOW ═══════════════════════════
 * States mirror the backend purchase lifecycle — success is never shown
 * before the backend verifies the transaction on-chain.
 *
 * Every displayed amount comes from ONE value: bnbExactFromWei(quote.bnbAmountWei).
 * The quote block, the payment summary and the pay button all render it, so
 * they cannot disagree (the previous defect showed 0.005273 in the quote while
 * the button rounded to 0.0053).
 *
 * Refresh recovery: an in-flight purchase is detected from the backend state
 * projection and RESUMED (original quote + payer binding) instead of creating a
 * second intent. The one-send-attempt protection in pseWallet is untouched. */
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
    sendPayment, ensurePaymentChain,
  } = usePSEMine();
  const { refresh } = usePseState();

  // Start on the wallet step when no wallet is connected yet; the modal opens
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
  // extension approval), the flow advances into the quote automatically. The
  // quote request effect above runs regardless of which step is visible.
  useEffect(() => {
    if (step === 'connect' && connectedWallet) setStep('quote');
  }, [step, connectedWallet]);

  // Safety: if the wallet disconnects mid-flow (wallet lock, WalletConnect
  // session end), no payment UI may remain active — drop back to connect and
  // drop the local binding (the server record keeps its payer; a reconnect of
  // the SAME wallet reuses it, a different wallet never inherits it).
  // The 'verifying' step intentionally stays: the transaction may already be
  // broadcast, so the backend verification result is still meaningful.
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

  // ── Pre-payment state (the checklist the pay button obeys) ─────────────────
  const requiredChainId = quote?.chainId || 56;
  const networkName = quote?.network || 'BNB Smart Chain';
  // An address remembered for this ACCOUNT is not a usable payer: signing needs
  // a live EIP-1193 provider in THIS browser. Without one the payment path can
  // only dead-end at the signature prompt, so it is reported (and blocked) as
  // "reconnect required" instead of being drawn as a connected wallet.
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
    if (chainUnknown) return `Your wallet\u2019s network could not be read. Reconnect the wallet, or switch it to ${networkName} (chain ${requiredChainId}), before paying.`;
    if (wrongChain) return `Switch your wallet to ${networkName} (chain ${requiredChainId}) — chain ${walletChainId} cannot be verified.`;
    if (!quoteValid) return 'The quote expired. Refresh it to continue — the backend will not accept a stale quote.';
    if (!ownershipOk) return `Maximum ownership reached for ${tool.name}.`;
    return null;
  })();
  const payBlocked = blockedReason !== null;

  const switchChain = async () => {
    const ok = await ensurePaymentChain(requiredChainId);
    if (ok) {
      toast.success(`Wallet switched to ${networkName}.`);
    } else {
      toast.error(`Switch your wallet to ${networkName} in the wallet app — the request was refused or unsupported.`);
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
   *
   * ORDER IS THE POINT: quote → BIND PAYER → chain assertion → sign → submit
   * hash. The purchase is bound to the connected wallet server-side before the
   * wallet is ever asked to sign, so a mid-flow wallet change cannot become the
   * payer of someone else's quote — and the backend rejects the mismatch
   * against the on-chain sender either way.
   */
  const payNow = async () => {
    if (!quote) return;
    if (!connectedWallet || !EVM.test(connectedWallet)) {
      setStep('connect');
      toast.error('Connect a valid BNB Smart Chain wallet first.');
      return;
    }
    // A payment may only be attempted while its state is NOT_SUBMITTED. After
    // an ambiguous send (UNKNOWN_SUBMISSION_STATE) — or once a hash exists —
    // nothing here will drive eth_sendTransaction again.
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

      // 2. The wallet about to sign must still be the bound payer. If the user
      //    switched wallets after the quote, we stop here: paying from B would
      //    either be rejected as WALLET_MISMATCH or, worse, be paid and not
      //    attributed. No transaction is sent from the wrong wallet.
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

      // 3. NETWORK ASSERTION — fail-closed, through the ACTIVE provider (injected
      //    or WalletConnect). The backend verifier only ever reads BSC, so a
      //    transaction signed on any other chain can never be verified. If the
      //    switch is refused or unverifiable, nothing is sent.
      const chainOk = await ensurePaymentChain(quote.chainId || 56);
      if (!chainOk) {
        setStep('pay');
        toast.error(`Switch your wallet to ${networkName} before paying.`);
        return;
      }

      // 4. to + value come VERBATIM from the server quote; from is the BOUND
      //    payer. The frontend cannot substitute a recipient or amount — and the
      //    backend independently re-verifies all of it from the chain record.
      //    Fail-closed: a quote without the exact wei string is never paid from.
      const wei = quote.bnbAmountWei;
      if (!wei || !/^[0-9]+$/.test(String(wei))) {
        throw new Error('The server quote is missing its exact BNB amount. Request a new quote.');
      }

      // 5. EXACTLY ONE broadcast attempt. An ambiguous result stops here as
      //    PAYMENT_SUBMISSION_UNCERTAIN — it is never retried or resent through
      //    another method.
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Purchase ${tool.name}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step === 'verifying' ? undefined : onClose} />
      <div className="pse-scope relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border sm:rounded-2xl"
        style={{ background: 'var(--pse-surface)', borderColor: 'var(--pse-line-strong)' }}>

        {/* Header + stepper */}
        <div className="sticky top-0 z-10 border-b" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
          <div className="flex items-center justify-between gap-3 p-5 pb-3">
            <div>
              <p className="pse-eyebrow">Purchase</p>
              <p className="pse-h3 mt-0.5">{tool.name} · <span className="pse-num">{gbp(tool.purchasePriceGBP)}</span></p>
            </div>
            <button onClick={onClose} disabled={step === 'verifying' && !showingRecovery} className="pse-btn pse-btn-ghost pse-btn-sm" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-5 pb-4">
            {STEP_ORDER.map((s, i) => (
              <React.Fragment key={s.id}>
                <span className={cn('pse-step', i < stepIndex ? 'pse-step-done' : i === stepIndex ? 'pse-step-active' : '')}>
                  {i < stepIndex ? '✓' : i + 1}
                </span>
                <span className="pse-micro hidden sm:inline" style={{ color: i === stepIndex ? 'var(--pse-text)' : 'var(--pse-text-3)' }}>
                  {s.label}
                </span>
                {i < STEP_ORDER.length - 1 && <span className="h-px flex-1" style={{ background: 'var(--pse-line)' }} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="p-5">
          {/* STEP: recovered purchase — the transaction was already submitted */}
          {showingRecovery && resume?.kind === 'submitted' && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-blue)' }}>
                  <Clock size={22} style={{ color: 'var(--pse-blue)' }} />
                </div>
                <p className="pse-h2" style={{ fontSize: 20 }}>
                  {resume.purchase.status === 'confirming' ? 'Confirming payment' : 'Transaction submitted'}
                </p>
                <p className="pse-caption max-w-sm">
                  {tool.name} — a transaction was submitted for this purchase and the backend is verifying it on BNB
                  Smart Chain. This state was recovered from the backend after your refresh, so no new purchase was created.
                </p>
                {resume.purchase.transactionHash && (
                  <a href={`https://bscscan.com/tx/${resume.purchase.transactionHash}`} target="_blank" rel="noreferrer"
                    className="pse-micro inline-flex items-center gap-1.5 font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
                    <ExternalLink size={12} /> View {shortHash(resume.purchase.transactionHash)} on BscScan
                  </a>
                )}
                <div className="pse-inset flex items-start gap-2.5 p-3.5 text-left">
                  <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
                  <p className="pse-micro">
                    The backend needs a few block confirmations before the tool activates. Do not send the
                    payment again — the same transaction hash is reused for every verification check.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button
                  onClick={() => void recheckRecovered()}
                  disabled={rechecking || !resume.purchase.transactionHash}
                  className="pse-btn pse-btn-primary flex-1 justify-center py-3"
                >
                  {rechecking ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                  {rechecking ? 'Checking…' : 'Check verification again'}
                </button>
                <button onClick={onClose} className="pse-btn pse-btn-secondary flex-1 justify-center py-3">Close</button>
              </div>
            </div>
          )}

          {/* STEP: connect — shown whenever no wallet is connected yet */}
          {!showingRecovery && step === 'connect' && <WalletConnectStep />}

          {/* STEP: quote */}
          {!showingRecovery && step === 'quote' && (
            quoteLoading || !quote ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--pse-blue)' }} />
                <p className="pse-caption">Requesting a live BNB quote from the server…</p>
              </div>
            ) : (
              <div className="space-y-4">
                {resume?.kind === 'expired' && (
                  <div className="pse-inset flex items-start gap-2.5 p-3.5" style={{ borderColor: 'var(--pse-warning)' }}>
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
                    <p className="pse-micro">
                      Your previous quote expired — BNB pricing has changed, so the earlier purchase could not be
                      completed. A fresh quote is prepared below; the earlier record is kept for audit and was not rewritten.
                    </p>
                  </div>
                )}

                <div className="pse-inset p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="pse-caption">Fixed price</span>
                    <span className="pse-num pse-fig-md">{gbp(quote.gbpPrice)}</span>
                  </div>
                  <div className="pse-divider my-3.5" />
                  <div className="flex items-baseline justify-between">
                    <span className="pse-caption">You pay (exact amount)</span>
                    <span className="pse-num pse-fig-md" style={{ color: 'var(--pse-cyan)' }}>
                      {exactBnb} BNB
                    </span>
                  </div>
                  <p className="pse-micro mt-3">
                    {quote.exchangeRateBNBGBP > 0 && <>Rate: 1 BNB = £{Number(quote.exchangeRateBNBGBP).toFixed(2)} · </>}
                    Quote {shortHash(quote.quoteId, 8)}
                  </p>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between pse-caption">
                    <span style={{ color: 'var(--pse-text-2)' }}>Quote expires in</span>
                    <span className="pse-mono pse-num" style={{ color: secondsLeft < 120 ? 'var(--pse-warning)' : 'var(--pse-text)' }}>{mm}:{ss}</span>
                  </div>
                  <Meter value={meterPct} tone={secondsLeft < 120 ? 'warning' : 'blue'} label="Quote validity" />
                  <p className="pse-micro mt-2">
                    The quoted BNB amount is fixed for this window so the GBP price you pay never drifts.
                    {secondsLeft === 0 && ' This quote has expired — refresh it before paying.'}
                  </p>
                </div>

                <div className="pse-inset flex items-start gap-2.5 p-3.5">
                  <Gauge size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-cyan)' }} />
                  <p className="pse-micro">
                    Adds <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(tool.hourlyRateGBP)}</span> of capacity.
                    You will own {owned} of {tool.maxPerUser} after this purchase.
                    {' '}
                    {(tool.operating?.model === 'continuous')
                      ? 'Elite mines continuously — no manual session restarts.'
                      : 'This tier mines in sessions: when a session ends, mining stops until you restart the tool.'}
                  </p>
                </div>

                {owned >= tool.maxPerUser ? (
                  <p className="pse-caption rounded-xl p-3 text-center" style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
                    Maximum ownership for this tool reached.
                  </p>
                ) : !walletLive ? (
                  <button onClick={() => setStep('connect')} className="pse-btn pse-btn-primary w-full justify-center py-3">
                    <Wallet size={15} /> {connectedWallet ? 'Reconnect your wallet to continue' : 'Connect a wallet to continue'}
                  </button>
                ) : !quoteValid ? (
                  <button onClick={refreshQuoteNow} className="pse-btn pse-btn-primary w-full justify-center py-3">
                    <RefreshCcw size={15} /> Refresh quote
                  </button>
                ) : (
                  <button onClick={() => setStep('pay')} className="pse-btn pse-btn-primary w-full justify-center py-3">
                    Continue to payment <ChevronRight size={15} />
                  </button>
                )}
                {connectedWallet && (
                  <p className="pse-micro text-center">Paying from <span className="pse-mono">{shortAddr(connectedWallet)}</span></p>
                )}
              </div>
            )
          )}

          {/* STEP: pay */}
          {!showingRecovery && step === 'pay' && quote && (
            <div className="space-y-4">
              {resume?.kind === 'live' && (
                <div className="pse-inset flex items-start gap-2.5 p-3.5">
                  <Clock size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
                  <p className="pse-micro">
                    Resuming your pending purchase — the original quote and payment wallet are unchanged,
                    and no second purchase was created.
                  </p>
                </div>
              )}

              {/* Confirmation summary — everything the signature will commit to */}
              <div className="pse-inset p-5">
                <p className="pse-eyebrow mb-3">Payment summary</p>
                <div className="space-y-2.5">
                  <SummaryRow k="Tool" v={tool.name} />
                  <SummaryRow k="Price" v={gbp(tool.purchasePriceGBP)} />
                  <SummaryRow k="You pay" v={`${exactBnb} BNB`} emphasis />
                  <SummaryRow k="Network" v={networkName} sub={`chain ${requiredChainId}`} />
                  <SummaryRow k="Payment wallet" v={boundPayer ? shortAddr(boundPayer) : (connectedWallet ? shortAddr(connectedWallet) : '—')} mono />
                  <SummaryRow k="Receiving wallet" v={shortAddr(quote.receiverWallet)} mono />
                  <SummaryRow k="Quote expires" v={`${mm}:${ss}`} mono />
                </div>
                <div className="pse-divider my-3.5" />
                <div>
                  <p className="pse-eyebrow mb-1.5">You pay exactly</p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="pse-num pse-fig-md" style={{ color: 'var(--pse-cyan)' }}>{exactBnb} BNB</span>
                    <CopyField value={exactBnb} display="Copy amount" label="BNB amount" />
                  </div>
                  <p className="pse-micro mt-2" style={{ color: 'var(--pse-warning)' }}>
                    Send the exact amount — underpayments are detected and will not activate a tool.
                  </p>
                </div>
                <div className="pse-divider my-3.5" />
                <div className="space-y-2.5">
                  <div>
                    <p className="pse-eyebrow mb-1.5">Campaign receiving wallet</p>
                    <CopyField value={quote.receiverWallet} display={shortAddr(quote.receiverWallet)} label="receiving wallet" fullWidth />
                    <p className="pse-micro mt-2">Network: {networkName} (chain {requiredChainId}). Verify the full address in your wallet before sending.</p>
                  </div>
                  {boundPayer && (
                    <div>
                      <p className="pse-eyebrow mb-1.5">Payment wallet (bound payer)</p>
                      <CopyField value={boundPayer} display={shortAddr(boundPayer)} label="payer wallet" fullWidth />
                      <p className="pse-micro mt-2">Only this wallet can complete this purchase — the backend compares the on-chain sender against it.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pre-payment checklist — exactly what the Pay button requires */}
              <div className="pse-inset p-4">
                <p className="pse-eyebrow mb-2">Before you pay</p>
                <ul className="space-y-1.5">
                  <ChecklistItem
                    ok={walletLive && Boolean(connectedWallet && EVM.test(connectedWallet))}
                    warn={Boolean(connectedWallet) && !walletLive}
                    label={!connectedWallet
                      ? 'Connect a wallet'
                      : walletLive
                        ? `Wallet connected — ${shortAddr(connectedWallet)}`
                        : `Not connected in this browser — ${shortAddr(connectedWallet)} is only the remembered payer; reconnect it to sign`}
                  />
                  <ChecklistItem
                    ok={payerAligned}
                    warn={walletChanged}
                    label={walletChanged
                      ? `Wallet changed — this purchase is locked to ${shortAddr(boundPayer)}`
                      : boundPayer
                        ? `Payer binding verified — only ${shortAddr(boundPayer)} can complete this purchase`
                        : 'Payer is bound to this wallet before anything is signed'}
                  />
                  <ChecklistItem
                    ok={onRequiredChain && walletLive}
                    warn={wrongChain || (walletLive && chainUnknown)}
                    label={!walletLive
                      ? `Network verified once the wallet is reconnected — must be ${networkName} (chain ${requiredChainId})`
                      : onRequiredChain
                        ? `${networkName} (chain ${requiredChainId})`
                        : chainUnknown
                          ? `Network unreadable — reconnect or switch to ${networkName} (chain ${requiredChainId})`
                          : `Wrong network — wallet is on chain ${walletChainId}`}
                  />
                  <ChecklistItem ok={quoteValid} warn={!quoteValid} label={quoteValid ? `Quote valid — expires in ${mm}:${ss}` : 'Quote expired — refresh before paying'} />
                  <ChecklistItem ok={ownershipOk} warn={!ownershipOk} label={ownershipOk ? `Ownership available — ${owned} / ${tool.maxPerUser} owned` : `Ownership limit reached (${tool.maxPerUser})`} />
                </ul>
              </div>

              {/* Wallet swapped mid-purchase: the payer binding is never replaced */}
              {walletChanged && (
                <div className="pse-inset flex items-start gap-2.5 p-3.5" style={{ borderColor: 'var(--pse-danger)' }}>
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-danger)' }} />
                  <div className="min-w-0">
                    <p className="pse-caption font-semibold" style={{ color: 'var(--pse-danger)' }}>Wallet changed</p>
                    <p className="pse-micro mt-0.5">
                      This purchase is locked to <span className="pse-mono">{shortAddr(boundPayer)}</span>. Reconnect that
                      wallet to pay — the connected wallet will not replace the payer. If you want to pay with this
                      wallet instead, wait for the quote window to lapse and start a new purchase.
                    </p>
                  </div>
                </div>
              )}

              {/* Network warning is state-aware: absent on BSC, actionable elsewhere */}
              {connectedWallet && wrongChain && (
                <div className="pse-inset flex items-start gap-2.5 p-3.5" style={{ borderColor: 'var(--pse-warning)' }}>
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
                  <div className="min-w-0 flex-1">
                    <p className="pse-caption font-semibold" style={{ color: 'var(--pse-warning)' }}>Wrong network</p>
                    <p className="pse-micro mt-0.5">
                      This payment must be sent on {networkName} (chain {requiredChainId}) — your wallet is on chain {walletChainId},
                      and a transaction signed elsewhere can never be verified.
                    </p>
                    <button onClick={() => void switchChain()} className="pse-btn pse-btn-secondary pse-btn-sm mt-2">
                      Switch to BNB Smart Chain
                    </button>
                  </div>
                </div>
              )}
              {connectedWallet && onRequiredChain && (
                <div className="pse-inset flex items-center gap-2 p-3">
                  <ShieldCheck size={14} className="shrink-0" style={{ color: 'var(--pse-success)' }} />
                  <p className="pse-micro">Wallet is on {networkName} (chain {requiredChainId}).</p>
                </div>
              )}

              <button
                onClick={() => void payNow()}
                disabled={payBlocked}
                className={cn('pse-btn w-full justify-center py-3.5', payBlocked ? 'pse-btn-secondary' : 'pse-btn-primary')}
              >
                <Wallet size={15} /> Open wallet &amp; pay {exactBnb} BNB
              </button>
              {payBlocked && (
                <p className="pse-micro text-center" style={{ color: 'var(--pse-warning)' }}>{blockedReason}</p>
              )}
              {!walletLive && (
                <button onClick={() => setStep('connect')} className="pse-btn pse-btn-secondary w-full justify-center py-3">
                  <Wallet size={15} /> {connectedWallet ? 'Reconnect this wallet' : 'Connect a wallet'}
                </button>
              )}
              <button onClick={() => (quoteValid ? setStep('quote') : refreshQuoteNow())} className="pse-btn pse-btn-ghost w-full justify-center">
                {quoteValid ? 'Back to quote' : 'Refresh quote'}
              </button>

              <div className="pse-inset flex items-start gap-2.5 p-3.5">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-cyan)' }} />
                <p className="pse-micro">
                  After you send, the backend verifies your transaction on-chain — sender, recipient, exact amount, and
                  confirmation depth — before the tool activates. This usually takes under a minute.
                </p>
              </div>
            </div>
          )}

          {/* STEP: verifying */}
          {!showingRecovery && step === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-14">
              <Loader2 size={26} className="animate-spin" style={{ color: 'var(--pse-blue)' }} />
              <p className="pse-h3">Verifying on BNB Smart Chain</p>
              <p className="pse-micro max-w-xs text-center">
                Confirming sender, recipient, amount and network confirmations. Don&apos;t close this window.
              </p>
              <span className="pse-micro pse-mono" style={{ color: 'var(--pse-text-2)' }}>
                {submissionState} · {SUBMISSION_LABEL[submissionState]}
              </span>
            </div>
          )}

          {/* STEP: result */}
          {!showingRecovery && step === 'result' && result && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={result.ok
                    ? { background: 'var(--pse-inset)', border: '1px solid var(--pse-success)' }
                    : result.recheckable
                      ? { background: 'var(--pse-inset)', border: '1px solid var(--pse-blue)' }
                      : { background: 'var(--pse-inset)', border: '1px solid var(--pse-danger)' }}>
                  {result.ok
                    ? <Check size={22} style={{ color: 'var(--pse-success)' }} />
                    : result.recheckable
                      ? <Clock size={22} style={{ color: 'var(--pse-blue)' }} />
                      : <X size={22} style={{ color: 'var(--pse-danger)' }} />}
                </div>
                <p className="pse-h2" style={{ fontSize: 20 }}>
                  {result.ok
                    ? 'Tool activated'
                    : result.recheckable
                      ? 'Confirming payment'
                      : result.uncertain
                        ? 'Payment submission uncertain'
                        : 'Verification didn\u2019t complete'}
                </p>
                <p className="pse-caption max-w-sm">{result.message}</p>
                {result.uncertain && (
                  <div className="pse-inset flex items-start gap-2.5 p-3.5 text-left">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-danger)' }} />
                    <p className="pse-micro">
                      Nothing was sent twice and no tool was activated. Check your wallet&apos;s activity (or the address on
                      BscScan) for a pending transfer. If one exists, do not send again — keep its hash and the wallet that
                      sent it; support reconciles it from the on-chain record. If none exists, use{' '}
                      <span className="pse-mono">Start a new purchase</span> below.
                    </p>
                  </div>
                )}
                {result.hash && (
                  <a href={`https://bscscan.com/tx/${result.hash}`} target="_blank" rel="noreferrer"
                    className="pse-micro inline-flex items-center gap-1.5 font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
                    <ExternalLink size={12} /> View {shortHash(result.hash)} on BscScan
                  </a>
                )}
                {!result.ok && !result.recheckable && (
                  <div className="pse-inset flex items-start gap-2.5 p-3.5 text-left">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-warning)' }} />
                    <p className="pse-micro">
                      Nothing was activated and nothing was lost: unverified payments are recorded as recovery
                      evidence for manual review. That record exists so an administrator can reconcile it — it is not
                      an automatic activation.
                    </p>
                  </div>
                )}
                {result.ok && (
                  <div className="pse-inset flex items-start gap-2.5 p-3.5 text-left">
                    <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
                    <p className="pse-micro">
                      {(tool.operating?.model === 'continuous')
                        ? 'This tool mines continuously while the campaign is active — there is no manual session restart.'
                        : 'This tool now runs in mining sessions. When a session completes, mining stops until you restart it; each restart needs a short backend period before mining resumes.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <button onClick={onClose} className="pse-btn pse-btn-primary flex-1 justify-center py-3">
                  {result.ok ? 'Go to dashboard' : 'Close'}
                </button>
                {!result.ok && result.recheckable && result.hash && (
                  <button
                    onClick={() => void recheckVerification(result.hash as string)}
                    disabled={rechecking}
                    className="pse-btn pse-btn-secondary flex-1 justify-center py-3"
                  >
                    {rechecking ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
                    {rechecking ? 'Checking…' : 'Check verification again'}
                  </button>
                )}
                {!result.ok && !result.recheckable && (
                  <button onClick={restartPurchase} className="pse-btn pse-btn-secondary flex-1 justify-center py-3">
                    {result.uncertain ? 'Start a new purchase' : 'Try again with a new quote'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/** One row of the pre-signature payment summary. */
function SummaryRow({ k, v, sub, mono, emphasis }: { k: string; v: string; sub?: string; mono?: boolean; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="pse-caption" style={{ color: 'var(--pse-text-2)' }}>{k}</span>
      <span className={cn('pse-caption', mono && 'pse-mono')} style={{ color: emphasis ? 'var(--pse-cyan)' : 'var(--pse-text)', fontWeight: emphasis ? 600 : 500 }}>
        {v}
        {sub && <span className="pse-micro" style={{ color: 'var(--pse-text-3)' }}> · {sub}</span>}
      </span>
    </div>
  );
}

export default PSEMineTools;
