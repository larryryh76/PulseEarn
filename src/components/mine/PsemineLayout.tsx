import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from './PsemineLogo';
import { Activity, Bell, Home, LogOut, Pickaxe, Settings2, UsersRound, WalletCards } from 'lucide-react';
import toast from 'react-hot-toast';

interface PsemineLayoutProps { children?: React.ReactNode; }
const navItems = [{ label: 'Home', path: '/mine', icon: Home }, { label: 'Mine', path: '/mine/dashboard', icon: Pickaxe }, { label: 'Activity', path: '/mine/activity', icon: Activity }, { label: 'Referrals', path: '/mine/referrals', icon: UsersRound }, { label: 'Account', path: '/mine/account', icon: Settings2 }];

export const PsemineLayout: React.FC<PsemineLayoutProps> = ({ children }) => {
  const { currentUser, psemineProfile, logout } = usePsemineAuth(); const location = useLocation(); const navigate = useNavigate();
  const handleLogout = async () => { try { await logout(); toast.success('Logged out from PSEmine'); navigate('/mine/login'); } catch { toast.error('Logout failed. Please try again.'); } };
  const activePath = location.pathname === '/mine' ? '/mine' : navItems.find((item) => location.pathname.startsWith(item.path) && item.path !== '/mine')?.path;
  return <div className="psemine-surface min-h-screen pb-24 font-sans">
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#101311]/90 backdrop-blur-xl"><div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"><Link to="/mine/dashboard"><PsemineLogo size="sm" /></Link><div className="flex items-center gap-3"><Link aria-label="Wallet" to="/mine/wallet" className="rounded-xl border border-white/10 p-2.5 text-[#c6c1b6] hover:bg-white/[.06]"><WalletCards size={16} /></Link><Link aria-label="Notifications" to="/mine/notifications" className="rounded-xl border border-white/10 p-2.5 text-[#c6c1b6] hover:bg-white/[.06]"><Bell size={16} /></Link><span className="hidden max-w-40 truncate text-xs text-[#a9aaa0] sm:block">{psemineProfile?.username || currentUser?.email || 'PSEmine account'}</span><button aria-label="Log out" onClick={handleLogout} className="hidden items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-[#a9aaa0] hover:bg-white/[.06] md:flex"><LogOut size={14} /> Log out</button></div></div></header>
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">{children}</main>
    <nav aria-label="PSEmine primary navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#151915]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[min(680px,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-2xl md:border"><div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-2">{navItems.map(({ label, path, icon: Icon }) => { const isActive = activePath === path; return <Link key={path} to={path} className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition-colors ${isActive ? 'bg-[#e7a84b]/12 text-[#e7a84b]' : 'text-[#8e948a] hover:bg-white/[.05] hover:text-[#f4f1e8]'}`}><Icon size={17} /><span>{label}</span></Link>; })}</div></nav>
  </div>;
};
export default PsemineLayout;
