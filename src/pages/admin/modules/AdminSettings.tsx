import { Cpu, ShieldCheck, Save } from 'lucide-react';

const AdminSettings = () => {
  return (
    <div className="space-y-12 pb-24">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">System Parameters</h1>
        <p className="text-text-secondary text-sm font-medium">Configure global platform constants and operational thresholds.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="system-card space-y-8">
           <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
              <Cpu size={18} className="text-primary" />
              Engine Configuration
           </h2>
           <div className="space-y-6">
              {[
                { label: 'Maintenance Mode', status: 'DEACTIVATED' },
                { label: 'Market Data Sync', status: 'ACTIVE' },
                { label: 'Point Engine V5', status: 'OPERATIONAL' },
                { label: 'Audit Logging', status: 'ENFORCED' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                   <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">{item.label}</span>
                   <span className="text-[10px] font-mono font-bold text-success bg-success/10 px-3 py-1 rounded-full">{item.status}</span>
                </div>
              ))}
           </div>
        </section>

        <section className="system-card space-y-8">
           <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-3">
              <ShieldCheck size={18} className="text-success" />
              Security Protocol
           </h2>
           <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Global Lock Strategy</p>
                 <p className="text-sm text-white/60 leading-relaxed font-medium">
                    All financial mutations are protected by an atomic mutex with a 30s TTL.
                 </p>
              </div>
              <div className="flex items-center gap-4">
                 <button className="flex-1 py-4 bg-white text-black font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-3">
                    <Save size={16} />
                    Sync Global State
                 </button>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default AdminSettings;
