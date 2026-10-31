/**
 * PSEmine wallet connection layer — one architecture, two transports.
 *
 * PSEmine's payment destination, amounts, quotes and verification are entirely
 * backend-authoritative (see api/index.py). This module only answers one
 * question: "give me a working EIP-1193 provider the user has approved", so the
 * app can request eth_sendTransaction with the SERVER-QUOTED recipient and
 * value. The wallet signs it; the user approves it in their wallet; the app
 * submits the returned hash to the backend which independently verifies the
 * chain transaction. This layer never asserts payment success.
 *
 * Transports:
 *   • injected  — window.ethereum (EIP-1193): MetaMask / Trust Browser /
 *                 Binance Web3 wallet / any injected provider. Wallets are
 *                 discovered via EIP-6963 where the wallet supports it, falling
 *                 back to window.ethereum.
 *   • walletConnect — WalletConnect v2 through Reown AppKit + its Ethers
 *                 adapter, enabled only when a Project ID is configured
 *                 (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID). Without it
 *                 the modal is simply not offered and the injected path keeps
 *                 working — missing configuration degrades gracefully rather
 *                 than breaking connection.
 *
 * Both transports are normalised to a single minimal interface (request + the
 * four standard events) so call sites never branch on the wallet type.
 */



/** Minimal EIP-1193 surface this app needs — injected and WalletConnect both conform. */
export interface PseEip1193Provider {
  request<T = unknown>(args: { method: string; params?: unknown[] | object }): Promise<T>;
  on?(event: string, listener: (...args: never[]) => void): void;
  removeListener?(event: string, listener: (...args: never[]) => void): void;
}

export type PseWalletTransport = 'injected' | 'walletConnect';

/** A discoverable injected wallet (EIP-6963 detail, or the fallback provider). */
export interface PseInjectedWallet {
  id: string;
  name: string;
  icon?: string;
  provider: PseEip1193Provider;
}

export interface PseChainInfo {
  chainId: number;
  network: string;
}

const BSC_MAINNET_HEX = '0x38';
const EIP6963_ANNOUNCE = 'eip6963:announceProvider';
const EIP6963_REQUEST = 'eip6963:requestProvider';

/* ─── WalletConnect (lazy: the SDK lives in its own chunk) ─── */

/** Minimal AppKit surface this module uses (structural, SDK-version agnostic). */
interface WcAppKitLike {
  open(): void | Promise<void>;
  disconnect(): void | Promise<void>;
  getAddress(chainNamespace?: string): string | undefined;
  getIsConnectedState(): boolean;
  getState(): { open?: boolean; loading?: boolean; activeChain?: string };
  subscribeState(cb: (s: { open?: boolean; loading?: boolean; activeChain?: string }) => void): () => void;
}

/** The adapter exposes Reown's UniversalProvider after a WalletConnect session is approved. */
interface WcUniversalProviderLike extends PseEip1193Provider {
  session?: {
    namespaces?: {
      eip155?: { accounts?: string[] };
    };
  } | null;
}

/** Minimal Ethers-adapter surface: the WalletConnect universal provider. */
interface WcAdapterLike {
  getWalletConnectProvider(): unknown;
}

export class PseWalletConnectError extends Error {
  readonly code: 'NOT_CONFIGURED' | 'INITIALIZATION_FAILED' | 'MODAL_OPEN_FAILED' | 'SESSION_TIMEOUT';
  constructor(code: PseWalletConnectError['code'], message: string) {
    super(message);
    this.name = 'PseWalletConnectError';
    this.code = code;
  }
}

const wcState: {
  available: boolean;
  appKit: WcAppKitLike | null;
  adapter: WcAdapterLike | null;
  openModal: (() => void) | null;
  disconnect: (() => Promise<void>) | null;
} = { available: false, appKit: null, adapter: null, openModal: null, disconnect: null };

/** In-flight initialisation guard (also makes a failed init retryable). */
let wcInitPromise: Promise<boolean> | null = null;

export const WALLETCONNECT_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() || '';

export const isWalletConnectConfigured = (): boolean => WALLETCONNECT_PROJECT_ID.length > 0;

