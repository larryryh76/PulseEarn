import React, { useState, useEffect } from 'react';
import {
  Bell,
  LayoutDashboard,
  Zap,
  Wallet as WalletIcon,
  LogOut,
  User as UserIcon,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils';
import Logo from '../ui/Logo';
import { useAuth } from '../../contexts/AuthContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NotificationCenter from '../ui/NotificationCenter';
import { useNotifications } from '../../hooks/useNotifications';

const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { currentUser, userData, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isInternal = ['/dashboard', '/tasks', '/wallet', '/me', '/support', '/pulse-core'].some(p => location.pathname.startsWith(p));

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
      isScrolled ? "bg-background/80 backdrop-blur-xl border-b border-white/[0.05] py-3" : "bg-transparent py-5"
    )}>
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
           <Link to="/" className="hover:opacity-80 transition-opacity">
              <Logo />
           </Link>

           {!isInternal && (
              <div className="hidden md:flex items-center gap-8">
                 {['Features', 'Rewards', 'Predictions', 'FAQ'].map((link) => (
                    <a key={link} href={`#${link.toLowerCase()}`} className="text-[11px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors">
                       {link}
                    </a>
                 ))}
              </div>
           )}
        </div>

        <div className="flex items-center gap-4 md:gap-5">
           {currentUser && (
              <div className="hidden lg:flex items-center gap-4 bg-white/[0.03] border border-white/[0.05] p-1 rounded-2xl mr-2">
                 <div className="px-4 py-2 flex items-center gap-2">
                    <Zap size={14} className="text-primary" />
                    <span className="text-[11px] font-mono font-bold tracking-tight">{userData?.points.toLocaleString() || '0'}</span>
                 </div>
                 <div className="w-px h-4 bg-white/10" />
                 <Link to="/wallet" className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                    Wallet
                 </Link>
              </div>
           )}

           <div className="hidden sm:block">
              <ConnectButton.Custom>
                 {({ account, chain, openConnectModal, mounted }) => {
                    if (!mounted || !account || !chain) {
                       return (
                          <button onClick={openConnectModal} className="btn-primary flex items-center gap-2">
                             <WalletIcon size={14} />
                             Link Wallet
                          </button>
                       );
                    }
                    return (
                       <button onClick={openConnectModal} className="btn-secondary">
                          {account.displayName}
                       </button>
                    );
                 }}
              </ConnectButton.Custom>
           </div>

           {currentUser ? (
              <div className="flex items-center gap-3 md:gap-4">
                 <div className="relative">
                    <button
                      onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                      className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition-colors relative"
                    >
                       <Bell size={18} />
                       {unreadCount > 0 && (
                          <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-background shadow-lg">
                             {unreadCount > 9 ? '9+' : unreadCount}
                          </div>
                       )}
                    </button>

                    <NotificationCenter
                      isOpen={isNotificationsOpen}
                      onClose={() => setIsNotificationsOpen(false)}
                    />
                 </div>

                 <div className="relative">
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 p-1 pl-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl hover:border-white/10 transition-all"
                    >
                       <span className="text-[11px] font-bold text-white/60">{userData?.username}</span>
                       <div className="w-8 h-8 rounded-xl bg-primary/20 overflow-hidden border border-white/10">
                          <img src={userData?.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${userData?.uid}`} alt="" />
                       </div>
                    </button>

                    <AnimatePresence>
                       {isProfileOpen && (
                          <>
                             <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                             <motion.div
                               initial={{ opacity: 0, y: 10, scale: 0.95 }}
                               animate={{ opacity: 1, y: 0, scale: 1 }}
                               exit={{ opacity: 0, y: 10, scale: 0.95 }}
                               className="absolute right-0 mt-3 w-64 glass-panel border border-white/10 rounded-3xl shadow-2xl p-2 z-50 overflow-hidden"
                             >
                                <div className="p-4 border-b border-white/5 space-y-1">
                                   <div className="flex items-center gap-2">
                                      <ShieldCheck size={12} className="text-emerald-500" />
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Verified Account</span>
                                   </div>
                                   <p className="text-[11px] font-bold text-white/40 tracking-tight truncate">{userData?.email}</p>
                                </div>
                                <div className="p-1.5 space-y-1">
                                   <Link to="/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-[11px] font-bold text-white/60 hover:text-white transition-all">
                                      <LayoutDashboard size={14} /> Dashboard
                                   </Link>
                                   <Link to="/me" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 text-[11px] font-bold text-white/60 hover:text-white transition-all">
                                      <UserIcon size={14} /> Profile
                                   </Link>
                                   {userData?.role === 'admin' && (
                                      <Link to="/pulse-core" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-primary/10 text-[11px] font-bold text-primary transition-all">
                                         <Settings size={14} /> Admin Panel
                                      </Link>
                                   )}
                                   <button
                                     onClick={() => { logout(); navigate('/'); }}
                                     className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-rose-500/10 text-[11px] font-bold text-rose-500 transition-all mt-1"
                                   >
                                      <LogOut size={14} /> Sign Out
                                   </button>
                                </div>
                             </motion.div>
                          </>
                       )}
                    </AnimatePresence>
                 </div>
              </div>
           ) : (
              <div className="flex items-center gap-6">
                 <Link to="/login" className="text-[11px] font-bold text-white/30 hover:text-white transition-colors uppercase tracking-widest">
                    Sign In
                 </Link>
                 <Link to="/signup" className="hidden sm:block btn-primary px-5 py-2">
                    Join Now
                 </Link>
              </div>
           )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
