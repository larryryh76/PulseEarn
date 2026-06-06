import { useState, useEffect } from "react";
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import toast from 'react-hot-toast';

const TaskBuilderModal = ({ isOpen, onClose, initialTask }: any) => {
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    rewardAmount: 0,
    category: 'SOCIAL',
    status: 'ACTIVE',
    verificationType: 'automated'
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
      toast.success('Task saved');
      onClose();
    } catch (err) {
      toast.error('Failed to save task');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-2xl bg-surface rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 my-auto">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold">{initialTask ? 'Edit' : 'New'} Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Title</label>
              <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Reward (PTS)</label>
                <input type="number" required value={formData.rewardAmount} onChange={e => setFormData({...formData, rewardAmount: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                  <option value="SOCIAL">SOCIAL</option>
                  <option value="REFERRAL">REFERRAL</option>
                  <option value="PREDICTION">PREDICTION</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Description</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-32 resize-none" />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest text-[10px] rounded-xl">Save Task</button>
        </form>
      </motion.div>
    </div>
  );
};

export default TaskBuilderModal;
