import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import { campaignStatusView, nowMs, toDateSafe, gbpHour, usePseDocumentTitle } from './pse';

/** Console sections (authenticated, enrolled). */
const CONSOLE_NAV = [
  { to: '/mine/dashboard', label: 'Overview' },
  { to: '/mine/tools', label: 'Tools' },
  { to: '/mine/wallet', label: 'Wallet' },
  { to: '/mine/activity', label: 'Activity' },
  { to: '/mine/referrals', label: 'Referrals' },
];

/**
 * PSEmine owns the document title on every one of its routes.
 *
 * Verified defect: /mine/* previously reported "PulseEarn | Professional Crypto
 * Rewards & Forecasting Hub" in the tab, browser history and bookmarks, so a
 * PSEmine session presented itself as the other product.
 */
const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/mine\/dashboard/, 'Mining console'],
  [/^\/mine\/tools/, 'Mining tools'],
  [/^\/mine\/wallet/, 'Wallet & payouts'],
  [/^\/mine\/referrals/, 'Referrals'],
  [/^\/mine\/activity/, 'Activity'],
  [/^\/mine\/guide\/onboarding/, 'Onboarding'],
  [/^\/mine\/guide/, 'Campaign guide'],
  [/^\/mine\/me/, 'Account'],
  [/^\/mine\/login/, 'Sign in'],
  [/^\/mine\/signup/, 'Create account'],
  [/^\/mine\/forgot-password/, 'Reset password'],
  [/^\/mine\/verify-email/, 'Verify email'],
  [/^\/mine/, '90-day mining campaign'],
];

function titleForPath(pathname: string): string {
  return ROUTE_TITLES.find(([re]) => re.test(pathname))?.[1] ?? '90-day mining campaign';
}

export const PSEMineShell: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout, hasPSEmineAccess } = usePSEMineAuth();

  usePseDocumentTitle(titleForPath(location.pathname));

  const isAuthed = Boolean(currentUser);
  const inConsole = isAuthed && hasPSEmineAccess;

  return (
    <div className="pse-scope flex min-h-screen flex-col">
      {/* ── Functional product bar ── */}
      <header className="sticky top-0 z-40 border-b" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-bg)' }}>
        <div className="pse-section flex h-14 items-center gap-3">
          <Link to="/mine" aria-label="PSEmine home" className="font-bold no-underline">
            PSE<span style={{ color: 'var(--pse-blue)' }}>mine</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="ml-auto hidden items-center gap-4 md:flex" aria-label="PSEmine console">
            {inConsole ? (
              <>
                <NavStatus />
                {CONSOLE_NAV.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `text-[14px] no-underline ${isActive ? 'font-bold' : ''}`}
                    style={({ isActive }) => ({ color: isActive ? 'var(--pse-text)' : 'var(--pse-text-2)' })}>
                    {item.label}
                  </NavLink>
                ))}
                <NavLink to="/mine/guide"
                  className={({ isActive }) => `text-[14px] no-underline ${isActive ? 'font-bold' : ''}`}
                  style={({ isActive }) => ({ color: isActive ? 'var(--pse-text)' : 'var(--pse-text-2)' })}>
                  Guide
                </NavLink>
                <NavLink to="/mine/me"
                  className={({ isActive }) => `text-[14px] no-underline ${isActive ? 'font-bold' : ''}`}
                  style={({ isActive }) => ({ color: isActive ? 'var(--pse-text)' : 'var(--pse-text-2)' })}>
                  Account
                </NavLink>
                <span style={{ color: 'var(--pse-text-3)' }}>·</span>
                <button type="button" onClick={() => void logout()} className="pse-btn pse-btn-sm">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/mine/guide" className="text-[14px] no-underline" style={{ color: 'var(--pse-text-2)' }}>
                  How it works
                </Link>
                {isAuthed ? (
                  <>
                    <button type="button" onClick={() => void logout()} className="pse-btn pse-btn-sm">Sign out</button>
                    <Link to="/mine/dashboard" className="pse-btn pse-btn-primary pse-btn-sm no-underline">Open console</Link>
                  </>
                ) : (
                  <>
                    <Link to="/mine/login" className="pse-btn pse-btn-sm no-underline">Sign in</Link>
                    <Link to="/mine/signup" className="pse-btn pse-btn-primary pse-btn-sm no-underline">Create account</Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Mobile actions */}
          <div className="ml-auto flex items-center gap-1 md:hidden">
            {inConsole && <MobileCampaignStatus />}
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* Console strip: campaign phase + progress (enrolled sessions only) */}
      {inConsole && <ConsoleBar />}

      {/* Campaign-state banner for every non-active state */}
      <ShellBanner />

      <main className="pse-content-bottom flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
          <Link to="/mine" className="font-bold no-underline">PSE<span style={{ color: 'var(--pse-blue)' }}>mine</span></Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label="Footer">
            <Link to="/mine/guide">Guide</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/help">Support</Link>
          </nav>
          <p className="pse-micro">© {new Date().getFullYear()} PSEmine · 90-day campaign mining</p>
        </div>
      </footer>
    </div>
  );
};

