import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import {
  ShieldAlert,
  User,
  Activity,
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  Zap
} from 'lucide-react';
import { cn } from '../../utils';

const SecurityFraudHub: React.FC = () => {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snap) => {
      setAnomalies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-10 pb-20 animate-in">

      {/* Dense Operational Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="text-primary" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pr-10 border-r border-white/10">Security Infrastructure</h2>
            <div className="flex items-center gap-2 pl-2">
               <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
               <span className="text-[10px] font-bold uppercase text-rose-500 tracking-widest">Fraud Watch Active</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Security & Integrity</h1>
          <p className="text-sm text-white/40 font-medium">Real-time anomaly detection and fraud mitigation interface.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-6 py-3 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center gap-8">
              <div className="flex flex-col">
                 <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Threat Level</span>
                 <span className="text-xs font-mono font-bold text-emerald-400">LOW_RISK</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col">
                 <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Scanner Sync</span>
                 <span className="text-xs font-mono font-bold text-white/60">100%</span>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

         {/* Anomaly Stream (8 cols) */}
         <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
               <div className="flex items-center gap-3">
                  <Activity size={16} className="text-primary/40" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/60">Real-time Anomaly Stream</h3>
               </div>
               <div className="text-[10px] font-mono text-white/20 uppercase">{anomalies.length} Records in current buffer</div>
            </div>

            <div className="bg-[#08080a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
               <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                     <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Identity</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Anomaly Type</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20">Severity</th>
                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/20 text-right">Timestamp</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                     {loading ? (
                        [1,2,3].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="h-20" /></tr>)
                     ) : anomalies.length === 0 ? (
                        <tr>
                           <td colSpan={4} className="py-20 text-center">
                              <ShieldCheck size={48} className="mx-auto mb-4 opacity-5" />
                              <p className="text-sm font-bold opacity-10 uppercase tracking-widest">No Anomalies Detected</p>
                           </td>
                        </tr>
                     ) : anomalies.map((a) => (
                        <tr key={a.id} className="group hover:bg-rose-500/[0.02] transition-colors cursor-pointer">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                    <User size={14} className="text-white/20" />
                                 </div>
                                 <span className="text-xs font-mono text-white/40 group-hover:text-white transition-colors">{a.userId.slice(0, 12)}...</span>
                              </div>
                           </td>
                           <td className="px-8 py-6">
                              <span className="text-xs font-bold text-white/80 group-hover:text-rose-400 transition-colors">{a.error}</span>
                           </td>
                           <td className="px-8 py-6">
                              <div className={cn(
                                 "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border w-fit",
                                 a.severity === 'HIGH' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                              )}>
                                 {a.severity}
                              </div>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <span className="text-xs font-mono text-white/20">{a.timestamp instanceof Timestamp ? a.timestamp.toDate().toLocaleTimeString() : 'Recent'}</span>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Context & Policy (4 cols) */}
         <div className="lg:col-span-4 space-y-8">
            <div className="bg-[#08080a] border border-white/5 rounded-[2rem] p-8 space-y-8 shadow-2xl">
               <div className="flex items-center gap-3">
                  <Fingerprint size={18} className="text-primary" />
                  <h4 className="text-base font-bold uppercase tracking-tight">Scanner Systems</h4>
               </div>

               <div className="space-y-4">
                  {[
                     { label: 'Idempotency Check', status: 'ACTIVE', icon: Zap },
                     { label: 'Velocity Threshold', status: 'ACTIVE', icon: Activity },
                     { label: 'Sybil Defense', status: 'MONITORING', icon: AlertTriangle }
                  ].map((p, i) => (
                     <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                           <p.icon size={14} className="text-white/20" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{p.label}</span>
                        </div>
                        <span className={cn(
                           "text-[9px] font-black uppercase",
                           p.status === 'ACTIVE' ? "text-emerald-500" : "text-primary/60"
                        )}>{p.status}</span>
                     </div>
                  ))}
               </div>
            </div>

            <div className="bg-rose-500/[0.01] border border-rose-500/10 rounded-[2rem] p-8 space-y-4">
               <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-rose-500/40" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500/40">Integrity Notice</span>
               </div>
               <p className="text-xs text-white/30 leading-relaxed font-medium">
                  Anomalies are automatically flagged by the Point Transaction Engine v5. High severity alerts require manual intervention in the Identity Governance tab.
               </p>
            </div>
         </div>

      </div>
    </div>
  );
};

export default SecurityFraudHub;
