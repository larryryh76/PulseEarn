import React from 'react';
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark';
import { Clock } from 'lucide-react';
import './psemine.css';

export const PSEMineActivity: React.FC = () => {
  return (
    <div className="psemine-site" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="psemine-header">
        <div className="psemine-shell psemine-nav">
          <PSEMineWordmark />
          <nav className="psemine-nav-links">
            <a href="/mine/dashboard">Dashboard</a>
            <a href="/mine/tools">Tools</a>
            <a href="/mine/wallet">Wallet</a>
            <a href="/mine/activity" style={{ color: '#fff', fontWeight: 800 }}>Activity</a>
            <a href="/mine/referrals">Referrals</a>
          </nav>
        </div>
      </header>

      <main className="psemine-page" style={{ flex: 1, padding: '60px 0' }}>
        <div className="psemine-shell">
          <div style={{ marginBottom: '40px' }}>
            <p className="psemine-eyebrow">
              <Clock size={13} /> Financial Ledger & Events
            </p>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.05em' }}>
              Campaign Activity
            </h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '15px', margin: 0 }}>
              Auditable activity history for tool activations, hourly accruals, and referral boosts.
            </p>
          </div>

          <div
            style={{
              background: 'var(--pm-surface)',
              border: '1px solid var(--pm-line)',
              borderRadius: '16px',
              padding: '28px',
              textAlign: 'center'
            }}
          >
            <p style={{ color: 'var(--pm-muted)', fontSize: '14px', margin: 0 }}>
              No campaign transactions recorded yet. Activate a mining tool to begin generating activity logs.
            </p>
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

export default PSEMineActivity;
