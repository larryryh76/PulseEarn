import React from 'react';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import {
  ShieldCheck,
  Cpu,
  Activity,
  CheckCircle2,
  Wrench,
  UserCheck,
  Zap,
  CheckCircle
} from 'lucide-react';

export const PsemineDashboard: React.FC = () => {
  const { currentUser, psemineProfile } = usePsemineAuth();

  const isEmailVerified = currentUser?.emailVerified ?? false;
  const isGuideCompleted = psemineProfile?.hasCompletedGuide ?? false;

  return (
    <PsemineLayout>
      <div className="space-y-8 py-2">
        {/* 1. Identity / Welcome Area */}
        <div className="bg-gradient-to-r from-[#0B0E17] via-[#0D1322] to-[#080A11] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#00F2FE]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-[11px] font-bold uppercase tracking-wider">
                <Cpu size={14} />
                <span>PSEmine Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Welcome, {psemineProfile?.username || currentUser?.email?.split('@')[0] || 'Miner'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 max-w-xl">
                Identity: <span className="text-gray-200 font-medium">{currentUser?.email}</span>
              </p>
            </div>

            {/* Account Badges */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                isEmailVerified
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <ShieldCheck size={14} />
                <span>{isEmailVerified ? 'Email Verified' : 'Email Pending'}</span>
              </div>

              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
                isGuideCompleted
                  ? 'bg-[#00F2FE]/10 border-[#00F2FE]/30 text-[#00F2FE]'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <Zap size={14} />
                <span>{isGuideCompleted ? 'Guide Completed' : 'Guide Pending'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Account Status Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <UserCheck size={16} className="text-[#00F2FE]" />
            <span>Account Status</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email Verification Status */}
            <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Email Verification</span>
                <ShieldCheck size={18} className={isEmailVerified ? 'text-emerald-400' : 'text-amber-400'} />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isEmailVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <p className="text-sm font-bold text-white">{isEmailVerified ? 'Verified' : 'Pending Verification'}</p>
              </div>
              <p className="text-xs text-gray-500 truncate">{currentUser?.email || 'N/A'}</p>
            </div>

            {/* Guide Completion Status */}
            <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Guide Completion</span>
                <CheckCircle2 size={18} className={isGuideCompleted ? 'text-[#00F2FE]' : 'text-amber-400'} />
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isGuideCompleted ? 'bg-[#00F2FE]' : 'bg-amber-400'}`} />
                <p className="text-sm font-bold text-white">{isGuideCompleted ? 'Completed' : 'Pending'}</p>
              </div>
              <p className="text-xs text-gray-500">PSEmine Onboarding Orientation</p>
            </div>

            {/* Account Standing Status */}
            <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Account Standing</span>
                <CheckCircle size={18} className="text-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-bold text-white">Active & Good Standing</p>
              </div>
              <p className="text-xs text-gray-500">Standard Member Access</p>
            </div>
          </div>
        </div>

        {/* 3. Mining Overview Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Cpu size={16} className="text-[#00F2FE]" />
            <span>Mining Overview</span>
          </h2>
          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00F2FE]/10 border border-[#00F2FE]/20 text-[#00F2FE] flex items-center justify-center mx-auto">
              <Cpu size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-300 max-w-lg mx-auto">
              Mining tools and telemetry will appear here once your mining setup is ready.
            </p>
          </div>
        </div>

        {/* 4. Tools Preview Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Wrench size={16} className="text-[#00F2FE]" />
            <span>Tools Preview</span>
          </h2>
          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center mx-auto">
              <Wrench size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-300 max-w-lg mx-auto">
              No active mining tools deployed yet. Tool management will unlock in the next phase.
            </p>
          </div>
        </div>

        {/* 5. Recent Activity Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Activity size={16} className="text-[#00F2FE]" />
            <span>Recent Activity</span>
          </h2>
          <div className="bg-[#0B0E17] border border-white/5 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center mx-auto">
              <Activity size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-300 max-w-lg mx-auto">
              No recent PSEmine activity recorded.
            </p>
          </div>
        </div>
      </div>
    </PsemineLayout>
  );
};

export default PsemineDashboard;
