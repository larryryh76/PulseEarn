import * as React from "react";
import {
  Bell,
  Send,
  Info,
  ShieldAlert,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { cn } from '../../../utils';
import { BroadcastEngine } from '../../../engines/system/BroadcastEngine';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AdminBroadcasts = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    type: 'system' as 'system' | 'reward' | 'alert'
  });

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await BroadcastEngine.broadcastGlobal(formData.title, formData.description, formData.type);
      toast.success("Notification sent successfully.");
      setIsModalOpen(false);
      setFormData({ title: '', description: '', type: 'system' });
    } catch (err) {
      toast.error("Failed to deploy broadcast.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Broadcast Center</h1>
          <p className="text-text-secondary text-sm font-medium">Broadcast platform-wide communications, alerts, and campaign notifications.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-3.5 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} />
          Create Broadcast
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'System Alert', desc: 'Critical infrastructure status update.', icon: ShieldAlert, color: 'text-danger', bg: 'bg-danger/10', type: 'alert' },
          { title: 'Campaign Launch', desc: 'Notify users of a new strategic opportunity.', icon: Send, color: 'text-primary', bg: 'bg-primary/10', type: 'system' },
          { title: 'Reward Event', desc: 'Alert users to bonus point multipliers.', icon: Info, color: 'text-warning', bg: 'bg-warning/10', type: 'reward' },
        ].map((tpl) => (
          <div
            key={tpl.title}
            onClick={() => {
              setFormData({ title: tpl.title, description: '', type: tpl.type as any });
              setIsModalOpen(true);
            }}
            className="bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] hover:border-primary/20 transition-all cursor-pointer group"
          >
             <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", tpl.bg, tpl.color)}>
                <tpl.icon size={24} />
             </div>
             <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2">{tpl.title}</h3>
             <p className="text-xs text-text-secondary font-medium leading-relaxed">{tpl.desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6 pt-8 border-t border-white/5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-3">
           <Bell size={18} className="text-accent" />
           Communication Stream
        </h2>
        <div className="py-32 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
           <Bell size={48} className="mx-auto text-white/5 mb-6" />
           <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-2">No active broadcasts</h3>
           <p className="text-xs text-white/20">All communication nodes are currently silent.</p>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[3rem] p-10 shadow-2xl">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold tracking-tight">New Broadcast</h2>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg"><X size={20} /></button>
               </div>

               <form onSubmit={handleBroadcast} className="space-y-6">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Title</label>
                     <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm" placeholder="Global Alert Subject" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Message Content</label>
                     <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm h-32 resize-none" placeholder="Enter broadcast details..." />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Alert Category</label>
                     <div className="flex gap-2">
                        {['system', 'reward', 'alert'].map(type => (
                           <button
                             key={type}
                             type="button"
                             onClick={() => setFormData({...formData, type: type as any})}
                             className={cn(
                                "flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                                formData.type === type ? "bg-primary border-primary text-white" : "bg-white/5 border-white/5 text-white/40 hover:text-white"
                             )}
                           >
                              {type}
                           </button>
                        ))}
                     </div>
                  </div>
                  <button
                    disabled={submitting}
                    className="w-full py-5 bg-white text-black font-bold uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                     {submitting ? <Loader2 className="animate-spin" size={16} /> : <><Send size={16} /> Broadcast Notification</>}
                  </button>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBroadcasts;
