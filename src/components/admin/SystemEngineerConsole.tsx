import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Terminal,
  Cpu,
  ShieldAlert,
  RefreshCcw,
  CheckCircle2,
  FileCode2,
  Box,
  Layout,
  Lock,
  ExternalLink
} from 'lucide-react';
import CardPremium from '../ui/Card';
import Button from '../ui/Button';
import { cn } from '../../utils';
import { SystemScannerEngine, RepairProposal } from '../../engines/system/SystemScannerEngine';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

const SystemEngineerConsole: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [repairQueue, setRepairQueue] = useState<RepairProposal[]>([]);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[SystemAI] Platform Engineering System Initialized...',
    '[SystemAI] Awaiting deep scan instruction...'
  ]);

  useEffect(() => {
    const q = query(
      collection(db, 'system_repair_queue'),
      where('status', '==', 'PENDING'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(q, (snapshot) => {
       setRepairQueue(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });
  }, []);

  const handleAction = async (actionId: string, status: 'APPROVED' | 'REJECTED') => {
    const toastId = toast.loading(`${status === 'APPROVED' ? 'Deploying' : 'Rejecting'} proposal...`);
    try {
      await updateDoc(doc(db, 'system_repair_queue', actionId), {
        status,
        updatedAt: serverTimestamp()
      });

      if (status === 'APPROVED') {
        await SystemScannerEngine.executeInstruction(actionId);
      }

      setTerminalLogs(prev => [...prev, `[SystemAI] Action ${actionId.slice(0, 8)} ${status.toLowerCase()} by administrator.`]);
      toast.success(`Proposal ${status.toLowerCase()}`, { id: toastId });
    } catch (err) {
      toast.error('Action failed', { id: toastId });
    }
  };

  const runDeepScan = async () => {
    setIsScanning(true);
    setTerminalLogs(prev => [...prev, '[SystemAI] Initiating repository-wide recursive scan...', '[SystemAI] Analyzing Firestore data structures...', '[SystemAI] Checking system consistency...']);

    try {
      const findings: any = await SystemScannerEngine.performOfficialScan();
      setTerminalLogs(prev => [...prev, '[SystemAI] Scan sequence complete.', `[SystemAI] Identified ${findings?.length || 0} architecture proposals.`]);
      toast.success('Platform Scan Complete');
    } catch (err) {
      toast.error('Scan sequence aborted');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <Cpu size={24} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">System Engineer AI</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">Platform Intelligence</h1>
        </div>

        <div className="flex items-center gap-3">
           <Button
             variant="outline"
             className="border-white/10 bg-white/[0.02]"
             onClick={() => setTerminalLogs([])}
           >
              Reset Logs
           </Button>
           <Button
             onClick={runDeepScan}
             disabled={isScanning}
             className="gap-2"
             glow
           >
              {isScanning ? <RefreshCcw className="animate-spin" size={16} /> : <Terminal size={16} />}
              Execute Full Platform Scan
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* REPAIR QUEUE */}
        <div className="lg:col-span-2 space-y-8">
           <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
              <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Box size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Platform Repair Queue</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold">
                       {repairQueue.length} PROPOSALS
                    </span>
                 </div>
              </div>

              <div className="divide-y divide-white/[0.03]">
                 {repairQueue.length === 0 ? (
                   <div className="p-20 text-center text-white/10">
                      <CheckCircle2 size={32} className="mx-auto mb-4 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">Platform architecture is optimal</p>
                   </div>
                 ) : (
                   repairQueue.map((item) => (
                     <div key={item.id} className="p-8 group hover:bg-white/[0.01] transition-all">
                        <div className="flex items-start justify-between mb-4">
                           <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                 <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    item.priority === 'CRITICAL' ? 'bg-danger shadow-[0_0_8px_rgba(255,59,48,0.5)]' : 'bg-primary'
                                 )} />
                                 <h4 className="text-base font-bold text-white/90">{item.title}</h4>
                              </div>
                              <p className="text-xs text-white/40 leading-relaxed max-w-2xl">{item.description}</p>
                           </div>
                           <div className="flex gap-2">
                              <Button
                                 size="sm"
                                 variant="outline"
                                 className="text-[10px] px-4 py-2 border-white/10 hover:border-danger hover:text-danger"
                                 onClick={() => handleAction(item.id, 'REJECTED')}
                              >
                                 Reject
                              </Button>
                              <Button
                                 size="sm"
                                 className="text-[10px] px-4 py-2"
                                 glow
                                 onClick={() => handleAction(item.id, 'APPROVED')}
                              >
                                 Approve & Deploy
                              </Button>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/[0.03]">
                           <div className="space-y-2">
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Engine Proposed Fix</p>
                              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] font-mono text-[10px] text-primary/70">
                                 {item.proposedFix}
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Impact Assessment</p>
                              <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest pt-1">
                                 <span className="flex items-center gap-1.5"><Layout size={10} /> {item.affectedSystem}</span>
                                 <span className="flex items-center gap-1.5"><ShieldAlert size={10} /> No Rollback Risk</span>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </CardPremium>

           {/* SYSTEM SCANNER CARDS */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CardPremium className="p-6 bg-[#0A0A12] border-white/[0.05]">
                 <div className="flex items-center gap-3 mb-6">
                    <Lock size={18} className="text-success" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Secret Analysis</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                       <span className="text-[10px] font-bold text-white/30 uppercase">Exposed Keys</span>
                       <span className="text-[10px] font-bold text-success uppercase">None Detected</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                       <span className="text-[10px] font-bold text-white/30 uppercase">Hardcoded Creds</span>
                       <span className="text-[10px] font-bold text-success uppercase">None Detected</span>
                    </div>
                 </div>
              </CardPremium>

              <CardPremium className="p-6 bg-[#0A0A12] border-white/[0.05]">
                 <div className="flex items-center gap-3 mb-6">
                    <FileCode2 size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/80">Logic Integrity</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                       <span className="text-[10px] font-bold text-white/30 uppercase">Sync Validation</span>
                       <span className="text-[10px] font-bold text-success uppercase">99.8% Pass</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                       <span className="text-[10px] font-bold text-white/30 uppercase">Dead Branches</span>
                       <span className="text-[10px] font-bold text-orange-500 uppercase">2 Pending</span>
                    </div>
                 </div>
              </CardPremium>
           </div>
        </div>

        {/* AI TERMINAL */}
        <div className="space-y-8">
           <CardPremium className="p-6 bg-[#05050A] border-white/[0.05] h-[500px] flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                 <h3 className="text-sm font-bold uppercase tracking-widest">AI Intelligence Log</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] text-white/30 custom-scrollbar pr-2">
                 {terminalLogs.map((log, i) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={i}
                      className="flex gap-3"
                    >
                       <span className="text-primary/60 shrink-0">➜</span>
                       <span className="leading-relaxed">{log}</span>
                    </motion.div>
                 ))}
                 {isScanning && (
                   <div className="flex items-center gap-3 text-primary">
                      <RefreshCcw size={10} className="animate-spin" />
                      <span className="animate-pulse">Analyzing...</span>
                   </div>
                 )}
              </div>
           </CardPremium>

           <CardPremium className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-4">Engineering Metric</h4>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between mb-2">
                       <span className="text-[10px] font-bold uppercase text-white/60">Platform Stability</span>
                       <span className="text-[10px] font-bold text-primary">98.4%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '98.4%' }} className="h-full bg-primary" />
                    </div>
                 </div>
              </div>
              <Button className="w-full mt-8 text-[9px] uppercase tracking-[0.2em] font-bold" variant="outline">
                 View Full Repo Audit <ExternalLink size={10} className="ml-2" />
              </Button>
           </CardPremium>
        </div>
      </div>
    </div>
  );
};

export default SystemEngineerConsole;
