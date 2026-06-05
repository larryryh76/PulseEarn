import { useState, useEffect } from "react";
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import toast from 'react-hot-toast';

const CampaignBuilderModal = ({ isOpen, onClose, initialCampaign }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bannerUrl: '',
    active: true,
    featured: false,
    totalPrizePool: 0,
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (isOpen && initialCampaign) {
      setFormData({
        ...initialCampaign,
        startDate: initialCampaign.startDate?.toDate().toISOString().split('T')[0] || '',
        endDate: initialCampaign.endDate?.toDate().toISOString().split('T')[0] || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        bannerUrl: '',
        active: true,
        featured: false,
        totalPrizePool: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
      });
    }
  }, [isOpen, initialCampaign]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      const campId = initialCampaign?.id || doc(collection(db, 'campaigns')).id;
      await setDoc(doc(db, 'campaigns', campId), {
        ...formData,
        id: campId,
        startDate: formData.startDate ? Timestamp.fromDate(new Date(formData.startDate)) : serverTimestamp(),
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success('Campaign saved');
      onClose();
    } catch (err) {
      toast.error('Failed to save campaign');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-2xl bg-surface rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 my-auto">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold">{initialCampaign ? 'Edit' : 'New'} Campaign</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Campaign Title</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Banner URL</label>
              <input value={formData.bannerUrl} onChange={e => setFormData({...formData, bannerUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Description</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-32 resize-none" />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-success text-white font-bold uppercase tracking-widest text-[10px] rounded-xl">Save Campaign</button>
        </form>
      </motion.div>
    </div>
  );
};

export default CampaignBuilderModal;
