import React from 'react';
import { Home, Zap, TrendingUp, Trophy, User, CheckSquare, Users, ShieldCheck } from 'lucide-react';
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
    { name: 'Tasks', icon: CheckSquare, href: '/tasks' },
    { name: 'Earn', icon: Zap, href: '/rewards' },
    { name: 'Invite', icon: Users, href: '/referrals' },
    { name: 'Me', icon: User, href: '/me' },
  ];

  const isDashboard = location.pathname.startsWith('/dashboard') ||
                      ['/tasks', '/rewards', '/referrals', '/me', '/predict', '/pulse-core'].includes(location.pathname);

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
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] z-50">
      <div className="bg-[#0D0D12]/90 backdrop-blur-2xl rounded-2xl border border-white/[0.08] px-1 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-around relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;

          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              className="relative flex flex-col items-center py-2 px-3 transition-all duration-300 min-w-[64px]"
            >
              <div className={cn(
                "relative z-10 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-white/20"
              )}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl -z-0 border border-primary/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <span className={cn(
                "text-[10px] font-bold mt-1.5 tracking-tight transition-colors duration-300",
                isActive ? "text-white" : "text-white/10"
              )}>
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
