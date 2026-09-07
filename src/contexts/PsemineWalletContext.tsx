import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const BSC_CHAIN_ID = 56;
export const BSC_CHAIN_ID_HEX = '0x38';
export const PSE_PAYMENT_ADDRESS = '0xAE909dDcf7e38F7Ed866c17D7245b36E8077dc77';

interface PsemineWalletContextType {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isConnected: boolean;
  isBscNetwork: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToBscNetwork: () => Promise<boolean>;
  sendBnbPayment: (params: { recipient: string; valueWeiHex: string }) => Promise<string>;
}

const PsemineWalletContext = createContext<PsemineWalletContextType | undefined>(undefined);

export const PsemineWalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isConnected = !!address;
  const isBscNetwork = chainId === BSC_CHAIN_ID;

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          setAddress(null);
        }
      };

      const handleChainChanged = (hexChainId: string) => {
        setChainId(parseInt(hexChainId, 16));
      };

      ethereum.on?.('accountsChanged', handleAccountsChanged);
      ethereum.on?.('chainChanged', handleChainChanged);

      ethereum.request?.({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) setAddress(accounts[0]);
        })
        .catch(() => {});

      ethereum.request?.({ method: 'eth_chainId' })
        .then((hexChainId: string) => {
          setChainId(parseInt(hexChainId, 16));
        })
        .catch(() => {});

      return () => {
        ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
        ethereum.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      toast.error('No Web3 provider found. Please install Trust Wallet or MetaMask.');
      return;
    }

    setIsConnecting(true);
    try {
      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        const hexChainId = await ethereum.request({ method: 'eth_chainId' });
        setChainId(parseInt(hexChainId, 16));
        toast.success(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      toast.error('Wallet connection rejected: ' + (err.message || 'Unknown error'));
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAddress(null);
    setChainId(null);
    toast.success('Wallet disconnected');
  };

  const switchToBscNetwork = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return false;
    const ethereum = (window as any).ethereum;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BSC_CHAIN_ID_HEX }],
      });
      setChainId(BSC_CHAIN_ID);
      toast.success('Switched to BNB Smart Chain');
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BSC_CHAIN_ID_HEX,
                chainName: 'BNB Smart Chain Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              },
            ],
          });
          setChainId(BSC_CHAIN_ID);
          toast.success('BNB Smart Chain added and selected');
          return true;
        } catch (addError: any) {
          toast.error('Failed to add BNB Smart Chain network');
          return false;
        }
      }
      toast.error('Failed to switch network: ' + (switchError.message || ''));
      return false;
    }
  };

  const sendBnbPayment = async (params: { recipient: string; valueWeiHex: string }): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');
    if (!isBscNetwork) {
      const switched = await switchToBscNetwork();
      if (!switched) throw new Error('BNB Smart Chain network required');
    }

    const ethereum = (window as any).ethereum;
    const txParams = {
      from: address,
      to: params.recipient,
      value: params.valueWeiHex,
    };

    const txHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    });

    return txHash;
  };

  return (
    <PsemineWalletContext.Provider
      value={{
        address,
        chainId,
        isConnecting,
        isConnected,
        isBscNetwork,
        connectWallet,
        disconnectWallet,
        switchToBscNetwork,
        sendBnbPayment,
      }}
    >
      {children}
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
