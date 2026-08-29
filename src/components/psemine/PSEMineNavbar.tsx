import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Cpu, 
  Wallet, 
  Users, 
  History, 
  BookOpen, 
  ExternalLink,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Clock,
  User
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineWordmark } from './PSEMineWordmark';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);

  const navLinks = [
    { label: 'Overview', path: '/mine', icon: LayoutDashboard },
    { label: 'Dashboard', path: '/mine/dashboard', icon: LayoutDashboard, requiresAuth: true },
    { label: 'Mine', path: '/mine/tools', icon: Cpu },
    { label: 'Wallet', path: '/mine/wallet', icon: Wallet, requiresAuth: true },
    { label: 'Referrals', path: '/mine/referrals', icon: Users, requiresAuth: true },
    { label: 'Activity', path: '/mine/activity', icon: History, requiresAuth: true },
    { label: 'Guide', path: '/mine/guide', icon: BookOpen },
    { label: 'Me', path: '/mine/me', icon: User, requiresAuth: true },
  ];

  const handleWalletAction = async () => {
    if (connectedWallet) {
      setWalletDropdownOpen(!walletDropdownOpen);
    } else {
      await connectWallet();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080C14]/95 backdrop-blur-sm border-b border-slate-800/70 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Wordmark */}
          <div className="flex items-center space-x-3">
            <Link to="/mine" className="flex items-center space-x-3 group" aria-label="PSEmine Home">
              <PSEMineWordmark />
              <span className="hidden sm:inline-block text-[11px] text-slate-400">by PulseEarn</span>
            </Link>

            {/* Subtle campaign context (not a badge) */}
            {currentUser && !isCampaignArchived && (
              <div className="hidden xl:flex items-center space-x-2 px-2 py-1 rounded-full text-xs text-slate-300 bg-surface-glass border border-border">
                <Clock className="w-3.5 h-3.5 text-slate-300" />
                <span className="text-[13px] font-medium">{campaignDaysRemaining} days remaining</span>
              </div>
            )}
          </div>

          {/* Center: Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              if (item.requiresAuth && !currentUser) return null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-150 flex items-center gap-2 ${
                    isActive 
                      ? 'text-text-primary bg-surface-bright/40 border border-border' 
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-bright/20'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-tertiary'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2.5">

            {/* Live accrual compact */}
            {currentUser && pseUser && (
              <Link 
                to="/mine/dashboard"
                className="hidden sm:flex flex-col items-end px-3 py-1 bg-surface-bright border border-border rounded-md transition-colors"
              >
                <div className="text-[10px] uppercase font-bold text-text-tertiary">Earnings</div>
                <div className="text-sm font-bold text-text-primary">£{liveAccruedGBP.toFixed(2)}</div>
              </Link>
            )}

            {/* Wallet button */}
            <div className="relative">
              <button
                id="psemine-wallet-btn"
                onClick={handleWalletAction}
                disabled={isConnectingWallet}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all duration-150 border ${connectedWallet ? 'bg-surface border-border text-text-primary' : 'bg-primary text-background border-primary/30'} `}
              >
                <Wallet className="w-4 h-4 text-current" />
                <span className="font-mono text-xs">{isConnectingWallet ? 'Connecting...' : (connectedWallet ? `${connectedWallet.slice(0,6)}...${connectedWallet.slice(-4)}` : 'Connect BSC')}</span>
                {connectedWallet && <ChevronDown className="w-3 h-3 text-text-tertiary" />}
              </button>

              {walletDropdownOpen && connectedWallet && (
                <div className="absolute right-0 mt-2 w-64 bg-surface border border-border rounded-2xl shadow-subtle py-2 z-50">
                  <div className="px-3.5 py-2.5">
                    <div className="text-[10px] text-text-tertiary uppercase font-semibold">Payment Wallet</div>
                    <div className="font-mono text-sm text-text-primary font-bold truncate mt-1">{connectedWallet}</div>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/mine/wallet"
                      onClick={() => setWalletDropdownOpen(false)}
                      className="w-full text-left px-3.5 py-2 text-sm text-text-secondary hover:bg-surface-bright flex items-center gap-2"
                    >
                      <Wallet className="w-4 h-4 text-text-secondary" />
                      <span>Wallet & Settlement</span>
                    </Link>
                    <Link
                      to="/mine/me"
                      onClick={() => setWalletDropdownOpen(false)}
                      className="w-full text-left px-3.5 py-2 text-sm text-text-secondary hover:bg-surface-bright flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-text-secondary" />
                      <span>Account Settings</span>
                    </Link>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => { disconnectWallet(); setWalletDropdownOpen(false); }}
                      className="w-full text-left px-3.5 py-2 text-sm text-danger hover:bg-danger/10 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect Wallet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Link back to PulseEarn hub */}
            <Link
              to="/dashboard"
              title="PulseEarn Hub"
              className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 text-sm text-text-secondary hover:text-text-primary bg-surface-bright border border-border rounded-md"
            >
              <span>PulseEarn</span>
              <ExternalLink className="w-3 h-3 text-text-tertiary" />
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-surface-bright/30 rounded-md"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface border-t border-border px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            if (item.requiresAuth && !currentUser) return null;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-semibold ${isActive ? 'bg-surface-bright text-text-primary' : 'text-text-secondary hover:bg-surface-bright/30'}`}
              >
                <Icon className="w-5 h-5 text-primary" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-sm text-text-secondary hover:text-primary flex items-center gap-2">
              <span>Switch to PulseEarn</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
            {currentUser ? (
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-sm text-danger font-semibold">Sign Out</button>
            ) : (
              <Link to="/login?redirect=/mine/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-sm text-primary font-bold">Sign In</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
