/**
 * PSEmine console shell — the authenticated product's chrome.
 *
 * One bar, one status band, one stage, one dock, one foot. The bar carries the
 * product identity, the sections above the dock breakpoint, and the account
 * controls; the band states the campaign's condition on every console route,
 * because "is the campaign live" is the context every other figure on the page is
 * read against; the DOCK is the console's navigation on a phone; the foot carries
 * the product's documents once, at the end of the product, rather than repeating
 * legal links on each page.
 *
 * THE BAND IS CONTEXT, NOT A SECOND DASHBOARD. It states the campaign's condition
 * and the account's mining rate and nothing else — no day rail, no campaign day.
 * Those belong to the dashboard's campaign register, which is the single owner of
 * the campaign's position; a rail drawn in the chrome and again on the page is the
 * same date stated twice, which is two chances for the product to disagree with
 * itself about its own clock.
 *
 * ONE NAVIGATION MODEL, TWO SHAPES OF IT. The console has six sections. On a
 * phone that is a bottom dock of five — Dashboard, Tools, Wallet, Referrals,
 * Activity — with the account one tap away in the bar, because a bottom dock
 * stops being scannable past five items (MD bottom-navigation guidance, and the
 * same limit the repo's own UX dataset states as `bottom-nav-limit`). Above the
 * dock breakpoint the same list is the horizontal bar, and the dock is not
 * rendered at all. There is no hamburger and no second navigation model: the
 * previous mobile drawer asked the reader to open a sheet to find a section that
 * is one tap away, and it competed with the dock for the same job.
 *
 * THE DOCK IS PADDED OFF THE DEVICE EDGE. Bottom-fixed chrome is exactly what
 * sits under a home indicator, so the dock reserves `env(safe-area-inset-bottom)`
 * and the console reserves the dock's height as page padding — a fixed bar that
 * overlaps the content it navigates is the `fixed-element-offset` failure the
 * repo's UX dataset names.
 *
 * WHAT THE STRIP IS ALLOWED TO SAY. Only what the backend reports: the campaign
 * status, the day inside the campaign's real window, and the account's real
 * capacity. While the campaign read is still in flight it says so rather than
 * defaulting to "Scheduled" — an unknown status printed as a known one is the
 * quietest way a console can lie.
 *
 * THE GUIDE IS AN OVERLAY, NOT A PAGE. `/mine/guide` renders the console and
 * opens the guide's plate over it, so a guide link is still a real link that
 * survives a refresh, a share and the back button. Opening it FROM the console
 * adds `?guide=1` to the current path instead of changing the route: the route
 * element is reconciled rather than unmounted, so the reader's page keeps its
 * scroll position and its loaded figures, and the back gesture closes the plate.
 * `onClose` is therefore a navigate(-1) for the in-place form and a redirect to
 * the dashboard for the deep-linked one.
 *
 * NOTIFICATIONS ARE A SHEET, NOT A ROUTE. The notification ledger opens over the
 * page being worked on, so reading it never costs the reader their place.
 *
 * The shell consumes only the real providers (PSEMineAuth, PSEMineContext,
 * PseStateProvider) and the non-visual helpers in pseCore.ts. It holds no
 * product state of its own beyond which overlay is open.
 */
import React from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import {
  campaignStatusView, gbpHour, timeAgo, useEscapeKey, usePseDocumentTitle, useScrollLock,
} from './pseCore';
import { PseButton, PseIconButton } from './PseBasics';
import { PseGuide } from './PseGuide';
import { PSEmineLogo, PSEmineMark } from './PSEBrand';
import { PSE_DOC_LABEL, PSE_DOC_ORDER, PSE_DOC_PATH } from './pseDocs';

/** The section list, once. The bar renders all of it; the dock renders the first five. */
const CONSOLE_SECTIONS: ReadonlyArray<{ to: string; label: string; dock: boolean }> = [
  { to: '/mine/dashboard', label: 'Dashboard', dock: true },
  { to: '/mine/tools', label: 'Tools', dock: true },
  { to: '/mine/wallet', label: 'Wallet', dock: true },
  { to: '/mine/referrals', label: 'Referrals', dock: true },
  { to: '/mine/activity', label: 'Activity', dock: true },
  { to: '/mine/me', label: 'Account', dock: false },
];

const DOCK_SECTIONS = CONSOLE_SECTIONS.filter(s => s.dock);

const GUIDE_REFERENCE = '/mine/guide';
const GUIDE_ONBOARDING = '/mine/guide/onboarding';

