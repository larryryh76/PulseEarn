/**
 * WalletConnect mobile handoff record.
 *
 * WHY THIS EXISTS (proven by the SDK, not guessed):
 * WalletConnect's SignClient keeps the pending session ONLY in an in-memory
 * `pendingSessions` map. `wc_sessionSettle` is accepted only when a matching
 * entry exists; otherwise the SDK logs "Pending session not found" and drops the
 * settlement. Android Chrome can discard/reload the tab while the wallet app is
 * open. If that happens before the settlement is processed, the fresh document
 * has no pending session, cannot subscribe to the session topic, and can NEVER
 * recover the approval from storage — no matter how long it polls.
 *
 * The record written before the selector opens lets the reloaded document:
 *   1. adopt the session if the settlement was processed before the reload, or
 *   2. ask the user to approve ONE fresh pairing when the settlement was lost.
 * It is short-lived and id-scoped so an old attempt cannot clear a new one.
 */

export interface PseWalletHandoffRecord {
  v: 2;
  id: string;
  startedAt: number;
  /** performance.timeOrigin of the document that started the pairing. */
  documentTimeOrigin: number;
  /** How many automatic re-pair attempts a reloaded document already made. */
  resumeAttempts: number;
  stage: 'started' | 'resuming' | 'interrupted';
}

export type PseHandoffResumeDecision = 'none' | 'wait' | 'resume' | 'manual';

/** A pending pairing is useful for as long as a user might be in the wallet app. */
export const HANDOFF_TTL_MS = 15 * 60 * 1000;
/** AppKit expires its pairing URI after ~4 minutes; only auto-resume inside that. */
export const HANDOFF_RESUME_WINDOW_MS = 4 * 60 * 1000;

const HANDOFF_KEY = 'psemine_wc_handoff_v2';
const LEGACY_HANDOFF_KEY = 'psemine_wc_handoff';

const newHandoffId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch { /* fall through */ }
  return `wc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const performanceOrigin = (): number => {
  try {
    return typeof performance !== 'undefined' && Number.isFinite(performance.timeOrigin)
      ? performance.timeOrigin
      : Date.now();
  } catch {
    return Date.now();
  }
};

const isRecord = (value: unknown): value is PseWalletHandoffRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PseWalletHandoffRecord>;
  return record.v === 2 &&
    typeof record.id === 'string' &&
    Number.isFinite(record.startedAt) &&
    Number.isFinite(record.documentTimeOrigin) &&
    Number.isFinite(record.resumeAttempts) &&
    (record.stage === 'started' || record.stage === 'resuming' || record.stage === 'interrupted');
};

/** Reads a recent handoff; expired or malformed markers are removed. */
export const readWalletConnectHandoff = (now = Date.now()): PseWalletHandoffRecord | null => {
  try {
    const raw = localStorage.getItem(HANDOFF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed)) {
        if (now - parsed.startedAt > HANDOFF_TTL_MS) {
          localStorage.removeItem(HANDOFF_KEY);
          return null;
        }
        return parsed;
      }
      localStorage.removeItem(HANDOFF_KEY);
    }
    // Legacy marker from PR #409 (a bare timestamp): never auto-resume it, but
    // keep the information available so an in-flight handoff can be finished.
    const legacy = Number(localStorage.getItem(LEGACY_HANDOFF_KEY) || 0);
    if (Number.isFinite(legacy) && legacy > 0 && now - legacy <= HANDOFF_TTL_MS) {
      return {
        v: 2,
        id: `legacy-${legacy}`,
        startedAt: legacy,
        // A legacy marker can only be read after a document boot, so treat it
        // as coming from a previous document. Never auto-resume it (attempts=1).
        documentTimeOrigin: 1,
        resumeAttempts: 1,
        stage: 'started',
      };
    }
    if (legacy > 0) localStorage.removeItem(LEGACY_HANDOFF_KEY);
    return null;
  } catch {
    return null;
  }
};

/**
 * Records a user-initiated pairing BEFORE the external wallet can take over the
 * screen. Resuming an existing record keeps its id and increments the attempts.
 */
export const markWalletConnectHandoff = (
  now = Date.now(),
  documentTimeOrigin = performanceOrigin(),
  id = newHandoffId(),
  resume = false,
): PseWalletHandoffRecord => {
  const existing = readWalletConnectHandoff(now);
  const record: PseWalletHandoffRecord = {
    v: 2,
    id,
    startedAt: existing?.id === id ? existing.startedAt : now,
    documentTimeOrigin,
    resumeAttempts: (existing?.id === id ? existing.resumeAttempts : 0) + (resume ? 1 : 0),
    stage: resume ? 'resuming' : 'started',
  };
  try {
    localStorage.setItem(HANDOFF_KEY, JSON.stringify(record));
    localStorage.removeItem(LEGACY_HANDOFF_KEY);
  } catch { /* storage unavailable — explicit connect still works */ }
  return record;
};

export const updateWalletConnectHandoff = (
  patch: Partial<Pick<PseWalletHandoffRecord, 'stage' | 'resumeAttempts'>>,
): PseWalletHandoffRecord | null => {
  const current = readWalletConnectHandoff();
  if (!current) return null;
  const next: PseWalletHandoffRecord = {
    ...current,
    ...(patch.stage ? { stage: patch.stage } : {}),
    ...(Number.isFinite(patch.resumeAttempts) ? { resumeAttempts: Math.max(0, Number(patch.resumeAttempts)) } : {}),
  };
  try { localStorage.setItem(HANDOFF_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
};

/**
 * Clears a handoff. With an id, only that attempt is cleared, so a slow old
 * page cannot destroy a newer attempt's record.
 */
export const clearWalletConnectHandoff = (id?: string): void => {
  try {
    if (id) {
      const current = readWalletConnectHandoff();
      if (current && current.id !== id) return;
    }
    localStorage.removeItem(HANDOFF_KEY);
    localStorage.removeItem(LEGACY_HANDOFF_KEY);
  } catch { /* storage unavailable */ }
};

/** True only for a recent, user-initiated WalletConnect pairing. */
export const hasPendingWalletConnectHandoff = (now = Date.now()): boolean =>
  readWalletConnectHandoff(now) !== null;

/** Did this record start in a document that is no longer this one? */
export const isHandoffFromPreviousDocument = (
  record: PseWalletHandoffRecord,
  documentTimeOrigin = performanceOrigin(),
): boolean => {
  // performance.timeOrigin is per document. A 1 s tolerance avoids treating a
  // same-document write as a reload; a real reload is always later than this.
  return record.documentTimeOrigin > 0 && record.documentTimeOrigin + 1_000 < documentTimeOrigin;
};

/**
 * Decides what a booting document may do with a handoff, WITHOUT ever treating
 * stored state as an approved connection.
 */
export const shouldResumeWalletConnectHandoff = (
  record: PseWalletHandoffRecord | null,
  now = Date.now(),
  documentTimeOrigin = performanceOrigin(),
): PseHandoffResumeDecision => {
  if (!record) return 'none';
  if (now - record.startedAt > HANDOFF_TTL_MS) return 'none';
  if (!isHandoffFromPreviousDocument(record, documentTimeOrigin)) return 'wait';
  if (record.resumeAttempts > 0) return 'manual';
  if (now - record.startedAt > HANDOFF_RESUME_WINDOW_MS) return 'manual';
  return 'resume';
};
