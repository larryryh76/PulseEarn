import React from 'react';
import { Home, Gift, User, ShieldCheck, Wallet } from 'lucide-react';
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
    : ['/dashboard', '/rewards', '/wallet', '/me'];

  const isMainTab = mainTabs.includes(location.pathname);

  if (hidePaths.includes(location.pathname) || !isMainTab) return null;

  const dashboardTabs = isAdmin ? [
    { name: 'Core', icon: ShieldCheck, href: '/pulse-core' },
    { name: 'Me', icon: User, href: '/me' },
  ] : [
    { name: 'Home', icon: Home, href: '/dashboard' },
    { name: 'Earn', icon: Gift, href: '/rewards' },
    { name: 'Wallet', icon: Wallet, href: '/wallet' },
    { name: 'Me', icon: User, href: '/me' },
  ];

  const tabs = dashboardTabs;

  const activeTab = tabs.find(tab => location.pathname === tab.href)?.name || (isAdmin ? 'Core' : 'Dash');

  const handleTabClick = (tab: any) => {
    navigate(tab.href);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#030305]/95 backdrop-blur-3xl border-t border-white/[0.05] pb-safe flex items-center justify-around relative px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;

          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              className="relative flex flex-col items-center justify-center py-4 flex-1 transition-colors group"
            >
              <div className={cn(
                "relative z-10 flex flex-col items-center transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-white/20 hover:text-white/40"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-[9px] font-bold mt-1.5 uppercase tracking-[0.1em] transition-opacity duration-300",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  {tab.name}
                </span>
              </div>

              {isActive && (
                <motion.div
                  layoutId="navGlow"
                  className="absolute inset-0 bg-primary/5 blur-xl rounded-full"
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
