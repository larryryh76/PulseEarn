import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCcw,
  Search,
  Box,
  Layout,
  MessageSquare,
  Cpu,
  History
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
  const [messages, setMessages] = useState<any[]>([
    { role: 'ai', content: 'Institutional Operator initialized. Standing by for infrastructure commands.' }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Real-time Anomaly Feed
    const qA = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(15));
    const unsubA = onSnapshot(qA, snap => setAnomalies(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // 2. Real-time Repair Queue
    const qR = query(collection(db, 'system_repair_queue'), where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'), limit(10));
    const unsubR = onSnapshot(qR, snap => setRepairQueue(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))));

    return () => { unsubA(); unsubR(); };
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userPrompt = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);
    setIsProcessing(true);

    try {
      const response = await SystemScannerEngine.processCommand(userPrompt);
      setMessages(prev => [...prev, { role: 'ai', content: response.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Protocol error during command execution.' }]);
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
            <Cpu size={24} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">PulseEarn Infrastructure</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">System Operations Hub</h1>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
           <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Protocol Status: Optimal</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: CONVERSATIONAL OPERATOR */}
        <div className="lg:col-span-2 space-y-8">
           <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05] h-[600px] flex flex-col">
              <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Terminal size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Operator Console</h3>
                 </div>
                 <div className="flex items-center gap-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                    <span>v4.0.0-PRO</span>
                    <span>•</span>
                    <span className="text-success">Session Active</span>
                 </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                 {messages.map((m, i) => (
                   <motion.div
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     key={i}
                     className={cn(
                       "flex gap-4 max-w-[85%]",
                       m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                     )}
                   >
                      <div className={cn(
                        "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border",
                        m.role === 'ai' ? "bg-primary/10 border-primary/20 text-primary" : "bg-white/5 border-white/10 text-white/40"
                      )}>
                         {m.role === 'ai' ? <Cpu size={16} /> : <Search size={16} />}
                      </div>
                      <div className={cn(
                        "p-4 rounded-2xl text-xs font-medium leading-relaxed",
                        m.role === 'ai' ? "bg-white/[0.02] border border-white/[0.05] text-white/80" : "bg-primary text-white"
                      )}>
                         {m.content}
                      </div>
                   </motion.div>
                 ))}
                 {isProcessing && (
                   <div className="flex gap-4 items-center">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                         <RefreshCcw size={16} className="animate-spin" />
                      </div>
                      <div className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">Analyzing Ecosystem Data...</div>
                   </div>
                 )}
                 <div ref={logEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleCommand} className="p-6 border-t border-white/[0.05] bg-white/[0.01]">
                 <div className="relative group">
                    <input
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Instruct the Operator (e.g. 'Scan predictions', 'Audit rewards')..."
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-12 pr-12 py-4 text-sm focus:outline-none focus:border-primary/40 transition-all font-medium"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
                       <MessageSquare size={20} />
                    </div>
                    <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                       <Send size={16} />
                    </button>
                 </div>
              </form>
           </CardPremium>

           {/* REPAIR PIPELINE */}
           <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
              <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Box size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Repair Pipeline</h3>
                 </div>
                 <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">{repairQueue.length} PENDING</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                 {repairQueue.length === 0 ? (
                   <div className="p-12 text-center text-white/10">
                      <CheckCircle2 size={32} className="mx-auto mb-4 opacity-10" />
                      <p className="text-xs font-bold uppercase tracking-widest">Infrastructure nominal. No repairs queued.</p>
                   </div>
                 ) : (
                   repairQueue.map((item) => (
                     <div key={item.id} className="p-8 group hover:bg-white/[0.01] transition-all">
                        <div className="flex items-start justify-between mb-4">
                           <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                 <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    item.priority === 'HIGH' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-primary'
                                 )} />
                                 <h4 className="text-base font-bold text-white/90">{item.title}</h4>
                              </div>
                              <p className="text-xs text-white/40 leading-relaxed max-w-2xl">{item.description}</p>
                           </div>
                           <Button size="sm" onClick={() => handleDeploy(item.id)} glow className="px-5 py-2.5 text-[10px]">
                              Authorize Execution
                           </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/[0.03]">
                           <div className="space-y-2">
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Proposed Logic</p>
                              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] font-mono text-[10px] text-primary/70">
                                 {item.proposedFix}
                              </div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">System Impact</p>
                              <div className="flex items-center gap-4 text-[10px] font-bold text-white/30 uppercase tracking-widest pt-1">
                                 <span className="flex items-center gap-1.5"><Layout size={10} /> {item.affectedSystem}</span>
                                 <span className="flex items-center gap-1.5 text-success/60"><ShieldCheck size={10} /> Rollback Ready</span>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </CardPremium>
        </div>

        {/* RIGHT: MONITORING FEEDS */}
        <div className="space-y-8">
           {/* ANOMALY FEED */}
           <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05] h-[500px] flex flex-col">
              <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="text-orange-500" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Anomaly Feed</h3>
                 </div>
                 <History size={14} className="text-white/20" />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] custom-scrollbar">
                 {anomalies.length === 0 ? (
                   <div className="p-12 text-center text-white/10 text-[10px] font-bold uppercase tracking-widest">No validation alerts</div>
                 ) : (
                   anomalies.map((a) => (
                     <div key={a.id} className="p-5 space-y-2 group">
                        <div className="flex items-center justify-between">
                           <span className={cn(
                             "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                             a.severity === 'HIGH' ? "bg-danger/10 text-danger border border-danger/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
                           )}>
                             {a.error}
                           </span>
                           <span className="text-[9px] font-mono text-white/20">{a.timestamp?.toDate().toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[10px] text-white/40 font-medium leading-relaxed">
                           ID: <span className="text-white/60">{a.claimId.slice(0, 16)}</span><br />
                           Entity: <span className="text-primary/60">{a.userId.slice(0, 12)}</span>
                        </p>
                     </div>
                   ))
                 )}
              </div>
           </CardPremium>

           {/* SYSTEM METRICS */}
           <CardPremium className="p-6 bg-[#0A0A12] border-white/[0.05] space-y-6">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Operational Grade</h4>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between mb-2">
                       <span className="text-[10px] font-bold text-white/40 uppercase">Economy Integrity</span>
                       <span className="text-[10px] font-bold text-primary">100%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full bg-primary" />
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between mb-2">
                       <span className="text-[10px] font-bold text-white/40 uppercase">Idempotency Sync</span>
                       <span className="text-[10px] font-bold text-success">Verified</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
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
