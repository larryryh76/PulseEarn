import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import {
  PseState, PseStateTool, fetchPseState, fetchMyWithdrawals, fetchMyReferrals,
  fetchMyActivities, fetchMyNotifications, PseWithdrawal, PseReferral,
  PseActivity, PseNotification, markNotificationRead as markNotificationReadApi,
} from '../../engines/psemine/pseMineApi';
import {
  PseErrorInfo, toPseErrorInfo, logPseDiagnostic,
} from '../../engines/psemine/pseErrors';
import { gbp } from './pse';

/** Secondary (non-blocking) data feeds. */
export type PseFeed = 'withdrawals' | 'referrals' | 'activities' | 'notifications';

/**
 * The canonical state is re-checkpointed every minute (it is the accrual clock),
 * but the four secondary feeds are NOT: they change rarely, PSEMineContext
 * already delivers referral / purchase / ownership changes through live
 * Firestore listeners, and every feed page has its own Refresh control.
 * Re-fetching all four on every tick meant five requests per console minute, four
 * of which were near-always redundant — the console half of the 2026-09-21 read
 * amplification. They are now refreshed on load, on explicit user action, and on
 * this slower background cadence.
 */
const FEED_REFRESH_MS = 5 * 60_000;

interface PseStateCtx {
  state: PseState | null;
  campaignStatus: string | null;
  loading: boolean;
  /** Blocking failure: the canonical mining state could not be established. */
  error: PseErrorInfo | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  /** Per-feed failures, so an empty list is never confused with a failed load. */
  feedErrors: Partial<Record<PseFeed, PseErrorInfo>>;
  refreshFeed: (feed: PseFeed) => Promise<void>;
  withdrawals: PseWithdrawal[];
  referrals: PseReferral[];
  referralCode: string | null;
  activities: PseActivity[];
  notifications: PseNotification[];
  unreadNotifications: number;
  markNotificationRead: (id: string) => Promise<void>;
}

const Ctx = createContext<PseStateCtx | undefined>(undefined);

