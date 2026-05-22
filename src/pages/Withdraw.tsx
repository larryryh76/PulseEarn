import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { CardPremium } from '../components/ui/PremiumModules';
import { useAuth } from '../contexts/AuthContext';
import {
  Wallet,
  ShieldCheck,
  AlertCircle,
  Lock,
  History,
  ArrowRight,
  TrendingUp,
  Activity,
  Globe,
  Fingerprint,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD, WITHDRAWAL_MIN_PTS } from '../utils/finance';

const Withdraw: React.FC = () => {
  const { userData } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!userData) return null;

  const isEligible = userData.points >= WITHDRAWAL_MIN_PTS;
  const progress = Math.min((userData.points / WITHDRAWAL_MIN_PTS) * 100, 100);

  const networks = [
    { id: 'ton', name: 'TON Protocol', icon: '💎', speed: '~5 min', fee: 'Free' },
    { id: 'sol', name: 'Solana Mainnet', icon: '☀️', speed: '~1 min', fee: 'Free' },
    { id: 'base', name: 'Base L2', icon: '🔵', speed: '~2 min', fee: 'Free' },
    { id: 'eth', name: 'Ethereum', icon: '⟠', speed: '~15 min', fee: 'Gas Only' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-20">

        {/* HEADER */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent font-bold">
             <Globe size={16} />
             <span className="text-[10px] uppercase tracking-[0.3em]">Cross-Chain Liquidity Bridge</span>
          </div>
          <h1 className="text-5xl font-financial text-white tracking-tight">Settle Your Earnings</h1>
          <p className="text-white/30 text-sm font-medium">Seamlessly bridge your Pulse assets into real-world liquidity.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT: BRIDGE INTERFACE */}
          <div className="lg:col-span-8 space-y-8">

            {/* PROGRESSION HUB */}
            <CardPremium variant="deep" className="p-8 border-white/[0.08] bg-[#050507]/60">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-12">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Protocol Accumulation</span>
                  </div>
                  <div className="flex items-baseline gap-4">
                    <h2 className="text-6xl font-financial text-white">{userData.points.toLocaleString()} <span className="text-primary text-2xl opacity-40">PTS</span></h2>
                  </div>
                  <p className="text-2xl font-financial text-success opacity-80">≈ {formatUSD(PTS_TO_USD(userData.points))} <span className="text-xs uppercase tracking-widest opacity-40 ml-1">Liquidity</span></p>
                </div>

                <div className="flex flex-col gap-4 w-full md:w-64">
                   <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                      <div className="space-y-1">
                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Min. Unlock</p>
                         <p className="text-xs font-financial text-white/60">10,000 PTS</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                         <Lock size={14} />
                      </div>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                      <div className="space-y-1">
                         <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Multiplier</p>
                         <p className="text-xs font-financial text-primary">ACTIVE</p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                         <Zap size={14} />
                      </div>
                   </div>
                </div>
              </div>

              {/* RADIAL MILESTONES */}
              <div className="space-y-6">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/20 px-1">
                  <span>Unlock Progression</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/[0.05] relative p-1">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn(
                      "h-full rounded-full shadow-[0_0_20px_rgba(0,112,255,0.4)] transition-all relative overflow-hidden",
                      isEligible ? "bg-success" : "bg-primary"
                    )}
                  >
                     <div className="absolute inset-0 animate-shimmer" />
                  </motion.div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
                  <span>Threshold: 0 PTS</span>
                  <span>Target: 10,000 PTS</span>
                </div>
              </div>

              {/* INCOME FORECASTING */}
              <div className="mt-12 pt-10 border-t border-white/[0.03] grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                       <TrendingUp size={24} />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-white mb-1">Earning Forecast</h4>
                       <p className="text-[10px] text-white/30 uppercase tracking-widest leading-relaxed">
                          Estimated unlock in <span className="text-primary">~50 operating cycles</span> based on current performance.
                       </p>
                    </div>
                 </div>
                 <button className="h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-white">
                    Accelerate Earnings <ArrowRight size={14} />
                 </button>
              </div>
            </CardPremium>

            {/* NETWORK SELECTION CARDS */}
            <div className={cn("space-y-6 transition-all duration-700", !isEligible && "opacity-30 pointer-events-none")}>
               <div className="flex items-center gap-2 px-2">
                  <div className="w-1 h-4 bg-white/20 rounded-full" />
                  <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.3em]">Protocol Settlement Path</h3>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {networks.map(net => (
                    <button
                      key={net.id}
                      onClick={() => setSelectedNetwork(net.id)}
                      className={cn(
                        "p-6 rounded-[2.5rem] border transition-all duration-500 text-left relative overflow-hidden group",
                        selectedNetwork === net.id
                          ? "bg-primary/10 border-primary shadow-[0_0_40px_rgba(0,112,255,0.15)]"
                          : "bg-[#0A0A0F] border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.02]"
                      )}
                    >
                       <div className="flex items-center justify-between mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                             {net.icon}
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                            selectedNetwork === net.id ? "border-primary bg-primary scale-110" : "border-white/10"
                          )}>
                             {selectedNetwork === net.id && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                             )}
                          </div>
                       </div>
                       <h4 className="font-bold text-white text-lg mb-1">{net.name}</h4>
                       <div className="flex items-center gap-4">
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Speed: {net.speed}</p>
                          <div className="w-1 h-1 rounded-full bg-white/10" />
                          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Fee: {net.fee}</p>
                       </div>
                    </button>
                  ))}
               </div>
            </div>

            {/* AUTHENTICATION MODULE */}
            <CardPremium variant="deep" className={cn("p-10 border-white/[0.08] transition-all duration-700", !selectedNetwork && "opacity-30 pointer-events-none")}>
               <div className="flex flex-col items-center text-center max-w-md mx-auto">
                  <div className="relative mb-10">
                     <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
                     <div className="w-24 h-24 rounded-[3rem] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative z-10">
                        <Fingerprint size={48} />
                     </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Bridge Authentication</h3>
                  <p className="text-sm text-white/30 mb-10 leading-relaxed font-medium">
                     Connect a non-custodial wallet to begin the institutional settlement protocol.
                     PulseEarn uses zero-knowledge proofing for secure bridging.
                  </p>

                  <button
                    disabled={isConnecting}
                    onClick={() => setIsConnecting(true)}
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 transition-all font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-4 shadow-[0_10px_40px_rgba(0,112,255,0.4)] group overflow-hidden"
                  >
                     {isConnecting ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     ) : (
                        <>
                           <Wallet size={20} className="group-hover:scale-110 transition-transform" />
                           Authorize Liquidity Bridge
                        </>
                     )}
                  </button>
                  <p className="mt-6 text-[10px] text-white/20 font-bold uppercase tracking-widest flex items-center gap-2">
                     <ShieldCheck size={12} className="text-success" />
                     Audited Protocol v2.10.4
                  </p>
               </div>
            </CardPremium>
          </div>

          {/* RIGHT: SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">

            {/* PROTOCOL GUARD */}
            <CardPremium variant="standard" className="bg-[#0A0A0F] border-white/[0.08]">
               <div className="flex items-center gap-3 mb-10 text-primary">
                  <ShieldCheck size={20} />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Protocol Guard</h4>
               </div>
               <div className="space-y-8">
                  {[
                    { label: 'Standard Window', val: '24-72h', color: 'text-white/60' },
                    { label: 'Gas Execution', val: '0.00 PTS', color: 'text-success' },
                    { label: 'Security Audit', val: 'Mandatory', color: 'text-primary' },
                    { label: 'Daily Bridge Cap', val: '$500 USD', color: 'text-white/60' }
                  ].map((rule, i) => (
                    <div key={i} className="flex justify-between items-center pb-4 border-b border-white/[0.02] last:border-0 last:pb-0">
                       <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{rule.label}</span>
                       <span className={cn("text-[11px] font-financial font-bold", rule.color)}>{rule.val}</span>
                    </div>
                  ))}
               </div>
            </CardPremium>

            {/* COMPLIANCE WARNING */}
            <div className="p-8 rounded-[2.5rem] bg-danger/5 border border-danger/10 space-y-4">
               <div className="flex gap-3">
                  <AlertCircle size={20} className="text-danger shrink-0" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-danger">Compliance Warning</h4>
               </div>
               <p className="text-[11px] text-white/40 leading-relaxed font-medium">
                  Detected multi-node bridging attempts will result in permanent firewall termination and asset forfeiture.
                  Maintain one wallet link per unique device identity.
               </p>
            </div>

            {/* RECENT LEDGER */}
            <CardPremium variant="standard" className="bg-[#0A0A0F] border-white/[0.08]">
               <div className="flex items-center justify-between mb-8 px-1">
                  <div className="flex items-center gap-3 text-white/40">
                     <History size={16} />
                     <h4 className="text-[10px] font-bold uppercase tracking-[0.2em]">Bridge Ledger</h4>
                  </div>
                  <button className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline">Full Audit</button>
               </div>
               <div className="py-12 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                  <Activity size={32} className="text-white/5 mb-4" />
                  <p className="text-[10px] font-bold text-white/10 uppercase tracking-[0.3em]">No historical bridges</p>
               </div>
            </CardPremium>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Withdraw;
