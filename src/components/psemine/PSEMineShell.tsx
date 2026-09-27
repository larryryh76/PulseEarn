/**
 * PSEmine shell — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The Duty & Ledger visual shell (product bar, campaign band, duty rail, tab
 * bar, account menu, notification bell) was purged in
 * `refactor(psemine): purge legacy design implementation`. This shell keeps the
 * product operational while the interface is rebuilt:
 *
 *   • the console routes still render inside it, unchanged and still guarded;
 *   • the campaign state and position are still visible (server-authoritative);
 *   • notifications are still readable and markable as read;
 *   • navigation between the console routes, and sign-out, still work.
 *
 * It deliberately renders no design system: no palette, no rail, no chrome.
 * Everything it consumes comes from the real providers (PSEMineAuth,
 * PSEMineContext, PseStateProvider) and the non-visual helpers in pseCore.ts.
 */
import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import {
  campaignStatusView, gbpHour, timeAgo, useCampaignClock, usePseDocumentTitle,
} from './pseCore';
import { PseButton, PseEmptyNote, PseSection } from './PseBasics';

/** Console sections. The Guide and Account are reached from the footer rows. */
const CONSOLE_NAV = [
  { to: '/mine/dashboard', label: 'Overview' },
  { to: '/mine/tools', label: 'Tools' },
  { to: '/mine/wallet', label: 'Wallet' },
  { to: '/mine/activity', label: 'Activity' },
  { to: '/mine/referrals', label: 'Referrals' },
  { to: '/mine/me', label: 'Account' },
  { to: '/mine/guide', label: 'Guide' },
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
  const { currentUser, hasPSEmineAccess } = usePSEMineAuth();

  const isAuthed = Boolean(currentUser);
  const inConsole = isAuthed && hasPSEmineAccess;
  const isLanding = location.pathname === '/mine' || location.pathname === '/mine/';
  /* The public surface owns its own masthead and footer; the product chrome is
     the console's and must not leak into it. */
  const chrome = !isLanding || inConsole;

  usePseDocumentTitle(titleForPath(location.pathname));

  if (!chrome) return <Outlet />;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 p-4">
          <Link to={inConsole ? '/mine/dashboard' : '/mine'} className="text-sm font-semibold text-text-primary">
            PSEmine
          </Link>

          {inConsole && (
            <nav aria-label="PSEmine console" className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {CONSOLE_NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `text-sm ${isActive ? 'font-semibold text-text-primary underline' : 'text-text-secondary'}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            {inConsole ? <SignOut /> : <Link to="/mine/login" className="text-sm text-text-secondary underline">Sign in</Link>}
          </div>
        </div>
      </header>

      {inConsole && <CampaignLine />}

      <main className="flex-1">
        <Outlet />
      </main>

      {inConsole ? <Notifications /> : <PublicFooter />}
    </div>
  );
};

/** Sign-out. Leaves the product; nothing else in the console links out to it. */
const SignOut: React.FC = () => {
  const { logout } = usePSEMineAuth();
  return (
    <PseButton onClick={() => void logout()}>Sign out</PseButton>
  );
};

/**
 * Campaign line — one operational line under the navigation.
 * Server-authoritative: status, day number, remaining days and capacity all come
 * from the backend state payload and the shared campaign clock.
 */
const CampaignLine: React.FC = () => {
  const { state, campaignStatus, refreshing, refresh } = usePseState();
  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const view = campaignStatusView(campaignStatus);
  const capacity = state?.user?.totalCapacityGBPPerHour;

  return (
    <div className="border-b border-border bg-surface-bright">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 p-3 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">Campaign: {view.label}</span>
        <span>{view.detail}</span>
        <span>
          {clock.dayNumber === null
            ? 'Campaign window not open'
            : `Day ${clock.dayNumber} of ${clock.totalDays}`}
          {clock.daysLeft !== null ? ` · ${clock.daysLeft} days remaining` : ''}
        </span>
        {typeof capacity === 'number' && <span>Capacity: {gbpHour(capacity)}</span>}
        <PseButton className="ml-auto" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Syncing…' : 'Sync'}
        </PseButton>
      </div>
    </div>
  );
};

/**
 * Notifications — the console's real notification records, as a plain list.
 * Rendered from usePseState (the same backend feed the purged bell read).
 */
const Notifications: React.FC = () => {
  const { notifications, unreadNotifications, markNotificationRead, refreshFeed } = usePseState();
  const shown = notifications.slice(0, 10);

  return (
    <div className="mx-auto w-full max-w-5xl p-4 pb-16">
      <PseSection
        title="Notifications"
        meta={
          <span>
            {unreadNotifications} unread ·{' '}
            <button type="button" className="underline" onClick={() => void refreshFeed('notifications')}>
              Refresh
            </button>
          </span>
        }
      >
        {shown.length === 0 ? (
          <PseEmptyNote>No notifications yet.</PseEmptyNote>
        ) : (
          <ul className="space-y-2 text-sm">
            {shown.map(n => (
              <li key={n.id} className="flex flex-wrap items-baseline gap-x-3 border-b border-border py-2">
                <span className={n.read ? 'text-text-secondary' : 'font-semibold text-text-primary'}>
                  {n.title || n.type || 'Notification'}
                </span>
                {n.message && <span className="text-text-secondary">{n.message}</span>}
                <span className="text-xs text-text-tertiary">{timeAgo(n.createdAt)}</span>
                {!n.read && (
                  <button
                    type="button"
                    className="ml-auto text-xs underline"
                    onClick={() => void markNotificationRead(n.id)}
                  >
                    Mark read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </PseSection>
    </div>
  );
};

const PublicFooter: React.FC = () => (
  <footer className="border-t border-border">
    <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 p-4 text-sm text-text-secondary">
      <span>PSEmine · 90-day mining campaign</span>
      <Link to="/terms" className="underline">Terms</Link>
      <Link to="/privacy" className="underline">Privacy</Link>
      <Link to="/help" className="underline">Support</Link>
    </div>
  </footer>
);
