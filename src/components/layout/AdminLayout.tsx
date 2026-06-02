import React from 'react';
import { LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, userData } = useAuth();
  const navigate = useNavigate();

  // if (userData?.role !== 'admin') {
  //    return <div className="min-h-screen bg-black flex items-center justify-center">
  //       <p className="text-white/20 uppercase tracking-widest font-bold">Unauthorized Access</p>
  //    </div>
  // }

  return (
    <div className="min-h-screen bg-[#050507] text-white selection:bg-primary/30">
      {/* Admin Specific Header - Clean & Industrial */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center px-8 justify-between">
        <div className="flex items-center gap-8">
           <Link to="/admin" className="flex items-center gap-2">
              <Logo />
              <div className="h-4 w-px bg-white/10 mx-2" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Ops Terminal</span>
           </Link>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex items-center gap-4 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-mono text-text-secondary uppercase">System Nominal</span>
           </div>

           <div className="h-4 w-px bg-white/10" />

           <button
             onClick={async () => { await logout(); navigate('/'); }}
             className="text-[10px] font-bold uppercase tracking-widest text-danger/60 hover:text-danger transition-colors flex items-center gap-2"
           >
              <LogOut size={14} />
              Exit Terminal
           </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {children}
      </main>

      {/* Industrial Footer */}
      <footer className="py-10 px-8 border-t border-white/5 bg-black/20 flex items-center justify-between">
         <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">
            PulseEarn Infrastructure Hub // Auth: Administrative-Tier
         </p>
         <div className="flex gap-6">
            <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest">v2.5.0-PRO</span>
            <span className="text-[9px] font-mono text-white/10 uppercase tracking-widest">Region: Global-01</span>
         </div>
      </footer>
    </div>
  );
};

export default AdminLayout;
