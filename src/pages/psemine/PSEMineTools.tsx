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
import { type PsePendingPurchase, type PseStateTool } from '../../engines/psemine/pseMineApi';
import { PSEMineEngine } from '../../engines/psemine/PSEMineEngine';
import { PSEMineToolDefinition, PSEMineQuote, PSEMINE_CONSTANTS, LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import {
  bnbExactFromWei, copyText, gbp, gbpHour, nowMs, shortAddr, shortHash,
  CYCLE_STATE_MAP, cycleStateView, operatingModelView,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseErrorNotice, PseFact, PseFacts, PseLoading, PseNotice,
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
        {tool.lastAccruedAt && <p className="pse-owned-tool-updated">Last accrual checkpoint: {new Date(tool.lastAccruedAt).toLocaleString()}</p>}
      </div>
    </li>
  );
};

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
          ? `Maintenance accepted. Next session scheduled for ${new Date(result.resumesAt).toLocaleTimeString()}.`
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
  const totalCapacity = typeof state?.user?.totalCapacityGBPPerHour === 'number'
    ? state.user.totalCapacityGBPPerHour
    : typeof pseUser?.totalCapacityGBPPerHour === 'number' ? pseUser.totalCapacityGBPPerHour : null;
  const referralCapacity = typeof state?.user?.referralCapacityGBPPerHour === 'number'
    ? state.user.referralCapacityGBPPerHour
    : typeof pseUser?.referralCapacityGBPPerHour === 'number' ? pseUser.referralCapacityGBPPerHour : null;
  const referralQualified = state?.user?.qualifiedReferralsCount ?? pseUser?.qualifiedReferralsCount ?? 0;
  const headroom = toolCapacity !== null
    ? Math.max(0, PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR - toolCapacity)
    : null;
  const toolCapacityLabel = toolCapacity !== null ? gbpHour(toolCapacity) : '—';
  const headroomLabel = headroom !== null ? gbpHour(headroom) : '—';
  const referralCapacityLabel = referralCapacity !== null ? gbpHour(referralCapacity) : '—';
  const totalCapacityLabel = totalCapacity !== null ? gbpHour(totalCapacity) : '—';
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
        <PseNotice tone="attention" title="Your tool cycle, at a glance">
        <p>PSEmine units are virtual campaign-capacity tools, not physical mining hardware or rigs. Starter, Builder and Advanced follow this cycle:</p>
        <PseFacts cols={2}>
          <PseFact label="01 · Operate" value="24 hours" hint="Eligible hourly accrual" />
          <PseFact label="02 · Maintain" value="Within 6 hours" hint="Free · manual action" />
          <PseFact label="03 · Restart" value="10 minutes" hint="No accrual during delay" />
          <PseFact label="04 · Resume" value="Next session" hint="Fresh 24-hour cycle" />
        </PseFacts>
        <p>The 6-hour window is reserved for free manual maintenance. Earnings accrue during active operating sessions; maintenance itself does not add earnings. Elite operates continuously while the campaign is active. The GBP/hour figure is the campaign accounting rate used to calculate eligible earnings. Recorded eligible earnings are settled in GBP at campaign end. You can then request payout in BNB; approved requests are paid after review.</p>
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

  if (purchasing) {
    const pending = pendingPurchase && pendingPurchase.toolId === purchasing.id ? pendingPurchase : null;
    return <PurchaseFlow tool={purchasing} pending={pending} onClose={() => { setPurchasing(null); void refresh(); }} />;
  }

  const ownedByTool = (id: string) => ownedTools.filter(t => (t.toolId || '') === id).length;
  const operatingOwned = ownedTools.filter(t => (t.cycleState || t.status) === 'active').length;

  return (
    <PsePage
      title="Mining tools"
      objective="Fixed-price campaign units. Pay in BNB; campaign capacity activates after on-chain verification."
      actions={<PseButton variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync'}</PseButton>}
    >
      <section className="pse-marketplace-hero" aria-labelledby="pse-marketplace-hero-title">
        <div className="pse-marketplace-hero-copy">
          <span className="pse-marketplace-eyebrow"><span className="pse-marketplace-live-dot" /> PSEMINE CAMPAIGN UNITS</span>
          <h2 id="pse-marketplace-hero-title">Build your <em>campaign setup.</em></h2>
          <p>Choose a tool, review its fixed price and capacity, then buy securely with your wallet. Your equipment activates only after payment is verified on-chain.</p>
          <div className="pse-marketplace-hero-actions">
            <a className="pse-marketplace-buy-cta" href="#pse-catalogue">{purchaseOpen ? 'Explore tools' : 'View equipment'} <span aria-hidden="true">↓</span></a>
            <span className={'pse-marketplace-campaign-state' + (purchaseOpen ? ' is-open' : '')}><span />{purchaseOpen ? 'Purchases open' : walletSetupRequired ? 'Wallet setup pending' : 'Purchases ' + (campaign?.status || 'unavailable')}</span>
          </div>
        </div>
        <div className="pse-marketplace-hero-object" aria-hidden="true">
          <div className="pse-marketplace-orbit pse-marketplace-orbit--one" />
          <div className="pse-marketplace-orbit pse-marketplace-orbit--two" />
          <div className="pse-marketplace-hero-chip pse-marketplace-hero-chip--top"><span>AVAILABLE TIERS</span><strong>{TOOLS.length.toString().padStart(2, '0')}</strong></div>
          <div className="pse-marketplace-hero-machine"><ToolArt tier={4} name="Elite mining unit" /></div>
          <div className="pse-marketplace-hero-chip pse-marketplace-hero-chip--bottom"><span>PAYMENT NETWORK</span><strong>BNB SMART CHAIN</strong></div>
        </div>
        <div className="pse-marketplace-hero-foot">
          <div><span>YOUR EQUIPMENT</span><strong>{ownedTools.length.toString().padStart(2, '0')} <small>owned</small></strong></div>
          <div><span>HOURLY TOOL CAPACITY</span><strong>{toolCapacityLabel}</strong></div>
          <div><span>ACCOUNT SLOT HEADROOM</span><strong>{tierSlotsLeft} <small>slots</small></strong></div>
          <a href="#pse-catalogue">Compare equipment <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <PseNotice tone="attention" title="Your tool cycle, at a glance">
        <p>PSEmine units are virtual campaign-capacity tools, not physical mining rigs. Starter, Builder and Advanced follow this cycle:</p>
        <PseFacts cols={2}>
          <PseFact label="01 · Operate" value="24 hours" hint="Eligible hourly accrual" />
          <PseFact label="02 · Maintain" value="Within 6 hours" hint="Free · manual action" />
          <PseFact label="03 · Restart" value="10 minutes" hint="No accrual during delay" />
          <PseFact label="04 · Resume" value="Next session" hint="Fresh 24-hour cycle" />
        </PseFacts>
        <p>The 6-hour window is reserved for free manual maintenance. Earnings accrue during active operating sessions; maintenance itself does not add earnings. Elite operates continuously while the campaign is active. The GBP/hour figure is the campaign accounting rate used to calculate eligible earnings. Recorded eligible earnings are settled in GBP at campaign end. You can then request payout in BNB; approved requests are paid after review.</p>
      </PseNotice>

      <PseStatBar cols={4}>
        <PseStat
          label="Equipment owned"
          value={`${ownedTools.length}`}
          note={`${operatingOwned} operating · ${TOOLS.reduce((a, t) => a + t.maxPerUser, 0)} account slots`}
        />
        <PseStat
          label="Tool capacity"
          value={toolCapacityLabel}
          note={`Max ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}`}
        />
        <PseStat
          label="Capacity headroom"
          value={headroomLabel}
          note={`${tierSlotsLeft} tier slot${tierSlotsLeft === 1 ? '' : 's'} open`}
        />
        <PseStat
          label="Referral capacity"
          value={referralCapacityLabel}
          note={`${referralQualified} qualified · total ${totalCapacityLabel}`}
        />
      </PseStatBar>

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
              const atLimit = owned >= tool.maxPerUser;
              const remaining = Math.max(0, tool.maxPerUser - owned);
              const continuous = dutyOf(tool) === 'continuous';
              return (
                <article className="pse-product" key={tool.id} data-product-index={index + 1}>
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
                    <span className="pse-product-avail">
                      {atLimit
                        ? 'Limit reached'
                        : purchaseOpen
                          ? `${remaining} slot${remaining === 1 ? '' : 's'} available`
                          : walletSetupRequired ? 'Receiving wallet setup pending' : 'Campaign purchases closed'}
                    </span>
                    {atLimit ? (
                      <span className="pse-rowitem-meta">At account limit</span>
                    ) : (
                      <PseButton size="sm" onClick={() => setPurchasing(tool)} disabled={!purchaseOpen}>
                        {purchaseOpen ? 'Buy this tool' : walletSetupRequired ? 'Unavailable' : 'Purchases closed'}
                      </PseButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <div className="pse-marketplace-footnote">
            <strong>Operating rules</strong>
            <span>Starter, Builder and Advanced run for 24 hours. After a session ends, you have 6 hours to request free manual maintenance. The next session is scheduled 10 minutes after that request; no rewards accrue during this delay. Each owned unit shows its backend-reported timing.</span>
            <span>Elite tools operate continuously while campaign mining is enabled. Displayed specifications are catalogue definitions; live state and timing are always taken from your account’s backend records.</span>
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
            <ol className="pse-marketplace-steps">
              <li><span>01</span><div><strong>Get a quote</strong><p>The GBP price is fixed and converted to an exact BNB amount for the quote window.</p></div></li>
              <li><span>02</span><div><strong>Approve in your wallet</strong><p>You review and sign the payment yourself. PSEmine never sends funds automatically.</p></div></li>
              <li><span>03</span><div><strong>Wait for verification</strong><p>The backend checks payer, recipient, amount and chain confirmations before activation.</p></div></li>
            </ol>
          </section>
        </aside>
      </div>
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
  const [uncertainRecovery, setUncertainRecovery] = useState(() => {
    if (!pending) return false;
    try {
      const saved = JSON.parse(localStorage.getItem('psemine_uncertain_payment') || 'null') as { purchaseId?: string } | null;
      return Boolean(saved?.purchaseId && saved.purchaseId === pending.purchaseId);
    } catch { return false; }
  });
  const [confirmedNoTransaction, setConfirmedNoTransaction] = useState(false);

  /** Forget the local binding (expired quote, wallet disconnect, restart). */
  const resetBinding = useCallback(() => { setBoundPayer(null); setPurchaseId(null); }, []);

  // ── Refresh recovery (runs before the quote effect) ────────────────────────
  // A live awaiting_payment intent is resumed with its ORIGINAL quote and payer;
  // a submitted intent opens the verification-recovery panel; an expired one
  // falls through to a fresh quote (the backend supersedes the dead intent and
  // keeps the old record as audit evidence).
  useEffect(() => {
    if (!pending) return;
    try {
      const saved = JSON.parse(localStorage.getItem('psemine_uncertain_payment') || 'null') as { purchaseId?: string } | null;
      if (saved?.purchaseId === pending.purchaseId) setUncertainRecovery(true);
    } catch { /* malformed local marker is ignored */ }
  }, [pending]);

  useEffect(() => {
    if (confirmedNoTransaction) return;
    if (uncertainRecovery && pending && pending.toolId === tool.id) {
      setPurchaseId(pending.purchaseId);
      setBoundPayer(pending.paymentWallet || null);
      setSubmissionState('UNKNOWN_SUBMISSION_STATE');
      setResult({ ok: false, uncertain: true, message: 'We could not confirm whether your wallet submitted this payment. Check the sending wallet before attempting another payment.' });
      setStep('result');
      return;
    }
    if (resume || !pending || pending.toolId !== tool.id) return;
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
    // Chain selection is handled automatically by payNow through the active
    // wallet provider. If needed, the wallet app will show its own switch/add
    // network approval prompt; the user must not navigate wallet settings.
    if (!quoteValid) return 'The quote expired. Refresh it to continue — the backend will not accept a stale quote.';
    if (!ownershipOk) return `Maximum ownership reached for ${tool.name}.`;
    return null;
  })();
  const payBlocked = blockedReason !== null;

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
      // 1. VERIFY / SWITCH NETWORK before creating a purchase intent.
      // A failed switch must not leave a bound, unpaid pending purchase.
      const chainOk = await ensurePaymentChain(quote.chainId || 56);
      if (!chainOk) {
        setSubmissionState('NOT_SUBMITTED');
        setStep('pay');
        toast.error(`Could not switch to ${networkName}. Approve the network request in your wallet app and try again.`);
        return;
      }
      // Refresh the displayed chain after the wallet approves the switch.
      await refreshWalletChain();

      // 2. BIND THE PAYER — server-side, against this account and this quote,
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

      // 3. to + value come VERBATIM from the server quote; from is the BOUND payer.
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
          // Lock the purchase on the backend, not just this browser. This keeps
          // another device from creating a second payment while the first
          // wallet handoff has an ambiguous outcome.
          let serverLocked = false;
          try {
            await PSEMineEngine.markPurchaseSubmissionUncertain(intentId);
            serverLocked = true;
          } catch (lockErr) {
            toast.error(lockErr instanceof Error
              ? `Payment status could not be synced to the server: ${lockErr.message}`
              : 'Payment status could not be synced to the server. Do not retry.');
          }
          setSubmissionState('UNKNOWN_SUBMISSION_STATE');
          try {
            localStorage.setItem('psemine_uncertain_payment', JSON.stringify({
              purchaseId: intentId, toolId: tool.id, payerWallet: payer,
              receiverWallet: quote.receiverWallet, quotedBNBWei: String(quote.bnbAmountWei || ''),
              createdAt: new Date().toISOString(),
            }));
          } catch { /* the live page still keeps the retry lock */ }
          setUncertainRecovery(true);
          setConfirmedNoTransaction(false);
          setResult({
            ok: false,
            uncertain: true,
            message: serverLocked
              ? 'We could not confirm whether your wallet submitted this payment. This purchase is now locked on your account while you check the sending wallet. Do not pay again if a transfer appears.'
              : 'We could not confirm whether your wallet submitted this payment, and the server could not confirm the recovery lock. Keep this purchase open and contact support before trying again.',
          });
          setStep('result');
          return;
        }
        throw sendErr;
      }
      if (!txHash) throw new Error('Transaction was not submitted.');
      setSubmissionState('SUBMITTED');
      // Store the hash on the backend before verification so a refresh or
      // another device can resume the exact same on-chain transfer.
      try {
        await PSEMineEngine.reportPurchaseSubmission(intentId, txHash, payer);
      } catch (reportErr) {
        // Fail closed against a second purchase if the hash write failed.
        await PSEMineEngine.markPurchaseSubmissionUncertain(intentId).catch(() => false);
        setResult({
          ok: false, uncertain: true, hash: txHash,
          message: 'Your wallet returned a transaction hash, but PSEmine could not save it to the server. Do not send again. Keep this hash and use it for reconciliation.',
        });
        setUncertainRecovery(true);
        setStep('result');
        return;
      }

      // 6. Backend verifies on-chain; activation is server-authoritative.
      setSubmissionState('CONFIRMING');
      const res = await submitPurchaseTx(intentId, txHash, payer);
      if (res.success) {
        setSubmissionState('VERIFIED');
        try { localStorage.removeItem('psemine_uncertain_payment'); } catch { /* storage unavailable */ }
        setUncertainRecovery(false);
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

  return (
    <PsePage
      title={`Purchase ${tool.name}`}
      objective={`${continuous ? 'Continuous duty' : 'Session duty'} · ${gbp(tool.purchasePriceGBP)} · adds ${gbpHour(tool.hourlyRateGBP)} of capacity`}
      actions={<PseButton variant="secondary" size="sm" onClick={onClose} disabled={step === 'verifying' && !showingRecovery}>Close</PseButton>}
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
          </PseFacts>

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
                      ? `Network not confirmed yet — PSEmine will request ${networkName} automatically when you tap Pay`
                      : `Network switch required — PSEmine will request ${networkName} automatically before payment`,
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
                ? `Your wallet is connected, but its network is not confirmed yet. When you tap Pay, PSEmine will ask your wallet app to verify or switch to ${networkName} (chain ${requiredChainId}).`
                : `Your wallet is currently on chain ${walletChainId}. When you tap Pay, PSEmine will request ${networkName} (chain ${requiredChainId}) from your wallet app before preparing the payment.`}
              {' '}Approve that network request in the wallet app if it appears; you do not need to open wallet settings yourself.
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
          <p className="pse-block-note">
            After you send, the backend verifies your transaction on-chain — sender, recipient, exact amount and
            confirmation depth — before the tool activates.
          </p>
        </PseSection>
      )}

      {/* ── Step: verifying ── */}
      {!showingRecovery && step === 'verifying' && (
        <PseSection title="Verifying on BNB Smart Chain">
          <p className="pse-prose" role="status" aria-live="polite">
            Confirming sender, recipient, amount and network confirmations. Don&apos;t close this window.
          </p>
          <p className="pse-block-meta">{submissionState} · {SUBMISSION_LABEL[submissionState]}</p>
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
          {result.hash && (
            <p className="text-sm">
              <a href={`https://bscscan.com/tx/${result.hash}`} target="_blank" rel="noreferrer" className="pse-link">
                View {shortHash(result.hash)} on BscScan
              </a>
            </p>
          )}

          {result.uncertain && (
            <PseNotice tone="attention" title="Check your wallet before retrying">
              The wallet did not return a transaction result, so PSEmine cannot tell whether the transfer was submitted.
              This does not mean the payment failed. Check the activity for the sending wallet
              {boundPayer ? <> (<a className="pse-link" href={`https://bscscan.com/address/${boundPayer}`} target="_blank" rel="noreferrer">{shortAddr(boundPayer)} on BscScan</a>)</> : ''}.
              If a transfer appears, do not pay again. Keep its transaction hash and the sending wallet address so support
              can reconcile that exact on-chain transfer. If no transfer appears, confirm below before requesting a new quote.
            </PseNotice>
          )}
          {result.uncertain && !confirmedNoTransaction && (
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
      <p className="pse-prose">
        A wallet is required to sign the payment. PSEmine never requests automatic transfers — every payment must be
        approved in your wallet.
      </p>

      <div className="flex flex-wrap gap-2">
        {walletConnectAvailable ? (
          <PseButton onClick={() => void connectWalletConnectTransport()} disabled={isConnectingWallet}>
            Connect Wallet
          </PseButton>
        ) : (
          injectedWallets.map(w => (
            <PseButton key={w.id} onClick={() => void connectWallet(w.id)} disabled={isConnectingWallet}>
              Connect {w.name}
            </PseButton>
          ))
        )}
      </div>

      {isConnectingWallet && (
        <PseNotice title="Waiting for wallet approval">
          Your wallet may open as a separate app. Choose it and approve the connection there, then return to this PSEmine tab.
          Keep this tab open; PSEmine will confirm the session when your wallet returns.
        </PseNotice>
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
