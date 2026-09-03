import React, { useState } from 'react';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineLandingLayout } from '../../components/psemine/PSEMineWordmark';
import toast from 'react-hot-toast';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import './psemine.css';

export const PSEMineActivate: React.FC = () => {
  const { currentUser, userData, activatePSEMineAccess } = useAuth();
  const [isActivating, setIsActivating] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletStatus, setWalletStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const navigate = useNavigate();

  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletStatus('idle');
      toast.error('Wallet connection is optional here. You can enter PSEmine without connecting a wallet.');
      return;
    }
    try {
      setWalletStatus('connecting');
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts?.[0]) throw new Error('No wallet account was returned.');
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      if (chainId !== '0x38') {
        try {
          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] });
        } catch {
          throw new Error('Switch your wallet to BNB Smart Chain and try again.');
        }
      }
      setWalletAddress(accounts[0]);
      setWalletStatus('connected');
    } catch (error: any) {
      setWalletStatus('idle');
      toast.error(error?.message || 'Wallet connection was cancelled.');
    }
  };

  const handleActivate = async () => {
    try {
      setIsActivating(true);
      await activatePSEMineAccess();
      toast.success('PSEmine access activated!');
      navigate('/mine/dashboard');
    } catch (error: any) {
      console.error("[PSEMineActivate] Activation Error:", error);
      const message = error?.message || error?.code || 'Failed to activate PSEmine access. Please try again.';
      toast.error(message);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <PSEMineLandingLayout>
      <main className="psemine-page" style={{ padding: '80px 0 120px' }}>
        <div className="psemine-shell" style={{ maxWidth: '480px', margin: '0 auto' }}>
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
              Welcome, <strong style={{ color: '#fff' }}>{userData?.username || currentUser?.email}</strong>. You are currently authenticated. To enter the PSEmine digital mining environment, confirm your access below.
            </p>

            <div style={{ display: 'grid', gap: '10px', textAlign: 'left', marginBottom: '20px' }}>
              <div style={{ color: 'var(--pm-muted)', fontSize: '13px' }}>PSEmine wallet</div>
              <button type="button" onClick={connectWallet} disabled={walletStatus === 'connecting'} className="psemine-button" style={{ width: '100%', border: '1px solid var(--pm-line)', cursor: 'pointer', background: walletStatus === 'connected' ? 'rgba(139, 229, 239, 0.16)' : undefined }}>
                {walletStatus === 'connecting' ? 'Connecting wallet…' : walletStatus === 'connected' ? `Connected ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Connect BSC wallet'}
              </button>
              <div style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>Wallet connection is optional for access. Connect later from PSEmine Wallet before making a purchase.</div>
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
                Single Identity Access Control
              </div>
              <div style={{ fontSize: '13px', color: '#c6cad3', lineHeight: 1.5 }}>
                Activating PSEmine access attaches campaign permissions to your existing identity while maintaining separate product experiences.
              </div>
            </div>

            <button
              onClick={handleActivate}
              disabled={isActivating}
              className="psemine-button"
              style={{ width: '100%', border: 0, cursor: 'pointer' }}
            >
              {isActivating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Activating Access...
                </>
              ) : (
                <>
                  Enter PSEmine Campaign <ArrowRight size={16} />
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
