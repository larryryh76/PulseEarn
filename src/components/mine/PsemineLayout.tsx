import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from './PsemineLogo';
import { Activity, Bell, Home, LogOut, Pickaxe, Settings2, UsersRound, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

interface PsemineLayoutProps { children?: React.ReactNode; }
const navItems = [
  { label: 'Home', path: '/mine', icon: Home },
  { label: 'Mine', path: '/mine/dashboard', icon: Pickaxe },
  { label: 'Activity', path: '/mine/activity', icon: Activity },
  { label: 'Referrals', path: '/mine/referrals', icon: UsersRound },
  { label: 'Account', path: '/mine/account', icon: Settings2 },
];

export const PsemineLayout: React.FC<PsemineLayoutProps> = ({ children }) => {
  const { currentUser, psemineProfile, logout } = usePsemineAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogout = async () => { try { await logout(); toast.success('You have been signed out'); navigate('/mine/login'); } catch (error: any) { toast.error(error.message || 'Unable to sign out'); } };
  const activePath = location.pathname === '/mine' ? '/mine' : navItems.find((item) => location.pathname.startsWith(item.path) && item.path !== '/mine')?.path;

  return <div className="psemine-surface min-h-screen pb-24 font-sans">
    <header className="sticky top-0 z-40 border-b border-[var(--pm-border)] bg-[var(--pm-bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between px-5 sm:px-8">
        <Link to="/mine/dashboard"><PsemineLogo size="sm" /></Link>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/mine/wallet" className="pm-quiet-button"><Wallet size={15} /> Wallet</Link>
          <Link to="/mine/notifications" className="pm-icon-button" aria-label="Notifications"><Bell size={17} /></Link>
          <div className="mx-1 h-7 w-px bg-[var(--pm-border)]" />
          <span className="max-w-40 truncate text-xs text-[var(--pm-muted)]">{psemineProfile?.username || currentUser?.email || 'PSEmine account'}</span>
          <button onClick={handleLogout} className="pm-quiet-button"><LogOut size={15} /> Sign out</button>
        </div>
      </div>
    </header>
    <main className="mx-auto w-full max-w-[1320px] px-5 py-7 sm:px-8 sm:py-10">{children}</main>
    <nav aria-label="PSEmine primary navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--pm-border)] bg-[var(--pm-bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[min(720px,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-2xl md:border">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-2">{navItems.map(({ label, path, icon: Icon }) => { const isActive = activePath === path; return <Link key={path} to={path} className={`pm-nav-item ${isActive ? 'pm-nav-item-active' : ''}`}><Icon size={17} /><span>{label}</span></Link>; })}</div>
    </nav>
  </div>;
};
export default PsemineLayout;

export { navItems };

function PsemineTopline() { return null; }
void PsemineTopline;

// The shell deliberately keeps account and wallet actions outside the primary mobile navigation.
// This preserves a focused mining workflow while retaining access to financial controls.
