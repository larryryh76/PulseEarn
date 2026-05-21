import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { Bell, User } from 'lucide-react';
import Logo from '../ui/Logo';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Sidebar Desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">

        {/* Simplified Header */}
        <header className="sticky top-0 z-30 bg-[#050507]/80 backdrop-blur-xl border-b border-white/[0.05] px-6 py-4">
          <div className="container mx-auto flex items-center justify-between">
            {/* Logo area - cleaner */}
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <Logo />
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-tighter">Live Protocol</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Compact Notification Icon */}
              <button className="relative w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center hover:bg-white/[0.08] transition-colors group">
                <Bell size={16} className="text-white/30 group-hover:text-white" />
                <div className="absolute top-2 right-2 w-1 h-1 bg-primary rounded-full" />
              </button>

              {/* Profile Avatar */}
              <button className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <User size={16} className="text-primary" />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-28 lg:pb-10">
          <div className="container mx-auto">
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