/**
 * The in-place guide handle. A route stays shareable; a query keeps the page
 * mounted. The Dashboard's guide entry pushes `?guide=1`, which is the same route
 * it is standing on, so nothing beneath the plate is torn down.
 */
const GUIDE_QUERY = 'guide';

/** PSEmine owns the document title on every one of its routes. */
const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/mine\/dashboard/, 'Mining dashboard'],
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, hasPSEmineAccess } = usePSEMineAuth();

  const isAuthed = Boolean(currentUser);
  const inConsole = isAuthed && hasPSEmineAccess;
  const isLanding = location.pathname === '/mine' || location.pathname === '/mine/';
  /* The public surface owns its own masthead and footer; the product chrome is
     the console's and must not leak into it. */
  const chrome = !isLanding || inConsole;

  const isOnboardingRoute = location.pathname === GUIDE_ONBOARDING;
  const isGuideRoute = location.pathname === GUIDE_REFERENCE || isOnboardingRoute;
  const guideInPlace = !isGuideRoute && searchParams.get(GUIDE_QUERY) === '1';
  const guideOpen = isGuideRoute || guideInPlace;
  const guideMode: 'reference' | 'onboarding' = isOnboardingRoute ? 'onboarding' : 'reference';

  /**
   * How the plate closes, which depends entirely on how it was opened.
   *
   * IN PLACE (`?guide=1`): the plate was pushed onto the route the reader is
   * already on, so going back is the honest close — the page underneath keeps its
   * scroll position and its loaded figures because it was never unmounted. When
   * there is nothing to go back to (a fresh tab on `/mine/dashboard?guide=1`),
   * the query is dropped in place instead.
   *
   * ROUTE (`/mine/guide`): the plate IS the route, so closing replaces it with the
   * dashboard rather than pushing another entry — otherwise the guide would sit
   * one step back in history and the back gesture would reopen what the reader
   * just closed.
   */
  const closeGuide = React.useCallback(() => {
    if (guideInPlace) {
      if (window.history.state?.idx > 0) navigate(-1);
      else navigate(location.pathname, { replace: true });
      return;
    }
    navigate('/mine/dashboard', { replace: true });
  }, [guideInPlace, navigate, location.pathname]);

  usePseDocumentTitle(titleForPath(location.pathname));

  if (!chrome) return <Outlet />;

  return (
    <div className={`pse pse-console-shell${inConsole ? ' pse-console-shell--docked' : ''}`}>
      <ProductBar inConsole={inConsole} showGuide={inConsole} />

      {inConsole && <CampaignBand />}

      <main className="pse-stage" id="pse-stage">
        <Outlet />
      </main>

      {inConsole ? <ConsoleFoot /> : <PublicFooter />}
      {inConsole && <ConsoleDock />}

      {/* The guide sits over the console. It is opened by standing on its route,
          or by adding ?guide=1 to the page being read. */}
      {inConsole && guideOpen && (
        <PseGuide mode={guideMode} onClose={closeGuide} />
      )}
    </div>
  );
};

/* ── Product bar ─────────────────────────────────────────────────────────── */

