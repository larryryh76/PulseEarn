import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, Wallet, User, Bell, Menu, X, Terminal, TrendingUp, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils';
import Logo from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTasks } from '../../hooks/useTasks';
import { useNotifications } from '../../hooks/useNotifications';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const { tasks, userTasks, systemTasks, campaigns } = useTasks();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isAdminView = location.pathname.startsWith('/admin');
  if (isAdminView) return null;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Prediction', path: '/predictions', icon: TrendingUp },
    { name: 'Tasks', path: '/tasks', icon: Shield },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Profile', path: '/me', icon: User },
  ];

  const actionableCampaignCount = campaigns.filter(c => {
    if (!c.active) return false;
    const campaignTasks = tasks.filter(t => c.taskIds?.includes(t.id));
    return campaignTasks.some(t => {
       const status = userTasks[t.id]?.status || 'available';
       return status === 'available' || status === 'rejected';
    });
  }).length;

  const claimableMissionCount = systemTasks.filter(m => m.progress?.status === 'COMPLETED').length;

  const totalActionableCount = actionableCampaignCount + claimableMissionCount;

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isMobileMenuOpen ? "bg-background py-4" :
        isScrolled ? "bg-background/80 backdrop-blur-md border-b border-border py-4" :
        "bg-transparent py-6"
      )}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="z-50 flex items-center gap-2" aria-label="PulseEarn Home">
            <Logo />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {currentUser ? (
              <>
                <div className="flex items-center gap-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.1em] transition-colors relative py-1 group/link",
                        location.pathname === link.path ? "text-text-primary" : "text-text-secondary hover:text-text-primary"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {link.name}
                        {link.path === '/tasks' && totalActionableCount > 0 && (
                          <span className="w-4 h-4 bg-danger rounded-full flex items-center justify-center text-[7px] font-bold text-text-primary shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                            {totalActionableCount}
                          </span>
                        )}
                      </div>
                      {location.pathname === link.path && (
                        <motion.div layoutId="nav-glow" className="absolute -bottom-1.5 left-0 right-0 h-px bg-primary shadow-[0_0_8px_rgba(0,102,255,0.8)]" />
                      )}
                    </Link>
                  ))}
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-6">
                   <button
                     onClick={toggleTheme}
                     className="p-2 text-text-secondary hover:text-text-primary transition-all bg-surface-glass rounded-lg border border-border"
                     aria-label="Toggle Theme"
                   >
                     {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                   </button>

                   <Link to="/notifications" className="relative group" aria-label="View Notifications" title="Notifications">
                      <Bell size={18} className={cn(
                        "text-text-secondary group-hover:text-text-primary transition-colors",
                        location.pathname === '/notifications' && "text-text-primary"
                      )} />
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                      )}
                   </Link>

                  {userData?.role === 'admin' && (
                    <Link to="/admin" className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest flex items-center gap-2">
                       <Terminal size={14} />
                       Ops
                    </Link>
                  )}
                  <button onClick={() => { logout(); navigate('/'); }} className="text-[10px] font-bold text-danger/60 hover:text-danger transition-colors uppercase tracking-widest">
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-8">
                <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
                <Link to="/signup" className="btn-system-primary py-2.5 px-8 text-[10px]">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-4 z-50">
            <button
               onClick={toggleTheme}
               className="p-2 text-text-secondary hover:text-text-primary transition-all bg-surface-glass rounded-lg border border-border"
               aria-label="Toggle Theme"
            >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {currentUser && (
              <Link to="/notifications" className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                )}
              </Link>
            )}
            <button
              className="p-2 text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed inset-0 bg-background z-40 pt-24 px-6 md:hidden"
            >
              <div className="flex flex-col gap-8">
                {currentUser ? (
                  <>
                    <div className="space-y-4">
                      <p className="data-label px-2 text-primary">Navigation</p>
                      <div className="grid grid-cols-1 gap-2">
                        {navLinks.map((link) => (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center justify-between p-5 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all",
                              location.pathname === link.path ? "bg-surface-bright text-text-primary border border-border" : "text-text-secondary hover:bg-surface-bright/50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <link.icon size={20} className={location.pathname === link.path ? "text-primary" : ""} />
                              {link.name}
                            </div>
                            {link.path === '/tasks' && totalActionableCount > 0 && (
                              <span className="w-5 h-5 bg-danger rounded-full flex items-center justify-center text-[9px] font-black text-text-primary shadow-lg">
                                {totalActionableCount}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border flex flex-col gap-4">
                      {userData?.role === 'admin' && (
                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-5 rounded-2xl font-bold uppercase tracking-widest text-[11px] text-primary bg-primary/5 border border-primary/10">
                          <Terminal size={20} />
                          Admin Access
                        </Link>
                      )}
                      <button
                        onClick={() => { logout(); navigate('/'); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-4 p-5 rounded-2xl font-bold uppercase tracking-widest text-[11px] text-danger/60 hover:bg-danger/5"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="btn-system-secondary text-center py-5 uppercase tracking-widest text-[11px]">Sign In</Link>
                    <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="btn-system-primary text-center py-5 uppercase tracking-widest text-[11px]">Get Started</Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      {currentUser && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-xl border-t border-border px-6 py-4">
          <div className="flex items-center justify-between">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex flex-col items-center gap-2 transition-all relative",
                  location.pathname === link.path ? "text-primary" : "text-text-secondary"
                )}
              >
                <div className="relative">
                   <link.icon size={22} strokeWidth={location.pathname === link.path ? 2.5 : 2} />
                   {link.path === '/tasks' && totalActionableCount > 0 && (
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                        <span className="text-[7px] font-bold text-text-primary">{totalActionableCount}</span>
                     </div>
                   )}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest">{link.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
