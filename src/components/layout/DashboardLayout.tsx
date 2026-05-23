import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { Bell, User, ChevronLeft } from 'lucide-react';
import Logo from '../ui/Logo';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationCenter from '../ui/NotificationCenter';
import AnnouncementBanner from '../ui/AnnouncementBanner';
import { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const isMainPage = ['/dashboard', '/predict', '/tasks', '/wallet', '/me', '/pulse-core'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-primary/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full" />
      </div>

      {/* Sidebar Desktop */}
      <Sidebar />

      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen relative z-10">

        {/* Compact Premium Header */}
        <header className="sticky top-0 z-30 bg-[#050507]/60 backdrop-blur-xl border-b border-white/[0.03] h-16 flex items-center">
          <div className="container mx-auto px-6 flex items-center justify-between">
            {/* Logo Area / Back Button */}
            <div className="flex items-center gap-4">
              {!isMainPage ? (
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all group"
                >
                  <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Back</span>
                </button>
              ) : (
                <>
                  <div className="lg:hidden scale-90 origin-left">
                    <Logo />
                  </div>
                  <div className="hidden lg:flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      <span className="text-[9px] font-bold text-primary uppercase tracking-widest">
                        {userData?.role === 'admin' ? 'Root Protocol' : 'Mainnet v2.4'}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Utility Area */}
            <div className="flex items-center gap-2.5 relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] transition-all group"
              >
                <Bell size={16} className={cn(isNotifOpen ? "text-primary" : "text-white/40", "group-hover:text-white transition-colors")} />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary rounded-full border-2 border-[#050507] flex items-center justify-center shadow-[0_0_10px_rgba(0,112,255,0.4)]">
                    <span className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </div>
                )}
              </button>

              <NotificationCenter
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
              />

              <button
                onClick={() => navigate('/me')}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center hover:shadow-[0_0_15px_rgba(0,112,255,0.2)] transition-all"
              >
                <User size={16} className="text-primary" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 pb-32 lg:pb-12">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
