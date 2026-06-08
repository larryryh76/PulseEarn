import * as React from "react";
import {
  FileText,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

const AdminAudit = () => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'system_audit'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Audit logs fetch failed:", error);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter((log: any) =>
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Logs</h1>
          <p className="text-text-secondary text-sm font-medium">Chronological record of all administrative operations.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by Action or ID..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
            />
          </div>
          <button className="px-6 py-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
            <Filter size={16} />
            Log Filters
          </button>
        </div>
      </header>

            <div className="lg:hidden space-y-4">
        {loading ? (
          [1,2,3].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl animate-pulse" />)
        ) : logs.length > 0 ? (
          logs.map((log: any) => (
            <div key={log.id} className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 space-y-4">
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">{log.action?.replace(/_/g, ' ')}</p>
                     <p className="text-[9px] font-mono text-white/40">{log.timestamp?.toDate ? (log.timestamp?.toDate?.()?.toLocaleString() || "N/A") : log.timestamp?.toLocaleString?.() || 'N/A'}</p>
                  </div>
                  <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-white/40 uppercase">{log.performedBy || 'System'}</span>
               </div>
               <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-[10px] text-white/60 leading-relaxed font-medium">Target: {log.targetId || 'N/A'}</p>
               </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-3xl">
             <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">No logs</p>
          </div>
        )}
      </div>

        <div className="hidden lg:block bg-white/[0.01] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Timestamp</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary">Action</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest text-text-secondary text-right">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={2} className="p-8"><div className="h-4 bg-white/5 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-8">
                       <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
                          <Calendar size={12} />
                          {log.timestamp?.toDate ? (log.timestamp?.toDate?.()?.toLocaleString() || "N/A") : log.timestamp?.toLocaleString?.() || 'N/A'}
                       </div>
                    </td>
                    <td className="p-8">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          <span className="text-[11px] font-bold uppercase tracking-widest text-white">{log.action?.replace(/_/g, ' ')}</span>
                       </div>
                    </td>
                    <td className="p-8 text-right">
                       <span className="text-[10px] font-mono font-bold text-white/60">{log.performedBy || 'SYSTEM'}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="p-24 text-center">
                    <FileText size={48} className="mx-auto text-white/5 mb-6" />
                    <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">No audit records available</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAudit;
