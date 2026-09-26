/**
 * PSEmine design system — shared primitives (React + helpers).
 *
 * Rules encoded here:
 * - The server clock is authoritative: countdowns anchor to serverTimeMs.
 * - Color only ever encodes state (never decoration).
 * - Every map below mirrors the actual backend state machines.
 * - Composition law: VERDICT → RAILS → LEDGERS → NOTES. Ledgers are the only
 *   bordered containers; rails are ruled instrument bands, never cards.
 * - ONE campaign rail and ONE capacity register exist in the whole product.
 */
import React, { useEffect, useState } from 'react';
import {
  Clock, Pause, Ban, Loader, Cog, Wrench, CheckCircle2, Circle,
  XCircle, Hourglass, Wallet, RefreshCcw, Archive, PlayCircle,
  ServerCog, ShieldAlert, Inbox, AlertTriangle, Copy as CopyIcon, Check,
  WifiOff, LogIn, ShieldX, ServerOff,
} from 'lucide-react';
import type { PseErrorInfo, PseErrorKind } from '../../engines/psemine/pseErrors';
import { PSELogo as BrandMark, PSELoader } from './PSEBrand';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS, type PSEToolTierId } from '../../types/psemine';

/* ── Server-anchored clock ────────────────────────────────────────────
 * Server time is the only authority for cycles and countdowns. We anchor to
 * the backend's serverTimeMs from /api/mine/state and interpolate locally
 * between checkpoints. */
let serverAnchor: { serverMs: number; localMs: number } | null = null;
export function anchorServerTime(serverMs?: number) {
  if (typeof serverMs === 'number' && Number.isFinite(serverMs) && serverMs > 0) {
    serverAnchor = { serverMs, localMs: Date.now() };
  }
}
export function nowMs(): number {
  if (!serverAnchor) return Date.now();
  return serverAnchor.serverMs + (Date.now() - serverAnchor.localMs);
}

/* ── Campaign status ────────────────────────────────────────────────── */
export const CAMPAIGN_STATUS_MAP: Record<string, {
  label: string; tone: StampTone;
  headline: string; detail: string; live: boolean;
}> = {
  scheduled: { label: 'Scheduled', tone: 'idle', headline: 'Campaign hasn\u2019t started yet', detail: 'Mining begins when the campaign goes live.', live: false },
  active:    { label: 'Active',    tone: 'live', headline: 'Mining available', detail: 'Tools are operating and accruing on schedule.', live: true },
  paused:    { label: 'Paused',    tone: 'attn', headline: 'Mining temporarily paused', detail: 'Accrual is paused network-wide. It resumes automatically when the campaign resumes.', live: false },
  settling:  { label: 'Settling',  tone: 'info', headline: 'Mining ended — final earnings being calculated', detail: 'Accrual has stopped. Final balances are being calculated for settlement.', live: false },
  payout:    { label: 'Payout',    tone: 'info', headline: 'Payout processing', detail: 'Settled balances are being disbursed to configured payout wallets.', live: false },
  closed:    { label: 'Closed',    tone: 'idle', headline: 'Campaign finished', detail: 'The campaign has finished. Balances were settled.', live: false },
  archived:  { label: 'Archived',  tone: 'idle', headline: 'Public mining interface closed', detail: 'This campaign is archived. Records remain available.', live: false },
};

export function campaignStatusView(status?: string | null) {
  return CAMPAIGN_STATUS_MAP[status || ''] || CAMPAIGN_STATUS_MAP.scheduled;
}

/* ── Tool operating cycle (backend derive_cycle state machine) ──────── */
type ChipIcon = React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;

export const CYCLE_STATE_MAP: Record<string, {
  label: string; tone: StampTone; icon: ChipIcon;
  description: string; live: boolean;
}> = {
  active:                { label: 'Active',                tone: 'live', icon: PlayCircle, description: 'Operating normally — accruing hourly.', live: true },
  restarting:            { label: 'Restarting',            tone: 'info', icon: RefreshCcw, description: 'Restart in progress — the next mining session begins automatically at the backend-scheduled time.', live: false },
  cycle_complete:        { label: 'Cycle Complete',        tone: 'attn', icon: Clock,      description: '24-hour operating cycle finished. Maintenance is available.', live: false },
  maintenance_required:  { label: 'Maintenance Required',  tone: 'fail', icon: Wrench,     description: 'Cycle finished and the grace window passed. Maintain the tool to resume mining.', live: false },
  paused:                { label: 'Paused',                tone: 'attn', icon: Pause,      description: 'Campaign paused — tool is not accruing.', live: false },
  settling:              { label: 'Settling',              tone: 'info', icon: ServerCog,  description: 'Campaign settlement in progress.', live: false },
  ended:                 { label: 'Ended',                 tone: 'idle', icon: Ban,        description: 'Campaign ended — accrual stopped.', live: false },
  archived:              { label: 'Archived',              tone: 'idle', icon: Archive,    description: 'Campaign archived.', live: false },
  revoked:               { label: 'Revoked',               tone: 'fail', icon: XCircle,    description: 'Ownership revoked.', live: false },
  expired:               { label: 'Expired',               tone: 'idle', icon: Hourglass,  description: 'Ownership expired.', live: false },
  inactive:              { label: 'Inactive',              tone: 'idle', icon: Circle,     description: 'Not yet operating.', live: false },
};

