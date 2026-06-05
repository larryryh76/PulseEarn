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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD, WITHDRAWAL_MIN_PTS } from '../utils/finance';
import { Transaction } from '../types';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const { transactions, loading } = useTransactions(50);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

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
      <div className="pt-32 px-6 max-w-4xl mx-auto">
        <div className="h-48 bg-white/5 rounded-3xl animate-pulse mb-12" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  const handleWithdraw = async () => {
    if (!thresholdMet || isProcessing || isCompleted) return;

    setIsProcessing(true);
    try {
      // Simulate submission for high-fidelity UI
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsCompleted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-4xl mx-auto">
        {/* Available Balance Section */}
        <section className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-6"
          >
            <ShieldCheck size={12} />
            Verified Balance
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-7xl font-bold tracking-tighter mb-4"
          >
            {points.toLocaleString()} <span className="text-2xl text-text-secondary">PTS</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl text-text-secondary font-medium"
          >
            &asymp; {formatUSD(usdValue)}
          </motion.p>
        </section>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Pending Rewards</p>
                <p className="text-xl font-bold">0 PTS</p>
              </div>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 text-success rounded-2xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-0.5">Withdrawal Status</p>
                <p className="text-xl font-bold">{thresholdMet ? 'Eligible' : 'Pending Threshold'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsWithdrawModalOpen(true)}
          className={cn(
            "w-full py-6 rounded-[2rem] text-sm font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 mb-20",
            thresholdMet
              ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
              : "bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10"
          )}
        >
          <CreditCard size={18} />
          Request Payout
        </button>

        {/* Transaction History */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-3">
              <History size={20} className="text-primary" />
              Account Activity
            </h2>
          </div>

          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="group bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 p-5 rounded-2xl flex items-center justify-between transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl border transition-colors",
                      tx.amount > 0 ? "bg-success/5 text-success border-success/10" : "bg-white/5 text-white border-white/10"
                    )}>
                      {tx.amount > 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{mapTransactionType(tx.type)}</p>
                      <p className="text-[10px] text-text-secondary font-medium uppercase mt-1 tracking-wider">
                        {tx.timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold font-mono",
                      tx.amount > 0 ? "text-success" : "text-white"
                    )}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-text-secondary font-bold uppercase mt-1 tracking-tighter">
                      {formatUSD(PTS_TO_USD(tx.amount))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center border border-dashed border-white/5 rounded-[3rem] bg-black/20">
                <div className="p-4 bg-white/5 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                  <History className="text-white/20" size={24} />
                </div>
                <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em]">No transactions recorded</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-surface border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">Request Payout</h2>
                  <p className="text-[10px] text-primary uppercase tracking-[0.3em] font-bold">Standard Withdrawal</p>
                </div>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-3 hover:bg-white/5 rounded-xl transition-all">
                  <X size={20} className="text-text-secondary" />
                </button>
              </div>

              {!thresholdMet ? (
                 <div className="flex flex-col items-center text-center py-8">
                    <div className="p-6 rounded-3xl bg-white/5 text-text-secondary mb-8 border border-white/5">
                       <AlertCircle size={40} />
                    </div>
                    <h3 className="text-lg font-bold mb-3">Withdrawal Unavailable</h3>
                    <p className="text-sm text-text-secondary leading-relaxed mb-10">
                      Withdrawal unavailable until minimum balance requirement of <span className="text-white font-bold">{WITHDRAWAL_MIN_PTS.toLocaleString()} PTS</span> is reached.
                    </p>
                    <div className="w-full space-y-4 mb-8">
                       <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-text-secondary">Withdrawal Eligibility</span>
                          <span className="text-white">{Math.floor((points / WITHDRAWAL_MIN_PTS) * 100)}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((points / WITHDRAWAL_MIN_PTS) * 100, 100)}%` }}
                            className="h-full bg-primary"
                          />
                       </div>
                    </div>
                 </div>
              ) : isCompleted ? (
                <div className="py-8">
                  <div className="p-8 bg-success/5 border border-success/10 rounded-[2rem] flex flex-col items-center text-center gap-6 mb-10">
                    <div className="p-4 rounded-2xl bg-success/10 text-success">
                       <Check size={32} />
                    </div>
                    <div>
                       <p className="text-lg font-bold text-white mb-2 tracking-tight">Request Submitted</p>
                       <p className="text-xs text-text-secondary leading-relaxed uppercase tracking-widest font-bold">
                          Withdrawal request submitted successfully. <br/> Your funds are being processed.
                       </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8">
                  <div className="p-8 bg-primary/5 border border-primary/10 rounded-[2rem] flex flex-col items-center text-center gap-6 mb-10">
                    <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                       <CreditCard size={32} />
                    </div>
                    <div>
                       <p className="text-lg font-bold text-white mb-2 tracking-tight">Eligibility Confirmed</p>
                       <p className="text-xs text-text-secondary leading-relaxed uppercase tracking-widest font-bold">
                          You are eligible to withdraw your balance.
                       </p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-10">
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Withdrawal Amount</span>
                      <span className="font-mono text-sm text-white">{points.toLocaleString()} PTS</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-white/5">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Processing Fee</span>
                      <span className="font-mono text-sm text-success">FREE</span>
                    </div>
                  </div>
                </div>
              )}

              {!isCompleted && (
                <button
                  onClick={handleWithdraw}
                  disabled={!thresholdMet || isProcessing}
                  className={cn(
                    "w-full py-6 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all",
                    thresholdMet ? "bg-primary text-white" : "bg-white/[0.02] border border-white/5 text-white/20 cursor-not-allowed"
                  )}
                >
                  {isProcessing ? 'Processing...' : thresholdMet ? 'Confirm Withdrawal' : 'Insufficient Balance'}
                </button>
              )}

              {isCompleted && (
                <button
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="w-full py-6 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] bg-white/5 text-white hover:bg-white/10 transition-all"
                >
                  Close Window
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Wallet;
