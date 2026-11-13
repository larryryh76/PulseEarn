import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/psemine-tools-payment-redesign.css';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState } from '../../components/psemine/PseStateProvider';
import {
  type PsePaymentSubmissionState,
  type PseNetworkFeeEstimate,
  canRetryPayment,
  isSessionUnavailable,
  isSubmissionUncertain,
  resolvePaymentPayer,
} from '../../engines/psemine/pseWallet';
import { type PsePendingPurchase, type PseStateTool } from '../../engines/psemine/pseMineApi';
import { formatWalletDiagnostics, recordWalletStage } from '../../engines/psemine/pseWalletTrace';
import { PSEMineEngine } from '../../engines/psemine/PSEMineEngine';
import { PSEMineToolDefinition, PSEMineQuote, PSEMINE_CONSTANTS, LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import {
  bnbExactFromWei, copyText, gbp, gbpHour, nowMs, shortAddr, shortHash,
  CYCLE_STATE_MAP, cycleStateView, operatingModelView,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseErrorNotice, PseNotice, PseLoading, PseFacts, PseFact,
  PsePage, PseSection, PseSkeleton, PseSkeletonRows, PseStat, PseStatBar,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

/**
 * The mining tool marketplace — the canonical catalogue.
 *
 * The page has one owner: browsing and buying equipment. It groups the units
 * this account actually owns, the purchase that is in flight (if any) and the
 * available catalogue, and it states each product's fixed price, capacity and
 * ownership limit as a compact specification row rather than a promotional
 * card.
 *
 * The purchase behaviour is preserved exactly: quote → bind payer → chain
 * assertion → sign → submit → on-chain verification → activation, with refresh
 * recovery of an in-flight intent. The UI never asserts success before the
 * backend verifies, and every displayed amount comes from the server quote's
 * exact wei value (bnbExactFromWei).
 */
const EVM = /^0x[0-9a-fA-F]{40}$/;

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const dutyOf = (t: PSEMineToolDefinition) => (t.operating?.model === 'continuous' ? 'continuous' as const : 'session' as const);

const timeRemaining = (value: string | null | undefined, now: number) => {
  if (!value) return null;
  const ms = Date.parse(value) - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return 'Due now';
  const total = Math.ceil(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days) return `${days}d ${hours}h remaining`;
  if (hours) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m ${seconds}s remaining`;
};

/** Server timestamp for the BNB rate captured with this quote. */
const quoteStamp = (value: string): string => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Earlier quote';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London',
  }).format(date) + ' UK';
};

/** Purpose-drawn equipment faces: each tier has its own chassis geometry, not a reused stock icon. */
const ToolArt: React.FC<{ tier: number; name: string; compact?: boolean }> = ({ tier, name, compact = false }) => {
  const accent = tier === 1 ? '#8fa5bf' : tier === 2 ? '#9a94f5' : tier === 3 ? '#71b8cf' : '#d1b27c';
  return (
    <div className={`pse-tool-art pse-tool-art--tier-${tier}${compact ? ' pse-tool-art--compact' : ''}`} role="img" aria-label={`${name} equipment illustration`}>
      <svg viewBox="0 0 160 112" aria-hidden="true" focusable="false">
        <path d="M10 96H150" stroke="#293448" strokeWidth="1" />
        <path d="M19 91L80 102L141 91" fill="none" stroke="#293448" strokeWidth="1" />
        {tier === 1 && <>
          <path d="M44 30L80 18L116 30L80 42Z" fill="#273447" stroke={accent} strokeOpacity=".85" />
          <path d="M44 30V76L80 91V42Z" fill="#172130" stroke={accent} strokeOpacity=".65" />
          <path d="M116 30V76L80 91V42Z" fill="#101722" stroke={accent} strokeOpacity=".8" />
          <path d="M55 39L80 49L105 39M55 49L80 59L105 49M55 59L80 69L105 59" fill="none" stroke={accent} strokeOpacity=".65" />
          <circle cx="80" cy="31" r="4" fill={accent} />
        </>}
        {tier === 2 && <>
          <path d="M31 34L67 22L94 31L58 44Z" fill="#273447" stroke={accent} />
          <path d="M31 34V73L58 85V44Z" fill="#172130" stroke={accent} strokeOpacity=".7" />
          <path d="M94 31V70L58 85V44Z" fill="#101722" stroke={accent} strokeOpacity=".8" />
          <path d="M67 22L103 11L130 21L94 31Z" fill="#344057" stroke={accent} />
          <path d="M94 31L130 21V60L94 70Z" fill="#101722" stroke={accent} strokeOpacity=".8" />
          <path d="M103 11V49L130 60M67 22V61L94 70" fill="none" stroke={accent} strokeOpacity=".65" />
          <path d="M42 49L55 54M42 58L55 63M105 32L119 28M105 41L119 37" stroke={accent} strokeWidth="2" />
        </>}
        {tier === 3 && <>
          {[0,1,2,3].map((n) => {
            const x = 39 + (n % 2) * 43, y = 22 + Math.floor(n / 2) * 31;
            return <g key={n}>
              <path d={`M${x} ${y+5}l19 -6l17 6l-19 7z`} fill="#344057" stroke={accent} strokeOpacity=".9" />
              <path d={`M${x} ${y+5}v21l17 7V${y+12}z`} fill="#172130" stroke={accent} strokeOpacity=".6" />
              <path d={`M${x+36} ${y+5}v21l-19 7V${y+12}z`} fill="#101722" stroke={accent} strokeOpacity=".75" />
              <path d={`M${x+8} ${y+12}l9 4l9 -4`} fill="none" stroke={accent} strokeWidth="1.5" />
            </g>;
          })}
        </>}
        {tier === 4 && <>
          <path d="M26 28L80 12L134 28L80 44Z" fill="#344057" stroke={accent} />
          <path d="M26 28V78L80 96V44Z" fill="#172130" stroke={accent} strokeOpacity=".8" />
          <path d="M134 28V78L80 96V44Z" fill="#101722" stroke={accent} strokeOpacity=".9" />
          {[0,1,2,3].map(n => <g key={n}>
            <path d={`M${43+n*18} 37v43`} stroke={accent} strokeOpacity=".7" strokeWidth="2" />
            <path d={`M${43+n*18} 47l8 -3M${43+n*18} 58l8 -3M${43+n*18} 69l8 -3`} stroke={accent} strokeOpacity=".55" />
          </g>)}
          <path d="M38 28L80 16L122 28" fill="none" stroke={accent} strokeWidth="2" />
        </>}
        <path d="M22 89l7 -2M131 87l7 -2" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="pse-tool-art-code">PSE / T{tier}</span>
    </div>
  );
};

const OwnedToolRow: React.FC<{
  tool: PseStateTool;
  now: number;
  maintaining: boolean;
  onMaintain: () => void;
}> = ({ tool, now, maintaining, onMaintain }) => {
  const def = TOOLS.find(item => item.id === (tool.toolId || '')) || TOOLS.find(item => item.name === tool.toolName);
  const stateKey = tool.cycleState || tool.status || '';
  const cycle = CYCLE_STATE_MAP[stateKey] ? cycleStateView(stateKey) : {
    label: 'State not reported',
    description: 'The backend has not reported this unit’s operating state.',
    live: false,
  };
  const model = operatingModelView(tool.operatingModel || def?.operating.model);
  const isContinuous = (tool.operatingModel || def?.operating.model) === 'continuous';
  const maintenanceAvailable = !isContinuous && (tool.maintenanceRequired === true || stateKey === 'cycle_complete' || stateKey === 'maintenance_required');
  const nextStart = tool.restartResumesAt;
  const countdown = timeRemaining(nextStart || tool.cycleEndsAt, now);
  return (
    <li className="pse-owned-tool" key={tool.id}>
      <ToolArt tier={def?.tier || 1} name={tool.toolName || def?.name || 'Mining tool'} compact />
      <div className="pse-owned-tool-main">
        <div className="pse-owned-tool-titleline">
          <strong>{tool.toolName || def?.name || tool.toolId || 'Mining tool'}</strong>
          <span className={`pse-tool-state${cycle.live ? ' is-live' : maintenanceAvailable ? ' is-attention' : ''}`} title={cycle.description}>{cycle.label}</span>
        </div>
        <p className="pse-owned-tool-sub">{model.label} · {typeof tool.hourlyRateGBP === 'number' ? gbpHour(tool.hourlyRateGBP) : def ? gbpHour(def.hourlyRateGBP) : '—'} capacity</p>
        <div className="pse-owned-tool-facts">
          <span>Cycle <b>{typeof tool.cycleIndex === 'number' ? `#${tool.cycleIndex}` : '—'}</b></span>
          <span>{nextStart ? 'Restart' : 'Cycle'} <b>{countdown || (isContinuous ? 'Campaign-led' : 'Not scheduled')}</b></span>
          <span>Restart delay <b>{isContinuous ? 'Not required' : typeof tool.restartDelayMinutes === 'number' ? `${tool.restartDelayMinutes} min` : def?.operating.restartDelayMinutes ? `${def.operating.restartDelayMinutes} min default` : '—'}</b></span>
          <span>Next step <b>{maintenanceAvailable ? 'Maintenance' : isContinuous ? 'Automatic' : stateKey === 'restarting' ? 'Wait for restart' : stateKey === 'active' ? 'Operating' : 'Check status'}</b></span>
        </div>
        {maintenanceAvailable && (
          <div className="pse-owned-tool-maintenance">
            <span>Your 24-hour session has ended. Maintain free within 6 hours to schedule the next session. The 10-minute restart delay does not earn rewards.</span>
            <button type="button" className="pse-btn pse-btn--secondary pse-btn--sm" onClick={onMaintain} disabled={maintaining}>
              {maintaining ? 'Maintaining…' : 'Maintain & restart · Free'}
            </button>
          </div>
        )}
        {tool.lastAccruedAt && <p className="pse-owned-tool-updated">Last accrual checkpoint: {new Date(tool.lastAccruedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p>}
      </div>
    </li>
  );
};

type FlowStep = 'details' | 'connect' | 'quote' | 'pay' | 'verifying' | 'result';

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
  { id: 'details', label: 'Details' },
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
  const [clockNow, setClockNow] = useState(nowMs());
  const [maintainingId, setMaintainingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(nowMs()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const maintainTool = async (ownershipId: string) => {
    if (maintainingId) return;
    setMaintainingId(ownershipId);
    try {
      const result = await PSEMineEngine.maintainTool(ownershipId);
      if (result.success) {
        toast.success(result.resumesAt
          ? `Maintenance accepted. Next session scheduled for ${new Date(result.resumesAt).toLocaleTimeString('en-GB', { timeZone: 'Europe/London' })}.`
          : 'Maintenance accepted. Syncing the tool’s next state.');
        await refresh();
      } else {
        toast.error(result.error || 'Maintenance could not be completed. Sync and try again.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Maintenance could not be completed.');
    } finally {
      setMaintainingId(null);
    }
  };

  const receiverAddress = String(campaign?.receiverWalletAddress || '').trim();
  // The context is backed by the live campaign document. Mirror the backend's
  // strict confirmation predicate for display; the quote/intent APIs enforce it again.
  const receiverWalletReady = campaign?.purchaseReady === true || (
    campaign?.receiverWalletConfigured === true
    && Boolean(campaign?.receiverWalletConfiguredAt)
    && Boolean(campaign?.receiverWalletConfiguredBy)
    && /^0x[a-fA-F0-9]{40}$/.test(receiverAddress)
    && !/^0x0{40}$/i.test(receiverAddress)
  );
  const purchaseOpen = receiverWalletReady && campaign?.purchaseEnabled !== false && campaign?.status === 'active';
  const walletSetupRequired = campaign?.status === 'active' && campaign?.purchaseEnabled !== false && !receiverWalletReady;
  // Every ownership the backend reports is listed: filtering to "operating"
  // statuses hid settling/ended tools and under-reported equipment (merged from
  // remote, which found the same defect).
  const ownedTools = useMemo(() => state?.tools ?? [], [state?.tools]);

  // An unreported capacity prints as an em dash, never as £0.00 — the backend
  // has not said the account holds zero, it has said nothing yet.
  const toolCapacity = typeof state?.user?.toolCapacityGBPPerHour === 'number'
    ? state.user.toolCapacityGBPPerHour
    : typeof pseUser?.toolCapacityGBPPerHour === 'number' ? pseUser.toolCapacityGBPPerHour : null;
  const headroom = toolCapacity !== null
    ? Math.max(0, PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR - toolCapacity)
    : null;
  const toolCapacityLabel = toolCapacity !== null ? gbpHour(toolCapacity) : '—';
  const headroomLabel = headroom !== null ? gbpHour(headroom) : '—';
  // Ownership is counted from the backend's ownership records, not from the
  // catalogue and not from the account's cached counts: a record is proof.
  const tierSlotsLeft = TOOLS.reduce(
    (acc, t) => acc + Math.max(0, t.maxPerUser - ownedTools.filter(o => (o.toolId || '') === t.id).length),
    0,
  );

  // ══ Refresh recovery: which pending purchase deserves the top notice ══════
  //   1. an IN-FLIGHT submission (transaction_submitted / confirming);
  //   2. otherwise the newest quote window (a live one is resumable as-is).
  const pendingPurchase = useMemo(() => {
    const rows = state?.pendingPurchases || [];
    if (rows.length === 0) return null;
    const rank = (p: PsePendingPurchase) => {
      const needsReview = p.status === 'manual_review';
      const inFlight = p.status === 'transaction_submitted' || p.status === 'confirming' || p.status === 'submission_uncertain';
      const parsed = p.expiresAt ? Date.parse(p.expiresAt) : NaN;
      return { needsReview, inFlight, exp: Number.isNaN(parsed) ? 0 : parsed };
    };
    return [...rows].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra.needsReview !== rb.needsReview) return ra.needsReview ? -1 : 1;
      if (ra.inFlight !== rb.inFlight) return ra.inFlight ? -1 : 1;
      return rb.exp - ra.exp;
    })[0];
  }, [state?.pendingPurchases]);
  const pendingNeedsReview = pendingPurchase?.status === 'manual_review';
  const pendingInFlight = pendingPurchase?.status === 'transaction_submitted' || pendingPurchase?.status === 'confirming' || pendingPurchase?.status === 'submission_uncertain';
  const pendingQuoteLive = Boolean(
    pendingPurchase?.expiresAt && Date.parse(pendingPurchase.expiresAt) > nowMs(),
  );

  const toolsObjective = 'The catalogue of virtual campaign-capacity units. Each has a fixed GBP price and accounting rate; purchases are quoted and paid in BNB from your own wallet.';

  /* THE CATALOGUE IS PUBLIC; THE ACCOUNT'S SLOTS ARE NOT. The price list is a
     static definition, so it renders immediately and honestly — only the
     ownership, pending-purchase and capacity figures are still being read. That
     is why this page opens on its catalogue rather than on a loader. */
  if (loading && !state) {
    return (
      <PsePage title="Mining tools" objective={toolsObjective}>
        <PseNotice tone="info" title="Campaign equipment">
          <p>Choose from four virtual mining-capacity units. Each listing shows its fixed price, capacity, operating model and ownership limit. Payment is verified on BNB Smart Chain before activation.</p>
        </PseNotice>
      <PseStatBar cols={4}>
          {['Equipment owned', 'Tool capacity', 'Capacity headroom', 'Referral capacity'].map(label => (
            <PseStat key={label} label={label} value={<PseSkeleton width="5ch" height="1.0625rem" />} />
          ))}
        </PseStatBar>
        <PseSection title="Your equipment" meta="Reading ownership">
          <PseSkeletonRows rows={2} label="Loading your equipment" />
        </PseSection>
        <PseSection title="Available tools" meta="Reading purchase state">
          <PseSkeletonRows rows={4} label="Loading your purchase state" />
        </PseSection>
      </PsePage>
    );
  }
  if (error && !state) {
    return (
      <PsePage title="Mining tools" objective={toolsObjective}>
        <PseErrorNotice error={error} onRetry={() => void refresh()} retrying={refreshing} />
      </PsePage>
    );
  }

  const ownedByTool = (id: string) => ownedTools.filter(t => (t.toolId || '') === id).length;

  const purchasePending = purchasing && pendingPurchase?.toolId === purchasing.id ? pendingPurchase : null;

  return (
    <>
    <PsePage
      title="Mining tools"
      objective="Fixed-price campaign units. Pay in BNB; campaign capacity activates after on-chain verification."
      actions={<PseButton variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      <section className="pse-marketplace-intro" aria-labelledby="pse-marketplace-title">
        <div className="pse-marketplace-intro-copy">
          <p className="pse-marketplace-kicker">PSEMINE EQUIPMENT MARKETPLACE</p>
          <h2 id="pse-marketplace-title">Choose your mining capacity.</h2>
          <p>These are virtual campaign-capacity units, not physical mining hardware. Compare the four campaign units, review the fixed GBP price and capacity, then pay in BNB. Your tool activates only after on-chain verification.</p>
        </div>
        <div className="pse-marketplace-intro-state">
          <span className={'pse-marketplace-campaign-state' + (purchaseOpen ? ' is-open' : '')}>
            <span />{purchaseOpen ? 'Purchases open' : walletSetupRequired ? 'Wallet setup pending' : 'Purchases ' + (campaign?.status || 'unavailable')}
          </span>
          <span className="pse-marketplace-network">BNB SMART CHAIN</span>
        </div>
      </section>

      <dl className="pse-marketplace-summary" aria-label="Your equipment summary">
        <div><dt>Equipment owned</dt><dd>{ownedTools.length}<small> units</small></dd></div>
        <div><dt>Hourly tool capacity</dt><dd>{toolCapacityLabel}</dd></div>
        <div><dt>Capacity headroom</dt><dd>{headroomLabel}</dd></div>
        <div><dt>Available tool slots</dt><dd>{tierSlotsLeft}<small> slots</small></dd></div>
      </dl>

      {pendingPurchase && (
        <PseNotice tone="attention" title={pendingNeedsReview ? "Payment under manual review" : "Purchase in progress"}>
          {pendingNeedsReview
            ? `Your payment for ${pendingPurchase.toolName || pendingPurchase.toolId} has been recorded for admin review. Do not send another payment. Wait for the recovery case to be resolved.`
            : pendingInFlight
              ? `A payment for ${pendingPurchase.toolName || pendingPurchase.toolId} is being verified by the backend.`
              : pendingQuoteLive
                ? `You have a live quote for ${pendingPurchase.toolName || pendingPurchase.toolId} awaiting payment.`
                : `Your previous quote for ${pendingPurchase.toolName || pendingPurchase.toolId} expired — a fresh quote is required.`}
          <button
            type="button"
            className="pse-link"
            onClick={() => {
              const def = TOOLS.find(t => t.id === pendingPurchase.toolId);
              if (def) setPurchasing(def);
            }}
          >
            {pendingNeedsReview ? 'Open payment recovery' : 'Continue this purchase'}
          </button>
        </PseNotice>
      )}

      {walletSetupRequired && (
        <PseNotice tone="attention" title="Purchases temporarily disabled">
          Tool purchases are disabled until an admin configures and confirms the campaign receiving wallet. No payment can be started or accepted before this setup is complete.
        </PseNotice>
      )}

      {!purchaseOpen && !walletSetupRequired && (
        <PseNotice tone="attention" title="Purchases closed">
          The campaign status is {campaign?.status || 'scheduled'}. Nothing can be bought until the campaign is
          active again; existing equipment keeps its state and accrual rules.
        </PseNotice>
      )}

      <div className="pse-marketplace-layout">
        <section className="pse-marketplace-catalogue" id="pse-catalogue" aria-labelledby="pse-catalogue-title">
          <div className="pse-marketplace-heading">
            <div>
              <p className="pse-marketplace-kicker">01 / SELECT YOUR EQUIPMENT</p>
              <h2 id="pse-catalogue-title">Choose your tool</h2>
              <p>Compare the actual purchase price, hourly capacity and ownership limit. Select a tool to start checkout.</p>
            </div>
            <span className="pse-marketplace-count">{TOOLS.length} tool types</span>
          </div>

          <div className="pse-marketplace-products">
            {TOOLS.map((tool, index) => {
              const owned = ownedByTool(tool.id);
              const ownedRows = ownedTools.filter(item => (item.toolId || '') === tool.id);
              const activeOwned = ownedRows.some(item => (item.cycleState || item.status) === 'active');
              const pendingForTool = (state?.pendingPurchases || []).some(item => item.toolId === tool.id && ['created', 'awaiting_payment', 'transaction_submitted', 'confirming', 'submission_uncertain', 'manual_review'].includes(String(item.status)));
              const atLimit = owned >= tool.maxPerUser;
              const remaining = Math.max(0, tool.maxPerUser - owned);
              const continuous = dutyOf(tool) === 'continuous';
              const productState = activeOwned ? 'active' : pendingForTool ? 'pending' : atLimit ? 'locked' : owned > 0 ? 'owned' : purchaseOpen ? 'available' : 'unavailable';
              return (
                <article className="pse-product" key={tool.id} data-product-index={index + 1} data-state={productState} data-owned={owned > 0 ? 'true' : 'false'}>
                  <ToolArt tier={tool.tier} name={tool.name} />
                  <div className="pse-product-id">
                    <h3 className="pse-product-name">
                      {tool.name}
                      <span className="pse-rowitem-meta">
                        {continuous ? 'Continuous operation' : 'Session-based · restart required'}
                      </span>
                    </h3>
                    <p className="pse-product-desc">{tool.description}</p>
                    <span className="pse-product-tier">TIER {tool.tier} · {continuous ? 'Continuous campaign unit' : 'Session-based campaign unit'}</span>
                  </div>

                  <dl className="pse-product-specs">
                    <div className="pse-product-spec">
                      <dt>Purchase price</dt>
                      <dd>{gbp(tool.purchasePriceGBP)}</dd>
                    </div>
                    <div className="pse-product-spec">
                      <dt>Hourly capacity</dt>
                      <dd>{gbpHour(tool.hourlyRateGBP)}</dd>
                    </div>
                    <div className="pse-product-spec">
                      <dt>Owned</dt>
                      <dd>{owned} <span>/ {tool.maxPerUser}</span></dd>
                    </div>
                    <div className="pse-product-spec">
                      <dt>Session length</dt>
                      <dd>{continuous ? 'Continuous' : `${tool.operating.sessionDurationHours ?? 24} hours`}</dd>
                    </div>
                    <div className="pse-product-spec">
                      <dt>Restart delay</dt>
                      <dd>{continuous ? 'Not required' : `${tool.operating.restartDelayMinutes ?? 10} min`}</dd>
                    </div>
                  </dl>

                  <div className="pse-product-actions">
                    <span className="pse-product-avail" data-state={productState}>
                      {activeOwned
                        ? `${owned} owned · active`
                        : pendingForTool
                          ? 'Purchase pending verification'
                          : atLimit
                            ? 'Ownership limit reached'
                            : owned > 0
                              ? `${owned} owned · ${remaining} slot${remaining === 1 ? '' : 's'} available`
                              : purchaseOpen
                                ? `${remaining} slot${remaining === 1 ? '' : 's'} available`
                                : walletSetupRequired ? 'Wallet setup pending' : 'Campaign purchases closed'}
                    </span>
                    {atLimit ? (
                      <span className="pse-rowitem-meta">At account limit</span>
                    ) : (
                      <PseButton size="md" onClick={() => setPurchasing(tool)} disabled={!purchaseOpen}>
                        {purchaseOpen ? 'Buy Tool' : walletSetupRequired ? 'Unavailable' : 'Purchases closed'}
                      </PseButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="pse-marketplace-footnote">
            <strong>Operating model</strong>
            <span>Starter, Builder and Advanced run 24-hour sessions, with a free maintenance window and 10-minute restart. Elite runs continuously while campaign mining is active. Your owned-unit status always comes from the backend.</span>
          </div>
        </section>

        <aside className="pse-marketplace-rail">
          <section className="pse-marketplace-owned" aria-labelledby="pse-owned-title">
            <div className="pse-marketplace-rail-head">
              <div>
                <p className="pse-marketplace-kicker">Your account</p>
                <h2 id="pse-owned-title">Owned equipment</h2>
              </div>
              <span className="pse-marketplace-owned-count">{ownedTools.length}</span>
            </div>
            {ownedTools.length === 0 ? (
              <div className="pse-marketplace-empty">
                <span className="pse-marketplace-empty-mark" aria-hidden="true">—</span>
                <strong>No equipment yet</strong>
                <p>After payment verification, activated tools will appear here with their live cycle status.</p>
              </div>
            ) : (
              <ul className="pse-rowlist">
                {ownedTools.map(t => (
                  <OwnedToolRow
                    key={t.id}
                    tool={t}
                    now={clockNow}
                    maintaining={maintainingId === t.id}
                    onMaintain={() => void maintainTool(t.id)}
                  />
                ))}
              </ul>
            )}
            <Link to="/mine/dashboard" className="pse-marketplace-inline-link">View mining dashboard <span aria-hidden="true">↗</span></Link>
          </section>

          <section className="pse-marketplace-how" aria-labelledby="pse-how-title">
            <p className="pse-marketplace-kicker">Purchase protocol</p>
            <h2 id="pse-how-title">From quote to activation</h2>
            <p className="pse-marketplace-checkout-line">Quote <span>→</span> Wallet approval <span>→</span> On-chain verification <span>→</span> Tool activation</p>
          </section>
        </aside>
      </div>
    </PsePage>
    {purchasing && (
      <PurchaseFlow
        tool={purchasing}
        pending={purchasePending}
        onClose={() => { setPurchasing(null); void refresh(); }}
      />
    )}
    </>
  );
};

/* ── Purchase flow (logic preserved; presentation minimal) ──────────────
 * ORDER IS THE POINT: quote → bind payer → chain assertion → eth_sendTransaction → submit
 * hash. Refresh recovery resumes an existing intent with its ORIGINAL quote
 * and payer instead of creating a second one.
 * ═══════════════════════════════════════════════════════════════════════ */
const PurchaseFlow: React.FC<{ tool: PSEMineToolDefinition; pending: PsePendingPurchase | null; onClose: () => void }> = ({ tool, pending, onClose }) => {
  const {
    connectedWallet, walletChainId, walletTransport, pseUser, walletCorrelationId,
    requestQuote, activeQuote, clearQuote, bindPurchaseIntent, submitPurchaseTx,
    sendPayment, estimateNetworkFee, ensurePaymentChain, refreshWalletChain,
  } = usePSEMine();
  const { refresh } = usePseState();

  // Every catalogue selection opens a dedicated product-details view first.
  // Wallet connection and the server quote remain explicit next steps inside
  // this same dialog; a recovered purchase is advanced by the recovery effects.
  const [step, setStep] = useState<FlowStep>('details');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState('Preparing your wallet request…');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; message: string; hash?: string; uncertain?: boolean; recheckable?: boolean; diagnostic?: string } | null>(null);
  // Payer binding + submission state. The purchase is bound to a wallet BEFORE
  // anything is signed, and the submission state decides whether a retry is even
  // permitted (never after UNKNOWN_SUBMISSION_STATE).
  const [boundPayer, setBoundPayer] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [bindingError, setBindingError] = useState<string | null>(null);
  const [bindingRetry, setBindingRetry] = useState(0);
  const [submissionState, setSubmissionState] = useState<PsePaymentSubmissionState>('NOT_SUBMITTED');
  // Refresh recovery: the existing in-flight purchase for THIS tool, if any.
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [uncertainRecovery, setUncertainRecovery] = useState(() => {
    if (!pending) return false;
    try {
      const saved = JSON.parse(localStorage.getItem('psemine_uncertain_payment') || 'null') as { purchaseId?: string; transactionHash?: string } | null;
      const hasRecoverableHash = Boolean(saved?.transactionHash && /^0x[0-9a-fA-F]{64}$/.test(saved.transactionHash));
      return Boolean(saved?.purchaseId && saved.purchaseId === pending.purchaseId && !hasRecoverableHash);
    } catch { return false; }
  });
  const [confirmedNoTransaction, setConfirmedNoTransaction] = useState(false);
  const [feeEstimate, setFeeEstimate] = useState<PseNetworkFeeEstimate | null>(null);
  // A wallet can broadcast while the browser is closed, so PSEmine never saw
  // the hash. This lets the user paste the hash from their wallet and have the
  // server check it against this intent BEFORE attaching it.
  const [manualHash, setManualHash] = useState('');
  const [manualRecovering, setManualRecovering] = useState(false);
  const [manualHashError, setManualHashError] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // The purchase review is a true modal layer, not a full-page detour. Keep the
  // underlying console from scrolling and return keyboard focus to its opener.
  useEffect(() => {
    if (minimized) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (step === 'verifying') setMinimized(true);
        else onClose();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) {
          event.preventDefault();
          dialogRef.current?.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose, step, minimized]);

  /** Forget the local binding (expired quote, wallet disconnect, restart). */
  const resetBinding = useCallback(() => { setBoundPayer(null); setPurchaseId(null); }, []);


  // ── Refresh recovery (runs before the quote effect) ────────────────────────
  // A live awaiting_payment intent is resumed with its ORIGINAL quote and payer;
  // a submitted intent opens the verification-recovery panel; an expired one
  // falls through to a fresh quote (the backend supersedes the dead intent and
  // keeps the old record as audit evidence).
  useEffect(() => {
    if (confirmedNoTransaction || !pending || pending.toolId !== tool.id) return;

    // A wallet can return a real hash while the follow-up API request fails.
    // Recover that exact hash from this account's local evidence and re-submit
    // it to the idempotent backend endpoint before attempting verification.
    try {
      const saved = JSON.parse(localStorage.getItem('psemine_uncertain_payment') || 'null') as {
        purchaseId?: string; transactionHash?: string; payerWallet?: string;
      } | null;
      const savedHash = String(saved?.transactionHash || '').trim();
      const pendingHash = String(pending.transactionHash || '').trim();
      const recoveredHash = saved?.purchaseId === pending.purchaseId
        && /^0x[0-9a-fA-F]{64}$/.test(savedHash)
        ? savedHash
        : /^0x[0-9a-fA-F]{64}$/.test(pendingHash) ? pendingHash : '';
      if (recoveredHash) {
        if (!resume || resume.kind !== 'submitted' || resume.purchase.transactionHash !== recoveredHash) {
          const recoveredPurchase = {
            ...pending,
            transactionHash: recoveredHash,
            paymentWallet: pending.paymentWallet || (saved?.purchaseId === pending.purchaseId ? saved.payerWallet : '') || '',
          };
          setPurchaseId(pending.purchaseId);
          setBoundPayer(recoveredPurchase.paymentWallet || null);
          setResume({ kind: 'submitted', purchase: recoveredPurchase });
          setSubmissionState('CONFIRMING');
          setStep('verifying');
        }
        return;
      }
      if (saved?.purchaseId === pending.purchaseId) setUncertainRecovery(true);
    } catch { /* malformed local marker is ignored; server state remains locked */ }

    if (uncertainRecovery) {
      setPurchaseId(pending.purchaseId);
      setBoundPayer(pending.paymentWallet || null);
      setSubmissionState('UNKNOWN_SUBMISSION_STATE');
      setResult({ ok: false, uncertain: true, message: 'We could not confirm whether your wallet submitted this payment. Check the sending wallet before attempting another payment.' });
      setStep('result');
      return;
    }
    if (resume) return;
    if (pending.status === 'submission_uncertain') {
      setPurchaseId(pending.purchaseId);
      setBoundPayer(pending.paymentWallet || null);
      setSubmissionState('UNKNOWN_SUBMISSION_STATE');
      setUncertainRecovery(true);
      setResult({
        ok: false, uncertain: true, hash: pending.transactionHash || undefined,
        message: 'A previous wallet submission is still being reconciled. This lock is stored on your account, so do not start another payment.',
      });
      setStep('result');
      return;
    }
    if (pending.status === 'expired') {
      setResume({ kind: 'expired', purchase: pending });
      setStep('quote');
      return;
    }
    if (pending.status && pending.status !== 'awaiting_payment') {
      setResume({ kind: 'submitted', purchase: pending });
      setSubmissionState('CONFIRMING');
      setStep('verifying');
      return;
    }
    const expiresAt = pending.expiresAt;
    const pendingChainId = pending.chainId == null ? 56 : Number(pending.chainId);
    if (pendingChainId !== 56) {
      // A legacy pending intent must never make Ethereum look like the
      // required payment network. Drop its unsigned quote and fetch a fresh
      // server quote pinned to BNB Smart Chain; submitted hashes were handled above.
      setResume({ kind: 'expired', purchase: pending });
      setStep('quote');
      return;
    }
    const live = expiresAt ? Date.parse(expiresAt) > nowMs() : false;
    if (live && expiresAt && pending.quoteId && pending.receiverWallet) {
      setResume({
        kind: 'live',
        purchase: pending,
        quote: {
          quoteId: pending.quoteId,
          walletProofNonce: pending.walletProofNonce || '',
          userId: pseUser?.uid || '',
          toolId: tool.id,
          toolVersion: tool.version,
          gbpPrice: tool.purchasePriceGBP,
          bnbAmount: Number(pending.quotedBNBAmount ?? 0),
          bnbAmountWei: pending.quotedBNBWei || undefined,
          exchangeRateBNBGBP: Number(pending.exchangeRateBNBGBP ?? 0),
          receiverWallet: pending.receiverWallet,
          network: 'BNB Smart Chain',
          chainId: 56,
          createdAt: pending.quoteCreatedAt || '',
          expiresAt,
        },
      });
      setStep('pay');
      return;
    }
    if (!live) setResume({ kind: 'expired', purchase: pending });
  }, [resume, pending, tool.id, tool.version, tool.purchasePriceGBP, pseUser?.uid, uncertainRecovery, confirmedNoTransaction]);

  // Fetch a quote on open — unless a live/submitted intent is being resumed
  // (re-quoting there would re-price and re-bind an existing purchase).
  useEffect(() => {
    if (uncertainRecovery || confirmedNoTransaction || (resume && resume.kind !== 'expired')) return;
    let cancelled = false;
    setQuoteLoading(true);
    resetBinding();
    setSubmissionState('NOT_SUBMITTED');
    requestQuote(tool.id)
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setQuoteLoading(false); });
    return () => { cancelled = true; clearQuote(); };
  }, [tool.id, requestQuote, clearQuote, resetBinding, resume, uncertainRecovery, confirmedNoTransaction]);

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
  const requiredChainId = 56;
  const networkName = 'BNB Smart Chain';
  // An address remembered for this ACCOUNT is not a usable payer: signing needs
  // a live EIP-1193 provider in THIS browser.
  const walletLive = Boolean(connectedWallet) && walletTransport !== null;
  const chainUnknown = walletChainId === null;
  const wrongChain = !chainUnknown && walletChainId !== requiredChainId;
  const onRequiredChain = walletChainId === requiredChainId;

  // Display-only fee estimate for the exact native transfer. The wallet still
  // shows and charges its own final network fee at approval; a wallet that does
  // not answer these read methods simply shows "in wallet" instead.
  useEffect(() => {
    let cancelled = false;
    const value = String(quote?.bnbAmountWei || '');
    if (step !== 'pay' || !quote || !connectedWallet || !walletLive || !/^\d+$/.test(value)) {
      setFeeEstimate(null);
      return () => { cancelled = true; };
    }
    void estimateNetworkFee({
      from: connectedWallet,
      to: quote.receiverWallet,
      value,
    }).then(fee => { if (!cancelled) setFeeEstimate(fee); });
    return () => { cancelled = true; };
  }, [step, quote, connectedWallet, walletLive, estimateNetworkFee]);

  const totalPayableWei = useMemo(() => {
    if (!quote?.bnbAmountWei || !feeEstimate) return null;
    try { return (BigInt(quote.bnbAmountWei) + BigInt(feeEstimate.feeWei)).toString(); }
    catch { return null; }
  }, [quote?.bnbAmountWei, feeEstimate]);
  const payerAligned = !boundPayer || !connectedWallet || connectedWallet.toLowerCase() === boundPayer.toLowerCase();
  const walletChanged = Boolean(boundPayer && connectedWallet && !payerAligned);
  const quoteNetworkValid = !quote || Number(quote.chainId ?? 56) === 56;
  const quoteValid = Boolean(quote) && secondsLeft > 0 && quoteNetworkValid;
  const ownershipOk = owned < tool.maxPerUser;
  const showingRecovery = resume?.kind === 'submitted';

  const blockedReason = (() => {
    if (!connectedWallet) return 'Connect a wallet to continue.';
    if (!walletLive) return 'Reconnect your wallet in this browser — the payment must be signed by the wallet that pays, and this session has no live wallet connection.';
    if (walletChanged) return `This purchase is locked to ${shortAddr(boundPayer)} — reconnect that wallet to pay.`;
    // Chain selection is handled automatically by payNow through the active
    // wallet provider. If needed, the wallet app will show its own switch/add
    // network approval prompt; the user must not navigate wallet settings.
    if (quote && !quoteNetworkValid) return 'This quote is not for BNB Smart Chain (56). Refresh it before paying.';
    if (!quoteValid) return 'The quote expired. Refresh it to continue — the backend will not accept a stale quote.';
    if (!ownershipOk) return `Maximum ownership reached for ${tool.name}.`;
    return null;
  })();
  const payBlocked = blockedReason !== null;

  // Prepare the server-side purchase intent BEFORE the Pay tap. Mobile wallet
  // apps require eth_sendTransaction to be invoked directly from the user's
  // gesture; awaiting a backend bind or chain switch inside the click handler
  // can lose that gesture and leave the wallet approval prompt unopened.
  const bindAttemptRef = useRef<string | null>(null);
  useEffect(() => {
    if (step !== 'pay' || !quote || !quoteNetworkValid || !connectedWallet || !walletLive || !onRequiredChain || purchaseId || boundPayer) return;
    const key = `${quote.quoteId}:${connectedWallet.toLowerCase()}`;
    if (bindAttemptRef.current === key) return;
    bindAttemptRef.current = key;
    setBindingError(null);
    void bindPurchaseIntent(quote).then(bound => {
      if (bindAttemptRef.current !== key) return;
      if (!bound.success || !bound.purchaseId || !bound.payerWallet) {
        bindAttemptRef.current = null;
        const message = bound.error || 'Could not prepare this purchase. Please retry.';
        setBindingError(message);
        toast.error(message);
        return;
      }
      setBindingError(null);
      setPurchaseId(bound.purchaseId);
      setBoundPayer(bound.payerWallet);
      void refresh();
    }).catch(error => {
      if (bindAttemptRef.current !== key) return;
      bindAttemptRef.current = null;
      const message = error instanceof Error ? error.message : 'Could not prepare this purchase.';
      setBindingError(message);
      toast.error(message);
    });
  }, [step, quote, quoteNetworkValid, connectedWallet, walletLive, onRequiredChain, purchaseId, boundPayer, bindingRetry, bindPurchaseIntent, refresh]);

  const refreshQuoteNow = () => {
    setResume(null);
    resetBinding();
    setSubmissionState('NOT_SUBMITTED');
    clearQuote();
    setQuoteLoading(true);
    setStep('quote');
    requestQuote(tool.id).finally(() => setQuoteLoading(false));
  };

  const switchToPaymentNetwork = async () => {
    if (switchingNetwork) return;
    setSwitchingNetwork(true);
    try {
      const ready = await ensurePaymentChain(requiredChainId);
      const actual = await refreshWalletChain();
      if (!ready || actual !== requiredChainId) {
        toast.error(`Could not confirm ${networkName}. Reconnect and approve BNB Smart Chain in your wallet.`);
        return;
      }
      toast.success(`${networkName} is ready. Your payment approval can now open directly.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not switch wallet network.');
    } finally {
      setSwitchingNetwork(false);
    }
  };

  /**
   * Proceeds to the native BNB transfer request.
   * ORDER IS THE POINT: quote → bind payer → assert BNB Smart Chain → request eth_sendTransaction → persist hash → verify receipt.
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
    if (!onRequiredChain) {
      toast.error(`Switch to ${networkName} before paying. Use the network button below.`);
      return;
    }
    if (!purchaseId || !boundPayer) {
      toast('Preparing your secure purchase. The Pay button will be ready in a moment.', { icon: '⏳' });
      return;
    }
    const intentId = purchaseId;
    const payer = boundPayer;
    const payerCheck = resolvePaymentPayer(payer, connectedWallet);
    if (!payerCheck.ok) {
      toast.error('The connected wallet does not match the payer bound to this purchase.');
      return;
    }
    // Do not await a chain switch or backend request before this call. The
    // provider request must remain in the original user-activation task so
    // Android browsers can hand off to the wallet app and show its approval UI.
    setStep('verifying');
    setPaymentProgress('Your wallet is opening. Review the exact BNB transfer there…');
    recordWalletStage('payment_flow_started');
    const wei = quote.bnbAmountWei;
    if (!wei || !/^[0-9]+$/.test(String(wei))) {
      setStep('result');
      setResult({ ok: false, message: 'The server quote is missing its exact BNB amount. Request a new quote.' });
      return;
    }
    recordWalletStage('payment_send_started');
    setPaymentProgress('Your payment request is being sent to your wallet. Keep the wallet open and approve the exact BNB amount there…');
    setSubmissionState('SUBMISSION_IN_PROGRESS');
    try {
      let txHash: string;
      try {
        txHash = await sendPayment({ from: payer, to: quote.receiverWallet, value: String(wei) });
      } catch (sendErr) {
        if (isSessionUnavailable(sendErr)) {
          setSubmissionState('NOT_SUBMITTED');
          setResult({ ok: false, message: 'Your wallet session ended before the payment was requested, so nothing was sent. Reconnect and prepare a fresh quote.' });
          setStep('result');
          return;
        }
        if (typeof sendErr === 'object' && sendErr !== null &&
            (sendErr as { code?: string }).code === 'PAYMENT_METHOD_UNSUPPORTED') {
          setSubmissionState('NOT_SUBMITTED');
          setResult({ ok: false, message: 'This wallet rejected the transaction request before submission. No payment was sent. Reconnect and prepare a fresh quote.', diagnostic: (sendErr as { diagnostic?: string }).diagnostic });
          setStep('result');
          return;
        }
        if (isSubmissionUncertain(sendErr)) {
          let serverLocked = false;
          try {
            await PSEMineEngine.markPurchaseSubmissionUncertain(intentId);
            serverLocked = true;
            void refresh();
          } catch (lockErr) {
            toast.error(lockErr instanceof Error ? `Payment status could not be synced to the server: ${lockErr.message}` : 'Payment status could not be synced to the server. Do not retry.');
          }
          setSubmissionState('UNKNOWN_SUBMISSION_STATE');
          try {
            localStorage.setItem('psemine_uncertain_payment', JSON.stringify({
              purchaseId: intentId, toolId: tool.id, payerWallet: payer,
              receiverWallet: quote.receiverWallet, quotedBNBWei: String(quote.bnbAmountWei || ''),
              createdAt: new Date().toISOString(),
            }));
          } catch { /* live page still keeps the retry lock */ }
          setUncertainRecovery(true);
          setConfirmedNoTransaction(false);
          setResult({
            ok: false, uncertain: true,
            message: serverLocked
              ? 'We could not confirm whether your wallet submitted this payment. This purchase is locked on your account while you check the sending wallet. Do not pay again if a transfer appears.'
              : 'We could not confirm whether your wallet submitted this payment, and the server could not confirm the recovery lock. Keep this purchase open and contact support before trying again.',
            diagnostic: (sendErr as { diagnostic?: string }).diagnostic,
          });
          setStep('result');
          return;
        }
        throw sendErr;
      }
      if (!txHash) throw new Error('Transaction was not submitted.');
      recordWalletStage('payment_hash_returned');
      setSubmissionState('SUBMITTED');
      // Persist the returned hash locally BEFORE the network report. If the
      // browser/app handoff or API response is interrupted, this exact transfer
      // can be attached to the same server intent after refresh — never rebroadcast.
      try {
        localStorage.setItem('psemine_uncertain_payment', JSON.stringify({
          purchaseId: intentId, toolId: tool.id, payerWallet: payer,
          receiverWallet: quote.receiverWallet, quotedBNBWei: String(quote.bnbAmountWei || ''),
          transactionHash: txHash, createdAt: new Date().toISOString(),
        }));
      } catch { /* the live result still retains the hash for this session */ }
      let submissionRecorded = false;
      for (let attempt = 0; attempt < 2 && !submissionRecorded; attempt += 1) {
        try {
          await PSEMineEngine.reportPurchaseSubmission(intentId, txHash, payer);
          submissionRecorded = true;
        } catch {
          if (attempt === 0) await new Promise<void>(resolve => window.setTimeout(() => resolve(), 350));
        }
      }
      if (!submissionRecorded) {
        await PSEMineEngine.markPurchaseSubmissionUncertain(intentId).catch(() => false);
        void refresh();
        const recoveredPurchase: PsePendingPurchase = {
          ...(pending?.purchaseId === intentId ? pending : {}),
          purchaseId: intentId,
          toolId: tool.id,
          status: 'submission_uncertain',
          transactionHash: txHash,
          paymentWallet: payer,
          receiverWallet: quote.receiverWallet,
          quoteId: quote.quoteId,
          quotedBNBAmount: quote.bnbAmount,
          quotedBNBWei: String(quote.bnbAmountWei || ''),
          chainId: quote.chainId,
          expiresAt: quote.expiresAt,
        };
        setPurchaseId(intentId);
        setBoundPayer(payer);
        setResume({ kind: 'submitted', purchase: recoveredPurchase });
        setSubmissionState('CONFIRMING');
        setResult({ ok: false, uncertain: true, hash: txHash, message: 'Your wallet returned a transaction hash, but the server could not confirm that it saved it. The hash has been kept on this device for safe recovery. Do not send again.' });
        setUncertainRecovery(false);
        setStep('result');
        return;
      }
      void refresh();
      setSubmissionState('CONFIRMING');
      const res = await submitPurchaseTx(intentId, txHash, payer);
      if (res.success) {
        setSubmissionState('VERIFIED');
        try { localStorage.removeItem('psemine_uncertain_payment'); } catch { /* ignore */ }
        setUncertainRecovery(false);
        setResult({ ok: true, message: `${tool.name} activated. Its hourly capacity is now live on your dashboard.`, hash: txHash });
      } else {
        const stillConfirming = res.code === 'INSUFFICIENT_CONFIRMATIONS';
        const verificationCanBeRetried = stillConfirming || res.code === 'VERIFICATION_TIMEOUT' || res.code === 'VERIFICATION_UNAVAILABLE';
        setSubmissionState(stillConfirming ? 'CONFIRMING' : 'SUBMITTED');
        setResult({
          ok: false, recheckable: verificationCanBeRetried,
          message: verificationCanBeRetried
            ? (res.error || 'The same transaction is still being reconciled. Check this transaction again; do not send another payment.')
            : (res.error || 'Verification failed. If you already sent the payment, keep the transaction hash for reconciliation.'),
          hash: txHash,
        });
      }
      setStep('result');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment could not be submitted.';
      if (/user rejected|user denied|4001/i.test(msg)) {
        recordWalletStage('payment_cancelled_in_wallet');
        setSubmissionState('NOT_SUBMITTED');
        setStep('pay');
        toast('Payment cancelled in your wallet.');
      } else {
        recordWalletStage('payment_flow_failed');
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
        try { localStorage.removeItem('psemine_uncertain_payment'); } catch { /* storage unavailable */ }
        setUncertainRecovery(false);
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
    let saved: { purchaseId?: string; transactionHash?: string; payerWallet?: string } | null = null;
    try { saved = JSON.parse(localStorage.getItem('psemine_uncertain_payment') || 'null'); } catch { /* ignore malformed local evidence */ }
    const txHash = p.transactionHash || (saved?.purchaseId === p.purchaseId ? saved.transactionHash : undefined);
    const sender = p.paymentWallet || (saved?.purchaseId === p.purchaseId ? saved.payerWallet : '') || '';
    if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) return;
    setRechecking(true);
    try {
      // Idempotently persist/reconcile the hash first. This is safe whether the
      // original report never reached the server or committed with a lost reply.
      await PSEMineEngine.reportPurchaseSubmission(p.purchaseId, txHash, sender);
      const res = await submitPurchaseTx(p.purchaseId, txHash, sender);
      if (res.success) {
        setResume(null);
        setSubmissionState('VERIFIED');
        try { localStorage.removeItem('psemine_uncertain_payment'); } catch { /* storage unavailable */ }
        setResult({ ok: true, message: `${tool.name} activated. Its hourly capacity is now live on your dashboard.`, hash: txHash });
        setStep('result');
      } else if (res.code === 'INSUFFICIENT_CONFIRMATIONS') {
        toast('Still confirming on-chain — the backend needs more block confirmations.', { icon: '⏳' });
      } else {
        toast.error(res.error || 'Verification has not completed for this transaction yet.');
      }
    } catch (error) {
      toast.error(error instanceof Error
        ? `The existing transaction could not be reconciled: ${error.message}. Do not send another payment.`
        : 'The existing transaction could not be reconciled. Do not send another payment.');
    } finally {
      setRechecking(false);
      void refresh();
    }
  };

  /** Attach a hash the browser never received, but only after a read-only
   *  on-chain match against this purchase. A mismatch writes nothing. */
  const recoverKnownPayment = async () => {
    const hash = manualHash.trim().toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(hash)) {
      setManualHashError('Enter the 64-character transaction hash shown in your wallet.');
      return;
    }
    if (!purchaseId) {
      setManualHashError('The purchase is still being prepared. Wait a moment and try again.');
      return;
    }
    const sender = boundPayer || connectedWallet || '';
    setManualRecovering(true);
    setManualHashError(null);
    try {
      const check = await PSEMineEngine.checkPurchaseTransaction(purchaseId, hash);
      if (!check.match) {
        setManualHashError(check.message || 'This transaction does not match this purchase. Nothing was attached.');
        return;
      }
      // Terms matched. Bind the immutable hash and run the same independent
      // verification as a wallet-returned hash; activation is never assumed.
      await PSEMineEngine.reportPurchaseSubmission(purchaseId, hash, sender);
      const res = await submitPurchaseTx(purchaseId, hash, sender);
      if (res.success) {
        setSubmissionState('VERIFIED');
        try { localStorage.removeItem('psemine_uncertain_payment'); } catch { /* storage unavailable */ }
        setUncertainRecovery(false);
        setResult({ ok: true, hash, message: `${tool.name} activated. Its hourly capacity is now live on your dashboard.` });
      } else if (res.code === 'INSUFFICIENT_CONFIRMATIONS') {
        setSubmissionState('CONFIRMING');
        setResult({
          ok: false, recheckable: true, hash,
          message: res.error || 'The transaction matches this purchase and is waiting for more BNB Smart Chain confirmations. Do not send another payment.',
        });
      } else {
        setResult({
          ok: false, hash,
          recheckable: res.code === 'VERIFICATION_TIMEOUT' || res.code === 'VERIFICATION_UNAVAILABLE',
          message: res.error || 'The transaction was attached, but verification has not completed. Do not send another payment.',
        });
      }
      setManualHash('');
      setStep('result');
    } catch (error) {
      setManualHashError(error instanceof Error
        ? error.message
        : 'The transaction could not be checked. Nothing was attached; try again.');
    } finally {
      setManualRecovering(false);
      void refresh();
    }
  };

  /** Restart from a fresh quote — the only route out of an uncertain or failed
   *  submission, and only ever at the user's explicit request. */
  const confirmNoBroadcast = async () => {
    if (!purchaseId) {
      toast.error('The original purchase could not be identified. Contact support before starting another payment.');
      return;
    }
    setRechecking(true);
    try {
      await PSEMineEngine.confirmNoPurchaseBroadcast(purchaseId);
      setConfirmedNoTransaction(true);
      try { localStorage.removeItem('psemine_uncertain_payment'); } catch { /* storage unavailable */ }
      setUncertainRecovery(false);
      await refresh();
      toast.success('The previous purchase was closed. You can request a fresh quote.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'The server could not close the previous purchase. Do not retry yet.');
    } finally {
      setRechecking(false);
    }
  };

  const restartPurchase = () => {
    if (uncertainRecovery && !confirmedNoTransaction) return;
    try { localStorage.removeItem('psemine_uncertain_payment'); } catch { /* storage unavailable */ }
    setUncertainRecovery(false);
    // Keep the user's explicit no-transaction confirmation active while the
    // new quote is prepared, so the old pending intent is not auto-resumed.
    setConfirmedNoTransaction(confirmedNoTransaction || uncertainRecovery);
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
  // The details CTA starts quote creation; it must not wait for a quote that is only requested after entering the quote step.
  const purchaseReadyForTool = owned < tool.maxPerUser && (!pending || pending.toolId === tool.id);

  const hashRecoveryPanel = (
    <details className="pse-block-note mt-3">
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Already approved this payment in your wallet?</summary>
      <p className="pse-prose--sm" style={{ marginTop: 8 }}>
        If your wallet shows the BNB transfer but PSEmine never received its hash, paste the hash here. The server
        checks the sender, recipient, exact amount and BNB Smart Chain before attaching anything. A mismatch writes
        nothing to this purchase.
      </p>
      <label className="pse-field" htmlFor="pse-manual-hash">
        <span>Transaction hash</span>
        <input
          id="pse-manual-hash"
          className="pse-input"
          value={manualHash}
          onChange={event => { setManualHash(event.target.value); setManualHashError(null); }}
          placeholder="0x…"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(manualHashError)}
        />
      </label>
      {manualHashError && <p className="pse-field-error" role="alert">{manualHashError}</p>}
      <PseButton
        variant="secondary"
        size="sm"
        onClick={() => void recoverKnownPayment()}
        disabled={manualRecovering || !purchaseId}
      >
        {manualRecovering ? 'Checking on BNB Smart Chain…' : 'Check this transaction'}
      </PseButton>
      <p className="pse-block-meta">
        This attaches the hash to the same purchase. It never starts a second payment.
      </p>
    </details>
  );

  return (
    <>
    {minimized ? (
      <div
        role="status"
        aria-live="polite"
        style={{ position: 'fixed', zIndex: 1201, left: 12, right: 12, bottom: 'max(12px, env(safe-area-inset-bottom))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: '1px solid rgba(129, 156, 210, .28)', borderRadius: 16, background: '#080e1b', color: '#e8eefc', boxShadow: '0 16px 50px rgba(0,0,0,.5)' }}
      >
        <span style={{ fontSize: 13, lineHeight: 1.4 }}>{step === 'verifying' ? 'Payment is still processing. Keep this page open and do not pay again.' : 'Your purchase needs attention. Review its current status.'}</span>
        <button type="button" onClick={() => setMinimized(false)} style={{ flexShrink: 0, borderRadius: 10, padding: '9px 12px', background: '#23365b', color: '#fff', fontSize: 13, fontWeight: 600 }}>Return</button>
      </div>
    ) : (
    <div
      role="presentation"
      className="pse-purchase-overlay"
      style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))', background: 'rgba(3, 7, 18, .82)', backdropFilter: 'blur(12px)' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Purchase ${tool.name}`}
        className="pse-purchase-dialog"
        tabIndex={-1}
        style={{ width: 'min(100%, 820px)', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', border: '1px solid rgba(129, 156, 210, .22)', borderRadius: 22, background: '#080e1b', boxShadow: '0 28px 100px rgba(0,0,0,.6)', outline: 'none' }}
      >
    <PsePage
      title={step === 'details' ? tool.name : `Purchase ${tool.name}`}
      objective={step === 'details' ? 'Review this campaign unit before requesting a live BNB quote.' : `${continuous ? 'Continuous duty' : 'Session duty'} · ${gbp(tool.purchasePriceGBP)} · adds ${gbpHour(tool.hourlyRateGBP)} of capacity`}
      actions={<PseButton variant="secondary" size="sm" onClick={() => step === 'verifying' ? setMinimized(true) : onClose()}>{step === 'verifying' ? 'Minimize' : 'Close'}</PseButton>}
    >
      <ol className="pse-steps" aria-label="Purchase progress">
        {STEP_ORDER.map((s, i) => (
          <li
            key={s.id}
            className="pse-step"
            data-state={i < stepIndex ? 'done' : i === stepIndex ? 'current' : 'pending'}
            aria-current={i === stepIndex ? 'step' : undefined}
          >
            {s.label}
          </li>
        ))}
      </ol>

      {/* ── Recovered purchase: a transaction was already submitted ── */}
      {showingRecovery && resume?.kind === 'submitted' && (
        <PseSection title={resume.purchase.status === 'manual_review' ? 'Payment under manual review' : resume.purchase.status === 'confirming' ? 'Confirming payment' : 'Transaction submitted'}>
          <p className="pse-prose">
            {resume.purchase.status === 'manual_review'
              ? `${tool.name} — your transaction hash is recorded, but the purchase is waiting for an administrator to attach the recovery case. No second payment is needed.`
              : `${tool.name} — a transaction was submitted for this purchase and the backend is verifying it on BNB Smart Chain. This state was recovered from the backend after your refresh, so no new purchase was created.`}
          </p>
          {resume.purchase.transactionHash && (
            <p className="text-sm">
              <a href={`https://bscscan.com/tx/${resume.purchase.transactionHash}`} target="_blank" rel="noreferrer" className="pse-link">
                View {shortHash(resume.purchase.transactionHash)} on BscScan
              </a>
            </p>
          )}
          <PseNotice tone="attention">
            {resume.purchase.status === 'manual_review'
              ? 'This payment is held for admin review. Once the recovery case is attached to this exact purchase, use Check verification again. Do not send another payment.'
              : 'The backend needs a few block confirmations before the tool activates. Do not send the payment again — the same transaction hash is reused for every verification check.'}
          </PseNotice>
          <div className="flex flex-wrap gap-2">
            <PseButton onClick={() => void recheckRecovered()} disabled={rechecking || !resume.purchase.transactionHash}>
              {rechecking ? 'Checking…' : 'Check verification again'}
            </PseButton>
            <PseButton onClick={onClose}>Close</PseButton>
          </div>
        </PseSection>
      )}

      {/* ── Step: product details ── */}
      {!showingRecovery && step === 'details' && (
        <PseSection title="Tool overview">
          <div className="pse-tool-detail-hero">
            <ToolArt tier={tool.tier} name={tool.name} />
            <div className="pse-tool-detail-copy">
              <p className="pse-marketplace-kicker">PSEMINE / TIER {tool.tier}</p>
              <h2>{tool.name}</h2>
              <p>{tool.description}</p>
              <span className="pse-tool-detail-model">{continuous ? 'Continuous campaign operation' : '24-hour operating sessions'}</span>
            </div>
          </div>
          <PseFacts cols={2}>
            <PseFact label="Campaign access" value="90-day campaign" text />
            <PseFact label="Purchase price" value={gbp(tool.purchasePriceGBP)} />
            <PseFact label="Hourly capacity" value={gbpHour(tool.hourlyRateGBP)} />
            <PseFact label="Your ownership" value={`${owned} / ${tool.maxPerUser}`} />
            <PseFact label="Session length" value={continuous ? 'Continuous' : `${tool.operating.sessionDurationHours ?? 24} hours`} />
            <PseFact label="Restart delay" value={continuous ? 'Not required' : `${tool.operating.restartDelayMinutes ?? 10} minutes`} />
          </PseFacts>
          <div className="pse-tool-detail-benefits">
            <div><strong>Managed campaign access</strong><span>Mining operation and equipment management run within the PSEmine campaign.</span></div>
            <div><strong>Backend-tracked ownership</strong><span>Your tool appears as owned only after the payment is verified and the backend activates it.</span></div>
            <div><strong>Direct wallet payment</strong><span>Pay the exact server-quoted native BNB amount on BNB Smart Chain from your connected wallet.</span></div>
          </div>
          {owned >= tool.maxPerUser ? (
            <PseNotice tone="attention">You have reached the ownership limit for this tool.</PseNotice>
          ) : pending && pending.toolId === tool.id ? (
            <PseNotice tone="attention">A purchase for this tool is already recorded. Continue the existing payment rather than creating another.</PseNotice>
          ) : null}
          <div className="pse-tool-detail-actions">
            <PseButton variant="secondary" onClick={onClose}>Back to tools</PseButton>
            <PseButton onClick={() => setStep(connectedWallet ? 'quote' : 'connect')} disabled={owned >= tool.maxPerUser || quoteLoading || !purchaseReadyForTool}>
              {quoteLoading ? 'Preparing quote…' : pending && pending.toolId === tool.id ? 'Resume existing purchase' : connectedWallet ? 'Review live quote' : 'Connect wallet & continue'}
            </PseButton>
          </div>
          {quoteLoading ? (
            <PseNotice tone="info">Preparing a fresh, time-limited quote from the PSEmine backend. No transaction is being sent.</PseNotice>
          ) : !purchaseReadyForTool && owned < tool.maxPerUser ? (
            <PseNotice tone="attention">A live quote is not ready. Continue to the quote step to retry; no payment can be submitted until the backend returns a valid quote.</PseNotice>
          ) : null}
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
            <PseFacts cols={2}>
              <PseFact label="Tool" value={tool.name} text />
              <PseFact label="Fixed price" value={gbp(quote.gbpPrice)} />
              <PseFact label="Live rate" value={quote.exchangeRateBNBGBP > 0 ? `1 BNB = £${Number(quote.exchangeRateBNBGBP).toFixed(2)}` : '—'} />
              <PseFact label="Rate captured" value={quoteStamp(quote.createdAt)} text />
              <PseFact label="You pay, exactly" value={`${exactBnb} BNB`} />
              <PseFact label="Network" value={`${networkName} · ${requiredChainId}`} text />
              <PseFact label="Receiving wallet" value={shortAddr(quote.receiverWallet)} />
              <PseFact label="Quote window" value={`${mm}:${ss}`} />
              <PseFact label="Quote id" value={shortHash(quote.quoteId, 8)} />
            </PseFacts>
            <p className="pse-block-note">
              The quoted BNB amount is fixed for this window so the GBP price you pay never drifts.
              {secondsLeft === 0 && ' This quote has expired — refresh it before paying.'}
            </p>
            <p className="pse-prose">
              Adds {gbpHour(tool.hourlyRateGBP)} of capacity. You will own {owned} of {tool.maxPerUser} after this
              purchase. {continuous
                ? 'Elite mines continuously — no manual session restarts.'
                : 'This tier mines in sessions: when a session ends, mining stops until you restart the tool.'}
            </p>
            <PseButton
              variant="secondary"
              size="sm"
              onClick={() => void copyText(quote.receiverWallet).then(ok => {
                if (ok) toast.success('Receiving wallet copied.');
                else toast.error('Could not copy the address. Select it and copy manually.');
              })}
            >
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
              <p className="pse-prose--sm">Paying from {shortAddr(connectedWallet)}</p>
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

          <PseFacts cols={2}>
            <PseFact label="Tool" value={tool.name} text />
            <PseFact label="Price" value={gbp(tool.purchasePriceGBP)} />
            <PseFact label="Network" value={`${networkName} · chain ${requiredChainId}`} text />
            <PseFact label="Payment wallet" value={boundPayer ? shortAddr(boundPayer) : connectedWallet ? shortAddr(connectedWallet) : '—'} />
            <PseFact label="Receiving wallet" value={shortAddr(quote.receiverWallet)} />
            <PseFact label="Quote expires" value={`${mm}:${ss}`} />
            <PseFact label="You pay exactly" value={`${exactBnb} BNB`} />
            <PseFact label="Network fee (est.)" value={feeEstimate ? `${bnbExactFromWei(feeEstimate.feeWei)} BNB` : 'Shown in wallet'} />
            <PseFact label="Total payable (est.)" value={totalPayableWei ? `${bnbExactFromWei(totalPayableWei)} BNB` : `${exactBnb} BNB + network fee`} />
          </PseFacts>

          <p className="pse-block-note">
            The network fee is paid to BNB Smart Chain validators, not to PSEmine. It is estimated from your wallet's
            gas price; your wallet shows the final fee on its approval screen.
          </p>

          {hashRecoveryPanel}

          <PseButton
            variant="secondary"
            size="sm"
            onClick={() => void copyText(exactBnb).then(ok => {
              if (ok) toast.success('Exact BNB amount copied.');
              else toast.error('Could not copy the amount. Select it and copy manually.');
            })}
          >
            Copy exact BNB amount
          </PseButton>
          <PseNotice tone="attention">
            Send the exact amount — underpayments are detected and will not activate a tool.
          </PseNotice>

          {boundPayer && (
            <p className="pse-prose">
              Bound payer {shortAddr(boundPayer)} — only this wallet can complete this purchase; the backend compares
              the on-chain sender against it.
            </p>
          )}

          <ul className="pse-checks">
            {[
              {
                ok: walletLive && Boolean(connectedWallet && EVM.test(connectedWallet)),
                warn: Boolean(connectedWallet) && !walletLive,
                label: !connectedWallet
                  ? 'Connect a wallet'
                  : walletLive
                    ? `Wallet connected — ${shortAddr(connectedWallet)}`
                    : `Not connected in this browser — ${shortAddr(connectedWallet)} is only the remembered payer; reconnect it to approve payment`,
              },
              {
                ok: payerAligned,
                warn: walletChanged,
                label: walletChanged
                  ? `Wallet changed — this purchase is locked to ${shortAddr(boundPayer)}`
                  : boundPayer
                    ? `Payer binding verified — only ${shortAddr(boundPayer)} can complete this purchase`
                    : 'Payer is bound to this wallet before payment',
              },
              {
                ok: onRequiredChain && walletLive,
                warn: wrongChain || (walletLive && chainUnknown),
                label: !walletLive
                  ? `Network verified once the wallet is reconnected — must be ${networkName} (chain ${requiredChainId})`
                  : onRequiredChain
                    ? `${networkName} (chain ${requiredChainId})`
                    : chainUnknown
                      ? `Network not confirmed yet — tap Switch to ${networkName} and approve chain ${requiredChainId} in your wallet`
                      : `Network switch required — confirm ${networkName} (chain ${requiredChainId}) before payment`,
              },
              { ok: quoteValid, warn: !quoteValid, label: quoteValid ? `Quote valid — expires in ${mm}:${ss}` : 'Quote expired — refresh before paying' },
              { ok: ownershipOk, warn: !ownershipOk, label: ownershipOk ? `Ownership available — ${owned} / ${tool.maxPerUser} owned` : `Ownership limit reached (${tool.maxPerUser})` },
            ].map(c => (
              <li
                key={c.label}
                className="pse-checks-item"
                data-state={c.ok ? 'ok' : c.warn ? 'warn' : 'idle'}
              >
                <span className="pse-checks-mark" aria-hidden="true">
                  {c.ok ? 'OK' : c.warn ? '!' : '–'}
                </span>
                <span>{c.label}</span>
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

          {connectedWallet && (wrongChain || chainUnknown) && (
            <PseNotice tone="attention">
              {chainUnknown
                ? `Your wallet is connected, but its network is not confirmed yet. Tap Switch to ${networkName} and approve chain ${requiredChainId} in your wallet app.`
                : `Your wallet is currently on chain ${walletChainId}. Tap Switch to ${networkName} and approve chain ${requiredChainId} in your wallet app before preparing the payment.`}
              {' '}You do not need to open wallet settings yourself.
            </PseNotice>
          )}

          <div className="flex flex-wrap gap-2">
            {!onRequiredChain && (
              <PseButton variant="secondary" onClick={() => void switchToPaymentNetwork()} disabled={switchingNetwork || !walletLive}>
                {switchingNetwork ? 'Checking network…' : `Switch to ${networkName}`}
              </PseButton>
            )}
            <PseButton onClick={() => void payNow()} disabled={payBlocked || !onRequiredChain || !purchaseId || !boundPayer}>
              {!purchaseId || !boundPayer ? 'Preparing secure checkout…' : !onRequiredChain ? 'Switch network to continue' : `Open wallet & pay ${exactBnb} BNB`}
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
          {!purchaseId && bindingError ? (
            <PseNotice tone="attention" title="Checkout preparation needs attention">
              {bindingError} No payment has been sent.
              <div className="mt-3">
                <PseButton size="sm" variant="secondary" onClick={() => { bindAttemptRef.current = null; setBindingRetry(value => value + 1); }}>
                  Retry checkout preparation
                </PseButton>
              </div>
            </PseNotice>
          ) : !purchaseId && !payBlocked ? (
            <PseNotice tone="info">Securing your purchase quote and binding it to this wallet. The payment button becomes active when this is ready.</PseNotice>
          ) : null}
          {walletLive && !onRequiredChain && <PseNotice tone="attention">Switch and confirm BNB Smart Chain before paying. Network switching is a separate wallet action so the payment approval can open immediately from your Pay tap.</PseNotice>}
          <p className="pse-block-note">
            After you send, the backend verifies your transaction on-chain — sender, recipient, exact amount and
            confirmation depth — before the tool activates.
          </p>
        </PseSection>
      )}

      {/* ── Step: verifying ── */}
      {!showingRecovery && step === 'verifying' && (
        <PseSection title={submissionState === 'SUBMISSION_IN_PROGRESS' ? 'Your wallet is opening' : 'Preparing secure payment'}>
          {submissionState === 'SUBMISSION_IN_PROGRESS' ? (
            <div className="pse-wallet-wait" role="status" aria-live="polite">
              <span className="pse-wallet-wait-orbit" aria-hidden="true"><span /></span>
              <p className="pse-wallet-wait-kicker">ACTION REQUIRED IN YOUR WALLET</p>
              <h3>Approve the payment request</h3>
              <p>{paymentProgress}</p>
              <ol>
                <li>Wait for your wallet app or wallet notification to open.</li>
                <li>Check that the network is BNB Smart Chain and the amount and recipient match this quote.</li>
                <li>Approve only if the details are correct, then return to this page.</li>
              </ol>
              <div className="pse-wallet-wait-note"><strong>Keep this page open.</strong> Wallet handoff can take a little time. Do not tap Pay again or approve a duplicate request. If you reject the request, no payment is made.</div>
              <p className="pse-block-meta">Wallet request in progress · no payment is confirmed yet</p>
            </div>
          ) : (
            <div className="pse-wallet-wait">
              <span className="pse-wallet-wait-orbit" aria-hidden="true"><span /></span>
              <h3>Preparing your secure payment</h3>
              <p role="status" aria-live="polite">{paymentProgress}</p>
              <p className="pse-block-meta">{submissionState} · {SUBMISSION_LABEL[submissionState]}</p>
            </div>
          )}
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
          <p className="pse-prose pse-prose--ink">{result.message}</p>
          {result.diagnostic && (
            <PseNotice tone="attention" title="Technical diagnostic">
              <code>{result.diagnostic}</code>
              {walletCorrelationId && (
                <p className="mt-2">Correlation ID <code>{walletCorrelationId}</code></p>
              )}
              <div className="mt-3">
                <PseButton
                  variant="secondary"
                  size="sm"
                  onClick={() => void copyText(formatWalletDiagnostics()).then(ok => {
                    if (ok) toast.success('Wallet diagnostics copied.');
                    else toast.error('Could not copy diagnostics. Open the browser console and copy the [pseWallet] lines.');
                  })}
                >
                  Copy wallet diagnostics
                </PseButton>
              </div>
            </PseNotice>
          )}
          {result.hash && (
            <p className="text-sm">
              <a href={`https://bscscan.com/tx/${result.hash}`} target="_blank" rel="noreferrer" className="pse-link">
                View {shortHash(result.hash)} on BscScan
              </a>
            </p>
          )}

          {result.uncertain && (
            <PseNotice tone="attention" title={result.hash ? "Recover this exact transaction" : "Check your wallet before retrying"}>
              {result.hash
                ? 'Your wallet returned a transaction hash, but the server has not confirmed that it saved the submission. PSEmine retained the hash on this device. Reconcile this same transfer below — never send a second payment.'
                : 'The wallet did not return a transaction result, so PSEmine cannot tell whether the transfer was submitted. This does not mean the payment failed. Check the activity for the sending wallet.'}
              {boundPayer ? <> Sending wallet: <a className="pse-link" href={`https://bscscan.com/address/${boundPayer}`} target="_blank" rel="noreferrer">{shortAddr(boundPayer)} on BscScan</a>.</> : ''}
              {result.hash ? <> Transaction: <a className="pse-link" href={`https://bscscan.com/tx/${result.hash}`} target="_blank" rel="noreferrer">{shortHash(result.hash)} on BscScan</a>.</> : ' If a transfer appears, do not pay again. Keep its transaction hash for reconciliation.'}
            </PseNotice>
          )}
          {result.uncertain && !result.hash && hashRecoveryPanel}
          {result.uncertain && result.hash && (
            <PseButton variant="secondary" onClick={() => void recheckRecovered()} disabled={rechecking}>
              {rechecking ? 'Reconciling transaction…' : 'Recover this transaction'}
            </PseButton>
          )}
          {result.uncertain && !result.hash && !confirmedNoTransaction && (
            <PseButton variant="secondary" onClick={() => void confirmNoBroadcast()} disabled={rechecking}>
              {rechecking ? 'Checking with server…' : 'I checked — no transaction is listed'}
            </PseButton>
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
            {!result.ok && !result.recheckable && !result.uncertain && (
              <PseButton onClick={restartPurchase}>Try again with a new quote</PseButton>
            )}
            {!result.ok && result.uncertain && confirmedNoTransaction && (
              <PseButton onClick={restartPurchase}>Start a new purchase</PseButton>
            )}
          </div>
        </PseSection>
      )}
    </PsePage>
      </div>
    </div>
    )}
    </>
  );
};

/* ── Wallet connection step (inside the purchase flow) ─────────────────── */
const WalletConnectStep: React.FC = () => {
  const {
    injectedWallets, walletConnectAvailable, connectWallet,
    connectWalletConnectTransport, cancelWalletConnectTransport,
    isConnectingWallet, walletRecoveryState, walletCorrelationId,
  } = usePSEMine();

  return (
    <PseSection title="Connect a wallet">
      <p className="pse-prose">
        Connect the wallet you want to pay from. When you purchase, your wallet opens a separate BNB transfer approval showing the exact amount and receiving address. PSEmine never sends funds automatically.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {walletConnectAvailable && (
          <div className="min-w-0 rounded-xl border border-violet-400/20 bg-violet-400/[.06] p-3">
            <div className="text-xs font-semibold text-white">Wallet app</div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Connect with WalletConnect and approve the PSEmine connection in your installed wallet.</p>
            <PseButton className="mt-3 w-full" onClick={() => void connectWalletConnectTransport()} disabled={isConnectingWallet}>
              Connect with WalletConnect
            </PseButton>
          </div>
        )}
        {injectedWallets.map(w => (
          <div key={w.id} className="min-w-0 rounded-xl border border-cyan-400/20 bg-cyan-400/[.04] p-3">
            <div className="text-xs font-semibold text-white">Browser wallet</div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{w.name} is available in this browser. Connect directly without leaving this tab.</p>
            <PseButton className="mt-3 w-full" onClick={() => void connectWallet(w.id)} disabled={isConnectingWallet}>
              Connect {w.name}
            </PseButton>
          </div>
        ))}
      </div>

      {isConnectingWallet && (
        <PseNotice title="Waiting for wallet approval">
          Your wallet may open as a separate app. Choose it and approve the connection there, then return to this PSEmine tab.
          Keep this tab open; PSEmine confirms the session when your wallet returns. If the wallet app was cancelled,
          stop waiting below — nothing has been sent.
          <div className="mt-3 flex flex-wrap gap-2">
            <PseButton variant="secondary" size="sm" onClick={() => void cancelWalletConnectTransport()}>
              Cancel wallet connection
            </PseButton>
          </div>
        </PseNotice>
      )}

      {walletRecoveryState === 'interrupted' && (
        <PseNotice tone="attention" title="Wallet connection was interrupted">
          The previous attempt ended when the browser restarted before PSEmine could save the wallet approval. No
          payment was submitted. Approve the connection once more to finish.
          <div className="mt-3 flex flex-wrap gap-2">
            <PseButton size="sm" onClick={() => void connectWalletConnectTransport(true)} disabled={isConnectingWallet}>
              Reconnect wallet
            </PseButton>
          </div>
        </PseNotice>
      )}

      {walletCorrelationId && (
        <details className="pse-block-note mt-3">
          <summary>Wallet diagnostics</summary>
          <p className="pse-prose--sm">
            Correlation ID <code>{walletCorrelationId}</code>. Safe to share: addresses are shortened and session
            secrets are removed.
          </p>
          <PseButton
            variant="secondary"
            size="sm"
            onClick={() => void copyText(formatWalletDiagnostics()).then(ok => {
              if (ok) toast.success('Wallet diagnostics copied.');
              else toast.error('Could not copy diagnostics. Open the browser console and copy the [pseWallet] lines.');
            })}
          >
            Copy wallet diagnostics
          </PseButton>
        </details>
      )}

      {!walletConnectAvailable && injectedWallets.length === 0 && (
        <PseNotice tone="attention">
          WalletConnect is not configured for this deployment yet. Add the public Reown project ID as
          VITE_WALLETCONNECT_PROJECT_ID, or open PSEmine inside your wallet&apos;s browser.
        </PseNotice>
      )}
    </PseSection>
  );
};

export default PSEMineTools;