export function cycleStateView(state?: string | null) {
  return CYCLE_STATE_MAP[state || ''] || CYCLE_STATE_MAP.inactive;
}

/* ── Operating model labels (session vs continuous) ───────────────────
 * Mirrors the backend per-tool operating model. Runtime behavior itself is
 * backend-authoritative; these labels only describe it. */
export function operatingModelView(model?: string | null): { label: string; detail: string } {
  return model === 'continuous'
    ? { label: 'Continuous mining', detail: 'No manual restart required' }
    : { label: 'Session mining', detail: 'Manual restart required between sessions' };
}

/* ── Purchase status ────────────────────────────────────────────────── */
export const PURCHASE_STATUS_MAP: Record<string, {
  label: string; tone: StampTone; terminal: boolean;
}> = {
  created:               { label: 'Created',               tone: 'idle', terminal: false },
  awaiting_payment:      { label: 'Awaiting Payment',      tone: 'attn', terminal: false },
  transaction_submitted: { label: 'Transaction Submitted', tone: 'info', terminal: false },
  confirming:            { label: 'Confirming on BSC',     tone: 'info', terminal: false },
  confirmed:             { label: 'Confirmed',             tone: 'live', terminal: false },
  activated:             { label: 'Tool Activated',        tone: 'live', terminal: true },
  expired:               { label: 'Quote Expired',         tone: 'idle', terminal: true },
  underpaid:             { label: 'Underpaid',             tone: 'fail', terminal: true },
  failed:                { label: 'Failed',                tone: 'fail', terminal: true },
  manual_review:         { label: 'Manual Review',         tone: 'attn', terminal: true },
  reversed:              { label: 'Reversed',              tone: 'idle', terminal: true },
};

export function purchaseStatusView(status?: string | null) {
  return PURCHASE_STATUS_MAP[status || ''] || PURCHASE_STATUS_MAP.created;
}

/* ── Referral stage ─────────────────────────────────────────────────── */
export const REFERRAL_STAGE_MAP: Record<string, { label: string; tone: StampTone; step: number; help: string }> = {
  registered:       { label: 'Registered',       tone: 'idle', step: 1, help: 'Signed up with your referral code. No capacity yet.' },
  wallet_connected: { label: 'Wallet Connected', tone: 'info', step: 2, help: 'Connected a BNB Smart Chain wallet. Not yet earning for you.' },
  tool_purchased:   { label: 'Tool Purchased',   tone: 'attn', step: 3, help: 'Purchased a mining tool. Qualifies when their first tool activates.' },
  mining_active:    { label: 'Mining Active',    tone: 'info', step: 4, help: 'Mining is live. Qualification settles on the backend shortly.' },
  qualified:        { label: 'Qualified',        tone: 'live', step: 5, help: 'Qualified — added +£0.30/hour to your referral capacity.' },
  rejected:         { label: 'Rejected',         tone: 'fail', step: 0, help: 'This referral did not qualify.' },
};

export function referralStageView(stage?: string | null) {
  return REFERRAL_STAGE_MAP[stage || ''] || REFERRAL_STAGE_MAP.registered;
}

export const REFERRAL_STAGES = [
  { id: 'registered', label: 'Registered' },
  { id: 'wallet_connected', label: 'Wallet connected' },
  { id: 'tool_purchased', label: 'Tool purchased' },
  { id: 'mining_active', label: 'Mining active' },
  { id: 'qualified', label: 'Qualified' },
] as const;

/* ── Payout status ──────────────────────────────────────────────────── */
export const PAYOUT_STATUS_MAP: Record<string, { label: string; tone: StampTone }> = {
  pending:      { label: 'Pending',      tone: 'attn' },
  under_review: { label: 'Under Review', tone: 'info' },
  approved:     { label: 'Approved',     tone: 'info' },
  processing:   { label: 'Processing',   tone: 'info' },
  paid:         { label: 'Paid',         tone: 'live' },
  failed:       { label: 'Failed',       tone: 'fail' },
  reversed:     { label: 'Reversed',     tone: 'idle' },
};

export function payoutStatusView(status?: string | null) {
  return PAYOUT_STATUS_MAP[status || ''] || PAYOUT_STATUS_MAP.pending;
}

