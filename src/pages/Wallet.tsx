import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  X,
  History,
  Check,
  Zap,
  ChevronRight,
  TrendingUp,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { PTS_TO_USD, formatUSD, WITHDRAWAL_MIN_PTS } from '../utils/finance';
import { Transaction } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const { transactions, loading } = useTransactions(50);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: WITHDRAWAL_MIN_PTS,
    walletAddress: '',
    network: 'ERC20'
  });

  const points = userData?.points || 0;
  const usdValue = PTS_TO_USD(points);
  const thresholdMet = points >= WITHDRAWAL_MIN_PTS;

  const mapTransactionType = (type: Transaction['type']) => {
    switch (type) {
      case 'daily_reward': return 'Reward Received';
      case 'task_reward': return 'Task Reward';
      case 'referral_bonus': return 'Referral Bonus';
      case 'prediction_reward': return 'Prediction Reward';
      case 'prediction_entry': return 'Prediction Stake';
      case 'withdrawal_debit': return 'Withdrawal';
      case 'admin_adjustment': return 'Admin Adjustment';
      default: return 'Transaction';
    }
  };

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-5xl mx-auto space-y-12">
        <div className="h-48 bg-surface rounded-[2.5rem] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="h-32 bg-surface rounded-[2rem] animate-pulse" />
           <div className="h-32 bg-surface rounded-[2rem] animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  const handleWithdraw = async () => {
    if (!thresholdMet || isProcessing || isCompleted) return;
    if (!withdrawalForm.walletAddress) return toast.error("Wallet address required");
    if (withdrawalForm.amount < WITHDRAWAL_MIN_PTS) return toast.error(`Minimum withdrawal is ${WITHDRAWAL_MIN_PTS} PTS`);
    if (withdrawalForm.amount > points) return toast.error("Insufficient balance");

    setIsProcessing(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../firebase/config');
      const { PointTransactionEngine } = await import('../engines/points/PointTransactionEngine');

      const claimId = `wd_${userData?.uid}_${Date.now()}`;

      // 1. Log the debit in transactions
      const result = await PointTransactionEngine.execute({
        userId: userData?.uid || '',
        amount: -withdrawalForm.amount,
        type: 'withdrawal_debit',
        source: 'System Withdrawal',
        claimId,
        metadata: {
          walletAddress: withdrawalForm.walletAddress,
          network: withdrawalForm.network
        }
      });

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      // 2. Create the withdrawal request for admin review
      await addDoc(collection(db, 'withdrawals'), {
        userId: userData?.uid,
        userEmail: userData?.email,
        username: userData?.username,
        amountPoints: withdrawalForm.amount,
        amountUSD: PTS_TO_USD(withdrawalForm.amount),
        walletAddress: withdrawalForm.walletAddress,
        network: withdrawalForm.network,
        status: 'PENDING',
        transactionReference: result.txId,
        claimId,
        createdAt: serverTimestamp()
      });

      setIsCompleted(true);
      toast.success("Withdrawal request submitted");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Withdrawal failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-5xl mx-auto">
        {/* ASSET INFRASTRUCTURE HEADER */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12">
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Verified Assets</span>
               </div>
               <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
                  Economic <span className="text-text-tertiary">Inventory</span>
               </h1>
            </div>

            <div className="flex flex-wrap gap-4">
               <Button
                variant="primary"
                className="h-14 px-10 rounded-2xl"
                onClick={() => setIsWithdrawModalOpen(true)}
               >
                  <CreditCard size={16} />
                  Request Settlement
               </Button>
            </div>
          </div>
        </section>

        {/* PRIMARY WALLET CARD */}
        <Card className="mb-12 p-12 bg-surface-bright/30 border-white/5 rounded-[3rem] relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-5">
              <Zap size={200} />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-2">
                 <p className="data-label">Available Balance</p>
                 <div className="flex items-baseline gap-4">
                    <h2 className="text-6xl md:text-7xl font-bold text-white tracking-tighter">{(points || 0)?.toLocaleString()}</h2>
                    <span className="text-xl font-mono text-primary font-bold">PTS</span>
                 </div>
                 <p className="text-2xl text-text-secondary font-medium tracking-tight">
                    &asymp; {formatUSD(usdValue)} <span className="text-[10px] font-bold text-text-tertiary uppercase ml-2 tracking-widest">Market Value</span>
                 </p>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="p-6 rounded-2xl bg-background/40 border border-white/5">
                    <p className="data-label">Pending</p>
                    <div className="flex items-center gap-2">
                       <Clock size={14} className="text-text-tertiary" />
                       <span className="text-lg font-bold text-white">0 <span className="text-[10px] text-text-tertiary font-mono uppercase">PTS</span></span>
                    </div>
                 </div>
                 <div className="p-6 rounded-2xl bg-background/40 border border-white/5">
                    <p className="data-label">Total Earned</p>
                    <div className="flex items-center gap-2">
                       <TrendingUp size={14} className="text-success" />
                       <span className="text-lg font-bold text-white">{(points || 0)?.toLocaleString()} <span className="text-[10px] text-text-tertiary font-mono uppercase">PTS</span></span>
                    </div>
                 </div>
              </div>
           </div>
        </Card>

        {/* THRESHOLD PROGRESS */}
        <Card variant="compact" className="mb-16 p-8 border-dashed bg-transparent flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-4">
              <div className={cn(
                 "w-12 h-12 rounded-2xl flex items-center justify-center border",
                 thresholdMet ? "bg-success/5 border-success/20 text-success" : "bg-white/5 border-white/5 text-text-tertiary"
              )}>
                 <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                 <p className="text-sm font-bold text-white">{thresholdMet ? 'Settlement Ready' : 'Processing Threshold'}</p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Minimum 10,000 PTS Required</p>
              </div>
           </div>

           <div className="flex-grow max-w-md w-full space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                 <span className="text-text-tertiary">Progress to payout</span>
                 <span className="text-white">{Math.min(Math.floor((points / WITHDRAWAL_MIN_PTS) * 100), 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                 <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min((points / WITHDRAWAL_MIN_PTS) * 100, 100)}%` }}
                   className={cn("h-full", thresholdMet ? "bg-success" : "bg-primary")}
                 />
              </div>
           </div>
        </Card>

        {/* TRANSACTION LEDGER */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Activity size={24} className="text-primary" />
              Activity Ledger
            </h2>
          </div>

          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="ledger-row group">
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl border flex items-center justify-center transition-all",
                      tx.amount > 0 ? "bg-success/5 text-success border-success/10" : "bg-surface-bright text-white border-border group-hover:border-primary/30"
                    )}>
                      {tx.amount > 0 ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{mapTransactionType(tx.type)}</p>
                      <p className="text-[10px] text-text-tertiary font-bold uppercase mt-1 tracking-[0.1em]">
                        {(tx.timestamp?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || "N/A")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div>
                      <p className={cn(
                        "text-sm font-bold font-mono tracking-tight",
                        tx.amount > 0 ? "text-success" : "text-white"
                      )}>
                        {(tx.amount || 0) > 0 ? '+' : ''}{(tx.amount || 0)?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-text-tertiary font-bold uppercase mt-1 tracking-widest">
                        {formatUSD(PTS_TO_USD(tx.amount))}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-surface-bright border border-border flex items-center justify-center text-text-tertiary">
                       <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-24 text-center border border-dashed border-border rounded-[2.5rem] bg-surface/20">
                <div className="w-16 h-16 bg-surface border border-border rounded-[1.25rem] flex items-center justify-center mx-auto mb-6">
                  <History className="text-text-tertiary" size={24} />
                </div>
                <p className="text-xs font-bold text-text-tertiary uppercase tracking-[0.2em]">Transaction Registry Empty</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* WITHDRAWAL SYSTEM MODAL */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute inset-0 bg-background/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg system-modal p-12"
            >
              <div className="flex justify-between items-start mb-12">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">System Action</p>
                  <h2 className="text-2xl font-bold tracking-tight">Initiate Settlement</h2>
                </div>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                  <X size={20} className="text-text-tertiary" />
                </button>
              </div>

              {!thresholdMet ? (
                 <div className="space-y-12">
                    <div className="p-10 rounded-[2rem] bg-danger/[0.03] border border-danger/10 flex flex-col items-center text-center gap-6">
                       <div className="w-16 h-16 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center text-danger">
                          <AlertCircle size={32} />
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-xl font-bold">Policy Restriction</h3>
                          <p className="text-sm text-text-secondary leading-relaxed font-medium">
                            Withdrawal operations are restricted until the inventory floor of <span className="text-white font-bold">{(WITHDRAWAL_MIN_PTS || 0)?.toLocaleString()} PTS</span> is verified.
                          </p>
                       </div>
                    </div>
                    <Button variant="outline" className="w-full h-16 rounded-[1.5rem]" onClick={() => setIsWithdrawModalOpen(false)}>Acknowledged</Button>
                 </div>
              ) : isCompleted ? (
                <div className="space-y-12 py-6">
                  <div className="p-10 rounded-[2rem] bg-success/[0.03] border border-success/10 flex flex-col items-center text-center gap-8">
                    <div className="w-20 h-20 rounded-[2rem] bg-success/10 border border-success/20 flex items-center justify-center text-success">
                       <Check size={40} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold text-white">Request Submitted</h3>
                       <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-[0.2em] leading-relaxed">
                          Your settlement request has been queued for verification. <br/> Funds will be released upon manual audit.
                       </p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full h-16 rounded-[1.5rem]" onClick={() => setIsWithdrawModalOpen(false)}>Return to Wallet</Button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Withdrawal Amount (PTS)</label>
                      <input
                        type="number"
                        value={withdrawalForm.amount}
                        onChange={e => setWithdrawalForm({...withdrawalForm, amount: parseInt(e.target.value) || 0})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-mono focus:border-primary/50 outline-none transition-all"
                      />
                      <div className="flex justify-between px-1">
                        <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Min: 10,000 PTS</span>
                        <span className="text-[10px] text-primary uppercase tracking-widest font-bold cursor-pointer" onClick={() => setWithdrawalForm({...withdrawalForm, amount: points})}>Max Balance</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Wallet Address</label>
                      <input
                        placeholder="0x... or Wallet ID"
                        value={withdrawalForm.walletAddress}
                        onChange={e => setWithdrawalForm({...withdrawalForm, walletAddress: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-mono text-sm focus:border-primary/50 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Preferred Network</label>
                      <select
                        value={withdrawalForm.network}
                        onChange={e => setWithdrawalForm({...withdrawalForm, network: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xs font-bold uppercase focus:border-primary/50 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="ERC20">Ethereum (ERC20)</option>
                        <option value="BEP20">Binance Smart Chain (BEP20)</option>
                        <option value="TRC20">TRON (TRC20)</option>
                        <option value="SOLANA">Solana</option>
                        <option value="POLYGON">Polygon</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">USD Value</span>
                       <span className="text-sm font-mono font-bold text-white">{formatUSD(PTS_TO_USD(withdrawalForm.amount))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Processing Fee</span>
                       <span className="text-sm font-mono font-bold text-success">FREE</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full h-16 rounded-[1.5rem]"
                    onClick={handleWithdraw}
                    isLoading={isProcessing}
                    disabled={withdrawalForm.amount < WITHDRAWAL_MIN_PTS || !withdrawalForm.walletAddress}
                  >
                    Confirm & Submit Request
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Wallet;
