import React from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Layers, 
  Users, 
  History, 
  User,
  ArrowRight
} from 'lucide-react';
import { usePSEMineAuth } from '../../contexts/PSEMineAuthContext';
import { cn } from '../../utils';

/**
 * PSEMine Bottom Navigation Bar
 * 
 * Primary mobile navigation for the authenticated PSEmine mining experience.
 * Contains ONLY actual application destinations:
 * 1. Mine (Dashboard) - /mine/dashboard
 * 2. Tools - /mine/tools
 * 3. Boost (Referrals) - /mine/referrals
 * 4. Ledger (Activity) - /mine/activity
 * 5. Account - /mine/me
 * 
 * Rules:
 * - NO public marketing landing page in authenticated tabs
 * - When on `/mine` (landing page), displays a single high-conversion "Enter PSEmine" bar instead of internal app tabs
 * - Icons are clean Web3 financial icons (Layers, LayoutDashboard, History, etc. - NO pickaxes)
 */
export const PSEMineBottomNav: React.FC = () => {
  const location = useLocation();
  const { currentUser } = usePSEMineAuth();
  
  const isLandingPage = location.pathname === '/mine';

  // If on the public marketing landing page, provide a clean conversion bar on mobile rather than app tabs
  if (isLandingPage) {
    return (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070A0F]/95 backdrop-blur-xl border-t border-white/8 p-3 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <Link
            to={currentUser ? "/mine/dashboard" : "/signup?redirect=/mine/dashboard"}
            className="w-full flex items-center justify-center gap-2 bg-[#2bb39a] hover:bg-[#258f7c] text-[#070A0F] font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#2bb39a]/20 active:scale-[0.98] transition-all"
          >
            <span>{currentUser ? "Open Mining Console" : "Start Mining Campaign"}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      to: '/mine/dashboard',
      label: 'Mine',
      icon: LayoutDashboard,
    },
    {
      to: '/mine/tools',
      label: 'Tools',
      icon: Layers,
    },
    {
      to: '/mine/referrals',
      label: 'Boost',
      icon: Users,
    },
    {
      to: '/mine/activity',
      label: 'Ledger',
      icon: History,
    },
    {
      to: '/mine/me',
      label: 'Account',
      icon: User,
    }
  ];

  return (
    <nav 
      aria-label="Mobile Navigation" 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070A0F]/95 dark:bg-[#070A0F]/95 bg-background/95 backdrop-blur-xl border-t border-white/8 dark:border-white/8 border-border safe-area-bottom shadow-2xl transition-colors"
    >
      <div className="max-w-md mx-auto flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-150 relative group",
                isActive
                  ? "text-[#2bb39a]"
                  : "text-text-tertiary hover:text-text-primary"
              )}
            >
              {/* Active top glow indicator */}
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-[#2bb39a] rounded-full shadow-[0_0_8px_rgba(0,229,153,0.8)]" />
              )}

              <Icon className={cn(
                "w-5 h-5 mb-1 transition-transform duration-150", 
                isActive ? "scale-110" : "group-hover:scale-105"
              )} />
              <span className="text-[10px] font-bold tracking-tight">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default PSEMineBottomNav;
