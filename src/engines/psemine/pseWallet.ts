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
  request<T = unknown>(args: { method: string; params?: unknown[] | object }, chain?: string): Promise<T>;
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
/** BNB Smart Chain mainnet — the only chain PSEmine quotes, pays and verifies on. */
export const PSE_BSC_CHAIN_ID = 56;
export const PSE_BSC_CAIP2 = 'eip155:56';
const EIP6963_ANNOUNCE = 'eip6963:announceProvider';
const EIP6963_REQUEST = 'eip6963:requestProvider';

/* ─── WalletConnect handoff record ───
 * Kept in pseWalletHandoff.ts because the reload-recovery decision is a pure,
 * testable unit. Re-exported here so every wallet call site has one import.
 */
export {
  HANDOFF_RESUME_WINDOW_MS,
  HANDOFF_TTL_MS,
  clearWalletConnectHandoff,
  hasPendingWalletConnectHandoff,
  isHandoffFromPreviousDocument,
  markWalletConnectHandoff,
  readWalletConnectHandoff,
  shouldResumeWalletConnectHandoff,
  updateWalletConnectHandoff,
  type PseHandoffResumeDecision,
  type PseWalletHandoffRecord,
} from './pseWalletHandoff';
import {
  clearWalletConnectHandoff,
  markWalletConnectHandoff,
  readWalletConnectHandoff,
  updateWalletConnectHandoff,
} from './pseWalletHandoff';
import { recordWalletStage } from './pseWalletTrace';
export {
  beginWalletTrace,
  clearWalletTrace,
  ensureWalletTrace,
  formatWalletDiagnostics,
  getWalletCorrelationId,
  getWalletTrace,
  recordWalletDocumentBoot,
  recordWalletStage,
} from './pseWalletTrace';

/* ─── WalletConnect session validity ─── */

/** The subset of a WalletConnect session PSEmine is allowed to trust. */
export interface PseWalletSessionLike {
  expiry?: number;
  namespaces?: { eip155?: { accounts?: string[]; methods?: string[] } } | null;
}

/** A BSC account alone is not enough: the approved WC namespace must permit payment signing. */
export const walletConnectSessionCanSendTransactions = (
  session: PseWalletSessionLike | null | undefined,
): boolean => (session?.namespaces?.eip155?.methods ?? []).includes('eth_sendTransaction');

export type PseWalletSessionState = 'valid' | 'expired' | 'unsupported' | 'missing';

const CAIP10_EIP155 = /^eip155:(\d+):(0x[a-f0-9]{40})$/i;

/** Approved accounts on the campaign chain, lowercased and deduplicated. */
export const walletConnectSessionAccounts = (
  session: PseWalletSessionLike | null | undefined,
  chainId = PSE_BSC_CHAIN_ID,
): string[] => {
  const found = new Set<string>();
  for (const account of session?.namespaces?.eip155?.accounts ?? []) {
    const match = String(account).match(CAIP10_EIP155);
    if (!match || Number.parseInt(match[1], 10) !== chainId) continue;
    found.add(match[2].toLowerCase());
  }
  return [...found];
};

/**
 * A persisted WalletConnect session is NOT proof of a usable connection. It has
 * to exist, be unexpired, and include the campaign chain. A stale, expired,
 * revoked or foreign-chain pairing must never be shown as connected — sign-out
 * of the relay or expiry of a session cannot be allowed to look like a wallet.
 */
export const inspectWalletConnectSession = (
  session: PseWalletSessionLike | null | undefined,
  nowMs = Date.now(),
): PseWalletSessionState => {
  const approved = session?.namespaces?.eip155?.accounts ?? [];
  if (!approved.some(account => CAIP10_EIP155.test(String(account)))) return 'missing';
  const expiry = Number(session?.expiry);
  if (Number.isFinite(expiry) && expiry > 0 && expiry * 1000 <= nowMs) return 'expired';
  return walletConnectSessionAccounts(session).length > 0 ? 'valid' : 'unsupported';
};

/** BSC chain id from an approved session (null when BSC is not approved). */
export const walletConnectSessionChainId = (
  session: PseWalletSessionLike | null | undefined,
): number | null => (walletConnectSessionAccounts(session).length > 0 ? PSE_BSC_CHAIN_ID : null);

/* ─── WalletConnect (lazy: the SDK lives in its own chunk) ─── */

