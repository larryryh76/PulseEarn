import { useState, useEffect } from "react";
import { X, Layers, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, collection, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../../../firebase/config';
import toast from 'react-hot-toast';

const CampaignBuilderModal = ({ isOpen, onClose, initialCampaign }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bannerUrl: '',
    thumbnailUrl: '',
    category: 'GENERAL',
    platform: 'NONE',
    active: true,
    featured: false,
    totalPrizePool: 0,
    remainingPool: 0,
    startDate: '',
    endDate: '',
    taskIds: [] as string[]
  });

  useEffect(() => {
    if (isOpen && initialCampaign) {
      setFormData({
        name: initialCampaign.name || '',
        description: initialCampaign.description || '',
        bannerUrl: initialCampaign.bannerUrl || '',
        thumbnailUrl: initialCampaign.thumbnailUrl || '',
        category: initialCampaign.category || 'GENERAL',
        platform: initialCampaign.platform || 'NONE',
        active: initialCampaign.active ?? true,
        featured: initialCampaign.featured ?? false,
        totalPrizePool: initialCampaign.totalPrizePool || 0,
        remainingPool: initialCampaign.remainingPool || 0,
        startDate: initialCampaign.startDate?.toDate().toISOString().split('T')[0] || '',
        endDate: initialCampaign.endDate?.toDate().toISOString().split('T')[0] || '',
        taskIds: initialCampaign.taskIds || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        bannerUrl: '',
        thumbnailUrl: '',
        category: 'GENERAL',
        platform: 'NONE',
        active: true,
        featured: false,
        totalPrizePool: 0,
        remainingPool: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        taskIds: []
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-4xl bg-surface rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 my-auto"
      >
        <div className="flex justify-between items-center p-8 border-b border-white/5">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                <Layers size={20} />
             </div>
             <div>
                <h2 className="text-xl font-bold tracking-tight">{initialCampaign ? 'Edit' : 'Create'} Strategic Campaign</h2>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Global Ecosystem Initiative</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-xl transition-all text-white/40 hover:text-white"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             {/* Left Col: Identity */}
             <div className="space-y-8">
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                   <div className="w-4 h-px bg-primary" />
                   Campaign Identity
                </h3>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Title</label>
                      <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Description</label>
                      <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-32 resize-none" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Category</label>
                         <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                            <option value="GENERAL">GENERAL</option>
                            <option value="SEASONAL">SEASONAL</option>
                            <option value="PARTNER">PARTNER</option>
                            <option value="PREMIUM">PREMIUM</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Platform</label>
                         <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold uppercase">
                            <option value="NONE">ALL_PLATFORMS</option>
                            <option value="TELEGRAM">TELEGRAM</option>
                            <option value="TWITTER">TWITTER</option>
                            <option value="DISCORD">DISCORD</option>
                         </select>
                      </div>
                   </div>
                </div>
             </div>

             {/* Right Col: Media & Settings */}
             <div className="space-y-8">
                <h3 className="text-[10px] font-bold text-success uppercase tracking-[0.2em] flex items-center gap-3">
                   <div className="w-4 h-px bg-success" />
                   Ecosystem Settings
                </h3>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Banner Artwork URL</label>
                      <input value={formData.bannerUrl} onChange={e => setFormData({...formData, bannerUrl: e.target.value})} placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Start Date</label>
                         <input type="date" required value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">End Date</label>
                         <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
                      </div>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Prize Pool (PTS)</label>
                         <input type="number" required value={formData.totalPrizePool} onChange={e => setFormData({...formData, totalPrizePool: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono" />
                      </div>
                      <div className="flex items-center gap-4 pt-8">
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={formData.featured} onChange={e => setFormData({...formData, featured: e.target.checked})} className="sr-only peer" />
                            <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            <span className="ml-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">Featured</span>
                         </label>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center gap-4">
             <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 w-full sm:w-auto">
                <AlertCircle size={18} className="text-white/20" />
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Authorized Operation</p>
             </div>
             <button type="submit" className="w-full sm:flex-1 py-5 bg-success text-white font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-lg shadow-success/20 hover:bg-success/90 transition-all">Synchronize Campaign Registry</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default CampaignBuilderModal;
