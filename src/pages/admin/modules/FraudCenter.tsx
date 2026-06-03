import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../utils';

const FraudCenter = () => {
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      setAnomalies(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Fraud Intelligence</h1>
        <p className="text-text-secondary text-sm">Real-time monitoring of suspicious patterns and policy violations.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
         {anomalies.map(ano => (
            <div key={ano.id} className="bg-danger/[0.02] border border-danger/20 p-8 rounded-[2.5rem] flex items-center justify-between group hover:bg-danger/[0.04] transition-all">
               <div className="flex items-center gap-8">
                  <div className="p-4 bg-danger/10 text-danger rounded-2xl border border-danger/20">
                     <ShieldAlert size={28} />
                  </div>
                  <div>
                     <p className="text-lg font-bold text-white mb-1">{ano.error}</p>
                     <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Operator</span>
                           <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">{ano.userId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Severity</span>
                           <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded", ano.severity === 'HIGH' ? 'bg-danger text-white' : 'bg-warning text-black')}>
                              {ano.severity}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-mono text-white/20 mb-4 uppercase">{ano.timestamp?.toDate().toLocaleString()}</p>
                  <div className="flex gap-2">
                     <button className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Investigate</button>
                     <button className="p-2.5 rounded-xl bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 transition-all"><ShieldAlert size={18} /></button>
                  </div>
               </div>
            </div>
         ))}

         {anomalies.length === 0 && (
            <div className="py-40 text-center border border-dashed border-white/5 rounded-[3rem] bg-black/20">
               <CheckCircle2 size={48} className="mx-auto text-success/20 mb-6" />
               <p className="text-text-secondary text-xs font-bold uppercase tracking-[0.2em]">Security Protocol Nominal // No Anomalies</p>
            </div>
         )}
      </div>
    </div>
  );
};

export default FraudCenter;
