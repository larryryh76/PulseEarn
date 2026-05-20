import React, { useState } from 'react';
import { Home, Zap, TrendingUp, Trophy, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../utils';

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('Home');

  const tabs = [
    { name: 'Home', icon: Home, href: '/' },
    { name: 'Earn', icon: Zap, href: '/#earn' },
    { name: 'Predict', icon: TrendingUp, href: '/#predict' },
    { name: 'Leaderboard', icon: Trophy, href: '/#leaderboard' },
    { name: 'Profile', icon: User, href: '/signup' },
  ];

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.name);
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
    <div className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] z-50">
      <div className="bg-[#0D0D12]/90 backdrop-blur-xl rounded-2xl border border-white/[0.08] px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;

          return (
            <button
              key={tab.name}
              onClick={() => handleTabClick(tab)}
              className="relative flex flex-col items-center py-2 px-4 transition-all duration-300"
            >
              <div className={cn(
                "relative z-10 transition-colors duration-300",
                isActive ? "text-primary" : "text-white/30"
              )}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 bg-primary/10 rounded-xl -z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <span className={cn(
                "text-[10px] font-medium mt-1 tracking-wide transition-colors duration-300",
                isActive ? "text-white/90" : "text-white/20"
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
