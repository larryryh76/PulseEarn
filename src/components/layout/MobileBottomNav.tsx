import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const MobileBottomNav: React.FC = () => {
  const { userData } = useAuth();
  if (!userData) return null;

  const links = [
    { name: 'Home', href: '/dashboard' },
    { name: 'Wallet', href: '/wallet' },
    { name: 'Me', href: '/me' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-white/10 flex items-center justify-around px-4">
      {links.map(link => (
        <NavLink
          key={link.href}
          to={link.href}
          className={({ isActive }) => `text-xs uppercase font-bold ${isActive ? 'text-primary' : 'text-white/40'}`}
        >
          {link.name}
        </NavLink>
      ))}
    </div>
  );
};

export default MobileBottomNav;
