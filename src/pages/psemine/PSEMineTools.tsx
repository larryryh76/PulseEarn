import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseState } from '../../components/psemine/PseStateProvider';
import { type PsePendingPurchase, type PseStateTool, createHostedPaymentInvoice, fetchHostedPaymentStatus } from '../../engines/psemine/pseMineApi';
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
        {tool.lastAccruedAt && <p className="pse-owned-tool-updated">Last accrual checkpoint: {new Date(tool.lastAccruedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p>}
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

  const ownedByTool = (id: string) => ownedTools.filter(t => (t.toolId || '') === id).length;
  const operatingOwned = ownedTools.filter(t => (t.cycleState || t.status) === 'active').length;

  const purchasePending = purchasing && pendingPurchase?.toolId === purchasing.id ? pendingPurchase : null;

  return (
    <>
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
 * ORDER IS THE POINT: quote → bind payer → chain assertion → sign → submit
 * hash. Refresh recovery resumes an existing intent with its ORIGINAL quote
 * and payer instead of creating a second one.
 * ═══════════════════════════════════════════════════════════════════════ */
const PurchaseFlow: React.FC<{ tool: PSEMineToolDefinition; pending: PsePendingPurchase | null; onClose: () => void }> = ({ tool, onClose }) => {
  const { refresh } = usePseState();
  const [creating, setCreating] = useState(true);
  const [checking, setChecking] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('creating');
  const [priceAmount, setPriceAmount] = useState<string | null>(null);
  const [priceCurrency, setPriceCurrency] = useState<string>('GBP');
  const [error, setError] = useState<string | null>(null);

  const createInvoice = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const invoice = await createHostedPaymentInvoice(tool.id);
      setOrderId(invoice.orderId);
      setCheckoutUrl(invoice.checkoutUrl);
      setPriceAmount(invoice.priceAmount);
      setPriceCurrency(invoice.priceCurrency.toUpperCase());
      setStatus('pending');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Secure checkout could not be started.');
      setStatus('failed');
    } finally {
      setCreating(false);
    }
  }, [tool.id]);

  useEffect(() => {
    let cancelled = false;
    void createHostedPaymentInvoice(tool.id).then(invoice => {
      if (cancelled) return;
      setOrderId(invoice.orderId);
      setCheckoutUrl(invoice.checkoutUrl);
      setPriceAmount(invoice.priceAmount);
      setPriceCurrency(invoice.priceCurrency.toUpperCase());
      setStatus('pending');
    }).catch(e => {
      if (!cancelled) {
        setError(e instanceof Error ? e.message : 'Secure checkout could not be started.');
        setStatus('failed');
      }
    }).finally(() => { if (!cancelled) setCreating(false); });
    return () => { cancelled = true; };
  }, [tool.id]);

  const checkStatus = useCallback(async () => {
    if (!orderId || checking) return;
    setChecking(true);
    try {
      const latest = await fetchHostedPaymentStatus(orderId);
      setStatus(latest.status);
      if (latest.status === 'paid') {
        toast.success('Payment confirmed. Your tool is active.');
        await refresh();
      } else if (latest.status === 'review') {
        toast('Payment received and awaiting review.', { icon: '⏳' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh payment status.');
    } finally {
      setChecking(false);
    }
  }, [orderId, checking, refresh]);

  useEffect(() => {
    if (!orderId || ['paid', 'expired', 'failed', 'refunded', 'review'].includes(status)) return;
    const timer = window.setInterval(() => { void checkStatus(); }, 6000);
    return () => window.clearInterval(timer);
  }, [orderId, status, checkStatus]);

  const openCheckout = () => {
    if (!checkoutUrl) return;
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
  };

  const statusText: Record<string, string> = {
    creating: 'Preparing secure checkout',
    pending: 'Waiting for payment',
    confirming: 'Confirming on the blockchain',
    paid: 'Payment confirmed',
    underpaid: 'Payment amount needs review',
    expired: 'Checkout expired',
    failed: 'Checkout unavailable',
    refunded: 'Payment refunded',
    review: 'Payment awaiting review',
  };

  return (
    <div className="pse-modal-backdrop" role="presentation">
      <div className="pse-modal pse-payment-v2" role="dialog" aria-modal="true" aria-labelledby="pse-payment-v2-title">
        <PsePage title="Secure tool checkout" objective="Pay with the cryptocurrency and wallet you prefer.">
          <PseSection title={tool.name}>
            <p className="pse-prose">
              You do not need to connect a wallet to PulseEarn. Continue to our secure payment provider, choose an
              available cryptocurrency and network, then pay from your preferred wallet.
            </p>
            {priceAmount && (
              <PseFacts>
                <PseFact label="Tool price" value={`${priceCurrency} ${priceAmount}`} />
                <PseFact label="Payment provider" value="NOWPayments" />
              </PseFacts>
            )}
            <PseNotice title={statusText[status] || 'Checking payment'}>
              {status === 'paid'
                ? 'Your payment has been independently confirmed and the tool has been activated.'
                : status === 'review'
                  ? 'Your payment has been received, but an administrator must reconcile it before activation. Do not pay again.'
                  : status === 'underpaid'
                    ? 'The provider reported an incomplete payment. Do not send another payment until the order is reviewed.'
                    : status === 'expired'
                      ? 'This checkout has expired. You can start a new checkout.'
                      : status === 'failed'
                        ? (error || 'We could not create a secure checkout. No payment was taken.')
                        : 'Your checkout status updates automatically. Returning to PulseEarn does not itself confirm payment.'}
            </PseNotice>
            {error && status !== 'failed' && <PseNotice tone="attention" title="Status refresh issue">{error}</PseNotice>}
            {creating && <PseLoading label="Preparing your secure checkout…" />}
            <div className="flex flex-wrap gap-2">
              {checkoutUrl && !['paid', 'review', 'expired', 'failed', 'refunded'].includes(status) && (
                <PseButton onClick={openCheckout}>Continue to secure checkout</PseButton>
              )}
              {orderId && !['paid', 'review'].includes(status) && (
                <PseButton variant="secondary" onClick={() => void checkStatus()} disabled={checking}>
                  {checking ? 'Checking…' : 'Check payment status'}
                </PseButton>
              )}
              {['expired', 'failed'].includes(status) && (
                <PseButton onClick={() => void createInvoice()} disabled={creating}>
                  {creating ? 'Preparing…' : 'Try checkout again'}
                </PseButton>
              )}
              {status === 'paid' && <PseButton onClick={onClose}>Continue to my tools</PseButton>}
              {status !== 'paid' && <PseButton variant="secondary" onClick={onClose}>Close</PseButton>}
            </div>
            {orderId && (
              <p className="pse-prose pse-prose--sm">Order reference: <code>{orderId}</code></p>
            )}
          </PseSection>
        </PsePage>
      </div>
    </div>
  );
};

export default PSEMineTools;
