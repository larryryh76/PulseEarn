import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { 
  doc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  limit, 
  updateDoc 
} from 'firebase/firestore';
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
import toast from 'react-hot-toast';

interface PSEMineContextType {
  campaign: PSEMineCampaign | null;
  pseUser: PSEMineUser | null;
  loading: boolean;
  liveAccruedGBP: number;
  connectedWallet: string | null;
  isConnectingWallet: boolean;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => void;
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
  submitPurchaseTx: (quote: PSEMineQuote, txHash: string) => Promise<{ success: boolean; error?: string }>;
  updatePayoutWallet: (newAddress: string) => Promise<{ success: boolean; error?: string }>;
  refreshData: () => Promise<void>;
  isCampaignArchived: boolean;
  campaignDaysRemaining: number;
}

const PSEMineContext = createContext<PSEMineContextType | undefined>(undefined);

export const PSEMineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData } = useAuth();
  const [campaign, setCampaign] = useState<PSEMineCampaign | null>(null);
  const [pseUser, setPseUser] = useState<PSEMineUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [liveAccruedGBP, setLiveAccruedGBP] = useState<number>(0);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(() => {
    return localStorage.getItem('psemine_connected_wallet') || null;
  });
  const [isConnectingWallet, setIsConnectingWallet] = useState<boolean>(false);
  const [ownerships, setOwnerships] = useState<PSEMineToolOwnership[]>([]);
  const [purchases, setPurchases] = useState<PSEMinePurchase[]>([]);
  const [referrals, setReferrals] = useState<PSEMineReferral[]>([]);
  const [activities, setActivities] = useState<PSEMineActivity[]>([]);
  const [payouts, setPayouts] = useState<PSEMinePayout[]>([]);
  const [activeQuote, setActiveQuote] = useState<PSEMineQuote | null>(null);
  const [isRequestingQuote, setIsRequestingQuote] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);

  // 1. Subscribe to Authoritative Campaign State
  useEffect(() => {
    let unsub: (() => void) | undefined;
    const initCampaign = async () => {
      try {
        const campRef = doc(db, 'psemine_campaigns', 'active_campaign');
        unsub = onSnapshot(campRef, (snap) => {
          if (snap.exists()) {
            setCampaign(snap.data() as PSEMineCampaign);
          } else {
            // Bootstrap initial campaign document
            PSEMineEngine.getOrCreateActiveCampaign().then(setCampaign);
          }
        }, (err) => {
          console.warn('[PSEMineContext] Campaign listener fallback:', err);
          PSEMineEngine.getOrCreateActiveCampaign().then(setCampaign);
        });
      } catch (e) {
        PSEMineEngine.getOrCreateActiveCampaign().then(setCampaign);
      }
    };

    initCampaign();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 2. Subscribe to PSE User Data and Subcollections
  useEffect(() => {
    if (!currentUser) {
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
    let unsubActivities: (() => void) | undefined;

    const setupUserListeners = async () => {
      try {
        // Ensure user exists
        await PSEMineEngine.getOrCreatePSEUser(
          currentUser.uid, 
          currentUser.email, 
          userData?.username
        );

        const userRef = doc(db, 'psemine_users', currentUser.uid);
        unsubUser = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as PSEMineUser;
            setPseUser(data);
            if (data.connectedWallet && !connectedWallet) {
              setConnectedWallet(data.connectedWallet);
            }
          }
          setLoading(false);
        }, (err) => {
          console.warn('[PSEMineContext] User snapshot error:', err);
          setLoading(false);
        });

        // Tool Ownerships
        const ownQuery = query(
          collection(db, 'psemine_tool_ownership'),
          where('userId', '==', currentUser.uid)
        );
        unsubOwnerships = onSnapshot(ownQuery, (snap) => {
          const list: PSEMineToolOwnership[] = [];
          snap.forEach(d => list.push(d.data() as PSEMineToolOwnership));
          setOwnerships(list);
        });

        // Purchases
        const purQuery = query(
          collection(db, 'psemine_purchases'),
          where('userId', '==', currentUser.uid)
        );
        unsubPurchases = onSnapshot(purQuery, (snap) => {
          const list: PSEMinePurchase[] = [];
          snap.forEach(d => list.push(d.data() as PSEMinePurchase));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setPurchases(list);
        });

        // Referrals
        const refQuery = query(
          collection(db, 'psemine_referrals'),
          where('referrerId', '==', currentUser.uid)
        );
        unsubReferrals = onSnapshot(refQuery, (snap) => {
          const list: PSEMineReferral[] = [];
          snap.forEach(d => list.push(d.data() as PSEMineReferral));
          setReferrals(list);
        });

        // Activities
        const actQuery = query(
          collection(db, 'psemine_users', currentUser.uid, 'activity'),
          limit(30)
        );
        unsubActivities = onSnapshot(actQuery, (snap) => {
          const list: PSEMineActivity[] = [];
          snap.forEach(d => list.push(d.data() as PSEMineActivity));
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setActivities(list);
        });

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
      if (unsubActivities) unsubActivities();
    };
  }, [currentUser, userData?.username]);

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
  }, [pseUser, campaign]);

  // 4. Web3 Wallet Connection (EIP-1193 / MetaMask / Trust / Binance Web3)
  const connectWallet = useCallback(async (): Promise<string | null> => {
    setIsConnectingWallet(true);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        // Request accounts
        const accounts: string[] = await ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (accounts && accounts.length > 0) {
          const address = accounts[0].toLowerCase();
          setConnectedWallet(address);
          localStorage.setItem('psemine_connected_wallet', address);

          // Attempt switching to BSC (Chain ID 56 / 0x38)
          try {
            await ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x38' }]
            });
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
              try {
                await ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: '0x38',
                      chainName: 'BNB Smart Chain Mainnet',
                      nativeCurrency: {
                        name: 'BNB',
                        symbol: 'BNB',
                        decimals: 18
                      },
                      rpcUrls: ['https://bsc-dataseed.binance.org/'],
                      blockExplorerUrls: ['https://bscscan.com']
                    }
                  ]
                });
              } catch (addError) {
                console.warn('User denied adding BSC network:', addError);
              }
            }
          }

          // Update user record in Firestore if logged in
          if (currentUser) {
            const userRef = doc(db, 'psemine_users', currentUser.uid);
            await updateDoc(userRef, {
              connectedWallet: address,
              payoutWallet: pseUser?.payoutWallet || address, // Default payout to connected wallet
              updatedAt: new Date().toISOString()
            });

            await PSEMineEngine.logActivity(currentUser.uid, {
              type: 'wallet_updated',
              title: 'Wallet Connected',
              description: `Connected BNB Smart Chain wallet ${address.slice(0, 6)}...${address.slice(-4)}`
            });
          }

          toast.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`, {
            icon: '⚡'
          });
          return address;
        }
        return null;
      } else {
        // Fallback for simulation / mobile deep link
        const mockAddress = `0x${Math.random().toString(16).substring(2, 42).padEnd(40, '0')}`.toLowerCase();
        setConnectedWallet(mockAddress);
        localStorage.setItem('psemine_connected_wallet', mockAddress);

        if (currentUser) {
          const userRef = doc(db, 'psemine_users', currentUser.uid);
          await updateDoc(userRef, {
            connectedWallet: mockAddress,
            payoutWallet: pseUser?.payoutWallet || mockAddress,
            updatedAt: new Date().toISOString()
          });
        }
        toast.success(`Wallet Linked: ${mockAddress.slice(0, 6)}...${mockAddress.slice(-4)}`);
        return mockAddress;
      }
    } catch (e: any) {
      console.error('[PSEMineContext] Wallet connect error:', e);
      toast.error(e.message || 'Failed to connect wallet');
      return null;
    } finally {
      setIsConnectingWallet(false);
    }
  }, [currentUser, pseUser]);

  const disconnectWallet = useCallback(() => {
    setConnectedWallet(null);
    localStorage.removeItem('psemine_connected_wallet');
    toast('Wallet disconnected', { icon: '🔌' });
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate payment quote');
      return null;
    } finally {
      setIsRequestingQuote(false);
    }
  }, [currentUser]);

  const clearQuote = useCallback(() => {
    setActiveQuote(null);
  }, []);

  // 6. Submit Purchase Transaction
  const submitPurchaseTx = useCallback(async (
    quote: PSEMineQuote, 
    txHash: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      // 1. Create purchase intent
      const purchase = await PSEMineEngine.createPurchaseIntent(
        quote, 
        connectedWallet || '0x0000000000000000000000000000000000000000'
      );

      // 2. Authoritative purchase activation
      const result = await PSEMineEngine.activateToolPurchase(
        purchase.id, 
        txHash, 
        connectedWallet || undefined
      );

      if (result.success) {
        toast.success(`${LOCKED_PSEMINE_TOOLS[quote.toolId].name} Deployed!`, {
          icon: '⛏️',
          duration: 6000
        });
        setActiveQuote(null);
      } else {
        toast.error(result.error || 'Payment verification failed');
      }

      return result;
    } catch (e: any) {
      console.error('[PSEMineContext] submitPurchaseTx error:', e);
      return { success: false, error: e.message || 'Purchase processing error' };
    }
  }, [currentUser, connectedWallet]);

  // 7. Update Payout Wallet
  const updatePayoutWallet = useCallback(async (newAddress: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const res = await PSEMineEngine.updatePayoutWallet(currentUser.uid, newAddress);
      if (res.success) {
        toast.success('Settlement payout address updated');
      } else {
        toast.error(res.error || 'Could not update payout address');
      }
      return res;
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error' };
    }
  }, [currentUser]);

  const refreshData = useCallback(async () => {
    if (currentUser) {
      await PSEMineEngine.syncAccrual(currentUser.uid);
    }
  }, [currentUser]);

  // Calculate days remaining
  const campaignDaysRemaining = React.useMemo(() => {
    if (!campaign) return 90;
    const endMs = new Date(campaign.endAt).getTime();
    const nowMs = Date.now();
    const diffMs = endMs - nowMs;
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
        connectedWallet,
        isConnectingWallet,
        connectWallet,
        disconnectWallet,
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
        submitPurchaseTx,
        updatePayoutWallet,
        refreshData,
        isCampaignArchived,
        campaignDaysRemaining
      }}
    >
      {children}
    </PSEMineContext.Provider>
  );
};

export const usePSEMine = (): PSEMineContextType => {
  const context = useContext(PSEMineContext);
  if (!context) {
    throw new Error('usePSEMine must be used within a PSEMineProvider');
  }
  return context;
};
