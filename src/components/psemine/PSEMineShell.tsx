/**
 * PSEmine console shell — the authenticated product's chrome.
 *
 * One bar, one campaign strip, one stage, one foot. The bar carries the product
 * identity and the six console sections with the current one marked; the strip
 * carries the campaign's position on every console route, because "what is the
 * campaign doing and what is this account's capacity" is the context every other
 * figure on the page is read against; the foot carries the product's documents
 * once, at the end of the product, rather than repeating legal links on each
 * page.
 *
 * WHAT THE STRIP IS ALLOWED TO SAY. Only what the backend reports: the campaign
 * status, the day inside the campaign's real window, and the account's real
 * capacity. While the campaign read is still in flight it says so rather than
 * defaulting to "Scheduled" — an unknown status printed as a known one is the
 * quietest way a console can lie.
 *
 * THE GUIDE IS AN OVERLAY, NOT A PAGE. `/mine/guide` and
 * `/mine/guide/onboarding` render the console and open the guide's plate over
 * it, so learning the product never takes the reader away from the product and
 * finishing onboarding reveals the console already in place behind it.
 *
 * NOTIFICATIONS ARE A SHEET, NOT A ROUTE. The notification ledger opens over the
 * page being worked on, so reading it never costs the reader their place.
 *
 * The shell consumes only the real providers (PSEMineAuth, PSEMineContext,
 * PseStateProvider) and the non-visual helpers in pseCore.ts. It holds no
 * product state of its own beyond which overlay is open.
 */
import React from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import {
  campaignStatusView, gbpHour, timeAgo, useCampaignClock, useEscapeKey, usePseDocumentTitle, useScrollLock,
} from './pseCore';
import { PseButton, PseIconButton } from './PseBasics';
import { PseGuide } from './PseGuide';
import { PSEmineLogo, PSEmineMark } from './PSEBrand';
import { PSE_DOC_LABEL, PSE_DOC_ORDER, PSE_DOC_PATH } from './pseDocs';

/** Console sections. The Guide sits beside them but opens an overlay. */
const CONSOLE_NAV: ReadonlyArray<{ to: string; label: string }> = [
  { to: '/mine/dashboard', label: 'Overview' },
  { to: '/mine/tools', label: 'Tools' },
  { to: '/mine/wallet', label: 'Wallet' },
  { to: '/mine/referrals', label: 'Referrals' },
  { to: '/mine/activity', label: 'Activity' },
  { to: '/mine/me', label: 'Account' },
];

const GUIDE_REFERENCE = '/mine/guide';
const GUIDE_ONBOARDING = '/mine/guide/onboarding';

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

  const isGuideRoute = location.pathname === GUIDE_REFERENCE || location.pathname === GUIDE_ONBOARDING;
  const guideMode: 'reference' | 'onboarding' =
    location.pathname === GUIDE_ONBOARDING ? 'onboarding' : 'reference';

  usePseDocumentTitle(titleForPath(location.pathname));

  if (!chrome) return <Outlet />;

  return (
    <div className="pse pse-console-shell">
      <ProductBar inConsole={inConsole} />
      {inConsole && <CampaignStrip />}

      <main className="pse-stage">
        <Outlet />
      </main>

      {inConsole && <PseConsoleBottomNav />}
      {inConsole ? <ConsoleFoot /> : <PublicFooter />}

      {/* The guide sits over the console. It is opened by standing on its route,
          so a link to it behaves like a link and the back button closes it. */}
      {inConsole && isGuideRoute && (
        <PseGuide mode={guideMode} />
      )}
    </div>
  );
};

const PSE_CONSOLE_BOTTOM_NAV = [
  { to: '/mine/dashboard', label: 'Dashboard' },
  { to: '/mine/tools', label: 'Tools' },
  { to: '/mine/referrals', label: 'Referrals' },
  { to: '/mine/wallet', label: 'Wallet' },
  { to: '/mine/me', label: 'Account' },
] as const;

