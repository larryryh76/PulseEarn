import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConnection, useTrustModal, useConnect } from '@trustwallet/connect-react';
import { useSendTransaction } from '@trustwallet/connect-eip155-react';
import { bsc } from 'viem/chains';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';

export const BSC_CHAIN_ID = 56;
export const BSC_CHAIN_ID_HEX = '0x38';
export const PSE_PAYMENT_ADDRESS = '0xAE909dDcf7e38F7Ed866c17D7245b36E8077dc77';

interface Eip1193RequestArguments {
  method: string;
  params?: readonly unknown[] | object;
}

type Eip1193EventHandler = (...args: unknown[]) => void;

interface Eip1193Provider {
  request<T = unknown>(args: Eip1193RequestArguments): Promise<T>;
  on(event: string, handler: Eip1193EventHandler): void;
  removeListener(event: string, handler: Eip1193EventHandler): void;
}

type Eip1193RequestProvider = Pick<Eip1193Provider, 'request'>;

interface TrustConnectProvider {
  request<T = unknown>(args: {
    request: Eip1193RequestArguments;
    chainId: `eip155:${number}`;
  }): Promise<T>;
}

interface TrustConnectChain {
  reference?: string | number;
  id?: string | number;
}

declare global {
  interface Window {
    opera?: string;
  }
}

const parseChainId = (value: unknown): number | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const errorCode = (error: unknown): number | string | undefined => {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = error.code;
  return typeof code === 'number' || typeof code === 'string' ? code : undefined;
};

export const isInAppWebView = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !navigator.userAgent) return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const inAppRegex = /(Telegram|Discord|Instagram|FBAN|FBAV|Twitter|Line|Kakaotalk|Snapchat|MicroMessenger|TikTok)/i;
  const isAndroidWebView = /Android/i.test(ua) && /wv/i.test(ua);
  const isIosWebView = /(iPhone|iPod|iPad)/i.test(ua) && !/Safari/i.test(ua) && /AppleWebKit/i.test(ua);
  return inAppRegex.test(ua) || isAndroidWebView || isIosWebView;
};

interface PsemineWalletContextType {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  isBscNetwork: boolean;
  isWebView: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToBscNetwork: () => Promise<boolean>;
  sendBnbPayment: (params: { recipient: string; valueWeiHex: string }) => Promise<string>;
}

const PsemineWalletContext = createContext<PsemineWalletContextType | undefined>(undefined);

