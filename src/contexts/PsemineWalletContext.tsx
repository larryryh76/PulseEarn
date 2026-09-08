import React, { createContext, useContext } from 'react';
import toast from 'react-hot-toast';
import { useConnection, useTrustModal, useConnect } from '@trustwallet/connect-react';
import { useSendTransaction } from '@trustwallet/connect-eip155-react';
import { bsc } from 'viem/chains';

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
  const { isConnected, address } = useConnection({ namespaceId: 'eip155' });
  const { open } = useTrustModal();
  const { disconnect } = useConnect();
  const { mutateAsync: sendTxAsync, isPending } = useSendTransaction();

  const connectWallet = async () => {
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
      toast.success('Wallet disconnected');
    } catch (err: any) {
      console.error('Wallet disconnect error:', err);
    }
  };

  const switchToBscNetwork = async (): Promise<boolean> => {
    return true;
  };

  const sendBnbPayment = async (params: { recipient: string; valueWeiHex: string }): Promise<string> => {
    if (!address) throw new Error('Wallet not connected');

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

  return (
    <PsemineWalletContext.Provider
      value={{
        address: address || null,
        chainId: BSC_CHAIN_ID,
        isConnecting: isPending,
        isConnected: !!isConnected && !!address,
        isBscNetwork: true,
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
