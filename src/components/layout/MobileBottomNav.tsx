import React from 'react';
import { Home, User, ShieldCheck, Wallet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();

  const isAdmin = userData?.role === 'admin';

  // HIDE ON LANDING AND AUTH PAGES
  const hidePaths = ['/', '/login', '/signup'];

  // NEW LOGIC: Also hide on sub-pages (pages that are not the main tabs)
  const mainTabs = isAdmin
    ? ['/pulse-core', '/me']
    : ['/dashboard', '/wallet', '/me'];

  const isMainTab = mainTabs.includes(location.pathname);

  if (hidePaths.includes(location.pathname) || !isMainTab) return null;

  const dashboardTabs = isAdmin ? [
    { name: 'Core', icon: ShieldCheck, href: '/pulse-core' },
    { name: 'Me', icon: User, href: '/me' },
  ] : [
    { name: 'Home', icon: Home, href: '/dashboard' },
    { name: 'Wallet', icon: Wallet, href: '/wallet' },
    { name: 'Me', icon: User, href: '/me' },
  ];

  const tabs = dashboardTabs;

  const handleTabClick = (tab: any) => {
    navigate(tab.href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="bg-black/80 backdrop-blur-xl border border-white/5 rounded-3xl flex items-center justify-around relative px-2 shadow-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.href;

          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              className="relative flex flex-col items-center justify-center py-4 flex-1 transition-colors group"
            >
              <div className={cn(
                "relative z-10 flex flex-col items-center transition-all duration-300",
                isActive ? "text-white" : "text-white/20"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className="absolute bottom-2 w-1 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
