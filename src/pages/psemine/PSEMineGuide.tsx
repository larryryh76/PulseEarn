import React from 'react';
import { PSEMineWordmark } from '../../components/psemine/PSEMineWordmark';
import { BookOpen, ShieldCheck, Zap, Users, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import './psemine.css';

export const PSEMineGuide: React.FC = () => {
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
            <a href="/mine/guide" style={{ color: '#fff', fontWeight: 800 }}>Guide</a>
          </nav>
        </div>
      </header>

      <main className="psemine-page" style={{ flex: 1, padding: '60px 0' }}>
        <div className="psemine-shell">
          <div style={{ marginBottom: '40px' }}>
            <p className="psemine-eyebrow">
              <BookOpen size={13} /> Campaign Architecture & Operating Instructions
            </p>
            <h1 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.05em' }}>
              PSEmine Campaign Guide
            </h1>
            <p style={{ color: 'var(--pm-muted)', fontSize: '15px', margin: 0 }}>
              Complete reference manual for campaign lifecycle, tool stacking, BNB payments, and settlement.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            {/* 1. 90-Day Campaign Duration */}
            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--pm-cyan)' }}>
                <Clock size={20} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>90-Day Campaign Lifecycle</h3>
              </div>
              <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                PSEmine operates as a limited 90-day campaign. Mining runs continuously throughout the active phase. Upon reaching the campaign deadline, mining automatically freezes and transitions to the settlement phase for crypto payouts.
              </p>
            </div>

            {/* 2. Tool Stacking & Capacity */}
            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--pm-cyan)' }}>
                <Zap size={20} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>Tool Capacity & Stacking</h3>
              </div>
              <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Tools provide additive hourly earning capacity measured in GBP (£). You can own multiple copies up to account limits:
                Basic (£3, +£0.10/hr, max 5), Core (£10, +£0.50/hr, max 3), Advanced (£50, +£1.20/hr, max 3), Elite (£200, +£2.50/hr, max 2). Maximum tool capacity is £10.60/hr.
              </p>
            </div>

            {/* 3. Referral Capacity Boost */}
            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--pm-cyan)' }}>
                <Users size={20} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>Referral Capacity Boost</h3>
              </div>
              <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Invite participants using your referral link. When a referred user connects a wallet and activates their first mining tool, you receive a +£0.30/hr capacity boost (capped at 5 qualified referrals = +£1.50/hr maximum boost).
              </p>
            </div>

            {/* 4. Payment & Verification */}
            <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: 'var(--pm-cyan)' }}>
                <Wallet size={20} />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#fff' }}>BNB Smart Chain Payments</h3>
              </div>
              <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
                Tool purchases are quoted in BNB using live price oracles. To activate a tool, generate a payment quote, transfer the required BNB on BNB Smart Chain (BEP20) to the campaign receiver address, and submit your transaction hash for verification.
              </p>
            </div>
          </div>

          {/* Detailed Instructions Section */}
          <div style={{ background: 'var(--pm-surface)', border: '1px solid var(--pm-line)', borderRadius: '16px', padding: '36px', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
              Campaign Step-by-Step Flow
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(104, 116, 255, 0.15)', display: 'grid', placeItems: 'center', color: 'var(--pm-cyan)', fontWeight: 800, flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Activate Account & Connect Wallet</h4>
                  <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Register on PSEmine and enter your BNB Smart Chain wallet address on the activation page.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(104, 116, 255, 0.15)', display: 'grid', placeItems: 'center', color: 'var(--pm-cyan)', fontWeight: 800, flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Purchase & Deploy Mining Equipment</h4>
                  <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Browse available tools in the marketplace, generate a live BNB quote, complete the transaction, and submit your 0x transaction hash.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(104, 116, 255, 0.15)', display: 'grid', placeItems: 'center', color: 'var(--pm-cyan)', fontWeight: 800, flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Accrue Campaign Earnings in GBP</h4>
                  <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    Your combined tool capacity and referral boosts accrue earnings automatically around the clock. Check your dashboard to monitor your hourly output.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(104, 116, 255, 0.15)', display: 'grid', placeItems: 'center', color: 'var(--pm-cyan)', fontWeight: 800, flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>Campaign Close & Settlement</h4>
                  <p style={{ color: 'var(--pm-muted)', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                    When the 90-day campaign concludes, final accrued GBP balances are audited, converted to crypto according to campaign parameters, and dispatched to your configured payout wallet address.
                  </p>
                </div>
              </div>
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

export default PSEMineGuide;
