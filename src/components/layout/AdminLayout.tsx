import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import {
  ShieldCheck,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  Users,
  ClipboardList,
  Fingerprint,
  Cpu,
  Layout,
  BarChart3,
  AlertCircle
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
    { name: 'Overview', icon: Layout, href: '/admin' },
    { name: 'Economy Ledger', icon: BarChart3, href: '/admin/ledger' },
    { name: 'User Moderation', icon: Users, href: '/admin/users' },
    { name: 'Task Manager', icon: ClipboardList, href: '/admin/tasks' },
    { name: 'Fraud Prevention', icon: AlertCircle, href: '/admin/security' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SidebarContent = () => (
    <>
      <div className="p-8 border-b border-white/[0.05]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="px-2 py-0.5 rounded-lg bg-primary/10 border border-primary/20">
               <span className="text-[9px] font-black text-primary uppercase tracking-widest">Ops</span>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white/20 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        <p className="px-4 py-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mb-4">Operations Hub</p>
        {adminMenu.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/admin'}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) => cn(
              "v2-sidebar-item",
              isActive ? "v2-sidebar-item-active" : "v2-sidebar-item-inactive"
            )}
          >
            <item.icon size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-white/[0.05] space-y-3">
        <div className="p-4 bg-white/[0.02] border border-white/[0.05] rounded-2xl mb-4">
           <div className="flex items-center gap-3 mb-2">
              <Fingerprint size={14} className="text-primary/40" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Admin Session</span>
           </div>
           <p className="text-[10px] font-mono text-white/40">S-3829-PRO</p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-5 py-3 w-full text-white/30 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest bg-white/[0.02] border border-white/[0.05] rounded-xl"
        >
          <ChevronLeft size={16} />
          User App
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-5 py-3 w-full text-rose-500/60 hover:text-rose-500 transition-all text-[10px] font-bold uppercase tracking-widest group"
        >
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-white flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-white/[0.05] bg-surface flex-col h-screen sticky top-0 shrink-0 z-20 shadow-2xl">
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
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed left-0 top-0 bottom-0 w-[300px] bg-surface z-[60] flex flex-col border-r border-white/10 lg:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="flex h-20 border-b border-white/[0.03] bg-background/50 backdrop-blur-md items-center justify-between px-6 lg:px-10 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Menu size={20} />
             </button>
             <div className="hidden sm:flex items-center gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">System Secure</span>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <ShieldCheck size={14} className="text-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Admin Access</span>
             </div>
             <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Cpu size={18} className="text-white/20" />
             </div>
          </div>
        </header>

        <main className="p-6 md:p-12 max-w-[1600px] w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
