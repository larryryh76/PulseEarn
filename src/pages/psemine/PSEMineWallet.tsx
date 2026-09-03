import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark';
import { safeFetch } from '../../utils/api';
import { Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import './psemine.css';

const pounds = (val?: string | number) => `£${Number(val || 0).toFixed(2)}`;

export const PSEMineWalletPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [payoutWallet, setPayoutWallet] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    earnings?: { totalEarningsGBP?: string };
    capacity?: { hourlyRateGBP?: string };
    wallets?: Array<{ address?: string; role?: string; status?: string }>;
  } | null>(null);

  const loadSnapshot = useCallback(async () => {
    if (!currentUser) return;
    const token = await currentUser.getIdToken();
    const result = await safeFetch('/api/psemine/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (result.success) {
      setSnapshot(result);
      const configuredPayout = result.wallets?.find((w: any) => w.role === 'payout')?.address;
      if (configuredPayout) {
        setPayoutWallet(configuredPayout);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const handleSaveWallets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutWallet.trim() || !payoutWallet.startsWith('0x') || payoutWallet.length < 42) {
      return toast.error('Please enter a valid BSC payout wallet address (0x...)');
    }
    setIsSaving(true);
    try {
      const token = await currentUser?.getIdToken();
      const res = await safeFetch('/api/mine/wallet/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ payoutWallet: payoutWallet.trim() })
      });
      if (res.success) {
        toast.success('Payout wallet address updated!');
        await loadSnapshot();
      } else {
        toast.error(res.message || 'Failed to update payout wallet');
      }
    } catch {
      toast.error('Could not update the payout wallet. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalEarnings = snapshot?.earnings?.totalEarningsGBP || '0.00';
  const hourlyRate = snapshot?.capacity?.hourlyRateGBP || '0.00';

  return (
    <div className="psemine-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="psemine-header">
        <div className="psemine-shell psemine-nav">
          <PSEMineWordmark />
          <nav className="psemine-nav-links">
            <a href="/mine/dashboard">Dashboard</a>
            <a href="/mine/tools">Tools</a>
            <a href="/mine/wallet" style={{ color: '#fff', fontWeight: 800 }}>Wallet</a>
            <a href="/mine/activity">Activity</a>
            <a href="/mine/referrals">Referrals</a>
            <a href="/mine/guide">Guide</a>
          </nav>
        </div>
      </header>

      <main className="psemine-page" style={{ flex: 1, padding: '60px 0' }}>
        <div className="psemine-shell">
          <div style={{ marginBottom: '40px' }}>
            <p className="psemine-eyebrow">
              <Wallet size={13} /> Campaign Settlement & Accounting
            </p>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.05em' }}>
              PSEmine Wallet
            </h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '15px', margin: 0 }}>
              Manage your campaign earning ledger and connected BSC settlement wallets.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700 }}>
                Campaign Accrued Balance
              </span>
              <div style={{ fontSize: '42px', fontWeight: 800, color: '#fff', margin: '12px 0 6px', letterSpacing: '-0.05em' }}>
                {pounds(totalEarnings)}
              </div>
              <small style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>
                GBP campaign accounting value (settles at campaign close)
              </small>
            </div>

            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700 }}>
                Active Earning Capacity
              </span>
              <div style={{ fontSize: '42px', fontWeight: 800, color: 'var(--pm-cyan)', margin: '12px 0 6px', letterSpacing: '-0.05em' }}>
                {pounds(hourlyRate)} <span style={{ fontSize: '16px' }}>/ hr</span>
              </div>
              <small style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>
                Combined output from active tools & referral boost
              </small>
            </div>
          </div>

          <div style={{ maxWidth: '600px', background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
              Configure Settlement Wallets
            </h3>
            <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 24px' }}>
              Separate purchase and payout wallet configuration on BNB Smart Chain.
            </p>

            <form onSubmit={handleSaveWallets} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--pm-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Payout Wallet Address (Receives Settlement)
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={payoutWallet}
                  onChange={(e) => setPayoutWallet(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    background: 'var(--pm-soft)',
                    border: '1px solid var(--pm-line)',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="psemine-button"
                style={{ width: '100%', border: 0, cursor: 'pointer' }}
              >
                {isSaving ? 'Saving Configuration...' : 'Save Wallet Details'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="psemine-footer">
        <div className="psemine-shell psemine-footer-inner">
          <div><PSEMineWordmark /><p>Part of the PulseEarn ecosystem.</p></div>
          <p className="psemine-copyright">© {new Date().getFullYear()} PulseEarn</p>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineWalletPage;
