import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark';
import { LogOut, ShieldCheck, Zap } from 'lucide-react';
import './psemine.css';

export const PSEMineDashboard: React.FC = () => {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/mine');
  };

  return (
    <div className="psemine-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="psemine-header">
        <div className="psemine-shell psemine-nav">
          <PSEMineWordmark />
          <nav className="psemine-nav-links">
            <a href="/mine/dashboard" style={{ color: '#fff', fontWeight: 800 }}>Dashboard</a>
            <a href="/mine/tools">Tools</a>
            <a href="/mine/wallet">Wallet</a>
            <a href="/mine/activity">Activity</a>
            <a href="/mine/referrals">Referrals</a>
          </nav>
          <div className="psemine-nav-actions">
            <a href="/mine/me" style={{ fontSize: '13px', color: 'var(--pm-muted)', fontWeight: 600, textDecoration: 'none' }}>
              {userData?.username || currentUser?.email}
            </a>
            <button
              onClick={handleLogout}
              className="psemine-button psemine-button-small"
              style={{ background: 'var(--pm-soft)', color: '#fff', border: '1px solid var(--pm-line)', cursor: 'pointer' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="psemine-page" style={{ flex: 1, padding: '60px 0' }}>
        <div className="psemine-shell">
          <div style={{ marginBottom: '40px' }}>
            <p className="psemine-eyebrow">
              <Zap size={13} /> Authenticated Environment
            </p>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.05em' }}>
              PSEmine Dashboard
            </h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '15px', margin: 0 }}>
              Welcome to the independent PSEmine product environment.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}
          >
            <div
              style={{
                background: 'var(--pm-surface)',
                border: '1px solid var(--pm-line)',
                borderRadius: '16px',
                padding: '28px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 229, 239, 0.12)', display: 'grid', placeItems: 'center', color: 'var(--pm-cyan)' }}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Authentication Verified</h3>
                  <small style={{ color: 'var(--pm-muted)' }}>Firebase Identity</small>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--pm-muted)', lineHeight: 1.6, margin: 0 }}>
                Your account is authenticated via Firebase Auth and isolated within the PSEmine campaign environment.
              </p>
            </div>

            <div
              style={{
                background: 'var(--pm-surface)',
                border: '1px solid var(--pm-line)',
                borderRadius: '16px',
                padding: '28px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(104, 116, 255, 0.12)', display: 'grid', placeItems: 'center', color: 'var(--pm-blue)' }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Product Access</h3>
                  <small style={{ color: 'var(--pm-cyan)' }}>PSEmine Environment</small>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--pm-muted)', lineHeight: 1.6, margin: 0 }}>
                Product Access controls ensure your experience is isolated to PSEmine. PulseEarn navigation and features are disabled.
              </p>
            </div>
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

export default PSEMineDashboard;
