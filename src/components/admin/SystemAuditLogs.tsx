import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { db } from '../../firebase/config';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import {
  Terminal
} from 'lucide-react';
import { cn } from '../../utils';

const SystemAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Audit logs combine activities and transactions for a global view
    const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const getLogStyle = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('ban') || t.includes('flag')) return 'text-red-500 bg-red-500/5 border-red-500/10';
    if (t.includes('adjustment')) return 'text-primary bg-primary/5 border-primary/10';
    if (t.includes('reward')) return 'text-yellow-500 bg-yellow-500/5 border-yellow-500/10';
    return 'text-white/40 bg-white/[0.02] border-white/[0.05]';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 text-primary">
               <Terminal size={18} />
            </div>
            <div>
               <h1 className="text-2xl font-bold">System Audit Logs</h1>
               <p className="text-white/40 text-xs mt-1">Immutable record of all protocol executions.</p>
            </div>
         </div>
      </div>

      <Card className="p-0 overflow-hidden border-white/[0.05] bg-[#0A0A0F]">
         <div className="p-4 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Execution Log (v2.4.0)</span>
            <div className="flex gap-4">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[8px] font-bold text-white/40 uppercase">Journaling Active</span>
               </div>
            </div>
         </div>
         <div className="divide-y divide-white/[0.02]">
            {logs.map((log) => (
               <div key={log.id} className="p-4 flex items-start gap-6 hover:bg-white/[0.01] transition-colors">
                  <div className="text-[10px] font-mono text-white/10 shrink-0 w-24">
                     {log.timestamp?.toDate().toLocaleTimeString()}
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded border text-[9px] font-bold uppercase tracking-tighter shrink-0",
                    getLogStyle(log.type || '')
                  )}>
                     {log.type}
                  </div>
                  <div className="flex-1">
                     <p className="text-xs text-white/70 leading-relaxed">{log.description}</p>
                     {log.points && (
                        <span className={cn("text-[10px] font-mono font-bold mt-1 block", log.points > 0 ? "text-green-500" : "text-red-500")}>
                           {log.points > 0 ? '+' : ''}{log.points} PTS
                        </span>
                     )}
                  </div>
                  <div className="text-[9px] font-mono text-white/10">
                     SID: {log.id.slice(0,8)}
                  </div>
               </div>
            ))}
            {logs.length === 0 && (
               <div className="p-20 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/10 italic">Initializing stream...</p>
               </div>
            )}
         </div>
      </Card>
    </div>
  );
};

export default SystemAuditLogs;
