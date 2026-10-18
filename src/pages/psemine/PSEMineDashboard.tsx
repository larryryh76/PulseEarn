import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import {
  cycleStateView, gbp, gbpHour, nowMs, remainingFrom, timeAgo,
  useCampaignClock,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice,
  PseLoading,
} from '../../components/psemine/PseBasics';

function toolDef(tool: PseStateTool) {
  const id = (tool.toolId || '') as keyof typeof LOCKED_PSEMINE_TOOLS;
  return LOCKED_PSEMINE_TOOLS[id] || null;
}

function toolName(tool: PseStateTool): string {
  return tool.toolName || toolDef(tool)?.name || 'Mining unit';
}

function toolRate(tool: PseStateTool): number {
  if (typeof tool.hourlyRateGBP === 'number') return tool.hourlyRateGBP;
  return toolDef(tool)?.hourlyRateGBP ?? 0;
}

const ALL_TIERS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool } = usePSEMine();
  const availableStr = useAvailableGBP();

  const [maintaining, setMaintaining] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // 15-second heartbeat to re-render countdowns and live accruals
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const tools = useMemo(() => state?.tools ?? [], [state?.tools]);
  const user = state?.user;

  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const campaignDay = clock.dayNumber
    ?? (clock.startMs !== null && clock.endMs !== null && nowMs() >= clock.endMs ? clock.totalDays : null);
  const campaignProgress = campaignDay === null
    ? 0
    : Math.min(100, Math.max(0, (campaignDay / clock.totalDays) * 100));

  const isMiningLive = campaignStatus === 'active';

  // Earning speed & capacity metrics
  const toolCapacity = user?.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user?.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user?.totalCapacityGBPPerHour ?? (toolCapacity + referralCapacity);

  // Projections
  const dailyEstimate = totalCapacity * 24;
  const monthlyEstimate = totalCapacity * 24 * 30;

  // Proportions
  const toolPct = totalCapacity > 0 ? (toolCapacity / totalCapacity) * 100 : 100;
  const refPct = totalCapacity > 0 ? (referralCapacity / totalCapacity) * 100 : 0;

  // Tier ownership counts
  const counts = useMemo(() => {
    const res: Record<string, number> = {};
    for (const t of tools) {
      const tid = t.toolId || '';
      res[tid] = (res[tid] || 0) + 1;
    }
    return res;
  }, [tools]);

  const activeUnitsCount = useMemo(() => {
    return tools.filter(t => t.cycleState === 'active' || t.status === 'active').length;
  }, [tools]);

  const qualifiedCount = user?.qualifiedReferralsCount ?? 0;
  const maxQualified = PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS;
  const remainingQualifiedSlots = Math.max(0, maxQualified - qualifiedCount);

  const handleMaintain = async (ownershipId: string) => {
    setMaintaining(prev => new Set(prev).add(ownershipId));
    try {
      await maintainTool(ownershipId);
    } finally {
      await refresh();
      setMaintaining(prev => {
        const next = new Set(prev);
        next.delete(ownershipId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="pse-console-main">
        <PseLoading label="Connecting to Binance Smart Chain & PSEmine financial engine..." />
      </div>
    );
  }

  if (error || !state || !user) {
    return (
      <div className="pse-console-main">
        <PseErrorNotice
          error={error ?? {
            kind: 'data',
            title: "We couldn't load your mining account",
            retryable: true,
            message: 'The mining backend returned an incomplete account. Please retry.',
          }}
          onRetry={() => void refresh()}
          retrying={refreshing}
        />
      </div>
    );
  }

  return (
    <div className="pse-console-main">
      {/* ═══ 1. TOP FINANCIAL HERO: ACCRUED REVENUE & PAYOUT DESTINATION ═══ */}
      <div className="pse-verdict-grid">
        {/* Total Mined Balance Hero Card */}
        <div className="pse-verdict-hero">
          <div>
            <div className="pse-verdict-hero-head">
              <span className="pse-lead-label">TOTAL MINED BALANCE</span>
              <span className="pse-chip" data-tone={isMiningLive ? 'good' : 'idle'}>
                <span className="pse-chip-dot" />
                {isMiningLive ? 'LIVE MINING ACTIVE' : 'CAMPAIGN STANDBY'}
              </span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <span className="pse-lead-figure font-mono text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                {gbp(user.accruedGBP)}
              </span>
              <span className="pse-lead-unit text-sm font-bold text-amber-400 font-mono">GBP</span>
            </div>

            <p className="text-xs text-slate-400 mt-1.5">
              Accumulated earnings from your active mining rigs and referral team.
            </p>

            {/* Quick Projections Matrix (Binance / Revolut style) */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Current Speed</span>
                <span className="text-emerald-400 font-mono font-bold text-sm sm:text-base flex items-center gap-1 mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  +{gbpHour(totalCapacity)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Est. 24h Yield</span>
                <span className="text-slate-200 font-mono font-semibold text-sm sm:text-base mt-0.5">
                  +{gbp(dailyEstimate)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider">Est. 30-Day Total</span>
                <span className="text-amber-400 font-mono font-semibold text-sm sm:text-base mt-0.5">
                  +{gbp(monthlyEstimate)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>Accounting Currency: <strong className="text-slate-200">British Pounds (GBP)</strong></span>
            <span>Settlement Chain: <strong className="text-amber-400 font-mono">BNB Smart Chain (BEP-20)</strong></span>
          </div>
        </div>

        {/* Payout & Settlement Box */}
        <div className="pse-verdict-settlement">
          <div>
            <div className="pse-verdict-hero-head">
              <span className="pse-lead-label">PAYOUT SETTLEMENT & WALLET</span>
              <span className="text-xs font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                BEP-20 BNB
              </span>
            </div>

            <div className="pse-settlement-row">
              <span className="pse-settlement-key">Ready for Payout:</span>
              <span className="pse-settlement-val text-emerald-400 font-mono font-bold text-lg">{availableStr}</span>
            </div>

            <div className="text-xs text-slate-400 mt-1 mb-3 leading-relaxed">
              Earnings accumulate continuously and automatically clear into your BEP-20 wallet on Day {clock.totalDays} of the campaign.
            </div>

            <div className="pse-settlement-row pt-2 border-t border-slate-800/80">
              <span className="pse-settlement-key">Payout Destination Wallet:</span>
              <span className="pse-settlement-val font-mono text-xs text-slate-200">
                {user.payoutWallet
                  ? `${user.payoutWallet.slice(0, 6)}...${user.payoutWallet.slice(-4)}`
                  : <span className="text-amber-400 font-medium">Wallet Not Connected</span>}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Link
              to="/mine/wallet"
              className="pse-btn pse-btn--secondary pse-btn--sm w-full text-center block text-xs font-semibold uppercase tracking-wider"
            >
              {user.payoutWallet ? 'Manage Payout Wallet' : 'Connect BEP-20 Wallet'}
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ 2. MINING POWER & HOURLY EARNINGS BREAKDOWN ═══ */}
      <section className="pse-console-block" aria-label="Mining Power Breakdown">
        <div className="pse-block-head">
          <div className="flex items-center gap-2">
            <h2 className="pse-block-title">Mining Power & Hourly Earnings</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              NET HOURLY RATE
            </span>
          </div>
          <span className="pse-block-meta font-mono text-slate-400 text-xs">
            Account Maximum Speed: {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}
          </span>
        </div>

        <div className="pse-capacity-reg">
          {/* Earning Formula Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Hardware Miners Rate
                </span>
                <span className="font-mono text-slate-300">{toolPct.toFixed(0)}%</span>
              </div>
              <div className="text-amber-400 font-mono font-bold text-lg">{gbpHour(toolCapacity)}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                From {activeUnitsCount} active mining {activeUnitsCount === 1 ? 'rig' : 'rigs'}
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-slate-800/80">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  Referral Team Bonus
                </span>
                <span className="font-mono text-slate-300">{refPct.toFixed(0)}%</span>
              </div>
              <div className="text-cyan-400 font-mono font-bold text-lg">{gbpHour(referralCapacity)}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                {qualifiedCount} of {maxQualified} qualified friends active
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 rounded border border-emerald-900/40 bg-emerald-950/10">
              <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Total Net Earning Speed
                </span>
                <span className="font-mono text-emerald-400 font-semibold">Live Accrual</span>
              </div>
              <div className="text-emerald-400 font-mono font-bold text-lg">{gbpHour(totalCapacity)}</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Credited continuously to your balance every hour
              </p>
            </div>
          </div>

          {/* Segmented Progress Track */}
          <div className="pse-capacity-track" title={`Miners: ${toolPct.toFixed(1)}% | Referrals: ${refPct.toFixed(1)}%`}>
            <div className="pse-capacity-seg bg-amber-400" style={{ width: `${toolPct}%` }} />
            <div className="pse-capacity-seg bg-cyan-400" style={{ width: `${refPct}%` }} />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 font-mono pt-1.5">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              Miners Contribution: <strong className="text-slate-200">{toolPct.toFixed(1)}%</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
              Referral Bonus: <strong className="text-slate-200">{refPct.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        {/* Referral Booster Banner */}
        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
              +
            </div>
            <div>
              <span className="font-semibold text-slate-200 block">
                Boost Your Mining Speed with Referrals
              </span>
              <span className="text-slate-400">
                Earn an extra +{gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} per active friend (
                {remainingQualifiedSlots > 0
                  ? `${remainingQualifiedSlots} referral spots remaining`
                  : 'Maximum referral bonus reached'}
                ).
              </span>
            </div>
          </div>
          <Link
            to="/mine/referrals"
            className="pse-btn pse-btn--secondary pse-btn--sm shrink-0 font-semibold text-cyan-400 border-cyan-500/30 hover:border-cyan-500/60"
          >
            Invite Friends & Boost Speed →
          </Link>
        </div>
      </section>

      {/* ═══ 3. 90-DAY CAMPAIGN TIMELINE ═══ */}
      <section className="pse-console-block" aria-label="Campaign Timeline">
        <div className="pse-block-head">
          <div className="flex items-center gap-2">
            <h2 className="pse-block-title">90-Day Mining Campaign Schedule</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              FIXED-TERM CAMPAIGN
            </span>
          </div>
          <span className="pse-block-meta font-mono text-xs">
            {campaignDay !== null ? `Day ${campaignDay} of ${clock.totalDays}` : 'Scheduled Launch'}
          </span>
        </div>

        <div className="pse-crail-box p-4 bg-slate-900/60 rounded-lg border border-slate-800">
          <div className="pse-crail-track relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="pse-crail-fill h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${campaignProgress}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 text-xs">
            <div>
              <span className="font-mono text-slate-400 block font-semibold">DAY 01</span>
              <span className="text-slate-300 text-[11px]">Campaign Launch</span>
            </div>
            <div className="text-center">
              <span className="font-mono text-amber-400 block font-bold">
                {campaignDay !== null ? `DAY ${campaignDay}` : 'TODAY'}
              </span>
              <span className="text-amber-300 text-[11px]">
                {clock.daysLeft !== null ? `${clock.daysLeft} days remaining` : 'Active'}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-emerald-400 block font-semibold">DAY {clock.totalDays}</span>
              <span className="text-slate-300 text-[11px]">Automated BNB Payout</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-800/80 leading-relaxed">
            All mined balances accumulate continuously throughout the 90 days. On Day {clock.totalDays}, the campaign concludes and settled earnings are automatically distributed to your registered BEP-20 BNB wallet.
          </p>
        </div>
      </section>

      {/* ═══ 4. YOUR MINING HARDWARE FLEET ═══ */}
      <section className="pse-console-block" aria-label="Mining Hardware Fleet">
        <div className="pse-block-head">
          <div className="flex items-center gap-2">
            <h2 className="pse-block-title">Your Mining Fleet</h2>
            <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20">
              {activeUnitsCount} Active Units
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="pse-block-meta font-mono text-xs">{gbpHour(toolCapacity)} Net Miner Rate</span>
            <Link to="/mine/tools" className="pse-btn pse-btn--primary pse-btn--sm text-xs font-semibold">
              + Deploy New Miner
            </Link>
          </div>
        </div>

        {/* Available Miner Tiers Summary Strip */}
        <div className="pse-headroom mb-4">
          {ALL_TIERS.map(t => (
            <div className="pse-headroom-cell" key={t.id}>
              <div className="flex justify-between items-center">
                <span className="pse-headroom-key font-semibold text-slate-200">{t.name}</span>
                <span className="text-xs text-amber-400 font-mono font-semibold">{gbp(t.purchasePriceGBP)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="pse-headroom-val font-mono">
                  {counts[t.id] ?? 0} <span className="text-slate-500">/ {t.maxPerUser} Owned</span>
                </span>
                <span className="text-xs text-emerald-400 font-mono font-semibold">+{gbpHour(t.hourlyRateGBP)}</span>
              </div>
            </div>
          ))}
        </div>

        {tools.length === 0 ? (
          <PseEmptyNote
            glyph="activate"
            title="No mining rigs deployed yet"
            action={
              <Link to="/mine/tools" className="pse-btn pse-btn--primary pse-btn--sm">
                Deploy Your First Miner
              </Link>
            }
          >
            Deploy a mining unit starting at £10 using BNB to begin earning passive income every hour.
          </PseEmptyNote>
        ) : (
          <div className="pse-hardware-grid">
            {tools.map(tool => {
              const def = toolDef(tool);
              const cycle = cycleStateView(tool.cycleState || tool.status);
              const continuous = (tool.operatingModel || def?.operating?.model) === 'continuous';
              const running = (tool.cycleState === 'active' || tool.status === 'active') && isMiningLive;
              const cycleRemaining = running && !continuous ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;
              const restartEta = tool.cycleState === 'restarting' ? remainingFrom(tool.restartResumesAt, nowMs()) : null;
              const canMaintain = isMiningLive && (
                tool.maintenanceRequired === true
                || tool.cycleState === 'cycle_complete'
                || tool.cycleState === 'maintenance_required'
              );

              const statusDetail = continuous
                ? 'Continuous 24/7 Mining (Automatic)'
                : cycleRemaining
                  ? `Session active · Ends in ${cycleRemaining.text}`
                  : restartEta && restartEta.ms > 0
                    ? `Session restarting · Resumes in ${restartEta.text}`
                    : cycle.description;

              return (
                <div
                  key={tool.id}
                  className="pse-hardware-card"
                  data-active={running ? 'true' : 'false'}
                  data-status={continuous ? 'nominal' : undefined}
                >
                  <div className="pse-hardware-card-head">
                    <div>
                      <div className="pse-hardware-title">{toolName(tool)}</div>
                      <div className="pse-hardware-id">ID: #{tool.id.slice(0, 8)}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {running ? (
                        <div className="pse-hash-pulse" title="Active hash rate processing">
                          <span className="pse-hash-bar" />
                          <span className="pse-hash-bar" />
                          <span className="pse-hash-bar" />
                          <span className="pse-hash-bar" />
                        </div>
                      ) : null}

                      <span className="pse-chip" data-tone={canMaintain ? 'hold' : running ? 'good' : 'idle'}>
                        <span className="pse-chip-dot" />
                        {canMaintain ? 'Restart Needed' : running ? 'Active' : cycle.label}
                      </span>
                    </div>
                  </div>

                  <div className="pse-hardware-metrics">
                    <div className="pse-hardware-metric-cell">
                      <span className="pse-hardware-metric-lbl">Hourly Earning</span>
                      <span className="pse-hardware-metric-val" data-tone="gold">
                        +{gbpHour(toolRate(tool))}
                      </span>
                    </div>

                    <div className="pse-hardware-metric-cell">
                      <span className="pse-hardware-metric-lbl">Operating Duty</span>
                      <span className="pse-hardware-metric-val" data-tone={running ? 'green' : undefined}>
                        {continuous ? '24/7 Continuous' : '24h Duty Session'}
                      </span>
                    </div>
                  </div>

                  <div className="pse-hardware-foot">
                    <span className="text-xs text-slate-400 font-mono">
                      {statusDetail}
                    </span>

                    {canMaintain ? (
                      <PseButton
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleMaintain(tool.id)}
                        busy={maintaining.has(tool.id)}
                      >
                        {maintaining.has(tool.id) ? 'Restarting…' : 'Restart Miner'}
                      </PseButton>
                    ) : (
                      <span className="text-xs font-mono text-emerald-400 font-medium">
                        {continuous ? '● Nominal' : '● In Duty'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ 5. RECENT ACTIVITY & EARNINGS LOG ═══ */}
      <RecentRecords />
    </div>
  );
};

const RecentRecords: React.FC = () => {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const [filter, setFilter] = useState<'all' | 'earnings' | 'tools' | 'referrals'>('all');
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return activities;
    if (filter === 'earnings') return activities.filter(a => a.type?.includes('accrual') || a.type?.includes('earning'));
    if (filter === 'tools') return activities.filter(a => a.type?.includes('tool') || a.type?.includes('purchase'));
    if (filter === 'referrals') return activities.filter(a => a.type?.includes('referral'));
    return activities;
  }, [activities, filter]);

  const recent = filtered.slice(0, 6);

  return (
    <section className="pse-console-block" aria-label="Recent Activity Log">
      <div className="pse-block-head">
        <div className="flex items-center gap-3">
          <h2 className="pse-block-title">Recent Activity & Earnings</h2>
          <div className="flex items-center gap-1">
            {(['all', 'earnings', 'tools', 'referrals'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                className={`text-xs px-2.5 py-1 rounded capitalize transition-colors font-medium ${
                  filter === tab
                    ? 'bg-amber-400 text-black font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                onClick={() => setFilter(tab)}
              >
                {tab === 'tools' ? 'Miners' : tab}
              </button>
            ))}
          </div>
        </div>

        <span className="pse-block-meta">
          <button
            type="button"
            className="pse-meta-action text-xs text-amber-400 hover:text-amber-300 font-mono"
            onClick={() => void refreshFeed('activities')}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing…' : '↻ Refresh Log'}
          </button>
        </span>
      </div>

      {feedErrors.activities && (
        <PseFeedNotice
          message="Activity feed could not be refreshed."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}

      {recent.length === 0 ? (
        <PseEmptyNote glyph="audit" title="No activity recorded yet">
          Your transactions, mining accruals, and referral rewards will appear here.
        </PseEmptyNote>
      ) : (
        <ul className="pse-feed">
          {recent.map(a => {
            const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
            const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
            const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;

            return (
              <li className="pse-feed-row" key={a.id}>
                <div className="min-w-0">
                  <p className="pse-feed-title font-medium text-slate-200">{a.title || 'Account event'}</p>
                  <p className="pse-feed-meta text-xs text-slate-400">
                    {a.description ? `${a.description} · ` : ''}{timeAgo(a.createdAt)}
                  </p>
                </div>
                <span className="pse-feed-amount font-mono font-semibold">
                  {displayAmount !== null && displayAmount !== 0 ? (
                    <span className={displayAmount > 0 ? 'text-emerald-400' : 'text-slate-300'}>
                      {displayAmount > 0 ? '+' : '−'}{gbp(Math.abs(displayAmount))}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-xs">Event Logged</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 pt-2 border-t border-slate-800/80 flex justify-between items-center text-xs">
        <Link to="/mine/activity" className="pse-link text-amber-400 hover:text-amber-300 font-medium">
          View Full Activity Ledger →
        </Link>
        <span className="text-slate-500 font-mono">Immutable ledger records</span>
      </div>
    </section>
  );
};

export default PSEMineDashboard;