export const PsemineWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isConnected: isTrustConnected, address: trustAddress, connection } = useConnection({ namespaceId: 'eip155' });
  const { open } = useTrustModal();
  const { disconnect } = useConnect();
  const { mutateAsync: sendTxAsync, isPending } = useSendTransaction();

  const [isWebView, setIsWebView] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [detectedChainId, setDetectedChainId] = useState<number | null>(null);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);

  useEffect(() => {
    if (isInAppWebView()) {
      setIsWebView(true);
    }
  }, []);

  const getWalletProvider = useCallback(async (): Promise<Eip1193RequestProvider | null> => {
    if (!connection?.wallet) return null;

    const trustProvider = await connection.wallet.getProvider() as TrustConnectProvider;
    const trustChain: TrustConnectChain | undefined = connection.chain;
    const rawChain = trustChain?.reference ?? trustChain?.id;
    const chainId = parseChainId(rawChain) ?? BSC_CHAIN_ID;

    return {
      request: <T,>(args: Eip1193RequestArguments) => trustProvider.request<T>({
        request: args,
        chainId: `eip155:${chainId}`,
      }),
    };
  }, [connection]);

  // Query the provider selected by TrustConnect so chain and account state stay aligned.
  const refreshNetworkAndAccounts = useCallback(async () => {
    const trustChain: TrustConnectChain | undefined = connection?.chain;
    const rawChain = trustChain?.reference ?? trustChain?.id;
    let currentChainId = parseChainId(rawChain);
    let currentAddress: string | null = trustAddress || null;

    try {
      const provider = await getWalletProvider();
      if (provider) {
        const [providerChainId, accounts] = await Promise.all([
          provider.request<string>({ method: 'eth_chainId' }),
          provider.request<string[]>({ method: 'eth_accounts' }),
        ]);
        currentChainId = parseChainId(providerChainId) ?? currentChainId;
        const providerAddress = accounts[0];
        if (providerAddress && trustAddress && providerAddress.toLowerCase() !== trustAddress.toLowerCase()) {
          console.warn('TrustConnect provider account does not match the active connection address.');
          currentAddress = null;
        } else {
          currentAddress = trustAddress || providerAddress || null;
        }
      }
    } catch (err: unknown) {
      console.warn('Error querying TrustConnect provider state:', err);
    }

    setDetectedChainId(currentChainId);
    setActiveAddress(currentAddress || trustAddress || null);
  }, [connection, getWalletProvider, trustAddress]);

  // TrustConnect owns provider listeners and updates connection when chain/accounts change.
  useEffect(() => {
    void refreshNetworkAndAccounts();
  }, [refreshNetworkAndAccounts]);

  const connectWallet = async () => {
    if (isWebView) {
      setShowWebViewModal(true);
      return;
    }

    try {
      open({ type: 'namespace', namespaceId: 'eip155' });
    } catch (err: unknown) {
      console.error('Wallet connection error:', err);
      toast.error('Wallet connection error: ' + errorMessage(err, 'Unknown error'));
    }
  };

  const disconnectWallet = () => {
    try {
      disconnect();
      setActiveAddress(null);
      setDetectedChainId(null);
      toast.success('Wallet disconnected');
    } catch (err: unknown) {
      console.error('Wallet disconnect error:', err);
    }
  };

  const switchToBscNetwork = async (): Promise<boolean> => {
    if (detectedChainId === BSC_CHAIN_ID) {
      return true;
    }

    const provider = await getWalletProvider();
    if (!provider) {
      toast.error('Wallet provider is unavailable. Please reconnect your wallet.');
      return false;
    }

    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_ID_HEX }],
      });
      setDetectedChainId(BSC_CHAIN_ID);
      toast.success('Switched to BNB Smart Chain');
      return true;
    } catch (switchError: unknown) {
      const switchMessage = errorMessage(switchError, 'User rejected network switch');
      // Error code 4902 indicates that the chain has not been added to wallet.
      if (errorCode(switchError) === 4902 || switchMessage.includes('4902')) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BSC_CHAIN_ID_HEX,
                chainName: 'BNB Smart Chain',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              },
            ],
          });
          setDetectedChainId(BSC_CHAIN_ID);
          toast.success('Added and switched to BNB Smart Chain');
          return true;
        } catch (addError: unknown) {
          console.error('Failed to add BSC network:', addError);
          toast.error('Failed to add BSC network to wallet');
          return false;
        }
      }
      console.error('Failed to switch to BSC network:', switchError);
      toast.error(switchMessage);
      return false;
    }
  };

  const sendBnbPayment = async (params: { recipient: string; valueWeiHex: string }): Promise<string> => {
    const isConnectedNow = !!activeAddress && !!trustAddress && !!isTrustConnected;
    if (!isConnectedNow) throw new Error('Wallet not connected');

    if (detectedChainId !== BSC_CHAIN_ID) {
      const switched = await switchToBscNetwork();
      if (!switched) {
        throw new Error('Please switch to BNB Smart Chain (Chain ID 56) before sending payment.');
      }
    }

    const valueBigInt = BigInt(params.valueWeiHex);

    const hash = await sendTxAsync({
      chain: bsc,
      to: params.recipient as `0x${string}`,
      value: valueBigInt,
    });

    if (!hash) {
      throw new Error('Transaction rejected or failed to return hash.');
    }

    return hash;
  };

  const finalConnected = !!isTrustConnected && !!trustAddress && !!activeAddress;
  const isBscNetwork = finalConnected && detectedChainId === BSC_CHAIN_ID;

  return (
    <PsemineWalletContext.Provider
      value={{
        address: finalConnected ? activeAddress : null,
        chainId: detectedChainId,
        isConnecting: isPending,
        isConnected: finalConnected,
        isBscNetwork,
        isWebView,
        connectWallet,
        disconnectWallet,
        switchToBscNetwork,
        sendBnbPayment,
      }}
    >
      {children}

      {/* In-App WebView Browser Warning Modal */}
      {showWebViewModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12121A] border border-amber-500/40 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-[0_0_30px_rgba(245,158,11,0.2)] relative">
            <button
              onClick={() => setShowWebViewModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">In-App Browser Detected</h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Web3 wallet connections cannot open inside in-app browsers (e.g., Telegram, Discord, Instagram, X).
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center space-y-1">
              <p className="text-xs font-bold text-amber-300">Action Required:</p>
              <p className="text-[11px] text-zinc-300">
                Please tap the menu (<span className="font-mono">•••</span>) and select <span className="font-bold text-white">"Open in Safari"</span> or <span className="font-bold text-white">"Open in Chrome"</span>.
              </p>
            </div>

            <button
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied to clipboard! Paste in Safari or Chrome.');
                }
              }}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            >
              <ExternalLink size={16} />
              <span>Copy Link for Default Browser</span>
            </button>
          </div>
        </div>
      )}
    </PsemineWalletContext.Provider>
  );
};

export const usePsemineWallet = () => {
  const context = useContext(PsemineWalletContext);
  if (!context) {
    throw new Error('usePsemineWallet must be used within a PsemineWalletProvider');
  }
  return context;
};
