import { useState, useEffect } from "react";
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../../utils';
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-6 overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-2xl bg-surface sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 my-auto min-h-screen sm:min-h-0">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-bold">{initialCampaign ? 'Edit' : 'New'} Campaign</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Campaign Title</label>
              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Banner URL</label>
              <input value={formData.bannerUrl} onChange={e => setFormData({...formData, bannerUrl: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Description</label>
              <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-24 resize-none focus:border-primary/50 outline-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Start Date</label>
              <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">End Date (Optional)</label>
              <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Prize Pool (PTS)</label>
              <input type="number" value={formData.totalPrizePool} onChange={e => setFormData({...formData, totalPrizePool: parseInt(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all" />
            </div>

            <div className="flex items-center gap-8 h-full pt-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-all",
                  formData.active ? "bg-primary border-primary" : "border-white/10 group-hover:border-white/30"
                )}>
                  {formData.active && <X size={12} className="text-white rotate-45" />}
                </div>
                <input type="checkbox" className="hidden" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Active</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-all",
                  formData.featured ? "bg-accent border-accent" : "border-white/10 group-hover:border-white/30"
                )}>
                  {formData.featured && <X size={12} className="text-white rotate-45" />}
                </div>
                <input type="checkbox" className="hidden" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Featured</span>
              </label>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button type="submit" className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
              {initialCampaign ? 'Update Campaign' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CampaignBuilderModal;
