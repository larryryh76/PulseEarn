import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LayoutDashboard, Zap, Wallet, User } from 'lucide-react';
import { cn } from '../../utils';

const MobileBottomNav: React.FC = () => {
  const { userData } = useAuth();
  if (!userData) return null;

  const links = [
    { name: 'Core', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/tasks', icon: Zap },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    { name: 'Me', href: '/me', icon: User },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/[0.05] pb-safe">
      <div className="h-16 flex items-center justify-around px-6">
        {links.map(link => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive: active }) => cn(
              "flex flex-col items-center gap-1 transition-all duration-300",
              active ? "text-primary scale-110" : "text-white/20 hover:text-white/40"
            )}
          >
            <link.icon size={20} strokeWidth={2} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{link.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileBottomNav;
