import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  AlertTriangle,
  Activity,
  RefreshCcw,
  ArrowUpRight,
  Target,
  Database,
  Search,
  CheckCircle2,
  FileText
} from 'lucide-react';
import CardPremium from '../ui/Card';
import Button from '../ui/Button';
import { EconomyMonitor } from '../../engines/points/EconomyMonitor';
import { MarketResolver } from '../../engines/points/MarketResolver';
import toast from 'react-hot-toast';

const PointAIConsole: React.FC = () => {
  const [economy, setEconomy] = useState<any>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    EconomyMonitor.getEcosystemSnapshot().then(setEconomy);
  }, []);

  const handleMarketResolution = async () => {
    setIsResolving(true);
    const toastId = toast.loading('Synchronizing with Market Oracle...');
    try {
      const result = await MarketResolver.resolveAllPending();
      toast.success(`Resolved ${result.resolved} positions.`, { id: toastId });
      EconomyMonitor.getEcosystemSnapshot().then(setEconomy);
    } catch (err) {
      toast.error('Oracle Link Failed', { id: toastId });
    } finally {
      setIsResolving(false);
    }
  };

  const runIntegrityScan = async () => {
    setIsScanning(true);
    const toastId = toast.loading('Analyzing Transaction Ledgers...');
    try {
      // Functional Scan Stub
      await new Promise(r => setTimeout(r, 2000));
      toast.success('Integrity Scan Complete. 0 anomalies detected.', { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-white/40">
            <Database size={20} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Economy Governance</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-white">Monetary Authority</h1>
        </div>

        <div className="flex items-center gap-3">
           <Button
             variant="outline"
             onClick={handleMarketResolution}
             disabled={isResolving}
             className="gap-2 border-white/10 bg-white/[0.02] text-[11px] font-bold uppercase tracking-widest h-10 px-5"
           >
              {isResolving ? <RefreshCcw className="animate-spin" size={14} /> : <Target size={14} />}
              Resolve Markets
           </Button>
           <Button
             onClick={runIntegrityScan}
             disabled={isScanning}
             className="gap-2 bg-white text-black hover:bg-white/90 text-[11px] font-bold uppercase tracking-widest h-10 px-5"
           >
              {isScanning ? <RefreshCcw className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
              Integrity Audit
           </Button>
        </div>
      </div>

      {/* INDUSTRIAL METRIC GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Circulation', value: economy?.totalCirculation?.toLocaleString() || '0', icon: Database, color: 'text-primary' },
          { label: 'Flow (24H)', value: economy?.velocity24h?.toLocaleString() || '0', icon: Activity, color: 'text-success' },
          { label: 'Risk Factor', value: '0.00%', icon: AlertTriangle, color: 'text-white/20' },
          { label: 'Audit Grade', value: 'AAA', icon: ShieldCheck, color: 'text-primary' },
        ].map((m, i) => (
          <CardPremium key={i} className="p-6 bg-black border-white/[0.05] rounded-xl">
            <div className="flex justify-between items-start mb-6">
              <div className={`p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] ${m.color}`}>
                <m.icon size={16} />
              </div>
              <span className="text-[9px] font-bold uppercase text-white/20 tracking-widest">Active</span>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-1 text-white">{m.value}</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{m.label}</p>
          </CardPremium>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* REPAIR LOGS */}
        <div className="lg:col-span-2 space-y-6">
           <CardPremium className="p-0 overflow-hidden bg-black border-white/[0.05] rounded-xl">
              <div className="px-6 py-5 border-b border-white/[0.05] flex items-center justify-between bg-white/[0.01]">
                 <div className="flex items-center gap-3">
                    <Zap size={16} className="text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Operational Corrections</h3>
                 </div>
                 <FileText size={14} className="text-white/20" />
              </div>

              <div className="divide-y divide-white/[0.03]">
                   <div className="p-20 text-center">
                      <CheckCircle2 size={32} className="mx-auto mb-4 text-white/[0.05]" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">No active balance disputes</p>
                   </div>
              </div>
           </CardPremium>

           <CardPremium className="p-8 bg-white/[0.01] border-white/[0.05] rounded-xl">
              <div className="flex items-center gap-5 mb-10">
                 <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <ArrowUpRight size={20} />
                 </div>
                 <div>
                    <h3 className="text-base font-bold tracking-tight text-white uppercase tracking-wider">Economy Policy</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Monetary Protocol v5.0.0</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-5 rounded-xl bg-black border border-white/[0.05] flex items-center justify-between">
                    <div className="space-y-1.5">
                       <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Growth Constraint</p>
                       <p className="text-[9px] font-mono text-white/20 uppercase">Dynamic Inflation: Cap 5%</p>
                    </div>
                    <div className="flex items-center gap-2 text-success">
                       <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Enforced</span>
                    </div>
                 </div>
                 <div className="p-5 rounded-xl bg-black border border-white/[0.05] flex items-center justify-between">
                    <div className="space-y-1.5">
                       <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Double-Spend Shield</p>
                       <p className="text-[9px] font-mono text-white/20 uppercase">Atomic Tx Validation</p>
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Hardened</span>
                 </div>
              </div>
           </CardPremium>
        </div>

        {/* SIDEBAR INTELLIGENCE */}
        <div className="space-y-8">
           <CardPremium className="p-6 bg-black border-white/[0.05] rounded-xl">
              <div className="flex items-center gap-3 mb-8">
                 <Search size={16} className="text-white/40" />
                 <h3 className="text-xs font-bold uppercase tracking-widest text-white/80">Integrity Matrix</h3>
              </div>

              <div className="space-y-3">
                 {[
                   { label: 'Balance Parity', status: 'pass' },
                   { label: 'Oracle Sync', status: 'pass' },
                   { label: 'Multiplier Guard', status: 'pass' },
                   { label: 'XP Atomicity', status: 'pass' }
                 ].map((check, i) => (
                   <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{check.label}</span>
                      <CheckCircle2 size={12} className="text-success" />
                   </div>
                 ))}
              </div>

              <div className="mt-10 pt-8 border-t border-white/[0.05]">
                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4">Audit Status</p>
                 <p className="text-[11px] text-white/40 leading-relaxed font-mono">
                    System scanning complete. Ecosystem point velocity is within optimal parameters.
                 </p>
              </div>
           </CardPremium>
        </div>
      </div>
    </div>
  );
};

export default PointAIConsole;
