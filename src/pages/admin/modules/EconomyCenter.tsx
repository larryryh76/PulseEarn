import { useState } from 'react';
import {
  doc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { Settings, Save, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const EconomyCenter = () => {
  const [config, setConfig] = useState({
     referralReward: 50,
     withdrawalFloor: 10000,
     baseXpRate: 1.0,
     inflationTarget: 0.05
  });

  const handleSave = async () => {
     try {
        await setDoc(doc(db, 'system_config', 'economy'), {
           ...config,
           updatedAt: serverTimestamp(),
           updatedBy: 'ADMIN_OPERATOR'
        });
        toast.success("Economic Protocol Synchronized");
     } catch (err) { toast.error("Sync failed"); }
  };

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Economy Architecture</h1>
        <p className="text-text-secondary text-sm">Fine-tune monetary parameters and incentive structures.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

         <section className="bg-white/[0.01] border border-white/5 p-10 rounded-[3rem] space-y-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
               <Settings size={18} />
               Monetary Constants
            </h3>

            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Referral Reward (PT)</label>
                  <input
                    type="number"
                    value={config.referralReward}
                    onChange={e => setConfig({...config, referralReward: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-mono font-bold focus:border-primary/50 outline-none transition-all"
                  />
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Withdrawal Floor (PT)</label>
                  <input
                    type="number"
                    value={config.withdrawalFloor}
                    onChange={e => setConfig({...config, withdrawalFloor: parseInt(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-mono font-bold focus:border-primary/50 outline-none transition-all"
                  />
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Base XP Rate</label>
                     <input
                        type="number"
                        step="0.1"
                        value={config.baseXpRate}
                        onChange={e => setConfig({...config, baseXpRate: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-mono font-bold focus:border-primary/50 outline-none transition-all"
                     />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Inflation Target</label>
                     <input
                        type="number"
                        step="0.01"
                        value={config.inflationTarget}
                        onChange={e => setConfig({...config, inflationTarget: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xl font-mono font-bold focus:border-primary/50 outline-none transition-all"
                     />
                  </div>
               </div>

               <button
                  onClick={handleSave}
                  className="w-full py-6 bg-primary text-white font-bold uppercase tracking-[0.3em] text-[11px] rounded-[2rem] hover:bg-primary/90 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-primary/20"
               >
                  <Save size={18} />
                  Authorize Sync
               </button>
            </div>
         </section>

         <section className="space-y-8">
            <div className="bg-primary/5 border border-primary/10 p-10 rounded-[3rem]">
               <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                     <ShieldCheck size={24} />
                  </div>
                  <h3 className="font-bold">Economic Guardrails</h3>
               </div>
               <p className="text-[11px] text-white/40 leading-relaxed uppercase tracking-tighter font-medium mb-10">
                  Adjusting these parameters will immediately affect the entire ecosystem's valuation and operator incentives. Ensure all changes align with the Phase-5 stabilization targets.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-black/20 rounded-3xl border border-white/5">
                     <p className="text-[9px] font-bold text-text-secondary uppercase mb-1">Circulating PT</p>
                     <p className="text-xl font-mono font-bold">1,245,000</p>
                  </div>
                  <div className="p-6 bg-black/20 rounded-3xl border border-white/5">
                     <p className="text-[9px] font-bold text-text-secondary uppercase mb-1">Total Liability</p>
                     <p className="text-xl font-mono font-bold">$1,245.00</p>
                  </div>
               </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 p-10 rounded-[3rem]">
               <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-6">Recent Adjustments</h4>
               <div className="space-y-4">
                  {[1,2,3].map(i => (
                     <div key={i} className="flex items-center justify-between py-3 border-b border-white/5">
                        <div>
                           <p className="text-[11px] font-bold text-white/60 uppercase">Withdrawal Floor Update</p>
                           <p className="text-[9px] font-mono text-white/20 uppercase">Admin: OPERATOR-01</p>
                        </div>
                        <span className="text-[9px] font-mono text-white/20">2D AGO</span>
                     </div>
                  ))}
               </div>
            </div>
         </section>

      </div>
    </div>
  );
};

export default EconomyCenter;