/**
 * Initialises AppKit + the Ethers adapter on first use. Called lazily from
 * connectWalletConnect()/restoreWalletConnectSession() so the WalletConnect
 * bundle is only fetched when a WalletConnect session is actually needed.
 *
 * A failed initialisation (offline, bad project id) is retryable: the guard
 * promise clears on failure so the next user action re-attempts instead of
 * permanently latching the transport off.
 */
function initWalletConnect(): Promise<boolean> {
  if (wcState.available && wcState.appKit) return Promise.resolve(true);
  if (!wcInitPromise) {
    wcInitPromise = doInitWalletConnect()
      .then(ready => {
        // doInitWalletConnect deliberately converts SDK/import failures to
        // false; clear the cached promise here too, otherwise one transient
        // failure permanently disables WalletConnect until a full reload.
        if (!ready) wcInitPromise = null;
        return ready;
      })
      .catch(error => {
        wcInitPromise = null; // allow a retry on the next attempt
        console.error('[pseWallet] WalletConnect initialization failed:', error);
        return false;
      });
  }
  return wcInitPromise;
}

async function doInitWalletConnect(): Promise<boolean> {
  if (!isWalletConnectConfigured()) return false;

  try {
    // Dynamic imports keep the AppKit/WalletConnect SDK out of the main chunk.
    const { createAppKit } = await import('@reown/appkit/react');
    const { EthersAdapter } = await import('@reown/appkit-adapter-ethers');
    const { bsc } = await import('@reown/appkit/networks');

    const metadata = {
      name: 'PSEmine',
      description: 'PSEmine — 90-day mining campaign',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://pulseearn.online',
      // Must reference a real asset: wallets display it, and some wallet apps
      // use it when bookmarking the session. public/favicon.svg ships today.
      icons: [`${window.location.origin}/favicon.svg`],
    };

    const adapter = new EthersAdapter() as unknown as WcAdapterLike;
    const appKit = createAppKit({
      adapters: [adapter as never],
      networks: [bsc],
      defaultNetwork: bsc,
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata,
      features: { analytics: false },
    }) as unknown as WcAppKitLike;

    wcState.available = true;
    wcState.appKit = appKit;
    wcState.adapter = adapter;
    wcState.openModal = () => { void appKit.open(); };
    wcState.disconnect = async () => {
      try { await appKit.disconnect(); } catch { /* already disconnected */ }
    };
    return true;
  } catch (e) {
    // AppKit failed to initialise — degrade to injected-only rather than
    // blocking wallet connection entirely.
    console.warn('[pseWallet] WalletConnect unavailable:', e);
    return false;
  }
}

/**
 * Resolves the active WalletConnect universal provider once a session exists.
 *
 * Two resolution paths, in order:
 *   1. The adapter already exposes a provider with approved accounts — an
 *      APPROVED SESSION (fresh approval or one restored from WalletConnect
 *      storage after the wallet-app redirect reloaded the page).
 *   2. Event-driven wait: AppKit's public state reports the modal closing
 *      (which happens the moment the wallet approves and redirects); after
 *      that the provider is grabbed and verified. A light poll runs as a
 *      catch-all for wallets that never report a modal-close event.
 *
 * The wait ends after `timeoutMs` with null (user cancelled, or the handoff
 * never completed). The timeout must comfortably exceed a slow mobile handoff:
 * wallet open → user reads the prompt → approves → redirect back.
 */