/* ── Formatters ─────────────────────────────────────────────────────── */
export function gbp(value: number | null | undefined): string {
  const v = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return `£${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function gbpHour(v?: number | null): string {
  const x = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return `£${x.toFixed(2)}/hour`;
}
export function gbpRate(v?: number | null): string {
  const x = typeof v === 'number' && Number.isFinite(v) ? v : 0;
  return `£${x.toFixed(2)}/hr`;
}
export function shortHash(h?: string | null, size = 6): string {
  if (!h) return '—';
  return h.length <= size * 2 + 3 ? h : `${h.slice(0, size)}…${h.slice(-4)}`;
}
/**
 * EXACT BNB display, derived from the server's wei string. This is THE single
 * rendering path for a quoted amount: the quote block, the payment summary and
 * the pay button all render this value, so they can never disagree (the
 * previous defect showed 0.005273 in the quote while the button said 0.0053).
 * Never rounds: trailing zeros are trimmed, nothing else.
 */
export function bnbExactFromWei(wei?: string | number | null, fallbackBnb?: number | null): string {
  const w = typeof wei === 'string'
    ? wei.trim()
    : typeof wei === 'number' && Number.isFinite(wei) ? String(Math.floor(wei)) : '';
  if (/^\d+$/.test(w) && w.length > 0) {
    const padded = w.padStart(19, '0');
    const whole = padded.slice(0, padded.length - 18);
    const frac = padded.slice(-18).replace(/0+$/, '');
    return frac ? `${whole}.${frac}` : whole;
  }
  // Legacy quotes without a wei string: fall back to the numeric amount at the
  // same 6-decimal precision the backend quoted with.
  return typeof fallbackBnb === 'number' && Number.isFinite(fallbackBnb) ? fallbackBnb.toFixed(6) : '—';
}
export function shortAddr(a?: string | null): string {
  if (!a) return '—';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
export function timeAgo(iso?: unknown, now: number = nowMs()): string {
  const t = toDateSafe(iso)?.getTime();
  if (t === undefined) return '—';
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtDateTime(iso?: unknown): string {
  const t = toDateSafe(iso)?.getTime();
  if (t === undefined) return '—';
  return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
/** Accepts ISO strings, epoch millis, Date, or Firestore Timestamps. */
export function toDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'string') { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v === 'object') {
    const o = v as { toDate?: () => Date; seconds?: number; nanoseconds?: number };
    if (typeof o.toDate === 'function') {
      try { const d = o.toDate(); return isNaN(d.getTime()) ? null : d; } catch { return null; }
    }
    if (typeof o.seconds === 'number') {
      const d = new Date(o.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}
export function remainingFrom(iso?: unknown, now: number = nowMs()): { text: string; ms: number } {
  const end = toDateSafe(iso)?.getTime();
  if (end === undefined) return { text: '—', ms: 0 };
  const d = end - now;
  if (d <= 0) return { text: 'Complete', ms: 0 };
  const h = Math.floor(d / 3_600_000);
  const m = Math.floor((d % 3_600_000) / 60_000);
  const s = Math.floor((d % 60_000) / 1000);
  if (h > 0) return { text: `${h}h ${String(m).padStart(2, '0')}m remaining`, ms: d };
  if (m > 0) return { text: `${m}m ${String(s).padStart(2, '0')}s remaining`, ms: d };
  return { text: `${s}s remaining`, ms: d };
}

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}

/* ── Activity icon map (mirrors backend PSEMineActivityType) ────────── */
export const ACTIVITY_ICONS: Record<string, ChipIcon> = {
  tool_purchased: Wallet, TOOL_PURCHASE: Wallet,
  payment_confirmed: CheckCircle2,
  tool_activated: Cog,
  capacity_updated: Loader, CAPACITY_UPDATED: Loader,
  maintenance_completed: Wrench,
  referral_registered: Circle,
  referral_qualified: CheckCircle2, REFERRAL_QUALIFIED: CheckCircle2,
  mining_accrual: RefreshCcw,
  campaign_state_changed: ServerCog,
  settlement_prepared: ServerCog,
  payout_processing: Hourglass,
  payout_completed: CheckCircle2,
  wallet_updated: Wallet, WALLET_UPDATE: Wallet,
  fraud_flag: ShieldAlert,
  maintenance_required: Wrench,
  campaign_ending: Clock,
  campaign_ended: Archive,
  wallet_update_required: Wallet,
};

/* ════════════════════════════ React primitives ═══════════════════════ */

export function PSELogo({ size = 32, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  // The recovered + refined PSEmine mark (PSEBrand.tsx).
  return <BrandMark size={size} withWordmark={withWordmark} />;
}

/**
 * PSEEmpty — a ledger with nothing in it.
 * The empty state is part of the product, so it states the fact, says what the
 * ledger will contain, and offers the next action. No illustration, no
 * mascot, and never a fabricated row.
 */
export function PSEEmpty({ icon: Icon = Inbox, title, body, action }: {
  icon?: ChipIcon; title: string; body?: string; action?: React.ReactNode;
}) {
  return (
    <div className="pse-empty-state">
      <p className="pse-np flex items-center gap-2">
        <Icon size={12} aria-hidden="true" /> {title}
      </p>
      {body && <p className="pse-meta pse-measure">{body}</p>}
      {action}
    </div>
  );
}

/* ── Error states, by kind ──────────────────────────────────────────────
 * A generic error screen is only correct when the failure is genuinely
 * unknown. Everything we can identify gets its own icon, copy and action. */
const ERROR_PRESENTATION: Record<PseErrorKind, { icon: ChipIcon; tone: string }> = {
  auth:        { icon: LogIn,         tone: 'var(--pse-text-2)' },
  permission:  { icon: ShieldX,       tone: 'var(--pse-amber)' },
  validation:  { icon: AlertTriangle, tone: 'var(--pse-amber)' },
  conflict:    { icon: RefreshCcw,    tone: 'var(--pse-text-2)' },
  rate_limit:  { icon: Hourglass,     tone: 'var(--pse-text-3)' },
  unavailable: { icon: ServerOff,     tone: 'var(--pse-amber)' },
  backend:     { icon: ServerCog,     tone: 'var(--pse-amber)' },
  network:     { icon: WifiOff,       tone: 'var(--pse-text-3)' },
  data:        { icon: AlertTriangle, tone: 'var(--pse-amber)' },
  unknown:     { icon: AlertTriangle, tone: 'var(--pse-red)' },
};

export function PSEError({ error, onRetry, retrying, action, compact }: {
  error: PseErrorInfo;
  onRetry?: () => void;
  retrying?: boolean;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  const view = ERROR_PRESENTATION[error.kind] || ERROR_PRESENTATION.unknown;
  const Icon = view.icon;
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12'}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border"
        style={{ borderColor: view.tone, background: 'var(--pse-sunken)' }}>
        <Icon size={19} style={{ color: view.tone }} />
      </div>
      <p className="pse-h3">{error.title}</p>
      <p className="pse-meta max-w-md">{error.message}</p>
      <div className="mt-1 flex flex-col items-center gap-2 sm:flex-row">
        {error.retryable && onRetry && (
          <button type="button" onClick={onRetry} disabled={retrying} className="pse-btn pse-btn-2 pse-btn-sm">
            <RefreshCcw size={13} className={retrying ? 'animate-spin' : ''} /> Try again
          </button>
        )}
        {action}
      </div>
      {error.operation && (
        <p className="pse-meta mt-1 pse-mono" style={{ color: 'var(--pse-text-3)' }}>
          {error.operation}{error.status ? ` · ${error.status}` : ''}{error.code ? ` · ${error.code}` : ''}
        </p>
      )}
    </div>
  );
}

/** Inline, non-blocking notice for a degraded (secondary) data feed. */
export function FeedNotice({ message, onRetry, retrying }: { message: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ background: 'var(--pse-sunken)' }}>
      <p className="pse-meta flex items-center gap-2" style={{ color: 'var(--pse-amber)' }}>
        <AlertTriangle size={12} className="shrink-0" /> {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="pse-btn pse-btn-3 pse-btn-sm shrink-0">
          <RefreshCcw size={11} className={retrying ? 'animate-spin' : ''} /> Retry
        </button>
      )}
    </div>
  );
}

export function PSELoading({ label = 'Loading', skeleton = false }: { label?: string; skeleton?: boolean }) {
  if (skeleton) {
    return (
      <div className="space-y-3" role="status" aria-live="polite" aria-label={label}>
        <div className="pse-skeleton h-[118px]" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="pse-skeleton h-[86px]" />
          <div className="pse-skeleton h-[86px]" />
        </div>
        <div className="pse-skeleton h-[220px]" />
      </div>
    );
  }
  // Branded loader: the PSEmine mark breathing — not a generic spinner.
  return (
    <div className="flex items-center justify-center py-14" role="status" aria-live="polite">
      <PSELoader label={label} size={38} />
    </div>
  );
}

/** Copyable mono field with a transient copied state. */
export function CopyField({ value, display, label, fullWidth }: {
  value: string; display?: string; label?: string; fullWidth?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { if (await copyText(value)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }}
      className={`group inline-flex max-w-full items-center gap-2 rounded-lg border py-2.5 pl-2.5 pr-3 transition-colors ${fullWidth ? 'w-full justify-between' : ''}`}
      style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-sunken)', minHeight: 44 }}
      aria-label={label ? `Copy ${label}` : 'Copy to clipboard'}
    >
      <span className="pse-mono truncate">{display || value}</span>
      {copied
        ? <Check size={12} style={{ color: 'var(--pse-success-ink)' }} className="shrink-0" />
        : <CopyIcon size={12} className="shrink-0" style={{ color: 'var(--pse-text-3)' }} />}
    </button>
  );
}

/** Labelled control wrapper used by every form in the console. */
export function Field({ label, hint, children, htmlFor }: {
  label: string; hint?: string; children: React.ReactNode; htmlFor?: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="pse-label mb-1.5 flex items-baseline justify-between">
        {label}
        {hint && <span className="pse-meta">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ════════════════════ v3 composition primitives ══════════════════════════
 * Measured corrections to the composition layer. The rendered build showed
 * eight sections sharing one identical heading size, 31 bordered card-like
 * boxes on a single marketing page and a 3.35e7px radius alongside four
 * near-identical ones. These primitives make the corrected composition the
 * easy thing to write.
 * ════════════════════════════════════════════════════════════════════════ */

/**
 * usePseDocumentTitle — PSEmine routes must own the browser title.
 *
 * Verified defect: every /mine/* route kept the PulseEarn product title, so a
 * PSEmine session appeared as PulseEarn in the tab, history and bookmarks.
 * The previous title is restored on unmount so PulseEarn is unaffected.
 */
export function usePseDocumentTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · PSEmine`;
    return () => { document.title = previous; };
  }, [title]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   DUTY & LEDGER — the approved primitive set.

   Composition law:  VERDICT (unframed) → RAILS → LEDGERS → NOTES.
   Canonical instruments (there is exactly ONE of each — every screen consumes
   these, none re-draws them):
     • DutyRail      — the 90-day campaign: phase, position, elapsed, remaining
     • CapacityRail  — tool capacity + referral capacity → total £/hour
   Ledgers are the only bordered containers. Stamps key state in mono caps.
   ═════════════════════════════════════════════════════════════════════════ */

