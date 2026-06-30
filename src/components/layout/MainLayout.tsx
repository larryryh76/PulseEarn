import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import BottomNav from '../layout/BottomNav';
import { useAuth } from '../../contexts/AuthContext';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const { currentUser } = useAuth();

  // Unified Navigation Policy: Always land at the top of the context
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-text-primary transition-colors duration-300">
      <Navbar />
      <main>
        {children}
      </main>
      {currentUser && <BottomNav />}
      <footer className="py-24 px-8 border-t border-border bg-surface-bright/50">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
           <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-text-tertiary text-[9px] font-bold uppercase tracking-[0.4em]">
                &copy; {new Date().getFullYear()} PulseEarn.
              </p>
              <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center md:justify-start">
                 <Link to="/privacy" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Privacy Policy</Link>
                 <Link to="/terms" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Terms of Service</Link>
                 <Link to="/cookies" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Cookie Policy</Link>
                 <Link to="/reward-policy" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Reward Policy</Link>
                 <Link to="/fraud-policy" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Fraud Policy</Link>
                 <Link to="/referral-policy" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Referral Policy</Link>
                 <Link to="/withdrawal-policy" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Withdrawal Policy</Link>
                 <Link to="/verification-policy" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Verification Policy</Link>
                 <Link to="/community-guidelines" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Community Guidelines</Link>
                 <Link to="/help" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Help Center</Link>
                 <Link to="/support" className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors">Support</Link>
              </div>
           </div>

           <div className="flex gap-8 items-center text-text-tertiary opacity-40">
              {/* UI Metadata hidden as per directive */}
           </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