/** Minimal AppKit surface this module uses (structural, SDK-version agnostic). */
interface WcAppKitLike {
  open(): void | Promise<void>;
  close?(): void | Promise<void>;
  /** Resolves once AppKit's controllers and stored connection are ready. */
  ready?(): Promise<void>;
  disconnect(): void | Promise<void>;
  getAddress(chainNamespace?: string): string | undefined;
  getIsConnectedState(): boolean;
  getState(): { open?: boolean; loading?: boolean; activeChain?: string };
  subscribeState(cb: (s: { open?: boolean; loading?: boolean; activeChain?: string }) => void): () => void;
  /** Fires when AppKit syncs/replaces the active account (restore, approval). */
  subscribeAccount?(cb: (account?: { address?: string; isConnected?: boolean }) => void): () => void;
}

/** The adapter exposes Reown's UniversalProvider after a WalletConnect session is approved. */
interface WcUniversalProviderLike extends PseEip1193Provider {
  session?: PseWalletSessionLike | null;
}

/** Minimal Ethers-adapter surface: the WalletConnect universal provider. */
interface WcAdapterLike {
  getWalletConnectProvider(): unknown;
}

export type PseWalletConnectErrorCode =
  | 'NOT_CONFIGURED'
  | 'INITIALIZATION_FAILED'
  | 'CHUNK_LOAD_FAILED'
  | 'MODAL_OPEN_FAILED'
  | 'SESSION_TIMEOUT'
  | 'SESSION_EXPIRED'
  | 'SESSION_UNSUPPORTED'
  | 'CANCELLED';

export class PseWalletConnectError extends Error {
  readonly code: PseWalletConnectErrorCode;
  /** Safe, redacted provider diagnostic for developers/support — never shown raw. */
  readonly diagnostic?: string;
  constructor(code: PseWalletConnectErrorCode, message: string, diagnostic?: string) {
    super(message);
    this.name = 'PseWalletConnectError';
    this.code = code;
    this.diagnostic = diagnostic;
  }
}

const wcState: {
  available: boolean;
  appKit: WcAppKitLike | null;
  adapter: WcAdapterLike | null;
  openModal: (() => void) | null;
  disconnect: (() => Promise<void>) | null;
  /** Why the last initialisation failed (typed, not a generic message). */
  lastError: PseWalletConnectError | null;
  /** Why the last session wait ended without a provider: expired / foreign chain. */
  lastSessionProblem: 'expired' | 'unsupported' | null;
  /** True after the user explicitly cancelled the current attempt. */
  cancelled: boolean;
} = {
  available: false, appKit: null, adapter: null, openModal: null, disconnect: null,
  lastError: null, lastSessionProblem: null, cancelled: false,
};

/** In-flight initialisation guard (also makes a failed init retryable). */
let wcInitPromise: Promise<boolean> | null = null;

/**
 * Cancellation token. Incremented by cancelWalletConnectWait(); every waiter
 * captures the token at start and stops the moment it changes. This makes the
 * Cancel button effective without leaving a 5-minute orphaned promise that can
 * later overwrite a newer attempt's state.
 */
let wcWaitToken = 0;

/** Safe diagnostic text: provider messages only, addresses redacted, bounded. */
const redactedMessage = (error: unknown, fallback = 'No error message returned'): string => {
  const value = typeof error === 'object' && error !== null
    ? error as { code?: string | number; message?: string; shortMessage?: string; data?: { message?: string } }
    : {};
  return String(value.shortMessage || value.message || value.data?.message || fallback)
    .replace(/0x[a-f0-9]{40}/gi, '[address]')
    .replace(/\s+/g, ' ')
    .slice(0, 180);
};

export const WALLETCONNECT_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() || '';

export const isWalletConnectConfigured = (): boolean => WALLETCONNECT_PROJECT_ID.length > 0;

/**
 * A lazy SDK chunk can legitimately fail to load: a tab opened before a deploy
 * requests hashed chunks that no longer exist, or a mobile network drops the
 * fetch. That is an ASSET problem, not a wallet configuration problem, and it is
 * recoverable by loading the current document/asset map — so it gets its own
 * error code and its own recovery instead of being reported as a bad project id.
 */
export const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk [\w.-]+ failed/i.test(message);
};

const RELOAD_GUARD_KEY = 'psemine_asset_reload_at';

/** Reloads once (60 s guard) so this tab picks up the live deployment's assets. */
export const reloadOnceForStaleAssets = (now = Date.now()): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
    if (Number.isFinite(last) && last > 0 && now - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
  } catch {
    return false;
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_pse_reload', String(now));
    window.location.replace(url.toString());
    return true;
  } catch {
    return false;
  }
};

