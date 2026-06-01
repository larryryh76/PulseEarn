import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, Wallet, User, Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils';
import Logo from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', path: '/tasks', icon: Shield },
    { name: 'Wallet', path: '/wallet', icon: Wallet },
    { name: 'Profile', path: '/me', icon: User },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isMobileMenuOpen ? "bg-background py-4" :
        isScrolled ? "bg-background/80 backdrop-blur-md border-b border-border py-4" :
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
                        "text-[12px] font-medium tracking-tight transition-colors relative py-1",
                        location.pathname === link.path ? "text-white" : "text-text-secondary hover:text-white"
                      )}
                    >
                      {link.name}
                      {location.pathname === link.path && (
                        <motion.div layoutId="nav-glow" className="absolute -bottom-1 left-0 right-0 h-px bg-primary shadow-[0_0_8px_rgba(94,106,210,0.8)]" />
                      )}
                    </Link>
                  ))}
                </div>

                <div className="h-4 w-px bg-border" />

                <div className="flex items-center gap-4">
                  {userData?.role === 'admin' && (
                    <Link to="/admin" className="text-[12px] font-bold text-primary hover:text-primary/80 transition-colors">Admin</Link>
                  )}
                  <button onClick={() => { logout(); navigate('/'); }} className="text-[12px] font-medium text-danger/80 hover:text-danger transition-colors">
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-8">
                <Link to="/login" className="text-[12px] font-medium text-text-secondary hover:text-white transition-colors">Sign In</Link>
                <Link to="/signup" className="btn-system-primary py-2 px-6">Get Started</Link>
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
                      <p className="data-label px-2">Navigation</p>
                      <div className="grid grid-cols-1 gap-2">
                        {navLinks.map((link) => (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-4 p-4 rounded-xl font-medium transition-all",
                              location.pathname === link.path ? "bg-white/5 text-white" : "text-text-secondary hover:bg-white/[0.02]"
                            )}
                          >
                            <link.icon size={20} className={location.pathname === link.path ? "text-primary" : ""} />
                            {link.name}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-border flex flex-col gap-4">
                      {userData?.role === 'admin' && (
                        <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 rounded-xl font-medium text-primary bg-primary/5">
                          Admin Operations
                        </Link>
                      )}
                      <button
                        onClick={() => { logout(); navigate('/'); setIsMobileMenuOpen(false); }}
                        className="flex items-center gap-4 p-4 rounded-xl font-medium text-danger hover:bg-danger/5"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="btn-system-secondary text-center py-4">Sign In</Link>
                    <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="btn-system-primary text-center py-4">Get Started</Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Mobile Bottom Tab Bar (Systematic Fintech Pattern) */}
      {currentUser && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border px-6 py-3">
          <div className="flex items-center justify-between">
            {navLinks.slice(0, 4).map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all",
                  location.pathname === link.path ? "text-primary" : "text-text-secondary"
                )}
              >
                <link.icon size={20} strokeWidth={location.pathname === link.path ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{link.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
