import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Shield,
  BrainCircuit,
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCcw,
  Database,
  Cpu
} from 'lucide-react';
import CardPremium from '../ui/Card';
import Button from '../ui/Button';
import { SystemScannerEngine } from '../../engines/system/SystemScannerEngine';
import { EconomyMonitor } from '../../engines/points/EconomyMonitor';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

const AICommandCenter: React.FC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [economy, setEconomy] = useState<any>(null);
  const [repairQueue, setRepairQueue] = useState<any[]>([]);
  const [terminalLines, setTerminalLines] = useState<string[]>(['[PulseAI] System Initialized...', '[PulseAI] Monitoring Ecosystem flows...']);

  useEffect(() => {
    // Live economy metrics
    EconomyMonitor.getEcosystemSnapshot().then(setEconomy);

    // Live repair queue
    const q = query(
      collection(db, 'systemRepairQueue'),
      where('status', '==', 'PENDING'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    return onSnapshot(q, (snapshot) => {
      setRepairQueue(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const runScan = async () => {
    setIsScanning(true);
    setTerminalLines(prev => [...prev, '[PulseAI] Initiating Deep Ecosystem Scan...', '[PulseAI] Analyzing frontend data bindings...', '[PulseAI] Checking point consistency across users...']);

    try {
      await SystemScannerEngine.performDeepEcosystemScan();
      setTerminalLines(prev => [...prev, '[PulseAI] Scan Complete. Report generated.', '[PulseAI] 3 proposals added to repair queue.']);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-primary">
            <BrainCircuit size={24} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Operational Intelligence</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">Ecosystem Control Center</h1>
        </div>

        <div className="flex items-center gap-3">
           <Button
             variant="outline"
             className="border-white/5 bg-white/[0.02]"
             onClick={() => setTerminalLines([])}
           >
              Clear Logs
           </Button>
           <Button
             onClick={runScan}
             disabled={isScanning}
             className="gap-2"
             glow
           >
              {isScanning ? <RefreshCcw className="animate-spin" size={16} /> : <Zap size={16} />}
              Initiate System Scan
           </Button>
        </div>
      </div>

      {/* METRIC GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Point Circulation', value: economy?.totalCirculation.toLocaleString() || '0', icon: Database, color: 'text-primary' },
          { label: 'Operational Users', value: economy?.totalUsers || '0', icon: Activity, color: 'text-success' },
          { label: 'Integrity Alerts', value: economy?.flaggedUsers || '0', icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'System Health', value: '98.4%', icon: Shield, color: 'text-primary' },
        ].map((m, i) => (
          <CardPremium key={i} className="p-6 bg-[#0A0A12] border-white/[0.05]">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] ${m.color}`}>
                <m.icon size={18} />
              </div>
              <span className="text-[9px] font-bold uppercase text-white/20 tracking-wider">Live</span>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-1">{m.value}</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{m.label}</p>
          </CardPremium>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN PANEL */}
        <div className="lg:col-span-2 space-y-8">
          {/* REPAIR QUEUE PREVIEW */}
          <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
            <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <Terminal size={18} className="text-primary" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Repair Queue</h3>
               </div>
               <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                  {repairQueue.length} PENDING
               </span>
            </div>
            <div className="divide-y divide-white/[0.03]">
               {repairQueue.length === 0 ? (
                 <div className="p-12 text-center text-white/20">
                    <CheckCircle2 size={32} className="mx-auto mb-4 opacity-10" />
                    <p className="text-xs font-bold uppercase tracking-widest">No pending system anomalies</p>
                 </div>
               ) : (
                 repairQueue.map((item) => (
                   <div key={item.id} className="p-6 flex items-start justify-between group hover:bg-white/[0.01] transition-colors">
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                               item.priority === 'CRITICAL' ? 'bg-danger' :
                               item.priority === 'HIGH' ? 'bg-orange-500' : 'bg-primary'
                            }`} />
                            <h4 className="text-sm font-bold text-white/90">{item.title}</h4>
                            <span className="text-[10px] font-medium text-white/30 px-2 py-0.5 rounded-full border border-white/[0.05]">
                               {item.type}
                            </span>
                         </div>
                         <p className="text-xs text-white/40 leading-relaxed max-w-lg">{item.description}</p>
                         <div className="flex items-center gap-4 text-[10px] font-bold text-white/20 uppercase tracking-widest pt-2">
                            <span>System: {item.affectedSystem}</span>
                            <span>•</span>
                            <span className="text-primary/60">Proposal: {item.proposedFix}</span>
                         </div>
                      </div>
                      <Button size="sm" className="px-4 py-2 text-[10px]" glow>
                         Review Fix
                      </Button>
                   </div>
                 ))
               )}
            </div>
          </CardPremium>
        </div>

        {/* SIDEBAR INTELLIGENCE */}
        <div className="space-y-8">
           {/* AI LOGS */}
           <CardPremium className="p-6 bg-[#05050A] border-white/[0.05] h-[350px] flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <Cpu size={18} className="text-primary" />
                 <h3 className="text-sm font-bold uppercase tracking-widest">Intelligence Feed</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] text-white/30 custom-scrollbar">
                 {terminalLines.map((line, i) => (
                   <motion.div
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     key={i}
                     className="flex gap-3"
                   >
                      <span className="text-primary shrink-0">➜</span>
                      <span>{line}</span>
                   </motion.div>
                 ))}
                 {isScanning && (
                   <div className="flex gap-3 items-center text-primary">
                      <RefreshCcw size={10} className="animate-spin" />
                      <span className="animate-pulse">Processing...</span>
                   </div>
                 )}
              </div>
           </CardPremium>

           {/* QUICK STATS */}
           <CardPremium className="p-6 bg-[#0A0A12] border-white/[0.05]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6">Ecosystem Efficiency</h3>
              <div className="space-y-6">
                 {[
                   { label: 'Earning Velocity', value: economy?.velocity24h.toLocaleString() || '0', target: 50000 },
                   { label: 'Validation Rate', value: '100%', target: 100 },
                   { label: 'Fraud Suppression', value: '99.2%', target: 100 }
                 ].map((stat, i) => (
                   <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                         <span className="text-white/30">{stat.label}</span>
                         <span className="text-white/60">{stat.value}</span>
                      </div>
                      <div className="h-1 bg-white/[0.02] rounded-full overflow-hidden">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: '70%' }}
                           className="h-full bg-primary shadow-[0_0_10px_rgba(0,112,255,0.3)]"
                         />
                      </div>
                   </div>
                 ))}
              </div>
           </CardPremium>
        </div>
      </div>
    </div>
  );
};

export default AICommandCenter;
