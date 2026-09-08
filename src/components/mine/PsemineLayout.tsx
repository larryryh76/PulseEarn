import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from './PsemineLogo';
import {
  Home,
  Pickaxe,
  Activity,
  UsersRound,
  Settings2,
  Wallet,
  ArrowUpRight,
  Bell,
  LogOut,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PsemineLayoutProps {
  children?: React.ReactNode;
}

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

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out from PSEmine');
      navigate('/mine/login');
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
    }
  };

  const isCurrentPath = (path: string) => {
    if (path === '/mine') return location.pathname === '/mine';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white font-sans pb-24 md:pb-12 selection:bg-emerald-500/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A0A0F]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link to="/mine/dashboard">
              <PsemineLogo size="md" />
            </Link>

            {/* Genesis Session Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Genesis Mining Active</span>
            </div>
          </div>

          {/* User Profile & Contextual Financial Navigation */}
          <div className="flex items-center gap-3">
            <Link
              to="/mine/wallet"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
            >
              <Wallet size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">Wallet</span>
            </Link>

            <Link
              to="/mine/withdrawals"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white transition-all"
            >
              <ArrowUpRight size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">Withdraw</span>
            </Link>

            <Link
              to="/mine/notifications"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-all relative"
              aria-label="Notifications"
            >
              <Bell size={15} />
            </Link>

            <div className="hidden md:flex items-center gap-3 pl-3 border-l border-white/10">
              <div className="text-right">
                <p className="text-xs font-bold text-white max-w-[120px] truncate">
                  {psemineProfile?.username || currentUser?.email?.split('@')[0] || 'Miner'}
                </p>
                <p className="text-[10px] text-zinc-500 font-mono">PSEmine ID</p>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition-all"
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Mobile/Desktop Primary Navigation Bar */}
      <nav
        aria-label="PSEmine primary navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#12121A]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[min(640px,calc(100%-2rem))] md:-translate-x-1/2 md:rounded-2xl md:border md:shadow-2xl"
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-2">
          {navItems.map(({ label, path, icon: Icon }) => {
            const active = isCurrentPath(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition-all ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default PsemineLayout;
