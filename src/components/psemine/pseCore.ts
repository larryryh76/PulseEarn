/**
 * PSEmine core helpers — NON-VISUAL.
 *
 * The PSEmine design system (primitives, palettes, instruments) was purged in
 * `refactor(psemine): purge legacy design implementation`. What remains here is
 * only what the product needs to stay operational and honest while the
 * interface is rebuilt one system at a time:
 *
 *   • the state maps that mirror the backend state machines (label + meaning),
 *   • the formatters that render backend figures,
 *   • the server-anchored clock (the server is the only authority for cycles),
 *   • the document-title hook (PSEmine routes own their browser title).
 *
 * Nothing in this file renders a surface, a colour or a layout. It contains no
 * React elements at all.
 */
import React from 'react';
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

/* ── Campaign status (mirrors the backend campaign lifecycle) ─────────── */
export const CAMPAIGN_STATUS_MAP: Record<string, { label: string; detail: string; live: boolean }> = {
  scheduled: { label: 'Scheduled', detail: 'Mining begins when the campaign goes live.', live: false },
  active: { label: 'Active', detail: 'Tools are operating and accruing on schedule.', live: true },
  paused: { label: 'Paused', detail: 'Accrual is paused network-wide. It resumes when the campaign resumes.', live: false },
  settling: { label: 'Settling', detail: 'Accrual has stopped. Final balances are being calculated for settlement.', live: false },
  payout: { label: 'Payout', detail: 'Settled balances are being disbursed to configured payout wallets.', live: false },
  closed: { label: 'Closed', detail: 'The campaign has finished. Balances were settled.', live: false },
  archived: { label: 'Archived', detail: 'This campaign is archived. Records remain available.', live: false },
};

export function campaignStatusView(status?: string | null) {
  return CAMPAIGN_STATUS_MAP[status || ''] || CAMPAIGN_STATUS_MAP.scheduled;
}

/* ── Tool operating cycle (backend derive_cycle state machine) ────────── */
export const CYCLE_STATE_MAP: Record<string, { label: string; description: string; live: boolean }> = {
  active: { label: 'Active', description: 'Operating normally — accruing hourly.', live: true },
  restarting: { label: 'Restarting', description: 'Restart in progress — the next session begins at the backend-scheduled time.', live: false },
  cycle_complete: { label: 'Cycle complete', description: '24-hour operating cycle finished. Maintenance is available.', live: false },
  maintenance_required: { label: 'Maintenance required', description: 'Cycle finished and the grace window passed. Maintain the tool to resume mining.', live: false },
  paused: { label: 'Paused', description: 'Campaign paused — tool is not accruing.', live: false },
  settling: { label: 'Settling', description: 'Campaign settlement in progress.', live: false },
  ended: { label: 'Ended', description: 'Campaign ended — accrual stopped.', live: false },
  archived: { label: 'Archived', description: 'Campaign archived.', live: false },
  revoked: { label: 'Revoked', description: 'Ownership revoked.', live: false },
  expired: { label: 'Expired', description: 'Ownership expired.', live: false },
  inactive: { label: 'Inactive', description: 'Not yet operating.', live: false },
};

export function cycleStateView(state?: string | null) {
  return CYCLE_STATE_MAP[state || ''] || CYCLE_STATE_MAP.inactive;
}

/** Per-tool operating model (session vs continuous). Labels only. */
export function operatingModelView(model?: string | null): { label: string; detail: string } {
  return model === 'continuous'
    ? { label: 'Continuous mining', detail: 'No manual restart required' }
    : { label: 'Session mining', detail: 'Manual restart required between sessions' };
}

/* ── Purchase status (backend purchase state machine) ─────────────────── */
export const PURCHASE_STATUS_MAP: Record<string, { label: string; terminal: boolean }> = {
  created: { label: 'Created', terminal: false },
  awaiting_payment: { label: 'Awaiting payment', terminal: false },
  transaction_submitted: { label: 'Transaction submitted', terminal: false },
  confirming: { label: 'Confirming on BSC', terminal: false },
  confirmed: { label: 'Confirmed', terminal: false },
  activated: { label: 'Tool activated', terminal: true },
  expired: { label: 'Quote expired', terminal: true },
  underpaid: { label: 'Underpaid', terminal: true },
  failed: { label: 'Failed', terminal: true },
  manual_review: { label: 'Manual review', terminal: true },
  reversed: { label: 'Reversed', terminal: true },
};

export function purchaseStatusView(status?: string | null) {
  return PURCHASE_STATUS_MAP[status || ''] || PURCHASE_STATUS_MAP.created;
}

/* ── Referral qualification stages (backend referral machine) ─────────── */
export const REFERRAL_STAGE_MAP: Record<string, { label: string; step: number; help: string }> = {
  registered: { label: 'Registered', step: 1, help: 'Signed up with your referral code. No capacity yet.' },
  wallet_connected: { label: 'Wallet connected', step: 2, help: 'Connected a BNB Smart Chain wallet. Not yet earning for you.' },
  tool_purchased: { label: 'Tool purchased', step: 3, help: 'Purchased a mining tool. Qualifies when their first tool activates.' },
  mining_active: { label: 'Mining active', step: 4, help: 'Mining is live. Qualification settles on the backend shortly.' },
  qualified: { label: 'Qualified', step: 5, help: 'Qualified — added capacity to your account.' },
  rejected: { label: 'Rejected', step: 0, help: 'This referral did not qualify.' },
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

/* ── Payout status ─────────────────────────────────────────────────────── */
export const PAYOUT_STATUS_MAP: Record<string, { label: string }> = {
  pending: { label: 'Pending' },
  under_review: { label: 'Under review' },
  approved: { label: 'Approved' },
  processing: { label: 'Processing' },
  paid: { label: 'Paid' },
  failed: { label: 'Failed' },
  reversed: { label: 'Reversed' },
};

export function payoutStatusView(status?: string | null) {
  return PAYOUT_STATUS_MAP[status || ''] || PAYOUT_STATUS_MAP.pending;
}

/* ── Formatters ─────────────────────────────────────────────────────────── */
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

export function shortAddr(a?: string | null): string {
  if (!a) return '—';
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/**
 * EXACT BNB display, derived from the server's wei string. This is THE single
 * rendering path for a quoted amount: the quote line, the payment summary and
 * the pay button all render this value, so they can never disagree.
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

/* ── Campaign clock ───────────────────────────────────────────────────────
 * One implementation of the campaign arithmetic for the whole product. The
 * shell, the dashboard and the guide all read from this; no screen derives the
 * campaign day from a browser clock on its own.
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

/** Structural campaign input: the locked product type, the API projection or a
 *  raw Firestore document all satisfy it — only dates, duration and status are
 *  ever read. */
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

/** Campaign position, derived from backend campaign dates only (never invented).
 *  A 60s tick keeps relative figures honest without polling the server. */
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
    phases: CAMPAIGN_PHASES.map((p, i) => ({
      ...p,
      state: i < phaseIndex ? 'done' as const : i === phaseIndex ? 'current' as const : 'pending' as const,
    })),
  };
}

/* ── Document title ───────────────────────────────────────────────────────
 * PSEmine routes must own the browser title. The previous title is restored on
 * unmount so PulseEarn is unaffected. */
export function usePseDocumentTitle(title?: string) {
  React.useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · PSEmine`;
    return () => { document.title = previous; };
  }, [title]);
}
