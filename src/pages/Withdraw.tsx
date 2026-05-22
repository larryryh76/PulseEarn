import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import {
  Wallet,
  ShieldCheck,
  AlertCircle,
  Lock,
  CheckCircle2,
  History,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD, WITHDRAWAL_MIN_PTS } from '../utils/finance';

const Withdraw: React.FC = () => {
  const { userData } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!userData) return null;

  const pointsNeeded = WITHDRAWAL_MIN_PTS - userData.points;
  const isEligible = userData.points >= WITHDRAWAL_MIN_PTS;
  const progress = Math.min((userData.points / WITHDRAWAL_MIN_PTS) * 100, 100);

  const networks = [
    { id: 'ton', name: 'TON Network', icon: '💎', speed: '~5 min' },
    { id: 'sol', name: 'Solana', icon: '☀️', speed: '~1 min' },
    { id: 'base', name: 'Base (L2)', icon: '🔵', speed: '~2 min' },
    { id: 'eth', name: 'Ethereum', icon: '⟠', speed: '~15 min' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Liquidity Bridge</h1>
        <p className="text-white/40">Connect your external wallet to settle your Pulse earnings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Eligibility Card */}
          <Card className="p-8 border-white/[0.05] bg-gradient-to-br from-[#0A0A0F] to-[#12121A] relative overflow-hidden">
             {!isEligible && (
                <div className="absolute top-0 right-0 p-6">
                   <Lock size={40} className="text-white/5" />
                </div>
             )}

             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                   <h3 className="text-xl font-bold mb-1">Withdrawal Status</h3>
                   <p className="text-xs text-white/40 font-medium">Protocol requirements for capital settlement.</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
                   Min: {WITHDRAWAL_MIN_PTS.toLocaleString()} PTS
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex justify-between items-end">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">Current Accumulation</span>
                      <span className="text-4xl font-mono font-bold text-white">{userData.points.toLocaleString()} <span className="text-primary text-xl">PTS</span></span>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-2">USD Value</span>
                      <p className="text-2xl font-mono font-bold text-green-500">{formatUSD(PTS_TO_USD(userData.points))}</p>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn(
                          "h-full shadow-[0_0_15px_rgba(0,112,255,0.4)] transition-all",
                          isEligible ? "bg-green-500" : "bg-primary"
                        )}
                      />
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{progress.toFixed(1)}% Complete</span>
                      {!isEligible && (
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                           {pointsNeeded.toLocaleString()} PTS remaining
                        </span>
                      )}
                      {isEligible && (
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1">
                           <CheckCircle2 size={12} />
                           Threshold Met
                        </span>
                      )}
                   </div>
                </div>
             </div>
          </Card>

          {/* Network Selection */}
          <div className={cn("space-y-4", !isEligible && "opacity-40 pointer-events-none")}>
             <h3 className="text-xs font-bold text-white/20 uppercase tracking-[0.25em] ml-2">Secure Network Path</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {networks.map(net => (
                  <button
                    key={net.id}
                    onClick={() => setSelectedNetwork(net.id)}
                    className={cn(
                      "p-5 rounded-[2rem] border transition-all text-left relative overflow-hidden group",
                      selectedNetwork === net.id
                        ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(0,112,255,0.2)]"
                        : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                    )}
                  >
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">{net.icon}</span>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          selectedNetwork === net.id ? "border-primary bg-primary" : "border-white/10"
                        )}>
                           {selectedNetwork === net.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                     </div>
                     <h4 className="font-bold text-sm mb-1">{net.name}</h4>
                     <p className="text-[10px] text-white/20 font-bold uppercase">Speed: {net.speed}</p>
                  </button>
                ))}
             </div>
          </div>

          {/* Connect Section */}
          <Card className={cn("p-8 border-white/[0.05] bg-[#0A0A0F]", !selectedNetwork && "opacity-40 pointer-events-none")}>
             <div className="flex flex-col items-center text-center max-w-sm mx-auto">
                <div className="w-20 h-20 rounded-[2.5rem] bg-primary/20 flex items-center justify-center text-primary mb-6 border border-primary/20">
                   <ShieldCheck size={40} />
                </div>
                <h3 className="text-lg font-bold mb-2">Bridge Authentication</h3>
                <p className="text-xs text-white/40 mb-8 leading-relaxed">
                   To settle your Pulse, you must sign a non-custodial link request with your wallet.
                   This does not grant access to your private keys.
                </p>
                <button
                  disabled={isConnecting}
                  onClick={() => setIsConnecting(true)}
                  className="w-full py-4 rounded-2xl bg-primary hover:bg-primary/90 transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(0,112,255,0.3)]"
                >
                   {isConnecting ? (
                     <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                        <History size={18} />
                     </motion.div>
                   ) : <Wallet size={18} />}
                   {isConnecting ? 'Linking Node...' : 'Authorize Wallet Bridge'}
                </button>
             </div>
          </Card>
        </div>

        <div className="space-y-6">
           <Card className="p-6 border-white/[0.05] bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-6 text-primary">
                 <Info size={18} />
                 <h4 className="text-xs font-bold uppercase tracking-widest">Protocol Rules</h4>
              </div>
              <div className="space-y-4">
                 {[
                   { label: 'Settlement Window', val: '24-72h' },
                   { label: 'Gas Fee', val: '0.00 PTS' },
                   { label: 'Anti-Fraud Audit', val: 'Required' },
                   { label: 'Daily Cap', val: '$500 USD' }
                 ].map((rule, i) => (
                   <div key={i} className="flex justify-between items-center pb-3 border-b border-white/[0.02] last:border-0 last:pb-0">
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">{rule.label}</span>
                      <span className="text-[10px] font-mono font-bold text-white/60">{rule.val}</span>
                   </div>
                 ))}
              </div>
           </Card>

           <div className="p-5 rounded-[2rem] bg-red-500/5 border border-red-500/10">
              <div className="flex gap-3">
                 <AlertCircle size={16} className="text-red-500 shrink-0" />
                 <p className="text-[10px] text-white/40 leading-relaxed">
                    Attempts to use multiple accounts for the same wallet will result in permanent node termination.
                    Ensure your device identity is verified before bridging.
                 </p>
              </div>
           </div>

           <Card className="p-6 border-white/[0.05] bg-white/[0.01]">
              <div className="flex items-center justify-between mb-4">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Settlement History</h4>
                 <button className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline">View All</button>
              </div>
              <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                 <p className="text-[10px] font-bold text-white/10 uppercase tracking-widest">No previous settlements</p>
              </div>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Withdraw;
