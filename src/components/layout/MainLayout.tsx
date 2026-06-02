import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      <Navbar />
      <main>
        {children}
      </main>
      <footer className="py-24 px-8 border-t border-white/5 bg-black/40">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
           <div className="flex flex-col items-center md:items-start gap-4">
              <p className="text-white/20 text-[9px] font-bold uppercase tracking-[0.4em]">
                &copy; {new Date().getFullYear()} PulseEarn.
              </p>
              <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center md:justify-start">
                 <Link to="/privacy" className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Privacy Policy</Link>
                 <Link to="/terms" className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Terms of Service</Link>
                 <Link to="/reward-policy" className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Reward Policy</Link>
                 <Link to="/fraud-policy" className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Fraud Policy</Link>
                 <Link to="/contact" className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Contact</Link>
                 <Link to="/support" className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Support</Link>
              </div>
           </div>

           <div className="flex gap-8 items-center opacity-20">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em]">Operational Platform v2.0.1</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
