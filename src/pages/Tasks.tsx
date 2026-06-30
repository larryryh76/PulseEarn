import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Target, Zap, Shield, ChevronRight, Search, X, FileText, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { auth } from '../firebase/config';
import { Task } from '../types';

const Tasks: React.FC = () => {
  const { tasks, loading } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [proof, setProof] = useState('');

  // Reset proof when modal closes
  const closeTaskModal = () => {
    setSelectedTask(null);
    setProof('');
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;
    if (selectedTask.verificationType !== 'automated' && !proof.trim()) {
        return toast.error("Please provide proof of completion.");
    }

    setIsSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId: selectedTask.id, proof: proof || 'AUTOMATED_VALIDATION' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.automated ? 'Task Completed!' : 'Submitted for Review');
        setSelectedTask(null);
        setProof('');
      } else {
        toast.error(data.error || 'Submission failed');
      }
    } catch (err) {
      toast.error('System error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="pt-32 px-6 text-center animate-pulse uppercase font-black text-xs tracking-widest text-text-tertiary">Synchronizing Secure Tasks...</div>;

  return (
    <div className="pt-24 md:pt-32 pb-24 px-4 md:px-6 max-w-5xl mx-auto space-y-12">
      <header className="space-y-4">
        <div className="flex items-center gap-2">
           <Shield size={14} className="text-primary" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Mission Authority v6</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-text-primary tracking-tighter uppercase italic">Quests</h1>
        <div className="relative max-w-md">
           <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary" />
           <input
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
             placeholder="Search available objectives..."
             className="w-full bg-surface border border-border rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-primary/50 outline-none transition-all"
           />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).map(task => (
           <motion.div
             key={task.id}
             whileHover={{ x: 4 }}
             onClick={() => setSelectedTask(task)}
             className="p-4 md:p-6 rounded-2xl bg-surface border border-border hover:border-primary/20 transition-all flex items-center justify-between group cursor-pointer"
           >
              <div className="flex items-center gap-4 md:gap-6 min-w-0">
                 <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-primary shrink-0 shadow-inner group-hover:border-primary/30 transition-all">
                    <Target size={18} className="md:w-6 md:h-6" />
                 </div>
                 <div className="min-w-0">
                    <h3 className="text-sm md:text-lg font-bold text-text-primary uppercase italic truncate md:whitespace-normal md:line-clamp-1 group-hover:text-primary transition-colors pr-2">{task.title}</h3>
                    <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-1.5">
                       <div className="flex items-center gap-1">
                          <Zap size={10} className="md:w-3 md:h-3 text-primary" />
                          <span className="text-[10px] md:text-xs font-mono font-bold text-text-secondary">+{task.rewardAmount}</span>
                       </div>
                       <div className="w-1 h-1 rounded-full bg-border" />
                       <span className="text-[8px] md:text-[9px] font-black text-text-tertiary uppercase tracking-widest">{task.verificationType}</span>
                    </div>
                 </div>
              </div>

              <div className="flex items-center gap-2 md:gap-4 shrink-0">
                 <button
                    className="h-8 md:h-10 px-4 md:px-6 rounded-lg bg-surface-bright border border-border text-[8px] md:text-[9px] font-black uppercase tracking-widest text-text-primary lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-all"
                 >
                    Execute
                 </button>
                 <ChevronRight size={16} className="text-text-tertiary group-hover:translate-x-1 transition-transform lg:group-hover:hidden" />
              </div>
           </motion.div>
        ))}
      </div>

      {/* Task Submission Modal */}
      <AnimatePresence>
        {selectedTask && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => { if(!isSubmitting) closeTaskModal(); }}
                    className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-lg bg-surface border border-border-bright rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                >
                    <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-surface-bright/50">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
                                <Target size={24} />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-text-primary uppercase italic leading-none mb-1">Mission Intel</h2>
                                <p className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">{selectedTask.verificationType} verification</p>
                            </div>
                        </div>
                        <button
                            disabled={isSubmitting}
                            onClick={closeTaskModal}
                            className="p-2 hover:bg-surface-bright rounded-xl transition-all text-text-tertiary"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        <div className="space-y-4">
                            <h3 className="text-2xl font-bold text-text-primary uppercase italic tracking-tighter leading-tight">{selectedTask.title}</h3>
                            <p className="text-sm text-text-secondary leading-relaxed font-medium">
                                {selectedTask.description || "Follow the system instructions to complete this objective and secure your PTS reward."}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl bg-surface-bright border border-border group hover:border-primary/20 transition-all">
                                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-2">Bounty</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-mono font-bold text-success">+{selectedTask.rewardAmount.toLocaleString()}</span>
                                    <span className="text-[9px] font-black text-text-tertiary uppercase">PTS</span>
                                </div>
                            </div>
                            <div className="p-5 rounded-2xl bg-surface-bright border border-border group hover:border-primary/20 transition-all">
                                <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary mb-2">Bonus</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-mono font-bold text-primary">+{selectedTask.xpReward.toLocaleString()}</span>
                                    <span className="text-[9px] font-black text-text-tertiary uppercase">XP</span>
                                </div>
                            </div>
                        </div>

                        {selectedTask.verificationType !== 'automated' && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <FileText size={14} className="text-primary" />
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary">Proof of Execution</label>
                                </div>
                                <textarea
                                    value={proof}
                                    onChange={e => setProof(e.target.value)}
                                    placeholder="Enter URL, username, or details as proof..."
                                    className="w-full h-32 bg-surface-bright border border-border-bright rounded-2xl p-5 text-sm focus:border-primary/50 outline-none transition-all resize-none shadow-inner"
                                />
                            </div>
                        )}

                        <div className="pt-4 flex gap-4">
                            <Button
                                onClick={handleSubmit}
                                isLoading={isSubmitting}
                                className="flex-1 h-16 rounded-2xl shadow-xl italic font-black uppercase tracking-[0.2em] text-[11px]"
                            >
                                <Send size={18} className="mr-2" />
                                {selectedTask.verificationType === 'automated' ? 'Finalize Reward' : 'Submit Intel'}
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 bg-background border-t border-border flex justify-center opacity-30">
                        <p className="text-[8px] font-black text-text-tertiary uppercase tracking-[0.5em]">Pulse Authority Secure Submission</p>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tasks;
