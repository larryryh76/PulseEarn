import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Target,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight
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
    if (activeTab === 'all') return true;
    if (activeTab === 'RESOLVED') return p.status === 'won' || p.status === 'lost';
    return p.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-success bg-success/5 border-success/10';
      case 'lost': return 'text-white/20 bg-white/5 border-white/5';
      case 'PENDING': return 'text-primary bg-primary/5 border-primary/10';
      default: return 'text-white/20 bg-white/5';
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
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-black z-[90] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
               <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest">Execution Ledger</h2>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">Operational Market History</p>
               </div>
               <button onClick={onClose} className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all">
                  <X size={20} />
               </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#020202]">
               {/* Tab Switcher */}
               <div className="flex px-8 border-b border-white/5 bg-black">
                  {['all', 'PENDING', 'RESOLVED'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab as any); setSelectedPrediction(null); }}
                      className={cn(
                        "px-4 py-5 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative",
                        activeTab === tab ? "text-primary" : "text-white/20 hover:text-white/40"
                      )}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div layoutId="histTabLine" className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary shadow-[0_0_8px_rgba(0,102,255,0.5)]" />
                      )}
                    </button>
                  ))}
               </div>

               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="space-y-4">
                     <AnimatePresence mode="wait">
                        {selectedPrediction ? (
                          <motion.div
                            key="detail"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                          >
                             <button
                               onClick={() => setSelectedPrediction(null)}
                               className="flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-widest hover:text-white transition-colors"
                             >
                                <ChevronRight size={14} className="rotate-180" /> Back to History
                             </button>

                             <div className="p-8 rounded-xl border border-white/10 bg-white/[0.02] space-y-8">
                                <div className="flex items-center justify-between">
                                   <div className="space-y-1">
                                      <h3 className="text-2xl font-bold tracking-tight text-white uppercase">{selectedPrediction.symbol}/USDT</h3>
                                      <p className="text-[10px] font-mono text-white/20 uppercase">Nonce: {selectedPrediction.id.slice(0, 16)}</p>
                                   </div>
                                   <div className={cn(
                                      "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                                      getStatusColor(selectedPrediction.status)
                                   )}>
                                      {selectedPrediction.status}
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                                   <div className="p-6 bg-black flex flex-col gap-1">
                                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Forecast</span>
                                      <div className={cn(
                                         "flex items-center gap-2 text-lg font-bold",
                                         selectedPrediction.direction === 'up' ? "text-success" : "text-danger"
                                      )}>
                                         {selectedPrediction.direction === 'up' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                         {selectedPrediction.direction.toUpperCase()}
                                      </div>
                                   </div>
                                   <div className="p-6 bg-black flex flex-col gap-1">
                                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Entry Price</span>
                                      <span className="text-lg font-mono font-bold text-white">${selectedPrediction.entryPrice.toLocaleString()}</span>
                                   </div>
                                   <div className="p-6 bg-black flex flex-col gap-1">
                                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Stake</span>
                                      <span className="text-lg font-mono font-bold text-white">{selectedPrediction.amount.toLocaleString()} <span className="text-[10px] opacity-20">PTS</span></span>
                                   </div>
                                   <div className="p-6 bg-black flex flex-col gap-1">
                                      <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Settlement</span>
                                      <span className={cn(
                                         "text-lg font-mono font-bold",
                                         selectedPrediction.status === 'won' ? "text-success" : "text-white/40"
                                      )}>
                                         {selectedPrediction.status === 'won' ? `+${selectedPrediction.payout}` : selectedPrediction.status === 'lost' ? '0' : 'PENDING'}
                                      </span>
                                   </div>
                                </div>

                                {selectedPrediction.exitPrice && (
                                  <div className="p-6 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                                        <Activity size={16} className="text-white/20" />
                                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Resolution Price</span>
                                     </div>
                                     <span className="text-sm font-mono font-bold text-white">${selectedPrediction.exitPrice.toLocaleString()}</span>
                                  </div>
                                )}

                                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                   <div className="flex items-center gap-2">
                                      <Clock size={14} className="text-white/20" />
                                      <span className="text-[10px] font-mono text-white/40 uppercase">{selectedPrediction.timestamp.toDate().toLocaleString()}</span>
                                   </div>
                                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                      <Zap size={12} className="text-primary" />
                                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Audit Verified</span>
                                   </div>
                                </div>
                             </div>
                          </motion.div>
                        ) : filteredPredictions.length === 0 ? (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-32 text-center"
                          >
                             <div className="w-16 h-16 rounded bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-6 text-white/[0.05]">
                                <Target size={32} />
                             </div>
                             <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">No matching records</p>
                          </motion.div>
                        ) : (
                          <div className="space-y-3">
                             {filteredPredictions.map(pred => (
                               <div
                                 key={pred.id}
                                 onClick={() => setSelectedPrediction(pred)}
                                 className="group p-6 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all flex items-center justify-between cursor-pointer"
                               >
                                  <div className="flex items-center gap-5">
                                     <div className={cn(
                                        "w-10 h-10 rounded border flex items-center justify-center transition-colors",
                                        pred.status === 'won' ? "border-success/20 text-success bg-success/5" :
                                        pred.status === 'lost' ? "border-white/10 text-white/20 bg-white/5" :
                                        "border-primary/20 text-primary bg-primary/5"
                                     )}>
                                        {pred.direction === 'up' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                     </div>
                                     <div>
                                        <div className="flex items-center gap-2">
                                           <h4 className="text-[14px] font-bold text-white uppercase tracking-tight">{pred.symbol}/USDT</h4>
                                           <span className={cn(
                                              "text-[9px] font-bold uppercase tracking-widest opacity-40",
                                              pred.status === 'won' ? "text-success" : ""
                                           )}>
                                              {pred.status}
                                           </span>
                                        </div>
                                        <p className="text-[10px] font-mono text-white/20 mt-1">
                                           {pred.timestamp.toDate().toLocaleDateString()} • {pred.amount} PTS STAKE
                                        </p>
                                     </div>
                                  </div>
                                  <div className="text-right">
                                     <div className={cn(
                                       "text-[14px] font-mono font-bold",
                                       pred.status === 'won' ? "text-success" : pred.status === 'lost' ? "text-white/20" : "text-white"
                                     )}>
                                        {pred.status === 'won' ? `+${pred.payout}` : pred.status === 'lost' ? '-0' : pred.amount}
                                     </div>
                                     <div className="text-[9px] font-bold uppercase tracking-widest text-white/10 group-hover:text-white/40 transition-colors mt-1">
                                        View Audit
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
