import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import {
  ArrowUpRight,
  ShieldCheck,
  Copy,
  Zap,
  Globe,
  Lock,
  ArrowRightLeft,
  TrendingUp,
  CreditCard,
  Send,
  MoreHorizontal,
  Info,
  AlertTriangle,
  ExternalLink,
  Wallet as WalletIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils';
import { PTS_TO_USD, formatUSD } from '../utils/finance';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import ErrorBoundary from '../components/ui/ErrorBoundary';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const { isConnected, address, connector } = useAccount();
  const { disconnect } = useDisconnect();

  const [activeTab, setActiveTab] = useState<'assets' | 'history' | 'withdraw'>('assets');

  if (!userData) return null;

  const minWithdraw = 10000;
  const currentPoints = userData.points;
  const usdValue = PTS_TO_USD(currentPoints);
  const progress = Math.min(100, (currentPoints / minWithdraw) * 100);
  const pointsRemaining = Math.max(0, minWithdraw - currentPoints);

  const assets = [
    { name: 'Pulse Points', symbol: 'PTS', amount: currentPoints, usd: usdValue, icon: Zap, color: 'text-primary', bg: 'bg-primary/10', change: '+12.4%' },
    { name: 'Ethereum', symbol: 'ETH', amount: 0.00, usd: 0.00, icon: Globe, color: 'text-secondary', bg: 'bg-secondary/10', change: '0.0%' },
    { name: 'USDT', symbol: 'USDT', amount: 0.00, usd: 0.00, icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10', change: '0.0%' },
  ];

  const transactions = [
    { id: 'tx1', type: 'reward', label: 'Prediction Win', amount: '+925 PTS', date: '2h ago', status: 'confirmed', chain: 'Internal' },
    { id: 'tx2', type: 'reward', label: 'Daily Mission', amount: '+50 PTS', date: '5h ago', status: 'confirmed', chain: 'Internal' },
    { id: 'tx3', type: 'stake', label: 'Prediction Stake', amount: '-500 PTS', date: '8h ago', status: 'confirmed', chain: 'Internal' },
    { id: 'tx4', type: 'system', label: 'Signup Bonus', amount: '+1,000 PTS', date: '2d ago', status: 'confirmed', chain: 'Internal' },
  ];

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-32 space-y-8">

        {/* PORTFOLIO HERO */}
        <ErrorBoundary name="WalletHero">
          <div className="relative text-center pt-8 pb-4">
             <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_40%,rgba(0,112,255,0.08),transparent_70%)]" />

             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-4"
             >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                   <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Ecosystem Wallet Active</span>
                </div>

                <div className="space-y-1">
                   <p className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Estimated Net Worth</p>
                   <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
                      {formatUSD(usdValue)}
                   </h1>
                </div>

                <div className="flex items-center justify-center gap-4">
                   <span className="text-sm font-mono font-bold text-success flex items-center gap-1.5 bg-success/5 px-2 py-0.5 rounded-lg border border-success/10">
                      <TrendingUp size={14} /> +{((usdValue / 100) * 5).toFixed(2)}%
                   </span>
                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Last 24h</span>
                </div>
             </motion.div>

             {/* QUICK ACTIONS */}
             <div className="flex justify-center gap-4 md:gap-8 mt-12">
                {[
                  { label: 'Receive', icon: ArrowUpRight, rotate: 180 },
                  { label: 'Send', icon: Send },
                  { label: 'Swap', icon: ArrowRightLeft },
                  { label: 'Withdraw', icon: CreditCard, action: () => setActiveTab('withdraw') },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    className="group flex flex-col items-center gap-2.5"
                  >
                     <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center transition-all group-hover:bg-primary group-hover:border-primary group-hover:shadow-[0_0_20px_rgba(0,112,255,0.3)] group-active:scale-95">
                        <action.icon size={20} className={cn("transition-transform", action.rotate && `rotate-${action.rotate}`)} />
                     </div>
                     <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">{action.label}</span>
                  </button>
                ))}
             </div>
          </div>
        </ErrorBoundary>

        {/* WITHDRAWAL PROGRESSION */}
        <section className="px-4">
           <Card className="p-6 md:p-8 border-white/[0.05] bg-gradient-to-br from-[#0A0A0F] to-[#12121A] relative overflow-hidden rounded-[2rem]">
              <div className="absolute top-0 right-0 p-8 opacity-[0.02]">
                 <Lock size={120} />
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
                 <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <TrendingUp size={20} className="text-primary" />
                       </div>
                       <div>
                          <h3 className="text-lg font-bold">Withdrawal Unlock</h3>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Earning Milestone Progression</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex justify-between items-end">
                          <div className="space-y-1">
                             <p className="text-2xl font-mono font-bold text-white">{currentPoints.toLocaleString()} <span className="text-white/20 text-xs uppercase">PTS</span></p>
                             <p className="text-[10px] text-white/40 font-medium">Goal: {minWithdraw.toLocaleString()} PTS ($10.00)</p>
                          </div>
                          <span className="text-xl font-mono font-bold text-primary">{Math.round(progress)}%</span>
                       </div>

                       <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full shadow-[0_0_15px_rgba(0,112,255,0.5)]"
                          />
                       </div>
                    </div>
                 </div>

                 <div className="w-full md:w-auto bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between gap-10">
                       <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Remaining</span>
                       <span className="text-sm font-mono font-bold text-white">{pointsRemaining.toLocaleString()} PTS</span>
                    </div>
                    <div className="flex items-center justify-between gap-10">
                       <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Est. Value</span>
                       <span className="text-sm font-mono font-bold text-success">{formatUSD(PTS_TO_USD(pointsRemaining))}</span>
                    </div>
                    <Button
                      onClick={() => setActiveTab('withdraw')}
                      variant="outline"
                      size="sm"
                      className="w-full text-[9px] uppercase tracking-widest font-bold border-white/10"
                    >
                       How to unlock
                    </Button>
                 </div>
              </div>
           </Card>
        </section>

        {/* MAIN CONTENT TABS */}
        <section className="px-4">
           <div className="flex border-b border-white/[0.05] mb-8">
              {[
                { id: 'assets', label: 'Portfolio Assets' },
                { id: 'history', label: 'Transaction History' },
                { id: 'withdraw', label: 'Withdrawal Info' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative",
                    activeTab === tab.id ? "text-primary" : "text-white/20 hover:text-white/40"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div layoutId="walletTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                  )}
                </button>
              ))}
           </div>

           <AnimatePresence mode="wait">
              {activeTab === 'assets' && (
                <motion.div
                  key="assets"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                   {assets.map((asset) => (
                     <div
                       key={asset.symbol}
                       className="group p-5 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10 transition-all flex items-center justify-between cursor-pointer"
                     >
                        <div className="flex items-center gap-5">
                           <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 shadow-xl", asset.bg, asset.color)}>
                              <asset.icon size={24} />
                           </div>
                           <div>
                              <h4 className="font-bold text-white tracking-tight">{asset.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{asset.symbol}</span>
                                 <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/5", asset.change === '0.0%' ? "text-white/20" : "text-success")}>
                                    {asset.change}
                                 </span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-bold text-white tracking-tight">{asset.amount.toLocaleString()} {asset.symbol}</p>
                           <p className="text-[11px] font-mono font-bold text-white/20 mt-1">{formatUSD(asset.usd)}</p>
                        </div>
                     </div>
                   ))}

                   <Button variant="outline" className="w-full py-4 rounded-2xl border-dashed border-white/10 hover:border-primary/50 text-[10px] text-white/20 hover:text-primary uppercase tracking-widest mt-6">
                      <MoreHorizontal size={14} className="mr-2" /> Add External Assets
                   </Button>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                   {transactions.map((tx) => (
                     <div key={tx.id} className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between group hover:bg-white/[0.03] transition-all relative overflow-hidden">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center border border-white/5",
                             tx.amount.startsWith('+') ? "bg-success/5 text-success" : "bg-primary/5 text-primary"
                           )}>
                              {tx.amount.startsWith('+') ? <Zap size={18} /> : <ArrowRightLeft size={18} />}
                           </div>
                           <div>
                              <p className="text-[13px] font-bold text-white leading-tight">{tx.label}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{tx.date}</span>
                                 <span className="w-1 h-1 rounded-full bg-white/10" />
                                 <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{tx.chain} Network</span>
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={cn("text-sm font-bold tracking-tight", tx.amount.startsWith('+') ? "text-success" : "text-white")}>{tx.amount}</p>
                           <div className="flex items-center justify-end gap-1.5 mt-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">{tx.status}</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </motion.div>
              )}

              {activeTab === 'withdraw' && (
                <motion.div
                  key="withdraw"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                   <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] space-y-8">
                      <div className="space-y-2">
                         <h3 className="text-2xl font-bold tracking-tight">Withdrawal Information</h3>
                         <p className="text-white/40 text-sm leading-relaxed">PulseEarn maintains a high-fidelity reward ecosystem. Understanding our withdrawal process ensures protocol sustainability.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                               <Info size={18} className="text-primary" />
                            </div>
                            <div>
                               <h4 className="text-sm font-bold mb-1">Conversion Logic</h4>
                               <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">1,000 Points = $1.00 USD. Rewards are settled in USDT/USDC or BTC.</p>
                            </div>
                         </div>
                         <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 border border-accent/20">
                               <Lock size={18} className="text-accent" />
                            </div>
                            <div>
                               <h4 className="text-sm font-bold mb-1">Threshold Security</h4>
                               <p className="text-[11px] text-white/40 leading-relaxed font-medium uppercase tracking-tight">10,000 Points ($10) minimum. This prevents spam and stabilizes the reward pool.</p>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-1">Protocol Protection Measures</h4>
                         <div className="space-y-2">
                            {[
                              { title: 'Reward Stabilization', desc: 'Batch payouts ensure we maintain liquidity for all ecosystem members.' },
                              { title: 'Anti-Fraud Verification', desc: 'Withdrawal requests undergo automated node verification to prevent exploitation.' },
                              { title: 'Institutional Payouts', desc: 'Large extractions may require a 24-hour verification window for security.' }
                            ].map((item, i) => (
                              <div key={i} className="p-4 rounded-xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                    <span className="text-[11px] font-bold text-white/70">{item.title}</span>
                                 </div>
                                 <span className="text-[10px] text-white/20">{item.desc}</span>
                              </div>
                            ))}
                         </div>
                      </div>

                      <Button
                        glow
                        className="w-full py-4 text-xs font-bold uppercase tracking-widest"
                        disabled={currentPoints < minWithdraw}
                      >
                         {currentPoints < minWithdraw ? 'Threshold Not Reached' : 'Initialize Withdrawal'}
                      </Button>
                   </div>

                   <div className="p-6 rounded-2xl bg-danger/5 border border-danger/10 flex gap-4">
                      <AlertTriangle size={20} className="text-danger shrink-0" />
                      <p className="text-[11px] text-danger/70 font-bold uppercase tracking-tight leading-relaxed">
                         Unauthorized attempts to bypass protocol limits will result in permanent node suspension and asset forfeiture.
                      </p>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </section>

        {/* EXTERNAL CONNECTION */}
        <section className="px-4">
           <Card className={cn(
              "p-0 border-white/[0.05] overflow-hidden transition-all duration-500",
              isConnected ? "bg-white/[0.01]" : "bg-[#0A0A0F]"
           )}>
              {!isConnected ? (
                 <div className="p-10 md:p-16 text-center flex flex-col items-center">
                    <div className="w-20 h-20 rounded-[2rem] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-8 shadow-2xl">
                       <WalletIcon size={36} className="text-white/20" />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-3 tracking-tight">Connect External Wallet</h4>
                    <p className="text-sm text-white/40 max-w-[320px] mb-10 leading-relaxed font-medium">Link your secure provider to manage multi-chain assets and finalize reward extractions.</p>
                    <ConnectButton.Custom>
                      {({ openConnectModal }) => (
                        <Button onClick={openConnectModal} glow size="lg" className="px-12 text-[10px] uppercase tracking-widest font-bold">Secure Connection</Button>
                      )}
                    </ConnectButton.Custom>
                 </div>
              ) : (
                 <div className="p-8">
                    <div className="flex justify-between items-center mb-10 pb-10 border-b border-white/[0.05]">
                       <div className="flex items-center gap-5">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 p-0.5 shadow-2xl overflow-hidden">
                             <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} className="w-full h-full" alt="" />
                          </div>
                          <div>
                             <h4 className="text-xl font-bold text-white font-mono tracking-tight">{address?.slice(0, 8)}...{address?.slice(-6)}</h4>
                             <div className="flex items-center gap-2 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{connector?.name || 'Authorized Wallet'}</p>
                             </div>
                          </div>
                       </div>
                       <button onClick={() => disconnect()} className="p-3 rounded-2xl bg-white/5 text-white/40 hover:text-danger hover:bg-danger/5 transition-all">
                          <ExternalLink size={20} />
                       </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
                          <Globe size={18} className="text-primary" />
                          <div>
                             <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Network</p>
                             <p className="text-sm font-bold text-white/70">Mainnet</p>
                          </div>
                       </div>
                       <button onClick={copyAddress} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4 hover:bg-white/[0.04] transition-all">
                          <Copy size={18} className="text-white/20" />
                          <div>
                             <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Identifier</p>
                             <p className="text-sm font-bold text-white/70">Copy Address</p>
                          </div>
                       </button>
                    </div>
                 </div>
              )}
           </Card>
        </section>

      </div>
    </DashboardLayout>
  );
};

export default Wallet;