export type StampTone = 'live' | 'attn' | 'fail' | 'info' | 'idle';

/** State as a mono-caps key. Shape and wording carry meaning; colour keys it. */
export function Stamp({ tone = 'info', glyph, children, pulse }: {
  tone?: StampTone; glyph?: string; children: React.ReactNode; pulse?: boolean;
}) {
  return (
    <span className="pse-stamp" data-tone={tone}>
      {pulse ? <span className="pse-live-dot" aria-hidden="true" /> : glyph ? <span className="pse-stamp-glyph" aria-hidden="true">{glyph}</span> : null}
      {children}
    </span>
  );
}

/** The stamp tone for a backend campaign status — read from the status map, so
 *  a status can never render a label and a colour key that disagree. */
export function campaignTone(status?: string | null): StampTone {
  return campaignStatusView(status).tone;
}

/** The stamp tone for a tool's derived cycle state — same single source. */
export function cycleTone(state?: string | null): StampTone {
  return cycleStateView(state).tone;
}

/**
 * StatementHeader — the opening block of a console route.
 * A route key in mono caps, the route's title, one line stating its objective,
 * the as-of time, then actions. It carries NO surface: hierarchy comes from
 * type, never from a container.
 */
export function StatementHeader({ routeKey, title, objective, status, actions, asOf }: {
  routeKey: string; title: string; objective?: string; status?: React.ReactNode;
  actions?: React.ReactNode; asOf?: string;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="pse-np">{routeKey}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="pse-h1">{title}</h1>
          {status}
        </div>
        {objective && <p className="pse-copy-s pse-measure">{objective}</p>}
        {asOf && <p className="pse-np">As of {asOf}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Verdict — the answer, on the canvas.
 * The primary figure of a screen is never inside a tinted panel: it is type on
 * the page background, dominating every secondary read.
 */
export function Verdict({ label, value, unit, status, note, side }: {
  label: string; value: string; unit?: string; status?: React.ReactNode;
  note?: React.ReactNode; side?: React.ReactNode;
}) {
  return (
    <section className="pse-verdict">
      <div className="pse-verdict-top">
        <p className="pse-np">{label}</p>
        {status}
      </div>
      <p className="pse-fig-a pse-n pse-bone pse-verdict-fig">
        {value}
        {unit && <span className="pse-meta" style={{ marginLeft: 8 }}>{unit}</span>}
      </p>
      {note && <p className="pse-verdict-sub">{note}</p>}
      {side && <div className="pse-verdict-side">{side}</div>}
    </section>
  );
}

/** RailBand — a ruled instrument band. Not a card: label, key, content. */
export function RailBand({ label, meta, right, legend, children, className }: {
  label: string; meta?: React.ReactNode; right?: React.ReactNode;
  legend?: Array<{ kind: 'jade' | 'ghost' | 'steel'; text: string }>;
  children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`pse-rail ${className || ''}`}>
      <div className="pse-rail-head">
        <p className="pse-np">{label}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {meta && <span className="pse-meta">{meta}</span>}
          {right}
        </div>
      </div>
      {legend && legend.length > 0 && (
        <ul className="pse-rail-key">
          {legend.map(l => (
            <li key={l.text}>
              <span className={l.kind === 'jade' ? 'pse-k-jade' : l.kind === 'ghost' ? 'pse-k-ghost' : 'pse-k-steel'} aria-hidden="true" />
              {l.text}
            </li>
          ))}
        </ul>
      )}
      {children}
    </section>
  );
}

/* ── THE canonical campaign clock ───────────────────────────────────────────
 * One implementation of the 90-day arithmetic for the whole product. The shell
 * band, the dashboard, the landing and the guide all read from this; no screen
 * derives the campaign day from a browser clock on its own.
 * ───────────────────────────────────────────────────────────────────────── */

export type CampaignPhaseKey = 'launch' | 'mining' | 'settlement' | 'payout' | 'closed';

export const CAMPAIGN_PHASES: Array<{ key: CampaignPhaseKey; label: string }> = [
  { key: 'launch', label: 'Launch' },
  { key: 'mining', label: 'Mining' },
  { key: 'settlement', label: 'Settlement' },
  { key: 'payout', label: 'Payout' },
  { key: 'closed', label: 'Closed' },
];

const PHASE_INDEX: Record<string, number> = {
  scheduled: 0, active: 1, paused: 1, settling: 2, payout: 3, closed: 4, archived: 4,
};

/**
 * Structural campaign input.
 * Accepts the locked product type, the API state projection and a raw Firestore
 * document alike — the rail only ever reads dates, duration and status.
 */
export interface CampaignClockInput {
  startAt?: unknown;
  endAt?: unknown;
  durationDays?: number | null;
  status?: string | null;
  name?: string | null;
}

export interface CampaignClock {
  totalDays: number;
  startMs: number | null;
  endMs: number | null;
  /** 1-based campaign day, or null before the campaign window opens. */
  dayNumber: number | null;
  daysLeft: number | null;
  /** 0–100 through the campaign window. */
  progress: number;
  phaseIndex: number;
  phases: Array<{ key: CampaignPhaseKey; label: string; state: 'done' | 'current' | 'pending' }>;
}

/**
 * Campaign position, derived from backend campaign dates only (never invented).
 * A 60s tick keeps relative figures honest without polling the server.
 */
export function useCampaignClock(
  campaign?: CampaignClockInput | null,
  statusOverride?: string | null,
): CampaignClock {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const status = statusOverride ?? campaign?.status ?? 'scheduled';
  const totalDays = campaign?.durationDays && campaign.durationDays > 0
    ? campaign.durationDays
    : PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS;
  const startMs = toDateSafe(campaign?.startAt)?.getTime() ?? null;
  const endMs = toDateSafe(campaign?.endAt)?.getTime() ?? null;
  const now = nowMs();
  const live = ['active', 'paused', 'settling', 'payout'].includes(status);
  const dayNumber = live && typeof startMs === 'number'
    ? Math.min(totalDays, Math.max(1, Math.floor((now - startMs) / 86_400_000) + 1))
    : null;
  const daysLeft = typeof endMs === 'number' ? Math.max(0, Math.ceil((endMs - now) / 86_400_000)) : null;
  const progress = dayNumber === null ? 0 : Math.min(100, Math.max(0, (dayNumber / totalDays) * 100));
  const phaseIndex = PHASE_INDEX[status] ?? 0;

  return {
    totalDays, startMs: startMs, endMs, dayNumber, daysLeft, progress, phaseIndex,
    phases: CAMPAIGN_PHASES.map((p, i) => ({
      ...p,
      state: i < phaseIndex ? 'done' as const : i === phaseIndex ? 'current' as const : 'pending' as const,
    })),
  };
}

/**
 * DutyRail — THE campaign visualization: START → CURRENT DAY → END.
 * 90 ticks grouped into decades, the current day as a bright cursor, and the
 * five campaign phases as labelled bands. Three densities:
 *   compact → band (shell) · default → console · hero → landing
 */
export function DutyRail({ campaign, status, density = 'default', showFacts = true }: {
  campaign?: CampaignClockInput | null;
  status?: string | null;
  density?: 'compact' | 'default' | 'hero';
  showFacts?: boolean;
}) {
  const clock = useCampaignClock(campaign, status);
  const total = clock.totalDays;
  const decades: number[][] = [];
  for (let i = 0; i < total; i += 10) {
    decades.push(Array.from({ length: Math.min(10, total - i) }, (_, k) => i + k));
  }
  const cursorPct = clock.dayNumber === null ? 0 : ((clock.dayNumber - 0.5) / total) * 100;
  const phase = CAMPAIGN_PHASES[clock.phaseIndex];
  const view = campaignStatusView(status ?? campaign?.status);

  if (density === 'compact') {
    return (
      <div className="pse-duty pse-duty-sm" role="img"
        aria-label={`Campaign ${view.label.trim()} — day ${clock.dayNumber ?? 0} of ${total}`}>
        <div className="pse-duty-blocks">
          {decades.map((dec, i) => (
            <span key={i} className="pse-duty-dec">
              {dec.map(idx => (
                <span key={idx} className="pse-duty-tick" data-state={
                  clock.dayNumber !== null && idx + 1 < clock.dayNumber ? 'elapsed'
                    : clock.dayNumber !== null && idx + 1 === clock.dayNumber ? 'position' : 'pending'
                } />
              ))}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pse-duty" role="img"
      aria-label={`Campaign ${view.label.trim()} — day ${clock.dayNumber ?? 0} of ${total}, phase ${phase.label}`}>
      {clock.dayNumber !== null && (
        <span className="pse-duty-now" style={{ left: `${cursorPct}%` }}>Day {clock.dayNumber}</span>
      )}
      <div className="pse-duty-blocks">
        {decades.map((dec, i) => (
          <span key={i} className="pse-duty-dec">
            {dec.map(idx => (
              <span key={idx} className="pse-duty-tick" data-state={
                clock.dayNumber !== null && idx + 1 < clock.dayNumber ? 'elapsed'
                  : clock.dayNumber !== null && idx + 1 === clock.dayNumber ? 'position' : 'pending'
              } />
            ))}
          </span>
        ))}
      </div>
      <div className="pse-duty-phases">
        {clock.phases.map(p => (
          <span key={p.key} className="pse-duty-phase" data-state={p.state}>{p.label}</span>
        ))}
      </div>
      {showFacts && (
        <div className="pse-duty-facts">
          <span>
            {clock.dayNumber === null
              ? 'Campaign window not open'
              : <>Day <b>{clock.dayNumber}</b> of {total}</>}
          </span>
          {clock.daysLeft !== null && <span><b>{clock.daysLeft}</b> days remaining</span>}
          <span>Phase <b>{phase.label}</b></span>
          <span>Accrual stops at day {total}</span>
        </div>
      )}
    </div>
  );
}

/* ── THE canonical capacity register ────────────────────────────────────────
 * Tool capacity + referral capacity → total £/hour. Every screen that shows
 * capacity consumes THIS component; nothing else draws a capacity meter.
 * A lane you own is filled jade; a lane you do not own is a hatched GHOST that
 * still shows what it would add — real economics, never fabricated holdings.
 * ───────────────────────────────────────────────────────────────────────── */

export function CapacityRail({
  toolCapacity, referralCapacity, counts, referralCount = 0,
  label = 'Mining capacity', meta, legend = true, showMarks = true,
}: {
  toolCapacity: number;
  referralCapacity: number;
  counts?: Partial<Record<PSEToolTierId, number>>;
  referralCount?: number;
  label?: string;
  meta?: string;
  legend?: boolean;
  showMarks?: boolean;
}) {
  const ceiling = PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR;
  const tools = (toolCapacity || 0);
  const refs = (referralCapacity || 0);
  const total = tools + refs;
  const tiers = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

  const lanes = tiers.map(t => {
    const owned = counts?.[t.id] ?? 0;
    const contribution = owned * t.hourlyRateGBP;
    const potential = t.hourlyRateGBP * t.maxPerUser;
    return {
      id: t.id,
      label: `${t.name.replace(' Miner', '').toUpperCase()} ${owned}/${t.maxPerUser}`,
      value: owned > 0 ? contribution : potential,
      ghost: owned === 0,
    };
  });
  const refPotential = PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR * PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
  lanes.push({
    id: 'referral' as PSEToolTierId,
    label: `REFERRALS ${referralCount}/${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS}`,
    value: referralCount > 0 ? refs : refPotential,
    ghost: referralCount === 0,
  });

  return (
    <section className="pse-rail">
      <div className="pse-rail-head">
        <p className="pse-np">{label}</p>
        <span className="pse-meta">{meta ?? 'Tools + referrals = hourly capacity'}</span>
      </div>

      {legend && (
        <ul className="pse-rail-key">
          <li><span className="pse-k-jade" aria-hidden="true" />Held</li>
          <li><span className="pse-k-ghost" aria-hidden="true" />Available (not held)</li>
        </ul>
      )}

      <div className="pse-reg">
        <ul className="pse-reg-lanes">
          {lanes.map(l => (
            <li key={String(l.id)} className="pse-reg-lane" data-ghost={l.ghost ? 'true' : 'false'}>
              <span className="pse-reg-key">{l.label}</span>
              <span className="pse-reg-track">
                <span className="pse-reg-fill" style={{ width: `${Math.min(100, (l.value / ceiling) * 100)}%` }} />
              </span>
              <span className="pse-reg-val pse-n">£{l.value.toFixed(2)}</span>
            </li>
          ))}
        </ul>

        <div className="pse-reg-foot">
          <div className="pse-reg-sum">
            <span>TOOLS <b className="pse-n pse-bone">£{tools.toFixed(2)}</b></span>
            <span>+ REFERRALS <b className="pse-n pse-bone">£{refs.toFixed(2)}</b></span>
          </div>
          <p className="pse-reg-total pse-n">
            £{total.toFixed(2)}<span> / hour</span>
          </p>
        </div>

        {showMarks && (
          <div className="pse-scale">
            <span className="pse-scale-mark" data-hit={tools >= PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR ? 'true' : 'false'}>
              £{PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR.toFixed(2)} tool cap
            </span>
            <span className="pse-scale-mark" data-hit={refs >= PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR ? 'true' : 'false'}>
              +£{PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR.toFixed(2)} referral cap
            </span>
            <span className="pse-scale-mark" data-hit={total >= ceiling ? 'true' : 'false'}>
              £{ceiling.toFixed(2)} ceiling
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── LEDGER — the only bordered container ─────────────────────────────────── */

export function Ledger({ title, meta, action, legend, children, foot, legendCols = 2 }: {
  title?: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode;
  legend?: string[]; children: React.ReactNode; foot?: React.ReactNode;
  /** Column shape of the legend. Use 'lead' when rows carry a leading object
   *  (a tool module) so the column heads sit over the columns they name. */
  legendCols?: 2 | 3 | 'lead';
}) {
  return (
    <section className="pse-ledger">
      {(title || action) && (
        <header className="pse-ledger-head">
          <div className="min-w-0">
            {title && <h2 className="pse-h3">{title}</h2>}
            {meta && <p className="pse-meta mt-1">{meta}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      {legend && legend.length > 0 && (
        <div className="pse-ledger-legend" data-cols={legendCols}>
          {legend.map((h, i) => (
            <span key={h} className="pse-np" style={{ textAlign: i === legend.length - 1 ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
      )}
      <div className="pse-ledger-body">{children}</div>
      {foot && <div className="pse-ledger-foot">{foot}</div>}
    </section>
  );
}

/**
 * LedgerRow — one financial record.
 * title + meta on the left, the figure right-aligned on a tabular column. A
 * `sign` renders the fixed credit/debit column used by the activity ledger.
 */
export function LedgerRow({ title, sub, value, valueTone, sign, leading, children }: {
  title: React.ReactNode; sub?: React.ReactNode; value?: React.ReactNode;
  valueTone?: string; sign?: 'credit' | 'debit' | ''; leading?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="pse-row" data-cols={sign ? 3 : 2} data-stack={children ? 'true' : 'false'}>
      {sign !== undefined && (
        <span className="pse-row-sign" data-sign={sign || undefined} aria-hidden="true">
          {sign === 'credit' ? '+' : sign === 'debit' ? '−' : '·'}
        </span>
      )}
      {leading && <span className="shrink-0" aria-hidden="true">{leading}</span>}
      <div className="pse-row-k">
        <p className="pse-label-b">{title}</p>
        {sub && <p className="pse-meta mt-1">{sub}</p>}
        {children}
      </div>
      {value !== undefined && (
        <span className="pse-row-v pse-n" style={valueTone ? { color: valueTone } : undefined}>{value}</span>
      )}
    </div>
  );
}

/** Day header inside a ledger (the activity statement groups by day). */
export function DayGroup({ label, meta }: { label: string; meta?: string }) {
  return (
    <div className="pse-day">
      <span className="pse-np pse-np-2">{label}</span>
      {meta && <span className="pse-meta">{meta}</span>}
    </div>
  );
}

/**
 * Attn — the exception strip. Ruled, not carded, and only rendered when the
 * backend actually reports something that needs the operator's attention.
 */
export function Attn({ tone = 'attn', title, body, action }: {
  tone?: 'attn' | 'fail' | 'info'; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="pse-attn" data-tone={tone}>
      <div className="pse-attn-body">
        <p className="pse-label-b">{title}</p>
        {body && <p className="pse-meta mt-1">{body}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Clause — a numbered note. Rules and numerals carry the structure. */
export function Clause({ no, title, body }: { no: string; title: string; body?: React.ReactNode }) {
  return (
    <div className="pse-clause">
      <span className="pse-clause-no">{no}</span>
      <div className="min-w-0">
        <p className="pse-label-b">{title}</p>
        {body && <p className="pse-meta mt-1 pse-measure">{body}</p>}
      </div>
    </div>
  );
}

