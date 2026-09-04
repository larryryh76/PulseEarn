import * as React from 'react';
import { useEffect } from 'react';
import {
  LayoutGrid,
  Zap,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Activity,
  Users,
  ShieldAlert,
  Bell,
  Trophy,
  BarChart3,
  MessageSquare,
  FileText,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Settings,
  Globe
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { AdminErrorBoundary } from '../../components/admin/layout/AdminErrorBoundary';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  category: 'CORE' | 'ECONOMY' | 'SYSTEM' | 'SECURITY';
  isAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'OVERVIEW', label: 'Overview', icon: LayoutGrid, path: '/admin/overview', category: 'CORE' },
  { id: 'TASKS', label: 'Task Library', icon: Zap, path: '/admin/tasks', category: 'CORE' },
  { id: 'PREDICTIONS', label: 'Markets', icon: TrendingUp, path: '/admin/predictions', category: 'CORE' },

  { id: 'VALIDATION', label: 'Approvals', icon: ShieldCheck, path: '/admin/validation', category: 'ECONOMY' },
  { id: 'WITHDRAWALS', label: 'Withdrawals', icon: CreditCard, path: '/admin/withdrawals', category: 'ECONOMY', isAdminOnly: true },
  { id: 'LEDGER', label: 'Transactions', icon: Activity, path: '/admin/ledger', category: 'ECONOMY', isAdminOnly: true },
  { id: 'ECONOMY', label: 'Economy Hub', icon: BarChart3, path: '/admin/economy', category: 'ECONOMY', isAdminOnly: true },
  { id: 'XP', label: 'XP Engine', icon: Trophy, path: '/admin/xp', category: 'ECONOMY', isAdminOnly: true },

  { id: 'USERS', label: 'User Directory', icon: Users, path: '/admin/users', category: 'SYSTEM' },
  { id: 'OFFERWALLS', label: 'Offerwalls', icon: Globe, path: '/admin/offerwalls', category: 'SYSTEM', isAdminOnly: true },
  { id: 'MODERATORS', label: 'Moderators', icon: ShieldCheck, path: '/admin/moderators', category: 'SYSTEM', isAdminOnly: true },
  { id: 'SUPPORT', label: 'Support Desk', icon: MessageSquare, path: '/admin/support', category: 'SYSTEM' },
  { id: 'NOTIFICATIONS', label: 'Broadcasts', icon: Bell, path: '/admin/broadcasts', category: 'SYSTEM' },

  { id: 'SECURITY', label: 'Threat Stream', icon: ShieldAlert, path: '/admin/security', category: 'SECURITY', isAdminOnly: true },
  { id: 'AUDIT', label: 'Audit Logs', icon: FileText, path: '/admin/audit', category: 'SECURITY', isAdminOnly: true },
  { id: 'HEALTH', label: 'System Health', icon: Activity, path: '/admin/health', category: 'SECURITY', isAdminOnly: true },
];

const OpsLayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, userData, currentUser, loading } = useAuth();
  const { isInitialized, systemStatus, lastError } = useAdmin();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const isAdmin = React.useMemo(() => {
    return userData?.role === 'admin';
  }, [userData]);

  const isModerator = React.useMemo(() => {
    return isAdmin || userData?.role === 'moderator' || userData?.isRoot === true;
  }, [userData, isAdmin]);

  if (loading || !isInitialized) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8">
      <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_30px_rgba(0,112,255,0.2)]" />
      <div className="text-center space-y-4 max-w-sm px-6">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary animate-pulse">
          {systemStatus === 'OFFLINE' ? 'Initialization Halted' : 'Initializing Admin Hub'}
        </p>
        {lastError && (
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-danger">Critical Authority Failure</p>
            <p className="text-[10px] font-mono text-text-secondary leading-relaxed break-all uppercase">{lastError}</p>
          </div>
        )}
        <div className="h-1 w-48 bg-surface-glass rounded-full overflow-hidden relative mx-auto">
          <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/2 bg-primary shadow-[0_0_15px_rgba(0,112,255,0.5)]"
          />
        </div>
      </div>
    </div>
  );

  if (!isModerator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 max-w-md">
           <ShieldAlert size={48} className="text-danger mx-auto" />
           <h1 className="text-2xl font-bold tracking-tighter uppercase">Access Denied</h1>
           <p className="text-text-secondary text-sm">Your credentials are not authorized for PulseEarn Administration. This attempt has been logged.</p>
           <button onClick={() => navigate('/')} className="px-8 py-3 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded hover:bg-white/90 transition-all">Return to Home</button>
        </motion.div>
      </div>
    );
  }

  const renderNavGroup = (category: string) => {
    const visibleItems = NAV_ITEMS.filter(item => {
       if (item.category !== category) return false;
       if (item.isAdminOnly && !isAdmin) return false;
       return true;
    });

    if (visibleItems.length === 0) return null;

    return (
      <div className="space-y-1 mb-8">
         <p className={cn(
           "text-[9px] font-black uppercase tracking-[0.2em] px-4 mb-2 text-text-tertiary transition-all",
           isSidebarCollapsed && "opacity-0 invisible h-0"
         )}>
           {category}
         </p>
         {visibleItems.map(item => {
           const isActive = pathname === item.path;
           return (
             <Link
               key={item.id}
               to={item.path}
               className={cn(
                 "flex items-center gap-4 px-4 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all group relative",
                 isActive
                  ? "bg-primary text-text-primary shadow-lg shadow-primary/20"
                  : "text-text-tertiary hover:text-text-primary hover:bg-surface-glass"
               )}
             >
               <item.icon size={18} className={cn("shrink-0", isActive ? "text-text-primary" : "text-text-tertiary group-hover:text-primary")} />
               {!isSidebarCollapsed && <span>{item.label}</span>}
               {isActive && !isSidebarCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
               {isSidebarCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-[#12121A] border border-border-bright rounded text-[10px] font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none uppercase tracking-widest">
                     {item.label}
                  </div>
               )}
             </Link>
           );
         })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-primary/30 flex overflow-hidden font-sans transition-colors duration-300">

      <aside className={cn(
        "hidden lg:flex flex-col border-r border-border bg-surface-bright transition-all duration-300 relative z-50",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <div className="p-6 border-b border-border flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                 <Settings size={18} className="text-text-primary" />
              </div>
              {!isSidebarCollapsed && <span className="text-xs font-black uppercase tracking-[0.3em]">Admin Panel</span>}
           </div>
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-surface-glass rounded text-text-tertiary hover:text-text-primary">
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
           </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto no-scrollbar pt-8 bg-surface-bright pb-20">
           {renderNavGroup('CORE')}
           {renderNavGroup('ECONOMY')}
           {renderNavGroup('SYSTEM')}
           {renderNavGroup('SECURITY')}
        </nav>

        <div className="p-4 border-t border-border space-y-2 bg-surface-bright">
           <div className={cn(
             "p-4 bg-surface border border-border rounded-xl transition-all",
             isSidebarCollapsed && "p-2 items-center flex justify-center"
           )}>
              <div className="flex items-center gap-3">
                 <img
                   src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid}`}
                   alt=""
                   className="w-8 h-8 rounded border border-border-bright"
                 />
                 {!isSidebarCollapsed && (
                    <div className="min-w-0">
                       <p className="text-[10px] font-bold truncate uppercase">{userData?.username || 'Admin'}</p>
                       <p className="text-[9px] font-mono text-text-tertiary truncate">{currentUser?.email}</p>
                    </div>
                 )}
              </div>
           </div>
           <button
             onClick={() => logout()}
             className={cn(
               "w-full flex items-center gap-4 px-4 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest text-danger/60 hover:text-danger hover:bg-danger/5 transition-all",
               isSidebarCollapsed && "justify-center"
             )}
           >
              <LogOut size={16} />
              {!isSidebarCollapsed && <span>Terminate Session</span>}
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
         <header className="h-16 border-b border-border px-8 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40">
            <div className="flex items-center gap-6">
               <div className="lg:hidden flex items-center gap-3">
                  <Settings size={20} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Admin Panel</span>
               </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/5 border border-success/10">
                     <div className={cn(
                       "w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]",
                       systemStatus === 'ONLINE' ? "bg-success animate-pulse" : "bg-danger"
                     )} />
                     <span className="text-[9px] font-black uppercase tracking-widest text-success"> {systemStatus}</span>
                  </div>
               </div>
               <button className="lg:hidden p-2 hover:bg-surface-glass rounded" onClick={() => setIsMobileOpen(true)}>
                  <Menu size={20} />
               </button>
            </div>
         </header>

         <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 lg:p-12 pb-24 md:pb-12 safe-area-bottom">
            <AdminErrorBoundary>
               <div className="max-w-[1600px] mx-auto w-full">
                  {children}
               </div>
            </AdminErrorBoundary>
         </main>
      </div>

      <AnimatePresence>
         {isMobileOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] lg:hidden bg-background flex flex-col">
               <div className="p-6 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Settings size={24} className="text-primary" />
                     <span className="text-sm font-black uppercase tracking-widest">Admin Panel</span>
                  </div>
                  <button onClick={() => setIsMobileOpen(false)} className="p-2 bg-surface-glass rounded-full"><X size={24} /></button>
               </div>
               <div className="flex-1 p-6 overflow-y-auto">
                  {NAV_ITEMS.filter(item => !item.isAdminOnly || isAdmin).map(item => (
                     <Link
                       key={item.id}
                       to={item.path}
                       onClick={() => setIsMobileOpen(false)}
                       className={cn(
                         "flex items-center gap-6 p-6 rounded-2xl text-[13px] font-bold uppercase tracking-widest mb-2 transition-all",
                         pathname === item.path ? "bg-primary text-text-primary" : "text-text-tertiary"
                       )}
                     >
                        <item.icon size={24} />
                        {item.label}
                     </Link>
                  ))}
               </div>
               <div className="p-6 border-t border-border">
                  <button onClick={() => logout()} className="w-full py-6 rounded-2xl bg-danger/10 text-danger font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-4">
                     <LogOut size={20} />
                     Terminate Session
                  </button>
               </div>
            </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
};

const OpsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AdminProvider>
    <OpsLayoutContent>{children}</OpsLayoutContent>
  </AdminProvider>
);

export default OpsLayout;
