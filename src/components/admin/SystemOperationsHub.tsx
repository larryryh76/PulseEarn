import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertCircle,
  RefreshCcw,
  Terminal,
  Server,
  Zap,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import CardPremium from '../ui/Card';
import Button from '../ui/Button';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { SystemScannerEngine } from '../../engines/system/SystemScannerEngine';
import toast from 'react-hot-toast';

const SystemOperationsHub: React.FC = () => {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [repairQueue, setRepairQueue] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>(['[System] Protocol initialized.', '[System] Monitoring active hooks...']);

  useEffect(() => {
    // 1. Listen for real anomalies
    const anomalyQuery = query(collection(db, 'system_anomalies'), orderBy('timestamp', 'desc'), limit(10));
    const unsubAnomalies = onSnapshot(anomalyQuery, (snap) => {
      setAnomalies(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Listen for repair proposals
    const repairQuery = query(collection(db, 'system_repair_queue'), where('status', '==', 'PENDING'), limit(10));
    const unsubRepair = onSnapshot(repairQuery, (snap) => {
      setRepairQueue(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAnomalies();
      unsubRepair();
    };
  }, []);

  const triggerScan = async () => {
    setIsScanning(true);
    const toastId = toast.loading('Initiating Institutional Scan...');
    try {
      await SystemScannerEngine.performInstitutionalScan();
      setSystemLogs(prev => [...prev, `[System] Institutional scan completed at ${new Date().toLocaleTimeString()}`]);
      toast.success('Scan Complete', { id: toastId });
    } catch (err) {
      toast.error('Scan Failed', { id: toastId });
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
            <Server size={24} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Infrastructure Control</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">System Operations Hub</h1>
        </div>

        <Button onClick={triggerScan} disabled={isScanning} className="gap-2" glow>
           {isScanning ? <RefreshCcw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
           Execute Institutional Scan
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN OPS AREA */}
        <div className="lg:col-span-2 space-y-8">

           {/* REPAIR QUEUE */}
           <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
              <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Zap size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">Repair Pipeline</h3>
                 </div>
                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{repairQueue.length} PENDING</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                 {repairQueue.length === 0 ? (
                   <div className="p-12 text-center text-white/10">
                      <CheckCircle2 size={32} className="mx-auto mb-4 opacity-10" />
                      <p className="text-xs font-bold uppercase tracking-widest">Infrastructure state is nominal</p>
                   </div>
                 ) : (
                   repairQueue.map((item) => (
                      <div key={item.id} className="p-6 flex items-start justify-between group hover:bg-white/[0.01] transition-all">
                         <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                               <span className={`w-1.5 h-1.5 rounded-full ${item.priority === 'HIGH' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-primary'}`} />
                               <h4 className="text-sm font-bold text-white/90">{item.title}</h4>
                            </div>
                            <p className="text-xs text-white/40 leading-relaxed max-w-lg">{item.description}</p>
                            <div className="flex items-center gap-4 pt-2">
                               <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Instruction: {item.instructionType}</span>
                            </div>
                         </div>
                         <Button size="sm" variant="outline" className="px-4 py-2 text-[10px] border-white/5">
                            Review Logic
                         </Button>
                      </div>
                   ))
                 )}
              </div>
           </CardPremium>

           {/* ANOMALY FEED */}
           <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
              <div className="p-6 border-b border-white/[0.05] flex items-center gap-3">
                 <ShieldAlert size={18} className="text-orange-500" />
                 <h3 className="text-sm font-bold uppercase tracking-widest">Anomaly Monitoring</h3>
              </div>
              <div className="divide-y divide-white/[0.03]">
                 {anomalies.length === 0 ? (
                   <div className="p-12 text-center text-white/10">
                      <p className="text-xs font-bold uppercase tracking-widest">No validation failures detected</p>
                   </div>
                 ) : (
                   anomalies.map((a) => (
                     <div key={a.id} className="p-5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                              <AlertCircle size={16} />
                           </div>
                           <div>
                              <p className="text-xs font-bold text-white/80">{a.error}</p>
                              <p className="text-[10px] text-white/30 font-medium">Claim ID: {a.claimId.slice(0, 12)}... • User: {a.userId.slice(0, 8)}</p>
                           </div>
                        </div>
                        <span className="text-[10px] font-bold text-white/20 uppercase">{a.timestamp?.toDate().toLocaleTimeString()}</span>
                     </div>
                   ))
                 )}
              </div>
           </CardPremium>
        </div>

        {/* SIDEBAR OPS */}
        <div className="space-y-8">
           {/* PROTOCOL LOGS */}
           <CardPremium className="p-6 bg-[#05050A] border-white/[0.05] h-[400px] flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                 <Terminal size={18} className="text-primary" />
                 <h3 className="text-sm font-bold uppercase tracking-widest">Protocol Stream</h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] text-white/20 custom-scrollbar pr-2">
                 {systemLogs.map((log, i) => (
                    <div key={i} className="flex gap-3 leading-relaxed">
                       <span className="text-primary/60">➜</span>
                       <span>{log}</span>
                    </div>
                 ))}
                 {isScanning && (
                   <div className="flex items-center gap-2 text-primary">
                      <RefreshCcw size={10} className="animate-spin" />
                      <span className="animate-pulse">SCANNING REPOSITORY...</span>
                   </div>
                 )}
              </div>
           </CardPremium>

           {/* SYSTEM HEALTH CARDS */}
           <CardPremium className="p-6 bg-[#0A0A12] border-white/[0.05] space-y-6">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Infrastructure Status</h4>
              <div className="space-y-4">
                 {[
                   { name: 'Point AI Gateway', status: 'Online', color: 'text-success' },
                   { name: 'Market Oracle Link', status: 'Synced', color: 'text-primary' },
                   { name: 'Fraud Shield', status: 'Active', color: 'text-success' },
                   { name: 'Idempotency Layer', status: 'Active', color: 'text-primary' }
                 ].map((stat, i) => (
                   <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[10px] font-bold text-white/50">{stat.name}</span>
                      <span className={`text-[10px] font-bold uppercase ${stat.color}`}>{stat.status}</span>
                   </div>
                 ))}
              </div>
           </CardPremium>
        </div>
      </div>
    </div>
  );
};

export default SystemOperationsHub;
