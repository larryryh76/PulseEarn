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
  Info,
  CheckCircle2,
  ExternalLink,
  Copy,
  Zap,
  Globe,
  Lock,
  ArrowRightLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Card from '../components/ui/Card';
import toast from 'react-hot-toast';

const Withdraw: React.FC = () => {
  const { userData } = useAuth();
  const { isConnected, address, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const [amount, setAmount] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<'usdt' | 'eth' | 'btc' | null>(null);

  if (!userData) return null;

  const minWithdraw = 10000;
  const progress = Math.min(100, (userData.points / minWithdraw) * 100);

  const methods = [
    { id: 'usdt', name: 'USDT (ERC-20)', icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10', network: 'Ethereum / Polygon' },
    { id: 'eth', name: 'Ethereum', icon: Zap, color: 'text-secondary', bg: 'bg-secondary/10', network: 'Mainnet' },
    { id: 'btc', name: 'Bitcoin (Wrapped)', icon: Building, color: 'text-orange-500', bg: 'bg-orange-500/10', network: 'WBTC Protocol' },
  ];

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-24">

        {/* BRIDGE HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div>
              <h1 className="text-5xl font-bold tracking-tight text-white mb-2">Protocol Bridge</h1>
              <p className="text-white/40 text-sm font-medium">Secure rewards extraction to your designated Web3 endpoint.</p>
           </div>

           <div className="flex items-center gap-3 bg-[#0A0A0F] border border-white/[0.05] p-2 rounded-2xl">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                 <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                 <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Network Online</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                 <ShieldCheck size={14} className="text-primary" />
                 <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">v2.4 Bridge</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

           {/* LEFT COLUMN: HUB */}
           <div className="lg:col-span-7 space-y-8">

              {/* WALLET CONNECTION HUB (REDESIGNED) */}
              <section className="space-y-6">
                 <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                       <Wallet size={16} className="text-primary" />
                       <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Web3 Connection Hub</h3>
                    </div>
                    {isConnected && (
                       <button onClick={() => disconnect()} className="text-[10px] font-bold text-danger uppercase tracking-widest hover:underline">
                          Terminate Session
                       </button>
                    )}
                 </div>

                 <Card className={cn(
                    "p-0 border-white/[0.05] overflow-hidden transition-all duration-500",
                    isConnected ? "bg-gradient-to-br from-primary/10 to-transparent" : "bg-[#0A0A0F]"
                 )}>
                    {!isConnected ? (
                       <div className="p-12 text-center flex flex-col items-center">
                          <div className="w-20 h-20 rounded-[2rem] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8 relative group">
                             <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                             <Wallet size={40} className="text-white/20 relative z-10" />
                          </div>
                          <h4 className="text-2xl font-bold text-white mb-3 tracking-tight">Connect Secure Wallet</h4>
                          <p className="text-sm text-white/40 max-w-xs mb-10 leading-relaxed">Authorized extraction requires a valid Web3 signature and secure endpoint.</p>
                          <div className="flex items-center justify-center">
                             <ConnectButton />
                          </div>

                          <div className="mt-12 grid grid-cols-3 gap-8 pt-10 border-t border-white/[0.03] w-full">
                             {['MetaMask', 'Trust Wallet', 'Phantom'].map((w) => (
                               <div key={w} className="flex flex-col items-center gap-2 grayscale opacity-30">
                                  <div className="w-8 h-8 rounded-full bg-white/5" />
                                  <span className="text-[9px] font-bold uppercase text-white/60">{w}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    ) : (
                       <div className="p-8">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8 pb-8 border-b border-white/[0.05]">
                             <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 p-0.5 flex items-center justify-center overflow-hidden">
                                   <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} className="w-full h-full" alt="" />
                                </div>
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-lg font-bold text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</h4>
                                      <button onClick={copyAddress} className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors">
                                         <Copy size={12} />
                                      </button>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className="px-2 py-0.5 rounded bg-success/10 text-success text-[9px] font-bold uppercase tracking-widest border border-success/20">Active Session</span>
                                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-1">
                                         <Globe size={10} /> Chain ID: {chainId}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[10px] font-bold text-white/40 uppercase hover:text-white transition-all">
                                   Explorer <ExternalLink size={12} />
                                </a>
                                <ConnectButton />
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] group hover:bg-white/[0.04] transition-all">
                                <Lock size={16} className="text-primary mb-3" />
                                <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Security Status</p>
                                <p className="text-sm font-bold text-white uppercase tracking-wide">Encrypted</p>
                             </div>
                             <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] group hover:bg-white/[0.04] transition-all">
                                <ArrowRightLeft size={16} className="text-accent mb-3" />
                                <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Bridge Latency</p>
                                <p className="text-sm font-bold text-white uppercase tracking-wide">42ms Optimal</p>
                             </div>
                             <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] group hover:bg-white/[0.04] transition-all">
                                <ShieldCheck size={16} className="text-success mb-3" />
                                <p className="text-[9px] font-bold text-white/20 uppercase mb-1">Auth Provider</p>
                                <p className="text-sm font-bold text-white uppercase tracking-wide">{connector?.name || 'Authorized'}</p>
                             </div>
                          </div>
                       </div>
                    )}
                 </Card>
              </section>

              {/* ASSET SELECTION (REFINED) */}
              <section className="space-y-6">
                 <div className="flex items-center gap-2 px-1">
                    <ArrowRightLeft size={16} className="text-accent" />
                    <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Extraction Asset Directive</h3>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {methods.map((method) => (
                       <button
                         key={method.id}
                         onClick={() => setSelectedMethod(method.id as any)}
                         className={cn(
                           "p-8 rounded-[2rem] border text-left transition-all group relative overflow-hidden",
                           selectedMethod === method.id
                             ? "bg-white/[0.03] border-primary shadow-[0_0_40px_rgba(0,112,255,0.15)]"
                             : "bg-[#0A0A0F] border-white/[0.05] hover:border-white/10"
                         )}
                       >
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-white/5", method.bg, method.color)}>
                             <method.icon size={24} />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">{method.name}</p>
                          <p className="text-[10px] text-white/30 font-medium uppercase tracking-tight">{method.network}</p>

                          <div className={cn(
                             "absolute bottom-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                             selectedMethod === method.id ? "bg-primary border-primary" : "border-white/5 group-hover:border-white/20"
                          )}>
                             {selectedMethod === method.id && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                       </button>
                    ))}
                 </div>
              </section>

              {/* QUANTUM AMOUNT (REFINED) */}
              <section className="space-y-6">
                 <div className="flex items-center gap-2 px-1">
                    <Zap size={16} className="text-primary" />
                    <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Magnitude Specification</h3>
                 </div>

                 <div className="p-10 rounded-[2.5rem] bg-[#0A0A0F] border border-white/[0.05] space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.02]">
                       <ArrowUpRight size={140} />
                    </div>

                    <div className="flex justify-between items-end px-1 relative z-10">
                       <div className="space-y-1">
                          <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest block">Extraction Quantity</label>
                          <p className="text-[9px] font-bold text-primary uppercase tracking-widest">AUTHORIZED LIMIT: {userData.points.toLocaleString()} PTS</p>
                       </div>
                       <span className="text-[11px] font-mono text-white/40 bg-white/5 px-3 py-1 rounded-lg border border-white/5">PROTOCOL FEE: 0.0%</span>
                    </div>

                    <div className="relative z-10">
                       <input
                         type="number"
                         value={amount}
                         onChange={(e) => setAmount(Number(e.target.value))}
                         placeholder="0.00"
                         className="w-full bg-white/[0.02] border border-white/[0.08] rounded-3xl px-8 py-8 text-4xl font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                       />
                       <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
                          <button
                            onClick={() => setAmount(Math.floor(userData.points / 2))}
                            className="px-4 py-2 rounded-xl bg-white/5 text-white/40 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                          >
                             50%
                          </button>
                          <button
                            onClick={() => setAmount(userData.points)}
                            className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                          >
                             Max
                          </button>
                       </div>
                    </div>

                    <div className="flex justify-between items-center px-4 py-4 rounded-2xl bg-white/[0.02] border border-white/5 relative z-10">
                       <span className="text-xs font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                          <Info size={14} /> Settlement Est.
                       </span>
                       <span className="text-xl font-bold text-white">{formatUSD(PTS_TO_USD(amount))}</span>
                    </div>
                 </div>
              </section>
           </div>

           {/* RIGHT COLUMN: SUMMARY */}
           <div className="lg:col-span-5 space-y-8">

              {/* CLEARANCE METER */}
              <div className="p-8 rounded-[2rem] bg-[#0A0A0F] border border-white/[0.05] relative overflow-hidden group">
                 <div className="flex justify-between items-center mb-6 relative z-10">
                    <div>
                       <h4 className="text-sm font-bold text-white uppercase tracking-widest">Protocol Clearance</h4>
                       <p className="text-[10px] text-white/40 font-medium mt-0.5">Extraction Authorization Meter</p>
                    </div>
                    <span className="text-2xl font-mono font-bold text-primary">{Math.round(progress)}%</span>
                 </div>
                 <div className="h-4 bg-white/5 rounded-full overflow-hidden relative z-10 border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_20px_rgba(0,112,255,0.4)]"
                    />
                 </div>
                 <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 relative z-10">
                    <AlertCircle size={16} className={cn(userData.points >= minWithdraw ? "text-success" : "text-primary")} />
                    <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                       {userData.points >= minWithdraw
                         ? "CLEARANCE ACHIEVED: Terminal is ready for capital extraction protocol."
                         : `ACCUMULATE ${minWithdraw.toLocaleString()} PTS TO UNLOCK GLOBAL EXTRACTION CLEARANCE.`
                       }
                    </p>
                 </div>
              </div>

              <Card className="p-10 border-white/[0.05] bg-[#0D0D12] sticky top-24 shadow-2xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05),transparent_70%)]" />

                 <div className="text-center mb-10 relative z-10">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                       <ArrowRightLeft className="text-primary" size={32} />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white/30 mb-2">Final Extraction Summary</h4>
                    <p className="text-xs text-white/40">Review positioning before signature</p>
                 </div>

                 <div className="space-y-6 mb-12 relative z-10">
                    <div className="flex justify-between items-center">
                       <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Clearance</span>
                       {userData.points >= minWithdraw ? <span className="text-[11px] text-success font-bold bg-success/10 px-3 py-1 rounded-lg">GRANTED</span> : <span className="text-[11px] text-danger font-bold bg-danger/10 px-3 py-1 rounded-lg">LOCKED</span>}
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Endpoint</span>
                       {isConnected ? <span className="text-[11px] text-success font-bold flex items-center gap-1"><ShieldCheck size={12} /> SECURE</span> : <span className="text-[11px] text-danger font-bold">OFFLINE</span>}
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[11px] text-white/40 font-bold uppercase tracking-widest">Asset</span>
                       <span className="text-[11px] text-white font-bold uppercase tracking-widest">{selectedMethod || '---'}</span>
                    </div>
                    <div className="pt-8 border-t border-white/5 flex flex-col gap-3">
                       <div className="flex justify-between items-baseline">
                          <span className="text-xs text-white/60 font-bold uppercase">Total Extraction</span>
                          <span className="text-3xl font-bold text-white tracking-tighter">{formatUSD(PTS_TO_USD(amount))}</span>
                       </div>
                       <p className="text-[10px] text-white/20 text-right font-mono uppercase">≈ {(amount/1000).toFixed(4)} EXTRACTION UNITS</p>
                    </div>
                 </div>

                 <button
                   disabled={!isConnected || !selectedMethod || amount < minWithdraw}
                   className={cn(
                    "w-full py-6 rounded-3xl text-[11px] font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 relative z-10 group overflow-hidden",
                    (!isConnected || !selectedMethod || amount < minWithdraw)
                      ? "bg-white/5 text-white/10 cursor-not-allowed"
                      : "bg-primary text-white shadow-[0_20px_50px_rgba(0,112,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                   )}
                 >
                    {isConnected && selectedMethod && amount >= minWithdraw && (
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                    )}
                    Initiate Extraction Protocol
                    <ArrowUpRight size={18} />
                 </button>

                 <div className="mt-10 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-4 relative z-10">
                    <div className="flex items-center gap-2 text-white/40">
                       <Clock size={16} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Settlement ETA</span>
                    </div>
                    <p className="text-[11px] text-white/60 font-medium leading-relaxed">
                       Standard network extraction nodes settle within <span className="text-white font-bold">2-4 hours</span>. High priority extraction available for Elite Level members.
                    </p>
                 </div>
              </Card>

              <div className="p-8 rounded-[2.5rem] bg-orange-500/5 border border-orange-500/10 flex gap-6 relative group overflow-hidden">
                 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck size={60} className="text-orange-500" />
                 </div>
                 <AlertCircle className="text-orange-500 shrink-0 mt-1" size={24} />
                 <div className="relative z-10">
                    <h5 className="text-[11px] font-bold text-orange-500 uppercase tracking-widest mb-2">Immutable Protocol Warning</h5>
                    <p className="text-[11px] text-orange-500/60 leading-relaxed font-medium">
                       Extraction targets are final. Ensure your Web3 signature corresponds to your private secure wallet. PulseEarn protocol cannot reverse finalized bridge transactions.
                    </p>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Withdraw;
