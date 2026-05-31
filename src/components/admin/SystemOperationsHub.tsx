import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Globe,
  Database,
  ChevronRight,
  DatabaseZap,
  Clock
} from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { SystemScannerEngine, RepairProposal } from '../../engines/system/SystemScannerEngine';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const SystemOperationsHub: React.FC = () => {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [repairQueue, setRepairQueue] = useState<RepairProposal[]>([]);
  const [logs, setLogs] = useState<any[]>([
    { timestamp: new Date(), level: 'INFO', message: 'System established.' },
    { timestamp: new Date(), level: 'AUTH', message: 'Administrator access verified. System ready.' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const qA = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(20));
    const unsubA = onSnapshot(qA, snap => setAnomalies(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qR = query(collection(db, 'system_repair_queue'), where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'), limit(10));
    const unsubR = onSnapshot(qR, snap => setRepairQueue(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));

    return () => { unsubA(); unsubR(); };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userPrompt = input;
    setInput('');
    setLogs(prev => [...prev, { timestamp: new Date(), level: 'OPERATOR', message: userPrompt }]);
    setIsProcessing(true);

    try {
      const response = await SystemScannerEngine.processCommand(userPrompt);
      setLogs(prev => [...prev, { timestamp: new Date(), level: 'SYSTEM', message: response.message }]);
    } catch (err) {
      setLogs(prev => [...prev, { timestamp: new Date(), level: 'ERROR', message: 'System process failure.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeploy = async (proposalId: string) => {
    const toastId = toast.loading('Synchronizing instruction...');
    try {
      await updateDoc(doc(db, 'system_repair_queue', proposalId), { status: 'APPROVED' });
      await SystemScannerEngine.executeInstruction(proposalId);
      toast.success('Instruction Deployed', { id: toastId });
      setLogs(prev => [...prev, { timestamp: new Date(), level: 'INFO', message: `System signature applied: ${proposalId}` }]);
    } catch (err) {
      toast.error('Deployment Failed', { id: toastId });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-24 animate-in">

      {/* System Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/[0.05] pb-10">
         <div className="space-y-2">
            <div className="flex items-center gap-3">
               <Cpu size={20} className="text-primary" />
               <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/30 pr-10 border-r border-white/10">System v5.0</h2>
               <div className="flex items-center gap-2 pl-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-widest">Core Synchronized</span>
               </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">System Management</h1>
            <p className="text-sm text-white/40 font-medium">Verified system management and active overview.</p>
         </div>

         <div className="flex items-center gap-4">
            <div className="px-4 py-2 glass-panel rounded-xl border-white/10 flex items-center gap-6">
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase text-white/20">DB Latency</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">12ms</span>
               </div>
               <div className="w-px h-6 bg-white/10" />
               <div className="flex flex-col">
                  <span className="text-[8px] font-bold uppercase text-white/20">Uptime</span>
                  <span className="text-xs font-mono font-bold text-white/80">99.99%</span>
               </div>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

         {/* Command & Repair Section (8 cols) */}
         <div className="lg:col-span-8 space-y-12">

            {/* Terminal Interface */}
            <div className="glass-panel border-white/10 rounded-[2rem] overflow-hidden flex flex-col h-[550px] shadow-2xl">
               <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                     <Terminal size={16} className="text-primary" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Active Ledger</span>
                  </div>
                  <div className="flex items-center gap-3">
                     <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[8px] font-bold uppercase">Authorized</span>
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-8 space-y-3 font-mono text-[11px] no-scrollbar bg-black/40">
                  {logs.map((l, i) => (
                    <div key={i} className="flex gap-4 group">
                       <span className="text-white/10 shrink-0 select-none">[{l.timestamp.toLocaleTimeString([], { hour12: false })}]</span>
                       <span className={cn(
                         "shrink-0 w-16 font-bold",
                         l.level === 'ERROR' ? 'text-rose-500' :
                         l.level === 'OPERATOR' ? 'text-primary' :
                         l.level === 'SYSTEM' ? 'text-emerald-500' : 'text-white/30'
                       )}>{l.level === 'OPERATOR' ? 'ADMIN' : l.level}</span>
                       <span className={cn(
                         "leading-relaxed",
                         l.level === 'OPERATOR' ? 'text-white' : 'text-white/60'
                       )}>{l.message}</span>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex gap-4 animate-pulse">
                       <span className="text-white/10">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                       <span className="text-primary font-bold w-16 uppercase">EXEC</span>
                       <span className="text-primary/60">Executing system-wide inspection and trace...</span>
                    </div>
                  )}
                  <div ref={logEndRef} />
               </div>

               <form onSubmit={handleCommand} className="p-6 border-t border-white/10 bg-black/60">
                  <div className="relative flex items-center">
                     <div className="absolute left-4 text-primary font-mono text-sm select-none">λ</div>
                     <input
                       type="text"
                       value={input}
                       onChange={e => setInput(e.target.value)}
                       placeholder="Submit system command or active query..."
                       className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-16 py-4 text-[12px] font-mono text-white focus:border-primary/50 outline-none transition-all placeholder:text-white/10"
                     />
                     <button type="submit" className="absolute right-4 p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all">
                        <ChevronRight size={14} />
                     </button>
                  </div>
               </form>
            </div>

            {/* Repair Pipeline */}
            <div className="space-y-6">
               <div className="flex items-center gap-3">
                  <DatabaseZap size={20} className="text-primary" />
                  <h3 className="text-xl font-bold tracking-tight">System Correction Pipeline</h3>
               </div>

               <div className="space-y-4">
                  {repairQueue.length === 0 ? (
                     <div className="p-16 text-center glass-panel rounded-[2.5rem] border-dashed border-white/10">
                        <CheckCircle2 size={48} className="mx-auto mb-6 text-emerald-500/20" />
                        <h4 className="text-lg font-bold opacity-30">All Systems Active</h4>
                        <p className="text-sm opacity-10 mt-2">The correction buffer is currently empty.</p>
                     </div>
                  ) : (
                    repairQueue.map((item) => (
                      <div key={item.id} className="glass-panel p-8 rounded-[2.5rem] border-white/10 hover:border-primary/20 transition-all">
                         <div className="flex items-start justify-between gap-10">
                            <div className="space-y-2">
                               <div className="flex items-center gap-3">
                                  <div className={cn(
                                     "w-2 h-2 rounded-full",
                                     item.priority === 'HIGH' ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]" : "bg-primary"
                                  )} />
                                  <h4 className="text-base font-bold text-white/90 uppercase tracking-tight">{item.title}</h4>
                               </div>
                               <p className="text-sm text-white/40 leading-relaxed font-medium">{item.description}</p>
                            </div>
                            <button
                              onClick={() => handleDeploy(item.id)}
                              className="btn-primary whitespace-nowrap bg-white text-black border-none"
                            >
                               Deploy Fix
                            </button>
                         </div>
                         <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-3">
                               <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 flex items-center gap-2">
                                  <Terminal size={10} /> Command Set
                               </span>
                               <div className="p-5 rounded-2xl bg-black/60 border border-white/5 font-mono text-[10px] text-primary/70 overflow-x-auto">
                                  {item.proposedFix}
                                </div>
                            </div>
                            <div className="flex flex-col justify-end gap-6">
                               <div className="flex items-center gap-10 text-[10px] font-bold uppercase tracking-widest text-white/30">
                                  <div className="flex items-center gap-2">
                                     <Database size={14} className="text-white/10" />
                                     <span>Module: {item.affectedSystem}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                     <ShieldCheck size={14} className="text-emerald-500/40" />
                                     <span className="text-emerald-500/40">Verified</span>
                                  </div>
                                </div>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
         </div>

         {/* Monitoring & Audit sidebar (4 cols) */}
         <div className="lg:col-span-4 space-y-10">

            {/* Real-time Security Audit */}
            <div className="glass-panel rounded-[2rem] overflow-hidden flex flex-col h-[500px]">
               <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                     <AlertCircle size={18} className="text-rose-500" />
                     <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/60 pr-10">Integrity Stream</h3>
                  </div>
                  <Clock size={14} className="text-white/20" />
               </div>
               <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05] no-scrollbar">
                  {anomalies.length === 0 ? (
                    <div className="p-16 text-center text-[10px] font-bold uppercase text-white/10">Zero anomalies in stream</div>
                  ) : (
                    anomalies.map((a) => (
                      <div key={a.id} className="p-6 space-y-3 hover:bg-rose-500/[0.01] transition-colors">
                         <div className="flex items-center justify-between">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border",
                              a.severity === 'HIGH' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                            )}>
                              {a.error}
                            </span>
                            <span className="text-[9px] font-mono text-white/20">{a.timestamp instanceof Timestamp ? a.timestamp.toDate().toLocaleTimeString([], { hour12: false }) : 'Recent'}</span>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <p className="text-[8px] font-bold uppercase text-white/10">Authorized ID</p>
                               <p className="font-mono text-[10px] text-white/40">{a.claimId.slice(0, 12)}</p>
                            </div>
                            <div className="space-y-1 text-right">
                               <p className="text-[8px] font-bold uppercase text-white/10">User UID</p>
                               <p className="font-mono text-[10px] text-primary/40">{a.userId.slice(0, 12)}</p>
                            </div>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>

            {/* Health Diagnostics */}
            <div className="glass-panel p-8 rounded-[2rem] space-y-10">
               <span className="section-label pr-10 border-b border-white/10 pb-4 block">System Diagnostics</span>
               <div className="space-y-8">
                  {[
                     { label: 'Core Integrity', val: '100.0%', color: 'primary' },
                     { label: 'Memory Persistence', val: '99.98%', color: 'primary' },
                     { label: 'Validation Sync', val: 'Synchronized', color: 'emerald-500' }
                  ].map((stat, i) => (
                     <div key={i} className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                           <span className="text-white/40">{stat.label}</span>
                           <span className={cn(stat.color === 'primary' ? "text-white" : `text-${stat.color}`)}>{stat.val}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className={cn("h-full", stat.color === 'primary' ? "bg-primary" : `bg-${stat.color}`)} />
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            <div className="p-8 glass-panel rounded-[2rem] bg-emerald-500/[0.01] border-emerald-500/10">
               <div className="flex items-center gap-3 mb-4">
                  <Globe size={16} className="text-emerald-500/40" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/40">Global Persistence</span>
               </div>
               <p className="text-xs text-white/30 leading-relaxed font-medium pr-4">
                  System state is replicated across authorized servers. Active system remains centralized in the System.
               </p>
            </div>

         </div>

      </div>
    </div>
  );
};

export default SystemOperationsHub;
