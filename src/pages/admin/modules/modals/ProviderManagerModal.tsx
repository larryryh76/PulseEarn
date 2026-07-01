import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, X, Save, Trash2, Shield, Zap, Calculator } from 'lucide-react';
import { db } from '../../../../firebase/config';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Button from '../../../../components/ui/Button';
import { cn } from '../../../../utils';

interface ProviderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string | null;
}

const ProviderManagerModal: React.FC<ProviderManagerModalProps> = ({ isOpen, onClose, providerId }) => {
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    active: true,
    postbackSecret: '',
    platformShare: 0.30,
    userShare: 0.60,
    referralShare: 0.10,
    rewardMultiplier: 1.0,
    apiId: '',
    apiKey: '',
    config: {}
  });

  const [idInput, setIdInput] = React.useState('');

  React.useEffect(() => {
    if (isOpen && providerId) {
      setIdInput(providerId);
      const fetchProvider = async () => {
        setLoading(true);
        try {
          const snap = await getDoc(doc(db, 'system_config', `provider_${providerId.toLowerCase()}`));
          if (snap.exists()) {
            setFormData(prev => ({ ...prev, ...snap.data() }));
          }
        } catch (err) {
          toast.error("Failed to load provider configuration");
        } finally {
          setLoading(false);
        }
      };
      fetchProvider();
    } else {
      setIdInput('');
      setFormData({
        active: true,
        postbackSecret: '',
        platformShare: 0.30,
        userShare: 0.60,
        referralShare: 0.10,
        rewardMultiplier: 1.0,
        apiId: '',
        apiKey: '',
        config: {}
      });
    }
  }, [isOpen, providerId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalId = providerId || idInput.trim().toLowerCase();
    if (!finalId) return toast.error("Provider ID required");

    setSubmitting(true);
    try {
      await setDoc(doc(db, 'system_config', `provider_${finalId}`), {
        ...formData,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success("Provider Configuration Synchronized");
      onClose();
    } catch (err) {
      toast.error("Deployment failure");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
     if (!providerId) return;
     if (!window.confirm(`CRITICAL: Permanently detach and delete provider "${providerId.toUpperCase()}"?`)) return;

     setSubmitting(true);
     try {
        await deleteDoc(doc(db, 'system_config', `provider_${providerId}`));
        toast.success("Provider Permanently Purged");
        onClose();
     } catch (err) {
        toast.error("Purge failure");
     } finally {
        setSubmitting(false);
     }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-2xl bg-surface border border-border-bright rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 md:p-10 border-b border-border flex items-center justify-between bg-surface-bright/50">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                  <Globe size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-text-primary tracking-tight uppercase italic leading-none mb-2">
                    {providerId ? providerId.toUpperCase() : 'New Provider'}
                  </h2>
                  <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none">External Integration Authority</p>
                </div>
              </div>
              <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-10 overflow-y-auto no-scrollbar space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Provider Identifier</label>
                    <input
                       disabled={!!providerId}
                       value={idInput}
                       onChange={e => setIdInput(e.target.value)}
                       placeholder="e.g. lootably"
                       required
                       className="w-full bg-surface-bright border border-border rounded-xl px-5 py-4 text-sm font-mono focus:border-primary/50 outline-none transition-all"
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Integration Status</label>
                    <div className="flex items-center gap-4 h-[52px] bg-surface-bright border border-border rounded-xl px-5">
                       <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={e => setFormData({ ...formData, active: e.target.checked })}
                          className="w-6 h-6 accent-primary"
                       />
                       <span className="text-[10px] font-black uppercase tracking-widest text-text-primary">Activate Node</span>
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                    <Shield size={14} /> Security & Handshake
                 </h3>
                 <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Postback Secret / Hash Key</label>
                       <input
                          type="password"
                          value={formData.postbackSecret}
                          onChange={e => setFormData({ ...formData, postbackSecret: e.target.value })}
                          placeholder="••••••••••••••••"
                          className="w-full bg-surface-bright border border-border rounded-xl px-5 py-4 text-sm font-mono focus:border-primary/50 outline-none transition-all"
                       />
                    </div>
                 </div>
              </div>

              <div className="space-y-6">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-success flex items-center gap-2">
                    <Calculator size={14} /> Revenue Sharing Configuration
                 </h3>
                 <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                       <label className="text-[8px] font-black uppercase tracking-widest text-text-tertiary ml-1">Platform (%)</label>
                       <input type="number" step="0.01" value={formData.platformShare} onChange={e => setFormData({...formData, platformShare: Number(e.target.value)})} className="w-full bg-surface-bright border border-border rounded-lg px-4 py-3 text-xs font-mono" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black uppercase tracking-widest text-text-tertiary ml-1">User (%)</label>
                       <input type="number" step="0.01" value={formData.userShare} onChange={e => setFormData({...formData, userShare: Number(e.target.value)})} className="w-full bg-surface-bright border border-border rounded-lg px-4 py-3 text-xs font-mono" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black uppercase tracking-widest text-text-tertiary ml-1">Referral (%)</label>
                       <input type="number" step="0.01" value={formData.referralShare} onChange={e => setFormData({...formData, referralShare: Number(e.target.value)})} className="w-full bg-surface-bright border border-border rounded-lg px-4 py-3 text-xs font-mono" />
                    </div>
                 </div>
                 <div className="p-4 rounded-xl bg-success/5 border border-success/10 flex items-center justify-between">
                    <p className="text-[9px] font-bold text-text-tertiary uppercase italic">Total Distribution Balance:</p>
                    <p className={cn("text-xs font-mono font-bold", (formData.platformShare + formData.userShare + formData.referralShare) === 1 ? "text-success" : "text-danger")}>
                       {(formData.platformShare + formData.userShare + formData.referralShare).toFixed(2)} / 1.00
                    </p>
                 </div>
              </div>

              <div className="pt-10 flex gap-4">
                <Button type="submit" isLoading={submitting} className="flex-1 py-6 rounded-2xl shadow-2xl font-black uppercase tracking-[0.2em] text-[11px]">
                   Deploy Configuration
                </Button>
                {providerId && (
                   <button type="button" onClick={handleDelete} className="w-14 h-full bg-danger/10 text-danger border border-danger/20 rounded-2xl flex items-center justify-center hover:bg-danger/20 transition-all">
                      <Trash2 size={24} />
                   </button>
                )}
                <button type="button" onClick={onClose} className="px-10 py-6 rounded-2xl bg-surface-bright border border-border text-text-tertiary hover:text-text-primary transition-all font-black uppercase tracking-widest text-[10px]">
                   Abort
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProviderManagerModal;
