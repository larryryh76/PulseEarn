import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Wallet,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  AlertCircle,
  Building,
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Card from '../components/ui/Card';

const Withdraw: React.FC = () => {
  const { userData } = useAuth();
  const { isConnected, address } = useAccount();
  const [amount, setAmount] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<'usdt' | 'eth' | 'btc' | null>(null);

  if (!userData) return null;

  const minWithdraw = 10000;
  const progress = Math.min(100, (userData.points / minWithdraw) * 100);

  const ZapIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );

  const methods = [
    { id: 'usdt', name: 'USDT (ERC-20)', icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10' },
    { id: 'eth', name: 'Ethereum', icon: ZapIcon, color: 'text-secondary', bg: 'bg-secondary/10' },
    { id: 'btc', name: 'Bitcoin (Wrapped)', icon: Building, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-10 pb-20">

        {/* Header */}
        <div>
           <h1 className="text-4xl font-bold tracking-tight text-white">Capital Bridge</h1>
           <p className="text-white/40 text-sm mt-1 font-medium">Extract protocol rewards to your connected secure wallet.</p>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="p-8 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                 <Wallet size={120} />
              </div>
              <div className="relative z-10">
                 <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Available for Extraction</p>
                 <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold text-white tracking-tight">{userData.points.toLocaleString()}</span>
                    <span className="text-sm font-bold text-primary">PTS</span>
                 </div>
                 <p className="text-lg font-medium text-white/60">≈ {formatUSD(PTS_TO_USD(userData.points))}</p>
              </div>
           </div>

           <div className="p-8 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] flex flex-col justify-between">
              <div>
                 <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Protocol Clearance</p>
                    <span className="text-[10px] font-bold text-primary">{Math.round(progress)}%</span>
                 </div>
                 <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-primary shadow-[0_0_15px_rgba(0,112,255,0.4)]"
                    />
                 </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-white/40 font-medium leading-relaxed">
                 <Info size={16} className="text-primary shrink-0" />
                 {userData.points >= minWithdraw
                   ? "Clearance achieved. You are authorized for reward extraction."
                   : `Accumulate ${minWithdraw.toLocaleString()} PTS to authorize your first extraction.`
                 }
              </div>
           </div>
        </div>

        {/* Withdrawal Flow */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">

           <div className="lg:col-span-3 space-y-8">
              <section className="space-y-6">
                 <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">1. Extraction Point</h3>
                 </div>

                 <div className="p-6 rounded-3xl bg-[#0A0A0F] border border-white/[0.05]">
                    {!isConnected ? (
                       <div className="py-10 text-center space-y-6">
                          <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
                             <Wallet size={32} />
                          </div>
                          <div className="max-w-xs mx-auto">
                             <h4 className="font-bold text-white mb-2">No Wallet Connected</h4>
                             <p className="text-xs text-white/40 mb-6">Connect your MetaMask or WalletConnect to designate an extraction target.</p>
                             <div className="flex justify-center">
                                <ConnectButton />
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                                <CheckCircle2 size={24} />
                             </div>
                             <div>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Active Extract Target</p>
                                <p className="text-sm font-mono font-bold text-white">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                             </div>
                          </div>
                          <ConnectButton />
                       </div>
                    )}
                 </div>
              </section>

              <section className="space-y-6">
                 <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">2. Asset Selection</h3>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {methods.map((method) => (
                       <button
                         key={method.id}
                         onClick={() => setSelectedMethod(method.id as any)}
                         className={cn(
                           "p-6 rounded-3xl border text-center transition-all group relative overflow-hidden",
                           selectedMethod === method.id
                             ? "bg-white/[0.03] border-primary shadow-[0_0_30px_rgba(0,112,255,0.1)]"
                             : "bg-[#0A0A0F] border-white/[0.05] hover:border-white/10"
                         )}
                       >
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/5", method.bg, method.color)}>
                             <method.icon size={20} />
                          </div>
                          <p className="text-xs font-bold text-white">{method.name}</p>
                          {selectedMethod === method.id && (
                             <div className="absolute top-2 right-2 text-primary">
                                <CheckCircle2 size={16} fill="currentColor" />
                             </div>
                          )}
                       </button>
                    ))}
                 </div>
              </section>

              <section className="space-y-6">
                 <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">3. Quantum Amount</h3>
                 </div>

                 <div className="p-8 rounded-3xl bg-[#0A0A0F] border border-white/[0.05] space-y-6">
                    <div className="flex justify-between items-end px-1">
                       <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Amount to Extract</label>
                       <span className="text-[10px] font-mono text-white/40">Fee: 0.00%</span>
                    </div>
                    <div className="relative">
                       <input
                         type="number"
                         value={amount}
                         onChange={(e) => setAmount(Number(e.target.value))}
                         placeholder="Enter PTS..."
                         className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-5 text-xl font-bold focus:outline-none focus:border-primary/50 transition-all"
                       />
                       <button
                         onClick={() => setAmount(userData.points)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                       >
                          Max
                       </button>
                    </div>
                    <div className="flex justify-between text-[11px] font-medium px-1">
                       <span className="text-white/20">Receiving ≈</span>
                       <span className="text-white">{formatUSD(PTS_TO_USD(amount))}</span>
                    </div>
                 </div>
              </section>
           </div>

           <div className="lg:col-span-2 space-y-6">
              <Card className="p-8 border-white/[0.05] bg-[#0D0D12] sticky top-24">
                 <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-8 text-center">Extraction Summary</h4>

                 <div className="space-y-6 mb-10">
                    <div className="flex justify-between">
                       <span className="text-[11px] text-white/40 font-medium">Clearance Check</span>
                       {userData.points >= minWithdraw ? <span className="text-[11px] text-success font-bold">Authorized</span> : <span className="text-[11px] text-danger font-bold">Blocked</span>}
                    </div>
                    <div className="flex justify-between">
                       <span className="text-[11px] text-white/40 font-medium">Wallet Connectivity</span>
                       {isConnected ? <span className="text-[11px] text-success font-bold">Encrypted</span> : <span className="text-[11px] text-danger font-bold">Offline</span>}
                    </div>
                    <div className="flex justify-between">
                       <span className="text-[11px] text-white/40 font-medium">Target Asset</span>
                       <span className="text-[11px] text-white font-bold uppercase">{selectedMethod || 'Not Selected'}</span>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex justify-between items-baseline">
                       <span className="text-sm text-white/60 font-bold">Total Extraction</span>
                       <span className="text-2xl font-bold text-white">{formatUSD(PTS_TO_USD(amount))}</span>
                    </div>
                 </div>

                 <button
                   disabled={!isConnected || !selectedMethod || amount < minWithdraw}
                   className={cn(
                    "w-full py-5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3",
                    (!isConnected || !selectedMethod || amount < minWithdraw)
                      ? "bg-white/5 text-white/10 cursor-not-allowed"
                      : "bg-primary text-white shadow-[0_10px_40px_rgba(0,112,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                   )}
                 >
                    Initiate Extraction Protocol
                    <ArrowUpRight size={18} />
                 </button>

                 <div className="mt-8 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4">
                    <div className="flex items-center gap-2 text-white/40">
                       <Clock size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Protocol ETA</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <p className="text-[11px] text-white/60 font-medium leading-relaxed pr-4">Network extraction usually completes within 2-4 hours.</p>
                       <ChevronRight size={16} className="text-white/10" />
                    </div>
                 </div>
              </Card>

              <div className="p-6 rounded-3xl bg-orange-500/5 border border-orange-500/10 flex gap-4">
                 <AlertCircle className="text-orange-500 shrink-0" size={20} />
                 <div>
                    <h5 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Security Warning</h5>
                    <p className="text-[10px] text-orange-500/60 leading-relaxed font-medium">Ensure your extraction target matches your private secure wallet. Transactions on the protocol are irreversible.</p>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Withdraw;
