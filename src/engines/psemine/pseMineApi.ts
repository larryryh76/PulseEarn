/**
 * PSEmine backend client (frontend read surface).
 *
 * Wraps ONLY the existing backend endpoints. No economic values are computed
 * or written here — the backend is the single source of truth.
 */
import { auth } from '../../firebase/config';
import { anchorServerTime } from '../../components/psemine/pse';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

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
}
export interface PseStateCampaign {
  id?: string; name?: string; status?: string; startAt?: string; endAt?: string; durationDays?: number;
  purchaseEnabled?: boolean; miningEnabled?: boolean; referralEnabled?: boolean;
  receiverWalletAddress?: string; paymentNetwork?: string;
}
export interface PseState {
  success: boolean;
  user: PseStateUser;
  tools: PseStateTool[];
  campaign: PseStateCampaign | null;
  effectiveCampaignStatus: string;
  checkpoint?: { earnedMinor?: number; duplicate?: boolean };
  serverTimeMs: number;
}

/** Canonical state: triggers the backend accrual checkpoint and anchors the UI clock. */
export async function fetchPseState(): Promise<PseState> {
  const res = await fetch('/api/mine/state', { headers: await authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || data?.error || `State unavailable (${res.status})`);
  }
  const data = await res.json() as PseState;
  if (typeof data?.serverTimeMs === 'number') {
    anchorServerTime(data.serverTimeMs);
  }
  return data;
}

export interface PseWithdrawal {
  id: string; status?: string; amountGBP?: number; amountMinor?: number; requestedAmountGBP?: number;
  destinationWallet?: string; payoutWallet?: string; payoutTxHash?: string | null; transactionHash?: string | null;
  createdAt?: string; updatedAt?: string; processedAt?: string | null; reviewNotes?: string | null;
}
export async function fetchMyWithdrawals(): Promise<PseWithdrawal[]> {
  try {
    const res = await fetch('/api/mine/withdrawals', { headers: await authHeaders() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.withdrawals) ? data.withdrawals as PseWithdrawal[] : [];
  } catch { return []; }
}

export interface PseReferral {
  id: string; status?: string; refereeId?: string; refereeUsername?: string; refereeEmailMasked?: string;
  bonusHourlyRate?: number; qualifiedAt?: string | null; createdAt?: string;
}
/** Referral rows for the current referrer, including the backend-derived code. */
export async function fetchMyReferrals(): Promise<{ referrals: PseReferral[]; referralCode?: string | null }> {
  try {
    const res = await fetch('/api/mine/referrals', { headers: await authHeaders() });
    if (!res.ok) return { referrals: [] };
    const data = await res.json().catch(() => ({}));
    return {
      referrals: Array.isArray(data?.referrals) ? data.referrals as PseReferral[] : [],
      referralCode: data?.referralCode ?? null,
    };
  } catch { return { referrals: [] }; }
}

/* ── Payout request (D4). Backend gate: POST /api/mine/withdrawals/request →
 * create_payout_request — blocked while campaign is active/paused, min £10,
 * requires a configured payout wallet, exactly-one pending request.
 * The backend re-validates every condition; the UI treats it as authoritative. */
export async function requestPayout(amountGbp: number, payoutAddress: string): Promise<{ success: boolean; error?: string; message?: string }> {
  const res = await fetch('/api/mine/withdrawals/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ amountGbp, payoutAddress }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    return { success: false, error: data?.error, message: data?.message || 'Payout request could not be submitted.' };
  }
  return { success: true };
}

/* ── Canonical activity feed (top-level psemine_activities, engine-written) ── */
export interface PseActivity {
  id: string; type?: string; title?: string; description?: string;
  amountGBP?: number; amountMinor?: number; metadata?: Record<string, unknown>;
  createdAt?: unknown;
}
export async function fetchMyActivities(): Promise<PseActivity[]> {
  try {
    const res = await fetch('/api/mine/activities', { headers: await authHeaders() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.activities) ? data.activities as PseActivity[] : [];
  } catch { return [];
  }
}

/* ── Notification records (psemine_notifications; rules-sanctioned client read) ── */
export interface PseNotification {
  id: string; type?: string; title?: string; message?: string;
  read?: boolean; createdAt?: unknown;
}
export async function fetchMyNotifications(): Promise<PseNotification[]> {
  try {
    const res = await fetch('/api/mine/notifications', { headers: await authHeaders() });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.notifications) ? data.notifications as PseNotification[] : [];
  } catch { return [];
  }
}
export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/mine/notifications/${encodeURIComponent(id)}/read`, {
      method: 'POST', headers: await authHeaders(),
    });
    return res.ok;
  } catch { return false; }
}

