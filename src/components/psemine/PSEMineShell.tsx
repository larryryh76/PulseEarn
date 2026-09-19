import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Pickaxe, History, Users, User, Layers, Wallet, BookOpen, Gauge } from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import { PSELogo, Chip, CampaignBanner, campaignStatusView, Meter, nowMs, toDateSafe, gbpHour, usePseDocumentTitle } from './pse';
import { NotificationBell } from './NotificationBell';
import { cn } from '../../utils';

/**
 * Console sections (authenticated, enrolled). The authenticated application
 * NEVER links back to the public landing: the logo and every nav item resolve
 * inside the app. Leaving the product happens only through explicit sign-out.
 */
const CONSOLE_NAV = [
  { to: '/mine/dashboard', label: 'Overview', icon: Pickaxe },
  { to: '/mine/tools', label: 'Tools', icon: Layers },
  { to: '/mine/wallet', label: 'Wallet', icon: Wallet },
  { to: '/mine/activity', label: 'Activity', icon: History },
  { to: '/mine/referrals', label: 'Referrals', icon: Users },
];

/** Bottom bar on mobile (wallet-app pattern): the four daily surfaces + account. */
const MOBILE_NAV = [
  { to: '/mine/dashboard', label: 'Overview', icon: Pickaxe },
  { to: '/mine/tools', label: 'Tools', icon: Layers },
  { to: '/mine/wallet', label: 'Wallet', icon: Wallet },
  { to: '/mine/activity', label: 'Activity', icon: History },
  { to: '/mine/me', label: 'Account', icon: User },
];

