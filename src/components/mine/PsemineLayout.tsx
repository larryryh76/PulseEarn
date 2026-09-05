import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from './PsemineLogo';
import {
  LayoutDashboard,
  Compass,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PsemineLayoutProps {
  children?: React.ReactNode;
}

export const PsemineLayout: React.FC<PsemineLayoutProps> = ({ children }) => {
  const { currentUser, psemineProfile, logout } = usePsemineAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out from PSEmine');
      navigate('/mine/login');
    } catch (err: any) {
      toast.error('Logout failed: ' + (err.message || 'Unknown error'));
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/mine/dashboard', icon: LayoutDashboard },
    { label: 'Guide', path: '/mine/guide', icon: Compass },
  ];

  return (
    <div className="min-h-screen bg-[#080A11] text-white flex flex-col font-sans selection:bg-[#00F2FE]/30 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#080A11]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/mine/dashboard" className="flex items-center gap-2">
            <PsemineLogo size="sm" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30 shadow-[0_0_10px_rgba(0,242,254,0.15)]'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Controls */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all"
            >
              <User size={14} className="text-[#00F2FE]" />
              <span className="max-w-[120px] truncate">
                {psemineProfile?.username || currentUser?.email?.split('@')[0] || 'Account'}
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold transition-all"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg bg-white/5"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0B0E17] border-b border-white/10 px-4 pt-2 pb-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold ${
                    isActive
                      ? 'bg-[#00F2FE]/10 text-[#00F2FE] border border-[#00F2FE]/30'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAccountModal(true);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-300 bg-white/5"
              >
                <User size={16} className="text-[#00F2FE]" />
                <span>Account ({psemineProfile?.username || currentUser?.email})</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-400 bg-red-500/10 border border-red-500/20"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#05070D] py-6 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PsemineLogo size="sm" />
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 font-medium">Enterprise Infrastructure</span>
          </div>
          <p>© {new Date().getFullYear()} PSEmine. All rights reserved.</p>
        </div>
      </footer>

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0E17] border border-white/10 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setShowAccountModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg bg-white/5"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#00F2FE]/10 border border-[#00F2FE]/30 rounded-xl text-[#00F2FE]">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">PSEmine Account</h3>
                <p className="text-xs text-gray-400">Authentication & Identity Profile</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Username / Display Name</p>
                <p className="text-sm font-semibold text-white mt-0.5">{psemineProfile?.username || 'N/A'}</p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Email Address</p>
                <p className="text-sm font-semibold text-white mt-0.5">{currentUser?.email || 'N/A'}</p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Email Verification</p>
                  <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={14} /> Verified
                  </p>
                </div>
                <div className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md">
                  Active
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Onboarding Status</p>
                  <p className="text-xs font-semibold text-cyan-400 flex items-center gap-1 mt-0.5">
                    <Zap size={14} /> {psemineProfile?.hasCompletedGuide ? 'Guide Completed' : 'Guide Pending'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PsemineLayout;
