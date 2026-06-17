import React from 'react';
import {
  X, Zap, ShieldCheck, ChevronRight, ExternalLink,
  FileText, Link as LinkIcon, Clock, CheckCircle2
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
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col h-full overflow-hidden"
          >
            {/* COMPACT PREMIUM HEADER */}
            <div className="p-5 md:p-6 border-b border-border flex items-center justify-between bg-surface-bright/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase italic tracking-tight text-text-primary leading-none">Task Details</h2>
                  <p className="text-[8px] font-mono text-text-tertiary uppercase tracking-widest mt-1.5 opacity-50">Ref: {task.id.slice(0, 8)}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                <X size={18} />
              </button>
            </div>

            {/* HIGH-DENSITY CONTENT RAIL */}
            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-8 no-scrollbar">
              {/* REWARD SECTION (TOP HIERARCHY) */}
              <section className="grid grid-cols-2 gap-3">
                 <div className="p-4 rounded-2xl bg-surface-bright border border-border shadow-inner group">
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary mb-2 opacity-50 group-hover:opacity-100 transition-opacity">Reward Points</p>
                    <div className="flex items-baseline gap-1.5">
                       <span className="text-2xl font-mono font-bold text-success tabular-nums">{task.rewardAmount.toLocaleString()}</span>
                       <span className="text-[9px] font-black text-text-tertiary uppercase">PTS</span>
                    </div>
                 </div>
                 <div className="p-4 rounded-2xl bg-surface-bright border border-border shadow-inner group">
                    <p className="text-[8px] font-black uppercase tracking-widest text-text-tertiary mb-2 opacity-50 group-hover:opacity-100 transition-opacity">XP Bonus</p>
                    <div className="flex items-baseline gap-1.5">
                       <span className="text-2xl font-mono font-bold text-primary tabular-nums">{task.xpReward.toLocaleString()}</span>
                       <span className="text-[9px] font-black text-text-tertiary uppercase">XP</span>
                    </div>
                 </div>
              </section>

              {/* TASK INFORMATION */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <div className="w-1 h-1 rounded-full bg-primary" />
                   <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary">Task Information</h4>
                </div>
                <div className="p-6 rounded-2xl bg-surface-bright/50 border border-border shadow-inner space-y-3">
                   <h3 className="text-lg font-bold text-text-primary tracking-tight uppercase italic">{task.title}</h3>
                   <p className="text-xs text-text-tertiary leading-relaxed font-medium">
                      {task.description}
                   </p>
                </div>
              </section>

              {/* INSTRUCTIONS */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <div className="w-1 h-1 rounded-full bg-primary" />
                   <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary">Requirements</h4>
                </div>
                <div className="p-6 rounded-2xl bg-background/40 border border-dashed border-border-bright space-y-4">
                   <p className="text-xs text-text-secondary leading-relaxed font-medium italic">
                      "{task.instructions || 'Follow the steps below to complete this task and earn your reward.'}"
                   </p>

                   {task.actionUrl && !isCompleted && !isPending && (
                      <a
                        href={task.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-primary text-text-primary p-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/10 group"
                      >
                         <div className="flex items-center gap-3">
                            <ExternalLink size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.1em] italic">Open Task URL</span>
                         </div>
                         <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </a>
                   )}
                </div>
              </section>

              {/* SUBMISSION INTERFACE */}
              <section className="space-y-4 pb-8">
                 <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-text-tertiary">Proof of Completion</h4>
                 </div>

                 <div className="p-6 rounded-2xl bg-surface-bright/50 border border-border space-y-6 shadow-xl">
                    <div className="space-y-3">
                       <label className="text-[9px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1 flex justify-between">
                          <span>Evidence Log</span>
                          <span className="opacity-30 italic">{task.verificationType}</span>
                       </label>
                       <div className="bg-background/60 rounded-xl border border-border overflow-hidden shadow-inner relative group focus-within:border-primary/30 transition-colors">
                          {task.verificationType === 'link' ? (
                             <div className="flex items-center">
                                <div className="w-10 h-12 flex items-center justify-center border-r border-border bg-surface-bright/50">
                                   <LinkIcon size={14} className="text-text-tertiary" />
                                </div>
                                <input
                                   type="url"
                                   value={proofValue}
                                   onChange={(e) => setProofValue(e.target.value)}
                                   placeholder="Enter URL as proof..."
                                   disabled={isCompleted || isPending}
                                   className="flex-1 bg-transparent border-0 px-4 py-3 text-xs font-mono font-bold text-text-primary focus:outline-none transition-all placeholder:text-text-tertiary/10"
                                />
                             </div>
                          ) : (
                             <div className="relative">
                                <div className="absolute left-4 top-4 opacity-20 group-focus-within:opacity-40 transition-opacity">
                                   <FileText size={14} />
                                </div>
                                <textarea
                                   value={proofValue}
                                   onChange={(e) => setProofValue(e.target.value)}
                                   placeholder={task.verificationType === 'proof' ? "Describe your completed action (Image upload disabled)" : (task.proofRequirements || "Submit required task data...")}
                                   disabled={isCompleted || isPending}
                                   className="w-full bg-transparent border-0 pl-11 pr-5 py-4 text-xs font-medium text-text-primary focus:outline-none transition-all min-h-[90px] resize-none placeholder:text-text-tertiary/10"
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
                         "w-full h-14 rounded-xl font-black uppercase tracking-[0.2em] text-[9px] shadow-2xl italic group transition-all",
                         isCompleted ? "bg-success/10 text-success border border-success/20 cursor-default" :
                         isPending ? "bg-warning/10 text-warning border border-warning/20" : ""
                      )}
                    >
                       {isCompleted ? (
                          <div className="flex items-center justify-center gap-2">
                             <CheckCircle2 size={14} /> Task Completed
                          </div>
                       ) : isPending ? (
                          <div className="flex items-center justify-center gap-2">
                             <Clock size={14} className="animate-pulse" /> Under Review
                          </div>
                       ) : (
                          <div className="flex items-center justify-center gap-2 group-hover:scale-105 transition-transform">
                             Verify Task
                             <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                       )}
                    </Button>
                 </div>
              </section>
            </div>

            {/* COMPACT FOOTER */}
            <div className="p-4 border-t border-border bg-background/80 backdrop-blur-md flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 text-[8px] font-black text-text-tertiary/40 uppercase tracking-widest">
                  <ShieldCheck size={12} className="text-success/20" /> Integrity Enforced
               </div>
               <p className="text-[8px] font-black text-text-tertiary/20 uppercase tracking-[0.4em]">PULSE_EARN</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TaskDetailDrawer;
