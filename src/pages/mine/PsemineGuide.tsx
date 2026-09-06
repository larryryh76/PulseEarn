import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import {
  Cpu,
  Layers,
  Zap,
  Wallet,
  ArrowRight,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineGuide: React.FC = () => {
  const { completeGuide } = usePsemineAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await completeGuide();
      toast.success('PSEmine onboarding complete!');
      navigate('/mine/dashboard');
    } catch (err: any) {
      console.error('[PSEmine Guide] Complete error:', err);
      toast.error(
        err?.code === 'permission-denied'
          ? 'Onboarding permissions are not deployed yet. Please contact support.'
          : 'Failed to complete onboarding: ' + (err.message || 'Unknown error'),
        { id: 'psemine-onboarding-error' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PsemineLayout>
      <div className="max-w-4xl mx-auto space-y-10 py-4">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] text-xs font-bold uppercase tracking-widest">
            <Cpu size={14} />
            <span>PSEmine System Orientation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Welcome to PSEmine Infrastructure
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Review the primary architectural concepts before entering your enterprise mining workspace.
          </p>
        </div>

        {/* Guide Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1 */}
          <div className="bg-[#0B0E17] border border-white/10 rounded-2xl p-6 space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu size={18} className="text-[#00F2FE]" />
              <span>What is PSEmine?</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              PSEmine is a dedicated computational and campaign validation environment built to operate independently from main platform rewards.
            </p>
          </div>

          {/* Section 2 */}
          <div className="bg-[#0B0E17] border border-white/10 rounded-2xl p-6 space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-[#00F2FE]" />
              <span>How the System Works</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Participants deploy structured mining tools and campaign nodes that validate telemetry data across isolated enterprise workloads.
            </p>
          </div>

          {/* Section 3 */}
          <div className="bg-[#0B0E17] border border-white/10 rounded-2xl p-6 space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap size={18} className="text-[#00F2FE]" />
              <span>Tools, Campaigns & Settlement</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              In upcoming phases, you will be able to acquire specialized tools and track real computational yield. All accrual metrics will be fully transparent.
            </p>
          </div>

          {/* Section 4 */}
          <div className="bg-[#0B0E17] border border-white/10 rounded-2xl p-6 space-y-3 relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[#00F2FE] flex items-center justify-center font-bold">
              4
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet size={18} className="text-[#00F2FE]" />
              <span>Wallet & Payment Integration</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Wallet connection is strictly optional and will only be required when live purchases and settlements go live in subsequent releases.
            </p>
          </div>
        </div>

        {/* Notice Box */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3 text-amber-200 text-xs leading-relaxed">
          <ShieldAlert size={18} className="shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300 block mb-0.5">Clean Rebuild Baseline</span>
            This workspace currently represents Phase 1 foundation access. Mining engine metrics and tool purchases are under development and will be activated seamlessly in future updates.
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="px-8 py-4 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-2xl font-black text-sm uppercase tracking-wider flex items-center gap-3 transition-all shadow-[0_0_25px_rgba(0,242,254,0.4)] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Completing Setup...</span>
              </>
            ) : (
              <>
                <span>Acknowledge & Continue to Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </PsemineLayout>
  );
};

export default PsemineGuide;
