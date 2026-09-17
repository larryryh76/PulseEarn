/**
 * PSEmine error taxonomy.
 *
 * WHY: the console used to collapse every failure — expired session, missing
 * entitlement, backend 500, offline browser, malformed payload — into one
 * generic "Something went wrong / An internal server error occurred" screen.
 * That is both unhelpful to the user and misleading to operators.
 *
 * Every failure class carries:
 *   • a kind    — so the UI renders the right message and the right action
 *   • operation — which call failed ("GET /api/mine/state")
 *   • code      — the backend's machine-readable error (e.g. INSUFFICIENT_BALANCE)
 *   • requestId — correlation id echoed by the backend, so a user report can be
 *                 matched to exactly one structured server log line
 *
 * Kinds are narrow and mutually exclusive:
 *   auth        — session missing/expired        → sign in again (not retryable here)
 *   permission  — not entitled to this product   → explain entitlement (not retryable)
 *   validation  — the request was rejected       → show the backend's own reason
 *   conflict    — state conflict (409)           → explain the current state
 *   rate_limit  — too many requests (429)        → wait, then retry
 *   unavailable — service down/overloaded (5xx)  → retry shortly
 *   backend     — server-side failure (500)      → retry
 *   network     — request never landed           → retry; connectivity copy
 *   data        — landed but unusable            → retry; account-loading copy
 *   unknown     — anything else                  → retry with generic copy
 */

export type PseErrorKind =
  | 'auth'
  | 'permission'
  | 'validation'
  | 'conflict'
  | 'rate_limit'
  | 'unavailable'
  | 'backend'
  | 'network'
  | 'data'
  | 'unknown';

export interface PseErrorInfo {
  kind: PseErrorKind;
  /** Short, user-facing title. */
  title: string;
  /** Full user-facing explanation. */
  message: string;
  /** Whether retrying the same request could plausibly succeed. */
  retryable: boolean;
  /** HTTP status when a response was received. */
  status?: number;
  /** Backend error code, e.g. PSEMINE_ACCESS_DENIED. */
  code?: string;
  /** Which operation failed, e.g. "GET /api/mine/state". */
  operation?: string;
  /** Request correlation id echoed by the backend when available. */
  correlationId?: string;
}

const COPY: Record<PseErrorKind, { title: string; message: string; retryable: boolean }> = {
  auth: {
    title: 'Your session has expired',
    message: 'Please sign in again to continue to your mining console.',
    retryable: false,
  },
  permission: {
    title: "PSEmine isn't enabled for this account",
    message:
      'This account does not have PSEmine access. PSEmine is a separate product entitlement — you can enable it for this account, or sign in with the account that created it.',
    retryable: false,
  },
  validation: {
    title: 'That request was rejected',
    message: 'The mining backend rejected this request. Review the details and try again.',
    retryable: false,
  },
  conflict: {
    title: 'This action conflicts with your current state',
    message:
      'Something about your account already changed — for example a request is already in progress. Refresh to see the current state, then try again.',
    retryable: true,
  },
  rate_limit: {
    title: 'Too many requests',
    message: 'You are sending requests faster than the mining backend allows. Wait a moment and try again.',
    retryable: true,
  },
  unavailable: {
    title: 'PSEmine services are temporarily unavailable',
    message: 'The mining backend is not responding right now. Nothing was changed — please try again shortly.',
    retryable: true,
  },
  backend: {
    title: 'PSEmine services are temporarily unavailable',
    message: 'The mining backend did not complete this request. Nothing was changed — please try again shortly.',
    retryable: true,
  },
  network: {
    title: 'Unable to connect',
    message: 'We could not reach PSEmine. Check your connection and try again.',
    retryable: true,
  },
  data: {
    title: "We couldn't load your mining account",
    message: 'The response from the mining backend was incomplete. Please retry — if it persists, contact support.',
    retryable: true,
  },
  unknown: {
    title: 'Something went wrong while loading your account',
    message: 'An unexpected error occurred. You can safely retry.',
    retryable: true,
  },
};

/** Structured transport error thrown by the PSEmine API client. */
export class PseApiError extends Error {
  readonly kind: PseErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly operation?: string;
  readonly correlationId?: string;

  constructor(info: PseErrorInfo) {
    super(info.message);
    this.name = 'PseApiError';
    this.kind = info.kind;
    this.status = info.status;
    this.code = info.code;
    this.operation = info.operation;
    this.correlationId = info.correlationId;
  }

  toInfo(): PseErrorInfo {
    return {
      kind: this.kind,
      title: COPY[this.kind].title,
      message: this.message || COPY[this.kind].message,
      retryable: COPY[this.kind].retryable,
      status: this.status,
      code: this.code,
      operation: this.operation,
      correlationId: this.correlationId,
    };
  }
}

function info(kind: PseErrorKind, extra: Partial<PseErrorInfo> = {}): PseErrorInfo {
  return { kind, ...COPY[kind], ...extra };
}

