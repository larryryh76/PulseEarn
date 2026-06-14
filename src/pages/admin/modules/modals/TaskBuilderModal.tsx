import * as React from 'react';
import { Zap, X, Save, ShieldCheck } from 'lucide-react';
import { db } from '../../../../firebase/config';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { Task, TaskCategory, VerificationType, SocialPlatform } from '../../../../types';
import { motion } from 'framer-motion';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '../../../../utils';

interface TaskBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask?: Task | null;
}

const TaskBuilderModal: React.FC<TaskBuilderModalProps> = ({ isOpen, onClose, initialTask }) => {
  const [formData, setFormData] = React.useState<Partial<Task>>({
    title: '',
    description: '',
    instructions: '',
    campaignId: '',
    category: 'ENGAGEMENT' as TaskCategory,
    verificationType: 'manual' as VerificationType,
    rewardAmount: 100,
    xpReward: 50,
    platform: 'NONE' as SocialPlatform,
    active: true,
    status: 'ACTIVE',
    minLevel: 1,
    estimatedTime: '2 mins',
    fraudProtection: {
      duplicatePrevention: true,
      abuseDetection: true,
      multiAccountDetection: true
    }
  });

  React.useEffect(() => {
    if (initialTask) setFormData(initialTask);
  }, [initialTask, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Synchronizing execution node...');
    try {
      const id = initialTask?.id || doc(collection(db, 'tasks')).id;
      const taskRef = doc(db, 'tasks', id);

      const payload = {
        ...formData,
        id,
        updatedAt: serverTimestamp(),
        createdAt: initialTask ? initialTask.createdAt : serverTimestamp(),
        providerId: 'SYSTEM',
        providerName: 'PulseEarn Authority'
      };

      await setDoc(taskRef, payload, { merge: true });
      toast.dismiss(loadingToast);
      toast.success('Vector Synchronized');
      onClose();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Sync failure');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/90 backdrop-blur-xl">
       <motion.div
         initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
         className="relative w-full max-w-4xl bg-surface border border-border-bright rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
       >
          <div className="p-10 border-b border-border flex justify-between items-center bg-surface-bright/50">
             <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                   <Zap size={28} />
                </div>
                <div>
                   <h2 className="text-2xl font-bold text-text-primary uppercase italic leading-none mb-2">Vector Architect</h2>
                   <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none">Atomic Execution & Provisioning Logic</p>
                </div>
             </div>
             <button onClick={onClose} className="w-10 h-10 hover:bg-white/5 rounded-xl transition-all flex items-center justify-center text-text-tertiary">
                <X size={24} />
             </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
             <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Parent Campaign ID</label>
                      <input
                        required value={formData.campaignId ?? ''}
                        onChange={e => setFormData({...formData, campaignId: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-mono"
                        placeholder="UUID of the parent campaign..."
                      />
                   </div>
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Vector Identifier</label>
                      <input
                        required value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-bold uppercase italic tracking-tight"
                      />
                   </div>
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Executive Brief</label>
                      <textarea
                        required value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-6 text-sm text-text-primary h-24 resize-none focus:border-primary/50 outline-none transition-all font-medium leading-relaxed"
                      />
                   </div>
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Execution Logic (Instructions)</label>
                      <textarea
                        required value={formData.instructions}
                        onChange={e => setFormData({...formData, instructions: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-6 text-sm text-text-primary h-32 resize-none focus:border-primary/50 outline-none transition-all font-medium leading-relaxed"
                      />
                   </div>
                </div>

                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Asset Category</label>
                         <select
                           value={formData.category}
                           onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none font-bold uppercase tracking-widest"
                         >
                            {['SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION'].map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Validation Vector</label>
                         <select
                           value={formData.verificationType}
                           onChange={e => setFormData({...formData, verificationType: e.target.value as VerificationType})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none font-bold uppercase tracking-widest"
                         >
                            {['automated', 'manual', 'proof', 'activity', 'link'].map(v => <option key={v} value={v} className="bg-surface uppercase">{v}</option>)}
                         </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Point Provision</label>
                         <input
                           type="number"
                           value={formData.rewardAmount}
                           onChange={e => setFormData({...formData, rewardAmount: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary font-mono"
                         />
                      </div>
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">XP Provision</label>
                         <input
                           type="number"
                           value={formData.xpReward}
                           onChange={e => setFormData({...formData, xpReward: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary font-mono"
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Min Level THR</label>
                         <input
                           type="number"
                           value={formData.minLevel}
                           onChange={e => setFormData({...formData, minLevel: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary font-mono"
                         />
                      </div>
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Logic Platform</label>
                         <select
                           value={formData.platform}
                           onChange={e => setFormData({...formData, platform: e.target.value as SocialPlatform})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none font-bold uppercase tracking-widest"
                         >
                            {['TELEGRAM', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'DISCORD', 'WEBSITE', 'NONE'].map(p => <option key={p} value={p} className="bg-surface">{p}</option>)}
                         </select>
                      </div>
                   </div>
                </div>
             </div>

             <div className="p-8 bg-surface-bright/50 border border-border rounded-[2rem] space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-2 px-1">
                   <ShieldCheck size={14} /> Integrity Matrix
                </h3>
                <div className="grid grid-cols-3 gap-6">
                   {Object.keys(formData.fraudProtection || {}).map((key) => (
                      <button
                        key={key} type="button"
                        onClick={() => setFormData({...formData, fraudProtection: { ...formData.fraudProtection!, [key]: !formData.fraudProtection![key as keyof typeof formData.fraudProtection] }})}
                        className={cn("px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group",
                           formData.fraudProtection?.[key as keyof typeof formData.fraudProtection] ? "bg-primary border-primary text-text-primary" : "bg-white/5 border-border text-text-tertiary hover:text-text-primary"
                        )}
                      >
                         {key.replace(/([A-Z])/g, ' $1')}
                         <div className={cn("w-2 h-2 rounded-full", formData.fraudProtection?.[key as keyof typeof formData.fraudProtection] ? "bg-white" : "bg-white/10 group-hover:bg-white/20")} />
                      </button>
                   ))}
                </div>
             </div>
          </form>

          <div className="p-10 border-t border-border bg-background/40 flex gap-6">
             <Button type="submit" onClick={handleSubmit} className="flex-1 py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-4 italic shadow-2xl">
                <Save size={20} /> Synchronize Vector
             </Button>
             <button onClick={onClose} className="px-12 py-6 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]">
                Abort
             </button>
          </div>
       </motion.div>
    </div>
  );
};

export default TaskBuilderModal;
