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
  connectWithProvider,
  connectWalletConnect,
  disconnectWalletConnect,
  discoverInjectedWallets,
  ensureChain,
  hasInjectedProvider,
  isWalletConnectConfigured,
  isWalletRejection,
  restoreWalletConnectSession,
  getChainId,
  sendPaymentTransaction,
  silentInjectedAccounts,
  subscribeWalletEvents,
} from '../engines/psemine/pseWallet';
import toast from 'react-hot-toast';

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
  connectWallet: (walletId?: string) => Promise<string | null>;
  connectWalletConnectTransport: () => Promise<string | null>;
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
  const [connectedWallet, setConnectedWallet] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem('psemine_connected_wallet');
      if (!raw) return null;
      const stored = JSON.parse(raw) as { address?: string };
      return stored?.address ?? null;
    } catch {
      return null;
    }
  });
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

  const animFrameRef = useRef<number | null>(null);
  // The live EIP-1193 provider for the active connection. Held in a ref so the
  // payment path can use it without re-render churn; transport/name live in state.
  const providerRef = useRef<PseEip1193Provider | null>(null);
  const transportRef = useRef<PseWalletTransport | null>(null);
  const walletNameRef = useRef<string | null>(null);
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
        unsub = onSnapshot(campRef, (snap) => {
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
            if (data.connectedWallet) {
              // Backend record is authoritative for the last used wallet; the
              // local per-account record stays in sync but never overrides a
              // newer local connection.
              setConnectedWallet(prev => prev || data.connectedWallet);
            }
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
    try {
      if (address) {
        // Per-account record: { address, transport, walletName }. A different
        // signed-in account must never inherit another account's wallet.
        localStorage.setItem('psemine_connected_wallet', JSON.stringify({
          address, transport: transport ?? 'injected', walletName: name ?? 'Browser wallet',
        }));
      } else {
        localStorage.removeItem('psemine_connected_wallet');
      }
    } catch {
      /* storage unavailable — best effort */
    }
  }, []);

  const subscribeActiveProvider = useCallback((connection: PseWalletConnection) => {
    providerRef.current = connection.provider;
    transportRef.current = connection.transport;
    setWalletTransport(connection.transport);
    setWalletName(connection.walletName);
    setWalletChainId(typeof connection.chainId === 'number' ? connection.chainId : null);
    return subscribeWalletEvents(connection.provider, {
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
        if (typeof chainIdHex !== 'string') { setWalletChainId(null); return; }
        try {
          const n = Number.parseInt(chainIdHex, chainIdHex.startsWith('0x') ? 16 : 10);
          setWalletChainId(Number.isFinite(n) ? n : null);
        } catch {
          setWalletChainId(null);
        }
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
      },
    });
  }, [currentUser, persistWallet]);

  const adoptConnection = useCallback((connection: PseWalletConnection): string => {
    setConnectedWallet(connection.address);
    persistWallet(connection.address, connection.transport, connection.walletName);
    walletNameRef.current = connection.walletName;
    subscribeActiveProvider(connection);
    return connection.address;
  }, [subscribeActiveProvider, persistWallet]);

  const connectInjectedWallet = useCallback(async (wallet?: PseInjectedWallet): Promise<string | null> => {
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

  const connectWalletConnectTransport = useCallback(async (): Promise<string | null> => {
    if (!isWalletConnectConfigured()) {
      toast.error('WalletConnect is not configured for this deployment.');
      return null;
    }
    setIsConnectingWallet(true);
    try {
      const provider = await connectWalletConnect();
      if (!provider) {
        toast('WalletConnect session was not completed.', { icon: '⏳' });
        return null;
      }
      const connection = await connectWithProvider(provider, 'walletConnect', 'WalletConnect wallet');
      if (!connection) return null;
      const address = adoptConnection(connection);
      if (currentUser) void PSEMineEngine.setConnectedWallet(address);
      toast.success(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`, { icon: '🔗' });
      return address;
    } catch (e) {
      if (isWalletRejection(e)) {
        toast('Connection cancelled in your wallet.', { icon: '🖐️' });
      } else {
        console.error('[PSEMineContext] WalletConnect error:', e);
        toast.error('Could not complete the WalletConnect session.');
      }
      return null;
    } finally {
      setIsConnectingWallet(false);
    }
  }, [adoptConnection, currentUser]);

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
    if (transportRef.current === 'walletConnect') {
      await disconnectWalletConnect();
    }
    setConnectedWallet(null);
    persistWallet(null);
    providerRef.current = null;
    transportRef.current = null;
    setWalletTransport(null);
    setWalletName(null);
    toast('Wallet disconnected', { icon: '🔌' });
  }, [persistWallet]);

  /** Fail-closed chain assertion through the ACTIVE provider (either transport). */
  const ensurePaymentChain = useCallback(async (chainId: number): Promise<boolean> => {
    const provider = providerRef.current;
    if (!provider) return false;
    return ensureChain(provider, chainId);
  }, []);

  /** Sends the payment through the active provider; returns the tx hash only. */
  const sendPayment = useCallback(async (tx: { from: string; to: string; value: string }): Promise<string> => {
    const provider = providerRef.current;
    if (!provider) throw new Error('No wallet is connected.');
    return sendPaymentTransaction(provider, tx);
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
    const raw = localStorage.getItem('psemine_connected_wallet');
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as { address?: string; transport?: PseWalletTransport; walletName?: string };
      if (!stored?.address) return;
      if (stored.transport === 'walletConnect') {
        setWalletConnectAvailable(isWalletConnectConfigured());
        if (!isWalletConnectConfigured()) return;
        void restoreWalletConnectSession().then(provider => {
          if (cancelled || !provider) return; // no session yet — explicit connect still works
          return connectWithProvider(provider, 'walletConnect', stored.walletName || 'WalletConnect wallet')
            .then(connection => {
              if (cancelled || !connection) return;
              adoptConnection(connection);
              if (currentUser) void PSEMineEngine.setConnectedWallet(connection.address);
            });
        }).catch(() => { /* restore is best-effort; explicit connect remains */ });
        return;
      }
      if (hasInjectedProvider()) {
        const provider = (window as unknown as { ethereum?: PseEip1193Provider }).ethereum as PseEip1193Provider;
        silentInjectedAccounts(provider).then(async accounts => {
          if (!accounts.includes(stored.address as string)) return;
          // Read the live chain too. The restore is silent (eth_accounts never
          // prompts) but it must not leave the console believing the network is
          // unknown: that would show the fail-closed "network unreadable" state
          // — with no switch action — to a wallet sitting on BNB Smart Chain.
          // eth_chainId is read-only and equally silent.
          const chainId = await getChainId(provider);
          if (cancelled) return;
          adoptConnection({
            transport: 'injected',
            provider,
            address: stored.address as string,
            chainId,
            walletName: stored.walletName || 'Browser wallet',
          });
        });
      }
    } catch {
      /* malformed stored state — ignore; explicit connect still works */
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const result = await PSEMineEngine.activateToolPurchase(purchaseId, txHash, senderWallet);

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

  // Calculate days remaining with full resilience against undefined or invalid date strings
  const campaignDaysRemaining = React.useMemo(() => {
    if (!campaign || !campaign.endAt) return 90;
    const endMs = new Date(campaign.endAt).getTime();
    if (isNaN(endMs)) return 90;
    const nowMs = Date.now();
    const diffMs = endMs - nowMs;
    const calculated = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return isNaN(calculated) ? 90 : Math.max(0, calculated);
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
    try {
      const hex = (await provider.request({ method: 'eth_chainId' })) as string;
      const n = typeof hex === 'string' ? Number.parseInt(hex, hex.startsWith('0x') ? 16 : 10) : NaN;
      const value = Number.isFinite(n) ? n : null;
      setWalletChainId(value);
      return value;
    } catch {
      setWalletChainId(null);
      return null;
    }
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
        connectWallet,
        connectWalletConnectTransport,
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