async function waitForWalletConnectProvider(timeoutMs: number): Promise<PseEip1193Provider | null> {
  const appKit = wcState.appKit;
  const adapter = wcState.adapter;
  if (!appKit || !adapter) return null;

  const grabProvider = async (): Promise<PseEip1193Provider | null> => {
    try {
      const universal = adapter.getWalletConnectProvider() as WcUniversalProviderLike | null;
      if (!universal || typeof universal.request !== 'function') return null;

      // UniversalProvider's approved session is the strongest signal that the
      // wallet handoff completed. Read its CAIP-10 accounts first; some mobile
      // wallet bridges briefly return an empty eth_accounts during rehydration.
      const sessionAccounts = universal.session?.namespaces?.eip155?.accounts ?? [];
      const sessionHasAccount = sessionAccounts.some(account =>
        /^eip155:\d+:0x[a-f0-9]{40}$/i.test(account),
      );
      if (sessionHasAccount) return universal;

      // Fall back to the standard EIP-1193 request. Do not accept an adapter
      // instance merely because it exists: a live account is still required.
      const accounts = await universal.request({ method: 'eth_accounts' }) as string[];
      return Array.isArray(accounts) && accounts.some(account => /^0x[a-f0-9]{40}$/i.test(account))
        ? universal
        : null;
    } catch {
      // A provider can exist before its session is approved/rehydrated.
      return null;
    }
  };

  const immediate = await grabProvider();
  if (immediate) return immediate;

  return new Promise(resolve => {
    let settled = false;
    let poll = 0;
    let timer = 0;
    let unsubState: (() => void) | null = null;
    const finish = (v: PseEip1193Provider | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      clearTimeout(timer);
      unsubState?.();
      resolve(v);
    };

    timer = window.setTimeout(() => finish(null), timeoutMs);

    // Event path: modal closes ⇒ approval/redirect happened ⇒ verify provider.
    try {
      unsubState = appKit.subscribeState(state => {
        if (state?.open === false) void grabProvider().then(p => { if (p) finish(p); });
      });
    } catch { /* state subscription unavailable — poll covers it */ }

    // Catch-all poll (the event path can be missed on some wallet builds).
    poll = window.setInterval(() => { void grabProvider().then(p => { if (p) finish(p); }); }, 500);
  });
}

/**
 * Connects (or restores) a WalletConnect session and resolves the universal
 * provider once accounts exist.
 *
 * ORDER MATTERS: an already-approved session (previous handoff, page reload,
 * second tab) is adopted WITHOUT reopening the modal — this is exactly the
 * mobile return path: the wallet app approves, the OS reloads the browser tab,
 * and the reloaded page must silently re-adopt the approved session. Only when
 * no session exists is the modal opened and the wait begins.
 */
export const connectWalletConnect = async (opts?: { timeoutMs?: number }): Promise<PseEip1193Provider> => {
  if (!isWalletConnectConfigured()) {
    throw new PseWalletConnectError('NOT_CONFIGURED', 'WalletConnect is not configured for this deployment.');
  }

  let ready = false;
  try {
    ready = await initWalletConnect();
  } catch (error) {
    console.error('[pseWallet] WalletConnect initialization threw:', error);
  }
  if (!ready || !wcState.appKit || !wcState.openModal) {
    throw new PseWalletConnectError(
      'INITIALIZATION_FAILED',
      'Wallet connection could not initialize. Please retry; if it continues, the site wallet configuration needs attention.',
    );
  }

  // Adopt an existing approved session before opening a new pairing request.
  const restored = await waitForWalletConnectProvider(1_500);
  if (restored) return restored;

  // Open AppKit and await its result so modal/configuration failures are not
  // silently discarded. The provider poll remains active after this returns.
  try {
    await wcState.appKit.open();
  } catch (error) {
    console.error('[pseWallet] WalletConnect modal failed to open:', error);
    throw new PseWalletConnectError(
      'MODAL_OPEN_FAILED',
      'Wallet selection could not be opened. Check the connection and try again.',
    );
  }

  const provider = await waitForWalletConnectProvider(opts?.timeoutMs ?? 300_000);
  if (!provider) {
    throw new PseWalletConnectError(
      'SESSION_TIMEOUT',
      'No wallet approval was received. Return to PSEmine and try connecting again.',
    );
  }
  return provider;
};

/**
 * Silent session restore (boot path): adopts an approved WalletConnect session
 * from storage WITHOUT opening the modal. Returns null when there is nothing
 * to restore within `timeoutMs` — that is not an error, just no session.
 */
export const restoreWalletConnectSession = async (timeoutMs = 7_000): Promise<PseEip1193Provider | null> => {
  if (!isWalletConnectConfigured()) return null;
  const ready = await initWalletConnect();
  if (!ready) return null;
  return waitForWalletConnectProvider(timeoutMs);
};

