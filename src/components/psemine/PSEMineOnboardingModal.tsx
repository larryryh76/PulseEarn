import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ShieldCheck, Wallet, Pickaxe, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface PSEMineOnboardingModalProps {
  onCompleted?: () => void;
}

export const PSEMineOnboardingModal: React.FC<PSEMineOnboardingModalProps> = ({ onCompleted }) => {
  const { currentUser } = useAuth();
  const { connectWallet, connectedWallet } = usePSEMine();

  const [step, setStep] = useState<number>(1);
  const [, setWalletInput] = useState<string>(connectedWallet || '');
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const handleConnect = async () => {
    const addr = await connectWallet();
    if (addr) {
      setWalletInput(addr);
    }
  };

  const handleInitialize = async () => {
    if (!currentUser) return;
    if (!acceptedTerms) {
      toast.error('Please accept the campaign operational rules first');
      return;
    }
    if (!connectedWallet) {
      toast.error('Please connect a BSC wallet to complete PSEmine onboarding');
      return;
    }

    setIsInitializing(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        'productAccess.psemine': true,
        updatedAt: new Date()
      });

      toast.success('PSEmine product environment initialized!', {
        icon: '⛏️'
      });

      if (onCompleted) {
        onCompleted();
      }
    } catch (e: any) {
      console.error('[PSEMineOnboarding] Error granting access:', e);
      toast.error('Failed to initialize PSEmine environment');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070E]/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#0D131F] border border-blue-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl shadow-blue-950/60 relative overflow-hidden">
        {/* Top Glow Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-600" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Pickaxe size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">PSEmine Campaign Onboarding</h2>
              <p className="text-xs text-slate-400">Initialize your 90-day temporary campaign workspace</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/40 px-2.5 py-1 rounded-full">
            Step {step} of 2
          </span>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} /> Campaign Operational Rules
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>90-Day Campaign Duration:</strong> Mining operations run strictly during the 90-day Genesis campaign period.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>GBP Accounting Currency:</strong> All accrued earnings are tracked and displayed in GBP (£). No internal SHA token balance is exposed or used.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>BNB Tool Deployment:</strong> Tools are purchased using BNB Smart Chain (BNB) with real-time rate conversion.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>Settlement & Crypto Payout:</strong> Accrued campaign earnings are locked until final campaign settlement, after which approved payouts are sent to your designated wallet.</span>
                </li>
              </ul>
            </div>

            <label className="flex items-start gap-3 p-3 bg-[#05070E] border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-300 leading-normal">
                I understand and agree that PSEmine is a temporary campaign separate from standard PulseEarn reward points, and that campaign earnings are non-withdrawable until campaign settlement.
              </span>
            </label>

            <button
              onClick={() => {
                if (!acceptedTerms) {
                  return toast.error('Please accept the campaign operational rules first');
                }
                setStep(2);
              }}
              disabled={!acceptedTerms}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Continue to Wallet Setup
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                  <Wallet size={14} /> Payout & Payment Wallet
                </h3>
                {connectedWallet && (
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    Wallet Linked
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your BNB Smart Chain wallet. This wallet will be used to purchase mining tool capacity and receive final campaign payout distributions.
              </p>

              <div className="pt-2">
                {connectedWallet ? (
                  <div className="p-3 bg-slate-900 border border-slate-700/60 rounded-xl flex items-center justify-between">
                    <div className="font-mono text-xs text-cyan-300">
                      {connectedWallet.slice(0, 10)}...{connectedWallet.slice(-8)}
                    </div>
                    <button
                      onClick={handleConnect}
                      className="text-[10px] font-mono text-blue-400 hover:text-blue-300 underline"
                    >
                      Change Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="w-full py-3 bg-blue-900/40 border border-blue-500/40 hover:bg-blue-900/60 text-blue-300 font-mono font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Wallet size={16} />
                    Connect Web3 Wallet (BNB Smart Chain)
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Back
              </button>

              <button
                onClick={handleInitialize}
                disabled={isInitializing}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isInitializing ? 'Initializing Node...' : 'Complete Initialization'}
                <Zap size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