export const PseStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, hasPSEmineAccess } = usePSEMineAuth();
  const { campaign } = usePSEMine();
  const [state, setState] = useState<PseState | null>(null);
  const [withdrawals, setWithdrawals] = useState<PseWithdrawal[]>([]);
  const [referrals, setReferrals] = useState<PseReferral[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [activities, setActivities] = useState<PseActivity[]>([]);
  const [notifications, setNotifications] = useState<PseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PseErrorInfo | null>(null);
  const [feedErrors, setFeedErrors] = useState<Partial<Record<PseFeed, PseErrorInfo>>>({});
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);
  /** When the secondary feeds were last fetched (0 = never in this session). */
  const lastFeedsAt = useRef(0);

  /**
   * Identity-only reset. Called on sign-out AND when the account has no
   * PSEmine entitlement: we must never call /api/mine/* (or show stale PSEmine
   * figures) for an account that isn't enrolled. The console renders the
   * entitlement state from PSEMineAuth instead of a generic failure.
   */
  const clearAll = useCallback(() => {
    setState(null); setWithdrawals([]); setReferrals([]); setReferralCode(null);
    setActivities([]); setNotifications([]); setFeedErrors({});
  }, []);

  const loadFeeds = useCallback(async () => {
    const feeds: Array<[PseFeed, () => Promise<void>]> = [
      ['withdrawals', async () => setWithdrawals(await fetchMyWithdrawals())],
      ['referrals', async () => {
        const r = await fetchMyReferrals();
        setReferrals(r.referrals);
        setReferralCode(r.referralCode ?? null);
      }],
      ['activities', async () => setActivities(await fetchMyActivities())],
      ['notifications', async () => setNotifications(await fetchMyNotifications())],
    ];
    const results = await Promise.allSettled(feeds.map(([, run]) => run()));
    const next: Partial<Record<PseFeed, PseErrorInfo>> = {};
    results.forEach((res, i) => {
      if (res.status === 'rejected') {
        const info = toPseErrorInfo(res.reason, feeds[i][0]);
        logPseDiagnostic(`feed ${feeds[i][0]}`, info);
        next[feeds[i][0]] = info;
      }
    });
    setFeedErrors(next);
  }, []);

  const load = useCallback(async (isRefresh: boolean, feeds: 'always' | 'if-due' = 'always') => {
    if (!currentUser) {
      clearAll();
      setLoading(false);
      setError(null);
      return;
    }
    // Entitlement gate: no PSEmine access ⇒ no PSEmine API calls at all.
    if (!hasPSEmineAccess) {
      clearAll();
      setLoading(false);
      setError({
        kind: 'permission',
        title: "PSEmine isn't enabled for this account",
        message: 'This account does not have PSEmine access. Enable PSEmine for this account from the console, or sign in with the enrolled account.',
        retryable: false,
      });
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const s = await fetchPseState();
      setState(s);
      // 'always' = mount and explicit user refresh (Sync buttons, feed Refresh
      // controls); 'if-due' = the background tick, which must not re-poll four
      // endpoints that almost never change.
      if (feeds === 'always' || Date.now() - lastFeedsAt.current >= FEED_REFRESH_MS) {
        lastFeedsAt.current = Date.now();
        await loadFeeds();
      }
    } catch (e) {
      const info = toPseErrorInfo(e, 'GET /api/mine/state');
      logPseDiagnostic('canonical state', info);
      setError(info);
      if (!isRefresh) clearAll();
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, hasPSEmineAccess, clearAll, loadFeeds]);

  useEffect(() => { void load(false); }, [load]);

  // Periodic re-checkpoint while visible: accrual continues server-side; this
  // only refreshes the displayed figure and keeps the clock anchored. The feeds
  // ride along only when their slower cadence is due (see FEED_REFRESH_MS).
  useEffect(() => {
    if (!currentUser || !hasPSEmineAccess) return;
    const tick = () => { if (document.visibilityState === 'visible') void load(true, 'if-due'); };
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, [currentUser, hasPSEmineAccess, load]);

  const campaignStatus = useMemo(() => {
    if (state?.effectiveCampaignStatus) return state.effectiveCampaignStatus;
    return campaign?.status ?? null;
  }, [state, campaign]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic clear; server is re-validated on next refresh.
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationReadApi(id);
  }, []);

  const refreshFeed = useCallback(async (feed: PseFeed) => {
    try {
      if (feed === 'withdrawals') setWithdrawals(await fetchMyWithdrawals());
      if (feed === 'referrals') {
        const r = await fetchMyReferrals();
        setReferrals(r.referrals);
        setReferralCode(r.referralCode ?? null);
      }
      if (feed === 'activities') setActivities(await fetchMyActivities());
      if (feed === 'notifications') setNotifications(await fetchMyNotifications());
      setFeedErrors(prev => { const n = { ...prev }; delete n[feed]; return n; });
    } catch (e) {
      const info = toPseErrorInfo(e, feed);
      logPseDiagnostic(`feed ${feed}`, info);
      setFeedErrors(prev => ({ ...prev, [feed]: info }));
    }
  }, []);

  const value: PseStateCtx = {
    state,
    campaignStatus,
    loading,
    error,
    refreshing,
    refresh: () => load(true),
    feedErrors,
    refreshFeed,
    withdrawals,
    referrals,
    referralCode,
    activities,
    notifications,
    unreadNotifications: notifications.filter(n => !n.read).length,
    markNotificationRead: markRead,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function usePseState(): PseStateCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePseState must be used within PseStateProvider');
  return ctx;
}

/** Available balance — backend `availableMinor` ONLY.
 *
 * Never falls back to accrued earnings: "settlement-available" and "accrued"
 * are distinct accounting states. Accrued money is not withdrawable until the
 * backend finalizes settlement and reports an available figure; relabeling
 * accrued as available would misrepresent what the user can request.
 * (Backend is authoritative; this hook formats its explicit figure.) */
export function useAvailableGBP(): string {
  const { state } = usePseState();
  const availableMinor = state?.user?.availableMinor ?? 0;
  return gbp(availableMinor / 100);
}

export type { PseStateTool };
