import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import {
  PseState, PseStateTool, fetchPseState, fetchMyWithdrawals, fetchMyReferrals,
  fetchMyActivities, fetchMyNotifications, PseWithdrawal, PseReferral,
  PseActivity, PseNotification,
} from '../../engines/psemine/pseMineApi';
import { gbp } from './pse';
import { markNotificationRead as markNotificationReadApi } from '../../engines/psemine/pseMineApi';

interface PseStateCtx {
  state: PseState | null;
  campaignStatus: string | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
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
  const { currentUser } = usePSEMineAuth();
  const { campaign } = usePSEMine();
  const [state, setState] = useState<PseState | null>(null);
  const [withdrawals, setWithdrawals] = useState<PseWithdrawal[]>([]);
  const [referrals, setReferrals] = useState<PseReferral[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [activities, setActivities] = useState<PseActivity[]>([]);
  const [notifications, setNotifications] = useState<PseNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async (isRefresh: boolean) => {
    if (!currentUser) {
      setState(null); setWithdrawals([]); setReferrals([]); setReferralCode(null);
      setActivities([]); setNotifications([]);
      setLoading(false); setError(null);
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const s = await fetchPseState();
      setState(s);
      const [w, r, acts, notifs] = await Promise.all([
        fetchMyWithdrawals(), fetchMyReferrals(), fetchMyActivities(), fetchMyNotifications(),
      ]);
      setWithdrawals(w);
      setReferrals(r.referrals);
      setReferralCode(r.referralCode ?? null);
      setActivities(acts);
      setNotifications(notifs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not reach the mining network.';
      setError(msg);
      if (!isRefresh) setState(null);
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => { void load(false); }, [load]);

  // Periodic re-checkpoint while visible: accrual continues server-side; this
  // only refreshes the displayed figure and keeps the clock anchored.
  useEffect(() => {
    if (!currentUser) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') void load(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [currentUser, load]);

  const campaignStatus = useMemo(() => {
    if (state?.effectiveCampaignStatus) return state.effectiveCampaignStatus;
    return campaign?.status ?? null;
  }, [state, campaign]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic clear; server is re-validated on next refresh.
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationReadApi(id);
  }, []);

  const value: PseStateCtx = {
    state,
    campaignStatus,
    loading,
    error,
    refreshing,
    refresh: () => load(true),
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
