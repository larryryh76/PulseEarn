import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, Wallet, User, Bell, Menu, X, Terminal, TrendingUp, Sun, Moon, MessageSquare, FileText, LogOut } from 'lucide-react';
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
  const { tasks, userTasks, campaigns } = useTasks();
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
    { name: 'Me', path: '/me', icon: User },
  ];

  const secondaryLinks = [
    { name: 'Support', path: '/support', icon: MessageSquare },
    { name: 'Policies', path: '/legal/terms', icon: FileText },
  ];

  const actionableCampaignCount = campaigns.filter(c => {
    if (!c.active) return false;
    const campaignTasks = tasks.filter(t => t.campaignId === c.id);
    return campaignTasks.some(t => {
       const status = userTasks[t.id]?.status || 'available';
       return status === 'available' || status === 'rejected';
    });
  }).length;

  const totalActionableCount = actionableCampaignCount;

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
          <div className="hidden lg:flex items-center gap-10">
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
                   <Link to="/notifications" className="relative group" aria-label="View Notifications" title="Notifications">
                      <Bell size={18} className={cn(
                        "text-text-secondary group-hover:text-text-primary transition-colors",
                        location.pathname === '/notifications' && "text-text-primary"
                      )} />
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                      )}
                   </Link>

                  {(userData?.role === 'admin' || userData?.role === 'moderator') && (
                    <Link to="/admin" className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest flex items-center gap-2">
                       <Terminal size={14} />
                       Ops
                    </Link>
                  )}
                  <button
                    onClick={async () => {
                      await logout();
                      navigate('/');
                    }}
                    className="text-[10px] font-bold text-danger/60 hover:text-danger transition-colors uppercase tracking-widest"
                  >
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

            <button
              onClick={toggleTheme}
              className="p-2 text-text-secondary hover:text-text-primary transition-all bg-surface-glass rounded-lg border border-border"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex lg:hidden items-center gap-4 z-50">
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
              className="fixed inset-0 bg-background z-40 pt-24 px-6 lg:hidden"
            >
              <div className="flex flex-col gap-8">
                {currentUser ? (
                  <>
                    <div className="space-y-4">
                      <p className="data-label px-2 text-primary">System Hub</p>
                      <div className="grid grid-cols-1 gap-2">
                        {secondaryLinks.map((link) => (
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
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-3">
                         <button
                           onClick={() => { toggleTheme(); setIsMobileMenuOpen(false); }}
                           className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-surface-bright border border-border text-text-secondary"
                         >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            <span className="text-[9px] font-black uppercase tracking-widest">Theme</span>
                         </button>
                         <button
                           onClick={async () => {
                             await logout();
                             navigate('/');
                             setIsMobileMenuOpen(false);
                           }}
                           className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-danger/5 border border-danger/20 text-danger/60"
                         >
                            <LogOut size={20} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Sign Out</span>
                         </button>
                      </div>

                      {(userData?.role === 'admin' || userData?.role === 'moderator') && (
                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-5 rounded-2xl font-bold uppercase tracking-widest text-[11px] text-primary bg-primary/5 border border-primary/10">
                          <Terminal size={20} />
                          {userData?.role === 'admin' ? 'Admin Operations' : 'Moderator Panel'}
                        </Link>
                      )}
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

    </>
  );
};

export default Navbar;
