import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { safeFetch } from '../../utils/api';
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark';
import { Users, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import './psemine.css';

export const PSEMineReferrals: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [copied, setCopied] = React.useState(false);
  const [summary, setSummary] = React.useState({ qualified: 0, maximum: 5, hourlyBoostGBP: '0.00' });
  React.useEffect(() => { void (async () => { const token = await currentUser?.getIdToken(); if (!token) return; const result = await safeFetch('/api/psemine/referrals', { headers: { Authorization: `Bearer ${token}` } }); if (result.success) setSummary({ qualified: result.qualified, maximum: result.maximum, hourlyBoostGBP: result.hourlyBoostGBP }); })(); }, [currentUser]);

  const referralLink = `https://pulseearn.online/mine/signup?ref=${userData?.referralCode || 'PSEMINE'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('PSEmine referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

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
            <a href="/mine/referrals" style={{ color: '#fff', fontWeight: 800 }}>Referrals</a>
          </nav>
        </div>
      </header>

      <main className="psemine-page" style={{ flex: 1, padding: '60px 0' }}>
        <div className="psemine-shell">
          <div style={{ marginBottom: '40px' }}>
            <p className="psemine-eyebrow">
              <Users size={13} /> Capacity Boost
            </p>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.05em' }}>
              PSEmine Referrals
            </h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '15px', margin: 0 }}>
              Invite qualified participants to earn a £0.30/hr earning boost (capped at 5 referrals = £1.50/hr max boost).
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700 }}>
                Qualified Referrals
              </span>
              <div style={{ fontSize: '36px', fontWeight: 800, color: '#fff', margin: '12px 0 6px' }}>
                {summary.qualified} <span style={{ fontSize: '16px', color: 'var(--pm-muted)' }}>/ {summary.maximum} max</span>
              </div>
              <small style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>Count toward capacity boost</small>
            </div>

            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#707786', fontWeight: 700 }}>
                Current Hourly Boost
              </span>
              <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--pm-cyan)', margin: '12px 0 6px' }}>
                +£{summary.hourlyBoostGBP} <span style={{ fontSize: '16px' }}>/ hr</span>
              </div>
              <small style={{ color: 'var(--pm-muted)', fontSize: '12px' }}>Max referral boost is +£1.50/hr</small>
            </div>
          </div>

          <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '32px', maxWidth: '640px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>
              Your PSEmine Referral Link
            </h3>
            <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 20px' }}>
              Share this link with users joining PSEmine.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                readOnly
                value={referralLink}
                style={{
                  flex: 1,
                  background: 'var(--pm-soft)',
                  border: '1px solid var(--pm-line)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleCopy}
                className="psemine-button"
                style={{ border: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>
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

export default PSEMineReferrals;
