import React from 'react';
import { LayoutDashboard, Shield, Wallet, User, TrendingUp } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils';
import { useTasks } from '../../hooks/useTasks';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { tasks, userTasks, systemTasks, campaigns } = useTasks();

  const isAdminView = location.pathname.startsWith('/admin');
  if (isAdminView) return null;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Prediction', path: '/predictions', icon: TrendingUp },
    { name: 'Tasks', path: '/tasks', icon: Shield },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Me', path: '/me', icon: User },
  ];

  const actionableCampaignCount = campaigns.filter(c => {
    if (!c.active) return false;
    const campaignTasks = tasks.filter(t => t.campaignId === c.id);
    return campaignTasks.some(t => {
       const status = userTasks[t.id]?.status || 'available';
       return status === 'available' || status === 'rejected';
    });
  }).length;

  const claimableMissionCount = systemTasks.filter(m => m.progress?.status === 'COMPLETED').length;
  const totalActionableCount = actionableCampaignCount + claimableMissionCount;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-t border-border px-6 py-4 safe-area-bottom">
      <div className="flex items-center justify-between">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "flex flex-col items-center gap-2 transition-all relative",
                isActive ? "text-primary" : "text-text-secondary"
              )}
            >
              <div className="relative">
                 <link.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                 {link.path === '/tasks' && totalActionableCount > 0 && (
                   <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                      <span className="text-[7px] font-bold text-text-primary">{totalActionableCount}</span>
                   </div>
                 )}
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest">{link.name}</span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
