import React, { useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { CardPremium } from '../components/ui/PremiumModules';
import { useAuth } from '../contexts/AuthContext';
import {
  Wallet,
  ShieldCheck,
  AlertCircle,
  Lock,
  Globe,
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
    { id: 'ton', name: 'TON Protocol', icon: '💎', speed: '~5m', fee: 'Free' },
    { id: 'sol', name: 'Solana', icon: '☀️', speed: '~1m', fee: 'Free' },
    { id: 'base', name: 'Base L2', icon: '🔵', speed: '~2m', fee: 'Free' },
    { id: 'eth', name: 'Ethereum', icon: '⟠', speed: '~15m', fee: 'Gas' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-10">

        {/* HEADER */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary font-bold">
             <Globe size={14} />
             <span className="text-[10px] uppercase tracking-[0.2em]">Asset Withdrawal</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Withdraw Funds</h1>
          <p className="text-white/40 text-sm">Settle your earnings to your personal wallet.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-8">

            {/* PROGRESS CARD */}
            <CardPremium className="p-8 border-white/[0.05] bg-gradient-to-br from-[#0A0A14] to-transparent">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Available Balance</p>
                  <h2 className="text-5xl font-bold text-white">{userData.points.toLocaleString()} <span className="text-lg text-white/20 ml-1">PTS</span></h2>
                  <p className="text-lg font-medium text-success">≈ {formatUSD(PTS_TO_USD(userData.points))}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Lock size={18} />
                   </div>
                   <div>
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Withdrawal Min.</p>
                      <p className="text-sm font-bold text-white">10,000 PTS</p>
                   </div>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-white/30">Goal Progress</span>
                  <span className="text-primary">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={cn(
                      "h-full rounded-full transition-all relative overflow-hidden",
                      isEligible ? "bg-success" : "bg-primary"
                    )}
                  >
                     <div className="absolute inset-0 animate-shimmer" />
                  </motion.div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-white/20">
                  <span>0 PTS</span>
                  <span>10,000 PTS</span>
                </div>
              </div>

              {!isEligible && (
                <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                   <Zap size={16} className="text-primary" />
                   <p className="text-[11px] text-white/60 font-medium leading-relaxed">
                      You need <span className="text-white font-bold">{(10000 - userData.points).toLocaleString()} more PTS</span> to unlock withdrawals.
                   </p>
                </div>
              )}
            </CardPremium>

            {/* NETWORK SELECTION */}
            <div className={cn("space-y-6 transition-opacity duration-500", !isEligible && "opacity-30 pointer-events-none")}>
               <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Select Network</h3>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {networks.map(net => (
                    <button
                      key={net.id}
                      onClick={() => setSelectedNetwork(net.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition-all text-center relative group",
                        selectedNetwork === net.id
                          ? "bg-primary/10 border-primary"
                          : "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]"
                      )}
                    >
                       <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">{net.icon}</span>
                       <h4 className="font-bold text-white text-xs mb-1">{net.name}</h4>
                       <p className="text-[8px] text-white/30 font-bold uppercase">{net.speed}</p>
                    </button>
                  ))}
               </div>
            </div>

            {/* CONNECT BUTTON */}
            <button
              disabled={!selectedNetwork || !isEligible || isConnecting}
              onClick={() => setIsConnecting(true)}
              className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:grayscale transition-all font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
            >
               {isConnecting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
               ) : (
                  <>
                     <Wallet size={18} />
                     Connect Wallet to Withdraw
                  </>
               )}
            </button>
          </div>

          <div className="space-y-6">
            {/* SECURITY CARD */}
            <CardPremium className="space-y-6 bg-[#0A0A0F]">
               <div className="flex items-center gap-2 text-primary">
                  <ShieldCheck size={18} />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Security First</h4>
               </div>
               <div className="space-y-4">
                  <div className="flex items-start gap-3">
                     <div className="w-1 h-1 rounded-full bg-primary mt-1.5" />
                     <p className="text-[10px] text-white/40 leading-relaxed font-medium">Verified withdrawals are processed within 24-72 hours.</p>
                  </div>
                  <div className="flex items-start gap-3">
                     <div className="w-1 h-1 rounded-full bg-primary mt-1.5" />
                     <p className="text-[10px] text-white/40 leading-relaxed font-medium">Ensure your wallet supports the selected network.</p>
                  </div>
               </div>
            </CardPremium>

            {/* HELP */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
               <div className="flex items-center gap-2 text-white/40">
                  <AlertCircle size={16} />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest">Need Help?</h4>
               </div>
               <p className="text-[10px] text-white/30 leading-relaxed font-medium">
                  Contact support if your withdrawal takes longer than 5 business days.
               </p>
               <button className="text-[9px] font-bold text-primary uppercase tracking-widest hover:underline">Support Center</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Withdraw;