/** Campaign status chip in the product bar, driven by backend state only. */
const NavStatus: React.FC = () => {
  const { campaignStatus } = usePseState();
  if (!campaignStatus) return null;
  const view = campaignStatusView(campaignStatus);
  return (
    <span className="pse-micro" style={{ color: 'var(--pse-text-3)' }}>
      Campaign: {view.label.trim()}
    </span>
  );
};

/** Compact campaign label for the mobile header (no popover affordances). */
const MobileCampaignStatus: React.FC = () => {
  const { campaignStatus } = usePseState();
  if (!campaignStatus) return null;
  return (
    <span className="pse-micro" style={{ color: 'var(--pse-text-3)' }}>
      {campaignStatusView(campaignStatus).label.trim()}
    </span>
  );
};

/** Mobile navigation — a plain collapsible list (functional, not styled). */
const MobileMenu: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { currentUser, logout, hasPSEmineAccess } = usePSEMineAuth();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isAuthed = Boolean(currentUser);
  const inConsole = isAuthed && hasPSEmineAccess;

  return (
    <>
      <button
        type="button"
        className="pse-btn pse-btn-sm"
        onClick={() => setMenuOpen(v => !v)}
        aria-expanded={menuOpen}
        aria-controls="pse-mobile-menu"
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
      >
        {menuOpen ? 'Close' : 'Menu'}
      </button>
      {menuOpen && (
        <div id="pse-mobile-menu" className="fixed inset-x-0 top-14 z-50 border-b" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-bg)' }}>
          <nav className="pse-section flex flex-col gap-1 py-3" aria-label="PSEmine mobile">
            {inConsole ? (
              <>
                {[...CONSOLE_NAV, { to: '/mine/me', label: 'Account' }, { to: '/mine/guide', label: 'Guide' }].map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => `no-underline ${isActive ? 'font-bold' : ''}`}
                    style={{ color: 'var(--pse-text)' }}>
                    {item.label}
                  </NavLink>
                ))}
                <div className="my-1 h-px" style={{ background: 'var(--pse-line)' }} />
                <Link to="/help">Support</Link>
                <button type="button" onClick={() => void logout()} className="pse-btn pse-btn-sm self-start">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/mine/guide">How it works</Link>
                {isAuthed ? (
                  <Link to="/mine/dashboard" className="pse-btn pse-btn-primary self-start no-underline">Open console</Link>
                ) : (
                  <>
                    <Link to="/mine/login">Sign in</Link>
                    <Link to="/mine/signup" className="pse-btn pse-btn-primary self-start no-underline">Create account</Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
};

/**
 * ConsoleBar — thin functional strip: campaign day/progress and sync.
 * Data logic preserved verbatim from the designed shell.
 */
const ConsoleBar: React.FC = () => {
  const { state, campaignStatus, refreshing, refresh } = usePseState();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const view = campaignStatusView(campaignStatus);
  const c = state?.campaign;

  const { dayNumber, totalDays, daysLeft, progress } = useMemo(() => {
    const total = c?.durationDays && c.durationDays > 0 ? c.durationDays : 90;
    const start = toDateSafe(c?.startAt)?.getTime();
    const end = toDateSafe(c?.endAt)?.getTime();
    const now = nowMs();
    const day = typeof start === 'number'
      ? Math.min(total, Math.max(1, Math.floor((now - start) / 86_400_000) + 1))
      : null;
    const left = typeof end === 'number' ? Math.max(0, Math.ceil((end - now) / 86_400_000)) : null;
    return { dayNumber: day, totalDays: total, daysLeft: left, progress: day ? (day / total) * 100 : 0 };
  }, [c?.durationDays, c?.startAt, c?.endAt]);

  const capacity = state?.user?.totalCapacityGBPPerHour;

  return (
    <div className="border-b" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
      <div className="pse-section flex items-center gap-3 py-2">
        <span className="pse-micro">
          {view.label.trim()}
          {view.live && dayNumber !== null ? ` · Day ${dayNumber}/${totalDays} (${Math.round(progress)}%)` : ''}
          {daysLeft !== null && view.live ? ` · ${daysLeft}d left` : ''}
        </span>
        {typeof capacity === 'number' && (
          <span className="pse-micro">Capacity {gbpHour(capacity)}</span>
        )}
        <button type="button" onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-sm ml-auto">
          {refreshing ? 'Syncing…' : 'Sync'}
        </button>
      </div>
    </div>
  );
};

/** Campaign-state banner under the product bar (all non-active states). */
const ShellBanner: React.FC = () => {
  const { state, campaignStatus } = usePseState();
  if (!campaignStatus) return null;
  const view = campaignStatusView(campaignStatus);
  // Only surface the banner when the campaign is non-active; when the state
  // provider is still loading we stay quiet to avoid flashing a false state.
  if (view.live) return null;
  if (!state && view.label.trim() === 'Scheduled') return null;
  return (
    <div className="border-b px-4 py-2" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-inset)' }}>
      <div className="pse-section">
        <p className="pse-caption">
          <strong>{view.headline}</strong> {view.detail}
        </p>
      </div>
    </div>
  );
};

export default PSEMineShell;
