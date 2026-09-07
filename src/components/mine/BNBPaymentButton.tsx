import { useState } from 'react';
import { CheckCircle2, LoaderCircle, WalletCards, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePsemineWallet } from '../../contexts/PsemineWalletContext';

export interface PsemineQuotedOrder { orderId: string; amountWei: string; amountBnb: string; destination: string; chainId: number; expiresAt: string; }
interface BNBPaymentButtonProps { order: PsemineQuotedOrder; getIdToken: () => Promise<string>; onConfirmed?: (paymentId: string) => void; }

type PaymentState = 'quoted' | 'submitted' | 'confirming' | 'confirmed' | 'failed';

export default function BNBPaymentButton({ order, getIdToken, onConfirmed }: BNBPaymentButtonProps) {
  const { address, isConnected, isBscNetwork, connectWallet, switchToBscNetwork, sendBnbPayment } = usePsemineWallet();
  const [state, setState] = useState<PaymentState>('quoted');
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setError(null);
    try {
      if (!isConnected) await connectWallet();
      if (!isBscNetwork && !(await switchToBscNetwork())) throw new Error('BNB Smart Chain is required.');
      if (!address) throw new Error('Wallet address unavailable.');
      const txHash = await sendBnbPayment({ recipient: order.destination, valueWeiHex: `0x${BigInt(order.amountWei).toString(16)}` });
      setState('submitted');
      const token = await getIdToken();
      setState('confirming');
      const response = await fetch('/api/psemine/verify-payment', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId: order.orderId, txHash }) });
      const payload = await response.json();
      if (!response.ok || payload.status !== 'confirmed') throw new Error(payload.message || 'Blockchain verification failed.');
      setState('confirmed');
      toast.success('Payment confirmed by PSEmine');
      onConfirmed?.(payload.paymentId);
    } catch (paymentError) { const message = paymentError instanceof Error ? paymentError.message : 'Payment could not be completed.'; setError(message); setState('failed'); toast.error(message); }
  };
  if (state === 'confirmed') return <div className="flex items-center gap-2 rounded-xl border border-[#8fc9a7]/25 bg-[#8fc9a7]/10 px-4 py-3 text-sm font-bold text-[#8fc9a7]"><CheckCircle2 size={17} /> Payment confirmed</div>;
  return <div className="flex flex-col gap-3"><button onClick={submit} disabled={state === 'submitted' || state === 'confirming'} className="psemine-button-primary flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-60">{state === 'submitted' || state === 'confirming' ? <LoaderCircle className="animate-spin" size={17} /> : <WalletCards size={17} />} {state === 'submitted' ? 'Transaction submitted' : state === 'confirming' ? 'Verifying transaction' : 'Pay exact BNB amount'}</button>{error && <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-3 text-xs leading-5 text-red-200"><XCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}<p className="text-center text-[10px] leading-5 text-[#758287]">{order.amountBnb} BNB · BSC · quote expires {new Date(order.expiresAt).toLocaleTimeString()}</p></div>;
}
