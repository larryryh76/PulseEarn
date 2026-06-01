import React from 'react';
import Navbar from '../layout/Navbar';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main>
        {children}
      </main>
      <footer className="py-20 px-6 border-t border-white/5 text-center">
        <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">
          &copy; {new Date().getFullYear()} PulseEarn. Research Phase.
        </p>
      </footer>
    </div>
  );
};

export default MainLayout;
