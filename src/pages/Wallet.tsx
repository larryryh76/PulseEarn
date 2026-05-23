import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Building,
  CheckCircle2,
  ExternalLink,
  Copy,
  Zap,
  Globe,
  Lock,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Send,
  History
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { useAccount, useDisconnect, useChainId } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import ErrorBoundary from '../components/ui/ErrorBoundary';

const Wallet: React.FC = () => {
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
      toast.success('Address copied');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-10 pb-24">

        <ErrorBoundary name="WalletHeader">
          {/* WALLET PORTFOLIO HERO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

             {/* BALANCE SECTION (PHANTOM STYLE) */}
             <div className="lg:col-span-2 p-10 rounded-[2.5rem] bg-[#0A0A0F] border border-white/[0.05] relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.08),transparent_70%)] pointer-events-none" />
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                   <TrendingUp size={200} />
                </div>

                <div className="relative z-10">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Institutional Custody</span>
                   </div>
                   <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Available Balance</h2>
                   <div className="flex items-baseline gap-4 mt-2">
                      <h1 className="text-6xl font-bold tracking-tighter text-white">{userData.points.toLocaleString()}</h1>
                      <span className="text-xl font-bold text-primary tracking-widest uppercase">PTS</span>
                   </div>
                   <p className="text-2xl font-medium text-white/40 mt-1 font-mono">{formatUSD(PTS_TO_USD(userData.points))}</p>
                </div>

                <div className="mt-10 relative z-10">
                   <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-white/40">
                         <span>Extraction Clearance</span>
                         <span className={cn(userData.points >= minWithdraw ? "text-success" : "text-primary")}>
                            {Math.round(progress)}%
                         </span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: `${progress}%` }}
                           className="h-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px_rgba(0,112,255,0.3)]"
                         />
                      </div>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
                         <ShieldCheck size={12} className={userData.points >= minWithdraw ? "text-success" : "text-primary"} />
                         {userData.points >= minWithdraw
                           ? "Terminal ready for capital extraction protocol."
                           : `${(minWithdraw - userData.points).toLocaleString()} PTS required to unlock withdrawals.`}
                      </p>
                   </div>
                </div>
             </div>

             {/* QUICK ACTIONS */}
             <div className="space-y-6">
                <Card className="p-8 border-white/[0.05] bg-[#0D0D12] h-full flex flex-col justify-between relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary/[0.02] pointer-events-none" />

                   <div>
                      <h3 className="text-[11px] font-bold text-white/20 uppercase tracking-[0.2em] mb-6">Quick Transact</h3>
                      <div className="grid grid-cols-2 gap-4">
                         {[
                           { label: 'Receive', icon: ArrowUpRight, rotate: 180, color: 'text-success' },
                           { label: 'Send', icon: Send, color: 'text-primary' },
                           { label: 'Swap', icon: ArrowRightLeft, color: 'text-accent' },
                           { label: 'History', icon: History, color: 'text-white/40' }
                         ].map(action => (
                           <button key={action.label} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all group/btn flex flex-col items-center gap-2">
                              <div className={cn("p-3 rounded-xl bg-white/5 transition-transform group-hover/btn:scale-110", action.color)}>
                                 <action.icon size={20} className={cn(action.rotate && `rotate-${action.rotate}`)} />
                              </div>
                              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{action.label}</span>
                           </button>
                         ))}
                      </div>
                   </div>

                   <div className="mt-8">
                      <Button variant="primary" className="w-full py-5 text-[11px] font-bold uppercase tracking-[0.3em]">
                         Bridge Assets
                      </Button>
                   </div>
                </Card>
             </div>
          </div>
        </ErrorBoundary>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

           {/* ASSET LIST & BRIDGE HUB */}
           <div className="lg:col-span-8 space-y-8">

              {/* CONNECTION CARD (PHANTOM STYLE) */}
              <section className="space-y-6">
                 <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                       <WalletIcon size={16} className="text-primary" />
                       <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Connected Endpoints</h3>
                    </div>
                    {isConnected && (
                       <button onClick={() => disconnect()} className="text-[10px] font-bold text-danger uppercase tracking-widest hover:underline">
                          Terminate Session
                       </button>
                    )}
                 </div>

                 <Card className={cn(
                    "p-0 border-white/[0.05] overflow-hidden transition-all duration-500",
                    isConnected ? "bg-gradient-to-br from-primary/10 to-transparent shadow-2xl" : "bg-[#0A0A0F]"
                 )}>
                    {!isConnected ? (
                       <div className="p-16 text-center flex flex-col items-center">
                          <div className="w-20 h-20 rounded-[2rem] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8 relative group">
                             <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                             <WalletIcon size={40} className="text-white/20 relative z-10" />
                          </div>
                          <h4 className="text-2xl font-bold text-white mb-3 tracking-tight">Connect Secure Wallet</h4>
                          <p className="text-sm text-white/40 max-w-xs mb-10 leading-relaxed">Authorized extraction requires a valid Web3 signature and secure endpoint.</p>
                          <ConnectButton.Custom>
                            {({ openConnectModal }) => (
                              <Button onClick={openConnectModal} glow className="px-12 py-4">Link Provider</Button>
                            )}
                          </ConnectButton.Custom>
                       </div>
                    ) : (
                       <div className="p-10">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                             <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-2xl bg-[#030305] border border-white/5 p-1 flex items-center justify-center overflow-hidden shadow-2xl">
                                   <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} className="w-full h-full" alt="" />
                                </div>
                                <div>
                                   <div className="flex items-center gap-3 mb-2">
                                      <h4 className="text-2xl font-bold text-white font-mono tracking-tighter">{address?.slice(0, 6)}...{address?.slice(-4)}</h4>
                                      <button onClick={copyAddress} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white transition-colors">
                                         <Copy size={14} />
                                      </button>
                                   </div>
                                   <div className="flex items-center gap-3">
                                      <span className="px-3 py-1 rounded-lg bg-success/10 text-success text-[10px] font-bold uppercase tracking-widest border border-success/20">Active Session</span>
                                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest flex items-center gap-2">
                                         <Globe size={12} /> {chainId === 1 ? 'Ethereum Mainnet' : `Chain: ${chainId}`}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="flex items-center gap-3 w-full md:w-auto">
                                <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noreferrer" className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 text-[10px] font-bold text-white/40 uppercase hover:text-white transition-all border border-white/5">
                                   Explorer <ExternalLink size={14} />
                                </a>
                                <ConnectButton />
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                             {[
                               { label: 'Security', value: 'Encrypted', icon: Lock, color: 'text-primary' },
                               { label: 'Latency', value: '42ms Optimal', icon: ArrowRightLeft, color: 'text-accent' },
                               { label: 'Provider', value: connector?.name || 'Authorized', icon: ShieldCheck, color: 'text-success' }
                             ].map(stat => (
                               <div key={stat.label} className="p-6 rounded-2xl bg-[#030305]/50 border border-white/[0.05] group hover:bg-white/[0.04] transition-all">
                                  <stat.icon size={18} className={cn("mb-4", stat.color)} />
                                  <p className="text-[9px] font-bold text-white/20 uppercase mb-1 tracking-[0.2em]">{stat.label}</p>
                                  <p className="text-sm font-bold text-white uppercase tracking-wide">{stat.value}</p>
                               </div>
                             ))}
                          </div>
                       </div>
                    )}
                 </Card>
              </section>

              {/* ASSET SELECTOR */}
              <section className="space-y-6">
                 <div className="flex items-center gap-2 px-1">
                    <CreditCard size={16} className="text-accent" />
                    <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">Extraction Method</h3>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {methods.map((method) => (
                       <button
                         key={method.id}
                         onClick={() => setSelectedMethod(method.id as any)}
                         className={cn(
                           "p-8 rounded-3xl border text-left transition-all group relative overflow-hidden",
                           selectedMethod === method.id
                             ? "bg-[#0070ff]/5 border-primary shadow-[0_0_40px_rgba(0,112,255,0.1)]"
                             : "bg-[#0A0A0F] border-white/[0.05] hover:border-white/10"
                         )}
                       >
                          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-white/5", method.bg, method.color)}>
                             <method.icon size={24} />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">{method.name}</p>
                          <p className="text-[10px] text-white/30 font-medium uppercase tracking-tight">{method.network}</p>

                          <div className={cn(
                             "absolute bottom-6 right-6 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                             selectedMethod === method.id ? "bg-primary border-primary" : "border-white/5 group-hover:border-white/20"
                          )}>
                             {selectedMethod === method.id && <CheckCircle2 size={14} className="text-white" />}
                          </div>
                       </button>
                    ))}
                 </div>
              </section>
           </div>

           {/* FINAL EXTRACTION SPEC */}
           <div className="lg:col-span-4 space-y-6">
              <Card className="p-8 border-white/[0.05] bg-[#0D0D12] sticky top-24 shadow-2xl relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,112,255,0.05),transparent_70%)] pointer-events-none" />

                 <div className="text-center mb-10 relative z-10">
                    <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                       <Zap className="text-primary" size={32} />
                    </div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-2">Protocol Authorization</h4>
                    <p className="text-[11px] text-white/40">Enter Magnitude</p>
                 </div>

                 <div className="space-y-6 relative z-10">
                    <div className="relative">
                       <input
                         type="number"
                         value={amount}
                         onChange={(e) => setAmount(Number(e.target.value))}
                         placeholder="0"
                         className="w-full bg-[#030305] border border-white/[0.08] rounded-2xl px-6 py-6 text-3xl font-bold focus:outline-none focus:border-primary/50 transition-all font-mono"
                       />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          <button onClick={() => setAmount(Math.floor(userData.points / 2))} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/40 text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">50%</button>
                          <button onClick={() => setAmount(userData.points)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">MAX</button>
                       </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                       <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-white/30">Settlement Est.</span>
                          <span className="text-white">{formatUSD(PTS_TO_USD(amount))}</span>
                       </div>
                       <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                          <span className="text-white/30">Protocol Fee</span>
                          <span className="text-success">0.00%</span>
                       </div>
                       <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                          <span className="text-[11px] font-bold text-white uppercase tracking-widest">Total Extract</span>
                          <span className="text-lg font-bold text-primary font-mono">{amount.toLocaleString()} <span className="text-[10px]">PTS</span></span>
                       </div>
                    </div>

                    <button
                      disabled={!isConnected || !selectedMethod || amount < minWithdraw}
                      className={cn(
                       "w-full py-6 rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 group relative overflow-hidden",
                       (!isConnected || !selectedMethod || amount < minWithdraw)
                         ? "bg-white/5 text-white/10 cursor-not-allowed"
                         : "bg-primary text-white shadow-[0_20px_50px_rgba(0,112,255,0.3)] hover:scale-[1.02] active:scale-[0.98]"
                      )}
                    >
                       Initiate Extraction
                       <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="flex items-center gap-3 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
                       <Clock size={16} className="text-orange-500 shrink-0" />
                       <p className="text-[9px] text-orange-500/60 font-bold uppercase tracking-widest">Est. Settlement: 2-4 Hours</p>
                    </div>
                 </div>
              </Card>
           </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Wallet;
