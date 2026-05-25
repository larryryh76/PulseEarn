import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Send,
  Box,
  Layout,
  Activity,
  FileText
} from 'lucide-react';
import CardPremium from '../ui/Card';
import Button from '../ui/Button';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { SystemScannerEngine, RepairProposal } from '../../engines/system/SystemScannerEngine';
import toast from 'react-hot-toast';
import { cn } from '../../utils';

const SystemOperationsHub: React.FC = () => {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [repairQueue, setRepairQueue] = useState<RepairProposal[]>([]);
  const [logs, setLogs] = useState<any[]>([
    { timestamp: new Date(), level: 'INFO', message: 'Industrial Operator Interface initialized.' },
    { timestamp: new Date(), level: 'INFO', message: 'Ecosystem authority established. Awaiting input.' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Real-time Anomaly Feed
    const qA = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(20));
    const unsubA = onSnapshot(qA, snap => setAnomalies(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // 2. Real-time Repair Queue
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
    setLogs(prev => [...prev, { timestamp: new Date(), level: 'USER', message: userPrompt }]);
    setIsProcessing(true);

    try {
      const response = await SystemScannerEngine.processCommand(userPrompt);
      setLogs(prev => [...prev, { timestamp: new Date(), level: 'SYS', message: response.message }]);
    } catch (err) {
      setLogs(prev => [...prev, { timestamp: new Date(), level: 'ERR', message: 'Protocol error during command execution.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeploy = async (proposalId: string) => {
    const toastId = toast.loading('Executing approved instruction...');
    try {
      await updateDoc(doc(db, 'system_repair_queue', proposalId), { status: 'APPROVED' });
      await SystemScannerEngine.executeInstruction(proposalId);
      toast.success('Execution Successful', { id: toastId });
      setLogs(prev => [...prev, { timestamp: new Date(), level: 'INFO', message: `Deployed fix: ${proposalId}` }]);
    } catch (err) {
      toast.error('Execution Failed', { id: toastId });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Activity size={24} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">Infrastructure Management</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-white">Operations Control</h1>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
           <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Node Status: Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: INDUSTRIAL TERMINAL */}
        <div className="lg:col-span-2 space-y-8">
           <CardPremium className="p-0 overflow-hidden bg-black border-white/[0.05] h-[600px] flex flex-col rounded-xl">
              <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.02]">
                 <div className="flex items-center gap-3">
                    <Terminal size={16} className="text-primary" />
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/70">System Ledger Output</h3>
                 </div>
                 <div className="flex items-center gap-4 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                    <span>SYS-OPS-v5.0</span>
                    <span className="text-success">Live</span>
                 </div>
              </div>

              {/* Console Output */}
              <div className="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-[11px] custom-scrollbar bg-[#050505]">
                 {logs.map((l, i) => (
                   <div key={i} className="flex gap-4 group">
                      <span className="text-white/20 shrink-0">[{l.timestamp.toLocaleTimeString()}]</span>
                      <span className={cn(
                        "shrink-0 w-10 font-bold",
                        l.level === 'ERR' ? 'text-danger' :
                        l.level === 'USER' ? 'text-primary' :
                        l.level === 'SYS' ? 'text-success' : 'text-white/40'
                      )}>{l.level}</span>
                      <span className={cn(
                        l.level === 'USER' ? 'text-white' : 'text-white/60'
                      )}>{l.message}</span>
                   </div>
                 ))}
                 {isProcessing && (
                   <div className="flex gap-4 animate-pulse">
                      <span className="text-white/20">[{new Date().toLocaleTimeString()}]</span>
                      <span className="text-primary font-bold">PROC</span>
                      <span className="text-primary/60">Executing complex analysis...</span>
                   </div>
                 )}
                 <div ref={logEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleCommand} className="p-4 border-t border-white/[0.05] bg-white/[0.02]">
                 <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-mono text-sm">{'>'}</div>
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Enter operational command..."
                      className="w-full bg-black border border-white/[0.1] rounded-lg pl-10 pr-12 py-3 text-[12px] font-mono text-white focus:outline-none focus:border-primary/50 transition-all"
                    />
                    <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                       <Send size={14} />
                    </button>
                 </div>
              </form>
           </CardPremium>

           {/* DEPLOYMENT PIPELINE */}
           <CardPremium className="p-0 overflow-hidden bg-white/[0.01] border-white/[0.05] rounded-xl">
              <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Box size={18} className="text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Repair Pipeline</h3>
                 </div>
                 <div className="px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary text-[9px] font-bold">
                    {repairQueue.length} PENDING INSTRUCTIONS
                 </div>
              </div>
              <div className="divide-y divide-white/[0.03]">
                 {repairQueue.length === 0 ? (
                   <div className="p-16 text-center">
                      <CheckCircle2 size={40} className="mx-auto mb-4 text-white/[0.03]" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">Infrastructure Status: Nominal</p>
                   </div>
                 ) : (
                   repairQueue.map((item) => (
                     <div key={item.id} className="p-8 hover:bg-white/[0.01] transition-all">
                        <div className="flex items-start justify-between mb-6">
                           <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    item.priority === 'HIGH' ? 'bg-orange-500' : 'bg-primary'
                                 )} />
                                 <h4 className="text-sm font-bold text-white/90 uppercase tracking-tight">{item.title}</h4>
                              </div>
                              <p className="text-xs text-white/40 leading-relaxed max-w-2xl">{item.description}</p>
                           </div>
                           <Button size="sm" onClick={() => handleDeploy(item.id)} className="bg-white text-black hover:bg-white/90 text-[10px] h-9 px-6 font-bold uppercase tracking-widest">
                              Authorize
                           </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/[0.05]">
                           <div className="space-y-3">
                              <div className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-widest">
                                 <Terminal size={10} /> Proposed Instruction
                              </div>
                              <div className="p-4 rounded bg-black border border-white/[0.05] font-mono text-[10px] text-primary/80 overflow-x-auto">
                                 {item.proposedFix}
                              </div>
                           </div>
                           <div className="flex flex-col justify-end gap-4">
                              <div className="flex items-center gap-6 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                                 <div className="flex items-center gap-2">
                                    <Layout size={12} className="text-white/20" />
                                    <span>Scope: {item.affectedSystem}</span>
                                 </div>
                                 <div className="flex items-center gap-2">
                                    <ShieldCheck size={12} className="text-success/50" />
                                    <span className="text-success/50">Validated</span>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </CardPremium>
        </div>

        {/* RIGHT: AUDIT FEED */}
        <div className="space-y-8">
           <CardPremium className="p-0 overflow-hidden bg-black border-white/[0.05] h-[550px] flex flex-col rounded-xl">
              <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
                 <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="text-orange-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Security Audit</h3>
                 </div>
                 <FileText size={14} className="text-white/20" />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] custom-scrollbar">
                 {anomalies.length === 0 ? (
                   <div className="p-12 text-center text-white/10 text-[10px] font-bold uppercase tracking-widest">Clear Audit Log</div>
                 ) : (
                   anomalies.map((a) => (
                     <div key={a.id} className="p-5 space-y-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between">
                           <span className={cn(
                             "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                             a.severity === 'HIGH' ? "bg-danger/10 text-danger border border-danger/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                           )}>
                             {a.error}
                           </span>
                           <span className="text-[9px] font-mono text-white/20">{a.timestamp?.toDate().toLocaleTimeString()}</span>
                        </div>
                        <div className="space-y-1">
                           <div className="text-[10px] text-white/40 flex justify-between">
                              <span className="uppercase tracking-widest font-bold">Resource</span>
                              <span className="font-mono text-white/60">{a.claimId.slice(0, 8)}...</span>
                           </div>
                           <div className="text-[10px] text-white/40 flex justify-between">
                              <span className="uppercase tracking-widest font-bold">Subject</span>
                              <span className="font-mono text-primary/60">{a.userId.slice(0, 8)}...</span>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </CardPremium>

           <CardPremium className="p-6 bg-white/[0.01] border-white/[0.05] rounded-xl">
              <div className="flex items-center justify-between mb-8">
                 <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Health Diagnostics</h4>
                 <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    <span className="text-[9px] font-bold text-primary uppercase">v5.0</span>
                 </div>
              </div>
              <div className="space-y-8">
                 <div className="space-y-3">
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Consistency</span>
                       <span className="text-[11px] font-mono text-white">100.0%</span>
                    </div>
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-primary" />
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div className="flex justify-between items-end">
                       <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Sync Latency</span>
                       <span className="text-[11px] font-mono text-success">Optimal</span>
                    </div>
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-success" />
                    </div>
                 </div>
              </div>
           </CardPremium>
        </div>
      </div>
    </div>
  );
};

export default SystemOperationsHub;
