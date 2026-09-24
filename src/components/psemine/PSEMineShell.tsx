import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Pickaxe, History, User, Layers, Wallet, Menu, X } from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import {
  PSELogo, campaignStatusView, campaignTone, Stamp, DutyRail, gbpHour,
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

/** Bottom bar on mobile: the four daily surfaces + account. */
const MOBILE_NAV = [
  { to: '/mine/dashboard', label: 'Overview', icon: Pickaxe },
  { to: '/mine/tools', label: 'Tools', icon: Layers },
  { to: '/mine/wallet', label: 'Wallet', icon: Wallet },
  { to: '/mine/activity', label: 'Activity', icon: History },
  { to: '/mine/me', label: 'Account', icon: User },
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
  /* The public marketing surface owns its own masthead and footer; the product
     bar is the console's chrome and must not leak into it. */
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
    <div className="pse-scope pse-shell">
      {/* ── Product bar: destinations only ── */}
      <header className="pse-bar">
        <div className="pse-gut mx-auto flex w-full max-w-[1180px]">
          <div className="pse-bar-row w-full">
            <Link to={inConsole ? '/mine/dashboard' : '/mine'} aria-label="PSEmine home" className="pse-mark">
              <PSELogo size={26} withWordmark />
            </Link>

            {inConsole && (
              <nav className="pse-nav" aria-label="PSEmine console">
                {CONSOLE_NAV.map(item => (
                  <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
                ))}
              </nav>
            )}

            <div className="pse-bar-actions">
              {inConsole ? (
                <>
                  <div className="hidden md:block"><NotificationBell /></div>
                  <AccountMenu open={accountOpen} setOpen={setAccountOpen} ref={accountRef} />
                </>
              ) : isAuthed ? (
                <button type="button" onClick={() => void logout()} className="pse-btn pse-btn-3 pse-btn-sm">
                  Sign out
                </button>
              ) : (
                <>
                  <Link to="/mine/login" className="pse-btn pse-btn-3 pse-btn-sm">Sign in</Link>
                  <Link to="/mine/signup" className="pse-btn pse-btn-sm">Create account</Link>
                </>
              )}
              <button
                type="button"
                className="pse-burger"
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
                aria-controls="pse-mobile-menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                {menuOpen
                  ? <X size={16} aria-hidden="true" />
                  : <Menu size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div id="pse-mobile-menu" className="pse-sheet">
            <nav className="mx-auto w-full max-w-[1180px]" aria-label="PSEmine mobile">
              {inConsole ? (
                <>
                  {[...CONSOLE_NAV, { to: '/mine/me', label: 'Account' }, { to: '/mine/guide', label: 'Guide' }].map(item => (
                    <NavLink key={item.to} to={item.to}>{item.label}</NavLink>
                  ))}
                  <Link to="/help">Support</Link>
                  <button type="button" onClick={() => void logout()} className="pse-red" style={{ background: 'none', border: 0, textAlign: 'left', minHeight: 46, padding: '0 var(--pse-gutter)', font: 'inherit', fontSize: 14, cursor: 'pointer' }}>
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
          </div>
        )}
      </header>

      {/* ── Campaign band: THE one place campaign state and position live ──
          State stamp, the canonical 90-day duty rail, the day count and the
          capacity figure. No page draws a second campaign countdown. */}
      {inConsole && <CampaignBand />}

      <CampaignStateBanner />

      <main className={`mx-auto w-full max-w-[1180px] flex-1 ${inConsole ? 'pse-canvas-bottom pse-work' : ''}`}>
        <Outlet />
      </main>

      {/* ── Mobile primary navigation ── */}
      {inConsole && (
        <nav className="pse-tabbar" aria-label="Primary mobile">
          <div className="pse-tabbar-row">
            {MOBILE_NAV.map(item => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to}>
                  <Icon size={17} aria-hidden="true" />
                  <span className="pse-tabbar-label">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {!inConsole && (
        <footer className="pse-foot">
          <div className="pse-gut mx-auto flex w-full max-w-[1180px] flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <PSELogo size={22} withWordmark />
            <nav className="flex flex-wrap items-center gap-x-5" aria-label="Footer">
              <Link to="/terms" className="pse-meta">Terms</Link>
              <Link to="/privacy" className="pse-meta">Privacy</Link>
              <Link to="/help" className="pse-meta">Support</Link>
            </nav>
            <p className="pse-np">© {new Date().getFullYear()} PSEmine · 90-day campaign</p>
          </div>
        </footer>
      )}
    </div>
  );
};

/**
 * CampaignBand — one operational line under the product bar.
 * Server-authoritative: the rail, day number, remaining days and capacity all
 * come from the backend state payload and the shared campaign clock.
 */
const CampaignBand: React.FC = () => {
  const { state, campaignStatus, refreshing, refresh } = usePseState();
  const campaign = state?.campaign;
  const clock = useCampaignClock(campaign, campaignStatus);
  const view = campaignStatusView(campaignStatus);
  const capacity = state?.user?.totalCapacityGBPPerHour;

  return (
    <div className="pse-band">
      <div className="pse-gut mx-auto flex w-full max-w-[1180px]">
        <div className="pse-band-row w-full">
          <Stamp tone={campaignTone(campaignStatus)} pulse={view.live} glyph="●">{view.label.trim()}</Stamp>

          <div className="pse-band-duty">
            <DutyRail campaign={campaign} status={campaignStatus} density="compact" />
          </div>

          <span className="pse-band-fact">
            <span className="pse-np">Day</span>
            <b className="pse-n pse-bone">
              {clock.dayNumber ?? '—'}
            </b>
            <span className="pse-np-2">/ {clock.totalDays}</span>
          </span>
          {clock.daysLeft !== null && (
            <span className="pse-band-fact pse-dim-3">{clock.daysLeft}d left</span>
          )}

          <span className="flex items-center gap-4" style={{ marginLeft: 'auto' }}>
            {typeof capacity === 'number' && (
              <span className="pse-band-fact">
                <span className="pse-np">Capacity</span>
                <b className="pse-n pse-jade">{gbpHour(capacity)}</b>
              </span>
            )}
            <button type="button" onClick={() => void refresh()} disabled={refreshing} className="pse-btn pse-btn-3 pse-btn-sm">
              <span className="pse-np pse-np-bone">{refreshing ? 'Syncing' : 'Sync'}</span>
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

/** Account dropdown (desktop). The Guide lives here, not in the primary nav. */
const AccountMenu = React.forwardRef<HTMLDivElement, { open: boolean; setOpen: (v: boolean) => void }>(
  ({ open, setOpen }, ref) => {
    const { userData, currentUser, logout } = usePSEMineAuth();
    const navigate = useNavigate();
    return (
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
          className="pse-btn pse-btn-3 pse-btn-sm" aria-label="Account menu">
          <span className="pse-np pse-np-bone">
            {(userData?.username || currentUser?.email || '?').slice(0, 1).toUpperCase()}
          </span>
        </button>
        {open && (
          <div role="menu" className="pse-menu">
            <div className="pse-rule-row" style={{ padding: '12px 14px', borderBottom: '1px solid var(--pse-line)' }}>
              <p className="pse-label-b truncate">{userData?.username || 'PSEmine miner'}</p>
              <p className="pse-meta truncate">{currentUser?.email}</p>
            </div>
            <Link to="/mine/me" role="menuitem">Account &amp; settings</Link>
            <Link to="/mine/guide" role="menuitem">Campaign guide</Link>
            <Link to="/help" role="menuitem">Support</Link>
            <button type="button" role="menuitem" className="pse-red"
              onClick={async () => { await logout(); navigate('/mine/login'); }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  });
AccountMenu.displayName = 'AccountMenu';

/**
 * Campaign-state banner for every non-active backend state (scheduled, paused,
 * settling, payout, closed, archived). Wording is the shared campaign view, so
 * the band and the banner can never disagree.
 */
const CampaignStateBanner: React.FC = () => {
  const { campaignStatus } = usePseState();
  if (!campaignStatus) return null;
  if (campaignStatus === 'active') return null;
  const view = campaignStatusView(campaignStatus);
  return (
    <div className="pse-gut mx-auto w-full max-w-[1180px] pt-4">
      <div className="pse-attn" data-tone={campaignStatus === 'paused' ? 'attn' : 'info'}>
        <div className="pse-attn-body">
          <p className="pse-label-b">{view.headline}</p>
          <p className="pse-meta mt-1">{view.detail}</p>
        </div>
        <span className="pse-np">Backend state</span>
      </div>
    </div>
  );
};

/* Kept exported for the routes that referenced the old helper. */
export { toDateSafe };

export default PSEMineShell;
