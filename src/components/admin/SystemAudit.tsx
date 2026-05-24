import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import CardPremium from '../ui/Card';
import { Shield, AlertTriangle, CheckCircle2, Terminal } from 'lucide-react';
import { SecurityEngine } from '../../engines/security/SecurityEngine';

const SystemAudit: React.FC = () => {
  const [findings, setFindings] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    // Initial scan report
    SecurityEngine.runFullSecurityScan().then(setFindings);

    // Live logs (placeholder for now)
    const q = query(collection(db, 'securityAuditLogs'), orderBy('scannedAt', 'desc'), limit(20));
    return onSnapshot(q, (snapshot) => {
       setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  return (
    <div className="space-y-8 pb-20">
      <div className="space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Protocol Integrity</h2>
        <h1 className="text-3xl font-bold">System Audit & Security</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            {findings.map((f) => (
               <CardPremium key={f.id} className="p-6 bg-[#0A0A15] border-white/[0.05] flex items-start gap-5">
                  <div className={`p-3 rounded-2xl bg-white/[0.02] border border-white/[0.05] ${
                     f.severity === 'CRITICAL' || f.severity === 'MEDIUM' ? 'text-orange-500' : 'text-primary'
                  }`}>
                     {f.status === 'RESOLVED' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                  </div>
                  <div className="flex-1 space-y-1">
                     <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white/90">{f.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                           f.severity === 'LOW' ? 'border-primary/20 text-primary' : 'border-orange-500/20 text-orange-500'
                        }`}>
                           {f.severity}
                        </span>
                     </div>
                     <p className="text-xs text-white/40 leading-relaxed">{f.description}</p>
                     <div className="flex items-center gap-4 text-[9px] font-bold text-white/20 uppercase tracking-widest pt-3">
                        <span>Category: {f.category}</span>
                        <span>•</span>
                        <span className={f.status === 'RESOLVED' ? 'text-success' : 'text-primary'}>
                           Status: {f.status}
                        </span>
                     </div>
                  </div>
               </CardPremium>
            ))}
         </div>

         <div className="space-y-6">
            <CardPremium className="p-6 bg-[#05050A] border-white/[0.05]">
               <div className="flex items-center gap-3 mb-6">
                  <Terminal size={18} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">Audit Trail</h3>
               </div>
               <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] space-y-2">
                       <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-primary">{log.type}</span>
                          <span className="text-white/20">
                             {log.scannedAt?.toDate().toLocaleTimeString()}
                          </span>
                       </div>
                       <p className="text-[10px] text-white/40 italic">System integrity scan complete. {log.findings?.length} records validated.</p>
                    </div>
                  ))}
               </div>
            </CardPremium>

            <CardPremium className="p-6 bg-[#0A0A15] border-white/[0.05] space-y-4">
               <div className="flex items-center gap-3 mb-2">
                  <Shield size={18} className="text-success" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">Secure Nodes</h3>
               </div>
               <p className="text-xs text-white/40 leading-relaxed">System-wide secret encryption and environment decoupling is active.</p>
               <div className="flex items-center gap-2 text-[10px] font-bold text-success uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  Ecosystem Hardened
               </div>
            </CardPremium>
         </div>
      </div>
    </div>
  );
};

export default SystemAudit;
