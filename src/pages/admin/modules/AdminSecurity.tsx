import * as React from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Clock
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { cn } from '../../../utils';

const AdminSecurity = () => {
  const [anomalies, setAnomalies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAnomalies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Anomalies fetch failed:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Security Hub</h1>
          <p className="text-text-secondary text-sm font-medium">Real-time threat monitoring and behavioral detection.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success/5 border border-success/10">
              <ShieldCheck size={16} className="text-success" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-success">Guardian Active</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-danger/5 border border-danger/10 p-8 rounded-[2.5rem]">
           <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-bold text-danger uppercase tracking-[0.2em]">Pending Alerts</p>
              <AlertTriangle className="text-danger" size={24} />
           </div>
           <p className="text-4xl font-mono font-bold text-white">{anomalies.filter((a: any) => a.severity === 'HIGH').length}</p>
           <p className="text-[10px] text-danger/40 mt-2 font-bold uppercase tracking-widest">High Severity Incidents</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Integrity Level</p>
              <ShieldCheck className="text-success" size={24} />
           </div>
           <p className="text-4xl font-mono font-bold text-white">99.8%</p>
           <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">Global Ecosystem Health</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem]">
           <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Filtered Requests</p>
              <Activity className="text-primary" size={24} />
           </div>
           <p className="text-4xl font-mono font-bold text-white">1,242</p>
           <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">Bot Mitigation Actions (24h)</p>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white/40 flex items-center gap-3">
           <Activity size={18} className="text-primary" />
           Live Threat Stream
        </h2>
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-white/5 rounded-[2rem] animate-pulse" />)
        ) : anomalies.length > 0 ? (
          anomalies.map((ano: any) => (
            <div key={ano.id} className={cn(
              "p-8 rounded-[2.5rem] border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all group",
              ano.severity === 'HIGH' ? "bg-danger/5 border-danger/10 hover:border-danger/30" : "bg-white/[0.01] border-white/5 hover:border-white/10"
            )}>
               <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    ano.severity === 'HIGH' ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                  )}>
                     <ShieldAlert size={24} />
                  </div>
                  <div>
                     <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-white">{ano.error}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border",
                          ano.severity === 'HIGH' ? "bg-danger/20 text-danger border-danger/20" : "bg-warning/20 text-warning border-warning/20"
                        )}>
                           {ano.severity}
                        </span>
                     </div>
                     <div className="flex items-center gap-4 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                        <span>Operator: {ano.userId?.slice(0, 16)}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><Clock size={10} /> {ano.timestamp?.toDate().toLocaleString()}</span>
                     </div>
                  </div>
               </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
             <ShieldCheck size={48} className="mx-auto text-success/20 mb-6" />
             <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary mb-2">Perimeter Secure</h3>
             <p className="text-xs text-white/20">No suspicious activity detected within current monitoring window.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSecurity;
