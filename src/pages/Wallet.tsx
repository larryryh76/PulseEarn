import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  RefreshCw,
  History,
  ShieldCheck,
  Zap,
  CreditCard,
  AlertCircle,
  X,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD, WITHDRAWAL_MIN_PTS } from '../utils/finance';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const { activities, loading } = useTasks();
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'WITHDRAW'>('LEDGER');
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto">
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse mb-12" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  const points = userData?.points || 0;
  const usdValue = PTS_TO_USD(points);
  const thresholdMet = points >= WITHDRAWAL_MIN_PTS;

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="data-label text-primary mb-2">Financial Operations</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Vault Terminal</h1>
          </motion.div>
        </header>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="system-card bg-gradient-to-br from-surface to-surface border-primary/20 mb-12 relative overflow-hidden group p-10 md:p-16"
        >
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] group-hover:bg-primary/15 transition-all duration-700" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                  <WalletIcon size={22} />
                </div>
                <span className="data-label text-primary">Aggregate Balance</span>
              </div>
              <div className="space-y-3">
                <p className="text-5xl md:text-7xl font-mono font-bold tracking-tighter text-white flex items-baseline gap-4">
                  {points.toLocaleString()}
                  <span className="text-sm font-bold text-primary uppercase tracking-[0.3em]">PTS</span>
                </p>
                <div className="flex items-center gap-4">
                   <p className="text-2xl md:text-3xl font-mono text-text-secondary">
                     &asymp; {formatUSD(usdValue)}
                   </p>
                   <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-text-secondary">
                      Live Conversion Rate
                   </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-8 mt-12">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className="text-success" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Quantum-Secured Vault</span>
                </div>
                <div className="flex items-center gap-3">
                  <RefreshCw size={16} className="text-primary animate-spin-slow" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">System Sync Active</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button className="system-card bg-white/[0.02] border-white/5 flex flex-col items-center justify-center p-8 hover:bg-white/[0.05] transition-all group/btn">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary mb-6 group-hover/btn:scale-110 transition-transform border border-primary/10">
                  <Zap size={24} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Acquire PTS</span>
              </button>
              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className={cn(
                  "system-card flex flex-col items-center justify-center p-8 transition-all group/btn",
                  thresholdMet
                    ? "bg-primary/20 border-primary/40 hover:bg-primary/30"
                    : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                )}
              >
                <div className={cn(
                   "p-4 rounded-2xl mb-6 group-hover/btn:scale-110 transition-transform border",
                   thresholdMet ? "bg-primary/20 text-white border-primary/40" : "bg-white/5 text-text-secondary border-white/10"
                )}>
                  <CreditCard size={24} />
                </div>
                <span className={cn(
                   "text-[11px] font-bold uppercase tracking-[0.2em]",
                   thresholdMet ? "text-white" : "text-text-secondary"
                )}>Initiate Payout</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content Tabs */}
        <div className="flex gap-12 mb-10 border-b border-white/5 relative">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={cn(
              "pb-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative",
              activeTab === 'LEDGER' ? "text-white" : "text-text-secondary hover:text-white"
            )}
          >
            Execution Ledger
            {activeTab === 'LEDGER' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,102,255,0.5)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('WITHDRAW')}
            className={cn(
              "pb-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative",
              activeTab === 'WITHDRAW' ? "text-white" : "text-text-secondary hover:text-white"
            )}
          >
            Settlement Parameters
            {activeTab === 'WITHDRAW' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(0,102,255,0.5)]" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'LEDGER' ? (
            <div className="space-y-2">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="ledger-row bg-white/[0.01] hover:bg-white/[0.03] transition-colors p-6 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "p-3 rounded-xl border",
                        activity.points > 0 ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20"
                      )}>
                        {activity.points > 0 ? <ArrowUpRight size={18} /> : <Zap size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/90">{activity.description}</p>
                        <p className="text-[10px] font-mono text-text-secondary uppercase mt-1.5 tracking-widest">
                          {activity.timestamp?.toDate().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                        <p className={cn(
                          "text-lg font-mono font-bold",
                          activity.points > 0 ? "text-success" : "text-white"
                        )}>
                          {activity.points > 0 ? '+' : ''}{activity.points.toLocaleString()} <span className="text-[10px] uppercase ml-1">PTS</span>
                        </p>
                        <p className="text-[10px] font-mono text-text-secondary uppercase tracking-tighter mt-1">
                          Value: {formatUSD(PTS_TO_USD(activity.points))}
                        </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-32 text-center border border-dashed border-white/5 rounded-[3rem] bg-black/20">
                  <History className="mx-auto text-white/5 mb-6" size={48} />
                  <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em]">Zero Ledger Signal Detected</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="system-card bg-black/40">
                <h3 className="mb-8 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-white/40">
                  <ShieldCheck size={18} className="text-primary" />
                  Compliance Layer
                </h3>
                <p className="text-xs mb-10 text-text-secondary leading-relaxed">Complete identification verification to authorize external payout signals and higher withdrawal bounds.</p>
                <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl mb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-1">Clearance Status</p>
                    <p className="text-sm font-bold text-white uppercase tracking-widest">Tier 0 (Unverified)</p>
                  </div>
                  <button className="px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-all">Verify Signals</button>
                </div>
              </section>
              <section className="system-card bg-black/40">
                <h3 className="mb-8 flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-white/40">
                  <RefreshCw size={18} className="text-primary" />
                  Settlement Directives
                </h3>
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Minimum Threshold</span>
                      <span className="font-mono text-sm text-white">{WITHDRAWAL_MIN_PTS.toLocaleString()} PTS ({formatUSD(PTS_TO_USD(WITHDRAWAL_MIN_PTS))})</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Latency Period</span>
                      <span className="font-mono text-sm text-white">24 - 48 CYCLES</span>
                   </div>
                   <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Network Protocol Fee</span>
                      <span className="font-mono text-sm text-success">0.00% SIGNAL</span>
                   </div>
                </div>
              </section>
            </div>
          )}
        </div>
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
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />

              <div className="flex justify-between items-start mb-10">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">Redeem Signal</h2>
                  <p className="text-[10px] text-primary uppercase tracking-[0.3em] font-bold">Payout Pipeline Initiation</p>
                </div>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="p-3 hover:bg-white/5 rounded-xl transition-all">
                  <X size={20} className="text-text-secondary" />
                </button>
              </div>

              {!thresholdMet ? (
                 <div className="p-8 bg-danger/5 border border-danger/10 rounded-[2rem] flex flex-col items-center text-center gap-6 mb-10">
                    <div className="p-4 rounded-2xl bg-danger/10 text-danger">
                       <AlertCircle size={32} />
                    </div>
                    <div>
                       <p className="text-lg font-bold text-white mb-2 tracking-tight">Threshold Not Met</p>
                       <p className="text-xs text-text-secondary leading-relaxed uppercase tracking-widest font-bold">
                          A minimum signal of {WITHDRAWAL_MIN_PTS.toLocaleString()} PTS is required <br/> to initiate external redemption.
                       </p>
                    </div>
                 </div>
              ) : (
                <div className="p-8 bg-warning/10 border border-warning/20 rounded-[2rem] flex gap-6 mb-10">
                  <AlertCircle className="text-warning shrink-0" size={28} />
                  <div>
                    <p className="text-sm font-bold text-warning mb-2 uppercase tracking-widest">Maintenance Signal</p>
                    <p className="text-xs text-warning/80 leading-relaxed font-medium">
                      The Redemption Engine is currently undergoing scheduled re-calibration.
                      Signals are temporarily suspended while we stabilize the payout pipelines.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-6 mb-12">
                 <div className="flex justify-between text-[11px] uppercase tracking-[0.2em] font-bold text-text-secondary">
                    <span>Available Signal</span>
                    <span className="text-white font-mono text-sm">{points.toLocaleString()} PTS</span>
                 </div>
                 <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((points / WITHDRAWAL_MIN_PTS) * 100, 100)}%` }}
                      className={cn("h-full", thresholdMet ? "bg-primary shadow-[0_0_15px_rgba(0,102,255,0.4)]" : "bg-white/20")}
                    />
                 </div>
                 <div className="flex justify-between items-center">
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
                       {thresholdMet ? 'Initiation Ready' : `${(WITHDRAWAL_MIN_PTS - points).toLocaleString()} PTS remaining`}
                    </p>
                    {thresholdMet && <span className="text-[10px] text-success font-bold uppercase tracking-widest">Authorized</span>}
                 </div>
              </div>

              <button
                disabled
                className="w-full py-6 bg-white/[0.02] border border-white/5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.3em] text-white/20 cursor-not-allowed flex items-center justify-center gap-3"
              >
                {thresholdMet ? 'Pipeline Suspended' : 'Insufficient Signal'}
                <ArrowRight size={16} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
};

export default Wallet;
