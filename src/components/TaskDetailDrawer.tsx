import React from 'react';
import {
  X, Zap, ShieldCheck, ChevronRight, ExternalLink,
  FileText, Link as LinkIcon, Info, Clock, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskClaim } from '../types';
import { cn } from '../utils';
import Button from './ui/Button';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  claim?: TaskClaim;
  onAction: () => Promise<void>;
  isSubmitting: boolean;
  proofValue: string;
  setProofValue: (val: string) => void;
}

const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  isOpen,
  onClose,
  task,
  claim,
  onAction,
  isSubmitting,
  proofValue,
  setProofValue
}) => {
  if (!task) return null;

  const isCompleted = claim?.validationState === 'APPROVED';
  const isPending = claim?.validationState === 'PENDING';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-xl bg-surface border-l border-border shadow-2xl flex flex-col h-full"
          >
            {/* HEADER */}
            <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-surface-bright/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                  <Zap size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold uppercase italic tracking-tighter text-text-primary leading-none">Task Briefing</h2>
                  <p className="text-[9px] font-mono text-text-tertiary uppercase tracking-widest mt-1.5 md:mt-2">UID: {task.id.slice(0, 12).toUpperCase()}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 md:space-y-12 no-scrollbar">
              <section className="space-y-6">
                <div className="p-6 md:p-8 rounded-3xl bg-surface-bright border border-border shadow-inner group">
                   <div className="flex items-center gap-3 mb-4 opacity-40 group-hover:opacity-100 transition-opacity">
                      <Info size={14} className="text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Description</span>
                   </div>
                   <h3 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight mb-4 uppercase italic leading-tight">{task.title}</h3>
                   <p className="text-sm text-text-tertiary leading-relaxed font-medium">
                      {task.description}
                   </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 md:p-6 rounded-2xl bg-surface-bright border border-border text-center shadow-inner">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-3">Reward Pool</p>
                      <div className="flex items-center justify-center gap-1.5">
                         <span className="text-xl md:text-2xl font-mono font-bold text-success">+{task.rewardAmount}</span>
                         <span className="text-[10px] font-black text-text-tertiary uppercase">PTS</span>
                      </div>
                   </div>
                   <div className="p-5 md:p-6 rounded-2xl bg-surface-bright border border-border text-center shadow-inner">
                      <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-3">Progression</p>
                      <div className="flex items-center justify-center gap-1.5">
                         <span className="text-xl md:text-2xl font-mono font-bold text-primary">+{task.xpReward}</span>
                         <span className="text-[10px] font-black text-text-tertiary uppercase">XP</span>
                      </div>
                   </div>
                </div>
              </section>

              <section className="space-y-8">
                <div className="flex items-center gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,112,255,0.5)]" />
                   <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">Execution Protocol</h4>
                </div>

                <div className="space-y-6">
                   {task.actionUrl && (
                      <a
                        href={task.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-primary text-text-primary p-6 rounded-2xl md:rounded-[2.5rem] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 group"
                      >
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                               <ExternalLink size={18} />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Open Objective</span>
                         </div>
                         <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </a>
                   )}

                   <div className="p-6 md:p-8 bg-surface-bright/50 border border-border rounded-[2rem] md:rounded-[3rem] space-y-8">
                      <div className="space-y-4">
                         <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Submission Data</label>
                            <span className="text-[8px] font-black uppercase bg-surface-bright border border-border px-2 py-0.5 rounded text-text-tertiary tracking-widest">{task.verificationType}</span>
                         </div>
                         <div className="bg-background/40 rounded-2xl border border-border overflow-hidden shadow-inner relative group">
                            {task.verificationType === 'link' ? (
                               <div className="flex items-center">
                                  <div className="w-12 h-14 flex items-center justify-center border-r border-border bg-surface-bright/50">
                                     <LinkIcon size={14} className="text-text-tertiary" />
                                  </div>
                                  <input
                                     type="url"
                                     value={proofValue}
                                     onChange={(e) => setProofValue(e.target.value)}
                                     placeholder="https://source.evidence/..."
                                     disabled={isCompleted || isPending}
                                     className="flex-1 bg-transparent border-0 px-5 py-4 text-xs font-mono font-bold text-text-primary focus:outline-none transition-all placeholder:text-text-tertiary/20"
                                  />
                               </div>
                            ) : (
                               <div className="relative">
                                  <div className="absolute left-5 top-5 opacity-20">
                                     <FileText size={14} />
                                  </div>
                                  <textarea
                                     value={proofValue}
                                     onChange={(e) => setProofValue(e.target.value)}
                                     placeholder={task.verificationType === 'proof' ? "Enter description of proof (Image upload disabled)" : (task.proofRequirements || "Enter required submission details...")}
                                     disabled={isCompleted || isPending}
                                     className="w-full bg-transparent border-0 pl-12 pr-6 py-5 text-xs font-medium text-text-primary focus:outline-none transition-all min-h-[100px] resize-none placeholder:text-text-tertiary/20"
                                  />
                               </div>
                            )}
                         </div>
                      </div>

                      <Button
                        onClick={onAction}
                        isLoading={isSubmitting}
                        disabled={!proofValue.trim() || isPending || isCompleted}
                        className={cn(
                           "w-full h-16 rounded-2xl font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl italic group",
                           isCompleted ? "bg-success/10 text-success border border-success/20 cursor-default" : ""
                        )}
                      >
                         {isCompleted ? (
                            <div className="flex items-center justify-center gap-2">
                               <CheckCircle2 size={16} /> Mission Secured
                            </div>
                         ) : isPending ? (
                            <div className="flex items-center justify-center gap-2">
                               <Clock size={16} className="animate-pulse" /> Audit Active
                            </div>
                         ) : (
                            <div className="flex items-center justify-center gap-2">
                               Authorize Completion
                               <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </div>
                         )}
                      </Button>
                   </div>
                </div>
              </section>

              <section className="pt-8 border-t border-border space-y-5">
                 <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-text-tertiary/40">
                    <ShieldCheck size={14} className="text-success/40" /> Verified Platform Action
                 </div>
                 <p className="text-[9px] text-text-tertiary/40 leading-relaxed font-medium uppercase tracking-wider">
                    By authorizing this completion, you confirm that the action has been performed in accordance with partner requirements and platform integrity protocols.
                 </p>
              </section>
            </div>

            {/* FOOTER */}
            <div className="p-8 border-t border-border bg-background/50 flex justify-center shrink-0">
               <p className="text-[9px] font-black text-text-tertiary/30 uppercase tracking-[0.6em]">PULSE REWARDS SYSTEM</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailDrawer;