const PseConsoleBottomNav: React.FC = () => {
  const location = useLocation();
  return (
    <nav className="pse-bottom-nav" aria-label="PSEmine sections">
      {PSE_CONSOLE_BOTTOM_NAV.map(item => {
        const active = location.pathname === item.to;
        return (
          <Link key={item.to} to={item.to} className="pse-bottom-nav-link" aria-current={active ? 'page' : undefined}>
            <span className="pse-bottom-nav-index" aria-hidden="true">{String(PSE_CONSOLE_BOTTOM_NAV.indexOf(item) + 1).padStart(2, '0')}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

/* ── Product bar ─────────────────────────────────────────────────────────── */

const ProductBar: React.FC<{ inConsole: boolean }> = ({ inConsole }) => {
  const { logout } = usePSEMineAuth();
  const { unreadNotifications } = usePseState();
  const [navOpen, setNavOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const location = useLocation();

  // Navigating closes the mobile nav: a sheet that survives the navigation it
  // performed leaves the reader looking at the link they already followed.
  React.useEffect(() => { setNavOpen(false); }, [location.pathname]);

  if (!inConsole) {
    return (
      <header className="pse-bar">
        <div className="pse-bar-inner">
          <Link to="/mine" className="pse-bar-brand" aria-label="PSEmine home">
            <PSEmineLogo size={24} decorative />
          </Link>
          <div className="pse-bar-tools">
            <Link to="/mine/login" className="pse-btn pse-btn--secondary pse-btn--sm">Sign in</Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="pse-bar">
        <div className="pse-bar-inner">
          <Link to="/mine/dashboard" className="pse-bar-brand" aria-label="PSEmine console">
            <PSEmineMark size={26} decorative />
            <span className="pse-bar-name">PSEmine</span>
          </Link>

          <nav className="pse-nav" aria-label="PSEmine console">
            {CONSOLE_NAV.map(item => (
              <NavLink key={item.to} to={item.to} className="pse-nav-link">
                {item.label}
              </NavLink>
            ))}
            <NavLink to={GUIDE_REFERENCE} className="pse-nav-link">Guide</NavLink>
          </nav>

          <div className="pse-bar-tools">
            <PseIconButton
              label={unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications'}
              badge={unreadNotifications}
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(v => !v)}
            >
              <BellGlyph />
            </PseIconButton>

            <PseButton
              variant="secondary"
              size="sm"
              onClick={() => void logout()}
            >
              Sign out
            </PseButton>

            <PseIconButton
              label={navOpen ? 'Close sections' : 'Open sections'}
              aria-expanded={navOpen}
              className="pse-nav-toggle"
              onClick={() => setNavOpen(v => !v)}
            >
              <MenuGlyph open={navOpen} />
            </PseIconButton>
          </div>
        </div>
      </header>

      {navOpen && (
        <NavSheet onClose={() => setNavOpen(false)} />
      )}

      {sheetOpen && (
        <NotificationSheet onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
};

/* ── Campaign strip ──────────────────────────────────────────────────────── */

/**
 * The campaign's position, on every console route.
 *
 * The day rail is drawn against the campaign's real window, so it states where
 * the campaign is rather than how much of something the reader has. The capacity
 * figure is the account's own, from the backend. Before the first read answers,
 * the strip says the campaign is still being read — it does not print a status
 * it has not been told.
 */
const CampaignStrip: React.FC = () => {
  const { state, campaignStatus, refreshing, refresh } = usePseState();
  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const known = campaignStatus !== null;
  const view = campaignStatusView(campaignStatus);
  const capacity = state?.user?.totalCapacityGBPPerHour;
  const tone = campaignStatus === 'active' ? 'good'
    : campaignStatus === 'paused' || campaignStatus === 'settling' ? 'hold'
      : campaignStatus === 'ended' || campaignStatus === 'closed' ? 'idle'
        : undefined;

  return (
    <div className="pse-strip">
      <div className="pse-strip-inner">
        {known ? (
          <span className="pse-chip" data-tone={tone}>
            <span className="pse-chip-dot" aria-hidden="true" />
            {view.label}
          </span>
        ) : (
          <span className="pse-chip" data-tone="idle">
            <span className="pse-chip-dot" aria-hidden="true" />
            Reading campaign
          </span>
        )}

        <span className="pse-strip-fact">
          <span className="pse-strip-key">Day</span>
          <span className="pse-strip-val">
            {clock.dayNumber === null ? '—' : `${clock.dayNumber} / ${clock.totalDays}`}
          </span>
        </span>

        <span className="pse-strip-rail" aria-hidden="true">
          <span className="pse-strip-rail-fill" style={{ '--pse-w': `${clock.progress}%` } as React.CSSProperties} />
        </span>

        <span className="pse-strip-fact">
          <span className="pse-strip-key">Capacity</span>
          <span className="pse-strip-val">
            {typeof capacity === 'number' ? gbpHour(capacity) : '—'}
          </span>
        </span>

        {typeof clock.daysLeft === 'number' && (
          <span className="pse-strip-fact">
            <span className="pse-strip-key">Remaining</span>
            <span className="pse-strip-val">{clock.daysLeft}d</span>
          </span>
        )}

        <span className="pse-strip-actions">
          <PseButton variant="secondary" size="sm" onClick={() => void refresh()} busy={refreshing}>
            {refreshing ? 'Syncing…' : 'Sync'}
          </PseButton>
        </span>
      </div>
    </div>
  );
};

/* ── Notification sheet ──────────────────────────────────────────────────── */

/**
 * The real notification records, over the page being worked on. Bulk mark-read
 * is preserved from the previous console, and an empty ledger says so rather
 * than showing a placeholder.
 */
const NotificationSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, unreadNotifications, markNotificationRead, refreshFeed } = usePseState();
  const [busy, setBusy] = React.useState(false);
  const shown = notifications.slice(0, 12);
  const headRef = React.useRef<HTMLHeadingElement | null>(null);

  useScrollLock(true);
  useEscapeKey(true, onClose);
  React.useEffect(() => { headRef.current?.focus(); }, []);

  const markAll = async () => {
    setBusy(true);
    try {
      for (const n of notifications) { if (!n.read) await markNotificationRead(n.id); }
    } finally { setBusy(false); }
  };

  return (
    <>
      <div className="pse-sheet-scrim" onClick={onClose} role="presentation" />
      <aside className="pse-sheet" role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="pse-sheet-head">
          <h2 className="pse-block-title" ref={headRef} tabIndex={-1}>
            Notifications
          </h2>
          <span className="pse-block-meta">{unreadNotifications} unread</span>
          <span className="pse-strip-actions">
            {unreadNotifications > 0 && (
              <PseButton variant="secondary" size="sm" onClick={() => void markAll()} busy={busy}>
                {busy ? 'Working…' : 'Mark all read'}
              </PseButton>
            )}
            <PseButton variant="secondary" size="sm" onClick={() => void refreshFeed('notifications')}>
              Refresh
            </PseButton>
            <PseIconButton label="Close notifications" onClick={onClose}>
              <CloseGlyph />
            </PseIconButton>
          </span>
        </div>

        <div className="pse-sheet-body">
          {shown.length === 0 ? (
            <p className="pse-empty-note--bare">
              No notifications yet. Account events — purchases, restarts, referral qualifications, campaign milestones —
              appear here as the backend records them.
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {shown.map(n => (
                <li key={n.id} className="pse-sheet-row">
                  <span className="pse-sheet-row-title">
                    {n.title || n.type || 'Notification'}
                  </span>
                  {n.message && <span className="pse-sheet-row-note">{n.message}</span>}
                  <span className="pse-sheet-row-meta">
                    <span>{timeAgo(n.createdAt)}</span>
                    {n.type && <span>{n.type}</span>}
                    {!n.read && (
                      <button
                        type="button"
                        className="pse-meta-action ml-auto"
                        onClick={() => void markNotificationRead(n.id)}
                      >
                        Mark read
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
};

/* ── Mobile navigation sheet ─────────────────────────────────────────────── */

const NavSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useScrollLock(true);
  useEscapeKey(true, onClose);

  return (
    <>
      <div className="pse-sheet-scrim" onClick={onClose} role="presentation" />
      <aside className="pse-sheet" role="dialog" aria-modal="true" aria-label="Console sections">
        <div className="pse-sheet-head">
          <h2 className="pse-block-title">Sections</h2>
          <span className="pse-strip-actions">
            <PseIconButton label="Close sections" onClick={onClose}>
              <CloseGlyph />
            </PseIconButton>
          </span>
        </div>
        <div className="pse-sheet-body">
          <nav className="pse-drawer-nav" aria-label="PSEmine console">
            {[...CONSOLE_NAV, { to: GUIDE_REFERENCE, label: 'Guide' }].map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className="pse-drawer-link"
                onClick={onClose}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

/* ── Console foot ────────────────────────────────────────────────────────── */

/** Every product document, once, at the end of the product. The console does not
    repeat legal links on each page: they are reachable from where a reader
    commits (a purchase, a payout wallet) and from here. */
const ConsoleFoot: React.FC = () => (
  <footer className="pse-console-foot">
    <div className="pse-console-foot-inner">
      <span>PSEmine · 90-day mining campaign</span>
      <span className="pse-console-foot-links">
        {PSE_DOC_ORDER.map(id => (
          <Link key={id} to={PSE_DOC_PATH[id]}>{PSE_DOC_LABEL[id]}</Link>
        ))}
        <Link to="/mine/guide">How PSEmine works</Link>
      </span>
    </div>
  </footer>
);

const PublicFooter: React.FC = () => (
  <footer className="pse-console-foot">
    <div className="pse-console-foot-inner">
      <span>PSEmine · 90-day mining campaign</span>
      <span className="pse-console-foot-links">
        <Link to="/mine/terms">Terms</Link>
        <Link to="/mine/privacy">Privacy</Link>
        <Link to="/mine/risk">Risk disclosure</Link>
        <Link to="/mine/support">Support</Link>
      </span>
    </div>
  </footer>
);

/* ── Glyphs. Meaningful only: bell, menu, close. ─────────────────────────── */

const BellGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M10 2.8a4.6 4.6 0 0 0-4.6 4.6v2.9L4.3 12.6h11.4l-1.1-2.3V7.4A4.6 4.6 0 0 0 10 2.8Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
    />
    <path d="M8.2 14.9a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const MenuGlyph: React.FC<{ open: boolean }> = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    {open ? (
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    ) : (
      <path d="M3.5 6.5h13M3.5 10h13M3.5 13.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    )}
  </svg>
);

const CloseGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default PSEMineShell;