/**
 * PSEmine owns the document title on every one of its routes.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

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

  const isAuthed = Boolean(currentUser);
  const inConsole = isAuthed && hasPSEmineAccess;

  return (
    <div className="pse-scope flex min-h-screen flex-col">
      {/* ── Product bar ── */}
      <header className="sticky top-0 z-40 border-b" style={{ borderColor: 'var(--pse-line)', background: 'color-mix(in srgb, var(--pse-bg) 88%, transparent)', backdropFilter: 'blur(10px)' }}>
        <div className="pse-section flex h-14 items-center gap-3">
          {/* In console the mark stays inside the application. */}
          <Link to={inConsole ? '/mine/dashboard' : '/mine'} aria-label="PSEmine home" className="flex shrink-0 items-center">
            <PSELogo size={30} withWordmark />
          </Link>

          {inConsole && <div className="hidden sm:block"><NavStatus /></div>}

          {/* Desktop navigation */}
          <nav className="ml-auto hidden items-center gap-0.5 md:flex" aria-label="PSEmine console">
            {inConsole ? (
              <>
                {CONSOLE_NAV.map(item => (
                  <NavLink key={item.to} to={item.to}
                    className={({ isActive }) => cn(
                      'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                      isActive ? 'text-[var(--pse-text)]' : 'text-[var(--pse-text-3)] hover:text-[var(--pse-text-2)]',
                    )}
                    style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                    {item.label}
                  </NavLink>
                ))}
                <NavLink to="/mine/guide"
                  className={({ isActive }) => cn(
                    'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                    isActive ? 'text-[var(--pse-text)]' : 'text-[var(--pse-text-3)] hover:text-[var(--pse-text-2)]',
                  )}>
                  Guide
                </NavLink>
                <div className="mx-1 h-5 w-px" style={{ background: 'var(--pse-line)' }} />
                <NotificationBell />
                <AccountMenu open={accountOpen} setOpen={setAccountOpen} ref={accountRef} />
              </>
            ) : (
              <>
                {isAuthed ? (
                  <button type="button" onClick={() => void logout()}
                    className="pse-btn pse-btn-ghost pse-btn-sm">
                    Sign out
                  </button>
                ) : (
                  <>
                    <Link to="/mine/login" className="pse-btn pse-btn-ghost pse-btn-sm">Sign in</Link>
                    <Link to="/mine/signup" className="pse-btn pse-btn-primary pse-btn-sm">Create account</Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Mobile actions */}
          <div className="ml-auto flex items-center gap-1 md:hidden">
            {inConsole && <NotificationBell variant="mobile" />}
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg"
              onClick={() => setMenuOpen(v => !v)}
              aria-expanded={menuOpen}
              aria-controls="pse-mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              style={{ color: 'var(--pse-text-2)' }}
            >
              <span className="pse-micro font-bold uppercase tracking-widest">{menuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div id="pse-mobile-menu" className="border-t md:hidden" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-bg)' }}>
            <nav className="pse-section flex flex-col gap-1 py-3" aria-label="PSEmine mobile">
              {inConsole ? (
                <>
                  {[...CONSOLE_NAV, { to: '/mine/me', label: 'Account', icon: User }, { to: '/mine/guide', label: 'Guide', icon: BookOpen }].map(item => (
                    <NavLink key={item.to} to={item.to}
                      className={({ isActive }) => cn('rounded-lg px-3 py-2.5 text-[14px] font-medium', isActive ? 'text-white' : 'text-[var(--pse-text-2)]')}
                      style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                      {item.label}
                    </NavLink>
                  ))}
                  <div className="my-1 h-px" style={{ background: 'var(--pse-line)' }} />
                  <Link to="/help" className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-[var(--pse-text-2)]">Support</Link>
                  <button type="button" onClick={() => void logout()}
                    className="rounded-lg px-3 py-2.5 text-left text-[14px] font-medium" style={{ color: 'var(--pse-danger)' }}>
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  {isAuthed ? (
                    <Link to="/mine/dashboard" className="pse-btn pse-btn-primary mt-1 justify-center">Open console</Link>
                  ) : (
                    <>
                      <Link to="/mine/login" className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-[var(--pse-text-2)]">Sign in</Link>
                      <Link to="/mine/signup" className="pse-btn pse-btn-primary mt-1 justify-center">Create account</Link>
                    </>
                  )}
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Console strip: campaign phase + progress (enrolled sessions only) */}
      {inConsole && <ConsoleBar />}

      {/* Campaign-state banner for every non-active state */}
      <ShellBanner />

      <main className={`pse-content-bottom flex-1 ${inConsole ? 'pse-workbench' : ''}`}>
        <Outlet />
      </main>

      {/* Bottom navigation (mobile, enrolled sessions only) */}
      {inConsole && (
        <nav aria-label="Primary mobile"
          className="pse-safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t md:hidden"
          style={{ borderColor: 'var(--pse-line)', background: 'color-mix(in srgb, var(--pse-bg) 94%, transparent)', backdropFilter: 'blur(12px)' }}>
          <div className="mx-auto flex h-14 max-w-md items-stretch justify-around px-1">
            {MOBILE_NAV.map(item => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
                  {({ isActive }) => (
                    <>
                      <span className="flex h-1 w-8 items-center">
                        {isActive && <span className="h-0.5 w-7 rounded-full" style={{ background: 'var(--pse-blue)' }} />}
                      </span>
                      <Icon size={17} style={{ color: isActive ? 'var(--pse-blue)' : 'var(--pse-text-3)' }} />
                      <span className="truncate text-[10px] font-semibold" style={{ color: isActive ? 'var(--pse-blue)' : 'var(--pse-text-3)' }}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {/* Public footer only on the public surface */}
      {!inConsole && (
        <footer className="mt-16 border-t" style={{ borderColor: 'var(--pse-line)' }}>
          <div className="pse-section flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
            <PSELogo size={24} withWordmark />
            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1" aria-label="Footer">
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/help">Support</Link>
            </nav>
            <p className="pse-micro">© {new Date().getFullYear()} PSEmine · 90-day campaign mining</p>
          </div>
        </footer>
      )}
    </div>
  );
};

/** Campaign status chip in the product bar, driven by backend state only. */
const NavStatus: React.FC = () => {
  const { campaignStatus } = usePseState();
  if (!campaignStatus) return null;
  const view = campaignStatusView(campaignStatus);
  return <Chip label={view.label} chip={view.chip} pulse={view.live} />;
};

/**
 * ConsoleBar — a thin operational strip under the product bar.
 * Data logic preserved verbatim.
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
      <div className="pse-section flex items-center gap-3 overflow-x-auto pse-no-scrollbar py-2.5">
        <Chip label={view.label} chip={view.chip} pulse={view.live} />

        {view.live && dayNumber !== null ? (
          <div className="hidden min-w-[190px] items-center gap-2.5 sm:flex">
            <Meter value={progress} label="Campaign progress" />
            <span className="pse-micro whitespace-nowrap">
              Day <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{dayNumber}</span> / {totalDays}
              {daysLeft !== null ? ` · ${daysLeft}d left` : ''}
            </span>
          </div>
        ) : (
          <span className="pse-micro hidden truncate sm:block">{view.detail}</span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {typeof capacity === 'number' && (
            <span className="pse-micro flex items-center gap-1.5 whitespace-nowrap">
              <Gauge size={12} style={{ color: 'var(--pse-cyan)' }} />
              Capacity <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(capacity)}</span>
            </span>
          )}
          <button type="button" onClick={() => void refresh()} disabled={refreshing}
            className="pse-micro whitespace-nowrap font-medium hover:underline" style={{ color: 'var(--pse-blue)' }}>
            {refreshing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Account dropdown (desktop). */
const AccountMenu = React.forwardRef<HTMLDivElement, { open: boolean; setOpen: (v: boolean) => void }>(
  ({ open, setOpen }, ref) => {
    const { userData, currentUser, logout } = usePSEMineAuth();
    const navigate = useNavigate();
    return (
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: 'rgba(76,158,248,0.14)', color: 'var(--pse-blue)', border: '1px solid rgba(76,158,248,0.3)' }}>
            {(userData?.username || currentUser?.email || '?').slice(0, 1).toUpperCase()}
          </span>
        </button>
        {open && (
          <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border shadow-2xl"
            style={{ borderColor: 'var(--pse-line-strong)', background: 'var(--pse-surface)' }}>
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--pse-line)' }}>
              <p className="pse-caption truncate font-semibold" style={{ color: 'var(--pse-text)' }}>
                {userData?.username || 'PSEmine miner'}
              </p>
              <p className="pse-micro truncate">{currentUser?.email}</p>
            </div>
            <div className="py-1">
              {[
                { to: '/mine/me', label: 'Account & settings' },
                { to: '/mine/guide', label: 'Campaign guide' },
                { to: '/help', label: 'Support' },
              ].map(item => (
                <Link key={item.to} to={item.to} role="menuitem"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-[var(--pse-text-2)] hover:bg-white/5 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="border-t py-1" style={{ borderColor: 'var(--pse-line)' }}>
              <button type="button" role="menuitem"
                onClick={async () => { await logout(); navigate('/mine/login'); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px]" style={{ color: 'var(--pse-danger)' }}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    );
  });
AccountMenu.displayName = 'AccountMenu';

/** Campaign-state banner under the product bar (all non-active states). */
const ShellBanner: React.FC = () => {
  const { campaignStatus } = usePseState();
  if (!campaignStatus) return null;
  return (
    <div className="pse-section pt-4">
      <CampaignBanner status={campaignStatus} />
    </div>
  );
};

export default PSEMineShell;
