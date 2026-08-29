import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  Wallet, 
  ShieldCheck, 
  Clock, 
  Copy, 
  Check, 
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
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

        toast.loading('Please confirm transaction in your Web3 wallet...', { id: 'web3-tx' });

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
        toast.success(`Transaction Submitted: ${txHash.slice(0, 8)}...`, { icon: '⛓️' });

        // Submit to PSEmine engine for confirmation & tool activation
        const res = await submitPurchaseTx(activeQuote, txHash);
        if (res.success) {
          onClose();
        }
      } else {
        toast.error('No Web3 browser extension found. Please submit manual transaction hash below.');
      }
    } catch (e: unknown) {
      toast.dismiss('web3-tx');
      const err = e as Error;
      toast.error(err?.message || 'Transaction rejected by wallet');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual Tx Hash submission (e.g. from mobile Trust Wallet or external wallet)
  const handleManualHashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuote) return;
    if (!txHashInput.trim() || !txHashInput.startsWith('0x') || txHashInput.length < 64) {
      toast.error('Please enter a valid 66-character BSC transaction hash starting with 0x');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#0D131F] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#05070E]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Deploy {tool.name}</span>
                <span className="text-xs bg-blue-950/80 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded font-mono">
                  +£{tool.hourlyRateGBP.toFixed(2)}/hr
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tier {tool.tier} • Ownership {ownedCount}/{tool.maxPerUser}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-white text-sm">
          
          {isMaxReached ? (
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex items-start space-x-3 text-amber-200">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Maximum Ownership Limit Reached</div>
                <div className="text-xs text-amber-300/80 mt-1">
                  You already own {ownedCount} of {tool.maxPerUser} permitted units of {tool.name}. Explore higher tiers to increase your hourly mining capacity.
                </div>
              </div>
            </div>
          ) : quoteLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-xs text-slate-400 font-medium">
                Fetching real-time BNB/GBP price quote...
              </p>
            </div>
          ) : activeQuote ? (
            <>
              {/* Economic Summary Banner */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Tool Price (Fixed)</div>
                  <div className="text-base font-bold text-white font-mono">
                    £{tool.purchasePriceGBP.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Capacity Increase</div>
                  <div className="text-base font-bold text-emerald-400 font-mono">
                    +£{tool.hourlyRateGBP.toFixed(2)}/hr
                  </div>
                </div>
              </div>

              {/* Live Quote Details */}
              <div className="p-4 bg-slate-950/90 border border-blue-900/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Payment Quote (BNB)</span>
                  </span>
                  <div className="flex items-center space-x-1 font-mono text-blue-300 font-bold text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Valid for {timeFormatted}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#05070E] border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-xl font-bold text-blue-400 font-mono">
                      {activeQuote.bnbAmount} BNB
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Rate: 1 BNB = £{activeQuote.exchangeRateBNBGBP.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(String(activeQuote.bnbAmount), 'amount')}
                    className="px-2.5 py-1.5 text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg flex items-center space-x-1 transition-colors"
                  >
                    {copiedAmount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Receiver Wallet Info */}
                <div>
                  <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                    <span>Treasury Address (BNB Smart Chain)</span>
                    <span className="text-blue-400 font-mono text-[10px]">BEP-20</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-[#05070E] border border-slate-800 rounded-xl">
                    <span className="font-mono text-xs text-slate-300 truncate mr-2">
                      {activeQuote.receiverWallet}
                    </span>
                    <button
                      onClick={() => copyToClipboard(activeQuote.receiverWallet, 'address')}
                      className="p-1.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
                      title="Copy Address"
                    >
                      {copiedAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying on Blockchain...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>Pay {activeQuote.bnbAmount} BNB with Connected Wallet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Payment Action 2: Manual Hash Input */}
              <div className="pt-2 border-t border-slate-800/80">
                <form onSubmit={handleManualHashSubmit} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-slate-400 font-medium">
                      Or submit external Transaction Hash (txHash):
                    </label>
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={txHashInput}
                      onChange={(e) => setTxHashInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#05070E] border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !txHashInput.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-blue-400 disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Note */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Requires 2 BSC block confirmations. Mining capacity activates immediately once verified.
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-slate-400">
              Failed to load payment quote. Please retry.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
