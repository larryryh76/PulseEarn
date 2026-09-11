import React, { useState } from 'react';
import { 
  Wallet, 
  Lock, 
  AlertCircle, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  Send, 
  HelpCircle, 
  Copy 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { cn } from '../../utils';
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
      toast.error('Please enter a valid 42-character address starting with 0x');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await updatePayoutWallet(payoutInput.trim());
      if (res.success) {
        toast.success('Payout wallet updated successfully');
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
    <div className="pt-20 md:pt-24 pb-28 px-4 md:px-6 lg:px-8 max-w-5xl mx-auto space-y-6 md:space-y-8 transition-colors">
      
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
            PSEmine Settings
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
          Wallet & Payout
        </h1>
        <p className="text-xs md:text-sm text-text-secondary">
          Manage your connected payment wallet and configure your settlement address.
        </p>
      </motion.div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        
        {/* Estimated Campaign Earnings */}
        <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-3 relative overflow-hidden shadow-subtle">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-primary">
              Estimated Earnings
            </span>
            <span className="psemine-badge-emerald">
              GBP Accounting
            </span>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight font-mono tabular-nums">
            £{liveAccruedGBP.toFixed(2)}
          </div>

          <p className="text-xs text-text-secondary">
            Accruing at <strong className="text-[#2bb39a] font-mono font-bold">+£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hour</strong>. Settled at the end of the 90-day campaign.
          </p>
        </div>

        {/* Network & Payment Info */}
        <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl flex flex-col justify-between space-y-4 shadow-subtle">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-text-primary">
                Network
              </span>
              <span className="text-[10px] bg-surface-bright text-text-secondary px-2.5 py-0.5 rounded-md font-mono font-bold border border-border">
                BNB Smart Chain
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-bold text-text-primary">BEP-20 Compatible</div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Purchases and final campaign earnings settlement are conducted on BNB Smart Chain.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
            <span>Status:</span>
            <span className="text-[#2bb39a] font-bold flex items-center gap-1">
              <ShieldCheck size={14} />
              <span>Operational</span>
            </span>
          </div>
        </div>

      </div>

      {/* WALLET SECTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        
        {/* 1. Payment Wallet */}
        <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-[#2bb39a]" />
                <h2 className="text-sm font-bold text-text-primary">Connected Wallet</h2>
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                connectedWallet 
                  ? "bg-[#2bb39a]/10 text-[#2bb39a] border-[#2bb39a]/20" 
                  : "bg-surface-bright text-text-tertiary border-border"
              )}>
                {connectedWallet ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Connect your Web3 wallet (MetaMask, Trust Wallet, Binance Web3) to purchase mining tools.
            </p>

            {connectedWallet ? (
              <div className="p-3.5 bg-surface-bright/50 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Address</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-primary font-bold truncate">
                    {connectedWallet}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleCopy(connectedWallet, 'payment')}
                      className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                      title="Copy Address"
                    >
                      {copiedPayment ? <Check size={14} className="text-[#2bb39a]" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={`https://bscscan.com/address/${connectedWallet}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-text-tertiary hover:text-[#2bb39a] transition-colors"
                      title="View on BSCScan"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-surface-bright/30 border border-dashed border-border rounded-xl text-xs text-text-tertiary text-center">
                No wallet connected.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border">
            {connectedWallet ? (
              <button
                onClick={disconnectWallet}
                className="w-full py-2.5 bg-surface-bright hover:bg-danger/10 border border-border hover:border-danger/30 text-text-secondary hover:text-danger rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Disconnect Wallet
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="psemine-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <Wallet size={14} />
                <span>Connect Wallet</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Payout Address */}
        <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-[#2bb39a]" />
                <h2 className="text-sm font-bold text-text-primary">Payout Destination</h2>
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                pseUser?.payoutWallet 
                  ? "bg-[#2bb39a]/10 text-[#2bb39a] border-[#2bb39a]/20" 
                  : "bg-warning/10 text-warning border-warning/20"
              )}>
                {pseUser?.payoutWallet ? 'Configured' : 'Action Required'}
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Your finalized 90-day campaign earnings will be disbursed to this address.
            </p>

            {pseUser?.payoutWallet ? (
              <div className="p-3.5 bg-surface-bright/50 border border-border rounded-xl space-y-1">
                <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">Settlement Address</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-text-primary font-bold truncate">
                    {pseUser.payoutWallet}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleCopy(pseUser.payoutWallet!, 'payout')}
                      className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                      title="Copy Address"
                    >
                      {copiedPayout ? <Check size={14} className="text-[#2bb39a]" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={`https://bscscan.com/address/${pseUser.payoutWallet}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-text-tertiary hover:text-[#2bb39a] transition-colors"
                      title="View on BSCScan"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-warning/5 border border-warning/20 rounded-xl text-xs text-warning flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-warning" />
                <span>No payout address configured yet.</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-tertiary">
            <span>Status:</span>
            <span className={cn("font-bold", isWalletLocked ? "text-warning" : "text-[#2bb39a]")}>
              {isWalletLocked ? 'Locked for Settlement' : 'Editable'}
            </span>
          </div>
        </div>

      </div>

      {/* Payout Configuration Form */}
      <div className="p-6 sm:p-7 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Configure Payout Address
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Enter your BNB Smart Chain address (BEP-20) to receive your campaign earnings.
          </p>
        </div>

        {isWalletLocked ? (
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-start gap-3 text-warning text-xs">
            <Lock size={16} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Settlement Window Active</div>
              <div className="mt-0.5 opacity-90">
                Payout addresses are locked during campaign settlement.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitPayout} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1.5 uppercase tracking-wider">
                BNB Smart Chain Address (starts with 0x)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="0x1234567890abcdef1234567890abcdef12345678"
                  value={payoutInput}
                  onChange={(e) => setPayoutInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-surface-bright border border-border rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-[#2bb39a] placeholder-text-tertiary"
                />
                
                {connectedWallet && (
                  <button
                    type="button"
                    onClick={handleSetConnectedAsPayout}
                    className="px-4 py-2.5 bg-surface-bright hover:bg-surface border border-border text-[#2bb39a] rounded-xl text-xs font-bold shrink-0 transition-colors"
                  >
                    Use Connected
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isUpdating || !payoutInput.trim()}
                  className="psemine-btn-primary px-5 py-2.5 text-xs shrink-0"
                >
                  {isUpdating ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Campaign Settlement Info */}
      <div className="p-6 bg-surface border border-border rounded-2xl md:rounded-3xl space-y-3 text-xs">
        <div className="flex items-center gap-2 text-text-primary font-bold">
          <HelpCircle size={16} className="text-[#2bb39a]" />
          <span>Settlement Information</span>
        </div>

        <ul className="space-y-2 text-text-secondary">
          <li className="flex items-start gap-2">
            <Check size={14} className="text-[#2bb39a] shrink-0 mt-0.5" />
            <span>
              <strong className="text-text-primary">Fixed GBP Value:</strong> Earnings accumulate in GBP (£) with no token price fluctuations during the campaign.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check size={14} className="text-[#2bb39a] shrink-0 mt-0.5" />
            <span>
              <strong className="text-text-primary">Automatic Disbursement:</strong> Upon campaign conclusion, your accumulated earnings are sent to your configured payout address.
            </span>
          </li>
        </ul>
      </div>

    </div>
  );
};
