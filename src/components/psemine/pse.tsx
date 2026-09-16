/**
 * PSEmine design system — shared primitives (React + helpers).
 *
 * Rules encoded here:
 * - The server clock is authoritative: countdowns anchor to serverTimeMs.
 * - Color only ever encodes state (never decoration).
 * - Every map below mirrors the actual backend state machines.
 */
import React, { useState } from 'react';
import {
  Clock, Pause, Ban, Loader, Cog, Wrench, CheckCircle2, Circle,
  XCircle, Hourglass, Wallet, RefreshCcw, HelpCircle, Archive, PlayCircle,
  ServerCog, ShieldAlert, Inbox, AlertTriangle, Copy as CopyIcon, Check,
} from 'lucide-react';

/* ── Server-anchored clock ────────────────────────────────────────────
 * Phase 2 contract: server time is the only authority for cycles and
 * countdowns. We anchor to the backend's serverTimeMs from /api/mine/state
 * and interpolate locally between checkpoints. */
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
  label: string; chip: string; tone: string;
  headline: string; detail: string; live: boolean;
}> = {
  scheduled: { label: 'Scheduled', chip: 'pse-chip pse-chip-purple', tone: '#8B7CF6', headline: 'Campaign hasn\u2019t started yet', detail: 'Mining begins when the campaign goes live.', live: false },
  active:    { label: 'Active',    chip: 'pse-chip pse-chip-success', tone: '#2ECE84', headline: 'Mining available', detail: 'Tools are operating and accruing on schedule.', live: true },
  paused:    { label: ' Paused',   chip: 'pse-chip pse-chip-warning', tone: '#F5A524', headline: 'Mining temporarily paused', detail: 'Accrual is paused network-wide. It resumes automatically when the campaign resumes.', live: false },
  settling:  { label: 'Settling',  chip: 'pse-chip pse-chip-cyan',    tone: '#22D3EE', headline: 'Mining ended — final earnings being calculated', detail: 'Accrual has stopped. Final balances are being calculated for settlement.', live: false },
  payout:    { label: 'Payout',    chip: 'pse-chip pse-chip-blue',    tone: '#2E90FA', headline: 'Payout processing', detail: 'Settled balances are being disbursed to configured payout wallets.', live: false },
  closed:    { label: 'Closed',    chip: 'pse-chip pse-chip-neutral', tone: '#98A2B3', headline: 'Campaign finished', detail: 'The campaign has finished. Balances were settled.', live: false },
  archived:  { label: 'Archived',  chip: 'pse-chip pse-chip-neutral', tone: '#98A2B3', headline: 'Public mining interface closed', detail: 'This campaign is archived. Records remain available.', live: false },
};

export function campaignStatusView(status?: string | null) {
  return CAMPAIGN_STATUS_MAP[status || ''] || CAMPAIGN_STATUS_MAP.scheduled;
}

/** Campaign-banner states rendered above every authenticated page. */
export const CAMPAIGN_BANNER_STATES = new Set(['scheduled', 'paused', 'settling', 'payout', 'closed', 'archived']);

