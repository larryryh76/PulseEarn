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
  Clock
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
    { label: 'Tool Market', path: '/mine/tools', icon: Cpu },
    { label: 'Wallet', path: '/mine/wallet', icon: Wallet, requiresAuth: true },
    { label: 'Referrals', path: '/mine/referrals', icon: Users, requiresAuth: true },
    { label: 'Activity', path: '/mine/activity', icon: History, requiresAuth: true },
    { label: 'Campaign Guide', path: '/mine/guide', icon: BookOpen },
  ];

  const handleWalletAction = async () => {
    if (connectedWallet) {
      setWalletDropdownOpen(!walletDropdownOpen);
    } else {
      await connectWallet();
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#090D16]/90 backdrop-blur-md border-b border-cyan-900/30 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Ecosystem Switcher */}
          <div className="flex items-center space-x-4">
            <Link to="/mine" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
                <Pickaxe className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                    PSEmine
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-700/40 rounded">
                    90D
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium tracking-tight">
                  PulseEarn Capacity Node
                </span>
              </div>
            </Link>

            {/* Campaign Countdown Badge */}
            {!isCampaignArchived && (
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-cyan-950/40 border border-cyan-500/20 rounded-full text-xs text-cyan-300">
                <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>{campaignDaysRemaining}d remaining</span>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              if (item.requiresAuth && !currentUser) return null;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center space-x-1.5 ${
                    isActive 
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                      : 'text-gray-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-3">
            
            {/* Live Accrued Ticker (if logged in & mining active) */}
            {currentUser && pseUser && (
              <Link 
                to="/mine/dashboard"
                className="hidden sm:flex flex-col items-end px-3 py-1 bg-slate-900/80 border border-cyan-800/40 rounded-xl hover:border-cyan-500/50 transition-colors"
              >
                <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Accrued</span>
                </div>
                <div className="text-sm font-black font-mono text-cyan-300">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all duration-200 shadow-md ${
                  connectedWallet
                    ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 hover:bg-cyan-900/50'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'
                }`}
              >
                <Wallet className="w-4 h-4 text-cyan-300" />
                <span>
                  {isConnectingWallet 
                    ? 'Connecting...'
                    : connectedWallet 
                      ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`
                      : 'Connect BSC'
                  }
                </span>
                {connectedWallet && <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              {/* Wallet Dropdown */}
              {walletDropdownOpen && connectedWallet && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-cyan-900/60 rounded-xl shadow-2xl py-2 z-50">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <div className="text-[11px] text-gray-400">Connected Wallet (BSC)</div>
                    <div className="font-mono text-xs text-cyan-300 font-bold truncate">
                      {connectedWallet}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      disconnectWallet();
                      setWalletDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-slate-800/60 flex items-center space-x-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect Wallet</span>
                  </button>
                </div>
              )}
            </div>

            {/* Return to PulseEarn Main Rewards Hub */}
            <Link
              to="/dashboard"
              title="Switch to PulseEarn Rewards Platform"
              className="hidden lg:flex items-center space-x-1 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 rounded-xl transition-all"
            >
              <span>PulseEarn</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </Link>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0f1d] border-b border-cyan-900/40 px-4 pt-2 pb-6 space-y-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            if (item.requiresAuth && !currentUser) return null;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                    : 'text-gray-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-5 h-5 text-cyan-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs text-gray-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>Go to PulseEarn Rewards</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            {currentUser ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login?redirect=/mine/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-cyan-400 font-bold"
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