const ProductBar: React.FC<{ inConsole: boolean; showGuide: boolean }> = ({ inConsole, showGuide }) => {
  const { logout } = usePSEMineAuth();
  const { unreadNotifications } = usePseState();
  const [sheetOpen, setSheetOpen] = React.useState(false);

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
          <Link to="/mine/dashboard" className="pse-bar-brand" aria-label="PSEmine dashboard">
            <PSEmineMark size={26} decorative />
            <span className="pse-bar-name">PSEmine</span>
          </Link>

          <nav className="pse-nav" aria-label="PSEmine console">
            {CONSOLE_SECTIONS.map(item => (
              <NavLink key={item.to} to={item.to} className="pse-nav-link">
                {item.label}
              </NavLink>
            ))}
            {showGuide && <NavLink to={GUIDE_REFERENCE} className="pse-nav-link">Guide</NavLink>}
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

            {/* Below the dock breakpoint the account is the one section the dock
                has no room for, so the bar carries it. */}
            <NavLink to="/mine/me" className="pse-icon-btn pse-bar-account" aria-label="Account">
              <AccountGlyph />
            </NavLink>

            <PseButton
              variant="secondary"
              size="sm"
              className="pse-bar-signout"
              onClick={() => void logout()}
            >
              Sign out
            </PseButton>
          </div>
        </div>
      </header>

      {sheetOpen && (
        <NotificationSheet onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
};

/* ── Console dock ────────────────────────────────────────────────────────── */

/**
 * The console's navigation on a phone. Five destinations, each with a glyph and
 * a label — an icon-only dock is a memory test — and the current one carrying the
 * accent, which is the only state this bar expresses.
 *
 * It is the same list as the bar above the breakpoint and it navigates to the
 * same routes, so the product has one navigation model with two shapes rather
 * than two competing ones.
 */
const ConsoleDock: React.FC = () => (
  <nav className="pse-dock" aria-label="PSEmine console sections">
    {DOCK_SECTIONS.map(item => (
      <NavLink key={item.to} to={item.to} className="pse-dock-link">
        <span className="pse-dock-glyph" aria-hidden="true">
          <DockGlyph to={item.to} />
        </span>
        <span className="pse-dock-label">{item.label}</span>
      </NavLink>
    ))}
  </nav>
);

/* ── Campaign strip ──────────────────────────────────────────────────────── */

/**
 * THE STATUS BAND — the console's persistent context, and NOT a second dashboard.
 *
 * WHAT IT SAYS, AND WHAT IT DELIBERATELY DOES NOT. The band states only what the
 * reader needs in order to know whether the page they are on is talking about a
 * live campaign: the campaign's state, and the account's own mining rate. It does
 * NOT draw the campaign's day rail, and it does not state the campaign day.
 *
 * That is a fix, not a preference. The rail and the day were drawn here on every
 * console route AND drawn again by the dashboard's own campaign register, which
 * meant the product's most important date was stated in two places that could
 * disagree — and on the dashboard, which is the one screen that owns the campaign
 * window, the second copy was pure repetition. The dashboard is now the single
 * owner of the campaign's position; the band is context on the other five routes.
 *
 * WHAT REMAINS IS STILL FROM THE BACKEND ONLY. Before the first read answers the
 * band says the campaign is still being read rather than defaulting to
 * "Scheduled" — an unknown status printed as a known one is the quietest way a
 * console can lie.
 */
const CampaignBand: React.FC = () => {
  const { state, campaignStatus } = usePseState();
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
          <span className="pse-strip-key">Mining capacity</span>
          <span className="pse-strip-val">
            {typeof capacity === 'number' ? gbpHour(capacity) : '—'}
          </span>
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
        <Link to={GUIDE_REFERENCE}>How PSEmine works</Link>
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

/* ── Glyphs. Meaningful only: the dock's five, the bell, the account, close. ── */

/**
 * Dock glyphs, one per destination, drawn on one 20×20 grid at one stroke width
 * so the dock reads as a single instrument rather than five borrowed icons. Each
 * is decorative: the label beside it carries the name.
 */
const DockGlyph: React.FC<{ to: string }> = ({ to }) => {
  switch (to) {
    /* Dashboard — the campaign, as a measured instrument. */
    case '/mine/dashboard':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" focusable="false">
          <path d="M3.5 12.2a6.5 6.5 0 1 1 13 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M10 12.2 13.1 8.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M2.6 15.4h14.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    /* Tools — the unit: a framed instrument with its own module. */
    case '/mine/tools':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" focusable="false">
          <rect x="3.2" y="3.2" width="13.6" height="13.6" rx="2.4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3.2 7.8h13.6" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7.4 11.2h5.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M7.4 13.8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    /* Wallet — the payout wallet and what settles into it. */
    case '/mine/wallet':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" focusable="false">
          <rect x="2.8" y="5.4" width="14.4" height="10.2" rx="2.2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M2.8 8.6h14.4" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="13.4" cy="12.4" r="1.05" fill="currentColor" />
        </svg>
      );
    /* Referrals — the capacity side of the same account. */
    case '/mine/referrals':
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" focusable="false">
          <circle cx="7.6" cy="7.6" r="2.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="13.6" cy="9.4" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3.4 15.2c.5-2.1 2.2-3.3 4.2-3.3s3.7 1.2 4.2 3.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M12.9 12.6c1.6.1 2.9 1.1 3.3 2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    /* Activity — the ledger. */
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" focusable="false">
          <path d="M4 5.6h12M4 10h12M4 14.4h8.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
  }
};

const AccountGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <circle cx="10" cy="7.4" r="3.1" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4.4 16.2c.7-2.6 2.9-4 5.6-4s4.9 1.4 5.6 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const BellGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path
      d="M10 2.8a4.6 4.6 0 0 0-4.6 4.6v2.9L4.3 12.6h11.4l-1.1-2.3V7.4A4.6 4.6 0 0 0 10 2.8Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
    />
    <path d="M8.2 14.9a1.9 1.9 0 0 0 3.6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const CloseGlyph: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false">
    <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export default PSEMineShell;