export const disconnectWalletConnect = async (): Promise<void> => {
  if (wcState.disconnect) await wcState.disconnect();
};

/* ─── Injected wallet discovery (EIP-6963 + window.ethereum fallback) ─── */

interface Eip6963Detail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: PseEip1193Provider;
}

/**
 * Collects all announced EIP-6963 wallets plus the window.ethereum fallback.
 * Wallets announce asynchronously, so this listens for a beat (~250 ms) before
 * resolving. Callers get a stable list with no dependence on any specific
 * wallet brand.
 */
export const discoverInjectedWallets = (): Promise<PseInjectedWallet[]> =>
  new Promise(resolve => {
    const found = new Map<string, PseInjectedWallet>();
    const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: PseEip1193Provider }) : null;

    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963Detail>).detail;
      if (!detail?.info?.rdns || !detail.provider?.request) return;
      if (found.has(detail.info.rdns)) return;
      found.set(detail.info.rdns, {
        id: detail.info.rdns,
        name: detail.info.name,
        icon: detail.info.icon,
        provider: detail.provider,
      });
    };
    window.addEventListener(EIP6963_ANNOUNCE, onAnnounce);
    window.dispatchEvent(new Event(EIP6963_REQUEST));

    window.setTimeout(() => {
      window.removeEventListener(EIP6963_ANNOUNCE, onAnnounce);
      // Fallback for wallets that do not implement EIP-6963 (older Trust
      // Browser builds, some in-app dapp browsers): a single "Browser wallet"
      // entry bound to window.ethereum.
      // Keep window.ethereum as an additional provider even when EIP-6963
      // wallets announced: it may be a separate wallet with the remembered payer.
      if (win?.ethereum?.request && ![...found.values()].some(w => w.provider === win.ethereum)) {
        found.set('injected', { id: 'injected', name: 'Browser wallet', provider: win.ethereum });
      }
      resolve([...found.values()]);
    }, 250);
  });

/** Auto-connect support: did the user previously authorise this dapp? */
export const hasInjectedProvider = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { ethereum?: PseEip1193Provider }).ethereum);

