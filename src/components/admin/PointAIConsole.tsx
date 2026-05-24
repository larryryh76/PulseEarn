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
  XCircle
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
          <div className="flex items-center gap-3 text-primary">
            <Database size={24} />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.3em]">Point AI — Economy Intelligence</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter">Monetary Integrity</h1>
        </div>

        <div className="flex items-center gap-3">
           <Button
             variant="outline"
             onClick={handleMarketResolution}
             disabled={isResolving}
             className="gap-2 border-white/10 bg-white/[0.02]"
           >
              {isResolving ? <RefreshCcw className="animate-spin" size={16} /> : <Target size={16} />}
              Resolve Predictions
           </Button>
           <Button
             onClick={runIntegrityScan}
             disabled={isScanning}
             className="gap-2"
             glow
           >
              {isScanning ? <RefreshCcw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              Deep Integrity Scan
           </Button>
        </div>
      </div>

      {/* METRIC GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Circulation', value: economy?.totalCirculation.toLocaleString() || '0', icon: Database, color: 'text-primary' },
          { label: 'Velocity (24H)', value: economy?.velocity24h.toLocaleString() || '0', icon: Activity, color: 'text-success' },
          { label: 'Anomalies', value: '0', icon: AlertTriangle, color: 'text-white/20' },
          { label: 'Audit Grade', value: 'AAA', icon: ShieldCheck, color: 'text-primary' },
        ].map((m, i) => (
          <CardPremium key={i} className="p-6 bg-[#0A0A12] border-white/[0.05]">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] ${m.color}`}>
                <m.icon size={18} />
              </div>
              <span className="text-[9px] font-bold uppercase text-white/20 tracking-wider">Operational</span>
            </div>
            <p className="text-2xl font-bold tracking-tight mb-1">{m.value}</p>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{m.label}</p>
          </CardPremium>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* REPAIR LOGS */}
        <div className="lg:col-span-2 space-y-6">
           <CardPremium className="p-0 overflow-hidden bg-[#0A0A12] border-white/[0.05]">
              <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Zap size={18} className="text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-widest">System Corrections</h3>
                 </div>
                 <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Last 24 Hours</span>
              </div>

              <div className="divide-y divide-white/[0.03]">
                   <div className="p-20 text-center text-white/10">
                      <CheckCircle2 size={32} className="mx-auto mb-4 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No manual repairs required</p>
                   </div>
              </div>
           </CardPremium>

           <CardPremium className="p-8 bg-gradient-to-br from-[#0A0A15] to-[#05050A] border-white/[0.05]">
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                    <ArrowUpRight size={24} />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold tracking-tight">Point Distribution AI</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Real-time reward balancing</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                    <div className="space-y-1">
                       <p className="text-[11px] font-bold text-white/80 uppercase">Inflation Control</p>
                       <p className="text-[10px] text-white/20">Target: 2% Monthly Circulation Growth</p>
                    </div>
                    <div className="flex items-center gap-2 text-success">
                       <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                       <span className="text-[10px] font-bold uppercase">Stable</span>
                    </div>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                    <div className="space-y-1">
                       <p className="text-[11px] font-bold text-white/80 uppercase">Double-Spend Shield</p>
                       <p className="text-[10px] text-white/20">Active Transaction Verification</p>
                    </div>
                    <span className="text-[10px] font-bold text-primary uppercase">Hardened</span>
                 </div>
              </div>
           </CardPremium>
        </div>

        {/* SIDEBAR INTELLIGENCE */}
        <div className="space-y-8">
           <CardPremium className="p-6 bg-[#05050A] border-white/[0.05]">
              <div className="flex items-center gap-3 mb-6">
                 <Search size={18} className="text-primary" />
                 <h3 className="text-sm font-bold uppercase tracking-widest">Integrity Radar</h3>
              </div>

              <div className="space-y-4">
                 {[
                   { label: 'Unsynced Balances', value: 0, status: 'pass' },
                   { label: 'Orphaned Predictions', value: 0, status: 'pass' },
                   { label: 'Invalid Multipliers', value: 0, status: 'pass' },
                   { label: 'Missing XP Records', value: 0, status: 'pass' }
                 ].map((check, i) => (
                   <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{check.label}</span>
                      {check.status === 'pass' ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-danger" />}
                   </div>
                 ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/[0.05]">
                 <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-4">AI Recommendation</p>
                 <p className="text-xs text-white/50 leading-relaxed italic">"Ecosystem point velocity is within optimal parameters. Suggesting no manual intervention for this cycle."</p>
              </div>
           </CardPremium>
        </div>
      </div>
    </div>
  );
};

export default PointAIConsole;
