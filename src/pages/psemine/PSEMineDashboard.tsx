import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  TrendingUp, 
  Users, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  Plus, 
  RefreshCw 
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMineToolDefinition } from '../../types/psemine';
import { PSEMinePurchaseModal } from '../../components/psemine/PSEMinePurchaseModal';

export const PSEMineDashboard: React.FC = () => {
  const { 
    pseUser, 
    campaignDaysRemaining, 
    liveAccruedGBP, 
    tools, 
    activities, 
    refreshData 
  } = usePSEMine();

  const [selectedToolForPurchase, setSelectedToolForPurchase] = useState<PSEMineToolDefinition | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const toolCounts = pseUser?.toolOwnershipCounts || {
    starter: 0,
    builder: 0,
    advanced: 0,
    elite: 0
  };

  const totalToolsCount = Object.values(toolCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header / Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Mining Operations Hub
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              pseUser?.status === 'active' 
                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                : 'bg-slate-800 text-gray-400 border border-slate-700'
            }`}>
              {pseUser?.status === 'active' ? '● Online & Mining' : '○ Standby'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Real-time capacity nodes, continuous GBP accrual, and 90-day campaign settlement.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-gray-300 hover:text-white transition-colors"
            title="Sync Server Accrual"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <Link
            to="/mine/tools"
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Miner</span>
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Live Accrued GBP Balance Card */}
        <div className="p-6 bg-gradient-to-br from-[#0c1730] to-[#080e1e] border border-cyan-500/40 rounded-3xl relative overflow-hidden shadow-xl shadow-cyan-950/30">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span className="font-semibold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Total Accrued Balance</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40">
              Live GBP
            </span>
          </div>

          <div className="my-2">
            <div className="text-3xl sm:text-4xl font-black text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text font-mono tracking-tight">
              £{liveAccruedGBP.toFixed(4)}
            </div>
            <div className="text-[11px] text-gray-400 mt-1 flex items-center space-x-1">
              <span>Settlement at Campaign End (Day 90)</span>
            </div>
          </div>

          <div className="pt-4 border-t border-cyan-900/40 flex items-center justify-between text-xs">
            <span className="text-gray-400">Rate of Accrual:</span>
            <span className="font-bold text-cyan-300 font-mono">
              +£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hour
            </span>
          </div>
        </div>

        {/* 2. Mining Capacity Breakdown Card */}
        <div className="p-6 bg-[#090f20] border border-cyan-900/40 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className="font-semibold flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Current Mining Capacity</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                Max: £12.10/hr
              </span>
            </div>

            <div className="my-2">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                £{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}
                <span className="text-xs text-gray-400 font-sans font-normal ml-1">/hour</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-800 text-xs font-mono">
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-400">Tools Capacity:</span>
              <span className="font-bold text-cyan-400">
                £{(pseUser?.toolCapacityGBPPerHour || 0).toFixed(2)}/hr
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span className="text-gray-400">Referrals Boost ({pseUser?.qualifiedReferralsCount || 0}/5):</span>
              <span className="font-bold text-emerald-400">
                +£{(pseUser?.referralCapacityGBPPerHour || 0).toFixed(2)}/hr
              </span>
            </div>
          </div>
        </div>

        {/* 3. Campaign Window & Settlement Card */}
        <div className="p-6 bg-[#090f20] border border-cyan-900/40 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
              <span className="font-semibold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>90-Day Campaign Window</span>
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800/40">
                GENESIS
              </span>
            </div>

            <div className="my-2">
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {campaignDaysRemaining}
                <span className="text-xs text-gray-400 font-sans font-normal ml-1">Days Remaining</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-xs space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Payout Wallet:</span>
              <span className="font-mono text-cyan-300 truncate max-w-[140px]">
                {pseUser?.payoutWallet 
                  ? `${pseUser.payoutWallet.slice(0, 6)}...${pseUser.payoutWallet.slice(-4)}`
                  : 'Not Connected'
                }
              </span>
            </div>
            <Link
              to="/mine/wallet"
              className="text-cyan-400 hover:text-cyan-300 font-semibold block text-right text-[11px]"
            >
              Configure Payout Settings →
            </Link>
          </div>
        </div>

      </div>

      {/* Active Hardware Nodes Stack */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Deployed Mining Hardware Nodes</span>
              <span className="text-xs text-gray-400 font-normal font-mono">
                ({totalToolsCount} Units Online)
              </span>
            </h2>
          </div>
          <Link
            to="/mine/tools"
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
          >
            <span>Deploy More Tools</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map((tool) => {
            const owned = toolCounts[tool.id] || 0;
            const isMax = owned >= tool.maxPerUser;

            return (
              <div 
                key={tool.id}
                className={`p-5 rounded-2xl border transition-all ${
                  owned > 0
                    ? 'bg-[#0a1122] border-cyan-500/30 shadow-lg shadow-cyan-950/20'
                    : 'bg-[#080d19] border-slate-800/80 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-gray-300">
                    Tier {tool.tier}
                  </span>
                  <span className={`text-xs font-mono font-bold ${owned > 0 ? 'text-cyan-300' : 'text-gray-500'}`}>
                    {owned} / {tool.maxPerUser} Owned
                  </span>
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="text-sm font-bold text-white">{tool.name}</h3>
                  <div className="text-xs font-mono text-cyan-400 font-bold">
                    +£{tool.hourlyRateGBP.toFixed(2)}/hr per unit
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Price: £{tool.purchasePriceGBP.toFixed(2)} (BNB)
                  </div>
                </div>

                {isMax ? (
                  <div className="w-full py-2 bg-slate-800/60 text-gray-400 rounded-xl text-xs font-semibold text-center">
                    Max Capacity Reached
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedToolForPurchase(tool)}
                    className="w-full py-2 bg-cyan-950 hover:bg-cyan-600 border border-cyan-700/50 hover:border-cyan-500 text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{owned > 0 ? 'Add Another Unit' : 'Deploy Node'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Boost Banner & Recent Event Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Referral Status Box */}
        <div className="p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
              <Users className="w-4 h-4" />
              <span>Referral Capacity Boost</span>
            </span>
            <span className="font-mono text-xs font-bold text-emerald-400">
              {pseUser?.qualifiedReferralsCount || 0}/5 Qualified
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            Unlock +£0.30/hr capacity for every friend who joins with your link and deploys their first tool (up to +£1.50/hr).
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${((pseUser?.qualifiedReferralsCount || 0) / 5) * 100}%` }}
            />
          </div>

          <Link
            to="/mine/referrals"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-cyan-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
          >
            <span>Open Referral Hub & Invite Code</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Activity Stream */}
        <div className="lg:col-span-2 p-6 bg-[#0a1122] border border-cyan-900/40 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Recent Operational Events
            </span>
            <Link
              to="/mine/activity"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              View Full Audit Ledger →
            </Link>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-2">
              {activities.slice(0, 4).map((act) => (
                <div 
                  key={act.id}
                  className="p-3 bg-[#080d19] border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{act.title}</div>
                    <div className="text-[11px] text-gray-400">{act.description}</div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-gray-500 shrink-0 ml-3">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-gray-500">
              No recent mining transactions or capacity updates recorded yet.
            </div>
          )}
        </div>

      </div>

      {/* Tool Purchase Checkout Modal */}
      {selectedToolForPurchase && (
        <PSEMinePurchaseModal
          tool={selectedToolForPurchase}
          isOpen={Boolean(selectedToolForPurchase)}
          onClose={() => setSelectedToolForPurchase(null)}
        />
      )}

    </div>
  );
};
