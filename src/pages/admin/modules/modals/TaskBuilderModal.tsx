import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import toast from 'react-hot-toast';

const TaskBuilderModal = ({ isOpen, onClose, initialTask }: any) => {
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    rewardAmount: 0,
    xpReward: 50,
    category: 'SOCIAL',
    type: 'once',
    platform: 'WEBSITE',
    status: 'ACTIVE',
    verificationType: 'automated',
    instructions: '',
    proofRequirements: '',
    actionUrl: '',
    cooldownPeriod: 0,
    active: true,
    minLevel: 1
  });

  useEffect(() => {
    if (isOpen && initialTask) {
      setFormData(initialTask);
    } else {
      setFormData({
        title: '',
        description: '',
        rewardAmount: 0,
        category: 'SOCIAL',
        status: 'ACTIVE',
        verificationType: 'automated'
      });
    }
  }, [isOpen, initialTask]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const taskId = initialTask?.id || doc(collection(db, 'tasks')).id;
      await setDoc(doc(db, 'tasks', taskId), {
        ...formData,
        id: taskId,
        updatedAt: serverTimestamp(),
        active: formData.status === 'ACTIVE'
      }, { merge: true });
      toast.success('Task configuration updated');
      onClose();
    } catch (err) {
      toast.error('Failed to update task configuration');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-4xl bg-surface rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 my-auto"
      >
        <div className="flex justify-between items-center p-8 border-b border-white/5">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Save size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold tracking-tight">{initialTask ? 'Edit' : 'Create'} Mission Unit</h2>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">ID: {initialTask?.id || 'NEW_UNIT'}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          {/* Section 1: Basics */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-3">
               <div className="w-4 h-px bg-primary" />
               Basic Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                  <option value="SOCIAL">SOCIAL</option>
                  <option value="ENGAGEMENT">ENGAGEMENT</option>
                  <option value="REFERRAL">REFERRAL</option>
                  <option value="PREDICTION">PREDICTION</option>
                  <option value="EDUCATION">EDUCATION</option>
                  <option value="EVENTS">EVENTS</option>
                  <option value="SPONSORED">SPONSORED</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Description</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-24 resize-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Economics */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-success uppercase tracking-[0.2em] flex items-center gap-3">
               <div className="w-4 h-px bg-success" />
               Reward Structure
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Points Reward</label>
                  <input type="number" required value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">XP Reward</label>
                  <input type="number" required value={formData.xpReward} onChange={e => setFormData({...formData, xpReward: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Min Level</label>
                  <input type="number" required value={formData.minLevel} onChange={e => setFormData({...formData, minLevel: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
               </div>
            </div>
          </div>

          {/* Section 3: Verification */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] flex items-center gap-3">
               <div className="w-4 h-px bg-accent" />
               Validation Protocol
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Verification Method</label>
                  <select value={formData.verificationType} onChange={e => setFormData({...formData, verificationType: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                     <option value="automated">AUTOMATED_LINK</option>
                     <option value="proof">MANUAL_PROOF</option>
                     <option value="manual">ADMIN_APPROVAL</option>
                     <option value="activity">SYSTEM_ACTIVITY</option>
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Action URL</label>
                  <input value={formData.actionUrl} onChange={e => setFormData({...formData, actionUrl: e.target.value})} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
               </div>
               <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Mission Instructions</label>
                  <textarea value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-24 resize-none" />
               </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center gap-4">
             <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 w-full sm:w-auto">
                <AlertCircle size={18} className="text-white/20" />
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Permanent Registry Entry</p>
             </div>
             <button type="submit" className="w-full sm:flex-1 py-5 bg-primary text-white font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">Authorize Unit Update</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default TaskBuilderModal;
