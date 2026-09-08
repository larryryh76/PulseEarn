import React from 'react';
import { AlertTriangle, CheckCircle2, Link2, Unplug, WalletCards, ShieldCheck, ArrowRight } from 'lucide-react';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import { BSC_CHAIN_ID, usePsemineWallet } from '../../contexts/PsemineWalletContext';

export default function PsemineWalletPage() {
  const { address, chainId, isConnecting, isConnected, isBscNetwork, connectWallet, disconnectWallet, switchToBscNetwork } = usePsemineWallet();

  return (
    <PsemineLayout>
      <div className="mx-auto max-w-3xl py-6 space-y-8">
        {/* Header */}
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <WalletCards size={16} />
            <span>Web3 Wallet Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Financial Wallet Control</h1>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
            Wallet connections are used strictly for locking live BNB payment quotes and executing on-chain tool entitlement purchases on the BNB Smart Chain (BSC).
          </p>
        </div>

        {/* Main Status Panel */}
        <div className="bg-[#12121A] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Connected Wallet Address</p>
              <p className="mt-1 font-mono text-sm font-bold text-white">
                {address ? address : 'No wallet connected'}
              </p>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
              isBscNetwork ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
            }`}>
              {isBscNetwork ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              <span>{isBscNetwork ? 'BNB Smart Chain (BSC) Active' : chainId ? `Chain ID: ${chainId}` : 'Network Disconnected'}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {!isConnected ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
              >
                <Link2 size={16} />
                <span>{isConnecting ? 'Connecting Wallet...' : 'Connect Web3 Wallet'}</span>
              </button>
            ) : (
              <button
                onClick={disconnectWallet}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <Unplug size={16} />
                <span>Disconnect Wallet</span>
              </button>
            )}

            {isConnected && !isBscNetwork && (
              <button
                onClick={switchToBscNetwork}
                className="px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
              >
                <span>Switch to BSC (Chain 56)</span>
              </button>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 text-xs text-zinc-400 space-y-2">
            <div className="flex items-center gap-2 text-white font-bold">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>Settlement Standards</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              All PSEmine tool orders require exact BNB payment transfers verified on-chain. Rewards and output calculations are managed by backend authority and independent of browser state.
            </p>
          </div>
        </div>
      </div>
    </PsemineLayout>
  );
}
