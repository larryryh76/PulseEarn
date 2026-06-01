import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useTasks } from '../hooks/useTasks';
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  RefreshCw,
  History,
  ShieldCheck,
  Zap,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils';

const Wallet: React.FC = () => {
  const { userData } = useAuth();
  const { activities, loading } = useTasks();
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'WITHDRAW'>('LEDGER');

  if (loading) return (
    <MainLayout>
      <div className="pt-32 px-6 max-w-7xl mx-auto">
        <div className="h-64 bg-white/5 rounded-3xl animate-pulse mb-12" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    </MainLayout>
  );

  return (
    <MainLayout>
      <div className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="data-label text-primary mb-2">Financial Hub</p>
            <h1>Vault</h1>
          </motion.div>
        </header>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="system-card bg-gradient-to-br from-surface to-surface border-primary/20 mb-12 relative overflow-hidden group"
        >
          {/* Visual Accents */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-500" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <WalletIcon size={20} />
                </div>
                <span className="data-label">Total Assets</span>
              </div>
              <p className="text-4xl md:text-6xl font-mono font-bold tracking-tight text-white flex items-baseline gap-3">
                {userData?.points.toLocaleString() || '0'}
                <span className="text-sm font-bold text-primary uppercase tracking-[0.2em]">PTS</span>
              </p>
              <div className="flex items-center gap-6 mt-8">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-success" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Secured by PulseEngine</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw size={14} className="text-primary animate-spin-slow" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Real-time Sync</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="system-card bg-white/5 border-border flex flex-col items-center justify-center p-6 hover:bg-white/10 transition-all group/btn">
                <div className="p-3 bg-primary/10 rounded-full text-primary mb-4 group-hover/btn:scale-110 transition-transform">
                  <Zap size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Earn More</span>
              </button>
              <button className="system-card bg-white/5 border-border flex flex-col items-center justify-center p-6 hover:bg-white/10 transition-all group/btn">
                <div className="p-3 bg-accent/10 rounded-full text-accent mb-4 group-hover/btn:scale-110 transition-transform">
                  <CreditCard size={20} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Withdraw</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Content Tabs */}
        <div className="flex gap-8 mb-8 border-b border-border relative">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={cn(
              "pb-4 text-xs font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'LEDGER' ? "text-white" : "text-text-secondary hover:text-white"
            )}
          >
            Transaction Ledger
            {activeTab === 'LEDGER' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('WITHDRAW')}
            className={cn(
              "pb-4 text-xs font-bold uppercase tracking-widest transition-all relative",
              activeTab === 'WITHDRAW' ? "text-white" : "text-text-secondary hover:text-white"
            )}
          >
            Settlement Info
            {activeTab === 'WITHDRAW' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'LEDGER' ? (
            <div className="space-y-1">
              <div className="ledger-row !bg-transparent opacity-40 mb-2">
                <span className="data-label">Activity Description</span>
                <span className="data-label">Status</span>
              </div>
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="ledger-row">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg",
                        activity.type === 'reward_received' ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                      )}>
                        {activity.type === 'reward_received' ? <ArrowUpRight size={14} /> : <Zap size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/90">{activity.description}</p>
                        <p className="text-[10px] font-mono text-text-secondary uppercase mt-1">
                          {activity.timestamp?.toDate().toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn(
                          "text-sm font-bold",
                          activity.points > 0 ? "text-success" : "text-white"
                        )}>
                          {activity.points > 0 ? '+' : ''}{activity.points} PTS
                        </p>
                        <p className="text-[10px] font-mono text-text-secondary uppercase">Confirmed</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center border border-dashed border-border rounded-3xl">
                  <History className="mx-auto text-white/5 mb-4" size={40} />
                  <p className="text-text-secondary text-sm">No transaction signals found in the ledger</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="system-card">
                <h3 className="mb-4 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" />
                  Identity Verification
                </h3>
                <p className="text-xs mb-6">Complete KYC Level 1 to enable point redemption and external withdrawals.</p>
                <div className="flex items-center justify-between p-4 bg-white/5 border border-border rounded-xl mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Current Status</p>
                    <p className="text-sm font-bold text-white">Tier 0 (Standard)</p>
                  </div>
                  <button className="text-[11px] font-bold text-primary hover:underline">Verify Identity</button>
                </div>
              </div>
              <div className="system-card">
                <h3 className="mb-4 flex items-center gap-2">
                  <RefreshCw size={18} className="text-primary" />
                  Redemption Rules
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Min. Withdrawal</span>
                    <span className="font-mono text-white">5,000 PTS</span>
                  </li>
                  <li className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Processing Time</span>
                    <span className="font-mono text-white">24-48 Hours</span>
                  </li>
                  <li className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Operational Fee</span>
                    <span className="font-mono text-white">0%</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Wallet;
