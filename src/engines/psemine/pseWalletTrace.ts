/**
 * Bounded, redacted wallet-flow diagnostics.
 *
 * The only way to diagnose a real Android handoff is to know the exact stage a
 * tab reached before it was suspended or reloaded. This trace survives a reload
 * (sessionStorage), carries one correlation id across documents, and is safe to
 * copy/paste: addresses are shortened, WalletConnect URIs/session topics and
 * long hex payloads are removed, and every detail is capped.
 *
 * It is deliberately NOT a transaction log: no hashes, no signatures, no
 * accounts, no quote values, no auth tokens.
 */

export interface PseWalletTraceEvent {
  at: number;
  stage: string;
  detail?: string;
}

export interface PseWalletTraceState {
  id: string;
  startedAt: number;
  documents: number;
  events: PseWalletTraceEvent[];
}

const TRACE_KEY = 'psemine_wallet_trace_v2';
const MAX_EVENTS = 140;

let memory: PseWalletTraceState | null = null;

const newId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  return `pse-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const storage = (): Storage | null => {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage : null;
  } catch {
    return null;
  }
};

const readState = (): PseWalletTraceState | null => {
  const store = storage();
  if (store) {
    try {
      const raw = store.getItem(TRACE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PseWalletTraceState;
        if (parsed && typeof parsed.id === 'string' && Array.isArray(parsed.events)) return parsed;
      }
    } catch { /* malformed trace — start clean */ }
  }
  return memory;
};

const writeState = (state: PseWalletTraceState): void => {
  memory = state;
  const store = storage();
  if (!store) return;
  try { store.setItem(TRACE_KEY, JSON.stringify(state)); } catch { /* quota/unavailable */ }
};

/** Removes secrets and bounds a human-readable diagnostic detail. */
export const redactWalletTraceDetail = (detail: unknown): string | undefined => {
  if (detail === undefined || detail === null) return undefined;
  const text = String(detail)
    .replace(/wc:[^\s"']+/gi, 'wc:[redacted]')
    .replace(/0x[a-f0-9]{64}/gi, '0x[tx]')
    .replace(/0x[a-f0-9]{40}/gi, match => `${match.slice(0, 6)}…${match.slice(-4)}`)
    .replace(/\b[a-f0-9]{64}\b/gi, '[topic]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return undefined;
  return text.length > 160 ? `${text.slice(0, 157)}…` : text;
};

const append = (state: PseWalletTraceState, stage: string, detail?: unknown): PseWalletTraceState => {
  const next: PseWalletTraceState = {
    ...state,
    events: [
      ...state.events,
      { at: Date.now(), stage, ...(redactWalletTraceDetail(detail) ? { detail: redactWalletTraceDetail(detail) } : {}) },
    ].slice(-MAX_EVENTS),
  };
  writeState(next);
  try {
    console.info(`[pseWallet] ${stage}${next.events[next.events.length - 1]?.detail ? `: ${next.events[next.events.length - 1].detail}` : ''}`);
  } catch { /* console unavailable */ }
  return next;
};

/** Starts a trace for one user-initiated attempt and returns its correlation id. */
export const beginWalletTrace = (kind: string, id = newId()): string => {
  const state: PseWalletTraceState = { id, startedAt: Date.now(), documents: 1, events: [] };
  writeState(state);
  append(state, 'trace_started', kind);
  return id;
};

/** Keeps the existing correlation id/events (a reloaded or retried attempt). */
export const ensureWalletTrace = (kind: string, id = newId()): string => {
  const existing = readState();
  if (existing) {
    append(existing, 'trace_resumed', kind);
    return existing.id;
  }
  return beginWalletTrace(kind, id);
};

/** Appends a stage to the current trace (no-op when no attempt has started). */
export const recordWalletStage = (stage: string, detail?: unknown): void => {
  const state = readState();
  if (!state) return;
  append(state, stage, detail);
};

/**
 * Called once from the wallet boot effect. Marks that a NEW document is
 * observing the same attempt; this is how a reload during the handoff becomes
 * visible in the copied diagnostics.
 */
export const recordWalletDocumentBoot = (): void => {
  const state = readState();
  if (!state) return;
  let navigation = 'unknown';
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    navigation = nav?.type || 'unknown';
  } catch { /* performance unavailable */ }
  append({ ...state, documents: state.documents + 1 }, 'document_boot', navigation);
};

export const getWalletTrace = (): PseWalletTraceState | null => readState();

export const getWalletCorrelationId = (): string | null => readState()?.id ?? null;

export const clearWalletTrace = (): void => {
  memory = null;
  const store = storage();
  if (store) {
    try { store.removeItem(TRACE_KEY); } catch { /* storage unavailable */ }
  }
};

/** Compact JSON suitable for clipboard/support. No secrets; bounded. */
export const formatWalletDiagnostics = (): string => {
  const state = readState();
  if (!state) return JSON.stringify({ id: null, events: [] });
  return JSON.stringify({
    id: state.id,
    startedAt: new Date(state.startedAt).toISOString(),
    documents: state.documents,
    events: state.events.map(event => ({
      at: event.at,
      stage: event.stage,
      ...(event.detail ? { detail: event.detail } : {}),
    })),
  });
};