/* ── Tool operating cycle (backend derive_cycle state machine) ──────── */
export const CYCLE_STATE_MAP: Record<string, {
  label: string; chip: string; icon: ChipIcon;
  description: string; live: boolean;
}> = {
  active:                { label: 'Active',                chip: 'pse-chip pse-chip-success', icon: PlayCircle, description: 'Operating normally — accruing hourly.', live: true },
  cycle_complete:        { label: 'Cycle Complete',        chip: 'pse-chip pse-chip-warning', icon: Clock,      description: '24-hour operating cycle finished. Maintenance is available.', live: false },
  maintenance_required:  { label: 'Maintenance Required',  chip: 'pse-chip pse-chip-danger',  icon: Wrench,     description: 'Cycle finished and the grace window passed. Maintain the tool to resume mining.', live: false },
  paused:                { label: 'Paused',                chip: 'pse-chip pse-chip-warning', icon: Pause,      description: 'Campaign paused — tool is not accruing.', live: false },
  settling:              { label: 'Settling',              chip: 'pse-chip pse-chip-cyan',    icon: ServerCog,  description: 'Campaign settlement in progress.', live: false },
  ended:                 { label: 'Ended',                 chip: 'pse-chip pse-chip-neutral', icon: Ban,        description: 'Campaign ended — accrual stopped.', live: false },
  archived:              { label: 'Archived',              chip: 'pse-chip pse-chip-neutral', icon: Archive,    description: 'Campaign archived.', live: false },
  revoked:               { label: 'Revoked',               chip: 'pse-chip pse-chip-danger',  icon: XCircle,    description: 'Ownership revoked.', live: false },
  expired:               { label: 'Expired',               chip: 'pse-chip pse-chip-neutral', icon: Hourglass,  description: 'Ownership expired.', live: false },
  inactive:              { label: 'Inactive',              chip: 'pse-chip pse-chip-neutral', icon: Circle,     description: 'Not yet operating.', live: false },
};

export function cycleStateView(state?: string | null) {
  return CYCLE_STATE_MAP[state || ''] || CYCLE_STATE_MAP.inactive;
}

/* ── Purchase status ────────────────────────────────────────────────── */
export const PURCHASE_STATUS_MAP: Record<string, {
  label: string; chip: string; terminal: boolean; tone: string;
}> = {
  created:               { label: 'Created',               chip: 'pse-chip pse-chip-neutral', terminal: false, tone: '#98A2B3' },
  awaiting_payment:      { label: 'Awaiting Payment',      chip: 'pse-chip pse-chip-warning', terminal: false, tone: '#F5A524' },
  transaction_submitted: { label: 'Transaction Submitted', chip: 'pse-chip pse-chip-blue',    terminal: false, tone: '#2E90FA' },
  confirming:            { label: 'Confirming on BSC',     chip: 'pse-chip pse-chip-cyan',    terminal: false, tone: '#22D3EE' },
  confirmed:             { label: 'Confirmed',             chip: 'pse-chip pse-chip-success', terminal: false, tone: '#2ECE84' },
  activated:             { label: 'Tool Activated',        chip: 'pse-chip pse-chip-success', terminal: true,  tone: '#2ECE84' },
  expired:               { label: 'Quote Expired',         chip: 'pse-chip pse-chip-neutral', terminal: true,  tone: '#98A2B3' },
  underpaid:             { label: 'Underpaid',             chip: 'pse-chip pse-chip-danger',  terminal: true,  tone: '#F04438' },
  failed:                { label: 'Failed',                chip: 'pse-chip pse-chip-danger',  terminal: true,  tone: '#F04438' },
  manual_review:         { label: 'Manual Review',         chip: 'pse-chip pse-chip-purple',  terminal: true,  tone: '#8B7CF6' },
  reversed:              { label: 'Reversed',              chip: 'pse-chip pse-chip-neutral', terminal: true,  tone: '#98A2B3' },
};

export function purchaseStatusView(status?: string | null) {
  return PURCHASE_STATUS_MAP[status || ''] || PURCHASE_STATUS_MAP.created;
}

/* ── Referral stage ─────────────────────────────────────────────────── */
export const REFERRAL_STAGE_MAP: Record<string, { label: string; chip: string; step: number; help: string }> = {
  registered:       { label: 'Registered',       chip: 'pse-chip pse-chip-neutral', step: 1, help: 'Signed up with your referral code. No capacity yet.' },
  wallet_connected: { label: 'Wallet Connected', chip: 'pse-chip pse-chip-blue',    step: 2, help: 'Connected a BNB Smart Chain wallet. Not yet earning for you.' },
  tool_purchased:   { label: 'Tool Purchased',   chip: 'pse-chip pse-chip-purple',  step: 3, help: 'Purchased a mining tool. Qualifies when their first tool activates.' },
  mining_active:    { label: 'Mining Active',    chip: 'pse-chip pse-chip-cyan',    step: 4, help: 'Mining is live. Qualification settles on the backend shortly.' },
  qualified:        { label: 'Qualified',        chip: 'pse-chip pse-chip-success', step: 5, help: 'Qualified — added +£0.30/hour to your referral capacity.' },
  rejected:         { label: 'Rejected',         chip: 'pse-chip pse-chip-danger',  step: 0, help: 'This referral did not qualify.' },
};

