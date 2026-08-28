import React, { useState } from 'react';
import { 
  Wallet, 
  Lock, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Info,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Send,
  HelpCircle,
  Copy
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import toast from 'react-hot-toast';

export const PSEMineWallet: React.FC = () => {
  const { 
    pseUser, 
    connectedWallet, 
    connectWallet, 
    disconnectWallet,
    liveAccruedGBP, 
    updatePayoutWallet, 
    campaign
  } = usePSEMine();

  const [payoutInput, setPayoutInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedPayout, setCopiedPayout] = useState(false);
  const [copiedPayment, setCopiedPayment] = useState(false);

  const isWalletLocked = campaign?.status === 'settling' || campaign?.status === 'payout' || campaign?.status === 'closed' || campaign?.status === 'archived';

  const handleSetConnectedAsPayout = () => {
    if (connectedWallet) {
      setPayoutInput(connectedWallet);
      toast.success('Connected wallet address applied');
    } else {
      connectWallet();
    }
  };

  const handleCopy = (text: string, type: 'payout' | 'payment') => {
    navigator.clipboard.writeText(text);
    if (type === 'payout') {
      setCopiedPayout(true);
      setTimeout(() => setCopiedPayout(false), 2000);
    } else {
      setCopiedPayment(true);
      setTimeout(() => setCopiedPayment(false), 2000);
    }
    toast.success('Address copied to clipboard');
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutInput.trim() || !payoutInput.startsWith('0x') || payoutInput.length !== 42) {
      toast.error('Please enter a valid 42-character BNB Smart Chain (BSC) address starting with 0x');
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Wallet Architecture & Settlement
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          PSEmine operates with two distinct wallet roles: one for hardware purchases and one for 90-day campaign earnings disbursement.
        </p>
      </div>

      {/* Distinction Explainer Banner (Binance/Trust Wallet Style) */}
      <div className="p-4 bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-900/40 rounded-2xl flex items-start space-x-3 text-xs">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-300">
          <div className="font-semibold text-white">How PSEmine Wallets Work:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="font-bold text-blue-400">1. Payment Wallet (BNB):</span> Used solely to purchase mining hardware nodes on BNB Smart Chain.
            </div>
            <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <span className="font-bold text-cyan-400">2. Payout Wallet (GBP Settlement):</span> Where your total accrued GBP earnings are disbursed in crypto at Day 90.
            </div>
          </div>
        </div>
      </div>

      {/* Top Cards: Mining Accrual (GBP) vs BNB Network Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Accrued Campaign Earnings (GBP ONLY) */}
        <div className="p-6 bg-[#0D131F] border border-blue-900/50 rounded-2xl space-y-3 relative overflow-hidden shadow-xl shadow-black/40">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5 font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Accrued Campaign Earnings</span>
            </span>
            <span className="text-[10px] uppercase font-bold bg-blue-950/80 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded">
              Settlement: GBP
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-bold text-white font-mono">
            £{liveAccruedGBP.toFixed(4)}
          </div>

          <p className="text-xs text-slate-400">
            Accruing continuously at <strong className="text-emerald-400 font-mono">+£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hr</strong>. Payout is issued upon 90-day Genesis campaign settlement.
          </p>
        </div>

        {/* Payment Network Architecture */}
        <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="flex items-center space-x-1.5 font-semibold text-white">
                <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                <span>Payment Network</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                BSC Chain ID 56
              </span>
            </div>

            <div className="my-1 space-y-1">
              <div className="text-sm font-bold text-white">BNB Smart Chain (BEP-20)</div>
              <p className="text-xs text-slate-400">
                Official Treasury contract verifies hardware node purchases on BSC with low gas fees and sub-second confirmation.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Treasury Status:</span>
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified On-Chain</span>
            </span>
          </div>
        </div>

      </div>

      {/* DUAL WALLET STATUS SEPARATION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* WALLET 1: Payment Wallet */}
        <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-blue-400" />
                <h2 className="text-base font-bold text-white">1. Payment Wallet</h2>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                connectedWallet 
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {connectedWallet ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your Web3 wallet (MetaMask, Trust Wallet, Binance Web3) to authorize BNB payments when buying mining tools.
            </p>

            {connectedWallet ? (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-400">Connected BSC Address:</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white font-bold truncate">
                    {connectedWallet}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleCopy(connectedWallet, 'payment')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Copy"
                    >
                      {copiedPayment ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://bscscan.com/address/${connectedWallet}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-blue-400"
                      title="View on BSCScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-xs text-slate-400 text-center py-4">
                No payment wallet currently linked to this session.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            {connectedWallet ? (
              <button
                onClick={disconnectWallet}
                className="w-full py-2.5 bg-slate-900 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-900/40 text-slate-300 hover:text-rose-400 rounded-xl text-xs font-semibold transition-colors"
              >
                Disconnect Payment Wallet
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect BNB Smart Chain Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* WALLET 2: Payout Wallet */}
        <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <h2 className="text-base font-bold text-white">2. Payout Settlement Wallet</h2>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                pseUser?.payoutWallet 
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40' 
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
              }`}>
                {pseUser?.payoutWallet ? 'Configured' : 'Action Required'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Your finalized 90-day mining earnings (in GBP) will be converted and disbursed to this BNB Smart Chain address at campaign settlement.
            </p>

            {pseUser?.payoutWallet ? (
              <div className="p-3 bg-slate-950/70 border border-cyan-900/40 rounded-xl space-y-1">
                <div className="text-[10px] text-slate-400">Target Settlement Address:</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-cyan-300 font-bold truncate">
                    {pseUser.payoutWallet}
                  </span>
                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleCopy(pseUser.payoutWallet!, 'payout')}
                      className="p-1 text-slate-400 hover:text-white"
                      title="Copy"
                    >
                      {copiedPayout ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://bscscan.com/address/${pseUser.payoutWallet}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-400 hover:text-cyan-400"
                      title="View on BSCScan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>No settlement wallet set. Configure your destination address below.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Settlement Lock:</span>
            <span className={`font-semibold ${isWalletLocked ? 'text-amber-400' : 'text-emerald-400'}`}>
              {isWalletLocked ? '🔒 Locked for Settlement' : '🔓 Unlocked (Editable)'}
            </span>
          </div>
        </div>

      </div>

      {/* Payout Wallet Configuration Form */}
      <div className="p-6 sm:p-7 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Configure Payout Destination Address
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter your personal BEP-20 address on BNB Smart Chain where you wish to receive campaign payout disbursements.
          </p>
        </div>

        {isWalletLocked ? (
          <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-start space-x-3 text-amber-200 text-xs">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Campaign Settlement Window Active</div>
              <div className="text-amber-300/80 mt-0.5">
                Payout addresses are permanently locked during settlement execution to guarantee audit consistency.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitPayout} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                BNB Smart Chain (BEP-20) Address (starts with 0x):
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="0x1234567890abcdef1234567890abcdef12345678"
                  value={payoutInput}
                  onChange={(e) => setPayoutInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#080C14] border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                />
                
                {connectedWallet && (
                  <button
                    type="button"
                    onClick={handleSetConnectedAsPayout}
                    className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-blue-400 rounded-xl text-xs font-semibold shrink-0 transition-colors"
                  >
                    Use Connected Address
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isUpdating || !payoutInput.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shrink-0 transition-all shadow-md shadow-blue-600/20"
                >
                  {isUpdating ? 'Saving...' : 'Save Payout Address'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Campaign Settlement Protocols & FAQ */}
      <div className="p-6 bg-[#0D131F] border border-slate-800/80 rounded-2xl space-y-3 text-xs">
        <div className="flex items-center space-x-2 text-white font-bold">
          <HelpCircle className="w-4 h-4 text-blue-400" />
          <span>Genesis 90-Day Settlement Protocols</span>
        </div>

        <ul className="space-y-2 text-slate-300">
          <li className="flex items-start space-x-2">
            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Denominated strictly in GBP:</strong> Your mining earnings accumulate in real-time in GBP (£) with zero mid-campaign token price volatility.
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Disbursed in BEP-20 Crypto:</strong> Upon Day 90 conclusion, accrued balances are converted and sent to your configured BSC payout address.
            </span>
          </li>
          <li className="flex items-start space-x-2">
            <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Protocol Gas Deduction:</strong> Payout transaction fees on BNB Smart Chain are fully subsidized by the PulseEarn network dispatcher.
            </span>
          </li>
        </ul>
      </div>

    </div>
  );
};
