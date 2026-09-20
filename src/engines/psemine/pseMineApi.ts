/**
 * PSEmine backend client — the frontend surface for /api/mine/*.
 *
 * Contract rules enforced here:
 *   • The backend is the ONLY source of economic truth. Nothing in this file
 *     computes, infers or caches a balance, capacity or entitlement.
 *   • Every failure is classified (see pseErrors.ts) instead of collapsing into
 *     one generic message, so the UI can distinguish "session expired" from
 *     "not enabled for this account" from "backend unavailable".
 *   • Every request carries an operation label ("GET /api/mine/state") so
 *     diagnostics identify the failing call, and a correlation id when the
 *     backend echoes one.
 */
import { auth } from '../../firebase/config';
import { anchorServerTime } from '../../components/psemine/pse';
import {
  PseApiError, pseDataError, pseHttpError, pseNetworkError, toPseErrorInfo,
} from './pseErrors';

async function request(path: string, init?: RequestInit): Promise<Response> {
  const operation = `${init?.method || 'GET'} ${path}`;
  const user = auth.currentUser;
  if (!user) {
    throw new PseApiError({
      kind: 'auth',
      title: 'Your session has expired',
      message: 'Please sign in again to continue to your mining console.',
      retryable: false,
      operation,
      status: 401,
    });
  }
  const token = await user.getIdToken();
  try {
    const res = await fetch(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      // Prefer the structured body (and its requestId); fall back to the
      // response header. Either way the failure is classified, never generic.
      const body = await res.json().catch(() => null);
      const err = pseHttpError(operation, res.status, body);
      const correlation = body?.requestId
        || res.headers.get('x-request-id')
        || res.headers.get('x-correlation-id');
      throw correlation
        ? new PseApiError({ ...err.toInfo(), correlationId: correlation })
        : err;
    }
    return res;
  } catch (e) {
    if (e instanceof PseApiError) throw e;
    throw pseNetworkError(operation, e);
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await request(path, init);
  try {
    return (await res.json()) as T;
  } catch {
    throw pseDataError(`${init?.method || 'GET'} ${path}`, 200);
  }
}

/* ── Canonical state ─────────────────────────────────────────────────── */

export interface PseStateUser {
  accruedMinor: number; accruedGBP: number; debitedMinor: number; availableMinor: number;
  toolCapacityGBPPerHour: number; referralCapacityGBPPerHour: number; totalCapacityGBPPerHour: number;
  qualifiedReferralsCount: number; payoutWallet: string | null; connectedWallet: string | null;
  status?: string;
}
export interface PseStateTool {
  id: string; toolId?: string; toolName?: string; hourlyRateGBP?: number; purchasePriceGBP?: number;
  status?: string; cycleIndex?: number; cycleState?: string; maintenanceRequired?: boolean;
  cycleEndsAt?: string | null; activatedAt?: string; lastAccruedAt?: string; cycleStartedAt?: string;
  /** Per-tool operating model (backend-authoritative). */
  operatingModel?: 'session' | 'continuous';
  sessionDurationHours?: number;
  restartDelayMinutes?: number;
  /** For a session tool mid-restart: the backend-scheduled next-session start. */
  restartResumesAt?: string | null;
}
export interface PseStateCampaign {
  id?: string; name?: string; status?: string; startAt?: string; endAt?: string; durationDays?: number;
  purchaseEnabled?: boolean; miningEnabled?: boolean; referralEnabled?: boolean;
  receiverWalletAddress?: string; paymentNetwork?: string;
}
/** An in-flight purchase the client can RESUME after a refresh instead of
 *  creating a second purchase intent. Read-only projection of the user's own
 *  records; amounts come verbatim from the stored quote. */
export interface PsePendingPurchase {
  purchaseId: string;
  toolId?: string;
  toolName?: string;
  status?: string;
  quoteId?: string;
  paymentWallet?: string | null;
  receiverWallet?: string;
  quotedBNBAmount?: number;
  quotedBNBWei?: string;
  chainId?: number;
  expiresAt?: string;
  transactionHash?: string | null;
}
export interface PseState {
  success: boolean;
  user: PseStateUser;
  tools: PseStateTool[];
  pendingPurchases?: PsePendingPurchase[];
  campaign: PseStateCampaign | null;
  effectiveCampaignStatus: string;
  checkpoint?: { earnedMinor?: number; duplicate?: boolean };
  serverTimeMs: number;
}

const OPERATION_STATE = 'GET /api/mine/state';

/**
 * Canonical state: triggers the backend accrual checkpoint and anchors the UI
 * clock. This is the only call whose failure blocks the console — everything
 * else degrades to a named feed error.
 */
export async function fetchPseState(): Promise<PseState> {
  const data = await requestJson<PseState>('/api/mine/state');
  if (!data || typeof data !== 'object' || !data.user || !Array.isArray(data.tools)) {
    throw pseDataError(OPERATION_STATE);
  }
  if (typeof data.serverTimeMs === 'number') anchorServerTime(data.serverTimeMs);
  return data;
}

/* ── Payout history ──────────────────────────────────────────────────── */

export interface PseWithdrawal {
  id: string; status?: string; amountGBP?: number; amountMinor?: number; requestedAmountGBP?: number;
  destinationWallet?: string; payoutWallet?: string; payoutTxHash?: string | null; transactionHash?: string | null;
  createdAt?: string; updatedAt?: string; processedAt?: string | null; reviewNotes?: string | null;
}
export async function fetchMyWithdrawals(): Promise<PseWithdrawal[]> {
  const data = await requestJson<{ withdrawals?: PseWithdrawal[] }>('/api/mine/withdrawals');
  return Array.isArray(data?.withdrawals) ? data.withdrawals : [];
}

/* ── Referrals ───────────────────────────────────────────────────────── */

export interface PseReferral {
  id: string; status?: string; refereeId?: string; refereeUsername?: string; refereeEmailMasked?: string;
  bonusHourlyRate?: number; qualifiedAt?: string | null; createdAt?: string;
}
/** Referral rows for the current referrer, including the backend-derived code. */
export async function fetchMyReferrals(): Promise<{ referrals: PseReferral[]; referralCode?: string | null }> {
  const data = await requestJson<{ referrals?: PseReferral[]; referralCode?: string | null }>('/api/mine/referrals');
  return {
    referrals: Array.isArray(data?.referrals) ? data.referrals : [],
    referralCode: data?.referralCode ?? null,
  };
}

/* ── Payout request (backend re-validates every condition) ───────────── */

export async function requestPayout(
  amountGbp: number,
): Promise<{ success: boolean; error?: string; message?: string }> {
  // Goes through the SAME classified request path as every other call, so an
  // expired session or a 409 (payout already pending) surfaces its real reason
  // instead of a single generic failure sentence.
  const OPERATION = 'POST /api/mine/withdrawals/request';
  try {
    const res = await request('/api/mine/withdrawals/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountGbp }),
    });
    const data = await res.json().catch(() => null);
    if (!data || data.success !== true) {
      const err = pseDataError(OPERATION, res.status);
      return { success: false, error: err.code, message: err.toInfo().message };
    }
    return { success: true };
  } catch (e) {
    const info = toPseErrorInfo(e, OPERATION);
    return { success: false, error: info.code || info.kind, message: info.message };
  }
}

/* ── Canonical activity feed (top-level psemine_activities) ──────────── */

export interface PseActivity {
  id: string; type?: string; title?: string; description?: string;
  amountGBP?: number; amountMinor?: number; metadata?: Record<string, unknown>;
  createdAt?: unknown;
}
export async function fetchMyActivities(): Promise<PseActivity[]> {
  const data = await requestJson<{ activities?: PseActivity[] }>('/api/mine/activities');
  return Array.isArray(data?.activities) ? data.activities : [];
}

/* ── Notification records (psemine_notifications only) ───────────────── */

export interface PseNotification {
  id: string; type?: string; title?: string; message?: string;
  read?: boolean; createdAt?: unknown;
}
export async function fetchMyNotifications(): Promise<PseNotification[]> {
  const data = await requestJson<{ notifications?: PseNotification[] }>('/api/mine/notifications');
  return Array.isArray(data?.notifications) ? data.notifications : [];
}
export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    await request(`/api/mine/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

/* ── Explicit enrollment (see PSEMineEngine.enroll) ──────────────────── */

export async function enrollInPSEmine(): Promise<boolean> {
  const data = await requestJson<{ success?: boolean }>('/api/mine/enroll', { method: 'POST' });
  return data?.success === true;
}
