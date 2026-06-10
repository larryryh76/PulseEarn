import { useState, useEffect } from "react";
import { X, Zap, ShieldCheck, ExternalLink, Info, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import toast from 'react-hot-toast';
import { TaskCategory, VerificationType, SocialPlatform } from '../../../../types';

const TaskBuilderModal = ({ isOpen, onClose, initialTask, onSave }: any) => {
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    instructions: '',
    proofRequirements: '',
    rewardAmount: 0,
    xpReward: 50,
    category: 'SOCIAL',
    type: 'once',
    platform: 'NONE',
    verificationType: 'manual',
    actionUrl: '',
    cooldownPeriod: 0,
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (isOpen && initialTask) {
      setFormData(initialTask);
    } else {
      setFormData({
        title: '',
        description: '',
        instructions: '',
        proofRequirements: '',
        rewardAmount: 0,
        xpReward: 50,
        category: 'SOCIAL',
        type: 'once',
        platform: 'NONE',
        verificationType: 'manual',
        actionUrl: '',
        cooldownPeriod: 0,
        status: 'ACTIVE'
      });
    }
  }, [isOpen, initialTask]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const taskId = initialTask?.id || doc(collection(db, 'tasks')).id;
      const taskData = {
        ...formData,
        id: taskId,
        updatedAt: serverTimestamp(),
        createdAt: initialTask?.createdAt || serverTimestamp(),
        active: formData.status === 'ACTIVE'
      };

      await setDoc(doc(db, 'tasks', taskId), taskData, { merge: true });
      toast.success('Task saved');
      if (onSave) onSave(taskData);
      onClose();
    } catch (err) {
      toast.error('Failed to save task');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-3xl bg-surface sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 my-auto">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <div>
             <h2 className="text-xl font-bold uppercase tracking-tight">{initialTask ? 'Edit' : 'Create'} Task Unit</h2>
             <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Configure individual execution vector</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* COLUMN 1: IDENTITY */}
            <section className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Info size={14} />
                Task Identity
              </h3>

              <div className="space-y-4">
                                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Linked Campaign ID</label>
                  <input value={formData.campaignId} onChange={e => setFormData({...formData, campaignId: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all font-mono" placeholder="campaign_id_..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Task Title</label>
                  <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" placeholder="Follow PulseEarn on X" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Short Description</label>
                  <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-20 resize-none focus:border-primary/50 outline-none transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Reward (PTS)</label>
                    <input type="number" required value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono focus:border-primary/50 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">XP Grant</label>
                    <input type="number" required value={formData.xpReward} onChange={e => setFormData({...formData, xpReward: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono focus:border-primary/50 outline-none transition-all" />
                  </div>
                </div>
              </div>
            </section>

            {/* COLUMN 2: EXECUTION */}
            <section className="space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2">
                <Layers size={14} />
                Execution Logic
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                      {(['SOCIAL', 'ENGAGEMENT', 'REFERRAL', 'PREDICTION', 'EDUCATION', 'EVENTS', 'SPONSORED'] as TaskCategory[]).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Platform</label>
                    <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                      {(['TELEGRAM', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'DISCORD', 'WEBSITE', 'APP_STORE', 'NONE'] as SocialPlatform[]).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Verification Method</label>
                  <select value={formData.verificationType} onChange={e => setFormData({...formData, verificationType: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                    {(['automated', 'manual', 'proof', 'timer', 'activity', 'link', 'api', 'referral', 'prediction'] as VerificationType[]).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Action URL</label>
                  <div className="relative">
                     <input value={formData.actionUrl} onChange={e => setFormData({...formData, actionUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pl-12 text-sm focus:border-primary/50 outline-none transition-all" placeholder="https://x.com/pulseearn" />
                     <ExternalLink size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="space-y-6 pt-6 border-t border-white/5">
             <h3 className="text-xs font-bold uppercase tracking-widest text-success flex items-center gap-2">
                <ShieldCheck size={14} />
                Detailed Instructions & Proof
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Instructions for User</label>
                  <textarea value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-32 resize-none focus:border-primary/50 outline-none transition-all" placeholder="1. Click the button below\n2. Follow the account\n3. Return and submit your handle" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Proof Requirements</label>
                  <textarea value={formData.proofRequirements} onChange={e => setFormData({...formData, proofRequirements: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-32 resize-none focus:border-primary/50 outline-none transition-all" placeholder="Please upload a screenshot of your following status or provide your handle." />
                </div>
             </div>
          </section>

          <div className="pt-6">
            <button type="submit" className="w-full py-5 bg-primary text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3">
              <Zap size={18} />
              {initialTask ? 'Update Task Unit' : 'Authorize New Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default TaskBuilderModal;
