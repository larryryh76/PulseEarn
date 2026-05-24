import React from 'react';
import {
  ShieldCheck,
  Save,
  Cpu
} from 'lucide-react';
import CardPremium from '../ui/Card';
import Button from '../ui/Button';

const SystemSettings: React.FC = () => {

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="space-y-2 text-center">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Global Protocol</h2>
        <h1 className="text-4xl font-bold tracking-tight">System Configuration</h1>
      </div>

      <div className="grid grid-cols-1 gap-8">
         <CardPremium className="p-8 bg-[#0A0A12] border-white/[0.05] space-y-8">
            <div className="flex items-center gap-3 border-b border-white/[0.05] pb-6">
               <Cpu size={20} className="text-primary" />
               <h3 className="text-sm font-bold uppercase tracking-widest">Core Economy Parameters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Daily Reward Cap (PTS)</label>
                  <input type="number" defaultValue={1000} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-primary/40" />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Min Withdrawal Threshold (PTS)</label>
                  <input type="number" defaultValue={10000} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-primary/40" />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Prediction Entry Cost (PTS)</label>
                  <input type="number" defaultValue={100} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-primary/40" />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-1">Task Verification Timeout (HRS)</label>
                  <input type="number" defaultValue={24} className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-4 py-4 text-sm text-white focus:outline-none focus:border-primary/40" />
               </div>
            </div>
         </CardPremium>

         <CardPremium className="p-8 bg-[#0A0A12] border-white/[0.05] space-y-8">
            <div className="flex items-center gap-3 border-b border-white/[0.05] pb-6">
               <ShieldCheck size={20} className="text-success" />
               <h3 className="text-sm font-bold uppercase tracking-widest">Security & Verification</h3>
            </div>

            <div className="space-y-6">
               <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/[0.05]">
                  <div className="space-y-1">
                     <p className="text-sm font-bold text-white/90">Require Email Verification</p>
                     <p className="text-[10px] text-white/30">Force users to verify identity before earning</p>
                  </div>
                  <div className="w-12 h-6 bg-primary rounded-full relative p-1 cursor-pointer">
                     <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm" />
                  </div>
               </div>

               <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.01] border border-white/[0.05]">
                  <div className="space-y-1">
                     <p className="text-sm font-bold text-white/90">Ecosystem Maintenance Mode</p>
                     <p className="text-[10px] text-white/30">Disable all reward flows for scheduled maintenance</p>
                  </div>
                  <div className="w-12 h-6 bg-white/5 rounded-full relative p-1 cursor-pointer">
                     <div className="w-4 h-4 bg-white/20 rounded-full shadow-sm" />
                  </div>
               </div>
            </div>
         </CardPremium>

         <div className="flex justify-end pt-4">
            <Button size="lg" className="px-12 gap-3" glow>
               <Save size={18} />
               Synchronize Protocols
            </Button>
         </div>
      </div>
    </div>
  );
};

export default SystemSettings;
