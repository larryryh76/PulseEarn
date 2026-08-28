import React, { useState } from 'react';
import { 
  Wallet, 
  Lock, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Info
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import toast from 'react-hot-toast';

export const PSEMineWallet: React.FC = () => {
  const { 
    pseUser, 
    connectedWallet, 
    connectWallet, 
    liveAccruedGBP, 
    updatePayoutWallet, 
    campaign
  } = usePSEMine();

  const [payoutInput, setPayoutInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isWalletLocked = campaign?.status === 'settling' || campaign?.status === 'payout' || campaign?.status === 'closed' || campaign?.status === 'archived';

  const handleSetConnectedAsPayout = () => {
    if (connectedWallet) {
      setPayoutInput(connectedWallet);
    } else {
      connectWallet();
    }
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutInput.trim() || !payoutInput.startsWith('0x') || payoutInput.length !== 42) {
      toast.error('Please enter a valid 42-character BNB Smart Chain (BSC) address');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updatePayoutWallet(payoutInput.trim());
      if (res.success) {
        toast.success('Settlement payout wallet updated successfully!');
        setPayoutInput('');
      } else {
        toast.error(res.error || 'Failed to update payout wallet');
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message || 'Update failed');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Wallet & Settlement Architecture
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Manage your BNB Smart Chain settlement destination and review 90-day campaign disbursement rules.
        </p>
      </div>

      {/* Balance & Wallet State Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Accrued Card */}
        <div className="p-6 bg-gradient-to-br from-[#0c1832] to-[#080f20] border border-cyan-500/40 rounded-3xl space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Accrued Campaign Balance</span>
            </span>
            <span className="text-[10px] uppercase font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded">
              Locked GBP
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text font-mono">
            £{liveAccruedGBP.toFixed(4)}
          </div>

          <p className="text-xs text-gray-400">
            Accruing at <strong className="text-cyan-300 font-mono">+£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hr</strong>. Accrued balances are finalized on Day 90 of the Genesis campaign.
          </p>
        </div>

        {/* Current Configured Payout Wallet */}
        <div className="p-6 bg-[#090f20] border border-cyan-900/40 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className="flex items-center space-x-1.5">
                <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                <span>Configured Settlement Wallet</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                BSC BEP-20
              </span>
            </div>

            <div className="my-2">
              {pseUser?.payoutWallet ? (
                <div className="font-mono text-sm text-cyan-300 font-bold break-all p-2.5 bg-[#080d19] border border-cyan-800/40 rounded-xl">
                  {pseUser.payoutWallet}
                </div>
              ) : (
                <div className="text-xs text-amber-400 flex items-center space-x-1.5 p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>No settlement wallet configured. Configure below before settlement cutoff.</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-xs text-gray-400 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span>Lock Status:</span>
            <span className={`font-semibold ${isWalletLocked ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isWalletLocked ? '🔒 Locked for Settlement' : '🔓 Unlocked (Editable)'}
            </span>
          </div>
        </div>

      </div>

      {/* Payout Wallet Configuration Form */}
      <div className="p-6 sm:p-8 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Update Settlement Destination Wallet
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Specify the non-custodial BNB Smart Chain (BEP-20) address where your crypto payout will be delivered at campaign conclusion.
          </p>
        </div>

        {isWalletLocked ? (
          <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-start space-x-3 text-amber-200 text-xs">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Wallet Modifications Closed</div>
              <div className="text-amber-300/80 mt-0.5">
                The campaign settlement window is active. All payout destinations are permanently locked to ensure verified ledger reconciliation.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitPayout} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                BNB Smart Chain (BSC) Address (0x...):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="0x1234567890abcdef1234567890abcdef12345678"
                  value={payoutInput}
                  onChange={(e) => setPayoutInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-[#080d19] border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                />
                
                {connectedWallet && (
                  <button
                    type="button"
                    onClick={handleSetConnectedAsPayout}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-300 rounded-xl text-xs font-semibold shrink-0 transition-colors"
                  >
                    Use Connected Wallet
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isUpdating || !payoutInput.trim()}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-lg shadow-cyan-600/20"
                >
                  {isUpdating ? 'Saving...' : 'Save Wallet'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Campaign Settlement Rules */}
      <div className="p-6 bg-[#090e1c] border border-slate-800 rounded-3xl space-y-4 text-xs">
        <div className="flex items-center space-x-2 text-white font-bold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Important 90-Day Campaign Settlement Protocols</span>
        </div>

        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start space-x-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Accounting Fixed in GBP:</strong> All mining rates and continuous balances are calculated strictly in GBP (£) throughout the 90 days.
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Crypto Disbursement:</strong> At campaign completion, approved balances are converted and disbursed in crypto (BNB / USDT_BSC) based on Binance oracle rates.
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Gas Fees on Payouts:</strong> Settlement transaction gas fees are covered by the protocol node dispatcher.
            </span>
          </li>
        </ul>
      </div>

    </div>
  );
};
