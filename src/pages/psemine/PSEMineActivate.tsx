import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark';
import toast from 'react-hot-toast';
import { ShieldCheck, ArrowRight, Loader2, Wallet, CheckCircle2 } from 'lucide-react';
import './psemine.css';

const BSC_CHAIN_ID_HEX = '0x38'; // 56 in decimal
const BSC_CHAIN_CONFIG = {
  chainId: BSC_CHAIN_ID_HEX,
  chainName: 'BNB Smart Chain Mainnet',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org/'],
  blockExplorerUrls: ['https://bscscan.com/']
};

export const PSEMineActivate: React.FC = () => {
  const { currentUser, userData, activatePSEMineAccess } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [walletAddress, setWalletAddress] = useState(userData?.walletAddress || '');
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [hasProvider, setHasProvider] = useState(false);
  const navigate = useNavigate();

  const ensureBscNetwork = async (ethereum: any) => {
    try {
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (chainId?.toLowerCase() !== BSC_CHAIN_ID_HEX.toLowerCase()) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BSC_CHAIN_ID_HEX }]
          });
        } catch (switchError: any) {
          if (switchError.code === 4902 || switchError?.message?.includes('Unrecognized chain')) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [BSC_CHAIN_CONFIG]
            });
          } else {
            throw switchError;
          }
        }
      }
      return true;
    } catch (err) {
      console.warn('Network switch to BSC was not completed:', err);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      setHasProvider(true);
      const ethereum = (window as any).ethereum;
      ethereum
        .request({ method: 'eth_accounts' })
        .then(async (accounts: string[]) => {
          if (accounts && accounts.length > 0 && !walletAddress) {
            const isBsc = await ensureBscNetwork(ethereum);
            if (isBsc) {
              setWalletAddress(accounts[0]);
            }
          }
        })
        .catch((err: any) => console.log('eth_accounts check error:', err));
    }
  }, []);

  const handleConnectWallet = async () => {
    if (!(window as any).ethereum) {
      toast.error('No Web3 wallet provider found. You can switch to manual entry below.');
      setUseManualEntry(true);
      return;
    }

    try {
      setIsConnectingWallet(true);
      const ethereum = (window as any).ethereum;

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No account returned from wallet provider.');
      }

      const isBsc = await ensureBscNetwork(ethereum);
      if (!isBsc) {
        throw new Error('Please switch your wallet to BNB Smart Chain to continue.');
      }

      setWalletAddress(accounts[0]);
      toast.success('BNB Smart Chain wallet connected!');
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      toast.error(err?.message || 'Failed to connect wallet.');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleActivate = async () => {
    try {
      setIsActivating(true);
      const trimmedWallet = walletAddress.trim();
      if (trimmedWallet && !/^0x[a-fA-F0-9]{40}$/.test(trimmedWallet)) {
        throw new Error('Please enter a valid EVM/BSC wallet address (0x...) or clear the input to continue without a wallet.');
      }
      await activatePSEMineAccess(trimmedWallet || undefined);
      toast.success('PSEmine access activated!');
      navigate('/mine/dashboard');
    } catch (error: any) {
      console.error('[PSEMineActivate] Activation Error:', error);
      const message = error?.message || error?.code || 'Failed to activate PSEmine access. Please try again.';
      toast.error(message);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <PSEMineLandingLayout>
      <main className="psemine-page" style={{ padding: '80px 0 120px' }}>
        <div className="psemine-shell" style={{ maxWidth: '520px', margin: '0 auto' }}>
          <div
            style={{
              background: 'var(--pm-surface)',
              border: '1px solid var(--pm-line)',
              borderRadius: '16px',
              padding: '40px 36px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(139, 229, 239, 0.12)',
                border: '1px solid rgba(139, 229, 239, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--pm-cyan)',
                marginBottom: '20px'
              }}
            >
              <ShieldCheck size={28} />
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', letterSpacing: '-0.04em' }}>
              Activate PSEmine Campaign Access
            </h1>

            <p style={{ color: 'var(--pm-muted)', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
              Welcome, <strong style={{ color: '#fff' }}>{userData?.username || currentUser?.email}</strong>. Connect a wallet now or add one later when making a purchase.
            </p>

            {/* Wallet Selection Section */}
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              {walletAddress ? (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      <CheckCircle2 size={14} /> BSC Wallet Ready
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#fff', wordBreak: 'break-all' }}>
                      {walletAddress}
                    </div>
                  </div>
                  <button
                    onClick={() => setWalletAddress('')}
                    style={{ background: 'none', border: 0, color: 'var(--pm-muted)', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline', paddingLeft: '8px' }}
                  >
                    Change
                  </button>
                </div>
              ) : !useManualEntry ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={isConnectingWallet}
                    className="psemine-button"
                    style={{ width: '100%', border: 0, cursor: 'pointer', justifyContent: 'center' }}
                  >
                    {isConnectingWallet ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Connecting BSC Wallet...
                      </>
                    ) : (
                      <>
                        <Wallet size={16} /> Connect BSC Wallet
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseManualEntry(true)}
                    style={{ background: 'none', border: 0, color: 'var(--pm-muted)', fontSize: '12px', cursor: 'pointer', textAlign: 'center', textDecoration: 'underline' }}
                  >
                    Enter wallet address manually instead
                  </button>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'grid', gap: '8px', color: 'var(--pm-muted)', fontSize: '13px' }}>
                    <span>BSC wallet address (BEP20)</span>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(event) => setWalletAddress(event.target.value)}
                      placeholder="0x..."
                      autoComplete="off"
                      style={{ background: 'var(--pm-soft)', border: '1px solid var(--pm-line)', borderRadius: '10px', padding: '13px', color: '#fff', fontFamily: 'monospace', width: '100%', boxSizing: 'border-box' }}
                    />
                  </label>
                  {hasProvider && (
                    <button
                      type="button"
                      onClick={() => setUseManualEntry(false)}
                      style={{ background: 'none', border: 0, color: 'var(--pm-cyan)', fontSize: '12px', cursor: 'pointer', marginTop: '8px', padding: 0 }}
                    >
                      ← Connect with wallet extension instead
                    </button>
                  )}
                </div>
              )}
            </div>

            <div
              style={{
                background: 'var(--pm-soft)',
                border: '1px solid var(--pm-line)',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'left',
                marginBottom: '28px'
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700, marginBottom: '8px' }}>
                Identity Control & Financial Separation
              </div>
              <div style={{ fontSize: '12px', color: '#c6cad3', lineHeight: 1.5 }}>
                Wallet connection proves campaign transaction identity. Financial calculations, accrual rates, and settlements remain strictly backend-authoritative.
              </div>
            </div>

            <button
              onClick={handleActivate}
              disabled={isActivating}
              className="psemine-button"
              style={{ width: '100%', border: 0, cursor: 'pointer', opacity: isActivating ? 0.6 : 1 }}
            >
              {isActivating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Activating Access...
                </>
              ) : (
                <>
                  {walletAddress.trim() ? 'Enter PSEmine Campaign' : 'Skip & Enter PSEmine Workspace'} <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </PSEMineLandingLayout>
  );
};

export default PSEMineActivate;
