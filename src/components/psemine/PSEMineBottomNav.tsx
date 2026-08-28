import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Cpu, 
  Wallet, 
  History, 
  User
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';

export const PSEMineBottomNav: React.FC = () => {
  const { currentUser } = useAuth();
  const { pseUser } = usePSEMine();

  const homePath = currentUser ? '/mine/dashboard' : '/mine';
  const totalHardwareCount = pseUser?.toolOwnershipCounts 
    ? Object.values(pseUser.toolOwnershipCounts).reduce((a, b) => a + b, 0)
    : 0;

  const navItems = [
    {
      label: 'Home',
      path: homePath,
      icon: LayoutDashboard,
      matchExact: homePath === '/mine',
    },
    {
      label: 'Mine',
      path: '/mine/tools',
      icon: Cpu,
      isCore: true,
      badge: totalHardwareCount > 0 ? `${totalHardwareCount}` : undefined,
    },
    {
      label: 'Wallet',
      path: currentUser ? '/mine/wallet' : '/mine',
      icon: Wallet,
    },
    {
      label: 'Activity',
      path: currentUser ? '/mine/activity' : '/mine',
      icon: History,
    },
    {
      label: 'Me',
      path: currentUser ? '/mine/me' : '/mine',
      icon: User,
    },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080C14]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2 safe-area-bottom shadow-2xl shadow-black/80"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.matchExact}
              className={({ isActive }) => `
                flex flex-col items-center justify-center relative py-1 px-3 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'text-blue-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  {item.isCore ? (
                    <div className="relative -mt-4 mb-0.5">
                      <div className={`
                        w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-200
                        ${isActive 
                          ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-blue-500/30 scale-105 ring-2 ring-blue-400/40' 
                          : 'bg-slate-800 text-slate-300 border border-slate-700/80 hover:bg-slate-700'
                        }
                      `}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {item.badge && (
                        <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-black rounded-full border border-slate-900 shadow">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="relative mb-0.5">
                      <Icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} />
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
                      )}
                    </div>
                  )}
                  
                  <span className={`text-[10px] tracking-tight leading-tight ${isActive ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
