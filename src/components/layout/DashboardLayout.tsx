import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { Zap, Bell } from 'lucide-react';
import Logo from '../ui/Logo';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAuth();

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Sidebar Desktop */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">

        {/* Sticky Header */}
        <header className="sticky top-0 z-30 bg-[#050507]/80 backdrop-blur-xl border-b border-white/[0.05] px-6 py-4">
          <div className="container mx-auto flex items-center justify-between">
            {/* Logo for mobile only */}
            <div className="lg:hidden">
              <Logo />
            </div>

            <div className="hidden lg:flex items-center gap-2">
              <span className="text-white/30 text-xs font-bold uppercase tracking-widest">Protocol Status</span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-green-500 uppercase">Operational</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.08] transition-colors group">
                <Bell size={18} className="text-white/40 group-hover:text-white" />
                <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full border border-[#050507]" />
              </button>

              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-xl">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-white/40 uppercase leading-none">Your Balance</span>
                  <span className="text-sm font-mono font-bold text-primary leading-none mt-1">
                    {userData?.points || 0} PTS
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap size={16} className="text-primary" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 pb-28 lg:pb-10">
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
