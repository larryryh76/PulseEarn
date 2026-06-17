import * as React from 'react';
import {
  Trophy,
  Settings,
  RefreshCw,
  Zap,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import toast from 'react-hot-toast';
import { db } from '../../../firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const OpsXP: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [formData, setFormData] = React.useState({
    xpPerLevel: 1000,
    predictionUnlockLevel: 5,
    minWithdrawalPoints: 10000
  });

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'system_config', 'global_v1');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            xpPerLevel: data.thresholds?.xpPerLevel || 1000,
            predictionUnlockLevel: data.thresholds?.predictionUnlockLevel || 5,
            minWithdrawalPoints: data.thresholds?.minWithdrawalPoints || 10000
          });
        }
      } catch (err) {
        toast.error("Failed to load progression config");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const docRef = doc(db, 'system_config', 'global_v1');
      await updateDoc(docRef, {
        'thresholds.xpPerLevel': formData.xpPerLevel,
        'thresholds.predictionUnlockLevel': formData.predictionUnlockLevel,
        'thresholds.minWithdrawalPoints': formData.minWithdrawalPoints,
        updatedAt: serverTimestamp()
      });
      toast.success("Progression architecture updated");
    } catch (err) {
      toast.error("Authority sync failed");
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-40">
       <RefreshCw className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <Trophy size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">XP Engine</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Configure user progression, level thresholds, and asset unlock parameters.</p>
          </div>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
             <section className="bg-surface border border-border rounded-[2.5rem] p-10 shadow-2xl space-y-10">
                <div className="flex items-center gap-3">
                   <Settings size={18} className="text-primary" />
                   <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary">Core Thresholds</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1 flex justify-between">
                         XP per Level
                         <span className="text-primary opacity-50 italic">Linear Scaling</span>
                      </label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.xpPerLevel}
                           onChange={e => setFormData({...formData, xpPerLevel: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <TrendingUp className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Market Unlock Level</label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.predictionUnlockLevel}
                           onChange={e => setFormData({...formData, predictionUnlockLevel: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <Zap className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
                      </div>
                   </div>

                   <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-tertiary ml-1">Min Withdrawal PTS</label>
                      <div className="relative group">
                         <input
                           type="number"
                           value={formData.minWithdrawalPoints}
                           onChange={e => setFormData({...formData, minWithdrawalPoints: Number(e.target.value)})}
                           className="w-full bg-surface-bright border border-border-bright rounded-2xl px-6 py-5 text-sm font-mono text-text-primary focus:border-primary/50 outline-none transition-all"
                         />
                         <ShieldCheck className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 group-focus-within:opacity-50 transition-opacity" size={16} />
                      </div>
                   </div>
                </div>

                <div className="pt-6">
                   <Button
                     onClick={handleUpdate}
                     isLoading={isUpdating}
                     className="w-full md:w-auto px-12 py-5 rounded-2xl shadow-xl font-black uppercase tracking-[0.2em] text-[10px] italic"
                   >
                      Synchronize Engine State
                   </Button>
                </div>
             </section>

             <section className="p-10 rounded-[2.5rem] bg-primary/[0.02] border border-primary/10 space-y-6 shadow-inner">
                <div className="flex items-center gap-3 text-primary">
                   <Info size={16} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest">Operational Briefing</h3>
                </div>
                <p className="text-xs text-text-tertiary leading-relaxed font-medium">
                   Modifying the <span className="text-primary font-bold italic">XP per Level</span> constant will immediately shift the leveling curve for all active users.
                   The <span className="text-primary font-bold italic">Market Unlock Level</span> restricts capital execution access to users who have reached the designated tier.
                </p>
             </section>
          </div>

          <div className="space-y-8">
             <div className="p-8 rounded-[2rem] bg-surface border border-border shadow-2xl space-y-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Progression Matrix</h3>
                <div className="space-y-4">
                   {[1, 5, 10, 25, 50].map((lvl) => (
                      <div key={lvl} className="p-5 rounded-2xl bg-surface-bright/50 border border-border flex items-center justify-between group">
                         <div>
                            <p className="text-[9px] font-black text-text-tertiary uppercase mb-1">LVL {lvl} Goal</p>
                            <p className="text-sm font-mono font-bold text-text-primary">{(lvl * formData.xpPerLevel).toLocaleString()} XP</p>
                         </div>
                         <ChevronRight size={14} className="opacity-20 group-hover:translate-x-1 group-hover:opacity-100 transition-all text-primary" />
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default OpsXP;