/** One retry covers the transient half of lazy-chunk failures. */
async function importWalletConnectSdk() {
  const load = () => Promise.all([
    import('@reown/appkit/react'),
    import('@reown/appkit-adapter-ethers'),
    import('@reown/appkit/networks'),
  ]);
  try {
    return await load();
  } catch (first) {
    if (!isChunkLoadError(first)) throw first;
    await new Promise(resolve => setTimeout(resolve, 250));
    return load();
  }
}

/**
 * Initialises AppKit + the Ethers adapter on first use. Called lazily from
 * connectWalletConnect()/restoreWalletConnectSession() so the WalletConnect
 * bundle is only fetched when a WalletConnect session is actually needed.
 *
 * A failed initialisation is retryable: the guard promise clears on failure so
 * the next user action re-attempts instead of permanently latching the
 * transport off. The typed reason is kept in wcState.lastError so the caller can
 * report chunk-load, configuration and SDK failures distinctly.
 */
function initWalletConnect(): Promise<boolean> {
  if (wcState.available && wcState.appKit) return Promise.resolve(true);
  if (!wcInitPromise) {
    wcInitPromise = doInitWalletConnect()
      .then(ready => {
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
  recordWalletStage('appkit_init_started');

  try {
    // Dynamic imports keep the AppKit/WalletConnect SDK out of the main chunk.
    const [{ createAppKit }, { EthersAdapter }, { bsc }] = await importWalletConnectSdk();

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

    // AppKit builds its controller tree asynchronously. Give it a bounded head
    // start so the wallet selector is not opened mid-initialisation; a slow or
    // blocked Reown config endpoint must not make WalletConnect unusable, so a
    // timeout or rejection is logged and the modal still opens.
    if (typeof appKit.ready === 'function') {
      try {
        await Promise.race([
          appKit.ready(),
          new Promise<void>(resolve => setTimeout(resolve, 8_000)),
        ]);
      } catch (error) {
        console.warn('[pseWallet] WalletConnect ready() rejected — continuing:', error);
      }
    }

    wcState.available = true;
    wcState.appKit = appKit;
    wcState.adapter = adapter;
    wcState.lastError = null;
    wcState.openModal = () => { void appKit.open(); };
    recordWalletStage('appkit_init_succeeded');
    wcState.disconnect = async () => {
      try { await appKit.disconnect(); } catch { /* already disconnected */ }
    };
    return true;
  } catch (e) {
    // AppKit/its chunk failed to initialise. Keep the original error in the
    // console, expose a typed reason, and never blame the user's configuration
    // for what is usually a stale tab or a dropped chunk fetch.
    const chunk = isChunkLoadError(e);
    wcState.lastError = new PseWalletConnectError(
      chunk ? 'CHUNK_LOAD_FAILED' : 'INITIALIZATION_FAILED',
      chunk
        ? 'PSEmine was updated while this page was open. Reload the page to connect a wallet.'
        : 'Wallet connection could not initialize on this page. Reload the page and try again.',
      redactedMessage(e),
    );
    recordWalletStage('appkit_init_failed', wcState.lastError.code);
    console.error('[pseWallet] WalletConnect unavailable:', e);
    return false;
  }
}

/* ─── Session waiter (generic; tested with fakes) ─── */

export type PseWalletWaitResult =
  | { state: 'provider'; provider: PseEip1193Provider }
  | { state: 'timeout' }
  | { state: 'cancelled' };

export interface PseWalletWaitOptions {
  timeoutMs: number;
  intervalMs?: number;
  /** Polled/checked on every wake; a true value resolves as cancelled. */
  isCancelled?: () => boolean;
  /** Periodic progress for UI/diagnostics; never used to decide the result. */
  onTick?: (elapsedMs: number) => void;
}

/**
 * Waits for an ALREADY-VALID wallet provider. check() is the sole authority:
 * a modal closing, an adapter object, a remembered address or a `ready()`
 * timeout never counts as approval. subscribe() is a wake-up hint only (AppKit
 * state/account events, visibility return); the poll and timeout remain the
 * safety net.
 */
export const awaitApprovedWallet = async (
  check: () => Promise<PseEip1193Provider | null>,
  subscribe: (wake: () => void) => () => void,
  opts: PseWalletWaitOptions,
): Promise<PseWalletWaitResult> => {
  const intervalMs = opts.intervalMs ?? 500;
  const startedAt = Date.now();
  const immediate = await check().catch(() => null);
  if (immediate) return { state: 'provider', provider: immediate };
  if (opts.isCancelled?.()) return { state: 'cancelled' };

  return new Promise(resolve => {
    let settled = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;
    const finish = (result: PseWalletWaitResult) => {
      if (settled) return;
      settled = true;
      if (poll !== null) clearInterval(poll);
      if (timeout !== null) clearTimeout(timeout);
      unsubscribe?.();
      resolve(result);
    };
    const evaluate = async () => {
      if (settled) return;
      if (opts.isCancelled?.()) return finish({ state: 'cancelled' });
      const provider = await check().catch(() => null);
      if (provider) return finish({ state: 'provider', provider });
      const elapsed = Date.now() - startedAt;
      opts.onTick?.(elapsed);
      if (elapsed >= opts.timeoutMs) finish({ state: 'timeout' });
    };
    poll = setInterval(() => { void evaluate(); }, intervalMs);
    timeout = setTimeout(() => finish({ state: 'timeout' }), opts.timeoutMs);
    try {
      unsubscribe = subscribe(() => { void evaluate(); });
    } catch { /* subscription unavailable — polling still works */ }
    void evaluate();
  });
};

/**
 * Resolves the active WalletConnect universal provider once a session exists.
 *
 * Only a session that EXISTS, is UNEXPIRED and includes BNB Smart Chain is an
 * approval. The relay can retain an expired pairing after a wallet revoked it;
 * adopting that would bind payments to a wallet that cannot sign them.
 *
 * Lifecycle: AppKit state/account events and the page becoming visible wake the
 * waiter immediately. On Android the document may be suspended while the wallet
 * app is open; when it resumes, the poll continues instead of relying on a
 * modal-close event that may never be delivered. The wait ends on a valid
 * provider, explicit cancellation, or `timeoutMs`.
 */
async function waitForWalletConnectProvider(timeoutMs: number): Promise<PseEip1193Provider | null> {
  const appKit = wcState.appKit;
  const adapter = wcState.adapter;
  if (!appKit || !adapter) return null;
  const token = wcWaitToken;
  let lastReported = '';
  const report = (stage: string, detail?: unknown) => {
    if (lastReported === stage) return;
    lastReported = stage;
    recordWalletStage(stage, detail);
  };

  const check = async (): Promise<PseEip1193Provider | null> => {
    try {
      const universal = adapter.getWalletConnectProvider() as WcUniversalProviderLike | null;
      if (!universal || typeof universal.request !== 'function') {
        report('session_missing');
        return null;
      }
      const sessionState = inspectWalletConnectSession(universal.session);
      if (sessionState === 'valid' && !walletConnectSessionCanSendTransactions(universal.session)) {
        // Old WalletConnect pairings may contain a BSC account but omit the
        // transaction method. They look connected, then the wallet rejects the
        // payment with "unknown method requested". Retire that unusable pairing
        // before opening a fresh proposal that includes eth_sendTransaction.
        wcState.lastSessionProblem = 'unsupported';
        report('session_payment_method_missing', 'eth_sendTransaction');
        void appKit.disconnect().catch(() => undefined);
        return null;
      }
      if (sessionState === 'expired' || sessionState === 'unsupported') {
        wcState.lastSessionProblem = sessionState;
        report(`session_${sessionState}`);
        return null;
      }
      if (sessionState === 'valid') {
        report('session_found', `bscAccounts=${walletConnectSessionAccounts(universal.session).length}`);
        return universal;
      }
      report('session_missing');
      return null;
    } catch (error) {
      report('session_probe_failed', redactedMessage(error));
      return null;
    }
  };

  const subscribe = (wake: () => void): (() => void) => {
    const cleanups: (() => void)[] = [];
    try {
      cleanups.push(appKit.subscribeState(state => { if (state?.open === false) wake(); }));
    } catch { /* state subscription unavailable */ }
    try {
      if (typeof appKit.subscribeAccount === 'function') cleanups.push(appKit.subscribeAccount(() => wake()));
    } catch { /* account subscription unavailable */ }
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        recordWalletStage('page_visible');
        recordWalletStage('return_detected');
        wake();
      } else {
        recordWalletStage('page_hidden');
      }
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    if (typeof window !== 'undefined') window.addEventListener('pageshow', onVisibility);
    return () => {
      cleanups.forEach(fn => { try { fn(); } catch { /* already gone */ } });
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
      if (typeof window !== 'undefined') window.removeEventListener('pageshow', onVisibility);
    };
  };

  const result = await awaitApprovedWallet(check, subscribe, {
    timeoutMs,
    intervalMs: 500,
    isCancelled: () => token !== wcWaitToken,
    onTick: elapsed => {
      if (elapsed >= 20_000) report('approval_still_pending', `${Math.round(elapsed / 1000)}s`);
    },
  });
  if (result.state === 'provider') {
    wcState.lastSessionProblem = null;
    return result.provider;
  }
  return null;
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
export const connectWalletConnect = async (opts?: { timeoutMs?: number; resume?: boolean }): Promise<PseEip1193Provider> => {
  if (!isWalletConnectConfigured()) {
    throw new PseWalletConnectError('NOT_CONFIGURED', 'WalletConnect is not configured for this deployment.');
  }
  wcState.cancelled = false;
  wcWaitToken += 1;
  recordWalletStage('connect_started', opts?.resume ? 'resume' : 'fresh');

  let ready = false;
  try {
    ready = await initWalletConnect();
  } catch (error) {
    console.error('[pseWallet] WalletConnect initialization threw:', error);
  }
  if (!ready || !wcState.appKit || !wcState.openModal) {
    const cause = wcState.lastError;
    // A stale tab is the most common cause of a lazy-SDK failure. Replace the
    // document once so it picks up the current deployment's asset map; the
    // typed reason is still thrown and logged for diagnostics.
    if (cause?.code === 'CHUNK_LOAD_FAILED') reloadOnceForStaleAssets();
    throw cause ?? new PseWalletConnectError(
      'INITIALIZATION_FAILED',
      'Wallet connection could not initialize on this page. Reload the page and try again.',
    );
  }

  // Adopt an existing approved session before opening a new pairing request.
  const restored = await waitForWalletConnectProvider(1_500);
  if (restored) {
    const handoff = readWalletConnectHandoff();
    if (handoff) clearWalletConnectHandoff(handoff.id);
    recordWalletStage('session_adopted_before_pairing');
    return restored;
  }
  if (wcState.cancelled) {
    recordWalletStage('connect_cancelled');
    throw new PseWalletConnectError('CANCELLED', 'Wallet connection cancelled.');
  }

  // Record the handoff BEFORE opening the wallet selector. Android may discard
  // this document while the wallet app is open; a reloaded document uses this
  // record to adopt a settled session or ask for ONE fresh approval. A resume
  // keeps the ORIGINAL id so resumeAttempts can never exceed one; it expires on
  // its own so a cancelled handoff cannot trigger an SDK load later.
  const existingHandoff = readWalletConnectHandoff();
  const handoff = markWalletConnectHandoff(
    Date.now(),
    undefined,
    opts?.resume && existingHandoff ? existingHandoff.id : undefined,
    Boolean(opts?.resume),
  );
  wcState.lastSessionProblem = null;
  recordWalletStage('handoff_started', `${handoff.id.slice(0, 8)} resume=${handoff.resumeAttempts}`);

  // AppKit.open() settles when the SELECTOR opens, not when a wallet approves.
  // Await it so modal/configuration failures are not silently discarded; the
  // provider wait below is the only approval signal.
  recordWalletStage('selector_open_requested');
  try {
    await wcState.appKit.open();
    recordWalletStage('selector_open_resolved');
  } catch (error) {
    // Some mobile wallets close the in-page AppKit sheet as soon as the OS
    // deep-link is launched. That close is a handoff, not a user rejection.
    // Continue waiting for the session; only a valid BSC session, explicit
    // cancellation, or the bounded timeout decides the outcome.
    recordWalletStage('selector_open_rejected', redactedMessage(error));
    console.warn('[pseWallet] AppKit selector closed during mobile handoff; awaiting wallet session:', redactedMessage(error));
  }

  const provider = await waitForWalletConnectProvider(opts?.timeoutMs ?? 300_000);
  if (!provider) {
    clearWalletConnectHandoff(handoff.id);
    if (wcState.cancelled) {
      recordWalletStage('connect_cancelled');
      throw new PseWalletConnectError('CANCELLED', 'Wallet connection cancelled.');
    }
    // Distinguish a session the wallet has rejected/expired or approved on the
    // wrong chain from a handoff that simply was not completed.
    if (wcState.lastSessionProblem === 'expired') {
      recordWalletStage('connect_failed', 'SESSION_EXPIRED');
      throw new PseWalletConnectError(
        'SESSION_EXPIRED',
        'The saved wallet session has expired. Reconnect to approve a new one.',
      );
    }
    if (wcState.lastSessionProblem === 'unsupported') {
      recordWalletStage('connect_failed', 'SESSION_UNSUPPORTED');
      throw new PseWalletConnectError(
        'SESSION_UNSUPPORTED',
        'This wallet session does not include BNB Smart Chain. Reconnect and approve BNB Smart Chain.',
      );
    }
    recordWalletStage('connect_failed', 'SESSION_TIMEOUT');
    throw new PseWalletConnectError(
      'SESSION_TIMEOUT',
      'No wallet approval was received. Return to PSEmine and try connecting again.',
    );
  }
  clearWalletConnectHandoff(handoff.id);
  recordWalletStage('provider_resolved');
  return provider;
};

/**
 * Stops the current wait and closes the selector. The waiting connect() call
 * resolves with a typed CANCELLED error, so the UI never stays in a connecting
 * state and a slow attempt cannot later overwrite a newer one.
 */
export const cancelWalletConnect = async (): Promise<void> => {
  wcWaitToken += 1;
  wcState.cancelled = true;
  recordWalletStage('connect_cancelled_by_user');
  try { await wcState.appKit?.close?.(); } catch { /* modal already closed */ }
  const handoff = readWalletConnectHandoff();
  if (handoff) updateWalletConnectHandoff({ stage: 'interrupted' });
  clearWalletConnectHandoff(handoff?.id);
};

/**
 * Turns an approved WalletConnect provider into a normalised connection.
 *
 * The session — not eth_requestAccounts — is the source of truth for the
 * address: UniversalProvider answers eth_accounts for its mutable DEFAULT chain,
 * so a session whose default chain drifted would otherwise look empty even
 * though BSC is approved. The address must come from the approved
 * eip155:56 account.
 */
export const connectWalletConnectProvider = async (
  provider: PseEip1193Provider,
  walletName = 'WalletConnect wallet',
): Promise<PseWalletConnection | null> => {
  const session = (provider as WcUniversalProviderLike).session;
  const state = inspectWalletConnectSession(session);
  if (state === 'expired') {
    throw new PseWalletConnectError('SESSION_EXPIRED', 'The saved wallet session has expired. Reconnect to approve a new one.');
  }
  if (state === 'unsupported') {
    throw new PseWalletConnectError(
      'SESSION_UNSUPPORTED',
      'This wallet session does not include BNB Smart Chain. Reconnect and approve BNB Smart Chain.',
    );
  }
  if (state !== 'valid') return null;

  // Do not send wallet_switchEthereumChain through WalletConnect. The approved
  // CAIP-10 session already proves BSC access, and every payment RPC is routed
  // explicitly to eip155:56. A switch request is an injected-wallet convention
  // that many mobile wallets do not implement over WalletConnect; sending it
  // here can open the wallet app without ever presenting the payment approval.
  const address = walletConnectSessionAccounts(session)[0];
  if (!address) return null;
  // The approved CAIP-10 account is authoritative for WalletConnect. Its
  // eth_chainId can reflect a stale mutable default chain after an Android
  // app handoff, even while eip155:56 is explicitly approved in the session.
  const chainId = walletConnectChainId(provider) ?? (await getChainId(provider));
  recordWalletStage('account_resolved', `chain=${chainId}`);
  return {
    transport: 'walletConnect',
    provider,
    address,
    chainId,
    walletName,
  };
};

/**
 * Silent session restore (boot path): adopts an approved WalletConnect session
 * from storage WITHOUT opening the modal. Returns null when there is nothing
 * to restore within `timeoutMs` — that is not an error, just no session.
 */
export const restoreWalletConnectSession = async (timeoutMs = 7_000): Promise<PseEip1193Provider | null> => {
  if (!isWalletConnectConfigured()) return null;
  recordWalletStage('restore_started', `${Math.round(timeoutMs / 1000)}s`);
  const ready = await initWalletConnect();
  if (!ready) {
    recordWalletStage('restore_failed', wcState.lastError?.code || 'INITIALIZATION_FAILED');
    return null;
  }
  const provider = await waitForWalletConnectProvider(timeoutMs);
  recordWalletStage(provider ? 'restore_session_found' : 'restore_session_missing');
  return provider;
};

export const disconnectWalletConnect = async (): Promise<void> => {
  wcWaitToken += 1;
  wcState.cancelled = true;
  const handoff = readWalletConnectHandoff();
  clearWalletConnectHandoff(handoff?.id);
  recordWalletStage('disconnect');
  try { await wcState.disconnect?.(); } catch { /* already disconnected */ }
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
 * Verifies the signing transport is authorised for the server-quoted chain.
 * Injected wallets are switched and re-read live. WalletConnect uses the
 * approved CAIP-10 session as its authority and routes the transaction with an
 * explicit CAIP-2 chain; it must not rely on or mutate the provider's default.
 */
export const ensureChain = async (
  provider: PseEip1193Provider,
  expectedChainId: number,
  transport: PseWalletTransport = 'injected',
): Promise<boolean> => {
  const expectedHex = `0x${expectedChainId.toString(16)}`;
  // WalletConnect's UniversalProvider resolves a request against a mutable
  // default chain unless a CAIP-2 chain is supplied. Network switching must be
  // addressed to the campaign chain explicitly, otherwise the wallet receives a
  // switch for whichever chain happened to be active when the session resumed.
  const caipChain = transport === 'walletConnect' ? `eip155:${expectedChainId}` : undefined;
  const request = <T>(args: { method: string; params?: unknown[] | object }) =>
    caipChain ? provider.request<T>(args, caipChain) : provider.request<T>(args);
  // WalletConnect's approved CAIP-10 namespace is the chain authority. The
  // UniversalProvider's eth_chainId may report a stale mutable default after
  // an Android wallet handoff; that does NOT mean the approved BSC session is
  // on the wrong network. Payment submission below is explicitly routed to
  // eip155:56. Do not send wallet_switchEthereumChain through WalletConnect:
  // many mobile wallets do not implement that injected-provider RPC, and a
  // failed switch prevented eth_sendTransaction from ever reaching approval.
  if (transport === 'walletConnect') {
    const session = (provider as WcUniversalProviderLike).session;
    const sessionChain = walletConnectSessionChainId(session);
    const approved = sessionChain === expectedChainId;
    recordWalletStage(approved ? 'chain_verified_from_session' : 'chain_not_approved_in_session', String(expectedChainId));
    return approved;
  }

  const current = await getChainId(provider);
  if (current === expectedChainId) {
    recordWalletStage('chain_verified', String(expectedChainId));
    return true;
  }

  recordWalletStage('chain_switch_requested', `from=${current ?? 'unknown'} to=${expectedChainId}`);
  try {
    await request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: expectedHex }],
    });
  } catch (e) {
    // 4902 = chain not registered in the wallet → offer to add it (BSC mainnet).
    const code = typeof e === 'object' && e !== null ? (e as { code?: number }).code : undefined;
    if (code === 4902) {
      try {
        await request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BSC_MAINNET_HEX,
            chainName: 'BNB Smart Chain Mainnet',
            nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
            rpcUrls: ['https://bsc-dataseed.binance.org/'],
            blockExplorerUrls: ['https://bscscan.com'],
          }],
        });
      } catch (error) {
        recordWalletStage('chain_switch_failed', `add-chain: ${redactedMessage(error)}`);
        return false;
      }
    } else {
      recordWalletStage('chain_switch_failed', redactedMessage(e));
      return false; // user refused the switch or the wallet cannot switch
    }
  }

  const rechecked = await getChainId(provider);
  recordWalletStage(rechecked === expectedChainId ? 'chain_verified' : 'chain_switch_failed', `after=${rechecked ?? 'unknown'}`);
  return rechecked === expectedChainId;
};

