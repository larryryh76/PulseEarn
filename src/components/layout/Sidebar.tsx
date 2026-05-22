import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Zap,
  Users,
  LogOut,
  ChevronRight,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils';
import Logo from '../ui/Logo';

const Sidebar: React.FC = () => {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();

  const isAdmin = userData?.role === 'admin';

  const menuItems = isAdmin ? [
    { name: 'Control Center', icon: ShieldCheck, href: '/pulse-core' },
    { name: 'Me', icon: User, href: '/me' },
  ] : [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Tasks', icon: CheckSquare, href: '/tasks' },
    { name: 'Earn', icon: Zap, href: '/rewards' },
    { name: 'Invite', icon: Users, href: '/referrals' },
    { name: 'Me', icon: User, href: '/me' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen fixed left-0 top-0 bg-[#050507] border-r border-white/[0.05] z-40">
      <div className="p-8">
        <Logo />
      </div>

      <nav className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={20} />
                <span className="font-bold text-[13px] tracking-wide">{item.name}</span>
              </div>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="p-6 border-t border-white/[0.05]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-white/40 hover:text-red-400 transition-colors duration-300 group"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-[13px] tracking-wide">Logout Account</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
