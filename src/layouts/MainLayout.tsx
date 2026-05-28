import React from 'react';
import Navbar from '../components/layout/Navbar';
import MobileBottomNav from '../components/layout/MobileBottomNav';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary/30">
      <Navbar />
      <main>
        {children}
      </main>
      {/* Footer removed from internal/landing pages to maintain premium SaaS feel */}
      <footer className="py-20 px-6 border-t border-white/5 bg-background/50">
        <div className="container mx-auto text-center">
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} PulseEarn. All rights reserved.
            <span className="block mt-2">Built for the future of finance.</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
