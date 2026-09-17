/**
 * PSEmine error taxonomy.
 *
 * WHY: the console used to collapse every failure — expired session, missing
 * entitlement, backend 500, offline browser, malformed payload — into one
 * generic "Something went wrong / An internal server error occurred" screen.
 * That is both unhelpful to the user and misleading to operators.
 *
 * Every failure class now carries:
 *   • a kind (so the UI can render the right message and the right action)
 *   • an operation + endpoint (so logs identify WHERE it failed)
 *   • a correlation id (so a support ticket can be matched to a request)
 *
 * Kinds are deliberately narrow and mutually exclusive:
 *   auth       — session missing/expired  → sign in again (not retryable here)
 *   permission — not entitled to PSEmine  → explain entitlement (not retryable)
 *   backend    — server-side failure      → retry; service unavailable copy
 *   network    — request never landed     → retry; connectivity copy
 *   data       — landed but unusable      → retry; account-loading copy
 *   unknown    — anything else            → retry with generic copy
 */

export type PseErrorKind = 'auth' | 'permission' | 'backend' | 'network' | 'data' | 'unknown';

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
      message: COPY[this.kind].message,
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

/** Build an error for a failed HTTP response. */
export function pseHttpError(
  operation: string,
  status: number,
  body?: { error?: string; message?: string } | null,
): PseApiError {
  const code = body?.error;
  if (status === 401) return new PseApiError(info('auth', { status, code, operation }));
  if (status === 403) return new PseApiError(info('permission', { status, code, operation }));
  if (status === 400 || status === 404 || status === 409) {
    // A rejected request (bad quote, no purchase, etc.) is a real, specific
    // failure — surface the backend's own message rather than a generic one.
    return new PseApiError(
      info('backend', { status, code, operation, message: body?.message || COPY.backend.message }),
    );
  }
  return new PseApiError(info('backend', { status, code, operation }));
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
  if (err.kind === 'permission' || err.kind === 'auth') {
    console.warn(`[PSEmine] ${context}`, payload);
  } else {
    console.error(`[PSEmine] ${context}`, payload);
  }
}
