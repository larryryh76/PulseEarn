import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  LogOut,
  User,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils';
import Logo from '../ui/Logo';

const Sidebar: React.FC = () => {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = userData?.role === 'admin';

  const menuItems = isAdmin ? [
    { name: 'Core Hub', icon: ShieldCheck, href: '/pulse-core' },
    { name: 'User View', icon: LayoutDashboard, href: '/dashboard' },
  ] : [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Marketplace', icon: CheckSquare, href: '/tasks', disabled: true },
    { name: 'Wallet', icon: Wallet, href: '/wallet' },
    { name: 'Referrals', icon: Users, href: '/referrals' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-black border-r border-border-subtle z-40">
      <div className="px-6 py-10">
        <Logo />
      </div>

      <div className="flex-1 px-4 py-2 space-y-8">
        {/* Main Section */}
        <div className="space-y-1">
          <p className="px-4 pb-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Ecosystem</p>
          {menuItems.map((item) => {
             const isActive = location.pathname === item.href;
             return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={(e) => item.disabled && e.preventDefault()}
                className={cn(
                  "flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-white/[0.04] text-white"
                    : item.disabled
                      ? "text-white/10 cursor-not-allowed"
                      : "text-white/40 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className={cn(isActive ? "text-primary" : "text-current")} />
                  <div className="flex flex-col">
                    <span className="font-semibold text-[13px]">{item.name}</span>
                    {item.disabled && (
                      <span className="text-[9px] font-medium text-white/10 uppercase tracking-widest leading-none">Maintenance</span>
                    )}
                  </div>
                </div>
                {isActive && (
                   <div className="absolute right-3 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(0,102,255,0.8)]" />
                )}
              </NavLink>
             );
          })}
        </div>

        {/* Identity Section */}
        <div className="space-y-1">
           <p className="px-4 pb-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.15em]">Personal</p>
           <NavLink
              to="/me"
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                isActive ? "bg-white/[0.04] text-white" : "text-white/40 hover:text-white hover:bg-white/[0.02]"
              )}
           >
              <User size={18} className={cn(location.pathname === '/me' ? "text-primary" : "text-current")} />
              <span className="font-semibold text-[13px]">Identity Center</span>
           </NavLink>
        </div>
      </div>

      <div className="p-4 border-t border-border-subtle">
        <div className="bg-white/[0.02] border border-border-subtle rounded-2xl p-4 mb-4">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                 {userData?.level || 1}
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[12px] font-bold text-white truncate">{userData?.username}</p>
                 <p className="text-[10px] font-medium text-white/30 truncate">Level {userData?.level} Tier</p>
              </div>
           </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-white/30 hover:text-danger transition-colors duration-200 group text-[13px] font-medium"
        >
          <LogOut size={18} />
          <span>Terminate Session</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