/** BSC chain id from a WalletConnect provider's approved session, if any. */
export const walletConnectChainId = (provider: PseEip1193Provider): number | null =>
  walletConnectSessionChainId((provider as WcUniversalProviderLike).session);

/**
 * Connects through the given transport and returns a normalised connection.
 * For injected wallets the specific provider comes from the caller (the
 * chosen EIP-6963 wallet, or window.ethereum fallback). WalletConnect callers
 * must use connectWalletConnectProvider() instead: a UniversalProvider's
 * eth_requestAccounts answers for its mutable default chain, not the session.
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
 * The wallet session disappeared between the quote and the send: the relay has
 * no matching key, its namespace is not configured, or the session record was
 * deleted. These errors are raised LOCALLY by WalletConnect before any request
 * reaches the wallet, so nothing can have been broadcast — a retry is safe and
 * the purchase must not be locked as an uncertain submission.
 */
export const PAYMENT_SESSION_UNAVAILABLE = 'PAYMENT_SESSION_UNAVAILABLE';

export const isPreDispatchWalletError = (error: unknown): boolean => {
  const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
  const message = [
    error instanceof Error ? error.message : String(error ?? ''),
    cause instanceof Error ? cause.message : '',
  ].join(' ');
  return /no matching key|session topic doesn't exist|please call connect\(\) before request|not configured\. please call connect|record was recently deleted/i.test(message);
};

