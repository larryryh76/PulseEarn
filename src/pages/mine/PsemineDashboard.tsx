import React, { useState } from 'react';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import {
  ShieldCheck,
  Wallet,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineDashboard: React.FC = () => {
  const { currentUser, psemineProfile } = usePsemineAuth();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleWalletClick = () => {
    toast('Wallet connection will be available when purchases are enabled.', {
      icon: 'ℹ️',
      duration: 4000
    });
    setShowWalletModal(true);
  };

  return (
    <PsemineLayout>
      <div className="space-y-8 py-2">
        {/* Welcome Header Banner */}
        <div className="bg-gradient-to-r from-[#0B0E17] via-[#0D1322] to-[#080A11] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#00F2FE]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-[11px] font-bold uppercase tracking-wider">
                <Cpu size={14} />
                <span>PSEmine Workspace Baseline</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Welcome, {psemineProfile?.username || currentUser?.email?.split('@')[0]}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
                Your PSEmine identity and application foundation is active. Additional engine features will roll out in upcoming phases.
              </p>
            </div>

            {/* Wallet Placeholder Button */}
            <div className="shrink-0">
              <button
                onClick={handleWalletClick}
                className="w-full sm:w-auto px-5 py-3 bg-white/5 hover:bg-white/10 border border-[#00F2FE]/30 hover:border-[#00F2FE] text-white rounded-2xl flex items-center justify-center gap-3 transition-all group shadow-[0_0_15px_rgba(0,242,254,0.1)]"
              >
                <div className="p-2 rounded-xl bg-[#00F2FE]/10 text-[#00F2FE] group-hover:scale-105 transition-transform">
                  <Wallet size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-white">Connect Wallet</p>
                  <p className="text-[10px] text-cyan-300/70 font-medium">Placeholder (Disabled)</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Account Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Verification Status */}
          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account Identity</span>
              <ShieldCheck size={18} className="text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-sm font-bold text-white">Verified Account</p>
            </div>
            <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
          </div>

          {/* Onboarding Status */}
          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">System Orientation</span>
              <CheckCircle2 size={18} className="text-[#00F2FE]" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00F2FE]" />
              <p className="text-sm font-bold text-white">Guide Completed</p>
            </div>
            <p className="text-xs text-gray-500">PSEmine Phase 1 Onboarding Verified</p>
          </div>

          {/* Wallet Integration Status */}
          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Wallet Integration</span>
              <Clock size={18} className="text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <p className="text-sm font-bold text-white">Optional / Future Phase</p>
            </div>
            <p className="text-xs text-gray-500">Not required for current access</p>
          </div>
        </div>

        {/* Coming Soon Modules */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Layers size={18} className="text-[#00F2FE]" />
            <span>PSEmine Engine Roadmap</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/5 text-gray-400">
                    <Cpu size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Mining Node Deployment</h3>
                </div>
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold uppercase rounded-md">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Configure and deploy computational nodes to perform structured validation tasks across network workloads.
              </p>
            </div>

            <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3 opacity-80 hover:opacity-100 transition-opacity">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-white/5 text-gray-400">
                    <Activity size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-white">Yield & Campaign Operations</h3>
                </div>
                <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold uppercase rounded-md">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Monitor real-time campaign performance, telemetry logs, and settled metrics once purchase engines are online.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0E17] border border-[#00F2FE]/30 rounded-2xl max-w-md w-full p-6 relative shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] flex items-center justify-center mx-auto">
              <Info size={24} />
            </div>

            <h3 className="text-lg font-bold text-white">Wallet Connection Placeholder</h3>

            <p className="text-xs text-gray-300 leading-relaxed">
              Wallet connection will be available when purchases are enabled.
            </p>

            <p className="text-[11px] text-gray-500 bg-white/5 p-3 rounded-xl border border-white/5">
              Note: Wallet connection is not required to complete registration, verify email, view the guide, or navigate the dashboard.
            </p>

            <button
              onClick={() => setShowWalletModal(false)}
              className="w-full py-2.5 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Understand & Close
            </button>
          </div>
        </div>
      )}
    </PsemineLayout>
  );
};

export default PsemineDashboard;