export const silentInjectedAccounts = async (provider: PseEip1193Provider): Promise<string[]> => {
  try {
    const accounts = (await provider.request({ method: 'eth_accounts' })) as string[];
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
};

/* ─── Normalised connection + events ─── */

export interface PseWalletConnection {
  transport: PseWalletTransport;
  provider: PseEip1193Provider;
  address: string;
  chainId: number | null;
  /** Human wallet label (used for reconnect UX); never authoritative. */
  walletName: string;
}

export class PseWalletRejectedError extends Error {
  constructor() {
    super('Wallet request was rejected.');
    this.name = 'PseWalletRejectedError';
  }
}

export const isWalletRejection = (e: unknown): boolean =>
  e instanceof PseWalletRejectedError ||
  (typeof e === 'object' && e !== null && 'code' in e && (e as { code?: number }).code === 4001) ||
  (e instanceof Error && /user rejected|user denied|4001/i.test(e.message));

const normalizeAddress = (a: string): string => a.toLowerCase();

export const requestAccounts = async (provider: PseEip1193Provider): Promise<string[]> => {
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
  return Array.isArray(accounts) ? accounts.map(normalizeAddress) : [];
};

/**
 * Normalise chain identifiers returned by injected wallets and WalletConnect.
 * EIP-1193 specifies a hex quantity, but mobile bridges may expose decimal
 * numbers/strings or CAIP-2 ("eip155:56"). Never parse decimal "56" as hex 86.
 */
export const parseChainId = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value === 'bigint') {
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const caip = raw.match(/^eip155:(\d+)$/i);
  const candidate = caip?.[1] ?? raw;
  const parsed = /^0x[0-9a-f]+$/i.test(candidate)
    ? Number.parseInt(candidate.slice(2), 16)
    : /^\d+$/.test(candidate) ? Number.parseInt(candidate, 10) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const getChainId = async (provider: PseEip1193Provider): Promise<number | null> => {
  try {
    return parseChainId(await provider.request({ method: 'eth_chainId' }));
  } catch {
    return null;
  }
};

/**
 * Ensures the wallet sits on the given chain before anything is signed.
 * Fail-closed: a refused/unverifiable switch returns false and the caller must
 * NOT proceed to eth_sendTransaction (the backend verifier only reads BSC, so
 * a transaction on any other chain could never be verified).
 */
export const ensureChain = async (
  provider: PseEip1193Provider,
  expectedChainId: number,
): Promise<boolean> => {
  const expectedHex = `0x${expectedChainId.toString(16)}`;
  const current = await getChainId(provider);
  if (current === expectedChainId) return true;

  // WalletConnect sessions are chain-scoped (CAIP-10 accounts such as
  // eip155:56:0x...). Some mobile wallet bridges do not implement the
  // injected-wallet wallet_switchEthereumChain RPC. If eth_chainId is
  // temporarily unavailable but the approved WalletConnect session itself
  // explicitly contains the requested chain, trust that session binding
  // instead of sending an unsupported network-switch RPC to the wallet.
  // Never use this fallback when the provider reports a different chain.
  if (current === null) {
    const session = (provider as WcUniversalProviderLike).session;
    const accounts = session?.namespaces?.eip155?.accounts ?? [];
    const sessionMatchesExpected = accounts.some(account => {
      const match = account.match(/^eip155:(\d+):0x[a-f0-9]{40}$/i);
      return Boolean(match && Number.parseInt(match[1], 10) === expectedChainId);
    });
    if (sessionMatchesExpected) return true;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: expectedHex }],
    });
  } catch (e) {
    // 4902 = chain not registered in the wallet → offer to add it (BSC mainnet).
    const code = typeof e === 'object' && e !== null ? (e as { code?: number }).code : undefined;
    if (code === 4902) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BSC_MAINNET_HEX,
            chainName: 'BNB Smart Chain Mainnet',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com'],
          }],
        });
      } catch {
        return false;
      }
    } else {
      return false; // user refused the switch or the wallet cannot switch
    }
  }

  const rechecked = await getChainId(provider);
  return rechecked === expectedChainId;
};

/**
 * Connects through the given transport and returns a normalised connection.
 * For injected wallets the specific provider comes from the caller (the
 * chosen EIP-6963 wallet, or window.ethereum fallback).
 */
export const connectWithProvider = async (
  provider: PseEip1193Provider,
  transport: PseWalletTransport,
  walletName: string,
): Promise<PseWalletConnection | null> => {
  let accounts: string[];
  try {
    accounts = await requestAccounts(provider);
  } catch (e) {
    if (isWalletRejection(e)) throw new PseWalletRejectedError();
    throw e;
  }
  if (!accounts.length) return null;
  return {
    transport,
    provider,
    address: accounts[0],
    chainId: await getChainId(provider),
    walletName,
  };
};

/**
 * Subscribes to standard wallet events on the active provider. Returns an
 * unsubscribe fn. Events drive PSEMineContext state; they never change
 * backend-bound values (a payer change surfaces as WALLET_MISMATCH at the
 * backend, by design).
 */
export const subscribeWalletEvents = (
  provider: PseEip1193Provider,
  handlers: {
    onAccountsChanged?: (accounts: string[]) => void;
    onChainChanged?: (chainIdHex: string) => void;
    onDisconnect?: () => void;
  },
): (() => void) => {
  if (!provider.on || !provider.removeListener) return () => undefined;
  const wrap = (fn?: (...args: never[]) => void) => (fn ?? (() => undefined)) as never;
  const onAcc = wrap(accounts => handlers.onAccountsChanged?.(accounts as unknown as string[]));
  const onChain = wrap(chainId => handlers.onChainChanged?.(chainId as unknown as string));
  const onDisc = wrap(() => handlers.onDisconnect?.());
  provider.on('accountsChanged', onAcc);
  provider.on('chainChanged', onChain);
  provider.on('disconnect', onDisc);
  return () => {
    provider.removeListener!('accountsChanged', onAcc as never);
    provider.removeListener!('chainChanged', onChain as never);
    provider.removeListener!('disconnect', onDisc as never);
  };
};

