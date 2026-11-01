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
  PSEMineQuote, 
  PSEToolTierId,
  LOCKED_PSEMINE_TOOLS
} from '../types/psemine';
import { PSEMineEngine } from '../engines/psemine/PSEMineEngine';
import {
  type PseEip1193Provider,
  type PseWalletConnection,
  type PseWalletTransport,
  type PseInjectedWallet,
  PseWalletConnectError,
  cancelWalletConnect,
  clearWalletConnectHandoff,
  connectWalletConnectProvider,
  connectWithProvider,
  connectWalletConnect,
  disconnectWalletConnect,
  discoverInjectedWallets,
  ensureChain,
  isHandoffFromPreviousDocument,
  isWalletConnectConfigured,
  isWalletRejection,
  readWalletConnectHandoff,
  restoreWalletConnectSession,
  shouldResumeWalletConnectHandoff,
  getChainId,
  parseChainId,
  sendPaymentTransaction,
  silentInjectedAccounts,
  subscribeWalletEvents,
  walletConnectChainId,
} from '../engines/psemine/pseWallet';
import {
  beginWalletTrace,
  ensureWalletTrace,
  getWalletCorrelationId,
  recordWalletDocumentBoot,
  recordWalletStage,
} from '../engines/psemine/pseWalletTrace';
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
  connectedWallet: string | null;
  isConnectingWallet: boolean;
  /** Transport of the active wallet connection ('injected' | 'walletConnect'). */
  walletTransport: PseWalletTransport | null;
  /** Human-readable wallet label for the active connection. */
  walletName: string | null;
  /** Active EIP-1193 chain id (decimal), or null when no wallet reports one.
   *  Payment is only permitted on the server-quoted chain (56 = BSC mainnet). */
  walletChainId: number | null;
  /** Discoverable injected wallets (EIP-6963) + whether WalletConnect is offered. */
  injectedWallets: PseInjectedWallet[];
  walletConnectAvailable: boolean;
  /** 'interrupted' = a previous document's handoff ended before its approval could be saved. */
  walletRecoveryState: 'none' | 'resuming' | 'interrupted';
  /** Correlation id of the current wallet attempt (safe to show in support reports). */
  walletCorrelationId: string | null;
  connectWallet: (walletId?: string) => Promise<string | null>;
  connectWalletConnectTransport: (resume?: boolean) => Promise<string | null>;
  cancelWalletConnectTransport: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  /** Sends the payment through the active provider; resolves with the tx hash. */
  sendPayment: (tx: { from: string; to: string; value: string }) => Promise<string>;
  /** Fail-closed chain assertion against the server-quoted chain. */
  ensurePaymentChain: (chainId: number) => Promise<boolean>;
  /**
   * Re-reads the active chain from the wallet provider and updates
   * `walletChainId`. Called after an explicit switch: wallets that never emit
   * `chainChanged` must not leave the console showing the old chain.
   */
  refreshWalletChain: () => Promise<number | null>;
  /**
   * Binds the connected wallet as the payer of a server quote BEFORE the wallet
   * is asked to sign anything. Resolves with the server-issued purchase id and
   * the payer wallet the backend actually recorded on it (never the client's
   * claim when the two differ).
   */
  bindPurchaseIntent: (quote: PSEMineQuote) => Promise<{
    success: boolean; purchaseId?: string; payerWallet?: string; error?: string;
  }>;
  tools: PSEMineToolDefinition[];
  ownerships: PSEMineToolOwnership[];
  purchases: PSEMinePurchase[];
  referrals: PSEMineReferral[];
  activities: PSEMineActivity[];
  payouts: PSEMinePayout[];
  activeQuote: PSEMineQuote | null;
  isRequestingQuote: boolean;
  requestQuote: (toolId: PSEToolTierId) => Promise<PSEMineQuote | null>;
  clearQuote: () => void;
  submitPurchaseTx: (purchaseId: string, txHash: string, senderWallet: string) => Promise<{
    success: boolean; error?: string; code?: string;
  }>;
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
  // Never render a remembered address as an active connection. A wallet is
  // connected only after its provider/session has been revalidated on this load.
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState<boolean>(false);
  const [ownerships, setOwnerships] = useState<PSEMineToolOwnership[]>([]);
  const [purchases, setPurchases] = useState<PSEMinePurchase[]>([]);
  const [referrals, setReferrals] = useState<PSEMineReferral[]>([]);
  const [activities, setActivities] = useState<PSEMineActivity[]>([]);
  const [payouts, setPayouts] = useState<PSEMinePayout[]>([]);
  const [activeQuote, setActiveQuote] = useState<PSEMineQuote | null>(null);
  const [isRequestingQuote, setIsRequestingQuote] = useState<boolean>(false);
  const [walletTransport, setWalletTransport] = useState<PseWalletTransport | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [injectedWallets, setInjectedWallets] = useState<PseInjectedWallet[]>([]);
  const [walletConnectAvailable, setWalletConnectAvailable] = useState<boolean>(isWalletConnectConfigured());
  const [walletRecoveryState, setWalletRecoveryState] = useState<'none' | 'resuming' | 'interrupted'>('none');
  const [walletCorrelationId, setWalletCorrelationId] = useState<string | null>(() => getWalletCorrelationId());

  const animFrameRef = useRef<number | null>(null);
  // The live EIP-1193 provider for the active connection. Held in a ref so the
  // payment path can use it without re-render churn; transport/name live in state.
  const providerRef = useRef<PseEip1193Provider | null>(null);
  const walletEventCleanupRef = useRef<(() => void) | null>(null);
  const transportRef = useRef<PseWalletTransport | null>(null);
  const walletNameRef = useRef<string | null>(null);
  // One WalletConnect attempt at a time: double taps and boot-restore must not
  // create competing pairings or let an old attempt clear the new one's state.
  const connectingRef = useRef<boolean>(false);
  const connectAttemptRef = useRef<number>(0);
  // READ, never depended on: the PulseEarn username is only used to label the
  // zeroed PSEmine user document when it is first created. Making it a listener
  // dependency re-subscribed every PSEmine listener on any profile rename.
  const usernameRef = useRef<string | undefined>(userData?.username);
  useEffect(() => { usernameRef.current = userData?.username; }, [userData?.username]);

  // Discover EIP-6963 injected wallets once (async announce window).
  useEffect(() => {
    let cancelled = false;
    discoverInjectedWallets().then(list => {
      if (!cancelled) setInjectedWallets(list);
    });
    return () => { cancelled = true; };
  }, []);

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
            // connectedWallet on the profile is a historical/last-used address,
            // not proof of a live provider approval. Never restore connection
            // state from Firestore; the wallet provider must prove it below.
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
  }, [pseUser, campaign]);  // 4. Web3 Wallet Connection — one architecture, two transports.
  //
  // • injected: window.ethereum / EIP-6963 wallets (MetaMask, Trust Browser,
  //   Binance Web3, any EIP-1193 dapp browser).
  // • walletConnect: WalletConnect v2 via Reown AppKit (mobile wallets from a
  //   normal browser, including Trust Wallet), enabled only when a Project ID
  //   is configured. Without it the transport is simply not offered.
  //
  // The active provider is normalised to one EIP-1193 surface with standard
  // account/chain events, so the rest of the app never branches on wallet type.
  // This layer requests transactions and reports state; it NEVER asserts
  // payment success — the backend owns verification.

  const persistWallet = useCallback((address: string | null, transport?: PseWalletTransport | null, name?: string | null) => {
    // Wallet sessions belong to one authenticated PulseEarn account. A single
    // origin-wide key let account B inherit account A's last wallet after sign-in.
    const uid = currentUser?.uid;
    if (!uid) return;
    const walletKey = `psemine_connected_wallet:${uid}`;
    const disconnectedKey = `psemine_wallet_user_disconnected:${uid}`;
    try {
      // Never migrate/read the old origin-wide key: it has no account binding.
      localStorage.removeItem('psemine_connected_wallet');
      localStorage.removeItem('psemine_wallet_user_disconnected');
      if (address) {
        localStorage.removeItem(disconnectedKey);
        localStorage.setItem(walletKey, JSON.stringify({
          uid, address, transport: transport ?? 'injected', walletName: name ?? 'Browser wallet',
        }));
      } else {
        localStorage.removeItem(walletKey);
        localStorage.setItem(disconnectedKey, '1');
      }
    } catch {
      /* storage unavailable — best effort */
    }
  }, [currentUser]);

  const subscribeActiveProvider = useCallback((connection: PseWalletConnection) => {
    walletEventCleanupRef.current?.();
    walletEventCleanupRef.current = null;
    providerRef.current = connection.provider;
    transportRef.current = connection.transport;
    setWalletTransport(connection.transport);
    setWalletName(connection.walletName);
    setWalletChainId(typeof connection.chainId === 'number' ? connection.chainId : null);
    const cleanup = subscribeWalletEvents(connection.provider, {
      onAccountsChanged: (accounts) => {
        if (!accounts || accounts.length === 0) {
          // Wallet locked/disconnected: clear local session; backend payout
          // destination is untouched (it is set explicitly on the wallet page).
          setConnectedWallet(null);
          persistWallet(null);
          providerRef.current = null;
          transportRef.current = null;
          setWalletTransport(null);
          setWalletName(null);
          setWalletChainId(null);
          walletEventCleanupRef.current?.();
          walletEventCleanupRef.current = null;
        } else {
          const next = accounts[0].toLowerCase();
          setConnectedWallet(next);
          persistWallet(next, transportRef.current, walletNameRef.current);
          if (currentUser) void PSEMineEngine.setConnectedWallet(next);
        }
      },
      onChainChanged: (chainIdHex) => {
        // State refresh: the purchase UI reads walletChainId for its state-aware
        // network warning. Payment itself stays gated by ensurePaymentChain();
        // a chain change alone never activates or cancels a purchase.
        setWalletChainId(parseChainId(chainIdHex));
      },
      onDisconnect: () => {
        setConnectedWallet(null);
        persistWallet(null);
        providerRef.current = null;
        transportRef.current = null;
        walletNameRef.current = null;
        setWalletTransport(null);
        setWalletName(null);
        setWalletChainId(null);
        walletEventCleanupRef.current?.();
        walletEventCleanupRef.current = null;
      },
    });
    walletEventCleanupRef.current = cleanup;
    return cleanup;
  }, [currentUser, persistWallet]);

  const adoptConnection = useCallback((connection: PseWalletConnection): string => {
    setConnectedWallet(connection.address);
    persistWallet(connection.address, connection.transport, connection.walletName);
    walletNameRef.current = connection.walletName;
    subscribeActiveProvider(connection);
    recordWalletStage('wallet_adopted', `transport=${connection.transport}`);
    return connection.address;
  }, [subscribeActiveProvider, persistWallet]);

  const connectInjectedWallet = useCallback(async (wallet?: PseInjectedWallet): Promise<string | null> => {
    // A fresh user action explicitly opts into a new wallet session, including
    // the case where the wallet app redirects/reloads this page mid-approval.
    try { if (currentUser?.uid) localStorage.removeItem(`psemine_wallet_user_disconnected:${currentUser.uid}`); } catch { /* storage unavailable */ }
    setIsConnectingWallet(true);
    try {
      const connection = await connectWithProvider(
        wallet?.provider ??
          (typeof window !== 'undefined'
            ? (window as unknown as { ethereum?: PseEip1193Provider }).ethereum ?? null
            : null) as PseEip1193Provider,
        'injected',
        wallet?.name ?? 'Browser wallet',
      );
      if (!connection) return null;
      const address = adoptConnection(connection);

      // Record server-side (payout destination is a separate, explicit write).
      if (currentUser) void PSEMineEngine.setConnectedWallet(address);

      toast.success(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`, { icon: '⚡' });
      return address;
    } catch (e) {
      if (isWalletRejection(e)) {
        toast('Connection cancelled in your wallet.', { icon: '🖐️' });
      } else {
        console.error('[PSEMineContext] Wallet connect error:', e);
        toast.error('Could not connect the wallet. Please try again.');
      }
      return null;
    } finally {
      setIsConnectingWallet(false);
    }
  }, [adoptConnection, currentUser]);

  const connectWalletConnectTransport = useCallback(async (resume = false): Promise<string | null> => {
    if (!isWalletConnectConfigured()) {
      toast.error('WalletConnect is not configured for this deployment.');
      return null;
    }
    // A second tap (or a boot restore racing the button) must not create a
    // competing pairing. The disabled button is UI; this is the guarantee.
    if (connectingRef.current) return null;
    connectingRef.current = true;
    const attempt = ++connectAttemptRef.current;
    // Clear the disconnect tombstone before the wallet-app handoff: the OS may
    // reload this page before the original connect promise can finish.
    try { if (currentUser?.uid) localStorage.removeItem(`psemine_wallet_user_disconnected:${currentUser.uid}`); } catch { /* storage unavailable */ }
    if (resume) ensureWalletTrace('walletconnect', readWalletConnectHandoff()?.id);
    else beginWalletTrace('walletconnect');
    recordWalletStage('connect_requested', resume ? 'resume' : 'fresh');
    setWalletCorrelationId(getWalletCorrelationId());
    setWalletRecoveryState(resume ? 'resuming' : 'none');
    setIsConnectingWallet(true);
    try {
      // Reown persists WalletConnect sessions at the origin level. Only reuse
      // one when this Firebase account has its own matching account-scoped
      // record; otherwise clear the old session before showing a fresh picker.
      let expectedBoundWallet: string | null = null;
      if (!resume) {
        try {
          const uid = currentUser?.uid;
          const raw = uid ? localStorage.getItem(`psemine_connected_wallet:${uid}`) : null;
          const saved = raw ? JSON.parse(raw) as { uid?: string; address?: string; transport?: PseWalletTransport } : null;
          if (uid && saved?.uid === uid && saved.transport === 'walletConnect'
              && typeof saved.address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(saved.address)) {
            expectedBoundWallet = saved.address.toLowerCase();
          }
        } catch { /* malformed local state is treated as no bound session */ }
        if (!expectedBoundWallet) await disconnectWalletConnect();
      }
      // Mobile wallet deep-links can immediately background/reload this tab.
      // Keep the user's explicit connection attempt alive for the full relay
      // window; a modal close is not evidence of approval or rejection.
      if (currentUser?.uid) localStorage.setItem('psemine_wc_handoff_uid', currentUser.uid);
      const provider = await connectWalletConnect({ resume, timeoutMs: 300_000 });
      // A cancelled or superseded attempt must not adopt a session that arrived
      // after the user stopped waiting (or started a newer attempt).
      if (connectAttemptRef.current !== attempt) return null;
      // The SESSION is the source of truth for the address and chain: a
      // UniversalProvider answers eth_accounts for its mutable default chain, so
      // eth_requestAccounts can look empty even with BSC approved.
      const connection = await connectWalletConnectProvider(provider);
      if (connectAttemptRef.current !== attempt) return null;
      if (connection && expectedBoundWallet && connection.address.toLowerCase() !== expectedBoundWallet) {
        await disconnectWalletConnect();
        persistWallet(null);
        setConnectedWallet(null);
        setWalletTransport(null);
        setWalletName(null);
        setWalletChainId(null);
        recordWalletStage('connect_failed', 'ACCOUNT_WALLET_BINDING_MISMATCH');
        toast.error('The restored wallet does not match this account’s saved wallet. Connect again and approve the correct wallet.');
        return null;
      }
      if (!connection) {
        recordWalletStage('connect_failed', 'no BSC account in session');
        toast.error('The wallet approved no account on BNB Smart Chain. Reopen the wallet picker and approve the session.');
        return null;
      }
      const address = adoptConnection(connection);
      localStorage.removeItem('psemine_wc_handoff_uid');
      setWalletRecoveryState('none');
      recordWalletStage('wallet_connected');
      if (currentUser) void PSEMineEngine.setConnectedWallet(address);
      toast.success(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`, { icon: '🔗' });
      return address;
    } catch (e) {
      if (e instanceof PseWalletConnectError && e.code === 'CANCELLED') {
        recordWalletStage('connect_cancelled');
        toast('Wallet connection cancelled.', { icon: '✋' });
      } else if (isWalletRejection(e)) {
        recordWalletStage('connect_rejected_in_wallet');
        toast('Connection cancelled in your wallet.', { icon: '🖐️' });
      } else if (e instanceof PseWalletConnectError) {
        recordWalletStage('connect_failed', e.code);
        console.error(`[PSEMineContext] WalletConnect failed (${e.code}):`, e.diagnostic || e.message);
        toast.error(e.message);
      } else {
        recordWalletStage('connect_failed', 'unexpected error');
        console.error('[PSEMineContext] WalletConnect error:', e);
        toast.error('Could not complete the wallet connection. Please retry.');
      }
      return null;
    } finally {
      // Only the newest attempt may clear the connecting state; an older waiter
      // that finally unwinds must not re-enable the UI during a new attempt.
      if (connectAttemptRef.current === attempt) {
        connectingRef.current = false;
        setIsConnectingWallet(false);
      }
    }
  }, [adoptConnection, currentUser]);

  /**
   * Stops a pending WalletConnect attempt. Without this the UI stayed disabled
   * for the full 5-minute relay window after a wallet-side cancellation.
   */
  const cancelWalletConnectTransport = useCallback(async (): Promise<void> => {
    connectAttemptRef.current += 1;
    connectingRef.current = false;
    await cancelWalletConnect();
    setWalletRecoveryState('none');
    setIsConnectingWallet(false);
  }, []);

  /**
   * Connection entry point. With a walletId, connects that specific EIP-6963
   * injected wallet; without one, prefers an injected wallet when present and
   * otherwise opens the WalletConnect flow (mobile browsers). Back-compat:
   * callers may still `await connectWallet()` with no argument.
   */
  const connectWallet = useCallback(async (walletId?: string): Promise<string | null> => {
    if (walletId) {
      const wallet = injectedWallets.find(w => w.id === walletId);
      if (!wallet) return null;
      return connectInjectedWallet(wallet);
    }
    if (injectedWallets.length > 0) return connectInjectedWallet(injectedWallets[0]);
    if (walletConnectAvailable) return connectWalletConnectTransport();
    toast.error('No wallet available. Install a Web3 wallet or open this page in your wallet\'s browser.');
    return null;
  }, [injectedWallets, walletConnectAvailable, connectInjectedWallet, connectWalletConnectTransport]);

  const disconnectWallet = useCallback(async (): Promise<void> => {
    walletEventCleanupRef.current?.();
    walletEventCleanupRef.current = null;
    if (transportRef.current === 'walletConnect') {
      await disconnectWalletConnect();
    }
    setConnectedWallet(null);
    persistWallet(null);
    providerRef.current = null;
    transportRef.current = null;
    setWalletTransport(null);
    setWalletName(null);
    clearWalletConnectHandoff();
    recordWalletStage('wallet_disconnected');
    setWalletRecoveryState('none');
    toast('Wallet disconnected', { icon: '🔌' });
  }, [persistWallet]);

  /** Fail-closed chain assertion through the ACTIVE provider (either transport). */
  const ensurePaymentChain = useCallback(async (chainId: number): Promise<boolean> => {
    const provider = providerRef.current;
    if (!provider) {
      recordWalletStage('chain_verification_failed', 'no active provider');
      return false;
    }
    recordWalletStage('chain_verification_started', String(chainId));
    const ok = await ensureChain(provider, chainId, transportRef.current ?? 'injected');
    recordWalletStage(ok ? 'chain_verified' : 'chain_verification_failed', String(chainId));
    return ok;
  }, []);

  /** Sends the payment through the active provider; returns the tx hash only. */
  const sendPayment = useCallback(async (tx: { from: string; to: string; value: string }): Promise<string> => {
    const provider = providerRef.current;
    if (!provider) throw new Error('No wallet is connected.');
    return sendPaymentTransaction(provider, tx, transportRef.current ?? 'injected');
  }, []);

  // Silent re-connect on session start: previously-authorised injected
  // accounts re-adopt automatically; per-account persistence means account B
  // never inherits account A's wallet. The stored key holds both address and
  // transport.
  //
  // WalletConnect restore (mobile return path): when the wallet app approves
  // the session it deep-links back and the OS reloads this page — the original
  // connect() promise dies with that page load. The reloaded page therefore
  // restores the approved session here WITHOUT reopening the modal; only when
  // no stored session exists is nothing done (explicit connect as before).
  useEffect(() => {
    let cancelled = false;
    // Clear any prior account's in-memory wallet before restoring this user's
    // account-scoped session. This prevents a stale provider/address surviving
    // sign-out or a fast account switch while the new restore is pending.
    walletEventCleanupRef.current?.();
    walletEventCleanupRef.current = null;
    providerRef.current = null;
    transportRef.current = null;
    setConnectedWallet(null);
    setWalletTransport(null);
    setWalletName(null);
    setWalletChainId(null);
    setIsConnectingWallet(false);
    recordWalletDocumentBoot();
    let handoff = readWalletConnectHandoff();
    const handoffOwnerUid = localStorage.getItem('psemine_wc_handoff_uid');
    if (handoff && handoffOwnerUid !== currentUser?.uid) {
      // A pending pairing belongs to the account that initiated it; never let
      // another signed-in account resume that old wallet session.
      clearWalletConnectHandoff(handoff.id);
      localStorage.removeItem('psemine_wc_handoff_uid');
      handoff = null;
    }
    if (handoff) {
      // Keep the SAME correlation id across the reload so support sees one
      // attempt, including the document_boot that interrupted it.
      ensureWalletTrace('walletconnect', handoff.id);
      setWalletCorrelationId(getWalletCorrelationId());
      recordWalletStage('handoff_found', `resumeAttempts=${handoff.resumeAttempts}`);
    }
    // An explicit disconnect is sticky across reloads. Reown may still have a
    // persisted pairing; do not silently adopt it against the user's choice.
    const walletUid = currentUser?.uid;
    if (!walletUid) return () => { cancelled = true; };
    const walletKey = `psemine_connected_wallet:${walletUid}`;
    const disconnectedKey = `psemine_wallet_user_disconnected:${walletUid}`;
    // Drop unscoped legacy values; they cannot safely identify the Firebase account.
    localStorage.removeItem('psemine_connected_wallet');
    localStorage.removeItem('psemine_wallet_user_disconnected');
    if (localStorage.getItem(disconnectedKey) === '1') {
      setConnectedWallet(null);
      setWalletTransport(null);
      setWalletName(null);
      setWalletChainId(null);
      return () => { cancelled = true; };
    }
    const raw = localStorage.getItem(walletKey);
    let stored: { uid?: string; address?: string; transport?: PseWalletTransport; walletName?: string } | null = null;
    try { stored = raw ? JSON.parse(raw) : null; } catch { stored = null; }
    if (stored?.uid !== walletUid) stored = null;
    const wantsWalletConnect = stored?.transport === 'walletConnect' || Boolean(handoff);

    // A first-time WalletConnect handoff returns by RELOADING this page, before
    // the original connect can persist its wallet record. Only a recent pairing
    // marker may trigger that restore: an ordinary visit must never load the
    // WalletConnect SDK, hold the UI in "connecting" for seconds, or surface an
    // SDK failure the user did not ask for.
    if (wantsWalletConnect && isWalletConnectConfigured()) {
      setWalletConnectAvailable(true);
      setIsConnectingWallet(true);
      void (async () => {
        // If settlement completed before the reload, AppKit restores it from
        // storage during init; give a reloaded handoff a little longer because
        // the relay may still be reconnecting on a mobile network.
        const bootAttempt = connectAttemptRef.current;
        const provider = await restoreWalletConnectSession(handoff ? 12_000 : 7_000);
        // An explicit Cancel during the boot restore must stop recovery: the
        // cancellation bumps the attempt, and the user's choice wins.
        if (cancelled || connectAttemptRef.current !== bootAttempt) return;
        if (provider) {
          const connection = await connectWalletConnectProvider(
            provider,
            stored?.walletName || 'WalletConnect wallet',
          );
          if (cancelled || !connection) return;
          adoptConnection(connection);
          localStorage.removeItem('psemine_wc_handoff_uid');
          if (handoff) clearWalletConnectHandoff(handoff.id);
          recordWalletStage('boot_session_adopted');
          setWalletRecoveryState('none');
          if (currentUser) void PSEMineEngine.setConnectedWallet(connection.address);
          return;
        }

        // No session in storage. A handoff that began in a PREVIOUS document
        // cannot settle its original pairing: WalletConnect keeps the pending
        // session only in memory, so the approval was lost with the old page.
        // Only a fresh pairing can finish it; never pretend it connected.
        if (handoff && isHandoffFromPreviousDocument(handoff)) {
          const decision = shouldResumeWalletConnectHandoff(handoff);
          recordWalletStage('handoff_interrupted', `decision=${decision}`);
          if (decision === 'resume') {
            setWalletRecoveryState('resuming');
            toast(
              'The wallet connection was interrupted when the browser restarted. No payment was submitted. Approve the connection once more to finish.',
              { icon: '🔁', duration: 9000 },
            );
            const resumeAttempt = connectAttemptRef.current;
            const address = await connectWalletConnectTransport(true);
            // Do not resurrect the interrupted notice after an explicit Cancel;
            // cancellation is itself a successful exit from recovery.
            if (!cancelled && !address && connectAttemptRef.current === resumeAttempt) {
              setWalletRecoveryState('interrupted');
            }
            return;
          }
          setWalletRecoveryState('interrupted');
        }
      })().catch((error) => {
        // A session the wallet has expired or revoked must not be retried on
        // every visit. Drop the remembered wallet; explicit connect still works.
        recordWalletStage(
          'boot_restore_failed',
          error instanceof PseWalletConnectError ? error.code : 'unexpected error',
        );
        if (error instanceof PseWalletConnectError &&
            (error.code === 'SESSION_EXPIRED' || error.code === 'SESSION_UNSUPPORTED')) {
          persistWallet(null);
        }
      })
        .finally(() => { if (!cancelled) setIsConnectingWallet(false); });
      return () => { cancelled = true; };
    }

    if (!stored?.address) return () => { cancelled = true; };
    // Restore the SAME authorised wallet, not blindly window.ethereum.
    // EIP-6963 browsers can expose several independent providers; the default
    // provider may be a different wallet and cannot report this payer's chain.
    void discoverInjectedWallets().then(async wallets => {
      const wanted = stored.address!.toLowerCase();
      for (const wallet of wallets) {
        const accounts = await silentInjectedAccounts(wallet.provider);
        const matched = accounts.find(account => account.toLowerCase() === wanted);
        if (!matched) continue;
        const chainId = await getChainId(wallet.provider);
        if (cancelled) return;
        adoptConnection({
          transport: 'injected',
          provider: wallet.provider,
          address: matched.toLowerCase(),
          chainId,
          walletName: wallet.name || stored.walletName || 'Browser wallet',
        });
        return;
      }
    }).catch(() => { /* restore is best-effort; explicit connect remains */ });
    return () => { cancelled = true; };
  }, [currentUser?.uid]);

  // 5. Quote Generation
  const requestQuote = useCallback(async (toolId: PSEToolTierId): Promise<PSEMineQuote | null> => {
    if (!currentUser) {
      toast.error('Please sign in to configure tool deployment');
      return null;
    }

    setIsRequestingQuote(true);
    try {
      const quote = await PSEMineEngine.generatePurchaseQuote(currentUser.uid, toolId);
      setActiveQuote(quote);
      return quote;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Failed to generate payment quote';
      toast.error(errMsg);
      return null;
    } finally {
      setIsRequestingQuote(false);
    }
  }, [currentUser]);

  const clearQuote = useCallback(() => {
    setActiveQuote(null);
  }, []);

  // 6. PAYER BINDING — the wallet is committed to the quote BEFORE it signs.
  //
  // The intent used to be created after the wallet returned a hash, which meant
  // a mid-flow wallet change silently became the payer of a purchase that was
  // quoted for another wallet. Binding first (server-side, against the
  // authenticated account) is what makes the on-chain sender check in
  // /api/mine/tools/verify-purchase meaningful: paymentWallet is fixed before
  // any signature exists, and no later request may rewrite it.
  const bindPurchaseIntent = useCallback(async (quote: PSEMineQuote): Promise<{
    success: boolean; purchaseId?: string; payerWallet?: string; error?: string;
  }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }
    if (!connectedWallet || !/^0x[0-9a-fA-F]{40}$/.test(connectedWallet)) {
      return { success: false, error: 'Connect a valid BNB Smart Chain wallet before creating this purchase.' };
    }

    try {
      const purchase = await PSEMineEngine.createPurchaseIntent(quote, connectedWallet);
      recordWalletStage('purchase_intent_bound');
      // The intent is now a PENDING purchase: the console resumes it from
      // /api/mine/state's pendingPurchases projection, so refresh immediately
      // rather than waiting for the tick.
      bumpStateEpoch();
      return {
        success: true,
        purchaseId: purchase.id,
        payerWallet: String(purchase.paymentWallet || connectedWallet).toLowerCase(),
      };
    } catch (e: unknown) {
      console.error('[PSEMineContext] bindPurchaseIntent error:', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Could not bind this purchase to your wallet.',
      };
    }
  }, [currentUser, connectedWallet, bumpStateEpoch]);

  // 7. Submit Purchase Transaction Hash (for an ALREADY BOUND purchase) —
  // the backend verifies sender/recipient/amount/chain/confirmations and is the
  // only thing that may activate the tool.
  const submitPurchaseTx = useCallback(async (
    purchaseId: string,
    txHash: string,
    senderWallet: string,
  ): Promise<{ success: boolean; error?: string; code?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }
    if (!purchaseId) {
      return { success: false, error: 'This purchase is not bound to a wallet yet. Start the purchase again.' };
    }

    try {
      recordWalletStage('backend_verification_started');
      const result = await PSEMineEngine.activateToolPurchase(purchaseId, txHash, senderWallet);
      recordWalletStage(
        result.success ? 'backend_verification_succeeded' : 'backend_verification_failed',
        result.success ? undefined : (result.code || result.error),
      );

      if (result.success) {
        toast.success('Payment verified — tool deployed!', { icon: '⛏️', duration: 6000 });
        setActiveQuote(null);
        // A deployed tool changes capacity and pending purchases immediately:
        // refresh the canonical state now instead of waiting for the tick.
        bumpStateEpoch();
      } else {
        toast.error(result.error || 'Payment verification failed');
      }

      return { success: result.success, error: result.error, code: result.code };
    } catch (e: unknown) {
      recordWalletStage('backend_verification_failed', 'request error');
      console.error('[PSEMineContext] submitPurchaseTx error:', e);
      const errMsg = e instanceof Error ? e.message : 'Purchase processing error';
      return { success: false, error: errMsg };
    }
  }, [currentUser, bumpStateEpoch]);

  // 7. Update Payout Wallet
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

  // Account switch guard: when the signed-in Firebase account changes, any
  // locally-held wallet session belongs to the PREVIOUS account. Backend-bound
  // paymentWallet values are untouched (the backend re-binds at intent creation
  // and rejects mismatches at verification), but the UI must not display or
  // offer account A's wallet while signed in as account B.
  const lastUidRef = useRef<string | null>(currentUser?.uid ?? null);
  useEffect(() => {
    const uid = currentUser?.uid ?? null;
    if (lastUidRef.current === uid) return;
    lastUidRef.current = uid;
    setConnectedWallet(null);
    persistWallet(null);
    providerRef.current = null;
    transportRef.current = null;
    walletNameRef.current = null;
    setWalletTransport(null);
    setWalletName(null);
    setWalletChainId(null);
  }, [currentUser, persistWallet]);

  /**
   * Re-read the active chain straight from the provider.
   *
   * A wallet is not obliged to emit `chainChanged` (WalletConnect sessions and
   * several extensions do not), so after an explicit switch the console would
   * keep showing the OLD chain and its wrong-network warning forever. The
   * switch confirms the chain itself instead of trusting an event.
   */
  const refreshWalletChain = useCallback(async (): Promise<number | null> => {
    const provider = providerRef.current;
    if (!provider) return null;
    // WalletConnect's eth_chainId is synthesized from the provider's mutable
    // default chain, so the approved session's BSC account is the authority when
    // one exists. Injected providers are always read live.
    if (transportRef.current === 'walletConnect') {
      const sessionChain = walletConnectChainId(provider);
      if (sessionChain !== null) {
        setWalletChainId(sessionChain);
        return sessionChain;
      }
    }
    const value = await getChainId(provider);
    setWalletChainId(value);
    return value;
  }, []);

  return (
    <PSEMineContext.Provider
      value={{
        campaign,
        pseUser,
        loading,
        liveAccruedGBP,
        connectedWallet,
        isConnectingWallet,
        walletTransport,
        walletName,
        walletChainId,
        injectedWallets,
        walletConnectAvailable,
        walletRecoveryState,
        walletCorrelationId,
        connectWallet,
        connectWalletConnectTransport,
        cancelWalletConnectTransport,
        disconnectWallet,
        sendPayment,
        ensurePaymentChain,
        refreshWalletChain,
        tools: toolsList,
        ownerships,
        purchases,
        referrals,
        activities,
        payouts,
        activeQuote,
        isRequestingQuote,
        requestQuote,
        clearQuote,
        bindPurchaseIntent,
        submitPurchaseTx,
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
