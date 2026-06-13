import * as React from 'react';
import {
  LayoutGrid,
  Target,
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
  Search,
  Command,
  Terminal,
  Globe
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  category: 'CORE' | 'ECONOMY' | 'SYSTEM' | 'SECURITY';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'OVERVIEW', label: 'Overview', icon: LayoutGrid, path: '/admin/overview', category: 'CORE' },
  { id: 'CAMPAIGNS', label: 'Campaigns', icon: Target, path: '/admin/campaigns', category: 'CORE' },
  { id: 'TASKS', label: 'Task Library', icon: Zap, path: '/admin/tasks', category: 'CORE' },
  { id: 'PREDICTIONS', label: 'Markets', icon: TrendingUp, path: '/admin/predictions', category: 'CORE' },

  { id: 'VALIDATION', label: 'Approvals', icon: ShieldCheck, path: '/admin/validation', category: 'ECONOMY' },
  { id: 'WITHDRAWALS', label: 'Withdrawals', icon: CreditCard, path: '/admin/withdrawals', category: 'ECONOMY' },
  { id: 'LEDGER', label: 'Transactions', icon: Activity, path: '/admin/ledger', category: 'ECONOMY' },
  { id: 'ECONOMY', label: 'Economy Hub', icon: BarChart3, path: '/admin/economy', category: 'ECONOMY' },

  { id: 'USERS', label: 'User Directory', icon: Users, path: '/admin/users', category: 'SYSTEM' },
  { id: 'SUPPORT', label: 'Support Desk', icon: MessageSquare, path: '/admin/support', category: 'SYSTEM' },
  { id: 'NOTIFICATIONS', label: 'Broadcasts', icon: Bell, path: '/admin/broadcasts', category: 'SYSTEM' },
  { id: 'MISSIONS', label: 'Global Missions', icon: Trophy, path: '/admin/missions', category: 'SYSTEM' },

  { id: 'SECURITY', label: 'Threat Stream', icon: ShieldAlert, path: '/admin/security', category: 'SECURITY' },
  { id: 'AUDIT', label: 'Audit Logs', icon: FileText, path: '/admin/audit', category: 'SECURITY' },
];

const OpsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, userData, currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const isAdmin = React.useMemo(() => {
    if (!currentUser) return false;
    return currentUser.email?.toLowerCase() === import.meta.env.VITE_ADMIN_EMAIL || userData?.role === 'admin';
  }, [currentUser, userData]);

  if (loading) return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center">
      <div className="w-12 h-12 border-t-2 border-primary rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 max-w-md">
           <Terminal size={48} className="text-danger mx-auto" />
           <h1 className="text-2xl font-bold tracking-tighter uppercase">Access Denied</h1>
           <p className="text-white/40 text-sm">Your credentials are not authorized for PulseEarn Operations. This attempt has been logged.</p>
           <button onClick={() => navigate('/')} className="px-8 py-3 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded hover:bg-white/90 transition-all">Return to Home</button>
        </motion.div>
      </div>
    );
  }

  const renderNavGroup = (category: string) => (
    <div className="space-y-1 mb-8">
       <p className={cn(
         "text-[9px] font-black uppercase tracking-[0.2em] px-4 mb-2 text-white/20 transition-all",
         isSidebarCollapsed && "opacity-0 invisible h-0"
       )}>
         {category}
       </p>
       {NAV_ITEMS.filter(item => item.category === category).map(item => {
         const isActive = location.pathname === item.path;
         return (
           <Link
             key={item.id}
             to={item.path}
             className={cn(
               "flex items-center gap-4 px-4 py-3 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all group relative",
               isActive
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-text-tertiary hover:text-white hover:bg-white/5"
             )}
           >
             <item.icon size={18} className={cn("shrink-0", isActive ? "text-white" : "text-white/20 group-hover:text-primary")} />
             {!isSidebarCollapsed && <span>{item.label}</span>}
             {isActive && !isSidebarCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
             {isSidebarCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-[#12121A] border border-white/10 rounded text-[10px] font-bold whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none uppercase tracking-widest">
                   {item.label}
                </div>
             )}
           </Link>
         );
       })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-primary/30 flex overflow-hidden font-sans">

      <aside className={cn(
        "hidden lg:flex flex-col border-r border-white/5 bg-[#08080C] transition-all duration-300 relative z-50",
        isSidebarCollapsed ? "w-20" : "w-72"
      )}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
                 <Terminal size={18} className="text-white" />
              </div>
              {!isSidebarCollapsed && <span className="text-xs font-black uppercase tracking-[0.3em]">Ops Control</span>}
           </div>
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-white/5 rounded text-white/20 hover:text-white">
              {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
           </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto no-scrollbar pt-8">
           {renderNavGroup('CORE')}
           {renderNavGroup('ECONOMY')}
           {renderNavGroup('SYSTEM')}
           {renderNavGroup('SECURITY')}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
           <div className={cn(
             "p-4 bg-white/[0.02] border border-white/5 rounded-xl transition-all",
             isSidebarCollapsed && "p-2 items-center flex justify-center"
           )}>
              <div className="flex items-center gap-3">
                 <img
                   src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${currentUser?.uid}`}
                   alt=""
                   className="w-8 h-8 rounded border border-white/10"
                 />
                 {!isSidebarCollapsed && (
                    <div className="min-w-0">
                       <p className="text-[10px] font-bold truncate uppercase">{userData?.username || 'Admin'}</p>
                       <p className="text-[9px] font-mono text-white/20 truncate">{currentUser?.email}</p>
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
         <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between sticky top-0 bg-[#050507]/80 backdrop-blur-md z-40">
            <div className="flex items-center gap-6">
               <div className="lg:hidden flex items-center gap-3">
                  <Terminal size={20} className="text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Ops</span>
               </div>
               <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 bg-white/[0.03] border border-white/10 rounded-lg text-white/20">
                  <Search size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Search System...</span>
                  <div className="flex items-center gap-1 ml-4 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                     <Command size={10} />
                     <span className="text-[9px]">K</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="flex items-center gap-4 text-white/20">
                  <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                     <span className="text-[9px] font-mono uppercase tracking-widest">Global Link Active</span>
                  </div>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-2">
                     <Globe size={14} />
                     <span className="text-[9px] font-mono uppercase tracking-widest">PROD_V5.4.0</span>
                  </div>
               </div>
               <button className="lg:hidden p-2 hover:bg-white/5 rounded" onClick={() => setIsMobileOpen(true)}>
                  <Menu size={20} />
               </button>
            </div>
         </header>

         <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 lg:p-12">
            <div className="max-w-[1600px] mx-auto">
               {children}
            </div>
         </main>
      </div>

      <AnimatePresence>
         {isMobileOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] lg:hidden bg-black flex flex-col">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <Terminal size={24} className="text-primary" />
                     <span className="text-sm font-black uppercase tracking-widest">Ops Control</span>
                  </div>
                  <button onClick={() => setIsMobileOpen(false)} className="p-2 bg-white/5 rounded-full"><X size={24} /></button>
               </div>
               <div className="flex-1 p-6 overflow-y-auto">
                  {NAV_ITEMS.map(item => (
                     <Link
                       key={item.id}
                       to={item.path}
                       onClick={() => setIsMobileOpen(false)}
                       className={cn(
                         "flex items-center gap-6 p-6 rounded-2xl text-[13px] font-bold uppercase tracking-widest mb-2 transition-all",
                         location.pathname === item.path ? "bg-primary text-white" : "text-white/20"
                       )}
                     >
                        <item.icon size={24} />
                        {item.label}
                     </Link>
                  ))}
               </div>
               <div className="p-6 border-t border-white/5">
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

export default OpsLayout;
