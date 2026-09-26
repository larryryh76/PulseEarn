import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { usePseState } from './PseStateProvider';
import { PSELogo, campaignStatusView, toDateSafe, usePseDocumentTitle } from './pse';
import { NotificationBell } from './NotificationBell';

const CONSOLE_NAV = [
  { to: '/mine/dashboard', label: 'Overview' },
  { to: '/mine/tools', label: 'Tools' },
  { to: '/mine/wallet', label: 'Wallet' },
  { to: '/mine/activity', label: 'Activity' },
  { to: '/mine/referrals', label: 'Referrals' },
];

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/mine\/dashboard/, 'Overview'],
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
  [/^\/mine/, 'PSEmine'],
];

function titleForPath(pathname: string): string {
  return ROUTE_TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'PSEmine';
}

export const PSEMineShell: React.FC = () => {
  const location = useLocation();
  const { currentUser, logout, hasPSEmineAccess } = usePSEMineAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const inConsole = Boolean(currentUser) && hasPSEmineAccess;

  usePseDocumentTitle(titleForPath(location.pathname));
  useEffect(() => { setMenuOpen(false); setAccountOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountOpen]);

  return (
    <div className="pm-product pm-console">
      <header className="pm-shell-header">
        <Link className="pm-shell-brand" to={inConsole ? '/mine/dashboard' : '/mine'} aria-label="PSEmine home">
          <PSELogo size={27} withWordmark />
        </Link>
        {inConsole && (
          <nav aria-label="PSEmine console">
            {CONSOLE_NAV.map(item => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''}>{item.label}</NavLink>)}
          </nav>
        )}
        <div className="pm-header-actions">
          {inConsole ? (
            <>
              <NotificationBell />
              <AccountMenu open={accountOpen} setOpen={setAccountOpen} ref={accountRef} />
            </>
          ) : currentUser ? (
            <button type="button" onClick={() => void logout()}>Sign out</button>
          ) : (
            <><Link to="/mine/login">Sign in</Link><Link className="pm-button pm-button-primary" to="/mine/signup">Create account</Link></>
          )}
          <button className="pm-mobile-toggle" type="button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="psemine-mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
        {menuOpen && (
          <nav className="pm-mobile-nav" id="psemine-mobile-menu" aria-label="PSEmine mobile">
            {inConsole ? (
              <>
                {[...CONSOLE_NAV, { to: '/mine/me', label: 'Account' }, { to: '/mine/guide', label: 'Guide' }].map(item => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}
                <Link to="/help">Support</Link>
                <button type="button" onClick={() => void logout()}>Sign out</button>
              </>
            ) : currentUser ? <Link to="/mine/dashboard">Open console</Link> : <><Link to="/mine/login">Sign in</Link><Link to="/mine/signup">Create account</Link></>}
          </nav>
        )}
      </header>
      <ConsoleStatus inConsole={inConsole} />
      <main className="pm-console-main"><Outlet /></main>
      <footer className="pm-footer">
        <Link to="/mine"><PSELogo size={21} withWordmark /></Link>
        <nav aria-label="Footer"><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link><Link to="/help">Support</Link></nav>
        <span>© {new Date().getFullYear()} PSEmine · 90-day campaign</span>
      </footer>
    </div>
  );
};

const AccountMenu = React.forwardRef<HTMLDivElement, { open: boolean; setOpen: (value: boolean) => void }>(
  ({ open, setOpen }, ref) => {
    const { userData, currentUser, logout } = usePSEMineAuth();
    const navigate = useNavigate();
    return (
      <div ref={ref}>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label="Account menu">
          {(userData?.username || currentUser?.email || '?').slice(0, 1).toUpperCase()}
        </button>
        {open && (
          <div className="pm-account-menu" role="menu">
            <div><p>{userData?.username || 'PSEmine miner'}</p><p>{currentUser?.email}</p></div>
            <Link to="/mine/me" role="menuitem">Account &amp; settings</Link>
            <Link to="/mine/guide" role="menuitem">Campaign guide</Link>
            <Link to="/help" role="menuitem">Support</Link>
            <button type="button" role="menuitem" onClick={async () => { await logout(); navigate('/mine/login'); }}>Sign out</button>
          </div>
        )}
      </div>
    );
  },
);
AccountMenu.displayName = 'AccountMenu';

const ConsoleStatus: React.FC<{ inConsole: boolean }> = ({ inConsole }) => {
  const { state, campaignStatus, refreshing, refresh } = usePseState();
  const campaign = state?.campaign;
  const view = campaignStatusView(campaignStatus);
  const campaignName = campaign?.name || 'PSEmine campaign';
  const startDate = toDateSafe(campaign?.startAt);
  const endDate = toDateSafe(campaign?.endAt);
  const dates = startDate && endDate
    ? `${startDate.toLocaleDateString('en-GB')} — ${endDate.toLocaleDateString('en-GB')}`
    : 'Schedule pending';

  if (!inConsole) return null;

  return (
    <div className="pm-console-status" aria-label="Current campaign status">
      <span>{campaignName} · {view.label.trim()} · {dates}</span>
      <button type="button" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? 'Syncing…' : 'Sync state'}</button>
    </div>
  );
};

export { toDateSafe };
export default PSEMineShell;