/**
 * Map one HTTP failure to its error class.
 *
 * 401 auth · 403 permission · 400/404/422 validation · 409 conflict ·
 * 429 rate_limit · 502/503/504 unavailable · 500 backend · otherwise unknown.
 *
 * A rejection the backend explains (validation/conflict) keeps the backend's own
 * message, because "this quote expired" is more useful than a generic sentence.
 */
export function pseHttpError(
  operation: string,
  status: number,
  body?: { error?: string; message?: string; requestId?: string } | null,
): PseApiError {
  const code = body?.error;
  const correlationId = body?.requestId;
  const detail = body?.message;
  const base = { status, code, operation, correlationId };

  if (status === 401) return new PseApiError(info('auth', base));
  if (status === 403) {
    // A rejected email-verification gate is an *entitlement-ish* state the user
    // can act on, so keep the backend's explanation verbatim.
    return new PseApiError(info('permission', { ...base, message: detail || COPY.permission.message }));
  }
  if (status === 400 || status === 404 || status === 422) {
    return new PseApiError(info('validation', { ...base, message: detail || COPY.validation.message }));
  }
  if (status === 409) {
    return new PseApiError(info('conflict', { ...base, message: detail || COPY.conflict.message }));
  }
  if (status === 429) {
    return new PseApiError(info('rate_limit', { ...base, message: detail || COPY.rate_limit.message }));
  }
  if (status === 502 || status === 503 || status === 504) {
    return new PseApiError(info('unavailable', { ...base, message: detail || COPY.unavailable.message }));
  }
  if (status === 500) {
    return new PseApiError(info('backend', base));
  }
  return new PseApiError(info('unknown', { ...base, message: detail || COPY.unknown.message }));
}

/** Build an error for a request that never produced a response. */
export function pseNetworkError(operation: string, cause?: unknown): PseApiError {
  if (import.meta.env.DEV) console.warn(`[PSEmine] network failure on ${operation}`, cause);
  return new PseApiError(info('network', { operation }));
}

/** Build an error for a response that landed but could not be used. */
export function pseDataError(operation: string, status?: number): PseApiError {
  return new PseApiError(info('data', { status, operation }));
}

/**
 * Classify a failed response and return the message a user should see.
 *
 * Exists because the engine client (purchase, quote, wallet, referral,
 * maintenance) returns `{ success: false, error }` rather than throwing, and
 * previously built that string as `data.message || data.error || 'generic'`.
 * That collapsed a 401, a 403 entitlement denial, a 409 quote expiry, a 429 and
 * a 503 into the same class of sentence. Backend explanations still win when
 * present — they are more specific — but every failure now resolves through the
 * taxonomy, and the operation + correlation id are logged for diagnosis.
 */
export function pseFailureMessage(
  operation: string,
  status: number,
  body?: { error?: string; message?: string; requestId?: string } | null,
): string {
  const error = pseHttpError(operation, status, body);
  logPseDiagnostic(operation, error.toInfo());
  return error.message;
}

/** The message for a failure that never produced a response (offline, abort). */
export function pseTransportFailureMessage(operation: string, cause?: unknown): string {
  const error = pseNetworkError(operation, cause);
  logPseDiagnostic(operation, error.toInfo());
  return error.message;
}

/** Normalise anything thrown (PseApiError, Firebase errors, TypeErrors) to info. */
export function toPseErrorInfo(error: unknown, operation?: string): PseErrorInfo {
  if (error instanceof PseApiError) {
    const base = error.toInfo();
    return operation && !base.operation ? { ...base, operation } : base;
  }
  if (error instanceof Error) {
    const name = error.name;
    const message = error.message || '';
    if (/auth\//.test(message) || /permission-denied/i.test(message)) {
      return info('auth', { operation, message, code: name });
    }
    if (name === 'TypeError' && /fetch|network/i.test(message)) {
      return info('network', { operation, message });
    }
    if (/abort/i.test(name) || /timeout/i.test(message)) {
      return info('unavailable', { operation, message, code: 'TIMEOUT' });
    }
  }
  return info('unknown', { operation, message: error instanceof Error ? error.message : undefined });
}

/**
 * Internal diagnostics. Admins/developers get enough to identify the failing
 * operation; production users only ever see the clean copy above. Never logs
 * tokens, addresses or balances beyond what the UI already shows.
 */
export function logPseDiagnostic(context: string, err: PseErrorInfo): void {
  const payload = {
    kind: err.kind,
    operation: err.operation,
    status: err.status,
    code: err.code,
    correlationId: err.correlationId,
    at: new Date().toISOString(),
  };
  if (err.kind === 'permission' || err.kind === 'auth' || err.kind === 'validation' || err.kind === 'conflict') {
    console.warn(`[PSEmine] ${context}`, payload);
  } else {
    console.error(`[PSEmine] ${context}`, payload);
  }
}
