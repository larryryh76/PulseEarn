import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark';
import { User, ShieldCheck } from 'lucide-react';
import './psemine.css';

export const PSEMineProfile: React.FC = () => {
  const { currentUser, userData } = useAuth();

  return (
    <div className="psemine-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="psemine-header">
        <div className="psemine-shell psemine-nav">
          <PSEMineWordmark />
          <nav className="psemine-nav-links">
            <a href="/mine/dashboard">Dashboard</a>
            <a href="/mine/tools">Tools</a>
            <a href="/mine/wallet">Wallet</a>
            <a href="/mine/activity">Activity</a>
            <a href="/mine/referrals">Referrals</a>
          </nav>
        </div>
      </header>

      <main className="psemine-page" style={{ flex: 1, padding: '60px 0' }}>
        <div className="psemine-shell">
          <div style={{ marginBottom: '40px' }}>
            <p className="psemine-eyebrow">
              <User size={13} /> Participant Profile
            </p>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.05em' }}>
              PSEmine Account
            </h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '15px', margin: 0 }}>
              Your isolated PSEmine campaign identity and security settings.
            </p>
          </div>

          <div style={{ maxWidth: '540px', background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(104, 116, 255, 0.15)', display: 'grid', placeItems: 'center', color: 'var(--pm-cyan)', fontWeight: 800, fontSize: '20px' }}>
                {userData?.username?.[0]?.toUpperCase() || 'P'}
              </div>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>
                  {userData?.username || 'PSEmine Participant'}
                </h3>
                <p style={{ color: 'var(--pm-muted)', fontSize: '13px', margin: 0 }}>
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--pm-line)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--pm-muted)' }}>Firebase UID:</span>
                <code style={{ fontSize: '11px', color: '#fff' }}>{currentUser?.uid?.slice(0, 12)}...</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--pm-muted)' }}>Product Access:</span>
                <span style={{ color: 'var(--pm-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> PSEmine Active
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--pm-muted)' }}>Referral Code:</span>
                <strong style={{ color: '#fff' }}>{userData?.referralCode}</strong>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="psemine-footer">
        <div className="psemine-shell psemine-footer-inner">
          <div><PSEMineWordmark /><p>Independent campaign mining platform.</p></div>
          <p className="psemine-copyright">© {new Date().getFullYear()} PSEmine</p>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineProfile;
