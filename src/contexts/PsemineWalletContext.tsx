import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConnection, useTrustModal, useConnect } from '@trustwallet/connect-react';
import { useSendTransaction } from '@trustwallet/connect-eip155-react';
import { bsc } from 'viem/chains';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';

export const BSC_CHAIN_ID = 56;
export const BSC_CHAIN_ID_HEX = '0x38';
export const PSE_PAYMENT_ADDRESS = '0xAE909dDcf7e38F7Ed866c17D7245b36E8077dc77';

export const isInAppWebView = (): boolean => {
  if (typeof window === 'undefined' || !navigator || !navigator.userAgent) return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
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

  // EIP-1193 Chain & Address Detection
  const refreshNetworkAndAccounts = useCallback(async () => {
    let currentChainId: number | null = null;
    let currentAddress: string | null = trustAddress || null;

    // 1. Check connection object from TrustConnect
    if (connection?.chain) {
      const rawChain = (connection.chain as any).reference ?? (connection.chain as any).id;
      if (rawChain !== undefined && rawChain !== null) {
        currentChainId = typeof rawChain === 'number' ? rawChain : parseInt(String(rawChain), 10);
      }
    }

    // 2. Check window.ethereum for direct EIP-1193 provider state
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const ethereum = (window as any).ethereum;
        const hexChainId = await ethereum.request({ method: 'eth_chainId' });
        if (hexChainId) {
          currentChainId = parseInt(hexChainId, 16);
        }
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          currentAddress = accounts[0];
        }
      } catch (err) {
        console.warn('Error querying window.ethereum state:', err);
      }
    }

    setDetectedChainId(currentChainId);
    setActiveAddress(currentAddress || trustAddress || null);
  }, [connection, trustAddress]);

  // Provider Listeners for EIP-1193
  useEffect(() => {
    refreshNetworkAndAccounts();

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      const handleChainChanged = (hexChainId: string) => {
        const newChainId = parseInt(hexChainId, 16);
        setDetectedChainId(newChainId);
      };

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setActiveAddress(accounts[0]);
        } else {
          setActiveAddress(null);
        }
      };

      const handleDisconnect = () => {
        setDetectedChainId(null);
        setActiveAddress(null);
      };

      if (ethereum.on) {
        ethereum.on('chainChanged', handleChainChanged);
        ethereum.on('accountsChanged', handleAccountsChanged);
        ethereum.on('disconnect', handleDisconnect);
      }

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('chainChanged', handleChainChanged);
          ethereum.removeListener('accountsChanged', handleAccountsChanged);
          ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, [refreshNetworkAndAccounts]);

  const connectWallet = async () => {
    if (isWebView) {
      setShowWebViewModal(true);
      return;
    }

    try {
      open({ type: 'namespace', namespaceId: 'eip155' });
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      toast.error('Wallet connection error: ' + (err?.message || 'Unknown error'));
    }
  };

  const disconnectWallet = () => {
    try {
      disconnect();
      setActiveAddress(null);
      setDetectedChainId(null);
      toast.success('Wallet disconnected');
    } catch (err: any) {
      console.error('Wallet disconnect error:', err);
    }
  };

  const switchToBscNetwork = async (): Promise<boolean> => {
    if (detectedChainId === BSC_CHAIN_ID) {
      return true;
    }

    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BSC_CHAIN_ID_HEX }],
        });
        setDetectedChainId(BSC_CHAIN_ID);
        toast.success('Switched to BNB Smart Chain');
        return true;
      } catch (switchError: any) {
        // Error code 4902 indicates that the chain has not been added to wallet.
        if (switchError?.code === 4902 || switchError?.message?.includes('4902')) {
          try {
            await ethereum.request({
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
          } catch (addError: any) {
            console.error('Failed to add BSC network:', addError);
            toast.error('Failed to add BSC network to wallet');
            return false;
          }
        }
        console.error('Failed to switch to BSC network:', switchError);
        toast.error(switchError?.message || 'User rejected network switch');
        return false;
      }
    }

    toast.error('Provider does not support automatic network switching. Please switch to BSC (Chain ID 56) in your wallet.');
    return false;
  };

  const sendBnbPayment = async (params: { recipient: string; valueWeiHex: string }): Promise<string> => {
    const isConnectedNow = !!activeAddress || !!isTrustConnected;
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

  const finalConnected = (!!isTrustConnected && !!trustAddress) || !!activeAddress;
  const isBscNetwork = finalConnected && detectedChainId === BSC_CHAIN_ID;

  return (
    <PsemineWalletContext.Provider
      value={{
        address: activeAddress || trustAddress || null,
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
