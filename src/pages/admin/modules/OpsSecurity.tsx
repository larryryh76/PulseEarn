import * as React from 'react';
import {
  ShieldAlert,
  User,
  Zap,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  where,
  onSnapshot
} from 'firebase/firestore';
import { cn } from '../../../utils';

const OpsSecurity: React.FC = () => {
  const [anomalies, setAnomalies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterSeverity, setFilterSeverity] = React.useState<string>('ALL');

  React.useEffect(() => {
    let q = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(50));

    if (filterSeverity !== 'ALL') {
       q = query(
         collection(db, 'system_anomalies'),
         where('severity', '==', filterSeverity),
         orderBy('timestamp', 'desc'),
         limit(50)
       );
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      setAnomalies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, [filterSeverity]);

  return (
    <div className="space-y-12">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <ShieldAlert size={20} className="text-danger" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic text-white">Threat Stream</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Real-time identification of system anomalies and economic integrity threats.</p>
          </div>

          <div className="flex items-center gap-3">
             <select
               value={filterSeverity}
               onChange={e => setFilterSeverity(e.target.value)}
               className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-sm text-white/60 focus:border-primary/50 outline-none appearance-none font-bold uppercase tracking-widest cursor-pointer"
             >
                <option value="ALL">ALL SEVERITY</option>
                <option value="HIGH">HIGH SEVERITY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
             </select>
             <div className="px-4 py-2.5 rounded-xl bg-success/5 border border-success/10 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-bold text-success uppercase tracking-widest">Active Perimeter</span>
             </div>
          </div>
       </header>

       <div className="space-y-4">
          {loading ? (
             [1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse" />)
          ) : anomalies.length > 0 ? (
             anomalies.map((ano) => (
                <div key={ano.id} className={cn(
                  "p-8 rounded-[2rem] border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group relative overflow-hidden shadow-2xl",
                  ano.severity === 'HIGH' ? "bg-danger/[0.03] border-danger/20 hover:border-danger/40" : "bg-[#0A0A0F] border-white/5 hover:border-white/10"
                )}>
                   <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                        ano.severity === 'HIGH' ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                      )}>
                         <ShieldAlert size={24} />
                      </div>
                      <div>
                         <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-white uppercase tracking-tight italic">{ano.error}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] border",
                              ano.severity === 'HIGH' ? "bg-danger/20 text-danger border-danger/20" : "bg-warning/20 text-warning border-warning/20"
                            )}>
                               {ano.severity}
                            </span>
                         </div>
                         <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-white/20 uppercase tracking-widest font-bold">
                            <div className="flex items-center gap-1.5"><User size={10} /> User: {ano.userId?.slice(0, 16)}...</div>
                            <div className="w-1 h-1 rounded-full bg-white/5" />
                            <div className="flex items-center gap-1.5 text-primary"><Zap size={10} /> Vector: {ano.context || 'UNIDENTIFIED'}</div>
                            <div className="w-1 h-1 rounded-full bg-white/5" />
                            <div className="flex items-center gap-1.5"><Clock size={10} /> {ano.timestamp?.toDate?.()?.toLocaleString()}</div>
                         </div>
                      </div>
                   </div>
                </div>
             ))
          ) : (
             <div className="py-40 text-center border border-dashed border-white/10 rounded-[3rem] bg-[#0A0A0F] opacity-40">
                <ShieldCheck size={48} className="mx-auto text-success/40 mb-6" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Platform Secured</h3>
                <p className="text-[10px] font-mono text-white/10 uppercase tracking-widest mt-2">Zero active anomalies detected in current cycle</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default OpsSecurity;
