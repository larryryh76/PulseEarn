import React from 'react';
import MobileBottomNav from './MobileBottomNav';
import Navbar from './Navbar';
import { useLocation } from 'react-router-dom';
import { cn } from '../../utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/pulse-core');

  return (
    <div className="min-h-screen bg-black overflow-x-hidden selection:bg-primary/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full" />
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <Navbar />

      <div className="flex relative z-10">
        <main className={cn(
           "flex-1 min-h-screen container mx-auto px-4 md:px-6 pt-24 pb-24 md:pb-12",
           isAdminPath && "max-w-7xl"
        )}>
          {children}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
