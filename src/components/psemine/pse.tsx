/* PSEmine status/data helpers and plain semantic React primitives. */
import React, { useEffect, useState } from 'react';
import type { PseErrorInfo } from '../../engines/psemine/pseErrors';
import { PSELogo as BrandMark } from './PSEBrand';
import { PSEMINE_CONSTANTS } from '../../types/psemine';

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
export const CYCLE_STATE_MAP: Record<string, {
  label: string; tone: StampTone;
  description: string; live: boolean;
}> = {
  active:                { label: 'Active',                tone: 'live', description: 'Operating normally — accruing hourly.', live: true },
  restarting:            { label: 'Restarting',            tone: 'info', description: 'Restart in progress — the next mining session begins automatically at the backend-scheduled time.', live: false },
  cycle_complete:        { label: 'Cycle Complete',        tone: 'attn', description: '24-hour operating cycle finished. Maintenance is available.', live: false },
  maintenance_required:  { label: 'Maintenance Required',  tone: 'fail', description: 'Cycle finished and the grace window passed. Maintain the tool to resume mining.', live: false },
  paused:                { label: 'Paused',                tone: 'attn', description: 'Campaign paused — tool is not accruing.', live: false },
  settling:              { label: 'Settling',              tone: 'info', description: 'Campaign settlement in progress.', live: false },
  ended:                 { label: 'Ended',                 tone: 'idle', description: 'Campaign ended — accrual stopped.', live: false },
  archived:              { label: 'Archived',              tone: 'idle', description: 'Campaign archived.', live: false },
  revoked:               { label: 'Revoked',               tone: 'fail', description: 'Ownership revoked.', live: false },
  expired:               { label: 'Expired',               tone: 'idle', description: 'Ownership expired.', live: false },
  inactive:              { label: 'Inactive',              tone: 'idle', description: 'Not yet operating.', live: false },
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

/* ── React primitives ─────────────────────────────────────────────────── */

export function PSELogo({ size = 32, withWordmark = false }: { size?: number; withWordmark?: boolean }) {
  return <BrandMark size={size} withWordmark={withWordmark} />;
}

export function PSEError({ error, onRetry, retrying, action, compact: _compact }: {
  error: PseErrorInfo;
  onRetry?: () => void;
  retrying?: boolean;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section role="alert">
      <h2>{error.title}</h2>
      <p>{error.message}</p>
      {error.retryable && onRetry && (
        <button type="button" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
      {action}
      {(error.operation || error.status || error.code) && (
        <p>
          {error.operation}
          {error.status ? ` · ${error.status}` : ''}
          {error.code ? ` · ${error.code}` : ''}
        </p>
      )}
    </section>
  );
}

export function PSELoading({ label = 'Loading', skeleton: _skeleton = false }: { label?: string; skeleton?: boolean }) {
  return <p role="status" aria-live="polite">{label}</p>;
}

export function CopyField({ value, display, label, fullWidth: _fullWidth }: {
  value: string; display?: string; label?: string; fullWidth?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => { if (await copyText(value)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }}
      aria-label={label ? `Copy ${label}` : 'Copy to clipboard'}
    >
      <span>{display || value}</span>
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: {
  label: string; hint?: string; children: React.ReactNode; htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor}>
      <span>{label}{hint && <> — {hint}</>}</span>
      {children}
    </label>
  );
}

export function usePseDocumentTitle(title?: string) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · PSEmine`;
    return () => { document.title = previous; };
  }, [title]);
}

export type StampTone = 'live' | 'attn' | 'fail' | 'info' | 'idle';

export function Stamp({ children }: {
  tone?: StampTone; glyph?: string; children: React.ReactNode; pulse?: boolean;
}) {
  return <span role="status">{children}</span>;
}

export function campaignTone(status?: string | null): StampTone {
  return campaignStatusView(status).tone;
}

export function cycleTone(state?: string | null): StampTone {
  return cycleStateView(state).tone;
}

export function StatementHeader({ routeKey, title, objective, status, actions, asOf }: {
  routeKey: string; title: string; objective?: string; status?: React.ReactNode;
  actions?: React.ReactNode; asOf?: string;
}) {
  return (
    <header>
      <p>{routeKey}</p>
      <h1>{title}</h1>
      {status}
      {objective && <p>{objective}</p>}
      {asOf && <p>As of {asOf}</p>}
      {actions}
    </header>
  );
}

export function Verdict({ label, value, unit, status, note, side }: {
  label: string; value: string; unit?: string; status?: React.ReactNode;
  note?: React.ReactNode; side?: React.ReactNode;
}) {
  return (
    <section>
      <h2>{label}</h2>
      {status}
      <p>{value}{unit && <> {unit}</>}</p>
      {note && <p>{note}</p>}
      {side}
    </section>
  );
}

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
  dayNumber: number | null;
  daysLeft: number | null;
  progress: number;
  phaseIndex: number;
  phases: Array<{ key: CampaignPhaseKey; label: string; state: 'done' | 'current' | 'pending' }>;
}

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
    totalDays, startMs, endMs, dayNumber, daysLeft, progress, phaseIndex,
    phases: CAMPAIGN_PHASES.map((phase, index) => ({
      ...phase,
      state: index < phaseIndex ? 'done' as const : index === phaseIndex ? 'current' as const : 'pending' as const,
    })),
  };
}

export function Ledger({ title, meta, action, legend, children, foot, legendCols: _legendCols = 2 }: {
  title?: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode;
  legend?: string[]; children: React.ReactNode; foot?: React.ReactNode;
  legendCols?: 2 | 3 | 'lead';
}) {
  return (
    <section>
      {(title || action) && (
        <header>
          {title && <h2>{title}</h2>}
          {meta && <p>{meta}</p>}
          {action}
        </header>
      )}
      {legend && legend.length > 0 && <p>{legend.join(' · ')}</p>}
      <div>{children}</div>
      {foot && <footer>{foot}</footer>}
    </section>
  );
}

export function LedgerRow({ title, sub, value, sign, leading: _leading, children }: {
  title: React.ReactNode; sub?: React.ReactNode; value?: React.ReactNode;
  valueTone?: string; sign?: 'credit' | 'debit' | ''; leading?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      {sign && <span>{sign === 'credit' ? 'Credit: ' : 'Debit: '}</span>}
      <div>
        <p>{title}</p>
        {sub && <p>{sub}</p>}
        {children}
      </div>
      {value !== undefined && <span>{value}</span>}
    </div>
  );
}

export function Attn({ title, body, action }: {
  tone?: 'attn' | 'fail' | 'info'; title: React.ReactNode; body?: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <aside>
      <p>{title}</p>
      {body && <p>{body}</p>}
      {action}
    </aside>
  );
}
