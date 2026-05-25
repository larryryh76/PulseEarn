import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Hash
} from 'lucide-react';
import { cn } from '../../utils';
import { Timestamp } from 'firebase/firestore';

interface PredictionRecord {
  id: string;
  userId: string;
  assetId: string;
  symbol: string;
  direction: 'up' | 'down';
  amount: number;
  payout?: number;
  status: 'won' | 'lost' | 'PENDING';
  timestamp: Timestamp;
  entryPrice: number;
  exitPrice?: number;
  xpReward?: number;
  transactionReference?: string;
  claimId: string;
}

interface PredictionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  predictions: PredictionRecord[];
}

const PredictionHistoryDrawer: React.FC<PredictionHistoryDrawerProps> = ({ isOpen, onClose, predictions }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'PENDING' | 'RESOLVED'>('all');
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionRecord | null>(null);

  const filteredPredictions = predictions.filter(p => {
    // Only real records with required transactional ID
    if (!p.id || !p.claimId) return false;

    if (activeTab === 'all') return true;
    if (activeTab === 'RESOLVED') return p.status === 'won' || p.status === 'lost';
    return p.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-success bg-success/5 border-success/10';
      case 'lost': return 'text-danger bg-danger/5 border-danger/10';
      case 'PENDING': return 'text-primary bg-primary/5 border-primary/10';
      default: return 'text-white/20 bg-white/5 border-white/5';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[80]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 350 }}
            className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-black z-[90] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-10 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
               <div className="space-y-1">
                  <div className="flex items-center gap-3 text-primary">
                     <Target size={18} />
                     <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest">Forecasting Ledger</h2>
                  </div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">Transactional Audit Log</p>
               </div>
               <button onClick={onClose} className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                  <X size={24} />
               </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#020202]">
               {/* Tab Switcher */}
               <div className="flex px-10 border-b border-white/5 bg-black">
                  {['all', 'PENDING', 'RESOLVED'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab as any); setSelectedPrediction(null); }}
                      className={cn(
                        "px-6 py-6 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative",
                        activeTab === tab ? "text-primary" : "text-white/20 hover:text-white/40"
                      )}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div layoutId="histTabLine" className="absolute bottom-0 left-6 right-6 h-0.5 bg-primary shadow-[0_0_15px_rgba(0,102,255,0.6)]" />
                      )}
                    </button>
                  ))}
               </div>

               <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                  <div className="space-y-6">
                     <AnimatePresence mode="wait">
                        {selectedPrediction ? (
                          <motion.div
                            key="detail"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            className="space-y-10"
                          >
                             <button
                               onClick={() => setSelectedPrediction(null)}
                               className="flex items-center gap-3 text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors"
                             >
                                <ChevronRight size={16} className="rotate-180" /> Operational History
                             </button>

                             <div className="p-10 rounded-[2.5rem] border border-white/10 bg-white/[0.02] space-y-10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-[0.02]">
                                   <Target size={200} className="text-white" />
                                </div>

                                <div className="flex items-center justify-between relative z-10">
                                   <div className="space-y-1">
                                      <h3 className="text-3xl font-bold tracking-tight text-white uppercase">{selectedPrediction.symbol}/USDT</h3>
                                      <div className="flex items-center gap-3">
                                         <Hash size={12} className="text-white/20" />
                                         <p className="text-[11px] font-mono text-white/20 uppercase tracking-tighter">REF_{selectedPrediction.id.slice(0, 16)}</p>
                                      </div>
                                   </div>
                                   <div className={cn(
                                      "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.2em] border",
                                      getStatusColor(selectedPrediction.status)
                                   )}>
                                      {selectedPrediction.status}
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                   <div className="p-8 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-2">
                                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Entry Signal</span>
                                      <div className={cn(
                                         "flex items-center gap-2 text-2xl font-bold",
                                         selectedPrediction.direction === 'up' ? "text-success" : "text-danger"
                                      )}>
                                         {selectedPrediction.direction === 'up' ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                                         {selectedPrediction.direction.toUpperCase()}
                                      </div>
                                   </div>
                                   <div className="p-8 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-2">
                                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Entry Quote</span>
                                      <span className="text-2xl font-mono font-bold text-white">${selectedPrediction.entryPrice.toLocaleString()}</span>
                                   </div>
                                   <div className="p-8 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-2">
                                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Position Stake</span>
                                      <span className="text-2xl font-mono font-bold text-white">{selectedPrediction.amount.toLocaleString()} <span className="text-xs opacity-20">PTS</span></span>
                                   </div>
                                   <div className="p-8 bg-black/40 border border-white/5 rounded-2xl flex flex-col gap-2">
                                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Net Settlement</span>
                                      <span className={cn(
                                         "text-2xl font-mono font-bold",
                                         selectedPrediction.status === 'won' ? "text-success" : "text-white/40"
                                      )}>
                                         {selectedPrediction.status === 'won' ? `+${selectedPrediction.payout}` : selectedPrediction.status === 'lost' ? '0.00' : 'PENDING'}
                                      </span>
                                   </div>
                                </div>

                                {selectedPrediction.exitPrice && (
                                  <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between relative z-10">
                                     <div className="flex items-center gap-4">
                                        <Activity size={20} className="text-primary" />
                                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest">Oracle Resolution Price</span>
                                     </div>
                                     <span className="text-xl font-mono font-bold text-white">${selectedPrediction.exitPrice.toLocaleString()}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-10 border-t border-white/5 relative z-10">
                                   <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                         <Clock size={14} className="text-white/20" />
                                         <span className="text-[10px] font-mono text-white/40 uppercase">{selectedPrediction.timestamp.toDate().toLocaleString()}</span>
                                      </div>
                                      <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest ml-5">Validated Time Signal</p>
                                   </div>
                                   <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
                                      <ShieldCheck size={16} className="text-primary" />
                                      <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Atomic ID {selectedPrediction.claimId.slice(0, 8)}</span>
                                   </div>
                                </div>
                             </div>

                             {selectedPrediction.transactionReference && (
                               <div className="p-6 rounded-2xl bg-black border border-dashed border-white/10 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                     <Activity size={14} className="text-white/20" />
                                     <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ledger Reference</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-white/40">{selectedPrediction.transactionReference}</span>
                               </div>
                             )}
                          </motion.div>
                        ) : filteredPredictions.length === 0 ? (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-40 text-center"
                          >
                             <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-8 text-white/[0.05]">
                                <Target size={40} />
                             </div>
                             <p className="text-[11px] font-bold text-white/20 uppercase tracking-[0.5em]">No matching transactions</p>
                          </motion.div>
                        ) : (
                          <div className="space-y-4">
                             {filteredPredictions.map(pred => (
                               <div
                                 key={pred.id}
                                 onClick={() => setSelectedPrediction(pred)}
                                 className="group p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-primary/40 transition-all flex items-center justify-between cursor-pointer"
                               >
                                  <div className="flex items-center gap-6">
                                     <div className={cn(
                                        "w-14 h-14 rounded-xl border flex items-center justify-center transition-all group-hover:scale-105",
                                        pred.status === 'won' ? "border-success/20 text-success bg-success/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]" :
                                        pred.status === 'lost' ? "border-white/10 text-white/20 bg-white/5" :
                                        "border-primary/20 text-primary bg-primary/5 shadow-[0_0_15px_rgba(0,102,255,0.1)]"
                                     )}>
                                        {pred.direction === 'up' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                                     </div>
                                     <div>
                                        <div className="flex items-center gap-3">
                                           <h4 className="text-[16px] font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">{pred.symbol}/USDT</h4>
                                           <span className={cn(
                                              "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-white/5",
                                              pred.status === 'won' ? "text-success" : ""
                                           )}>
                                              {pred.status}
                                           </span>
                                        </div>
                                        <p className="text-[11px] font-mono text-white/20 mt-1">
                                           {pred.timestamp.toDate().toLocaleDateString()} • {pred.amount} PTS STAKE
                                        </p>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <div className={cn(
                                       "text-[18px] font-mono font-bold",
                                       pred.status === 'won' ? "text-success" : pred.status === 'lost' ? "text-white/20" : "text-white"
                                     )}>
                                        {pred.status === 'won' ? `+${pred.payout}` : pred.status === 'lost' ? '0' : pred.amount}
                                     </div>
                                     <div className="flex items-center justify-end gap-2 mt-1 text-[10px] font-bold uppercase tracking-widest text-white/10 group-hover:text-primary transition-colors">
                                        View Log <ChevronRight size={14} />
                                     </div>
                                  </div>
                               </div>
                             ))}
                          </div>
                        )}
                     </AnimatePresence>
                  </div>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PredictionHistoryDrawer;
