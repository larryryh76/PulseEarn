import React, { useState, useEffect } from 'react';
import { Menu, X, Wallet, LogOut, User as UserIcon, LayoutDashboard, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../../utils';
import LogoWrapper from '../ui/LogoWrapper';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Features', href: '/#features' },
    { name: 'FAQ', href: '/#faq' },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const id = href.replace('/#', '');
      if (window.location.pathname === '/') {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/');
        setTimeout(() => {
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b",
      isScrolled
        ? "bg-[#050507]/80 backdrop-blur-xl border-white/[0.05] py-3"
        : "bg-transparent border-transparent py-6"
    )}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <LogoWrapper />

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              className="text-[13px] font-semibold text-white/50 hover:text-white transition-colors tracking-wide"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-6">
          <ConnectButton.Custom>
            {({
              account,
              chain,
              openAccountModal,
              openChainModal,
              openConnectModal,
              authenticationStatus,
              mounted,
            }) => {
              const ready = mounted && authenticationStatus !== 'loading';
              const connected =
                ready &&
                account &&
                chain &&
                (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[12px] bg-primary text-white shadow-lg hover:shadow-primary/40 transition-all uppercase tracking-widest"
                        >
                          <Wallet size={14} />
                          Connect
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button onClick={openChainModal} className="px-4 py-2 bg-danger text-white rounded-xl text-xs font-bold">
                          Wrong network
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={openChainModal}
                          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-white/60 hover:text-white transition-all flex items-center gap-2"
                        >
                          {chain.name}
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[11px] bg-white/[0.03] border border-white/[0.08] text-white hover:bg-white/[0.08] transition-all"
                        >
                          {account.displayName}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>

          {currentUser ? (
            <div className="relative">
               <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-full border border-white/10 p-0.5 overflow-hidden hover:border-primary/50 transition-colors"
               >
                  <img src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`} className="w-full h-full rounded-full" alt="" />
               </button>

               <AnimatePresence>
                  {isProfileOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsProfileOpen(false)}
                        className="fixed inset-0 z-40"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-64 bg-[#0D0D12] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-hidden"
                      >
                         <div className="p-4 border-b border-white/5">
                            <p className="text-xs font-bold text-white">{userData?.username}</p>
                            <p className="text-[10px] text-white/40">{userData?.email}</p>
                         </div>
                         <div className="p-1">
                            <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[11px] font-bold text-white/60 hover:text-white transition-all">
                               <LayoutDashboard size={14} /> Dashboard
                            </Link>
                            <Link to="/me" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[11px] font-bold text-white/60 hover:text-white transition-all">
                               <UserIcon size={14} /> Profile
                            </Link>
                            <Link to="/support" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[11px] font-bold text-white/60 hover:text-white transition-all">
                               <Settings size={14} /> Support
                            </Link>
                            {userData?.role === 'admin' && (
                               <Link to="/pulse-core" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-[11px] font-bold text-primary transition-all">
                                  <Settings size={14} /> Pulse Core
                               </Link>
                            )}
                            <button
                              onClick={() => { logout(); navigate('/'); }}
                              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-danger/10 text-[11px] font-bold text-danger transition-all"
                            >
                               <LogOut size={14} /> Log Out
                            </button>
                         </div>
                      </motion.div>
                    </>
                  )}
               </AnimatePresence>
            </div>
          ) : (
            <Link to="/login" className="text-[12px] font-bold text-white/50 hover:text-white transition-colors uppercase tracking-widest">
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden text-white/80 hover:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden absolute top-full left-0 right-0 bg-[#050507] border-b border-white/[0.05] shadow-2xl overflow-hidden"
          >
            <div className="container mx-auto px-6 py-10 flex flex-col gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleLinkClick(e, link.href)}
                  className="text-2xl font-bold text-white/40 hover:text-white transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-white/[0.05] flex flex-col gap-4">
                {currentUser ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-3 w-full bg-white/[0.03] border border-white/[0.08] text-white px-6 py-4 rounded-2xl font-bold text-lg"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-3 w-full bg-primary text-white px-6 py-4 rounded-2xl font-bold text-lg"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
