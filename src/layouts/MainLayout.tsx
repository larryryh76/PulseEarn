import React from 'react';
import Navbar from '../components/layout/Navbar';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30">
      <Navbar />
      <main>
        {children}
      </main>
      <footer className="py-16 px-6 border-t border-white/5 bg-background">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <p className="text-white/40 text-sm">
                &copy; {new Date().getFullYear()} PulseEarn. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-8">
              <a href="#" className="text-white/30 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Terms</a>
              <a href="#" className="text-white/30 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Privacy</a>
              <a href="#" className="text-white/30 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
