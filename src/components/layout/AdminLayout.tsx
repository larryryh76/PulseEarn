import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Database,
  Users,
  Server,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils';
import Logo from '../ui/Logo';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const adminMenu = [
    { name: 'System Operations', icon: Server, href: '/pulse-core' },
    { name: 'Global Ledger', icon: Database, href: '/pulse-core/ledger' },
    { name: 'User Moderation', icon: Users, href: '/pulse-core/users' },
    { name: 'Task Orchestrator', icon: ClipboardList, href: '/pulse-core/tasks' },
    { name: 'Configuration', icon: Settings, href: '/pulse-core/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b border-white/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-[8px] font-bold text-primary uppercase tracking-widest border border-primary/20">Ops</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white/40">
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        <p className="px-4 py-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">Control</p>
        {adminMenu.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/pulse-core'}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-white/40 hover:text-white hover:bg-white/[0.03] border border-transparent"
            )}
          >
            <item.icon size={18} className={cn("transition-transform group-hover:scale-110")} />
            <span className="text-xs font-bold tracking-wide">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/[0.03] space-y-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-white/40 hover:text-white transition-colors text-xs font-bold"
        >
          <ChevronLeft size={18} />
          Back to App
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-white/40 hover:text-red-500 transition-colors text-xs font-bold group"
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          Exit System
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 border-b border-white/[0.05] bg-[#08080C] px-4 flex items-center justify-between sticky top-0 z-40">
        <Logo />
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white/60">
          <Menu size={24} />
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-white/[0.05] bg-[#08080C] flex-col h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#08080C] z-[60] flex flex-col border-r border-white/10 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="hidden lg:flex h-16 border-b border-white/[0.03] bg-[#08080C]/50 backdrop-blur-md items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">System Online</span>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Root Session Active</span>
             </div>
          </div>
        </header>

        <main className="p-4 md:p-8 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
