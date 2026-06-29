import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { Target, Zap, Shield, ChevronRight, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { auth } from '../firebase/config';

const Tasks: React.FC = () => {
  const { tasks, loading } = useTasks();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (taskId: string) => {
    setIsSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId, proof: 'PLATFORM_V6_SUBMISSION' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.automated ? 'Task Completed!' : 'Submitted for Review');
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

      <div className="grid grid-cols-1 gap-4">
        {tasks.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase())).map(task => (
           <motion.div
             key={task.id}
             whileHover={{ x: 4 }}
             className="p-6 rounded-2xl bg-surface border border-border hover:border-primary/20 transition-all flex items-center justify-between group"
           >
              <div className="flex items-center gap-6 min-w-0">
                 <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-border flex items-center justify-center text-primary shrink-0 shadow-inner group-hover:border-primary/30 transition-all">
                    <Target size={24} />
                 </div>
                 <div className="min-w-0">
                    <h3 className="text-lg font-bold text-text-primary uppercase italic truncate group-hover:text-primary transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                       <div className="flex items-center gap-1">
                          <Zap size={12} className="text-primary" />
                          <span className="text-xs font-mono font-bold text-text-secondary">+{task.rewardAmount}</span>
                       </div>
                       <div className="w-1 h-1 rounded-full bg-border" />
                       <span className="text-[9px] font-black text-text-tertiary uppercase tracking-widest">{task.verificationType}</span>
                    </div>
                 </div>
              </div>

              <Button
                onClick={() => handleSubmit(task.id)}
                isLoading={isSubmitting}
                className="h-12 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest italic shadow-xl opacity-0 group-hover:opacity-100 transition-all"
              >
                Execute
              </Button>
              <ChevronRight size={18} className="text-text-tertiary group-hover:hidden transition-all" />
           </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
