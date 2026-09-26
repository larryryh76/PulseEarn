import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import {
  PSELogo, campaignStatusView, gbpHour,
  toDateSafe, usePseDocumentTitle, useCampaignClock,
} from './pse';
import { NotificationBell } from './NotificationBell';

/**
 * Console sections (authenticated, enrolled). The authenticated application
 * NEVER links back to the public landing: the logo and every nav item resolve
 * inside the app. Leaving the product happens only through explicit sign-out.
 *
 * The Guide is deliberately NOT here: it is a secondary reference (field
 * manual) and is reached from the account menu and from contextual links, so
 * the primary navigation carries destinations only — never product state and
 * never documentation.
 */
const CONSOLE_NAV = [
  { to: '/mine/dashboard', label: 'Overview' },
  { to: '/mine/tools', label: 'Tools' },
  { to: '/mine/wallet', label: 'Wallet' },
  { to: '/mine/activity', label: 'Activity' },
  { to: '/mine/referrals', label: 'Referrals' },
];

/** PSEmine owns the document title on every one of its routes. */
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const isAuthed = Boolean(currentUser);
  const inConsole = isAuthed && hasPSEmineAccess;
  const isLanding = location.pathname === '/mine' || location.pathname === '/mine/';
  /* The public marketing surface owns its own masthead and footer. */
  const chrome = !isLanding || inConsole;

  usePseDocumentTitle(titleForPath(location.pathname));

  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  if (!chrome) return <Outlet />;

  return (
    <>
      <header>
        <Link to={inConsole ? '/mine/dashboard' : '/mine'} aria-label="PSEmine home">
          <PSELogo size={26} withWordmark />
        </Link>

        {inConsole && (
          <nav aria-label="PSEmine console">
            {CONSOLE_NAV.map(item => (
              <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
            ))}
          </nav>
        )}

        <div>
          {inConsole ? (
            <>
              <NotificationBell />
              <AccountMenu open={accountOpen} setOpen={setAccountOpen} ref={accountRef} />
            </>
          ) : isAuthed ? (
            <button type="button" onClick={() => void logout()}>
              Sign out
            </button>
          ) : (
            <>
              <Link to="/mine/login">Sign in</Link>
              <Link to="/mine/signup">Create account</Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? 'Close menu' : 'Open menu'}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-menu" aria-label="PSEmine mobile">
            {inConsole ? (
              <>
                {[...CONSOLE_NAV, { to: '/mine/me', label: 'Account' }, { to: '/mine/guide', label: 'Guide' }].map(item => (
                  <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
                ))}
                <Link to="/help">Support</Link>
                <button type="button" onClick={() => void logout()}>
                  Sign out
                </button>
              </>
            ) : isAuthed ? (
              <Link to="/mine/dashboard">Open console</Link>
            ) : (
              <>
                <Link to="/mine/login">Sign in</Link>
                <Link to="/mine/signup">Create account</Link>
              </>
            )}
          </nav>
        )}
      </header>

      <CampaignStatus inConsole={inConsole} />

      <main>
        <Outlet />
      </main>

      <footer>
        <PSELogo size={22} withWordmark />
        <nav aria-label="Footer">
          <Link to="/terms">Terms</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/help">Support</Link>
        </nav>
        <p>© {new Date().getFullYear()} PSEmine · 90-day campaign</p>
      </footer>
    </>
  );
};

/** Account dropdown (desktop). The Guide lives here, not in the primary nav. */
const AccountMenu = React.forwardRef<HTMLDivElement, { open: boolean; setOpen: (v: boolean) => void }>(
  ({ open, setOpen }, ref) => {
    const { userData, currentUser, logout } = usePSEMineAuth();
    const navigate = useNavigate();
    return (
      <div ref={ref}>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu">
          {(userData?.username || currentUser?.email || '?').slice(0, 1).toUpperCase()}
        </button>
        {open && (
          <div role="menu">
            <div>
              <p>{userData?.username || 'PSEmine miner'}</p>
              <p>{currentUser?.email}</p>
            </div>
            <Link to="/mine/me" role="menuitem">Account &amp; settings</Link>
            <Link to="/mine/guide" role="menuitem">Campaign guide</Link>
            <Link to="/help" role="menuitem">Support</Link>
            <button type="button" role="menuitem"
              onClick={async () => { await logout(); navigate('/mine/login'); }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  });
AccountMenu.displayName = 'AccountMenu';

/** Plain campaign facts from the backend state; no decorative rail or banner. */
const CampaignStatus: React.FC<{ inConsole: boolean }> = ({ inConsole }) => {
  const { state, campaignStatus, refreshing, refresh } = usePseState();
  const campaign = state?.campaign;
  const clock = useCampaignClock(campaign, campaignStatus);
  const view = campaignStatusView(campaignStatus);
  const capacity = state?.user?.totalCapacityGBPPerHour;
  const hasNonActiveState = Boolean(campaignStatus && campaignStatus !== 'active');

  if (!inConsole && !hasNonActiveState) return null;

  return (
    <section aria-label="Campaign status">
      <p>{view.label}</p>
      {hasNonActiveState && (
        <>
          <p>{view.headline}</p>
          <p>{view.detail}</p>
        </>
      )}
      {inConsole && (
        <>
          <p>Day {clock.dayNumber ?? '—'} / {clock.totalDays}</p>
          {clock.daysLeft !== null && <p>{clock.daysLeft}d left</p>}
          {typeof capacity === 'number' && <p>Capacity: {gbpHour(capacity)}</p>}
          <button type="button" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? 'Syncing' : 'Sync'}
          </button>
        </>
      )}
    </section>
  );
};

/* Kept exported for the routes that referenced the old helper. */
export { toDateSafe };

export default PSEMineShell;
