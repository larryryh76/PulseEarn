import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Plus, 
  RefreshCw,
  Wallet,
  ChevronRight,
  TrendingUp,
  Layers,
  Users,
  History,
  Copy,
  Check,
  BookOpen
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { PSEMineToolDefinition } from '../../types/psemine';
import { PSEMinePurchaseModal } from '../../components/psemine/PSEMinePurchaseModal';
import { cn } from '../../utils';
import toast from 'react-hot-toast';

export const PSEMineDashboard: React.FC = () => {
  const { 
    pseUser, 
    campaign,
    campaignDaysRemaining, 
    liveAccruedGBP, 
    tools, 
    connectedWallet,
    connectWallet,
    activities,
    refreshData,
    isCampaignArchived
  } = usePSEMine();

  const [selectedToolForPurchase, setSelectedToolForPurchase] = useState<PSEMineToolDefinition | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCopyWallet = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(true);
    toast.success('Wallet address copied');
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  const toolCounts = pseUser?.toolOwnershipCounts || {
    starter: 0,
    builder: 0,
    advanced: 0,
    elite: 0
  };

  const totalToolsCount = Object.values(toolCounts).reduce((a, b) => a + b, 0);
  const toolRate = pseUser?.toolCapacityGBPPerHour || 0;
  const referralRate = pseUser?.referralCapacityGBPPerHour || 0;
  const totalRate = pseUser?.totalCapacityGBPPerHour || 0;
  const maxCapacity = 12.10; // Peak achievable rate: £10.60 tool + £1.50 referral
  const capacityUtilization = Math.min(100, Math.max(0, (totalRate / maxCapacity) * 100));

  // Calculate campaign day progress
  const totalDays = campaign?.durationDays || 90;
  const currentDay = Math.max(1, Math.min(totalDays, totalDays - campaignDaysRemaining));
  const progressPercent = Math.min(100, Math.max(0, (currentDay / totalDays) * 100));

  const recentActivities = activities.slice(0, 4);

  return (
    <div className="pt-6 md:pt-10 pb-28 px-4 md:px-6 lg:px-8 max-w-6xl mx-auto space-y-6 md:space-y-8 transition-colors">
      
      {/* ── HEADER & FAST ACTIONS ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
              PSEmine Console
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E599]" />
            <span className="text-[11px] font-mono text-text-secondary font-semibold">BNB Smart Chain</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary">
            Mining Overview
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-surface hover:bg-surface-bright border border-border rounded-xl text-text-secondary hover:text-text-primary transition-colors"
            title="Refresh Live Balances"
            aria-label="Refresh earnings balance"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-[#00E599]")} />
          </button>

          <Link
            to="/mine/tools"
            className="psemine-btn-primary py-2.5 px-4 text-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Deploy Tools</span>
          </Link>
        </div>
      </div>

      {/* ── 1. PRIMARY ACCRUED EARNINGS DISPLAY (Fintech Style) ──────────── */}
      <div className="p-6 md:p-8 rounded-3xl bg-surface border border-border relative overflow-hidden shadow-subtle">
        <div className="space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.2em]">
                  Estimated Campaign Accrual
                </span>
                <span className="psemine-badge-emerald">
                  GBP Accounting
                </span>
              </div>

              {/* High-Impact Numerical Balance */}
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-text-primary tracking-tight font-mono tabular-nums">
                £{liveAccruedGBP.toFixed(2)}
              </div>

              <p className="text-xs text-text-tertiary max-w-lg">
                Estimated earnings accrue continuously around the clock. Final balances are sealed and disbursed to your BEP-20 wallet at campaign conclusion.
              </p>
            </div>

            {/* Current Active Rate Capsule */}
            <div className="p-4 bg-surface-bright/50 border border-border rounded-2xl shrink-0 min-w-[200px] space-y-1">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Current Output Rate
              </span>
              <div className="text-2xl font-extrabold text-[#00E599] font-mono tabular-nums flex items-baseline gap-1">
                +{totalRate > 0 ? `£${totalRate.toFixed(2)}` : '£0.00'}
                <span className="text-xs font-normal text-text-tertiary">/hr</span>
              </div>
              <div className="text-[11px] text-text-secondary flex justify-between pt-1 border-t border-border">
                <span>Daily Potential:</span>
                <span className="font-mono font-bold text-text-primary">£{(totalRate * 24).toFixed(2)}/day</span>
              </div>
            </div>
          </div>

          {/* Campaign 90-Day Tracker Bar */}
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#00E599]" />
                <span className="font-bold text-text-primary">Day {currentDay} of {totalDays}</span>
                <span className="text-text-tertiary">·</span>
                <span className="text-text-secondary">
                  {isCampaignArchived ? 'Concluded' : `${campaignDaysRemaining} days remaining`}
                </span>
              </div>
              <span className="font-mono text-text-tertiary text-[11px]">
                {progressPercent.toFixed(1)}% Completed
              </span>
            </div>

            <div className="w-full h-2 bg-surface-bright rounded-full overflow-hidden border border-border">
              <div 
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-[#00E599] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,229,153,0.5)]"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── 2. CAPACITY BREAKDOWN & GAUGE ─────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-surface border border-border space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary">
              Mining Capacity Breakdown
            </h2>
            <p className="text-xs text-text-secondary">
              Combined hourly yield from deployed tools and qualified referral slots
            </p>
          </div>
          <div className="text-xs font-bold font-mono text-text-primary bg-surface-bright px-3 py-1 rounded-full border border-border">
            Total Output: £{totalRate.toFixed(2)}/hour
          </div>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-surface-bright/40 border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Tool Output
              </span>
              <Layers size={14} className="text-text-tertiary" />
            </div>
            <div className="text-xl font-bold font-mono text-text-primary tabular-nums">
              £{toolRate.toFixed(2)}/hr
            </div>
            <div className="text-[11px] text-text-tertiary flex justify-between">
              <span>{totalToolsCount} Tools Active</span>
              <span>Max: £10.60/hr</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-bright/40 border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Referral Boost
              </span>
              <Users size={14} className="text-[#00E599]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#00E599] tabular-nums">
              +£{referralRate.toFixed(2)}/hr
            </div>
            <div className="text-[11px] text-text-tertiary flex justify-between">
              <span>{pseUser?.qualifiedReferralsCount || 0}/5 Qualified</span>
              <span>Max: +£1.50/hr</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-surface-bright/40 border border-border space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Max Utilization
              </span>
              <TrendingUp size={14} className="text-[#00E599]" />
            </div>
            <div className="text-xl font-bold font-mono text-text-primary tabular-nums">
              {capacityUtilization.toFixed(1)}%
            </div>
            <div className="text-[11px] text-text-tertiary flex justify-between">
              <span>Ceiling: £12.10/hr</span>
              <span className="text-[#00E599]">Peak Achievable</span>
            </div>
          </div>
        </div>

        {/* Capacity Utilization Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] text-text-tertiary">
            <span>Capacity Progress to Peak (£12.10/hr)</span>
            <span className="font-mono text-text-primary font-bold">£{totalRate.toFixed(2)} / £12.10</span>
          </div>
          <div className="w-full h-1.5 bg-surface-bright rounded-full overflow-hidden border border-border">
            <div 
              style={{ width: `${capacityUtilization}%` }}
              className="h-full bg-gradient-to-r from-[#00E599] to-[#00B4D8] rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>

      {/* ── 3. CONNECTED WALLET STATUS & QUICK NAV ACTIONS ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Settlement & Payment Wallet Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} className="text-[#00E599]" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Settlement Wallet
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-surface-bright text-text-secondary border border-border">
              BEP-20
            </span>
          </div>

          {connectedWallet ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-surface-bright/50 p-2.5 rounded-xl border border-border">
                <span className="font-mono text-xs font-bold text-text-primary truncate mr-2">
                  {connectedWallet}
                </span>
                <button
                  onClick={() => handleCopyWallet(connectedWallet)}
                  className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-text-primary transition-colors shrink-0"
                  title="Copy Wallet Address"
                >
                  {copiedWallet ? <Check size={14} className="text-[#00E599]" /> : <Copy size={14} />}
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                <span className="flex items-center gap-1 text-[#00E599]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E599]" />
                  Connected & Verified
                </span>
                <Link to="/mine/wallet" className="text-[#00E599] hover:underline font-bold">
                  Wallet Settings
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-text-secondary">
                Connect your BNB Smart Chain wallet to purchase tools and configure automated campaign disbursements.
              </p>
              <button
                onClick={connectWallet}
                className="w-full py-2.5 bg-[#00E599] hover:bg-[#00D08A] text-[#070A0F] rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Wallet size={14} />
                <span>Connect Payout Wallet</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Shortcuts Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col justify-between space-y-3">
          <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
            Quick Navigation
          </span>

          <div className="grid grid-cols-3 gap-2">
            <Link
              to="/mine/tools"
              className="p-3 bg-surface-bright/50 hover:bg-surface-bright border border-border rounded-xl text-center space-y-1 transition-all group"
            >
              <Layers size={18} className="mx-auto text-[#00E599] group-hover:scale-110 transition-transform" />
              <div className="text-[11px] font-bold text-text-primary">Acquire Tools</div>
            </Link>

            <Link
              to="/mine/referrals"
              className="p-3 bg-surface-bright/50 hover:bg-surface-bright border border-border rounded-xl text-center space-y-1 transition-all group"
            >
              <Users size={18} className="mx-auto text-[#00E599] group-hover:scale-110 transition-transform" />
              <div className="text-[11px] font-bold text-text-primary">Boost Slots</div>
            </Link>

            <Link
              to="/mine/guide"
              className="p-3 bg-surface-bright/50 hover:bg-surface-bright border border-border rounded-xl text-center space-y-1 transition-all group"
            >
              <BookOpen size={18} className="mx-auto text-[#00E599] group-hover:scale-110 transition-transform" />
              <div className="text-[11px] font-bold text-text-primary">Guide & FAQ</div>
            </Link>
          </div>
        </div>

      </div>

      {/* ── 4. ACTIVE TOOLS OVERVIEW & PURCHASING ────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">Your Mining Tools</h2>
            <p className="text-xs text-text-secondary">Active hardware units and deployable capacity</p>
          </div>
          <Link
            to="/mine/tools"
            className="text-xs font-bold text-[#00E599] hover:underline flex items-center gap-1"
          >
            <span>All 4 Tiers</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {tools.map((tool) => {
            const count = toolCounts[tool.id] || 0;
            const isMax = count >= tool.maxPerUser;

            return (
              <div
                key={tool.id}
                className={cn(
                  "p-4 rounded-2xl bg-surface border flex flex-col justify-between space-y-3 transition-all",
                  count > 0 ? "border-[#00E599]/30" : "border-border hover:border-border-bright"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-bright text-text-secondary border border-border">
                      Tier {tool.tier}
                    </span>
                    <span className={cn(
                      "text-xs font-mono font-bold tabular-nums",
                      count > 0 ? "text-[#00E599]" : "text-text-tertiary"
                    )}>
                      {count} / {tool.maxPerUser} Owned
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{tool.name}</h3>
                    <p className="text-xs text-[#00E599] font-mono font-bold mt-0.5">+£{tool.hourlyRateGBP.toFixed(2)}/hr</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-text-primary">£{tool.purchasePriceGBP.toFixed(2)}</span>
                  <button
                    onClick={() => setSelectedToolForPurchase(tool)}
                    disabled={isMax}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                      isMax
                        ? "bg-surface-bright text-text-tertiary cursor-not-allowed"
                        : "bg-[#00E599] hover:bg-[#00D08A] text-[#070A0F] shadow-sm"
                    )}
                  >
                    {isMax ? 'Max' : '+ Deploy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 5. RECENT ACTIVITY LEDGER MINI-FEED ───────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={16} className="text-[#00E599]" />
            <h2 className="text-base font-bold text-text-primary">Recent Activity</h2>
          </div>
          <Link
            to="/mine/activity"
            className="text-xs font-bold text-[#00E599] hover:underline flex items-center gap-1"
          >
            <span>Full Ledger</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-subtle">
          {recentActivities.length > 0 ? (
            <div className="divide-y divide-border">
              {recentActivities.map((act) => (
                <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-text-primary">{act.title}</div>
                    <div className="text-[11px] text-text-tertiary">{act.description}</div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <span className="text-[10px] font-mono text-text-tertiary">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-text-tertiary">
              No activity recorded yet. Deploy your first tool to get started.
            </div>
          )}
        </div>
      </div>

      {/* Purchase Modal with Real BNB Web3 Quote Flow */}
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

export default PSEMineDashboard;
