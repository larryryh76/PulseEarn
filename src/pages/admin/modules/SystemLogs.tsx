import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { FileText } from 'lucide-react';

const SystemLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'system_audit'), orderBy('timestamp', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">System Audit Ledger</h1>
        <p className="text-text-secondary text-sm">Immutable protocol events and administrative intervention history.</p>
      </header>

      <div className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <table className="w-full text-left border-collapse">
           <thead className="bg-white/5 border-b border-white/10">
              <tr>
                 <th className="p-6 data-label">Protocol Action</th>
                 <th className="p-6 data-label">Entity Ref</th>
                 <th className="p-6 data-label">Operator</th>
                 <th className="p-6 data-label text-right">Timestamp</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-white/5">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="p-6">
                     <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                        {log.action}
                     </span>
                  </td>
                  <td className="p-6">
                     <p className="text-xs font-mono text-white/60">{log.targetId}</p>
                  </td>
                  <td className="p-6 text-xs text-white/40">
                     {log.performedBy}
                  </td>
                  <td className="p-6 text-right text-[10px] font-mono text-text-secondary uppercase">
                     {log.timestamp?.toDate().toLocaleString()}
                  </td>
                </tr>
              ))}
           </tbody>
        </table>

        {logs.length === 0 && (
           <div className="py-40 text-center text-white/10">
              <FileText size={48} className="mx-auto mb-6" />
              <p className="text-xs font-bold uppercase tracking-widest">Ledger Synchronizing...</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;
