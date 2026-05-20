import React, { useState, useEffect } from 'react';
import { Menu, X, Wallet, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../../utils';
import LogoWrapper from '../ui/LogoWrapper';
import { useAuth } from '../../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress] = useState("0x71C...4f92");

  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Earn', href: '/#earn' },
    { name: 'Predict', href: '/#predict' },
    { name: 'Leaderboard', href: '/#leaderboard' },
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

        <div className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <Link
              to="/dashboard"
              className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[13px] bg-white/[0.03] border border-white/[0.08] text-white hover:bg-white/[0.08] transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
              {userData?.username || 'Dashboard'}
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[13px] font-bold text-white/50 hover:text-white transition-colors">
                Login
              </Link>
              <button
                onClick={() => setIsConnected(!isConnected)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[13px] transition-all relative overflow-hidden group",
                  isConnected
                    ? "bg-white/[0.03] border border-white/[0.08] text-white hover:bg-white/[0.08]"
                    : "bg-primary text-white shadow-[0_4px_15px_rgba(0,112,255,0.3)] hover:shadow-primary/40"
                )}
              >
                <Wallet size={16} />
                {isConnected ? walletAddress : "Connect Wallet"}
                {isConnected && <ChevronDown size={14} className="text-white/40" />}
              </button>
            </>
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
              <div className="pt-4 border-t border-white/[0.05]">
                {currentUser ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-3 w-full bg-white/[0.03] border border-white/[0.08] text-white px-6 py-4 rounded-2xl font-bold text-lg"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <button
                    className="flex items-center justify-center gap-3 w-full bg-primary text-white px-6 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20"
                    onClick={() => {
                      setIsConnected(!isConnected);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Wallet size={20} />
                    {isConnected ? walletAddress : "Connect Wallet"}
                  </button>
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
