import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Pickaxe, History, Users, User, Menu, X, LogOut } from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import { PSELogo, Chip, CampaignBanner, campaignStatusView } from './pse';
import { NotificationBell } from './NotificationBell';
import { cn } from '../../utils';

const AUTH_NAV = [
  { to: '/mine/dashboard', label: 'Mine', icon: Pickaxe },
  { to: '/mine/activity', label: 'Activity', icon: History },
  { to: '/mine/referrals', label: 'Referrals', icon: Users },
  { to: '/mine/me', label: 'Account', icon: User },
];

export const PSEMineShell: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout } = usePSEMineAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isAuthed = Boolean(currentUser);

  return (
    <div className="pse-scope flex min-h-screen flex-col" style={{ background: 'var(--pse-bg)' }}>
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ borderColor: 'var(--pse-line)', background: 'rgba(10,14,20,0.82)' }}>
        <div className="pse-section flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/mine" aria-label="PSEmine home" className="flex items-center">
              <PSELogo size={30} withWordmark />
            </Link>
            {isAuthed && <NavStatus />}
          </div>

          {/* Mobile: notification entry point (FIX 2) — always visible in the
              header so notification events are reachable on small screens. */}
          {isAuthed && (
            <div className="ml-auto flex items-center gap-1 md:hidden">
              <NotificationBell variant="mobile" />
              <button
                type="button"
                className="rounded-lg p-2.5"
                onClick={() => setMenuOpen(v => !v)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                style={{ color: 'var(--pse-text-2)' }}
              >
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>
          )}

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {isAuthed ? (
              <>
                <NotificationBell />
                <NavLink to="/mine/dashboard" className={({ isActive }) => cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'text-[#F2F4F7]' : 'text-[#98A2B3] hover:text-[#F2F4F7]')}
                  style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  Mine
                </NavLink>
                <NavLink to="/mine/tools" className={({ isActive }) => cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'text-[#F2F4F7]' : 'text-[#98A2B3] hover:text-[#F2F4F7]')}
                  style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  Tools
                </NavLink>
                <NavLink to="/mine/wallet" className={({ isActive }) => cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'text-[#F2F4F7]' : 'text-[#98A2B3] hover:text-[#F2F4F7]')}
                  style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  Wallet
                </NavLink>
                <NavLink to="/mine/activity" className={({ isActive }) => cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'text-[#F2F4F7]' : 'text-[#98A2B3] hover:text-[#F2F4F7]')}
                  style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  Activity
                </NavLink>
                <NavLink to="/mine/referrals" className={({ isActive }) => cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'text-[#F2F4F7]' : 'text-[#98A2B3] hover:text-[#F2F4F7]')}
                  style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  Referrals
                </NavLink>
                <NavLink to="/mine/me" className={({ isActive }) => cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive ? 'text-[#F2F4F7]' : 'text-[#98A2B3] hover:text-[#F2F4F7]')}
                  style={({ isActive }) => isActive ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                  Account
                </NavLink>
                <button
                  type="button"
                  onClick={() => { void logout(); }}
                  className="pse-btn pse-btn-ghost pse-btn-sm ml-1"
                  aria-label="Sign out of PSEmine"
                >
                  <LogOut size={13} /> <span className="hidden lg:inline">Sign out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/mine/guide" className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#98A2B3] transition-colors hover:text-[#F2F4F7]">
                  Guide
                </Link>
                <Link to="/mine/login" className="pse-btn pse-btn-ghost pse-btn-sm">Sign in</Link>
                <Link to="/mine/signup" className="pse-btn pse-btn-primary pse-btn-sm">Get started</Link>
              </>
            )}
          </nav>


        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t md:hidden" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-bg)' }}>
            <nav className="pse-section flex flex-col gap-1 py-3" aria-label="Mobile">
              {isAuthed ? (
                <>
                  {[{ to: '/mine/dashboard', label: 'Mine' }, { to: '/mine/tools', label: 'Tools' },
                    { to: '/mine/wallet', label: 'Wallet' }, { to: '/mine/activity', label: 'Activity' },
                    { to: '/mine/referrals', label: 'Referrals' }, { to: '/mine/me', label: 'Account' }].map(i => (
                    <Link key={i.to} to={i.to} className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#98A2B3] hover:bg-white/5 hover:text-white">
                      {i.label}
                    </Link>
                  ))}
                  <button type="button" onClick={() => { void logout(); }}
                    className="mt-1 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-[#F87171] hover:bg-white/5">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/mine/guide" className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#98A2B3]">Guide</Link>
                  <Link to="/mine/login" className="rounded-lg px-3 py-2.5 text-[14px] font-medium text-[#98A2B3]">Sign in</Link>
                  <Link to="/mine/signup" className="pse-btn pse-btn-primary mt-1 justify-center">Get started</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Campaign-state banner (all non-active states) */}
      <ShellBanner />

      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="mt-16 border-t" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <PSELogo size={24} withWordmark />
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label="Footer">
            <Link to="/mine/guide" className="pse-micro hover:text-[#F2F4F7]">Guide</Link>
            <Link to="/terms" className="pse-micro hover:text-[#F2F4F7]">Terms</Link>
            <Link to="/privacy" className="pse-micro hover:text-[#F2F4F7]">Privacy</Link>
            <Link to="/help" className="pse-micro hover:text-[#F2F4F7]">Support</Link>
          </nav>
          <p className="pse-micro">© {new Date().getFullYear()} PSEmine · 90-day campaign mining</p>
        </div>
      </footer>

      {/* ── Bottom nav (authenticated, mobile) ── */}
      {isAuthed && (
        <nav
          aria-label="Primary mobile"
          className="pse-safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl md:hidden"
          style={{ borderColor: 'var(--pse-line)', background: 'rgba(10,14,20,0.92)' }}
        >
          <div className="mx-auto flex h-14 max-w-md items-stretch justify-around px-2">
            {AUTH_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} to={item.to} className="flex flex-1 flex-col items-center justify-center gap-1">
                  {({ isActive }) => (
                    <>
                      <span className="flex h-6 w-10 items-start justify-center">
                        {isActive && <span className="h-0.5 w-7 rounded-full" style={{ background: 'var(--pse-blue)' }} />}
                      </span>
                      <Icon size={18} style={{ color: isActive ? 'var(--pse-blue)' : 'var(--pse-text-3)' }} />
                      <span className="text-[10px] font-semibold" style={{ color: isActive ? 'var(--pse-blue)' : 'var(--pse-text-3)' }}>
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
    </div>
  );
};

/** Campaign status chip in the navbar, driven by backend state only. */
const NavStatus: React.FC = () => {
  const { campaignStatus } = usePseState();
  if (!campaignStatus) return null;
  const view = campaignStatusView(campaignStatus);
  return <Chip label={view.label} chip={view.chip} pulse={view.live} />;
};

/** Campaign-state banner under the navbar (all non-active states). */
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
