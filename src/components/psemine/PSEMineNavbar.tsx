import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  Wallet, 
  Users, 
  History, 
  BookOpen, 
  ChevronDown, 
  Menu, 
  X, 
  Clock, 
  User,
  Sun,
  Moon,
  LogOut,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { PSEMineLogo } from './PSEMineLogo';
import { cn } from '../../utils';

export const PSEMineNavbar: React.FC = () => {
  const location = useLocation();
  const { 
    connectedWallet, 
    connectWallet, 
    disconnectWallet, 
    isConnectingWallet, 
    liveAccruedGBP, 
    pseUser,
    campaignDaysRemaining,
    isCampaignArchived
  } = usePSEMine();
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  const isLandingPage = location.pathname === '/mine';

  // Desktop Navigation Links
  const desktopNavLinks = [
    { label: 'Overview', path: '/mine', icon: LayoutDashboard },
    { label: 'Mine', path: '/mine/dashboard', icon: LayoutDashboard, requiresAuth: true },
    { label: 'Tools', path: '/mine/tools', icon: Layers },
    { label: 'Wallet', path: '/mine/wallet', icon: Wallet, requiresAuth: true },
    { label: 'Referrals', path: '/mine/referrals', icon: Users, requiresAuth: true },
    { label: 'Activity', path: '/mine/activity', icon: History, requiresAuth: true },
    { label: 'Guide', path: '/mine/guide', icon: BookOpen },
    { label: 'Account', path: '/mine/me', icon: User, requiresAuth: true },
  ];

  const handleWalletAction = async () => {
    if (connectedWallet) {
      setWalletDropdownOpen(!walletDropdownOpen);
    } else {
      await connectWallet();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#070A0F]/90 dark:bg-[#070A0F]/90 bg-background/95 backdrop-blur-md border-b border-white/8 dark:border-white/8 border-border text-text-primary transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Section Badge */}
          <div className="flex items-center gap-3">
            <Link to="/mine" className="flex items-center gap-2 group">
              <PSEMineLogo size={34} showWordmark={true} />
            </Link>

            {/* Campaign Countdown Badge */}
            {!isCampaignArchived && (
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 bg-surface border border-border rounded-full text-[11px] text-text-secondary font-medium">
                <Clock className="w-3.5 h-3.5 text-[#00E599]" />
                <span className="font-mono">{campaignDaysRemaining}d remaining</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {desktopNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              if (item.requiresAuth && !currentUser) return null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5",
                    isActive 
                      ? "bg-[#00E599]/10 text-[#00E599] border border-[#00E599]/25 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-bright"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#00E599]" : "text-text-tertiary")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            
            {/* Live Accrued Ticker (Only for logged in miners) */}
            {currentUser && pseUser && !isLandingPage && (
              <Link 
                to="/mine/dashboard"
                className="hidden sm:flex flex-col items-end px-3 py-1 bg-surface border border-border hover:border-border-bright rounded-xl transition-colors"
                title="Live Estimated Accruals"
              >
                <div className="text-[9px] uppercase font-bold text-text-tertiary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E599] animate-pulse" />
                  <span>Accrued GBP</span>
                </div>
                <div className="text-xs font-bold font-mono text-text-primary tabular-nums">
                  £{liveAccruedGBP.toFixed(2)}
                </div>
              </Link>
            )}

            {/* Wallet Connect Button */}
            <div className="relative">
              <button
                id="psemine-wallet-btn"
                onClick={handleWalletAction}
                disabled={isConnectingWallet}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all duration-200",
                  connectedWallet
                    ? "bg-surface border border-[#00E599]/30 text-[#00E599] hover:bg-surface-bright"
                    : "bg-[#00E599] hover:bg-[#00D08A] text-[#070A0F] shadow-md shadow-[#00E599]/15"
                )}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span className="font-mono text-xs">
                  {isConnectingWallet 
                    ? 'Connecting...'
                    : connectedWallet 
                      ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`
                      : 'Connect Wallet'
                  }
                </span>
                {connectedWallet && <ChevronDown className="w-3 h-3 opacity-60" />}
              </button>

              {/* Wallet Dropdown */}
              {walletDropdownOpen && connectedWallet && (
                <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-2xl shadow-xl py-2 z-50 divide-y divide-border">
                  <div className="px-4 py-3">
                    <div className="text-[10px] text-text-tertiary uppercase font-bold tracking-widest">Connected Wallet</div>
                    <div className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00E599]" />
                      <span>BNB Smart Chain (BEP-20)</span>
                    </div>
                    <div className="font-mono text-xs text-text-primary font-bold truncate mt-1">
                      {connectedWallet}
                    </div>
                  </div>
                  <div className="p-1">
                    <Link
                      to="/mine/wallet"
                      onClick={() => setWalletDropdownOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface-bright rounded-xl transition-colors"
                    >
                      <span>Wallet & Settlement</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-text-tertiary" />
                    </Link>
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setWalletDropdownOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10 rounded-xl transition-colors text-left"
                    >
                      <span>Disconnect</span>
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-text-secondary hover:text-text-primary transition-all bg-surface-bright rounded-xl border border-border"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Mobile Hamburger Button (Secondary Menu Only) */}
            <button
              id="psemine-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 lg:hidden text-text-secondary hover:text-text-primary rounded-xl border border-border bg-surface"
              aria-label="Toggle secondary navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Hamburger Menu (SECONDARY FUNCTIONS ONLY - NO DUPLICATION OF BOTTOM NAV) */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-[#090D14]/95 backdrop-blur-xl px-4 py-4 space-y-4">
          <div className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary px-1">
            Campaign Resources & Support
          </div>

          <div className="space-y-1.5">
            <Link
              to="/mine/guide"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl text-xs font-semibold flex items-center justify-between bg-surface border border-border text-text-primary hover:bg-surface-bright"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#00E599]" />
                <span>Campaign Guide & FAQ</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-tertiary" />
            </Link>

            <Link
              to="/mine/wallet"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl text-xs font-semibold flex items-center justify-between bg-surface border border-border text-text-primary hover:bg-surface-bright"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#00E599]" />
                <span>BNB Smart Chain Settlement</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-tertiary" />
            </Link>

            <Link
              to="/mine/activity"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl text-xs font-semibold flex items-center justify-between bg-surface border border-border text-text-primary hover:bg-surface-bright"
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4 text-[#00E599]" />
                <span>Campaign Ledger & Activity</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-text-tertiary" />
            </Link>
          </div>

          {/* Account and Sign Out Action */}
          {currentUser && (
            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-tertiary font-mono truncate max-w-[200px]">
                {currentUser.email}
              </span>
              <button
                onClick={async () => {
                  await logout();
                  setMobileMenuOpen(false);
                }}
                className="text-danger font-bold uppercase tracking-wider text-[11px] hover:underline"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default PSEMineNavbar;