export interface PsePaymentTx {
  from: string;
  to: string;
  /** Exact wei amount, taken verbatim from the server quote. */
  value: string;
}

/* ─── Payment submission state machine ───
 *
 * A payment is not a boolean. Between "the user tapped Pay" and "the tool is
 * activated" the transaction passes through states that demand different
 * behaviour, and the one that matters most is UNKNOWN_SUBMISSION_STATE: the
 * wallet returned an error but we cannot tell whether it broadcast first.
 *
 * NOT_SUBMITTED           → nothing has been sent; a retry is safe.
 * SUBMISSION_IN_PROGRESS  → a send is with the wallet; never start another.
 * SUBMITTED               → the wallet returned a transaction hash.
 * UNKNOWN_SUBMISSION_STATE→ a send failed ambiguously; NEVER auto-retry.
 * CONFIRMING              → the chain has it but confirmations are pending.
 * VERIFIED                → the backend verified it and activated the tool.
 *
 * Only the backend ever moves a payment to VERIFIED; nothing in the wallet
 * layer may assert success.
 */
export type PsePaymentSubmissionState =
  | 'NOT_SUBMITTED'
  | 'SUBMISSION_IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNKNOWN_SUBMISSION_STATE'
  | 'CONFIRMING'
  | 'VERIFIED';

export const PAYMENT_SUBMISSION_UNCERTAIN = 'PAYMENT_SUBMISSION_UNCERTAIN';

/**
 * Thrown when a send attempt failed in a way that leaves the broadcast status
 * unknown (see UNKNOWN_SUBMISSION_STATE). The caller must NOT send again: it
 * must report the uncertain state and let the user establish, from their own
 * wallet or a block explorer, whether a transaction exists.
 */
export class PsePaymentSubmissionUncertainError extends Error {
  readonly code = PAYMENT_SUBMISSION_UNCERTAIN;
  readonly submissionState: PsePaymentSubmissionState = 'UNKNOWN_SUBMISSION_STATE';
  readonly diagnostic?: string;

  constructor(diagnostic?: string) {
    super(
      'The wallet did not report whether the payment was broadcast. ' +
      'No second attempt was made — check your wallet activity before retrying.',
    );
    this.name = 'PsePaymentSubmissionUncertainError';
    this.diagnostic = diagnostic;
  }
}

export const isSubmissionUncertain = (e: unknown): boolean =>
  e instanceof PsePaymentSubmissionUncertainError ||
  (typeof e === 'object' && e !== null &&
    (e as { code?: string }).code === PAYMENT_SUBMISSION_UNCERTAIN);

/**
 * Whether a payment in this state may be attempted again. Deliberately true
 * for NOT_SUBMITTED only — an unknown submission is resolved by the user
 * (wallet activity / explorer / support recovery), never by an automatic or
 * casual resend.
 */
export const canRetryPayment = (state: PsePaymentSubmissionState): boolean =>
  state === 'NOT_SUBMITTED';

/* ─── Payer binding guard ─── */

export interface PsePayerCheck {
  ok: boolean;
  code?: 'WALLET_MISMATCH' | 'PAYER_NOT_BOUND';
  payer?: string;
}

/**
 * Pre-send guard: the wallet that signs must be the payer the purchase record
 * is bound to. The backend enforces this authoritatively against the on-chain
 * sender; this keeps the UI from asking wallet B to fund a purchase that is
 * attributed to wallet A in the first place (and from surfacing a paid-but-
 * rejected result afterwards).
 */
export const resolvePaymentPayer = (
  boundPayer: string | null | undefined,
  connectedWallet: string | null | undefined,
): PsePayerCheck => {
  const bound = String(boundPayer ?? '').trim().toLowerCase();
  const connected = String(connectedWallet ?? '').trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(bound)) return { ok: false, code: 'PAYER_NOT_BOUND' };
  if (!/^0x[0-9a-f]{40}$/.test(connected) || connected !== bound) {
    return { ok: false, code: 'WALLET_MISMATCH' };
  }
  return { ok: true, payer: bound };
};

const isTxHash = (value: unknown): value is string =>
  typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);

