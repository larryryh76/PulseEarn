import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Pickaxe, 
  LayoutDashboard, 
  Cpu, 
  Wallet, 
  Users, 
  History, 
  BookOpen, 
  ExternalLink,
  ChevronDown,
  LogOut,
  Sparkles,
  Menu,
  X,
  Clock,
  User
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';

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
    { label: 'Overview', path: '/mine', icon: Sparkles },
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
    <header className="sticky top-0 z-40 bg-[#080C14]/90 backdrop-blur-xl border-b border-slate-800/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Ecosystem Switcher */}
          <div className="flex items-center space-x-3">
            <Link to="/mine" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <Pickaxe className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    PSEmine
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-400 border border-blue-800/40 rounded-md">
                    90D
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-tight">
                  PulseEarn Capacity Node
                </span>
              </div>
            </Link>

            {/* Campaign Countdown Badge */}
            {!isCampaignArchived && (
              <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs text-slate-300">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium">{campaignDaysRemaining}d remaining</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              if (item.requiresAuth && !currentUser) return null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center space-x-1.5 ${
                    isActive 
                      ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2.5">
            
            {/* Live Accrued Ticker (if logged in & mining active) */}
            {currentUser && pseUser && (
              <Link 
                to="/mine/dashboard"
                className="hidden sm:flex flex-col items-end px-3 py-1 bg-[#0D131F] border border-slate-800/80 hover:border-blue-500/40 rounded-xl transition-colors"
              >
                <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Earnings</span>
                </div>
                <div className="text-xs font-bold font-mono text-white">
                  £{liveAccruedGBP.toFixed(4)}
                </div>
              </Link>
            )}

            {/* Web3 Wallet Connect Button */}
            <div className="relative">
              <button
                id="psemine-wallet-btn"
                onClick={handleWalletAction}
                disabled={isConnectingWallet}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all duration-200 shadow-md ${
                  connectedWallet
                    ? 'bg-[#0D131F] border border-blue-900/50 text-blue-300 hover:bg-slate-900'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-blue-300" />
                <span className="font-mono text-xs">
                  {isConnectingWallet 
                    ? 'Connecting...'
                    : connectedWallet 
                      ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`
                      : 'Connect BSC'
                  }
                </span>
                {connectedWallet && <ChevronDown className="w-3 h-3 text-slate-400" />}
              </button>

              {/* Wallet Dropdown */}
              {walletDropdownOpen && connectedWallet && (
                <div className="absolute right-0 mt-2 w-60 bg-[#0D131F] border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 divide-y divide-slate-800/60">
                  <div className="px-3.5 py-2.5">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Payment Wallet (BSC)</div>
                    <div className="font-mono text-xs text-white font-bold truncate mt-0.5">
                      {connectedWallet}
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      to="/mine/wallet"
                      onClick={() => setWalletDropdownOpen(false)}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800/50 flex items-center space-x-2"
                    >
                      <Wallet className="w-3.5 h-3.5 text-blue-400" />
                      <span>Wallet & Settlement</span>
                    </Link>
                    <Link
                      to="/mine/me"
                      onClick={() => setWalletDropdownOpen(false)}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800/50 flex items-center space-x-2"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Account Settings</span>
                    </Link>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        disconnectWallet();
                        setWalletDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-950/30 flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect Wallet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Return to PulseEarn Main Rewards Hub */}
            <Link
              to="/dashboard"
              title="Return to PulseEarn Hub"
              className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
            >
              <span>PulseEarn</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0D131F] border-b border-slate-800 px-4 pt-2 pb-6 space-y-1.5 shadow-2xl">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            if (item.requiresAuth && !currentUser) return null;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 text-blue-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs text-slate-400 hover:text-blue-400 flex items-center space-x-1"
            >
              <span>Switch to PulseEarn</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            {currentUser ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login?redirect=/mine/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-blue-400 font-bold"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
