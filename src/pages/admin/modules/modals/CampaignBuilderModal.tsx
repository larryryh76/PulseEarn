import * as React from 'react';
import { Target, X, Save, ShieldCheck, Zap } from 'lucide-react';
import { db } from '../../../../firebase/config';
import { doc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Campaign, TaskCategory, VerificationType, SocialPlatform } from '../../../../types';
import { motion } from 'framer-motion';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '../../../../utils';

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCampaign?: Campaign | null;
}

const CampaignBuilderModal: React.FC<CampaignBuilderModalProps> = ({ isOpen, onClose, initialCampaign }) => {
  const [formData, setFormData] = React.useState<Partial<Campaign>>({
    name: '',
    description: '',
    category: 'SOCIAL' as TaskCategory,
    sponsorName: '',
    sponsorLogoUrl: '',
    sponsorWebsite: '',
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

  const [initialTask, setInitialTask] = React.useState({
     title: '',
     rewardAmount: 100,
     xpReward: 50,
     verificationType: 'manual' as VerificationType,
     instructions: ''
  });

  const [createWithTask, setCreateWithTask] = React.useState(false);

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
    const loadingToast = toast.loading('Synchronizing Architecture...');
    try {
      const batch = writeBatch(db);
      const campId = initialCampaign?.id || doc(collection(db, 'campaigns')).id;
      const campaignRef = doc(db, 'campaigns', campId);

      const payload = {
        ...formData,
        id: campId,
        remainingPool: initialCampaign ? initialCampaign.remainingPool : formData.totalPrizePool,
        updatedAt: serverTimestamp(),
        createdAt: initialCampaign ? initialCampaign.createdAt : serverTimestamp()
      };

      batch.set(campaignRef, payload, { merge: true });

      // Deep Integration: Atomic Task Injection
      if (!initialCampaign && createWithTask && initialTask.title) {
         const taskId = doc(collection(db, 'tasks')).id;
         const taskRef = doc(db, 'tasks', taskId);
         batch.set(taskRef, {
            ...initialTask,
            id: taskId,
            campaignId: campId,
            active: true,
            status: 'ACTIVE',
            category: formData.category,
            platform: 'NONE' as SocialPlatform,
            providerId: 'SYSTEM',
            providerName: 'PulseEarn Authority',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            fraudProtection: {
               duplicatePrevention: true,
               abuseDetection: true,
               multiAccountDetection: true
            }
         });
      }

      await batch.commit();
      toast.dismiss(loadingToast);
      toast.success('Mission Hub Synchronized');
      onClose();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Architecture Sync Failure');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-6 bg-background/90 backdrop-blur-xl">
       <motion.div
         initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }}
         className="relative w-full h-full md:h-auto md:max-w-4xl bg-surface md:border border-border-bright md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]"
       >
          {/* MOBILE HEADER */}
          <div className="p-6 md:p-8 border-b border-border flex justify-between items-center bg-surface-bright/50 shrink-0">
             <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                   <Target size={20} className="md:w-6 md:h-6" />
                </div>
                <div>
                   <h2 className="text-lg md:text-xl font-bold text-text-primary uppercase italic leading-none mb-1 md:mb-1.5">Manage Campaign</h2>
                   <p className="text-text-tertiary text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none">Operational Settings</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-surface-glass rounded-lg transition-all text-text-tertiary">
                <X size={20} />
             </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-10 no-scrollbar pb-32 md:pb-10">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Campaign Name</label>
                      <input
                        required value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. Q3 Growth Campaign"
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-4 md:p-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-bold"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Description</label>
                      <textarea
                        required value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="Describe the campaign objectives..."
                        className="w-full bg-surface-bright border border-border-bright rounded-2xl p-5 md:p-6 text-sm text-text-primary h-32 md:h-40 resize-none focus:border-primary/50 outline-none transition-all font-medium leading-relaxed"
                      />
                   </div>
                </div>

                <div className="space-y-6 md:space-y-8">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Category</label>
                         <select
                           value={formData.category}
                           onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none font-bold uppercase tracking-widest"
                         >
                            {['SOCIAL', 'REFERRAL', 'EDUCATION', 'PREDICTION', 'COMMUNITY', 'EVENTS', 'SPONSORED', 'CUSTOM'].map(c => <option key={c} value={c} className="bg-surface">{c}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Visibility</label>
                         <div className="flex gap-2 h-[50px]">
                            <button
                              type="button"
                              onClick={() => setFormData({...formData, featured: !formData.featured})}
                              className={cn("flex-1 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all", formData.featured ? "bg-warning/20 border-warning text-warning" : "bg-surface-glass border-border text-text-tertiary")}
                            >
                               Featured
                            </button>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Reward Pool (PTS)</label>
                         <input
                           type="number"
                           value={formData.totalPrizePool}
                           onChange={e => setFormData({...formData, totalPrizePool: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary font-mono"
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">XP Provision</label>
                         <input
                           type="number"
                           value={formData.xpReward}
                           onChange={e => setFormData({...formData, xpReward: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary font-mono"
                         />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Sponsor Authority</label>
                        <input
                          required value={formData.sponsorName}
                          onChange={e => setFormData({...formData, sponsorName: e.target.value})}
                          placeholder="e.g. Partner Labs"
                          className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Logo URL</label>
                            <input
                               value={formData.sponsorLogoUrl}
                               onChange={e => setFormData({...formData, sponsorLogoUrl: e.target.value})}
                               placeholder="https://..."
                               className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-xs text-text-primary focus:border-primary/50 outline-none transition-all font-mono"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Website</label>
                            <input
                               value={formData.sponsorWebsite}
                               onChange={e => setFormData({...formData, sponsorWebsite: e.target.value})}
                               placeholder="https://..."
                               className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-xs text-text-primary focus:border-primary/50 outline-none transition-all font-mono"
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Banner Reference URL</label>
                        <input
                          value={formData.bannerUrl || ''}
                          onChange={e => setFormData({...formData, bannerUrl: e.target.value})}
                          placeholder="https://..."
                          className="w-full bg-surface-bright border border-border-bright rounded-xl p-4 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-mono"
                        />
                        <p className="text-[8px] text-text-tertiary/50 uppercase font-bold mt-1 px-1">Native upload disabled. Use static URL.</p>
                      </div>
                   </div>
                </div>
             </div>

             {!initialCampaign && (
                <div className="p-8 bg-primary/5 border border-primary/10 rounded-[2.5rem] space-y-8 shadow-inner">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Zap size={18} className="text-primary" />
                         <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-primary">Bootstrap First Work Unit</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateWithTask(!createWithTask)}
                        className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all", createWithTask ? "bg-primary text-text-primary border-primary" : "text-text-tertiary border-border")}
                      >
                         {createWithTask ? 'Enabled' : 'Disabled'}
                      </button>
                   </div>

                   {createWithTask && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-4 duration-500">
                         <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Task Title</label>
                               <input
                                 value={initialTask.title}
                                 onChange={e => setInitialTask({...initialTask, title: e.target.value})}
                                 className="w-full bg-surface border border-border rounded-xl p-3 text-xs focus:border-primary/50 outline-none"
                                 placeholder="e.g. Follow Authority Profile"
                               />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Bounty (PTS)</label>
                                  <input
                                    type="number" value={initialTask.rewardAmount}
                                    onChange={e => setInitialTask({...initialTask, rewardAmount: Number(e.target.value)})}
                                    className="w-full bg-surface border border-border rounded-xl p-3 text-xs font-mono focus:border-primary/50 outline-none"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Provision (XP)</label>
                                  <input
                                    type="number" value={initialTask.xpReward}
                                    onChange={e => setInitialTask({...initialTask, xpReward: Number(e.target.value)})}
                                    className="w-full bg-surface border border-border rounded-xl p-3 text-xs font-mono focus:border-primary/50 outline-none"
                                  />
                               </div>
                            </div>
                         </div>
                         <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[9px] font-bold uppercase tracking-widest text-text-tertiary ml-1">Operations Protocol (Instructions)</label>
                               <textarea
                                 value={initialTask.instructions}
                                 onChange={e => setInitialTask({...initialTask, instructions: e.target.value})}
                                 className="w-full bg-surface border border-border rounded-xl p-3 text-xs h-[104px] resize-none focus:border-primary/50 outline-none"
                                 placeholder="Detail user requirements for validation..."
                               />
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             )}

             <div className="p-6 md:p-8 bg-surface-bright/50 border border-border rounded-[1.5rem] md:rounded-[2rem] space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary flex items-center gap-2 px-1">
                   <ShieldCheck size={14} /> Validation Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                   {Object.keys(formData.validationSettings || {}).map((key) => (
                      <button
                        key={key} type="button"
                        onClick={() => setFormData({...formData, validationSettings: { ...formData.validationSettings!, [key]: !formData.validationSettings![key as keyof typeof formData.validationSettings] }})}
                        className={cn("px-4 py-3.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group",
                           formData.validationSettings?.[key as keyof typeof formData.validationSettings] ? "bg-primary/10 border-primary text-primary" : "bg-surface-glass border-border text-text-tertiary hover:text-text-primary"
                        )}
                      >
                         {key.replace(/([A-Z])/g, ' $1')}
                         <div className={cn("w-2 h-2 rounded-full", formData.validationSettings?.[key as keyof typeof formData.validationSettings] ? "bg-primary" : "bg-white/10 group-hover:bg-white/20")} />
                      </button>
                   ))}
                </div>
             </div>
          </form>

          {/* ACTIONS */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-md border-t border-border md:relative md:p-8 md:bg-background/40 flex flex-col md:flex-row gap-3 md:gap-4 z-10">
             <Button type="submit" onClick={handleSubmit} className="w-full md:flex-1 h-12 md:h-14 bg-text-primary text-background font-black uppercase tracking-[0.2em] text-[10px] rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-3">
                <Save size={18} className="md:w-5 md:h-5" /> Save Campaign
             </Button>
             <button onClick={onClose} className="w-full md:px-10 h-12 md:h-14 rounded-xl bg-surface-bright border border-border text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]">
                Discard
             </button>
          </div>
       </motion.div>
    </div>
  );
};

export default CampaignBuilderModal;
