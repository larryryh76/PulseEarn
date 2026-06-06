import * as React from 'react';
import {
  Terminal,
  Layers,
  ShieldCheck,
  Activity,
  Users,
  ShieldAlert,
  BarChart3,
  Bell,
  FileText,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import Logo from '../../ui/Logo';
import { cn } from '../../../utils';

const AdminOpsLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState<boolean>(false);

  if (userData?.role !== 'admin') {
     return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
           <div>
              <ShieldAlert size={48} className="text-danger mx-auto mb-6" />
              <h1 className="text-2xl font-bold mb-2 uppercase tracking-tighter">Administrative Clearance Required</h1>
              <p className="text-white/40 text-sm mb-8">Access to the PulseEarn Operations Terminal is restricted to authorized personnel only.</p>
              <button onClick={() => navigate('/')} className="px-8 py-3 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/90 transition-all">Terminate Access Request</button>
           </div>
        </div>
     );
  }

  const navItems = [
    { id: 'OVERVIEW', label: 'Intelligence', icon: Terminal, path: '/admin/overview' },
    { id: 'CAMPAIGNS', label: 'Campaigns', icon: Layers, path: '/admin/campaigns' },
    { id: 'TASKS', label: 'Tasks', icon: Zap, path: '/admin/tasks' },
    { id: 'VALIDATION', label: 'Validation', icon: ShieldCheck, path: '/admin/validation' },
    { id: 'TRANSACTIONS', label: 'Ledger', icon: Activity, path: '/admin/ledger' },
    { id: 'USERS', label: 'Operators', icon: Users, path: '/admin/users' },
    { id: 'FRAUD', label: 'Security', icon: ShieldAlert, path: '/admin/security' },
    { id: 'ECONOMY', label: 'Economy', icon: BarChart3, path: '/admin/economy' },
    { id: 'NOTIFICATIONS', label: 'Broadcasts', icon: Bell, path: '/admin/broadcasts' },
    { id: 'AUDIT', label: 'System Logs', icon: FileText, path: '/admin/audit' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-primary/30 flex overflow-hidden">

      <aside className="hidden lg:flex w-80 border-r border-white/5 bg-background/50 backdrop-blur-xl flex-col z-50">
        <div className="p-8 border-b border-white/5 flex items-center gap-4">
           <Logo />
           <div className="h-4 w-px bg-white/10" />
           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Ops Terminal</span>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
           <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-4 mb-4">Command</p>
           {navItems.map(item => (
             <Link
               key={item.id}
               to={item.path}
               className={cn(
                 "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all",
                 location.pathname === item.path
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(0,102,255,0.05)]"
                  : "text-text-secondary hover:text-white hover:bg-white/5"
               )}
             >
               <item.icon size={18} />
               {item.label}
               {location.pathname === item.path && <ChevronRight size={14} className="ml-auto" />}
             </Link>
           ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
           <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
              <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Session Active</p>
              <p className="text-xs font-mono font-bold truncate text-white/60">{userData?.email}</p>
           </div>
           <button
             onClick={handleLogout}
             className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest text-danger/60 hover:text-danger hover:bg-danger/5 transition-all"
           >
              <LogOut size={18} />
              Terminate Session
           </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
         <header className="lg:hidden h-16 border-b border-white/5 px-6 flex items-center justify-between bg-background/80 backdrop-blur-md z-40">
            <Link to="/admin" className="flex items-center gap-3">
               <Logo />
               <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Ops</span>
            </Link>
            <button
              onClick={() => setIsMobileNavOpen(v => !v)}
              className="p-2 hover:bg-white/5 rounded-xl transition-all"
            >
               {isMobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
         </header>

         <header className="hidden lg:flex h-20 border-b border-white/5 px-12 items-center justify-between sticky top-0 bg-[#050507]/80 backdrop-blur-md z-40">
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
               <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Global Operations v5.2.0 // Node: US-East-01</span>
            </div>

            <div className="flex items-center gap-8">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <ShieldCheck size={14} className="text-success" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Audit Hardened</span>
               </div>
               <div className="h-8 w-px bg-white/10" />
               <div className="flex items-center gap-4">
                  <div className="text-right">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-white">System Admin</p>
                     <p className="text-[9px] font-mono text-white/40 uppercase">UID: {userData?.uid.slice(0, 8)}</p>
                  </div>
                  <img src={userData?.avatarUrl} alt="" className="w-10 h-10 rounded-xl border border-white/10 shadow-xl" />
               </div>
            </div>
         </header>

         <main className="flex-1 overflow-y-auto p-6 lg:p-12 relative">
            <div className="max-w-7xl mx-auto h-full">
               {children}
            </div>
         </main>

         <AnimatePresence>
            {isMobileNavOpen && (
               <motion.div
                 initial={{ opacity: 0, x: '-100%' }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: '-100%' }}
                 className="fixed inset-0 bg-background z-[100] lg:hidden flex flex-col"
               >
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                     <Logo />
                     <button onClick={() => setIsMobileNavOpen(false)}><X size={24} /></button>
                  </div>
                  <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
                     {navItems.map(item => (
                        <Link
                           key={item.id}
                           to={item.path}
                           onClick={() => setIsMobileNavOpen(false)}
                           className={cn(
                              "w-full flex items-center gap-6 p-6 rounded-[2rem] text-[13px] font-bold uppercase tracking-widest transition-all",
                              location.pathname === item.path
                              ? "bg-primary text-white"
                              : "text-text-secondary hover:bg-white/5"
                           )}
                        >
                           <item.icon size={22} />
                           {item.label}
                        </Link>
                     ))}
                  </nav>
                  <div className="p-6 border-t border-white/5">
                     <button onClick={handleLogout} className="w-full py-6 rounded-[2rem] bg-danger/10 text-danger font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-4">
                        <LogOut size={20} />
                        Logout
                     </button>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminOpsLayout;