/**
 * Sends the payment transaction — AT MOST ONE broadcast attempt per call.
 *
 * THE RULE
 * --------
 * The fallback to raw eth_sendTransaction may run ONLY when it is PROVEN that
 * no send was ever requested from the wallet. That proof is not inferred from an
 * error shape or from which ethers call failed; it is recorded directly: every
 * request goes through a thin wrapper that notes when eth_sendTransaction is
 * reached. So:
 *
 *   • ethers throws and NO send was requested → the transaction was never
 *     broadcast (ethers died while BUILDING it: chain/nonce/fee/gas probing,
 *     which is exactly what minimal in-app dapp browsers lack). One raw attempt
 *     is safe, so it is made — once.
 *   • ethers throws and a send WAS requested → the wallet may already have
 *     broadcast. This is UNKNOWN_SUBMISSION_STATE: raise
 *     PsePaymentSubmissionUncertainError and STOP. No retry, no second method.
 *   • ethers returns a hash → hand it back immediately. Nothing else is ever
 *     called afterwards.
 *   • A user rejection (4001) at any point is final and never retried.
 *
 * The previous shape retried through the raw method after ANY non-rejection
 * error, which could pay twice when the first attempt had already been
 * broadcast; the shape before that could not distinguish the two cases at all.
 * A returned hash always ends the flow: the backend is the only verifier of
 * recipient/sender/amount/chain/confirmations.
 */
const walletRpcDiagnostic = (error: unknown, method: string): string => {
  const value = typeof error === 'object' && error !== null
    ? error as { code?: string | number; message?: string; shortMessage?: string; data?: { message?: string } }
    : {};
  const code = value.code === undefined ? 'none' : String(value.code);
  const message = String(value.shortMessage || value.message || value.data?.message || 'No wallet error message returned')
    .replace(/0x[a-f0-9]{40}/gi, '[address]')
    .replace(/\\s+/g, ' ')
    .slice(0, 180);
  return `${method} | code: ${code} | ${message}`;
};

export const sendPaymentTransaction = async (
  provider: PseEip1193Provider,
  tx: PsePaymentTx,
): Promise<string> => {
  if (!provider || typeof provider.request !== 'function') {
    throw new Error('The active wallet provider is unavailable. Reconnect your wallet.');
  }
  try {
    // Use the wallet-standard EIP-1193 call directly. ethers BrowserProvider
    // performs several optional node RPC probes before presenting approval;
    // some mobile wallet bridges reject those probes as unknown methods.
    const hash = await provider.request<string>({
      method: 'eth_sendTransaction',
      params: [{ from: tx.from, to: tx.to, value: tx.value }],
    });
    if (!isTxHash(hash)) throw new PsePaymentSubmissionUncertainError('eth_sendTransaction | wallet returned no valid transaction hash');
    return hash;
  } catch (e) {
    if (isWalletRejection(e)) throw e;
    if (typeof e === 'object' && e !== null) {
      const err = e as { code?: number | string; message?: string; shortMessage?: string };
      const msg = [err.message, err.shortMessage].filter(Boolean).join(' ').toLowerCase();
      if (err.code === 4200 || err.code === -32601 || err.code === '4200' ||
          err.code === '-32601' || /unknown method|unsupported method|method not found/.test(msg)) {
        const unsupported = new Error('This wallet connection does not support the standard transaction request.');
        (unsupported as Error & { code?: string; diagnostic?: string }).code = 'PAYMENT_METHOD_UNSUPPORTED';
        (unsupported as Error & { diagnostic?: string }).diagnostic = walletRpcDiagnostic(e, 'eth_sendTransaction');
        throw unsupported;
      }
    }
    if (isSubmissionUncertain(e)) throw e;
    // Once the standard submission request is invoked, any generic failure
    // could have happened after broadcast. Never issue another request. Preserve
    // a safe, redacted provider diagnostic so support can identify the exact
    // wallet RPC rejection instead of guessing from a generic uncertain state.
    throw new PsePaymentSubmissionUncertainError(walletRpcDiagnostic(e, 'eth_sendTransaction'));
  }
};
