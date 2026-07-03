import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactions } from '../hooks/useTransactions';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  CreditCard,
  X,
  History,
  Check,
  Zap,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import toast from 'react-hot-toast';
import { PTS_TO_USD, formatUSD, WITHDRAWAL_MIN_PTS } from '../utils/finance';
import { Transaction } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getWithdrawalEligibility } from '../utils/eligibility';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PointTransactionEngine } from '../engines/points/PointTransactionEngine';
import { mapTransactionType } from '../utils/transactionLabels';

const Wallet: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { transactions, loading } = useTransactions(50);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
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
  const eligibility = getWithdrawalEligibility(userData);
  const thresholdMet = points >= WITHDRAWAL_MIN_PTS;

  if (loading) return (
    <>
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
    </>
  );

  const validateAddress = (address: string, network: string) => {
    if (!address) return false;

    switch (network) {
      case 'ERC20':
      case 'BEP20':
      case 'POLYGON':
        // EVM: 0x followed by 40 hex chars [0-9a-fA-F]
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      case 'TRC20':
        // Tron: Starts with T, 34 chars (Base58: [1-9A-HJ-NP-Za-km-z])
        return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
      case 'SOLANA':
        // Solana: Base58, 32-44 chars
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      default:
        return address.length > 20;
    }
  };

  const handleWithdraw = async () => {
    if (!eligibility.eligible) return toast.error(`Ineligible: ${eligibility.reason}`);
    if (isProcessing || isCompleted) return;

    const normalizedAddress = withdrawalForm.walletAddress.trim();
    if (!normalizedAddress) return toast.error("Wallet address required");
    if (!validateAddress(normalizedAddress, withdrawalForm.network)) {
      return toast.error(`Invalid ${withdrawalForm.network} address format`);
    }

    if (withdrawalForm.amount < WITHDRAWAL_MIN_PTS) return toast.error(`Minimum withdrawal is ${WITHDRAWAL_MIN_PTS} PTS`);
    if (withdrawalForm.amount > points) return toast.error("Insufficient balance");

    setIsProcessing(true);
    const claimId = `wd_${userData?.uid}_${Date.now()}`;
    let withdrawalDocId = null;

    try {
      // 1. Create the withdrawal request first (Atomic Requirement)
      // This ensures we have a record before debiting
      const withdrawalRef = await addDoc(collection(db, 'withdrawals'), {
        userId: userData?.uid,
        userEmail: userData?.email,
        username: userData?.username,
        amountPoints: withdrawalForm.amount,
        amountUSD: PTS_TO_USD(withdrawalForm.amount),
        walletAddress: normalizedAddress,
        network: withdrawalForm.network,
        status: 'PENDING',
        claimId,
        createdAt: serverTimestamp()
      });
      withdrawalDocId = withdrawalRef.id;

      // 2. Debit the points
      const result = await PointTransactionEngine.execute({
        userId: userData?.uid || '',
        amount: -withdrawalForm.amount,
        type: 'withdrawal_debit',
        source: 'System Withdrawal',
        claimId,
        referenceId: withdrawalDocId,
        metadata: {
          walletAddress: normalizedAddress,
          network: withdrawalForm.network,
          withdrawalId: withdrawalDocId
        }
      });

      if (!result.success) {
        // Rollback attempt: Mark withdrawal as FAILED since debit didn't process
        try {
          await updateDoc(doc(db, 'withdrawals', withdrawalDocId), {
            status: 'FAILED',
            error: result.error,
            updatedAt: serverTimestamp()
          });
        } catch (rollbackErr) {
          console.error("[Wallet] Critical Rollback Failure:", rollbackErr);
        }
        throw new Error(result.error);
      }

      setIsCompleted(true);
      toast.success("Withdrawal request submitted");
    } catch (err: any) {
      console.error("[Wallet] Withdrawal Error:", err);
      toast.error(err.message || "Withdrawal failed");
      // TODO: Implement more robust rollback/retry logic for production
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="bg-background transition-colors duration-300">
      <div className="pt-24 md:pt-32 pb-32 md:pb-32 px-4 md:px-6 max-w-5xl mx-auto overflow-x-hidden">
        {/* ASSET INFRASTRUCTURE HEADER */}
        <section className="mb-8 md:mb-16">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-12">
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">Available Balance</span>
               </div>
               <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-text-primary leading-tight">
                  Wallet <span className="text-text-tertiary">Assets</span>
               </h1>
            </div>

            <div className="flex flex-wrap gap-4 w-full md:w-auto">
               <Button
                variant="primary"
                className="h-14 px-10 rounded-2xl w-full md:w-auto"
                onClick={() => setIsWithdrawModalOpen(true)}
               >
                  <CreditCard size={16} />
                  Request Settlement
               </Button>
            </div>
          </div>
        </section>

        {/* Issue 9 Fix: Withdrawal Requirement Discoverability */}
        {!eligibility.eligible && (
           <Card className="mb-8 p-6 bg-warning/5 border-warning/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
                    <ShieldCheck size={20} />
                 </div>
                 <div className="space-y-1">
                    <p className="text-xs font-bold text-text-primary uppercase tracking-tight italic">Withdrawal Roadmap</p>
                    <p className="text-[10px] text-text-tertiary font-bold uppercase tracking-widest">Complete requirements to unlock settlements</p>
                 </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                 {eligibility.requirements.map((req, i) => (
                    <div key={i} className={cn(
                       "px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all",
                       req.met ? "bg-success/10 border-success/20 text-success" : "bg-white/5 border-white/10 text-white/20"
                    )}>
                       {req.label.split('(')[0]}
                    </div>
                 ))}
              </div>
           </Card>
        )}

        {/* PRIMARY WALLET CARD */}
        <Card className="mb-8 md:mb-12 p-6 md:p-10 lg:p-12 bg-surface-bright/30 border-border rounded-[2rem] md:rounded-[3rem] relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none hidden sm:block">
              <Zap size={200} />
           </div>

           <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 md:gap-12 items-start lg:items-center">
              <div className="lg:col-span-7 space-y-2 w-full">
                 <p className="data-label">Available Balance</p>
                 <div className="flex flex-wrap items-baseline gap-2 sm:gap-4">
                    <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold text-text-primary tracking-tighter truncate">{(points || 0)?.toLocaleString()}</h2>
                    <span className="text-lg sm:text-xl font-mono text-primary font-bold">PTS</span>
                 </div>
                 <p className="text-lg sm:text-xl md:text-2xl text-text-secondary font-medium tracking-tight">
                    &asymp; {formatUSD(usdValue)} <span className="text-[9px] font-bold text-text-tertiary uppercase ml-2 tracking-widest">Market Value</span>
                 </p>
              </div>

              <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                 <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-background/40 border border-border">
                    <p className="data-label">Pending</p>
                    <div className="flex items-center gap-2">
                       <Clock size={14} className="text-text-tertiary" />
                       <span className="text-lg font-bold text-text-primary">0 <span className="text-[10px] text-text-tertiary font-mono uppercase">PTS</span></span>
                    </div>
                 </div>
                 <div className="p-4 sm:p-5 md:p-6 rounded-2xl bg-background/40 border border-border">
                    <p className="data-label">Lifetime</p>
                    <div className="flex items-center gap-2">
                       <TrendingUp size={14} className="text-success" />
                       <span className="text-lg font-bold text-text-primary truncate">{(userData?.stats?.totalEarnings || 0)?.toLocaleString()} <span className="text-[10px] text-text-tertiary font-mono uppercase">PTS</span></span>
                    </div>
                 </div>
              </div>
           </div>
        </Card>

        {/* THRESHOLD PROGRESS */}
        <Card variant="compact" className="mb-12 md:mb-16 p-6 md:p-8 border-dashed bg-transparent flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 border-border">
           <div className="flex items-center gap-4">
              <div className={cn(
                 "w-12 h-12 rounded-2xl flex items-center justify-center border",
                 thresholdMet ? "bg-primary/10 border-primary/20 text-primary" : "bg-surface-bright border-border text-text-tertiary"
              )}>
                 <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                 <p className="text-sm font-bold text-text-primary uppercase tracking-widest italic">{thresholdMet ? 'Threshold Secured' : 'Settlement Progress'}</p>
                 <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Target: 10,000 PTS</p>
              </div>
           </div>

           <div className="flex-grow max-w-md w-full space-y-3">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                 <span className="text-text-tertiary">Liquidity Ratio</span>
                 <span className="text-primary">{Math.min(Math.floor((points / WITHDRAWAL_MIN_PTS) * 100), 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-surface-bright rounded-full overflow-hidden p-0.5 border border-border">
                 <motion.div
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min((points / WITHDRAWAL_MIN_PTS) * 100, 100)}%` }}
                   className="h-full bg-primary shadow-[0_0_10px_rgba(0,112,255,0.4)] rounded-full"
                 />
              </div>
           </div>
        </Card>

        {/* TRANSACTION LEDGER */}
        <section className="space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-3">
              <Activity size={24} className="text-primary" />
              Activity Ledger
            </h2>
          </div>

          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} onClick={() => setSelectedTx(tx)} className="flex items-center justify-between p-4 sm:p-6 bg-surface border border-border rounded-2xl sm:rounded-[1.5rem] hover:bg-surface-bright transition-all group cursor-pointer overflow-hidden">
                  <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
                    <div className={cn(
                      "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border flex items-center justify-center transition-all shrink-0",
                      tx.amount > 0 ? "bg-success/5 text-success border-success/10" : "bg-surface-bright text-text-primary border-border group-hover:border-primary/30"
                    )}>
                      {tx.amount > 0 ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate">{mapTransactionType(tx.type)}</p>
                      <p className="text-[8px] sm:text-[10px] text-text-tertiary font-bold uppercase mt-1 tracking-[0.1em] truncate">
                        {(tx.timestamp?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) || "N/A")}
                      </p>
                      {/* Mobile-only yield display */}
                      <div className="sm:hidden mt-1.5 flex items-baseline gap-2">
                         <span className={cn("text-[10px] font-mono font-bold", tx.amount > 0 ? "text-success" : "text-white")}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                         </span>
                         <span className="text-[8px] text-text-tertiary font-bold uppercase tracking-widest">{formatUSD(PTS_TO_USD(tx.amount))}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3 sm:gap-6 shrink-0 ml-auto">
                    <div className="hidden sm:block">
                      <p className={cn(
                        "text-xs sm:text-sm font-bold font-mono tracking-tight",
                        tx.amount > 0 ? "text-success" : "text-text-primary"
                      )}>
                        {(tx.amount || 0) > 0 ? '+' : ''}{(tx.amount || 0)?.toLocaleString()}
                      </p>
                      <p className="text-[8px] sm:text-[10px] text-text-tertiary font-bold uppercase mt-1 tracking-widest">
                        {formatUSD(PTS_TO_USD(tx.amount))}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-surface-bright border border-border flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
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
              className="relative w-full max-w-lg system-modal p-6 md:p-12"
            >
              <div className="flex justify-between items-start mb-8 md:mb-12">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">System Action</p>
                  <h2 className="text-2xl font-bold tracking-tight">Initiate Settlement</h2>
                </div>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-3 bg-surface-bright hover:bg-surface-accent rounded-xl transition-all border border-border">
                  <X size={20} className="text-text-tertiary" />
                </button>
              </div>

              {!eligibility.eligible ? (
                 <div className="space-y-8 md:space-y-12">
                    <div className="p-6 md:p-10 rounded-[2rem] bg-surface-bright border border-border flex flex-col items-start gap-8">
                       <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                          <ShieldCheck size={32} />
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-xl font-black uppercase tracking-tight italic">Eligibility Audit</h3>
                          <p className="text-xs text-text-tertiary font-medium">Your account must meet the following criteria to enable secure withdrawals.</p>
                       </div>

                       <div className="w-full space-y-3">
                          {eligibility.requirements.map((req, i) => (
                             <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-border">
                                <div className="flex items-center gap-3">
                                   <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border", req.met ? "bg-success/20 border-success/30 text-success" : "bg-white/5 border-white/10 text-text-tertiary")}>
                                      {req.met ? <Check size={10} strokeWidth={4} /> : <div className="w-1 h-1 rounded-full bg-white/20" />}
                                   </div>
                                   <span className={cn("text-[10px] font-bold uppercase tracking-widest", req.met ? "text-text-primary" : "text-text-tertiary")}>{req.label}</span>
                                </div>
                                <span className="text-[10px] font-mono text-text-tertiary">{req.current} / {req.target}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                    <Button variant="outline" className="w-full h-16 rounded-[1.5rem] uppercase tracking-[0.3em] font-black text-[10px]" onClick={() => setIsWithdrawModalOpen(false)}>Acknowledge & Continue Earning</Button>
                 </div>
              ) : isCompleted ? (
                <div className="space-y-8 md:space-y-12 py-6">
                  <div className="p-6 md:p-10 rounded-[2rem] bg-success/[0.03] border border-success/10 flex flex-col items-center text-center gap-8">
                    <div className="w-20 h-20 rounded-[2rem] bg-success/10 border border-success/20 flex items-center justify-center text-success">
                       <Check size={40} />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-2xl font-bold text-text-primary">Request Submitted</h3>
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
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Withdrawal Amount (PTS)</label>
                      <input
                        type="number"
                        value={withdrawalForm.amount}
                        onChange={e => setWithdrawalForm({...withdrawalForm, amount: parseInt(e.target.value) || 0})}
                        className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-text-primary font-mono focus:border-primary/50 outline-none transition-all"
                      />
                      <div className="flex justify-between px-1">
                        <span className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold">Min: 10,000 PTS</span>
                        <span className="text-[10px] text-primary uppercase tracking-widest font-bold cursor-pointer" onClick={() => setWithdrawalForm({...withdrawalForm, amount: points})}>Max Balance</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Wallet Address</label>
                      <input
                        placeholder="0x... or Wallet ID"
                        value={withdrawalForm.walletAddress}
                        onChange={e => setWithdrawalForm({...withdrawalForm, walletAddress: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-text-primary font-mono text-sm focus:border-primary/50 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-text-primary/30 ml-1">Preferred Network</label>
                      <select
                        value={withdrawalForm.network}
                        onChange={e => setWithdrawalForm({...withdrawalForm, network: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-text-primary text-xs font-bold uppercase focus:border-primary/50 outline-none transition-all appearance-none cursor-pointer"
                      >
                        <option value="ERC20">Ethereum (ERC20)</option>
                        <option value="BEP20">Binance Smart Chain (BEP20)</option>
                        <option value="TRC20">TRON (TRC20)</option>
                        <option value="SOLANA">Solana</option>
                        <option value="POLYGON">Polygon</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-surface-bright border border-border space-y-3">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">USD Value</span>
                       <span className="text-sm font-mono font-bold text-text-primary">{formatUSD(PTS_TO_USD(withdrawalForm.amount))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Processing Fee</span>
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

      {/* TRANSACTION DETAIL OVERLAY */}
      <AnimatePresence>
        {selectedTx && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedTx(null)}
               className="absolute inset-0 bg-background/90 backdrop-blur-xl"
             />
             <motion.div
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="relative w-full max-w-lg bg-surface border border-border-bright rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
             >
                <div className="p-6 border-b border-border flex items-center justify-between bg-surface-bright/50">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                        <History size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary leading-none mb-1">Audit Ledger</p>
                        <h3 className="text-[10px] font-black text-text-primary uppercase tracking-[0.15em]">{selectedTx.type.replace(/_/g, ' ')}</h3>
                      </div>
                   </div>
                   <button onClick={() => setSelectedTx(null)} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                      <X size={18} />
                   </button>
                </div>

                <div className="p-8 space-y-8">
                   <div className="space-y-4 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2 text-text-tertiary mb-2">
                         <Clock size={12} className="text-primary/40" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">{selectedTx.timestamp?.toDate?.().toLocaleString()}</span>
                      </div>
                      <h2 className="text-2xl font-bold text-text-primary tracking-tight uppercase italic leading-tight">{selectedTx.source}</h2>
                      {selectedTx.description && <p className="text-sm text-text-tertiary">{selectedTx.description}</p>}
                   </div>

                   <div className="bg-surface-bright border border-border rounded-2xl overflow-hidden divide-y divide-white/5">
                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Inventory Change</span>
                         <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-xl font-mono font-bold", selectedTx.amount >= 0 ? "text-success" : "text-danger")}>
                               {selectedTx.amount > 0 ? '+' : ''}{selectedTx.amount.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">PTS</span>
                         </div>
                      </div>

                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">USD Offset</span>
                         <span className="text-xs font-mono font-bold text-text-primary">{formatUSD(PTS_TO_USD(selectedTx.amount))}</span>
                      </div>

                      <div className="p-5 flex justify-between items-center">
                         <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">Verification Status</span>
                         <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                            <span className="text-[10px] font-black text-text-primary uppercase tracking-widest italic">{selectedTx.status || 'COMPLETED'}</span>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-center px-1">
                         <span className="text-[9px] font-black text-text-tertiary/50 uppercase tracking-[0.3em]">Transaction Ref</span>
                         <span className="text-[9px] font-mono text-text-tertiary truncate max-w-[140px] uppercase">{selectedTx.id.slice(-12)}</span>
                      </div>

                      {(selectedTx.type.includes('prediction') || selectedTx.type.includes('task') || selectedTx.type.includes('referral')) && (
                        <Button
                           onClick={() => {
                              if (selectedTx.type.includes('prediction')) navigate('/predictions');
                              else if (selectedTx.type.includes('task')) navigate('/tasks');
                              else if (selectedTx.type.includes('referral')) navigate('/referrals');
                              setSelectedTx(null);
                           }}
                           variant="primary"
                           className="w-full h-14 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] group shadow-xl"
                        >
                           Go to Context <ArrowUp size={14} className="ml-2 group-hover:-translate-y-1 transition-transform" />
                        </Button>
                      )}
                   </div>
                </div>

                <div className="p-8 bg-background border-t border-border flex justify-center">
                   <p className="text-[8px] font-black text-text-tertiary/50 uppercase tracking-[0.6em]">PulseEarn Wallet System</p>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default Wallet;
