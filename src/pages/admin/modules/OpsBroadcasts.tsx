import * as React from 'react';
import {
  Bell,
  Plus,
  ShieldAlert,
  Send,
  Info,
  Globe,
  X,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { BroadcastEngine } from '../../../engines/system/BroadcastEngine';
import { cn } from '../../../utils';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';

const OpsBroadcasts: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    type: 'system' as 'system' | 'reward' | 'alert'
  });

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return toast.error('Authority requires complete signal data');

    setSubmitting(true);
    try {
      await BroadcastEngine.broadcastGlobal(formData.title, formData.description, formData.type);
      toast.success("Global Signal Synchronized");
      setIsModalOpen(false);
      setFormData({ title: '', description: '', type: 'system' });
    } catch (err) {
      toast.error("Deployment sequence failure");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3 text-primary">
                <Bell size={20} />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-text-primary">Broadcast Hub</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Global synchronization of platform announcements and critical system alerts.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-8 py-3 bg-primary text-text-primary rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0"
          >
             <Plus size={18} />
             Create Signal
          </button>
       </header>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: 'System Emergency', desc: 'Critical infrastructure or maintenance alerts.', icon: ShieldAlert, color: 'text-danger', bg: 'bg-danger/10', type: 'alert' },
            { title: 'Campaign Intel', desc: 'Strategic deployment of new reward campaigns.', icon: Send, color: 'text-primary', bg: 'bg-primary/10', type: 'system' },
            { title: 'Economic Event', desc: 'Alert users to bonus yield or point multipliers.', icon: Info, color: 'text-warning', bg: 'bg-warning/10', type: 'reward' },
          ].map((tpl) => (
            <div
              key={tpl.title}
              onClick={() => { setFormData({ title: tpl.title, description: '', type: tpl.type as any }); setIsModalOpen(true); }}
              className="bg-surface border border-border p-10 rounded-[2.5rem] hover:border-primary/20 transition-all cursor-pointer group shadow-2xl relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><tpl.icon size={80} /></div>
               <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-all group-hover:scale-110 shadow-inner", tpl.bg, tpl.color)}>
                  <tpl.icon size={28} />
               </div>
               <h3 className="text-lg font-bold text-text-primary uppercase tracking-tight italic mb-3 group-hover:text-primary transition-colors">{tpl.title}</h3>
               <p className="text-xs text-text-tertiary font-medium leading-relaxed">{tpl.desc}</p>
            </div>
          ))}
       </div>

       <div className="space-y-8 pt-8 border-t border-border">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-text-tertiary flex items-center gap-3">
                <Globe size={18} className="text-indigo-400" />
                Transmission Stream
             </h2>
             <span className="text-[10px] font-mono text-text-tertiary/50 uppercase tracking-widest">Global Broadcast Sync Active</span>
          </div>

          <div className="py-40 text-center bg-surface border border-dashed border-border-bright rounded-[3rem] shadow-inner opacity-40 group hover:opacity-100 transition-opacity">
             <div className="w-20 h-20 rounded-full border border-dashed border-border-bright mx-auto flex items-center justify-center mb-6 group-hover:border-primary/20 transition-all">
                <Bell size={40} className="text-text-primary/5 group-hover:text-primary/20 transition-all duration-700" />
             </div>
             <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary mb-2">No active broadcasts</h3>
             <p className="text-[10px] font-mono text-text-tertiary/50 uppercase tracking-widest">All communication channels currently silent</p>
          </div>
       </div>

       <AnimatePresence>
          {isModalOpen && (
             <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-xl p-6">
                <motion.div
                   initial={{ opacity: 0, scale: 0.95, y: 30 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.95, y: 30 }}
                   className="relative w-full max-w-xl bg-surface border border-border-bright rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden"
                >
                   <div className="p-10 border-b border-border flex justify-between items-center bg-surface-bright/50">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xl">
                            <Send size={28} />
                         </div>
                         <div>
                            <h2 className="text-2xl font-bold tracking-tight uppercase italic leading-none mb-2">Signal Dispatch</h2>
                            <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none">Authorized Platform Communication Action</p>
                         </div>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 hover:bg-surface-bright rounded-xl transition-all flex items-center justify-center text-text-tertiary"><X size={24} /></button>
                   </div>

                   <form onSubmit={handleBroadcast} className="p-10 space-y-8">
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Signal Title</label>
                         <input
                           required
                           value={formData.title}
                           onChange={e => setFormData({...formData, title: e.target.value})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl p-5 text-sm text-text-primary focus:border-primary/50 outline-none transition-all font-bold uppercase italic tracking-tight"
                           placeholder="Signal Identifier..."
                         />
                      </div>
                      <div className="space-y-2.5">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Transmission Data</label>
                         <textarea
                           required
                           value={formData.description}
                           onChange={e => setFormData({...formData, description: e.target.value})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl p-6 text-sm text-text-primary h-40 resize-none focus:border-primary/50 outline-none transition-all font-medium leading-relaxed shadow-inner"
                           placeholder="Enter payload content for global distribution..."
                         />
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary ml-1">Dispatch Hub</label>
                         <div className="flex gap-3">
                            {['system', 'reward', 'alert'].map(type => (
                               <button
                                 key={type}
                                 type="button"
                                 onClick={() => setFormData({...formData, type: type as any})}
                                 className={cn(
                                    "flex-1 py-4 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                                    formData.type === type ? "bg-primary border-primary text-text-primary shadow-lg shadow-primary/20" : "bg-surface-bright border-border text-text-tertiary hover:text-text-primary"
                                 )}
                               >
                                  {type}
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="p-6 bg-surface-bright/50 border border-border rounded-2xl flex items-center gap-4">
                         <ShieldCheck size={24} className="text-success" />
                         <p className="text-[10px] text-text-tertiary font-medium leading-relaxed italic uppercase tracking-widest">Broadcast will synchronize across all active platform nodes instantly.</p>
                      </div>

                      <div className="pt-4 flex gap-4">
                         <Button
                           disabled={submitting}
                           type="submit"
                           className="flex-1 py-6 rounded-2xl shadow-2xl italic font-black uppercase tracking-[0.3em] text-[11px]"
                         >
                            {submitting ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} className="mr-2" /> Deploy Global Signal</>}
                         </Button>
                         <button
                           type="button"
                           onClick={() => setIsModalOpen(false)}
                           className="px-10 py-6 rounded-2xl bg-surface-bright border border-border-bright text-text-tertiary hover:text-text-primary transition-colors font-black uppercase tracking-widest text-[10px]"
                         >
                            Abort
                         </button>
                      </div>
                   </form>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};

export default OpsBroadcasts;
