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
    { name: 'Earn', icon: Zap, href: '/tasks' },
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
    <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[94%] z-50">
      <div className="bg-[#030305]/80 backdrop-blur-3xl rounded-[2rem] border border-white/[0.08] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-around relative overflow-hidden">
        {/* Animated Background Pulse */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;

          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              className="relative flex flex-col items-center justify-center py-2.5 px-1 flex-1 transition-all duration-300"
            >
              <div className={cn(
                "relative z-10 transition-all duration-500 flex flex-col items-center",
                isActive ? "text-primary -translate-y-1" : "text-white/20"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive && "drop-shadow-[0_0_8px_rgba(0,112,255,0.6)]")} />
                <span className={cn(
                  "text-[9px] font-bold mt-1.5 tracking-widest uppercase transition-all duration-300",
                  isActive ? "text-white opacity-100" : "text-white/0 opacity-0"
                )}>
                  {tab.name}
                </span>
              </div>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-x-1 inset-y-1 bg-white/[0.03] border border-white/[0.05] rounded-[1.5rem] -z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              {isActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_#0070ff]"
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