export function referralStageView(stage?: string | null) {
  return REFERRAL_STAGE_MAP[stage || ''] || REFERRAL_STAGE_MAP.registered;
}

/* ── Payout status ──────────────────────────────────────────────────── */
export const PAYOUT_STATUS_MAP: Record<string, { label: string; chip: string }> = {
  pending:      { label: 'Pending',      chip: 'pse-chip pse-chip-warning' },
  under_review: { label: 'Under Review', chip: 'pse-chip pse-chip-cyan' },
  approved:     { label: 'Approved',     chip: 'pse-chip pse-chip-blue' },
  processing:   { label: 'Processing',   chip: 'pse-chip pse-chip-cyan' },
  paid:         { label: 'Paid',         chip: 'pse-chip pse-chip-success' },
  failed:       { label: 'Failed',       chip: 'pse-chip pse-chip-danger' },
  reversed:     { label: 'Reversed',     chip: 'pse-chip pse-chip-neutral' },
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
export function shortHash(h?: string | null, size = 6): string {
  if (!h) return '—';
  return h.length <= size * 2 + 3 ? h : `${h.slice(0, size)}…${h.slice(-4)}`;
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

type ChipIcon = React.ComponentType<{ size?: number | string; className?: string; style?: React.CSSProperties }>;

export function Chip({ label, chip, dot, pulse, icon: Icon }: { label: string; chip: string; dot?: boolean; pulse?: boolean; icon?: ChipIcon }) {
  return (
    <span className={chip}>
      {Icon ? <Icon size={11} /> : dot !== false && <span className={`pse-dot ${pulse ? 'pse-dot-pulse' : ''}`} />}
      {label}
    </span>
  );
}

export function PSELogo({ size = 32, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="PSEmine emblem" className="shrink-0">
        <defs>
          <linearGradient id="pse-lg-a" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2E90FA" /><stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="pse-lg-b" x1="12" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5AB2FC" /><stop offset="100%" stopColor="#1570EF" />
          </linearGradient>
          <linearGradient id="pse-lg-c" x1="18" y1="16" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B7CF6" /><stop offset="100%" stopColor="#2E90FA" />
          </linearGradient>
        </defs>
        <path d="M8 8L20 4V34L8 42V8Z" fill="url(#pse-lg-a)" />
        <path d="M22 4L38 12L42 16L22 24V4Z" fill="url(#pse-lg-b)" />
        <path d="M22 24L42 16L36 30L22 34V24Z" fill="url(#pse-lg-c)" />
        <path d="M22 10L32 15L22 20V10Z" fill="#0A0E14" />
        <path d="M22 37L32 32L36 35L22 44V37Z" fill="url(#pse-lg-a)" opacity="0.85" />
      </svg>
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--pse-text)' }}>
            PSE<span style={{ color: 'var(--pse-blue)' }}>mine</span>
          </span>
          <span className="text-[8px] font-bold uppercase" style={{ letterSpacing: '0.24em', color: 'var(--pse-text-3)' }}>
            90-Day Campaign
          </span>
        </span>
      )}
    </span>
  );
}

