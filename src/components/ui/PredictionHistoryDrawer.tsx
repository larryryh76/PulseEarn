import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Target,
  Zap,
  BarChart3
} from 'lucide-react';
import { cn } from '../../utils';
import Card from './Card';
import { Timestamp } from 'firebase/firestore';

interface PredictionRecord {
  id: string;
  assetId: string;
  symbol: string;
  direction: 'up' | 'down';
  amount: number;
  payout: number;
  status: 'active' | 'won' | 'lost' | 'pending';
  timestamp: Timestamp;
  entryPrice: number;
  exitPrice?: number;
  xpEarned?: number;
}

interface PredictionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  predictions: PredictionRecord[];
}

const PredictionHistoryDrawer: React.FC<PredictionHistoryDrawerProps> = ({ isOpen, onClose, predictions }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'won' | 'lost'>('active');
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionRecord | null>(null);

  const filteredPredictions = predictions.filter(p => {
    if (activeTab === 'active') return p.status === 'active' || p.status === 'pending';
    if (activeTab === 'completed') return p.status === 'won' || p.status === 'lost';
    return p.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won': return 'text-success bg-success/10 border-success/20';
      case 'lost': return 'text-danger bg-danger/10 border-danger/20';
      case 'active': return 'text-primary bg-primary/10 border-primary/20';
      default: return 'text-white/40 bg-white/5 border-white/10';
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
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-12 bg-[#050507] z-[90] rounded-t-[2.5rem] border-t border-white/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/[0.05] flex items-center justify-between bg-[#0A0A0F]/50">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                     <Target size={20} className="text-primary" />
                  </div>
                  <div>
                     <h2 className="text-xl font-bold tracking-tight">Position History</h2>
                     <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Market Forecasting Records</p>
                  </div>
               </div>
               <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors">
                  <X size={20} />
               </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-0">
               {/* Tab Switcher */}
               <div className="flex px-6 border-b border-white/[0.03] bg-[#0A0A0F]/30">
                  {['active', 'completed', 'won', 'lost'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab as any); setSelectedPrediction(null); }}
                      className={cn(
                        "px-4 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative",
                        activeTab === tab ? "text-primary" : "text-white/20 hover:text-white/40"
                      )}
                    >
                      {tab}
                      {activeTab === tab && (
                        <motion.div layoutId="histTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                      )}
                    </button>
                  ))}
               </div>

               <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <div className="max-w-3xl mx-auto space-y-4">
                     <AnimatePresence mode="wait">
                        {selectedPrediction ? (
                          <motion.div
                            key="detail"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                          >
                             <button
                               onClick={() => setSelectedPrediction(null)}
                               className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                             >
                                <ChevronRight size={14} className="rotate-180" /> Back to List
                             </button>

                             <Card className="p-8 border-white/[0.08] bg-gradient-to-br from-[#0D0D12] to-[#161621] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                                   <BarChart3 size={120} />
                                </div>

                                <div className="flex items-center gap-6 mb-10 relative z-10">
                                   <div className="w-20 h-20 rounded-[2rem] bg-white/[0.03] border border-white/10 p-4 shadow-2xl flex items-center justify-center">
                                      <Target size={40} className="text-primary/40" />
                                   </div>
                                   <div>
                                      <h3 className="text-3xl font-bold tracking-tighter mb-1">{selectedPrediction.symbol.toUpperCase()}/USDT</h3>
                                      <div className={cn(
                                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                                        getStatusColor(selectedPrediction.status)
                                      )}>
                                         {selectedPrediction.status === 'won' ? <CheckCircle2 size={12} /> :
                                          selectedPrediction.status === 'lost' ? <AlertCircle size={12} /> :
                                          <Clock size={12} />}
                                         {selectedPrediction.status}
                                      </div>
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 relative z-10">
                                   <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] space-y-3">
                                      <div>
                                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Prediction</p>
                                         <div className={cn(
                                           "flex items-center gap-2 text-xl font-bold",
                                           selectedPrediction.direction === 'up' ? "text-success" : "text-danger"
                                         )}>
                                            {selectedPrediction.direction === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                            {selectedPrediction.direction.toUpperCase()}
                                         </div>
                                      </div>

                                      <div className="pt-3 border-t border-white/5">
                                         <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest mb-1.5">Confidence Level</p>
                                         <div className="flex gap-1">
                                            {[1,2,3,4,5].map(i => (
                                               <div key={i} className={cn("h-1 flex-1 rounded-full", i <= 4 ? "bg-primary" : "bg-white/10")} />
                                            ))}
                                         </div>
                                      </div>
                                   </div>
                                   <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Entry Price</p>
                                      <p className="text-xl font-mono font-bold text-white">${selectedPrediction.entryPrice.toLocaleString()}</p>
                                   </div>
                                   <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Stake</p>
                                      <p className="text-xl font-mono font-bold text-white">{selectedPrediction.amount.toLocaleString()} <span className="text-white/20 text-xs">PTS</span></p>
                                   </div>
                                   <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Potential Return</p>
                                      <p className={cn(
                                        "text-xl font-mono font-bold",
                                        selectedPrediction.status === 'won' ? "text-success" : "text-white"
                                      )}>{selectedPrediction.status === 'lost' ? '0' : selectedPrediction.payout.toLocaleString()} <span className="text-white/20 text-xs">PTS</span></p>
                                   </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-white/[0.05] flex justify-between items-center relative z-10">
                                   <div className="flex items-center gap-4">
                                      <div className="flex flex-col">
                                         <span className="text-[8px] font-bold text-white/10 uppercase tracking-widest">Expiring In</span>
                                         <span className="text-xs font-mono font-bold text-white/40">ROUND #42069</span>
                                      </div>
                                   </div>
                                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                                      <Zap size={12} className="text-primary" />
                                      <span className="text-[10px] font-bold text-primary uppercase">+{selectedPrediction.xpEarned || 50} XP</span>
                                   </div>
                                </div>
                             </Card>
                          </motion.div>
                        ) : filteredPredictions.length === 0 ? (
                          <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-20 text-center space-y-6"
                          >
                             <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-center mx-auto text-white/10">
                                <Target size={40} />
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-white/40 uppercase tracking-widest">No predictions found</h4>
                                <p className="text-[11px] text-white/20 mt-2 leading-relaxed">Your forecasting activity will appear here once you open positions.</p>
                             </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-3"
                          >
                             {filteredPredictions.map(pred => (
                               <div
                                 key={pred.id}
                                 onClick={() => setSelectedPrediction(pred)}
                                 className="group p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-primary/30 transition-all flex items-center justify-between cursor-pointer relative overflow-hidden"
                               >
                                  <div className="flex items-center gap-4 relative z-10">
                                     <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 p-2.5 flex items-center justify-center">
                                        <Target size={20} className="text-primary/40" />
                                     </div>
                                     <div>
                                        <div className="flex items-center gap-2">
                                           <h4 className="font-bold text-white tracking-tight uppercase">{pred.symbol}/USDT</h4>
                                           <div className={cn(
                                              "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border",
                                              getStatusColor(pred.status)
                                           )}>
                                              {pred.status}
                                           </div>
                                        </div>
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1 flex items-center gap-2">
                                           {pred.timestamp.toDate().toLocaleDateString()} •
                                           <span className={pred.direction === 'up' ? "text-success" : "text-danger"}>
                                              {pred.direction.toUpperCase()}
                                           </span>
                                        </p>
                                     </div>
                                  </div>
                                  <div className="text-right relative z-10">
                                     <p className={cn(
                                       "text-sm font-mono font-bold",
                                       pred.status === 'won' ? "text-success" : pred.status === 'lost' ? "text-white/20" : "text-white"
                                     )}>
                                        {pred.status === 'won' ? `+${pred.payout}` : pred.status === 'lost' ? `-${pred.amount}` : pred.amount} PTS
                                     </p>
                                     <div className="flex items-center justify-end gap-1 mt-1 text-white/20">
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Details</span>
                                        <ChevronRight size={12} />
                                     </div>
                                  </div>
                                  <div className="absolute inset-y-0 left-0 w-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                               </div>
                             ))}
                          </motion.div>
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
