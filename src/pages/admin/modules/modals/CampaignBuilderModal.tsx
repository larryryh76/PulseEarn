import * as React from 'react';
import { Target, X, Save, ShieldCheck } from 'lucide-react';
import { db } from '../../../../firebase/config';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { Campaign, TaskCategory } from '../../../../types';
import { motion } from 'framer-motion';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '../../../../utils';
import MediaUploader from '../../../../components/admin/MediaUploader';

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCampaign?: Campaign | null;
}

const CampaignBuilderModal: React.FC<CampaignBuilderModalProps> = ({ isOpen, onClose, initialCampaign }) => {
  const [formData, setFormData] = React.useState<Partial<Campaign>>({
    name: '',
    description: '',
    category: 'ENGAGEMENT' as TaskCategory,
    bannerUrl: '',
    totalPrizePool: 1000,
    xpReward: 100,
    active: true,
    status: 'ACTIVE',
    featured: false,
    autoExpiration: false,
    validationSettings: {
      manualReview: false,
      screenshotRequired: false,
      linkRequired: false,
      referralRequired: false,
      predictionRequired: false,
      apiValidation: false
    }
  });

  React.useEffect(() => {
    if (initialCampaign) {
      setFormData(initialCampaign);
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'ENGAGEMENT' as TaskCategory,
        bannerUrl: '',
        totalPrizePool: 1000,
        xpReward: 100,
        active: true,
        status: 'ACTIVE',
        featured: false,
        autoExpiration: false,
        validationSettings: {
          manualReview: false,
          screenshotRequired: false,
          linkRequired: false,
          referralRequired: false,
          predictionRequired: false,
          apiValidation: false
        }
      });
    }
  }, [initialCampaign, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const loadingToast = toast.loading('Synchronizing campaign node...');
    try {
      const id = initialCampaign?.id || doc(collection(db, 'campaigns')).id;
      const campaignRef = doc(db, 'campaigns', id);

      const payload = {
        ...formData,
        id,
        updatedAt: serverTimestamp(),
        createdAt: initialCampaign ? initialCampaign.createdAt : serverTimestamp()
      };

      await setDoc(campaignRef, payload, { merge: true });
      toast.dismiss(loadingToast);
      toast.success('Campaign synchronized');
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
                   <Target size={28} />
                </div>
                <div>
                   <h2 className="text-2xl font-bold text-text-primary uppercase italic leading-none mb-2">Campaign Architect</h2>
                   <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none">Strategic Reward Deployment Vector</p>
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
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Campaign Identifier</label>
                      <input
                        required value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-bold uppercase italic tracking-tight"
                      />
                   </div>
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Operational Brief</label>
                      <textarea
                        required value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-6 text-sm text-text-primary h-40 resize-none focus:border-primary/50 outline-none transition-all font-medium leading-relaxed"
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
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Priority State</label>
                         <div className="flex gap-2 h-full py-1">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, featured: !formData.featured})}
                              className={cn("flex-1 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", formData.featured ? "bg-warning border-warning text-black" : "bg-white/5 border-border text-text-tertiary")}
                            >
                               Featured
                            </button>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Total Prize Matrix</label>
                         <input
                           type="number"
                           value={formData.totalPrizePool}
                           onChange={e => setFormData({...formData, totalPrizePool: Number(e.target.value)})}
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

                   <div className="space-y-2.5">
                      <MediaUploader
                        label="Campaign Banner (10MB)"
                        value={formData.bannerUrl}
                        onChange={url => setFormData({...formData, bannerUrl: url})}
                        path="campaigns/banners"
                        aspectRatio="video"
                      />
                   </div>
                </div>
             </div>

             <div className="p-8 bg-surface-bright/50 border border-border rounded-[2rem] space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-2 px-1">
                   <ShieldCheck size={14} /> Validation Matrix
                </h3>
                <div className="grid grid-cols-3 gap-6">
                   {Object.keys(formData.validationSettings || {}).map((key) => (
                      <button
                        key={key} type="button"
                        onClick={() => setFormData({...formData, validationSettings: { ...formData.validationSettings!, [key]: !formData.validationSettings![key as keyof typeof formData.validationSettings] }})}
                        className={cn("px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group",
                           formData.validationSettings?.[key as keyof typeof formData.validationSettings] ? "bg-primary border-primary text-text-primary" : "bg-white/5 border-border text-text-tertiary hover:text-text-primary"
                        )}
                      >
                         {key.replace(/([A-Z])/g, ' $1')}
                         <div className={cn("w-2 h-2 rounded-full", formData.validationSettings?.[key as keyof typeof formData.validationSettings] ? "bg-white" : "bg-white/10 group-hover:bg-white/20")} />
                      </button>
                   ))}
                </div>
             </div>
          </form>

          <div className="p-10 border-t border-border bg-background/40 flex gap-6">
             <Button type="submit" onClick={handleSubmit} className="flex-1 py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-4 italic shadow-2xl">
                <Save size={20} /> Synchronize Config
             </Button>
             <button onClick={onClose} className="px-12 py-6 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]">
                Abort
             </button>
          </div>
       </motion.div>
    </div>
  );
};

export default CampaignBuilderModal;
