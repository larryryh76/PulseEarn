import React from 'react';
import { Home, Zap, TrendingUp, Trophy, User, ShieldCheck, Target, Wallet } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData } = useAuth();

  const isAdmin = userData?.role === 'admin';

  const landingTabs = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Earn', icon: Zap, href: '/#earn' },
    { name: 'Predict', icon: TrendingUp, href: '/#predict' },
    { name: 'Ranks', icon: Trophy, href: '/#leaderboard' },
    { name: 'Join', icon: User, href: currentUser ? '/dashboard' : '/signup' },
  ];

  const dashboardTabs = isAdmin ? [
    { name: 'Core', icon: ShieldCheck, href: '/pulse-core' },
    { name: 'Me', icon: User, href: '/me' },
  ] : [
    { name: 'Dash', icon: Home, href: '/dashboard' },
    { name: 'Oracle', icon: Target, href: '/predict' },
    { name: 'Tasks', icon: Zap, href: '/tasks' },
    { name: 'Bridge', icon: Wallet, href: '/withdraw' },
    { name: 'Me', icon: User, href: '/me' },
  ];

  const isDashboard = location.pathname.startsWith('/dashboard') ||
                      ['/tasks', '/rewards', '/referrals', '/me', '/predict', '/withdraw', '/pulse-core'].includes(location.pathname);

  const tabs = isDashboard ? dashboardTabs : landingTabs;

  const activeTab = tabs.find(tab => {
    if (tab.href.startsWith('/#')) return false;
    return location.pathname === tab.href;
  })?.name || (isDashboard ? (isAdmin ? 'Core' : 'Dash') : 'Home');

  const handleTabClick = (tab: any) => {
    if (tab.href.startsWith('/#')) {
      const id = tab.href.replace('/#', '');
      if (location.pathname === '/') {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/');
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      navigate(tab.href);
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-[#030305]/90 backdrop-blur-2xl border-t border-white/[0.05] pb-safe flex items-center justify-around relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;

          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              className="relative flex flex-col items-center justify-center py-3 flex-1 transition-colors group"
            >
              <div className={cn(
                "relative z-10 flex flex-col items-center transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-white/30 hover:text-white/60"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-[8px] font-bold mt-1 uppercase tracking-widest transition-opacity duration-300",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  {tab.name}
                </span>
              </div>

              {isActive && (
                <motion.div
                  layoutId="navDot"
                  className="absolute -top-[1px] w-8 h-[2px] bg-primary rounded-full shadow-[0_0_8px_#0070ff]"
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
