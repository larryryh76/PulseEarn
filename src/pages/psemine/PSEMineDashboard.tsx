import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Cpu, 
  TrendingUp, 
  Clock, 
  ArrowRight, 
  Plus, 
  RefreshCw,
  Wallet,
  History,
  Zap
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import { PSEMineToolDefinition } from '../../types/psemine';
import { PSEMinePurchaseModal } from '../../components/psemine/PSEMinePurchaseModal';
import { PSEMineOnboardingModal } from '../../components/psemine/PSEMineOnboardingModal';

export const PSEMineDashboard: React.FC = () => {
  const { userData } = useAuth();
  const { 
    pseUser, 
    campaign,
    campaignDaysRemaining, 
    liveAccruedGBP, 
    tools, 
    connectedWallet,
    refreshData 
  } = usePSEMine();

  const showOnboarding = userData && userData.productAccess?.psemine === false;

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
  const isMiningActive = totalToolsCount > 0;
  const isPayoutConfigured = Boolean(pseUser?.payoutWallet);

  // Status computation according to real state
  let statusBadge = {
    label: 'Standby • No Active Tools',
    bgColor: 'bg-slate-800',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-700',
    indicator: 'bg-slate-400'
  };

  if (isMiningActive) {
    if (!isPayoutConfigured) {
      statusBadge = {
        label: 'Mining Active • Payout Setup Required',
        bgColor: 'bg-amber-950/70',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-700/50',
        indicator: 'bg-amber-400'
      };
    } else {
      statusBadge = {
        label: 'Mining Active',
        bgColor: 'bg-emerald-950/80',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-700/50',
        indicator: 'bg-emerald-400'
      };
    }
  }

  // Calculate campaign day progress (e.g. Day 18 of 90)
  const totalDays = campaign?.durationDays || 90;
  const currentDay = Math.max(1, Math.min(totalDays, totalDays - campaignDaysRemaining));
  const progressPercent = Math.min(100, Math.max(0, (currentDay / totalDays) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6 pb-24 md:pb-12">
      
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Mining Command Center
            </h1>
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.bgColor} ${statusBadge.textColor} ${statusBadge.borderColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.indicator} animate-pulse`} />
              <span>{statusBadge.label}</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous real-time GBP mining capacity, hardware node throughput, and 90-day campaign settlement.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 bg-[#0D131F] hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Sync Balance"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <Link
            to="/mine/tools"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Buy Tools</span>
          </Link>
        </div>
      </div>

      {/* PRIMARY FINTECH HERO BLOCK (Priority 1-4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 1. TOP PRIORITY: Mining Earnings (GBP Only) */}
        <div className="lg:col-span-7 p-6 sm:p-7 bg-[#0D131F] border border-slate-800/90 rounded-3xl relative overflow-hidden shadow-2xl shadow-black/60 flex flex-col justify-between">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Estimated Campaign Earnings
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-400 border border-blue-800/40 font-mono">
                GBP Settled
              </span>
            </div>

            {/* Prominent GBP Numerical Display */}
            <div>
              <div className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                £{liveAccruedGBP.toFixed(4)}
              </div>
              <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Disbursed to your configured BSC payout address at Day 90</span>
              </div>
            </div>

          </div>

          {/* Real-time accrual footer */}
          <div className="pt-4 mt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="text-slate-400">Live Accrual Rate:</span>
              <span className="font-bold text-emerald-400 font-mono text-sm">
                +£{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hour
              </span>
            </div>

            <div className="text-slate-400 font-mono text-[11px]">
              Daily: +£{((pseUser?.totalCapacityGBPPerHour || 0) * 24).toFixed(2)}
            </div>
          </div>
        </div>

        {/* 2, 3, 4: Mining Capacity, Campaign Progress, Quick Action Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          
          {/* Active Mining Capacity Card */}
          <div className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span>Active Mining Capacity</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Cap: £12.10/hr</span>
            </div>

            <div className="my-1">
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
                £{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}
                <span className="text-xs text-slate-400 font-normal font-sans ml-1">/ hour</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Hardware: £{(pseUser?.toolCapacityGBPPerHour || 0).toFixed(2)}</span>
              <span>Boost: +£{(pseUser?.referralCapacityGBPPerHour || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Campaign Progress Card */}
          <div className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Campaign Timeline</span>
              </span>
              <span className="text-[10px] font-mono text-blue-400 font-semibold">
                Day {currentDay} of {totalDays}
              </span>
            </div>

            <div className="my-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold text-white font-mono">
                  {campaignDaysRemaining}
                  <span className="text-xs text-slate-400 font-normal font-sans ml-1">Days Left</span>
                </span>
                <span className="text-xs font-mono text-slate-400">{progressPercent.toFixed(0)}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Settlement: Day 90</span>
              <Link to="/mine/guide" className="text-blue-400 hover:text-blue-300 font-semibold">
                Rules →
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* QUICK ACTIONS BAR (Only working actions) */}
      <div className="p-3.5 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          
          <Link
            to="/mine/tools"
            className="p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-xl flex items-center space-x-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Buy Tools</div>
              <div className="text-[10px] text-slate-400">Deploy hardware</div>
            </div>
          </Link>

          <Link
            to="/mine/tools"
            className="p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-xl flex items-center space-x-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">View Mine</div>
              <div className="text-[10px] text-slate-400">{totalToolsCount} nodes active</div>
            </div>
          </Link>

          <Link
            to="/mine/wallet"
            className="p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-xl flex items-center space-x-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Wallet</div>
              <div className="text-[10px] text-slate-400">
                {connectedWallet ? 'BSC Connected' : 'Connect Wallet'}
              </div>
            </div>
          </Link>

          <Link
            to="/mine/activity"
            className="p-3 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 rounded-xl flex items-center space-x-3 transition-colors group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <History className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">Activity</div>
              <div className="text-[10px] text-slate-400">Audit ledger</div>
            </div>
          </Link>

        </div>
      </div>

      {/* TOTAL COMBINED MINING RATE CARD (Section 5 requirement) */}
      <div className="p-5 bg-[#0D131F] border border-slate-800/80 rounded-2xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
          <Zap className="w-3.5 h-3.5 text-blue-400" />
          <span>Mining Rate Calculation</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 bg-slate-950/70 border border-slate-800/60 rounded-xl">
            <div className="text-[11px] text-slate-400">Base Mining Rate (Tools)</div>
            <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">
              £{(pseUser?.toolCapacityGBPPerHour || 0).toFixed(2)}/hr
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Max tool limit: £10.60/hr</div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800/60 rounded-xl">
            <div className="text-[11px] text-slate-400">Referral Bonus Capacity</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
              +£{(pseUser?.referralCapacityGBPPerHour || 0).toFixed(2)}/hr
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{pseUser?.qualifiedReferralsCount || 0}/5 Qualified (+£0.30/hr each)</div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-blue-950/50 to-slate-950/80 border border-blue-900/40 rounded-xl">
            <div className="text-[11px] text-blue-300 font-medium">Total Combined Rate</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">
              £{(pseUser?.totalCapacityGBPPerHour || 0).toFixed(2)}/hr
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Calculated by mining engine</div>
          </div>
        </div>
      </div>

      {/* ACTIVE TOOLS SECTION (Section 5 requirement) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Active Mining Hardware
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ({totalToolsCount} Units Owned)
            </span>
          </div>

          <Link
            to="/mine/tools"
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
          >
            <span>Hardware Market</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {totalToolsCount === 0 ? (
          /* Empty state */
          <div className="p-8 bg-[#0D131F] border border-slate-800/80 rounded-2xl text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Active Tools</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Purchase your first mining hardware node to begin continuous hourly GBP accrual.
              </p>
            </div>
            <Link
              to="/mine/tools"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Browse Hardware Store</span>
            </Link>
          </div>
        ) : (
          /* Owned Tools Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map((tool) => {
              const owned = toolCounts[tool.id] || 0;
              const isMax = owned >= tool.maxPerUser;
              const toolTotalHourly = (owned * tool.hourlyRateGBP).toFixed(2);

              return (
                <div 
                  key={tool.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    owned > 0
                      ? 'bg-[#0D131F] border-blue-900/50 shadow-lg shadow-black/40'
                      : 'bg-[#0B0F17] border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Tier {tool.tier}
                      </span>
                      <span className={`text-xs font-mono font-bold ${owned > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                        {owned > 0 ? `× ${owned}` : '0 Owned'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">{tool.name}</h3>
                      <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                        +£{tool.hourlyRateGBP.toFixed(2)}/hour each
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Price: £{tool.purchasePriceGBP.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Output:</span>
                      <span className="font-bold text-white">
                        {owned > 0 ? `+£${toolTotalHourly}/hr` : '£0.00/hr'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold uppercase ${owned > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {owned > 0 ? '● Active' : '○ Standby'}
                      </span>
                      
                      {!isMax && (
                        <button
                          onClick={() => setSelectedToolForPurchase(tool)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-white border border-slate-800 rounded-lg text-[10px] font-bold transition-colors"
                        >
                          + Buy More
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedToolForPurchase && (
        <PSEMinePurchaseModal
          tool={selectedToolForPurchase}
          isOpen={Boolean(selectedToolForPurchase)}
          onClose={() => setSelectedToolForPurchase(null)}
        />
      )}

      {/* Lightweight Onboarding Modal for existing PulseEarn users visiting /mine */}
      {showOnboarding && <PSEMineOnboardingModal />}

    </div>
  );
};
