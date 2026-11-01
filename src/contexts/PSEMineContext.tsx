import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import type { QuerySnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { 
  PSEMineCampaign, 
  PSEMineUser, 
  PSEMineToolDefinition, 
  PSEMineToolOwnership, 
  PSEMinePurchase, 
  PSEMineReferral, 
  PSEMinePayout, 
  PSEMineActivity, 
  LOCKED_PSEMINE_TOOLS
} from '../types/psemine';
import { PSEMineEngine } from '../engines/psemine/PSEMineEngine';
import toast from 'react-hot-toast';
import { nowMs } from '../components/psemine/pseCore';

/**
 * Bounds on the PSEmine realtime listeners.
 *
 * WHY: a Firestore `onSnapshot` without `limit()` re-reads the ENTIRE result set
 * every time the listener attaches — and the console is mounted by every signed-in
 * miner on every PSEmine route. Three of these listeners were unbounded, so a
 * mature account paid for its whole purchase / ownership / referral history on
 * every mount. These bounds are derived from the product's own constraints, not
 * chosen for effect:
 *
 *  • ownerships — the locked economics cap total ownership at 5+3+3+2 = 13 tools
 *    per account (starter/builder/advanced/elite). 25 leaves room for a legacy
 *    v1 ownership alongside a canonical one without ever clipping live data.
 *  • purchases — purchase records are not capped (abandoned intents accumulate),
 *    so this one is ordered by `createdAt` descending and bounded to the most
 *    recent 25. The dashboard renders the three most recent. Requires the
 *    composite index declared in firestore.indexes.json.
 *  • referrals — an account can invite without limit, but only the first 5
 *    qualified referrals carry capacity and the console renders referral rows
 *    from the API feed (/api/mine/referrals), not from this listener. 50 matches
 *    the bound the API feeds use for activities and notifications.
 */
const OWNERSHIP_LISTENER_LIMIT = 25;
const PURCHASE_LISTENER_LIMIT = 25;
const REFERRAL_LISTENER_LIMIT = 50;

interface PSEMineContextType {
  campaign: PSEMineCampaign | null;
  pseUser: PSEMineUser | null;
  loading: boolean;
  liveAccruedGBP: number;
  tools: PSEMineToolDefinition[];
  ownerships: PSEMineToolOwnership[];
  purchases: PSEMinePurchase[];
  referrals: PSEMineReferral[];
  activities: PSEMineActivity[];
  payouts: PSEMinePayout[];
  updatePayoutWallet: (newAddress: string) => Promise<{ success: boolean; error?: string }>;
  maintainTool: (ownershipId: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  isCampaignArchived: boolean;
  campaignDaysRemaining: number;
  /**
   * Bumped whenever THIS session completes a state-changing action whose result
   * the console must show immediately (tool activated, restart scheduled, payout
   * address changed). PseStateProvider refreshes `/api/mine/state` on change, so
   * a slower background cadence never leaves a purchase or a restart stale —
   * without letting Firestore listener fires (which the accrual checkpoint can
   * itself cause) drive request traffic.
   */
  stateEpoch: number;
}

const PSEMineContext = createContext<PSEMineContextType | undefined>(undefined);

export const PSEMineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const hasPSEmineAccess = userData?.productAccess?.psemine === true;
  // IDENTITY, not object identity. The listener effect below must survive any
  // re-render that does not change WHO is signed in: it used to depend on the
  // whole `currentUser` object and on `userData?.username`, so a PulseEarn
  // profile update tore down and re-created all five Firestore listeners — a
  // full re-read of four queries plus one document, against the same quota the
  // PSEmine console already spends on `/api/mine/state`.
  const currentUserUid = currentUser?.uid;
  const currentUserEmail = currentUser?.email ?? undefined;
  const [stateEpoch, setStateEpoch] = useState(0);
  const bumpStateEpoch = useCallback(() => setStateEpoch(e => e + 1), []);
  const [campaign, setCampaign] = useState<PSEMineCampaign | null>(null);
  const [pseUser, setPseUser] = useState<PSEMineUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [liveAccruedGBP, setLiveAccruedGBP] = useState<number>(0);
  const [ownerships, setOwnerships] = useState<PSEMineToolOwnership[]>([]);
  const [purchases, setPurchases] = useState<PSEMinePurchase[]>([]);
  const [referrals, setReferrals] = useState<PSEMineReferral[]>([]);
  const [activities, setActivities] = useState<PSEMineActivity[]>([]);
  const [payouts, setPayouts] = useState<PSEMinePayout[]>([]);

  const animFrameRef = useRef<number | null>(null);
  // READ, never depended on: the PulseEarn username is only used to label the
  // zeroed PSEmine user document when it is first created. Making it a listener
  // dependency re-subscribed every PSEmine listener on any profile rename.
  const usernameRef = useRef<string | undefined>(userData?.username);
  useEffect(() => { usernameRef.current = userData?.username; }, [userData?.username]);

  // 1. Subscribe to Authoritative Campaign State
  //
  // ENTITLEMENT-GATED (2026-09-21 remediation). firestore.rules scope this
  // document to `hasPSEMineAccess(uid)`, so an unconditional listener could only
  // ever resolve as a DENIED subscription for a signed-out visitor or a
  // PulseEarn-only account — a persistent, permanently-erroring listener that
  // then fell through to a one-shot fetch anyway. Entitled miners get the
  // realtime document they are permitted to read; everyone else gets the
  // backend's public projection (GET /api/mine/campaign/status) exactly once,
  // with no listener and no error path.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    if (!currentUserUid || !hasPSEmineAccess) {
      PSEMineEngine.getOrCreateActiveCampaign().then(camp => {
        if (!cancelled) setCampaign(camp ?? null);
      });
      return () => { cancelled = true; };
    }

    const initCampaign = async () => {
      try {
        const campRef = doc(db, 'psemine_campaigns', 'active_campaign');
        // Ignore cache-only snapshots. A previous campaign window can remain in
        // Firestore's local persistence after an admin schedules a new one; showing
        // that snapshot across the console makes every page repeat the old dates
        // until a later refresh. Wait for the server-owned campaign document.
        unsub = onSnapshot(campRef, { includeMetadataChanges: true }, (snap) => {
          if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
          if (snap.exists()) {
            setCampaign(snap.data() as PSEMineCampaign);
          } else {
            // Bootstrap initial campaign document
            PSEMineEngine.getOrCreateActiveCampaign().then(camp => {
              if (!cancelled) setCampaign(camp ?? null);
            });
          }
        }, (err) => {
          console.warn('[PSEMineContext] Campaign listener fallback:', err);
          PSEMineEngine.getOrCreateActiveCampaign().then(camp => {
            if (!cancelled) setCampaign(camp ?? null);
          });
        });
      } catch {
        PSEMineEngine.getOrCreateActiveCampaign().then(camp => {
          if (!cancelled) setCampaign(camp ?? null);
        });
      }
    };

    initCampaign();
    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [currentUserUid, hasPSEmineAccess]);

  // 2. Subscribe to PSE User Data and Subcollections
  useEffect(() => {
    // ENTITLEMENT GATE. Bootstrapping psemine_users/{uid} is an enrollment act:
    // firestore.rules allow the owner to create that zeroed document, so doing
    // it for any authenticated visitor let a PulseEarn account silently acquire
    // a PSEmine footprint. Product access is explicit now — an account without
    // productAccess.psemine gets no PSEmine listeners and no PSEmine writes.
    if (!currentUserUid || !hasPSEmineAccess) {
      setPseUser(null);
      setOwnerships([]);
      setPurchases([]);
      setReferrals([]);
      setActivities([]);
      setPayouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubUser: (() => void) | undefined;
    let unsubOwnerships: (() => void) | undefined;
    let unsubPurchases: (() => void) | undefined;
    let unsubReferrals: (() => void) | undefined;

    const setupUserListeners = async () => {
      try {
        // Ensure user exists
        await PSEMineEngine.getOrCreatePSEUser(
          currentUserUid,
          currentUserEmail,
          usernameRef.current
        );

        const userRef = doc(db, 'psemine_users', currentUserUid);
        unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as PSEMineUser;
            setPseUser(data);
          }
          setLoading(false);
        }, (err) => {
          console.warn('[PSEMineContext] User snapshot error:', err);
          setLoading(false);
        });

        // Tool Ownerships — bounded at the ownership cap (see the limits above).
        const ownQuery = query(
          collection(db, 'psemine_tool_ownership'),
          where('userId', '==', currentUserUid),
          limit(OWNERSHIP_LISTENER_LIMIT)
        );
        unsubOwnerships = onSnapshot(ownQuery, (snap) => {
          const list: PSEMineToolOwnership[] = [];
          snap.forEach(d => list.push(d.data() as PSEMineToolOwnership));
          setOwnerships(list);
        }, (err) => {
          console.warn('[PSEMineContext] Ownership snapshot error:', err);
        });

        // Purchases — most recent first, bounded. `createdAt` is written by the
        // backend on every intent (firestore.SERVER_TIMESTAMP), so an ordered
        // read is complete rather than sampling.
        //
        // INDEX GRACEFUL DEGRADATION: an ordered read over an equality filter
        // needs the composite index declared in firestore.indexes.json. If that
        // index has not been deployed yet, Firestore rejects the listener with
        // FAILED_PRECONDITION — so the SAME bounded read is retried WITHOUT the
        // order clause instead of leaving the dashboard's purchase history
        // empty. The degraded path is a subset risk only (an account holding
        // more than PURCHASE_LISTENER_LIMIT purchase records), never a failure:
        // the failing listener is detached first, so it cannot error-loop, and
        // the warning always names the condition so the missing index stays
        // visible to whoever reads the console.
        // Building a query object reads nothing; only the listener does.
        const purQuery = query(
          collection(db, 'psemine_purchases'),
          where('userId', '==', currentUserUid),
          orderBy('createdAt', 'desc'),
          limit(PURCHASE_LISTENER_LIMIT)
        );
        const purFallbackQuery = query(
          collection(db, 'psemine_purchases'),
          where('userId', '==', currentUserUid),
          limit(PURCHASE_LISTENER_LIMIT)
        );
        const applyPurchases = (snap: QuerySnapshot) => {
          const list: PSEMinePurchase[] = [];
          snap.forEach(d => list.push(d.data() as PSEMinePurchase));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPurchases(list);
        };
        unsubPurchases = onSnapshot(purQuery, applyPurchases, (err) => {
          // Loud, never silent: detach the failing listener, then degrade to the
          // same bounded read without the order clause (see the note above).
          console.warn('[PSEMineContext] Purchase snapshot error:', err);
          const failed = unsubPurchases;
          unsubPurchases = onSnapshot(
            purFallbackQuery,
            applyPurchases,
            (err2) => console.warn('[PSEMineContext] Purchase snapshot error (unordered fallback):', err2),
          );
          if (typeof failed === 'function') failed();
        });

        // Referrals — bounded (the console renders referrals from the API feed).
        const refQuery = query(
          collection(db, 'psemine_referrals'),
          where('referrerId', '==', currentUserUid),
          limit(REFERRAL_LISTENER_LIMIT)
        );
        unsubReferrals = onSnapshot(refQuery, (snap) => {
          const list: PSEMineReferral[] = [];
          snap.forEach(d => list.push(d.data() as PSEMineReferral));
          setReferrals(list);
        }, (err) => {
          console.warn('[PSEMineContext] Referral snapshot error:', err);
        });

        // D1 remediation: the legacy psemine_users/{uid}/activity subcollection
        // is NOT the canonical source — the backend writes real records to the
        // top-level psemine_activities collection, exposed via /api/mine/activities.
        // Subscribing to the dead subcollection here would surface empty/ghost
        // data, so this listener is intentionally omitted. Consumers read the
        // canonical feed from PseStateProvider (usePseState).activities.

      } catch (e) {
        console.error('[PSEMineContext] User listeners initialization error:', e);
        setLoading(false);
      }
    };

    setupUserListeners();

    return () => {
      if (unsubUser) unsubUser();
      if (unsubOwnerships) unsubOwnerships();
      if (unsubPurchases) unsubPurchases();
      if (unsubReferrals) unsubReferrals();
    };
    // `usernameRef` is intentionally not a dependency (see its declaration).
  }, [currentUserUid, currentUserEmail, hasPSEmineAccess]);

  // 3. High-Frequency Visual Accrual Animation (Server-Anchored)
  useEffect(() => {
    const updateAccrual = () => {
      if (pseUser) {
        const val = PSEMineEngine.calculateLiveAccrued(pseUser, campaign, Date.now());
        setLiveAccruedGBP(val);
      } else {
        setLiveAccruedGBP(0);
      }
      animFrameRef.current = requestAnimationFrame(updateAccrual);
    };

    animFrameRef.current = requestAnimationFrame(updateAccrual);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [pseUser, campaign]);  // 7. Update Payout Wallet
  const updatePayoutWallet = useCallback(async (newAddress: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const res = await PSEMineEngine.updatePayoutWallet(newAddress);
      if (res.success) {
        toast.success('Settlement payout address updated');
        bumpStateEpoch();  // the state document carries payoutWallet
      } else {
        toast.error(res.error || 'Could not update payout address');
      }
      return res;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Network error';
      return { success: false, error: errMsg };
    }
  }, [currentUser, bumpStateEpoch]);

  const refreshData = useCallback(async () => {
    if (currentUser) {
      // Phase 2: refresh now triggers the canonical backend accrual checkpoint
      // (GET /api/mine/state) instead of client-side arithmetic.
      await PSEMineEngine.syncAccrual(currentUser.uid);
    }
  }, [currentUser]);

  // 8. Free operating-cycle maintenance (backend-authoritative, idempotent)
  const maintainTool = useCallback(async (ownershipId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }
    const res = await PSEMineEngine.maintainTool(ownershipId);
    if (res.success) {
      toast.success(
        'Restart requested — the next mining session begins automatically when the backend completes the restart.',
        { duration: 6000 },
      );
      await PSEMineEngine.syncAccrual(currentUser.uid);
      bumpStateEpoch();  // next session start / cycle state changed
    } else {
      toast.error(res.error || 'Restart failed');
    }
    return res;
  }, [currentUser, bumpStateEpoch]);

  // Derive the campaign window from the backend's published dates and its
  // server-anchored clock. Missing/invalid dates are unknown, not a fabricated
  // 90-day countdown.
  const campaignDaysRemaining = React.useMemo(() => {
    if (!campaign?.endAt) return 0;
    const endMs = new Date(campaign.endAt).getTime();
    if (!Number.isFinite(endMs)) return 0;
    return Math.max(0, Math.ceil((endMs - nowMs()) / 86_400_000));
  }, [campaign]);

  const isCampaignArchived = Boolean(
    campaign?.status === 'archived' || campaign?.shutdownState?.isArchived
  );

  const toolsList: PSEMineToolDefinition[] = Object.values(LOCKED_PSEMINE_TOOLS).sort(
    (a, b) => a.displayOrder - b.displayOrder
  );

  return (
    <PSEMineContext.Provider
      value={{
        campaign,
        pseUser,
        loading,
        liveAccruedGBP,
        tools: toolsList,
        ownerships,
        purchases,
        referrals,
        activities,
        payouts,
        updatePayoutWallet,
        maintainTool,
        refreshData,
        isCampaignArchived,
        campaignDaysRemaining,
        stateEpoch
      }}
    >
      {children}
    </PSEMineContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePSEMine = (): PSEMineContextType => {
  const context = useContext(PSEMineContext);
  if (!context) {
    throw new Error('usePSEMine must be used within a PSEMineProvider');
  }
  return context;
};
