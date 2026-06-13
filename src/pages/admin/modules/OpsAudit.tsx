import * as React from 'react';
import {
  FileText,
  Search,
  Lock,
  ShieldCheck,
  User,
  Database
} from 'lucide-react';
import { db } from '../../../firebase/config';
import {
  query,
  collection,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';

const OpsAudit: React.FC = () => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const q = query(collection(db, 'system_audit'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filtered = logs.filter(log =>
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.targetId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.performedBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
       {/* COMMAND HEADER */}
       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
             <div className="flex items-center gap-3">
                <FileText size={20} className="text-primary" />
                <h1 className="text-3xl font-bold tracking-tight uppercase italic">Audit Logs</h1>
             </div>
             <p className="text-xs font-medium text-text-tertiary">Immutable administrative activity record and system mutation history.</p>
          </div>

          <div className="relative group w-full md:w-96">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
             <input
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               placeholder="Scan logs by Action, Admin or User ID..."
               className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-sm focus:border-primary/50 outline-none transition-all font-medium"
             />
          </div>
       </header>

       {/* AUDIT TABLE */}
       <div className="bg-[#0A0A0F] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-white/[0.02] border-b border-white/5 whitespace-nowrap">
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Mutation Event</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Authorized By</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Target Node</th>
                      <th className="p-8 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 text-right">Timestamp</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                   {loading ? (
                      [1,2,3,4,5,6,7,8].map(i => <tr key={i} className="animate-pulse"><td colSpan={4} className="p-10"><div className="h-4 bg-white/5 rounded w-full" /></td></tr>)
                   ) : filtered.map((log) => (
                      <tr key={log.id} className="group hover:bg-white/[0.01] transition-colors whitespace-nowrap">
                         <td className="p-8">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20 group-hover:text-primary transition-all">
                                  <Lock size={18} />
                               </div>
                               <div>
                                  <p className="text-sm font-bold text-white uppercase italic tracking-tight">{log.action?.replace(/_/g, ' ')}</p>
                                  <p className="text-[9px] font-mono text-white/20 mt-1 uppercase tracking-widest">Hash: {log.id.slice(0, 12).toUpperCase()}</p>
                               </div>
                            </div>
                         </td>
                         <td className="p-8">
                            <div className="flex items-center gap-2">
                               <ShieldCheck size={12} className="text-primary" />
                               <span className="text-[10px] font-black text-white/60 uppercase tracking-widest italic">{log.performedBy || 'OPS_SYSTEM'}</span>
                            </div>
                         </td>
                         <td className="p-8">
                            <div className="flex items-center gap-2">
                               <User size={12} className="text-white/20" />
                               <span className="text-[10px] font-mono text-white/40 uppercase">ID: {log.targetId?.slice(0, 16) || 'GLOBAL'}</span>
                            </div>
                         </td>
                         <td className="p-8 text-right">
                            <div className="flex flex-col items-end">
                               <p className="text-[10px] font-mono text-white/40">{log.timestamp?.toDate?.()?.toLocaleDateString()}</p>
                               <p className="text-[9px] font-mono text-white/20 uppercase mt-0.5">{log.timestamp?.toDate?.()?.toLocaleTimeString()}</p>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          {filtered.length === 0 && !loading && (
             <div className="py-40 text-center border-t border-white/5">
                <Database size={48} className="mx-auto text-white/5 mb-6" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">Audit Trail Clear</p>
             </div>
          )}
       </div>
    </div>
  );
};

export default OpsAudit;
