import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, Wallet, User, Bell, Menu, X, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils';
import Logo from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { useTasks } from '../../hooks/useTasks';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const { tasks, campaigns, userTasks } = useTasks();
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
    { name: 'Tasks', path: '/tasks', icon: Shield },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Profile', path: '/me', icon: User },
  ];

  const availableCount = tasks.filter(t => t.active && !userTasks[t.id]).length + campaigns.filter(c => c.active).length;

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isMobileMenuOpen ? "bg-background py-4" :
        isScrolled ? "bg-background/80 backdrop-blur-md border-b border-white/5 py-4" :
        "bg-transparent py-6"
      )}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link to="/" className="z-50 flex items-center gap-2">
            <Logo />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {currentUser ? (
              <>
                <div className="flex items-center gap-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.15em] transition-colors relative py-1",
                        location.pathname === link.path ? "text-white" : "text-text-secondary hover:text-white"
                      )}
                    >
                      {link.name}
                      {location.pathname === link.path && (
                        <motion.div layoutId="nav-glow" className="absolute -bottom-1.5 left-0 right-0 h-px bg-primary shadow-[0_0_8px_rgba(0,102,255,0.8)]" />
                      )}
                    </Link>
                  ))}
                </div>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-6">
                   <Link to="/notifications" className="relative group">
                      <Bell size={18} className={cn(
                        "text-text-secondary group-hover:text-white transition-colors",
                        location.pathname === '/notifications' && "text-white"
                      )} />
                      {availableCount > 0 && (
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
                <Link to="/login" className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-white transition-colors">Sign In</Link>
                <Link to="/signup" className="btn-system-primary py-2.5 px-8 text-[10px]">Get Started</Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden z-50 p-2 text-text-secondary hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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
                              "flex items-center gap-4 p-5 rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all",
                              location.pathname === link.path ? "bg-white/5 text-white border border-white/5" : "text-text-secondary hover:bg-white/[0.02]"
                            )}
                          >
                            <link.icon size={20} className={location.pathname === link.path ? "text-primary" : ""} />
                            {link.name}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex flex-col gap-4">
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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-white/5 px-6 py-4">
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
                   {link.path === '/tasks' && availableCount > 0 && (
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-danger rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                        <span className="text-[7px] font-bold text-white">{availableCount}</span>
                     </div>
                   )}
                </div>
                <span className="text-[8px] font-bold uppercase tracking-widest">{link.name}</span>
              </Link>
            ))}
            <Link
              to="/notifications"
              className={cn(
                "flex flex-col items-center gap-2 transition-all",
                location.pathname === '/notifications' ? "text-primary" : "text-text-secondary"
              )}
            >
              <div className="relative">
                <Bell size={22} strokeWidth={location.pathname === '/notifications' ? 2.5 : 2} />
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-danger rounded-full border-2 border-background" />
              </div>
              <span className="text-[8px] font-bold uppercase tracking-widest">Alerts</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