export function PageHeader({ eyebrow, title, sub, right }: {
  eyebrow: string; title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        <p className="pse-eyebrow">{eyebrow}</p>
        <h1 className="pse-h2">{title}</h1>
        {sub && <p className="pse-caption max-w-xl">{sub}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function PSEEmpty({ icon: Icon = Inbox, title, body, action }: {
  icon?: ChipIcon;
  title: string; body?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-inset)' }}>
        <Icon size={19} style={{ color: 'var(--pse-text-3)' }} />
      </div>
      <p className="pse-h3">{title}</p>
      {body && <p className="pse-micro max-w-sm">{body}</p>}
      {action}
    </div>
  );
}

export function PSEError({ message, onRetry, retrying }: { message: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border"
        style={{ borderColor: 'rgba(240,68,56,0.3)', background: 'rgba(240,68,56,0.08)' }}>
        <AlertTriangle size={19} style={{ color: 'var(--pse-danger)' }} />
      </div>
      <p className="pse-h3">Something went wrong</p>
      <p className="pse-micro max-w-sm">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying} className="pse-btn pse-btn-secondary pse-btn-sm mt-1">
          <RefreshCcw size={13} className={retrying ? 'animate-spin' : ''} /> Try again
        </button>
      )}
    </div>
  );
}

export function PSELoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-14" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--pse-line-strong)', borderTopColor: 'var(--pse-blue)' }} />
      <span className="pse-caption">{label}…</span>
    </div>
  );
}

/** Stat block: label + big tabular figure + optional footnote. */
export function Stat({ label, value, sub, accent }: {
  label: string; value: string; sub?: React.ReactNode; accent?: string;
}) {
  return (
    <div className="pse-card pse-card-hover p-5">
      <p className="pse-eyebrow mb-2">{label}</p>
      <p className="pse-num text-[26px] font-semibold leading-tight md:text-[30px]"
        style={{ color: accent || 'var(--pse-text)' }}>{value}</p>
      {sub && <p className="pse-micro mt-1.5">{sub}</p>}
    </div>
  );
}

/** Copyable mono field with a transient copied state. */
export function CopyField({ value, display, label }: { value: string; display?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { if (await copyText(value)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }}
      className="group inline-flex max-w-full items-center gap-2 rounded-lg border py-2.5 pl-2.5 pr-3 transition-colors"
      style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-inset)', minHeight: 44 }}
      aria-label={label ? `Copy ${label}` : 'Copy to clipboard'}
    >
      <span className="pse-mono truncate">{display || value}</span>
      {copied
        ? <Check size={12} style={{ color: 'var(--pse-success)' }} className="shrink-0" />
        : <CopyIcon size={12} className="shrink-0" style={{ color: 'var(--pse-text-3)' }} />}
    </button>
  );
}

/** Tool spec grid used by marketplace cards and the dashboard. */
export function ToolGrid({ tools, ownedCounts }: {
  tools: Array<{ id: string; name: string; tagline?: string; hourlyRateGBP: number; purchasePriceGBP: number; maxPerUser: number }>;
  ownedCounts?: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tools.map((t) => {
        const owned = ownedCounts?.[t.id] || 0;
        return (
          <div key={t.id} className="pse-card p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="pse-h3">{t.name}</p>
              {owned > 0 ? (
                <Chip label={`${owned}/${t.maxPerUser} owned`} chip="pse-chip pse-chip-success" dot={false} />
              ) : (
                <Chip label="Not owned" chip="pse-chip pse-chip-neutral" dot={false} />
              )}
            </div>
            {t.tagline && <p className="pse-micro mt-1.5">{t.tagline}</p>}
            <div className="mt-4 flex items-baseline gap-1">
              <span className="pse-num text-[24px] font-semibold" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP)}</span>
            </div>
            <div className="pse-micro mt-2 flex items-center justify-between" style={{ color: 'var(--pse-text-2)' }}>
              <span>Price</span><span className="pse-num font-semibold">{gbp(t.purchasePriceGBP)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Campaign banner: responsive to every backend state ─────────────── */
export function CampaignBanner({ status }: { status?: string | null }) {
  if (!status || !CAMPAIGN_BANNER_STATES.has(status)) return null;
  const view = campaignStatusView(status);
  return (
    <div className="flex items-start gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
      <span className="pse-dot mt-1.5 shrink-0" style={{ background: view.tone }} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: 'var(--pse-text)' }}>{view.headline}</p>
        <p className="pse-micro">{view.detail}</p>
      </div>
    </div>
  );
}

export { HelpCircle };
