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
  MoreHorizontal
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

  const [activeTab, setActiveTab] = useState<'portfolio' | 'activity' | 'nfts'>('portfolio');

  if (!userData) return null;

  const minWithdraw = 10000;
  const progress = Math.min(100, (userData.points / minWithdraw) * 100);

  const assets = [
    { name: 'Pulse PTS', symbol: 'PTS', amount: userData.points, usd: PTS_TO_USD(userData.points), icon: Zap, color: 'text-primary', bg: 'bg-primary/10', change: '+4.2%' },
    { name: 'Ethereum', symbol: 'ETH', amount: 0.42, usd: 1420.50, icon: Globe, color: 'text-secondary', bg: 'bg-secondary/10', change: '-1.2%' },
    { name: 'USDT', symbol: 'USDT', amount: 124.20, usd: 124.20, icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10', change: '0.0%' },
    { name: 'Solana', symbol: 'SOL', amount: 12.5, usd: 1845.00, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10', change: '+8.4%' },
  ];

  const transactions = [
    { type: 'reward', label: 'Daily Prediction Reward', amount: '+450 PTS', date: '2h ago', status: 'confirmed' },
    { type: 'transfer', label: 'Point Conversion', amount: '-1,200 PTS', date: '5h ago', status: 'confirmed' },
    { type: 'reward', label: 'Staking Yield', amount: '+12 PTS', date: '12h ago', status: 'confirmed' },
    { type: 'system', label: 'Account Welcome Bonus', amount: '+1,000 PTS', date: '2d ago', status: 'confirmed' },
  ];

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-32">

        <ErrorBoundary name="WalletHero">
          {/* BALANCE HERO */}
          <div className="relative mb-10 text-center px-4">
             <div className="absolute inset-x-0 -top-20 -z-10 flex justify-center overflow-hidden pointer-events-none">
                <div className="w-[140%] h-[30rem] bg-[radial-gradient(ellipse_at_center,rgba(0,112,255,0.12),transparent_70%)]" />
             </div>

             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="space-y-3"
             >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                   <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Global Mainnet</span>
                </div>

                <div className="space-y-1">
                   <p className="text-xs font-bold text-white/30 uppercase tracking-[0.2em]">Portfolio Value</p>
                   <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-white">
                      {formatUSD(PTS_TO_USD(userData.points) + 3390.20)}
                   </h1>
                </div>

                <div className="flex items-center justify-center gap-3">
                   <span className="text-base font-mono font-bold text-success flex items-center gap-1">
                      <TrendingUp size={14} /> +12.4%
                   </span>
                   <span className="w-1 h-1 rounded-full bg-white/10" />
                   <span className="text-sm font-bold text-white/30 uppercase tracking-widest">Last 24h</span>
                </div>
             </motion.div>

             {/* WITHDRAWAL MILESTONE */}
             <div className="max-w-md mx-auto mt-10">
                <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3 relative overflow-hidden group">
                   <div className="absolute inset-0 bg-primary/[0.02] -translate-x-full group-hover:translate-x-full transition-transform duration-[2s]" />
                   <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-widest mb-1">
                      <span className="text-white/40">Withdrawal Progress</span>
                      <span className="text-primary">{Math.round(progress)}%</span>
                   </div>
                   <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-primary"
                      />
                   </div>
                   <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest text-center">
                      {userData.points >= minWithdraw
                        ? "THRESHOLD REACHED: WITHDRAWAL UNLOCKED"
                        : `${(minWithdraw - userData.points).toLocaleString()} PTS UNTIL NEXT WITHDRAWAL`}
                   </p>
                </div>
             </div>

             {/* QUICK ACTION SUITE */}
             <div className="flex justify-center gap-4 md:gap-6 mt-10">
                {[
                  { label: 'Receive', icon: ArrowUpRight, rotate: 180 },
                  { label: 'Send', icon: Send },
                  { label: 'Swap', icon: ArrowRightLeft },
                  { label: 'Buy', icon: CreditCard },
                ].map(action => (
                  <button key={action.label} className="group flex flex-col items-center gap-2">
                     <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center transition-all group-hover:bg-primary group-hover:border-primary group-active:scale-95">
                        <action.icon size={20} className={cn("transition-transform", action.rotate && `rotate-${action.rotate}`)} />
                     </div>
                     <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white transition-colors">{action.label}</span>
                  </button>
                ))}
             </div>
          </div>
        </ErrorBoundary>

        {/* PORTFOLIO CONTENT */}
        <div className="px-4">
           {/* TAB SWITCHER */}
           <div className="flex border-b border-white/[0.05] mb-8">
              {[
                { id: 'portfolio', label: 'Assets' },
                { id: 'activity', label: 'Activity' },
                { id: 'nfts', label: 'Collectibles' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative",
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
              {activeTab === 'portfolio' && (
                <motion.div
                  key="portfolio"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-4"
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
                              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1 flex items-center gap-2">
                                 {asset.symbol}
                                 <span className={cn(asset.change.startsWith('+') ? "text-success" : asset.change === '0.0%' ? "text-white/20" : "text-danger")}>
                                    {asset.change}
                                 </span>
                              </p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-bold text-white tracking-tight">{asset.amount.toLocaleString()} {asset.symbol}</p>
                           <p className="text-[11px] font-mono font-bold text-white/20 mt-1">{formatUSD(asset.usd)}</p>
                        </div>
                     </div>
                   ))}

                   <Button variant="outline" className="w-full py-4 rounded-2xl border-dashed border-white/10 hover:border-primary/50 text-[10px] text-white/20 hover:text-primary uppercase tracking-widest mt-6">
                      <MoreHorizontal size={14} className="mr-2" /> View All Assets
                   </Button>
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-3"
                >
                   {transactions.map((tx, i) => (
                     <div key={i} className="p-5 rounded-2xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-between group hover:bg-white/[0.03] transition-all">
                        <div className="flex items-center gap-4">
                           <div className={cn(
                             "w-10 h-10 rounded-xl flex items-center justify-center border border-white/5",
                             tx.type === 'reward' ? "bg-success/5 text-success" : "bg-primary/5 text-primary"
                           )}>
                              {tx.type === 'reward' ? <Zap size={18} /> : <ArrowRightLeft size={18} />}
                           </div>
                           <div>
                              <p className="text-[11px] font-bold text-white leading-tight">{tx.label}</p>
                              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">{tx.date} • {tx.status}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className={cn("text-sm font-bold tracking-tight", tx.amount.startsWith('+') ? "text-success" : "text-white")}>{tx.amount}</p>
                           <div className="flex items-center justify-end gap-1 mt-1">
                              <div className="w-1 h-1 rounded-full bg-success" />
                              <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">Validated</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* CONNECTION CARD */}
        <div className="mt-12 px-4">
           <Card className={cn(
              "p-0 border-white/[0.05] overflow-hidden transition-all duration-500",
              isConnected ? "bg-white/[0.01] shadow-2xl" : "bg-[#0A0A0F]"
           )}>
              {!isConnected ? (
                 <div className="p-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mb-6">
                       <Lock size={32} className="text-white/20" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2 tracking-tight">Connect Your Wallet</h4>
                    <p className="text-[11px] text-white/40 max-w-[240px] mb-8 leading-relaxed">Connect your crypto wallet to start managing your assets and withdraw rewards.</p>
                    <ConnectButton.Custom>
                      {({ openConnectModal }) => (
                        <Button onClick={openConnectModal} glow className="px-10 py-3 text-[10px] uppercase tracking-widest">Connect Wallet</Button>
                      )}
                    </ConnectButton.Custom>
                 </div>
              ) : (
                 <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/5 p-0.5 shadow-2xl">
                             <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${address}`} className="w-full h-full rounded-[inherit]" alt="" />
                          </div>
                          <div>
                             <h4 className="text-sm font-bold text-white font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</h4>
                             <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] mt-0.5">{connector?.name || 'Wallet'}</p>
                          </div>
                       </div>
                       <button onClick={() => disconnect()} className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-danger transition-colors">
                          <ArrowRightLeft size={16} />
                       </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3">
                          <Globe size={14} className="text-primary" />
                          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Mainnet</span>
                       </div>
                       <button onClick={copyAddress} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-3 hover:bg-white/[0.04] transition-all">
                          <Copy size={14} className="text-white/20" />
                          <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Copy Address</span>
                       </button>
                    </div>
                 </div>
              )}
           </Card>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Wallet;
