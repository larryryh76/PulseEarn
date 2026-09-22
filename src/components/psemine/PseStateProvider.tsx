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
 * Canonical state cadence.
 *
 * `GET /api/mine/state` is the accrual checkpoint and the single source of the
 * console's figures. It used to run once per minute per visible console, which
 * after the 2026-09-21 Firestore quota exhaustion was the console's largest
 * recurring cost. The figure does NOT go stale when the cadence slows: the
 * backend's checkpoint banks accrual (now at whole-penny boundaries, so the
 * booked balance is cadence-independent — see psemine_core.accrual_banked_boundary)
 * and the UI interpolates between calls from the server anchors. The state is
 * therefore re-read every 5 minutes, when the tab becomes visible or focused
 * (rate-limited below), on explicit user action, and immediately after any
 * mutation this session performs (purchase activated, restart requested, payout
 * address changed — see `stateEpoch`).
 */
const STATE_REFRESH_MS = 5 * 60_000;

/**
 * Minimum spacing for visibility/focus refreshes. Without it, alt-tabbing into
 * the console fired a state read on every switch — cheap individually, and a
 * self-inflicted burst in aggregate.
 */
const FOCUS_REFRESH_MIN_GAP_MS = 60_000;

/**
 * The four secondary feeds change rarely: PSEMineContext already delivers
 * referral / purchase / ownership changes through live Firestore listeners, and
 * every feed page has its own Refresh control. Re-fetching all four on every
 * state tick meant five requests per console minute, four of which were
 * near-always redundant — the console half of the 2026-09-21 read amplification.
 * They are refreshed on load, on explicit user action, and on this slower
 * background cadence.
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
  const { campaign, stateEpoch } = usePSEMine();
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
  /** When the canonical state was last (re)read — gates focus refreshes. */
  const lastLoadAt = useRef(0);
  /** Highest mutation epoch already turned into a refresh. */
  const handledEpoch = useRef(0);
  /** Last campaign status this console rendered, to detect server-side change. */
  const campaignStatusRef = useRef<string | null | undefined>(undefined);

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
      lastLoadAt.current = Date.now();
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
    const id = window.setInterval(tick, STATE_REFRESH_MS);
    // Coming back to the tab is a strong signal the user wants current numbers,
    // but alt-tabbing must not become one state read per switch: refreshes from
    // focus are rate-limited to FOCUS_REFRESH_MIN_GAP_MS. Explicit refresh
    // (the Sync controls) is never rate-limited.
    const onFocusLike = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastLoadAt.current < FOCUS_REFRESH_MIN_GAP_MS) return;
      void load(true, 'if-due');
    };
    document.addEventListener('visibilitychange', onFocusLike);
    window.addEventListener('focus', onFocusLike);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onFocusLike);
      window.removeEventListener('focus', onFocusLike);
    };
  }, [currentUser, hasPSEmineAccess, load]);

  // Mutation-triggered refresh: the slower cadence above must never leave a
  // JUST-PERFORMED action stale. PSEMineContext bumps `stateEpoch` when this
  // session activates a tool, schedules a restart or changes the payout wallet.
  // Deliberately NOT driven by Firestore listener fires: the accrual checkpoint
  // itself writes the user document, so a listener-driven refresh would feed
  // request traffic back into its own writes.
  useEffect(() => {
    if (stateEpoch === handledEpoch.current) return;
    handledEpoch.current = stateEpoch;
    void load(true);
  }, [stateEpoch, load]);

  // Campaign state can change server-side (pause / resume / auto-end). The
  // campaign snapshot arrives through PSEMineContext's gated listener, so a
  // status transition refreshes the console's state once — and only once, since
  // the transition is one-way and the refresh does not itself flip the status.
  useEffect(() => {
    const status = campaign?.status ?? null;
    if (campaignStatusRef.current === undefined) {
      campaignStatusRef.current = status;  // first snapshot: nothing changed yet
      return;
    }
    if (status !== campaignStatusRef.current) {
      campaignStatusRef.current = status;
      void load(true, 'if-due');
    }
  }, [campaign?.status, load]);

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
