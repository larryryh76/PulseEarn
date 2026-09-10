import React, { useEffect, useRef, useState } from 'react';
import { usePsemineWallet, PSE_PAYMENT_ADDRESS } from '../../contexts/PsemineWalletContext';
import { PsemineOrder, PsemineTool } from '../../types/psemine';
import { Wallet, ShieldCheck, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface BNBPaymentCheckoutProps {
  tool: PsemineTool;
  onSuccess: () => void;
  onCancel: () => void;
}

const WALLET_ADDRESS_WAIT_TIMEOUT_MS = 60_000;
const WALLET_ADDRESS_POLL_INTERVAL_MS = 100;

export const BNBPaymentCheckout: React.FC<BNBPaymentCheckoutProps> = ({ tool, onSuccess, onCancel }) => {
  const {
    address,
    isConnected,
    isBscNetwork,
    connectWallet,
    switchToBscNetwork,
    sendBnbPayment,
  } = usePsemineWallet();

  const [order, setOrder] = useState<PsemineOrder | null>(null);
  const [submittedTxHash, setSubmittedTxHash] = useState<string | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const addressRef = useRef(address);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const waitForWalletAddress = async (): Promise<string | null> => {
    const deadline = Date.now() + WALLET_ADDRESS_WAIT_TIMEOUT_MS;
    while (!addressRef.current && Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, WALLET_ADDRESS_POLL_INTERVAL_MS));
    }
    return addressRef.current;
  };

  const handleCreateOrder = async () => {
    setCreatingOrder(true);
    try {
      let paymentWallet = addressRef.current;
      if (!paymentWallet) {
        await connectWallet();
        paymentWallet = await waitForWalletAddress();
        if (!paymentWallet) return;
      }

      const token = await (window as any).psemineAuthToken?.();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/psemine/orders/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({ toolId: tool.id, paymentWallet }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order and lock quote');
      }

      setOrder(data.order);
      setSubmittedTxHash(null);
      toast.success('Live BNB quote locked for 15 minutes');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Order creation failed';
      toast.error(msg);
    } finally {
      setCreatingOrder(false);
    }
  };

  const handlePayBnb = async () => {
    if (!order) return;
    if (!isConnected) {
      await connectWallet();
      return;
    }
    if (!isBscNetwork) {
      const switched = await switchToBscNetwork();
      if (!switched) return;
    }

    setSubmittingPayment(true);
    try {
      const weiBigInt = BigInt(order.payableWeiAmount);
      const valueHex = '0x' + weiBigInt.toString(16);

      const currentWallet = addressRef.current?.trim().toLowerCase() || '';
      const intendedWallet = order.intendedPaymentWallet?.trim().toLowerCase() || '';
      if (!currentWallet || !intendedWallet || currentWallet !== intendedWallet) {
        toast.error('Switch to the wallet used to create this order, or create a new order before paying.');
        return;
      }

      const hash = await sendBnbPayment({
        recipient: order.destinationAddress || PSE_PAYMENT_ADDRESS,
        valueWeiHex: valueHex,
      });

      setSubmittedTxHash(hash);
      toast.success('Transaction submitted to BSC network. Verifying on-chain...');

      await handleVerifyOnChain(hash, order.id);
    } catch (err: unknown) {
      console.error('Payment error:', err);
      const msg = err instanceof Error ? err.message : 'Payment failed or rejected';
      toast.error(msg);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleVerifyOnChain = async (hashToVerify: string, orderIdToVerify: string) => {
    setVerifyingPayment(true);
    try {
      const token = await (window as any).psemineAuthToken?.();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/psemine/orders/verify-payment', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          txHash: hashToVerify,
          orderId: orderIdToVerify,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Blockchain payment verification failed');
      }

      toast.success('Payment confirmed on-chain! Tool entitlement activated.');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification pending or failed. Retry in a moment.';
      toast.error(msg);
    } finally {
      setVerifyingPayment(false);
    }
  };

  return (
    <div className="bg-[#12121A] border border-emerald-500/30 rounded-2xl p-6 max-w-lg w-full space-y-5 text-left relative shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            {tool.tier} Tier Checkout
          </span>
          <h3 className="text-lg font-black text-white mt-1">{tool.name}</h3>
        </div>
        <button
          onClick={onCancel}
          className="text-zinc-400 hover:text-white text-xs font-bold px-3 py-1 bg-white/5 rounded-lg border border-white/5 transition-all"
        >
          Cancel
        </button>
      </div>

      {!order ? (
        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Canonical Tool Price:</span>
              <span className="font-bold text-white">£{tool.priceGbp} GBP</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Hourly Yield Rate:</span>
              <span className="font-bold text-emerald-400">£{tool.miningRateGbpPerHour.toFixed(2)} / hr</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Settlement Network:</span>
              <span className="font-bold text-white">BNB Smart Chain (BSC - 56)</span>
            </div>
          </div>

          <button
            onClick={handleCreateOrder}
            disabled={creatingOrder}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {creatingOrder ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Locking Live BNB Quote...</span>
              </>
            ) : (
              <>
                <span>Lock Live BNB Quote</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white/5 p-4 rounded-xl border border-emerald-500/20 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Locked GBP/BNB Rate:</span>
              <span className="font-bold text-white">£{order.quoteBnbPerGbp.toFixed(2)} GBP per BNB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Exact Payable BNB:</span>
              <span className="font-black text-emerald-400 text-sm">{order.payableBnbAmount} BNB</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-zinc-400">Destination Address:</span>
              <span className="font-mono text-zinc-300">{order.destinationAddress.slice(0, 6)}...{order.destinationAddress.slice(-4)}</span>
            </div>
            {submittedTxHash && (
              <div className="flex justify-between text-[11px] pt-1 border-t border-white/5">
                <span className="text-zinc-400">Submitted Tx Hash:</span>
                <span className="font-mono text-emerald-400">{submittedTxHash.slice(0, 8)}...{submittedTxHash.slice(-6)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/5">
              <span>Provider: {order.quoteProvider}</span>
              <span>Quote Expires in 15 mins</span>
            </div>
          </div>

          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="w-full py-3 bg-white/10 hover:bg-white/15 text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <Wallet size={16} className="text-emerald-400" />
              <span>Connect Web3 Wallet to Pay</span>
            </button>
          ) : !isBscNetwork ? (
            <button
              onClick={switchToBscNetwork}
              className="w-full py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <AlertCircle size={16} />
              <span>Switch Network to BNB Smart Chain</span>
            </button>
          ) : submittedTxHash ? (
            <button
              onClick={() => handleVerifyOnChain(submittedTxHash, order.id)}
              disabled={verifyingPayment}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {verifyingPayment ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Verifying On-Chain...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Retry On-Chain Verification</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handlePayBnb}
              disabled={submittingPayment || verifyingPayment}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              {submittingPayment || verifyingPayment ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>{verifyingPayment ? 'Verifying On-Chain...' : 'Confirming in Wallet...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Pay {order.payableBnbAmount} BNB Now</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BNBPaymentCheckout;
