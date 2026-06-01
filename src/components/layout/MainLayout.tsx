import React from 'react';
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
                &copy; {new Date().getFullYear()} PulseEarn. Research Phase.
              </p>
              <div className="flex gap-8">
                 <button className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Privacy Signal</button>
                 <button className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Terms of Service</button>
                 <button className="text-[9px] font-bold uppercase tracking-widest text-white/10 hover:text-white/40 transition-colors">Cookie Policy</button>
              </div>
           </div>

           <div className="flex gap-8 items-center opacity-20 hover:opacity-50 transition-opacity">
              <span className="text-[9px] font-mono uppercase tracking-widest">Protocol v2.5.0-PRO</span>
              <div className="h-4 w-px bg-white/20" />
              <span className="text-[9px] font-mono uppercase tracking-widest">Global Region 01</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
