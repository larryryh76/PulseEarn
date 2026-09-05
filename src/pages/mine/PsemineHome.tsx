import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import PsemineLogo from '../../components/mine/PsemineLogo';
import { Cpu, Zap, ArrowRight, Lock, Server } from 'lucide-react';

export const PsemineHome: React.FC = () => {
  const { currentUser, psemineProfile } = usePsemineAuth();
  const navigate = useNavigate();

  const handleEnterApp = () => {
    if (!currentUser) {
      navigate('/mine/login');
      return;
    }
    if (!currentUser.emailVerified) {
      navigate('/mine/verify-email');
      return;
    }
    if (psemineProfile?.hasCompletedGuide) {
      navigate('/mine/dashboard');
    } else {
      navigate('/mine/guide');
    }
  };

  return (
    <div className="min-h-screen bg-[#080A11] text-white flex flex-col font-sans selection:bg-[#00F2FE]/30 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-white/5 bg-[#080A11]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <PsemineLogo size="md" />

          <div className="flex items-center gap-3">
            {currentUser ? (
              <button
                onClick={handleEnterApp}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)]"
              >
                <span>Go to Workspace</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <Link
                  to="/mine/login"
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all"
                >
                  Log In
                </Link>
                <Link
                  to="/mine/signup"
                  className="px-4 py-2 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(0,242,254,0.25)]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00F2FE]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-xs font-bold uppercase tracking-widest mb-8">
          <Cpu size={14} />
          <span>Next-Gen Enterprise Infrastructure</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight max-w-4xl leading-[1.1]">
          Decentralized Mining & Computing <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-cyan-400">Environment</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed">
          PSEmine is an isolated enterprise framework engineered for structured mining workflows, high-throughput campaign validation, and resilient asset operations.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          {currentUser ? (
            <button
              onClick={handleEnterApp}
              className="w-full sm:w-auto px-8 py-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(0,242,254,0.4)]"
            >
              <span>Launch PSEmine</span>
              <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <Link
                to="/mine/signup"
                className="w-full sm:w-auto px-8 py-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-[0_0_25px_rgba(0,242,254,0.4)]"
              >
                <span>Create PSEmine Account</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/mine/login"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>Sign In to Workspace</span>
              </Link>
            </>
          )}
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 relative group hover:border-[#00F2FE]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 text-[#00F2FE] flex items-center justify-center mb-4">
              <Server size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Isolated Architecture</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Autonomous routing and state boundaries ensuring complete system separation and operational isolation.
            </p>
          </div>

          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 relative group hover:border-[#00F2FE]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 text-[#00F2FE] flex items-center justify-center mb-4">
              <Lock size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Enterprise Security</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Firebase-backed authentication layer with structured email verification and session security.
            </p>
          </div>

          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 relative group hover:border-[#00F2FE]/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 text-[#00F2FE] flex items-center justify-center mb-4">
              <Zap size={20} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Future-Ready Foundation</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Modular structure designed for future decentralized toolsets, campaign workflows, and wallet integrations.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 bg-[#05070D] py-8 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <PsemineLogo size="sm" />
          <p>© {new Date().getFullYear()} PSEmine Clean Rebuild Baseline. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PsemineHome;
