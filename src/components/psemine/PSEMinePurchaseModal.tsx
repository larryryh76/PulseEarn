import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  Wallet, 
  ShieldCheck, 
  Clock, 
  Copy, 
  Check, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PSEMineToolDefinition
} from '../../types/psemine';
import { usePSEMine } from '../../contexts/PSEMineContext';
import toast from 'react-hot-toast';

interface Props {
  tool: PSEMineToolDefinition;
  isOpen: boolean;
  onClose: () => void;
}

export const PSEMinePurchaseModal: React.FC<Props> = ({ tool, isOpen, onClose }) => {
  const { 
    pseUser, 
    connectedWallet, 
    connectWallet, 
    requestQuote, 
    activeQuote, 
    clearQuote, 
    submitPurchaseTx 
  } = usePSEMine();

  const [txHashInput, setTxHashInput] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState<number>(600);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);

  const ownedCount = pseUser?.toolOwnershipCounts[tool.id] || 0;
  const isMaxReached = ownedCount >= tool.maxPerUser;

  // 1. Automatically fetch quote when modal opens
  useEffect(() => {
    if (isOpen && !isMaxReached) {
      setQuoteLoading(true);
      requestQuote(tool.id).finally(() => setQuoteLoading(false));
    } else {
      clearQuote();
    }
  }, [isOpen, tool.id, isMaxReached]);

  // 2. Quote timer countdown
  useEffect(() => {
    if (!activeQuote) return;

    const interval = setInterval(() => {
      const expiresMs = new Date(activeQuote.expiresAt).getTime();
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
      setQuoteSecondsLeft(diffSec);

      if (diffSec <= 0) {
        toast('Quote expired. Refreshing BNB exchange rate...', { icon: '⏳' });
        requestQuote(tool.id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeQuote, tool.id]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: 'address' | 'amount') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    }
    toast.success('Copied to clipboard');
  };

  // Direct Web3 Send BNB Transaction via Connected Wallet
  const handleDirectWeb3Pay = async () => {
    if (!activeQuote) return;
    
    let walletAddr = connectedWallet;
    if (!walletAddr) {
      walletAddr = await connectWallet();
      if (!walletAddr) return;
    }

    setIsSubmitting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        // Convert BNB amount to Wei hex string
        const bnbAmountNum = activeQuote.bnbAmount;
        const weiValueBigInt = BigInt(Math.floor(bnbAmountNum * 1e18));
        const hexValue = '0x' + weiValueBigInt.toString(16);

        toast.loading('Please confirm transaction in your wallet...', { id: 'web3-tx' });

        const txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: walletAddr,
              to: activeQuote.receiverWallet,
              value: hexValue,
              gas: '0x5208' // 21000 standard gas for BNB transfer
            }
          ]
        });

        toast.dismiss('web3-tx');
        toast.success(`Transaction submitted: ${txHash.slice(0, 8)}...`);

        // Submit to PSEmine engine for confirmation & tool activation
        const res = await submitPurchaseTx(activeQuote, txHash);
        if (res.success) {
          onClose();
        }
      } else {
        toast.error('No Web3 wallet found. Please submit transaction hash below.');
      }
    } catch (e: unknown) {
      toast.dismiss('web3-tx');
      const err = e as Error;
      toast.error(err?.message || 'Transaction rejected');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Tx Hash submission (e.g. from mobile Trust Wallet or external wallet)
  const handleManualHashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote) return;
    if (!txHashInput.trim() || !txHashInput.startsWith('0x') || txHashInput.length < 64) {
      toast.error('Please enter a valid 66-character transaction hash starting with 0x');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitPurchaseTx(activeQuote, txHashInput.trim());
      if (res.success) {
        onClose();
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message || 'Failed to verify transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const minutes = Math.floor(quoteSecondsLeft / 60);
  const seconds = quoteSecondsLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-surface border border-border rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden my-8"
        >
          
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-bright/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00E599]/10 border border-[#00E599]/20 flex items-center justify-center text-[#00E599]">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <span>Purchase {tool.name}</span>
                  <span className="psemine-badge-emerald font-mono">
                    +£{tool.hourlyRateGBP.toFixed(2)}/hr
                  </span>
                </h3>
                <p className="text-xs text-text-secondary">
                  Tier {tool.tier} • Owned: {ownedCount}/{tool.maxPerUser}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-tertiary hover:text-text-primary rounded-xl hover:bg-surface-bright transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 text-text-primary text-sm">
            
            {isMaxReached ? (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl md:rounded-2xl flex items-start gap-3 text-warning">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">Ownership Limit Reached</div>
                  <div className="text-xs text-text-secondary mt-1">
                    You already own {ownedCount} of {tool.maxPerUser} units of {tool.name}. Explore higher tiers to increase your hourly rate.
                  </div>
                </div>
              </div>
            ) : quoteLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#00E599] animate-spin" />
                <p className="text-xs text-text-secondary font-medium">
                  Loading BNB price quote...
                </p>
              </div>
            ) : activeQuote ? (
              <>
                {/* Economic Summary Banner */}
                <div className="grid grid-cols-2 gap-3.5 p-4 bg-surface-bright/50 border border-border rounded-xl md:rounded-2xl">
                  <div>
                    <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">Price</div>
                    <div className="text-base font-bold font-mono text-text-primary mt-0.5">
                      £{tool.purchasePriceGBP.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">Capacity Added</div>
                    <div className="text-base font-bold font-mono text-[#00E599] mt-0.5">
                      +£{tool.hourlyRateGBP.toFixed(2)}/hr
                    </div>
                  </div>
                </div>

                {/* Live Quote Details */}
                <div className="p-4 md:p-5 bg-surface-bright/30 border border-border rounded-xl md:rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">
                      Payment Amount (BNB)
                    </span>
                    <div className="flex items-center gap-1 text-[#00E599] font-mono font-bold text-[11px] bg-[#00E599]/10 border border-[#00E599]/20 px-2 py-0.5 rounded-full">
                      <Clock size={12} />
                      <span>Valid: {timeFormatted}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-surface border border-border rounded-xl">
                    <div>
                      <div className="text-xl font-bold font-mono text-[#00E599] tabular-nums">
                        {activeQuote.bnbAmount} BNB
                      </div>
                      <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
                        Rate: 1 BNB = £{activeQuote.exchangeRateBNBGBP.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(String(activeQuote.bnbAmount), 'amount')}
                      className="px-3 py-1.5 text-xs bg-surface-bright hover:bg-surface border border-border text-text-primary rounded-lg flex items-center gap-1.5 font-bold uppercase tracking-wider transition-colors shadow-subtle"
                    >
                      {copiedAmount ? <Check size={14} className="text-[#00E599]" /> : <Copy size={14} />}
                      <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Receiver Wallet Info */}
                  <div>
                    <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Payment Address (BNB Smart Chain)</span>
                      <span className="text-[#00E599] font-mono text-[10px]">BEP-20</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl">
                      <span className="font-mono text-xs text-text-primary truncate mr-2">
                        {activeQuote.receiverWallet}
                      </span>
                      <button
                        onClick={() => copyToClipboard(activeQuote.receiverWallet, 'address')}
                        className="p-1.5 text-text-tertiary hover:text-text-primary bg-surface-bright border border-border rounded-lg transition-colors"
                        title="Copy Address"
                      >
                        {copiedAddress ? <Check size={14} className="text-[#00E599]" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Payment Action 1: Web3 One-Click Send */}
                <div className="space-y-2 pt-1">
                  <button
                    id="psemine-pay-web3-btn"
                    onClick={handleDirectWeb3Pay}
                    disabled={isSubmitting}
                    className="psemine-btn-primary w-full py-3.5 px-4 text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Wallet size={16} />
                        <span>Pay {activeQuote.bnbAmount} BNB with Wallet</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Payment Action 2: Manual Hash Input */}
                <div className="pt-3 border-t border-border">
                  <form onSubmit={handleManualHashSubmit} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">
                        Or enter Transaction Hash (txHash):
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="0x..."
                        value={txHashInput}
                        onChange={(e) => setTxHashInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-surface-bright border border-border rounded-xl text-xs font-mono text-text-primary focus:outline-none focus:border-[#00E599] placeholder-text-tertiary"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting || !txHashInput.trim()}
                        className="px-4 py-2 bg-surface hover:bg-surface-bright border border-border rounded-xl text-xs font-bold text-[#00E599] uppercase tracking-wider disabled:opacity-50 transition-colors shadow-subtle"
                      >
                        Verify
                      </button>
                    </div>
                  </form>
                </div>

                {/* Security Note */}
                <div className="flex items-center gap-2 text-[11px] text-text-tertiary pt-1">
                  <ShieldCheck size={16} className="text-[#00E599] shrink-0" />
                  <span>
                    Tool activates immediately once transaction confirmation is verified on BSC.
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-text-tertiary">
                Failed to load payment quote. Please retry.
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
