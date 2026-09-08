import React, { useState, useEffect, useCallback } from 'react';
import PsemineLayout from '../../components/mine/PsemineLayout';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { PsemineWithdrawal } from '../../types/psemine';
import { Wallet, ShieldCheck, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineWithdrawals: React.FC = () => {
  const { currentUser } = usePsemineAuth();
  const [withdrawals, setWithdrawals] = useState<PsemineWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [amountGbp, setAmountGbp] = useState('');
  const [payoutAddress, setPayoutAddress] = useState('');

  const fetchWithdrawals = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    setFetchError(null);
    try {
      const q = query(
        collection(db, 'psemine_withdrawals'),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      const list: PsemineWithdrawal[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PsemineWithdrawal);
      });
      setWithdrawals(list);
    } catch (err: unknown) {
      console.error('Error fetching withdrawals:', err);
      const msg = err instanceof Error ? err.message : 'Failed to load withdrawal history';
      setFetchError(msg);
      toast.error('Unable to fetch withdrawal history');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    const val = parseFloat(amountGbp);
    if (isNaN(val) || val < 10) {
      toast.error('Minimum withdrawal threshold is £10.00 GBP');
      return;
    }

    if (!payoutAddress || !payoutAddress.startsWith('0x') || payoutAddress.length !== 42) {
      toast.error('Please provide a valid BNB Smart Chain BEP-20 payout address (0x...)');
      return;
    }

    setSubmitting(true);
    try {
      const token = await (window as any).psemineAuthToken?.();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/psemine/withdrawals/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amountGbp: val,
          payoutAddress,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || 'Failed to submit withdrawal request');
      }

      toast.success('Withdrawal request submitted for admin review!');
      setAmountGbp('');
      setPayoutAddress('');
      fetchWithdrawals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to submit withdrawal: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PsemineLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Wallet className="text-[#00F2FE]" size={24} />
            <span>Mining Output Withdrawals</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Request withdrawal of accumulated mining output to your connected BEP-20 payout address.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-[#0B0E17] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Request Payout</h3>

            <form onSubmit={handleWithdrawalSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Amount (GBP)</label>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  placeholder="Min £10.00"
                  value={amountGbp}
                  onChange={(e) => setAmountGbp(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00F2FE]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">BEP-20 Payout Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={payoutAddress}
                  onChange={(e) => setPayoutAddress(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#00F2FE]"
                  required
                />
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-[11px] text-gray-400 space-y-1">
                <p className="flex items-center gap-1 text-cyan-300 font-semibold">
                  <ShieldCheck size={14} /> Security Protocol
                </p>
                <p>Requests undergo administrative fraud review before execution on BNB Smart Chain.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#00F2FE] hover:bg-[#00D2FF] text-[#080A11] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,242,254,0.2)]"
              >
                <span>Submit Payout Request</span>
                <ArrowRight size={14} />
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-[#0B0E17] border border-white/5 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Payout History</h3>

            {loading ? (
              <div className="text-center text-xs text-gray-400 py-6">Loading payout history...</div>
            ) : fetchError ? (
              <div className="text-center py-6 space-y-2">
                <AlertCircle size={24} className="text-red-400 mx-auto" />
                <p className="text-xs text-red-400">{fetchError}</p>
                <button
                  onClick={fetchWithdrawals}
                  className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white text-xs rounded-lg inline-flex items-center gap-1"
                >
                  <RefreshCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center text-xs text-gray-500 py-6">No withdrawal requests found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-gray-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Amount</th>
                      <th className="px-3 py-2">Payout Address</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-gray-300">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-white">£{w.amountGbp.toFixed(2)}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-400">
                          {w.payoutAddress ? `${w.payoutAddress.slice(0, 6)}...${w.payoutAddress.slice(-4)}` : 'N/A'}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              w.status === 'completed' || w.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : w.status === 'pending' || w.status === 'under_review' || w.status === 'processing'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-400">
                          {new Date(w.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </PsemineLayout>
  );
};

export default PsemineWithdrawals;
