import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Key, Globe } from 'lucide-react';
import { db } from '../../../../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import Button from '../../../../components/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '../../../../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ProviderManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [selectedProvider, setSelectedProvider] = useState('wannads');
  const [config, setConfig] = useState({
    postbackSecret: '',
    apiKey: '',
    active: true,
    platformShare: 0.30,
    userShare: 0.60,
    referralShare: 0.10
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchConfig = async () => {
        const snap = await getDoc(doc(db, 'system_config', `provider_${selectedProvider}`));
        if (snap.exists()) {
          const data = snap.data();
          setConfig({
             postbackSecret: data.postbackSecret || '',
             apiKey: data.apiKey || '',
             active: data.active ?? true,
             platformShare: data.platformShare ?? 0.30,
             userShare: data.userShare ?? 0.60,
             referralShare: data.referralShare ?? 0.10
          });
        } else {
          setConfig({
             postbackSecret: '',
             apiKey: '',
             active: true,
             platformShare: 0.30,
             userShare: 0.60,
             referralShare: 0.10
          });
        }
      };
      fetchConfig();
    }
  }, [isOpen, selectedProvider]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await setDoc(doc(db, 'system_config', `provider_${selectedProvider}`), {
        ...config,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success('Provider configuration saved');
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/90 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            className="relative w-full max-w-lg bg-surface border border-border-bright rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-border flex items-center justify-between bg-surface-bright/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xl">
                     <Shield size={24} />
                  </div>
                  <div>
                     <h3 className="text-xl font-bold text-text-primary uppercase italic leading-none mb-1">Offerwalls</h3>
                     <p className="text-[9px] font-black uppercase tracking-widest text-text-tertiary">Third-Party Integrations</p>
                  </div>
               </div>
               <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-surface-bright rounded-xl transition-all text-text-tertiary">
                  <X size={24} />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1 flex items-center gap-2">
                     <Globe size={12} /> Select Provider
                  </label>
                  <select
                    value={selectedProvider}
                    onChange={e => setSelectedProvider(e.target.value)}
                    className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-4 text-sm text-text-primary focus:border-primary/50 outline-none font-bold uppercase tracking-widest appearance-none"
                  >
                     <option value="wannads">Wannads</option>
                     <option value="lootably">Lootably</option>
                     <option value="adgem">AdGem</option>
                     <option value="bitlabs">BitLabs</option>
                     <option value="cpx-research">CPX Research</option>
                  </select>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1 flex items-center gap-2">
                        <Key size={12} /> Postback Secret
                     </label>
                     <input
                       type="password"
                       value={config.postbackSecret}
                       onChange={e => setConfig({ ...config, postbackSecret: e.target.value })}
                       placeholder="Webhook signature key..."
                       className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-4 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1 flex items-center gap-2">
                        <Key size={12} /> API Key
                     </label>
                     <input
                       type="password"
                       value={config.apiKey}
                       onChange={e => setConfig({ ...config, apiKey: e.target.value })}
                       placeholder="Provider API key (optional)..."
                       className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-4 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                     />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-text-tertiary ml-1">Platform %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={config.platformShare}
                          onChange={e => setConfig({ ...config, platformShare: Number(e.target.value) })}
                          className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-3 text-xs font-mono text-text-primary outline-none"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-text-tertiary ml-1">User %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={config.userShare}
                          onChange={e => setConfig({ ...config, userShare: Number(e.target.value) })}
                          className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-3 text-xs font-mono text-text-primary outline-none"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-text-tertiary ml-1">Ref %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={config.referralShare}
                          onChange={e => setConfig({ ...config, referralShare: Number(e.target.value) })}
                          className="w-full bg-surface-bright border border-border-bright rounded-xl px-4 py-3 text-xs font-mono text-text-primary outline-none"
                        />
                     </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-bright border border-border rounded-xl">
                     <div className="space-y-0.5">
                        <p className="text-xs font-bold text-text-primary uppercase tracking-tight">Active Status</p>
                        <p className="text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Enable or disable this provider integration</p>
                     </div>
                     <button
                        type="button"
                        onClick={() => setConfig({ ...config, active: !config.active })}
                        className={cn(
                           "w-11 h-6 rounded-full relative transition-all duration-300",
                           config.active ? "bg-primary" : "bg-white/5"
                        )}
                     >
                        <div className={cn(
                           "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300",
                           config.active ? "translate-x-5" : "translate-x-0"
                        )} />
                     </button>
                  </div>
               </div>

               <div className="pt-4 flex gap-4">
                  <Button type="submit" isLoading={isSubmitting} className="flex-1 py-5 rounded-2xl shadow-xl italic font-black uppercase tracking-[0.2em] text-[11px]">
                     Save Config
                  </Button>
                  <button type="button" onClick={onClose} className="px-8 py-5 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]">
                     Cancel
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
