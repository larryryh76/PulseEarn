import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import Navbar from './Navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen p-4 pt-20 pb-32">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default DashboardLayout;