export class PsePaymentSessionUnavailableError extends Error {
  readonly code = PAYMENT_SESSION_UNAVAILABLE;
  readonly diagnostic?: string;
  constructor(diagnostic?: string) {
    super('The wallet session is no longer available, so nothing was sent. Reconnect your wallet before trying again.');
    this.name = 'PsePaymentSessionUnavailableError';
    this.diagnostic = diagnostic;
  }
}

export const isSessionUnavailable = (e: unknown): boolean =>
  e instanceof PsePaymentSessionUnavailableError ||
  (typeof e === 'object' && e !== null &&
    (e as { code?: string }).code === PAYMENT_SESSION_UNAVAILABLE);

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
  const code = typeof error === 'object' && error !== null
    ? (error as { code?: string | number }).code
    : undefined;
  return `${method} | code: ${code === undefined ? 'none' : String(code)} | ${redactedMessage(error)}`;
};

export const sendPaymentTransaction = async (
  provider: PseEip1193Provider,
  tx: PsePaymentTx,
  transport: PseWalletTransport = 'injected',
): Promise<string> => {
  if (!provider || typeof provider.request !== 'function') {
    recordWalletStage('transaction_request_failed', 'no active provider');
    throw new Error('The active wallet provider is unavailable. Reconnect your wallet.');
  }
  recordWalletStage('transaction_request_started', `transport=${transport} chain=${transport === 'walletConnect' ? PSE_BSC_CAIP2 : 'wallet-default'}`);
  try {
    // Use the wallet-standard EIP-1193 call directly. ethers BrowserProvider
    // performs several optional node RPC probes before presenting approval;
    // some mobile wallet bridges reject those probes as unknown methods.
    const request = {
      method: 'eth_sendTransaction',
      params: [{ from: tx.from, to: tx.to, value: tx.value }],
    };
    // WalletConnect's UniversalProvider accepts an explicit CAIP-2 chain as
    // its second request argument. Do not rely on its mutable/default chain:
    // mobile handoffs can restore a session whose default is not the campaign
    // chain even though the approved session contains eip155:56. Injected
    // EIP-1193 providers keep the standard one-argument request shape.
    const hash = transport === 'walletConnect'
      ? await provider.request<string>(request, PSE_BSC_CAIP2)
      : await provider.request<string>(request);
    if (!isTxHash(hash)) {
      recordWalletStage('ambiguous_submission', 'wallet returned no valid transaction hash');
      throw new PsePaymentSubmissionUncertainError('eth_sendTransaction | wallet returned no valid transaction hash');
    }
    recordWalletStage('hash_received', 'wallet returned a transaction hash');
    return hash;
  } catch (e) {
    if (isWalletRejection(e)) {
      recordWalletStage('wallet_request_rejected', 'user rejected (4001)');
      throw e;
    }
    if (isSessionUnavailable(e)) {
      recordWalletStage('pre_dispatch_failure', 'wallet session unavailable');
      throw e;
    }
    if (isPreDispatchWalletError(e)) {
      // Proven local failure before dispatch: nothing reached the wallet, so a
      // later retry cannot double-pay. Do NOT mark the purchase uncertain.
      recordWalletStage('pre_dispatch_failure', 'session namespace/topic unavailable');
      throw new PsePaymentSessionUnavailableError(walletRpcDiagnostic(e, 'eth_sendTransaction'));
    }
    if (typeof e === 'object' && e !== null) {
      const err = e as { code?: number | string; message?: string; shortMessage?: string };
      const msg = [err.message, err.shortMessage].filter(Boolean).join(' ').toLowerCase();
      if (err.code === 4200 || err.code === -32601 || err.code === '4200' ||
          err.code === '-32601' || /unknown method|unsupported method|method not found/.test(msg)) {
        recordWalletStage('wallet_method_unsupported', walletRpcDiagnostic(e, 'eth_sendTransaction'));
        const unsupported = new Error('This wallet connection does not support the standard transaction request.');
        (unsupported as Error & { code?: string; diagnostic?: string }).code = 'PAYMENT_METHOD_UNSUPPORTED';
        (unsupported as Error & { diagnostic?: string }).diagnostic = walletRpcDiagnostic(e, 'eth_sendTransaction');
        throw unsupported;
      }
    }
    if (isSubmissionUncertain(e)) {
      recordWalletStage('ambiguous_submission', 'already classified uncertain');
      throw e;
    }
    // Once the standard submission request is invoked, any generic failure
    // could have happened after broadcast. Never issue another request. Preserve
    // a safe, redacted provider diagnostic so support can identify the exact
    // wallet RPC rejection instead of guessing from a generic uncertain state.
    recordWalletStage('ambiguous_submission', walletRpcDiagnostic(e, 'eth_sendTransaction'));
    throw new PsePaymentSubmissionUncertainError(walletRpcDiagnostic(e, 'eth_sendTransaction'));
  }
};
