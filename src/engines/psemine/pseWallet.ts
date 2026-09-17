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

const wcState: {
  attempted: boolean;
  available: boolean;
  openModal: (() => void) | null;
  getProvider: (() => Promise<PseEip1193Provider | null>) | null;
  disconnect: (() => Promise<void>) | null;
} = { attempted: false, available: false, openModal: null, getProvider: null, disconnect: null };

export const WALLETCONNECT_PROJECT_ID = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() || '';

export const isWalletConnectConfigured = (): boolean => WALLETCONNECT_PROJECT_ID.length > 0;

/**
 * Initialises AppKit + the Ethers adapter on first use. Called lazily from
 * connectWalletConnect() so the WalletConnect bundle is only fetched when the
 * user actually chooses a WalletConnect-compatible wallet.
 *
 * The EthersAdapter's connect() resolves once a wallet has approved the
 * session; its universal provider is a full EIP-1193 provider, so it is
 * normalised through the same interface as injected wallets.
 */
async function initWalletConnect(): Promise<boolean> {
  if (wcState.attempted) return wcState.available;
  wcState.attempted = true;
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
      icons: [`${window.location.origin}/logo.png`],
    };

    const adapter = new EthersAdapter();
    const appKit = createAppKit({
      adapters: [adapter],
      networks: [bsc],
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata,
      features: { analytics: false },
    });

    wcState.available = true;
    wcState.openModal = () => { void appKit.open(); };
    wcState.getProvider = async () => {
      // Wait until the adapter reports a connected wallet (or a short timeout —
      // the user may close the modal without connecting).
      const deadline = Date.now() + 240_000; // WalletConnect sessions may need a QR scan
      while (Date.now() < deadline) {
        const universal = adapter.getWalletConnectProvider() as PseEip1193Provider | null;
        if (universal) {
          try {
            const accounts = (await universal.request({ method: 'eth_accounts' })) as string[];
            if (accounts && accounts.length > 0) return universal;
          } catch {
            /* provider present but not usable yet — keep waiting */
          }
        }
        await new Promise(r => setTimeout(r, 500));
      }
      return null;
    };
    wcState.disconnect = async () => {
      try { await appKit.disconnect(); } catch { /* already disconnected */ }
    };
    return true;
  } catch (e) {
    // AppKit failed to initialise (bad project id, network, etc.) — degrade to
    // injected-only rather than blocking wallet connection entirely.
    console.warn('[pseWallet] WalletConnect unavailable:', e);
    return false;
  }
}

export const connectWalletConnect = async (): Promise<PseEip1193Provider | null> => {
  const ready = await initWalletConnect();
  if (!ready || !wcState.openModal || !wcState.getProvider) return null;
  wcState.openModal();
  return wcState.getProvider();
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
      if (found.size === 0 && win?.ethereum?.request) {
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

export const getChainId = async (provider: PseEip1193Provider): Promise<number | null> => {
  try {
    const hex = (await provider.request({ method: 'eth_chainId' })) as string;
    return typeof hex === 'string' ? parseInt(hex, 16) : null;
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

/**
 * Sends the payment transaction through an ethers v6 BrowserProvider over any
 * conforming EIP-1193 provider, so WalletConnect and injected wallets share
 * one code path. Resolves with the transaction hash once the wallet has signed
 * and broadcast. Nothing here interprets the hash — the backend owns
 * verification (recipient/sender/amount/chain/confirmations).
 *
 * Fallback: ethers probes auxiliary RPC methods (eth_blockNumber, …) that some
 * minimal in-app dapp browsers do not implement. If the ethers path fails
 * BEFORE the wallet shows an approval (any error that is not a 4001
 * rejection), the raw EIP-1193 eth_sendTransaction is used instead — the one
 * method every conforming wallet implements. A user rejection is always
 * final and never retried through the fallback.
 */
export const sendPaymentTransaction = async (
  provider: PseEip1193Provider,
  tx: PsePaymentTx,
): Promise<string> => {
  try {
    const { BrowserProvider } = await import('ethers');
    // EIP-1193 providers conform to ethers' Eip1193RequestFn; the structural cast
    // keeps this module free of a static ethers type dependency.
    const web3Provider = new BrowserProvider(provider as unknown as ConstructorParameters<typeof BrowserProvider>[0]);
    const signer = await web3Provider.getSigner();
    const response = await signer.sendTransaction({ from: tx.from, to: tx.to, value: tx.value });
    return response.hash;
  } catch (e) {
    if (isWalletRejection(e)) throw e; // user said no — done, no fallback.
    const hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{ from: tx.from, to: tx.to, value: tx.value }],
    });
    if (typeof hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
      throw new Error('The wallet did not return a valid transaction hash.');
    }
    return hash;
  }
};
