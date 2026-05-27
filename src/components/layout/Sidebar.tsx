import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { userData } = useAuth();
  const isAdmin = userData?.role === 'admin';

  const links = isAdmin ? [
    { name: 'Core Hub', href: '/pulse-core' },
    { name: 'Dashboard', href: '/dashboard' },
  ] : [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Wallet', href: '/wallet' },
    { name: 'Marketplace', href: '/tasks' },
    { name: 'Referrals', href: '/referrals' },
    { name: 'Profile', href: '/me' },
  ];

  return (
    <aside className="hidden lg:block w-64 fixed left-0 top-0 h-screen border-r border-white/10 p-6">
      <div className="mb-10 font-bold text-xl">PulseEarn</div>
      <nav className="space-y-4">
        {links.map(link => (
          <NavLink
            key={link.href}
            to={link.href}
            className={({ isActive }) => `block text-sm ${isActive ? 'text-primary font-bold' : 'text-white/40'}`}
          >
            {link.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
