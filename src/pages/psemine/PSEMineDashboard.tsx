import '../../styles/psemine-dashboard.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import {
  cycleStateView, gbp, gbpHour, nowMs, remainingFrom, timeAgo,
  useCampaignClock, campaignStatusView,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFeedNotice,
  PseLoading,
} from '../../components/psemine/PseBasics';
import {
  Cpu, Wallet, Clock, Users, ArrowUpRight, CheckCircle2,
  AlertTriangle, RefreshCw, Layers, ChevronRight, HelpCircle
} from 'lucide-react';

// Presentational helpers
import MiniSparkline from '../../components/psemine/MiniSparkline';
import CapacityRing from '../../components/psemine/CapacityRing';

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
  const navigate = useNavigate();
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool } = usePSEMine();
  const availableStr = useAvailableGBP();

  const [maintaining, setMaintaining] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  // 15-second heartbeat for live accrual and countdown ticks
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const tools = useMemo(() => state?.tools ?? [], [state?.tools]);
  const user = state?.user;

  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const statusView = campaignStatusView(campaignStatus);
  const campaignDay = clock.dayNumber
    ?? (clock.startMs !== null && clock.endMs !== null && nowMs() >= clock.endMs ? clock.totalDays : null);
  const campaignProgress = campaignDay === null
    ? 0
    : Math.min(100, Math.max(0, (campaignDay / clock.totalDays) * 100));

  const isMiningLive = campaignStatus === 'active';

  // Capacity calculations
  const toolCapacity = user?.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user?.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user?.totalCapacityGBPPerHour ?? (toolCapacity + referralCapacity);

  // Estimates
  const dailyEstimate = totalCapacity * 24;
  const monthlyEstimate = totalCapacity * 24 * 30;

  // Equipment counts per tier
  const tierCounts = useMemo(() => {
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

  const openGuide = () => {
    navigate({ pathname: window.location.pathname, search: '?guide=1' });
  };

  if (loading) {
    return (
      <div className="pse-console-main">
        <PseLoading label="Synchronizing PSEmine mining telemetry and ledger..." />
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
      {/* ═══ SECTION A: COMPACT CAMPAIGN STATUS STRIP ═══ */}
      <div className="pse-status-strip">
        <div className="pse-status-strip-left">
          <span className="pse-chip" data-tone={isMiningLive ? 'good' : 'idle'}>
            <span className="pse-chip-dot" aria-hidden="true" />
            {isMiningLive ? 'Active 90-Day Campaign' : statusView.label}
          </span>
          <span className="pse-status-strip-sep" aria-hidden="true">/</span>
          <span className="pse-status-strip-clock font-mono">
            {campaignDay !== null ? `Day ${campaignDay} of ${clock.totalDays}` : 'Scheduled'}
          </span>
          {clock.daysLeft !== null && (
            <span className="pse-status-strip-leftover">
              ({clock.daysLeft}d remaining)
            </span>
          )}
        </div>

        <div className="pse-status-strip-right">
          <CapacityRing value={totalCapacity} label={`+${gbpHour(totalCapacity)}`} />
          <button
            type="button"
            className="pse-status-guide-link"
            onClick={openGuide}
            aria-label="Open Campaign Guide"
          >
            <HelpCircle size={14} />
            <span>Guide</span>
          </button>
        </div>
      </div>

      {/* ═══ TOP 2-COLUMN FINTECH HERO GRID (DESKTOP & TABLET BALANCED) ═══ */}
      <div className="pse-fin-grid">
        {/* LEFT COLUMN: PRIMARY EARNINGS SURFACE (B) + COMPACT FINANCIAL METRICS (C) */}
        <div className="pse-fin-main">
          {/* SECTION B: PRIMARY EARNINGS SURFACE */}
          <section className="pse-earning-surface" aria-label="Accrued Earnings">
            <div className="pse-earning-surface-header">
              <div className="flex items-center gap-2">
                <span className="pse-kicker">Accrued Mining Revenue</span>
                <span className="pse-status-indicator" data-live={isMiningLive ? 'true' : 'false'}>
                  <span className="pse-pulse-dot" />
                  {isMiningLive ? 'Accruing 24/7' : 'Standby'}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Settles in BNB
              </span>
            </div>

            {/* Dominant Balance Element */}
            <div className="pse-balance-hero">
              <span className="pse-balance-currency font-mono">£</span>
              <span className="pse-balance-num font-mono tabular-nums">
                {user.accruedGBP.toFixed(2)}
              </span>
              <span className="pse-balance-iso font-mono">GBP</span>
            </div>

            {/* small sparkline for visual trend */}
            <div style={{marginBottom:12}}>
              <MiniSparkline />
            </div>

            {/* Financial Distinction Notice */}
            <div className="pse-balance-subtext">
              <span className="text-slate-300 font-medium">Accounting Currency: GBP</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">
                Accumulates continuously throughout the 90-day campaign. Converts to BNB and auto-settles to your BEP-20 wallet on Day {clock.totalDays}.
              </span>
            </div>

            {/* Projected Yield Matrix */}
            <div className="pse-projections-matrix">
              <div className="pse-matrix-cell">
                <span className="pse-matrix-kicker">Hourly Yield</span>
                <span className="pse-matrix-val font-mono text-cyan-400 font-bold">
                  +{gbpHour(totalCapacity)}
                </span>
              </div>
              <div className="pse-matrix-cell">
                <span className="pse-matrix-kicker">Est. 24h Yield</span>
                <span className="pse-matrix-val font-mono text-slate-100 font-semibold">
                  +{gbp(dailyEstimate)}
                </span>
              </div>
              <div className="pse-matrix-cell">
                <span className="pse-matrix-kicker">Est. 30-Day Yield</span>
                <span className="pse-matrix-val font-mono text-emerald-400 font-semibold">
                  +{gbp(monthlyEstimate)}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION C: COMPACT FINANCIAL METRICS */}
          <section className="pse-metrics-bar" aria-label="Mining Capacity & Referrals">
            <div className="pse-metric-item">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <Cpu size={14} className="text-amber-400" />
                <span>Hardware Yield</span>
              </div>
              <div className="pse-metric-num font-mono text-amber-400">
                {gbpHour(toolCapacity)}
              </div>
              <div className="pse-metric-sub font-mono">
                {activeUnitsCount} active {activeUnitsCount === 1 ? 'miner' : 'miners'}
              </div>
            </div>

            <div className="pse-metric-item">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <Users size={14} className="text-cyan-400" />
                <span>Referral Bonus</span>
              </div>
              <div className="pse-metric-num font-mono text-cyan-400">
                +{gbpHour(referralCapacity)}
              </div>
              <div className="pse-metric-sub font-mono">
                {qualifiedCount}/{maxQualified} qualified friends
              </div>
            </div>

            <div className="pse-metric-item">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                <Clock size={14} className="text-slate-300" />
                <span>Campaign Window</span>
              </div>
              <div className="pse-metric-num font-mono text-slate-100">
                {clock.daysLeft !== null ? `${clock.daysLeft} Days` : '90 Days'}
              </div>
              <div className="pse-metric-sub font-mono">
                {campaignDay !== null ? `Day ${campaignDay} active` : 'Pre-launch'}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: PAYOUT & WALLET SUMMARY (F) + CAMPAIGN LIFECYCLE RAIL (E) */}
        <div className="pse-fin-side">
          {/* SECTION F: PAYOUT & WALLET SUMMARY */}
          <section className="pse-payout-card" aria-label="Payout and Wallet Destination">
            <div className="pse-card-header">
              <div className="flex items-center gap-1.5">
                <Wallet size={15} className="text-amber-400" />
                <h3 className="pse-card-heading">Payout & Wallet</h3>
              </div>
              <span className="pse-network-tag font-mono">BEP-20 (BNB)</span>
            </div>

            <div className="pse-payout-row">
              <span className="text-xs text-slate-400">Ready for Immediate Payout:</span>
              <span className="pse-payout-val font-mono text-emerald-400 font-bold text-base">
                {availableStr}
              </span>
            </div>

            <div className="pse-payout-wallet-box">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Destination Address
              </span>
              <div className="font-mono text-xs text-slate-200 truncate mt-0.5">
                {user.payoutWallet ? (
                  <span className="flex items-center gap-1.5 text-slate-100">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{user.payoutWallet}</span>
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <AlertTriangle size={13} className="shrink-0" />
                    No BEP-20 wallet linked yet
                  </span>
                )}
              </div>
            </div>

            <p className="pse-payout-disclaimer">
              Campaign mining revenue converts to BNB and auto-settles to your wallet at the conclusion of Day {clock.totalDays}.
            </p>

            <Link
              to="/mine/wallet"
              className="pse-payout-cta"
            >
              <span>{user.payoutWallet ? 'Manage Wallet & Statements' : 'Connect BEP-20 Wallet'}</span>
              <ArrowUpRight size={14} />
            </Link>
          </section>

          {/* SECTION E: CAMPAIGN LIFECYCLE RAIL (AUTHORITATIVE) */}
          <section className="pse-lifecycle-card" aria-label="Authoritative Campaign Timeline">
            <div className="pse-card-header">
              <div className="flex items-center gap-1.5">
                <Layers size={15} className="text-cyan-400" />
                <h3 className="pse-card-heading">Campaign Lifecycle</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {campaignDay !== null ? `${campaignProgress.toFixed(0)}% Complete` : '90-Day Term'}
              </span>
            </div>

            {/* Authoritative Progress Rail */}
            <div className="pse-lifecycle-rail">
              <div className="pse-rail-track">
                <div
                  className="pse-rail-fill"
                  style={{ width: `${Math.max(5, campaignProgress)}%` }}
                />
              </div>

              <div className="pse-rail-steps">
                <div className="pse-rail-step" data-active="true">
                  <span className="pse-step-dot" />
                  <span className="pse-step-label font-mono">Day 1</span>
                  <span className="pse-step-caption">Launch</span>
                </div>

                <div className="pse-rail-step" data-active={campaignDay !== null ? 'true' : 'false'}>
                  <span className="pse-step-dot" />
                  <span className="pse-step-label font-mono">
                    {campaignDay !== null ? `Day ${campaignDay}` : 'Now'}
                  </span>
                  <span className="pse-step-caption text-cyan-400 font-medium">Mining</span>
                </div>

                <div className="pse-rail-step" data-active={(clock.daysLeft === 0 || clock.phaseIndex >= 2) ? 'true' : 'false'}>
                  <span className="pse-step-dot" />
                  <span className="pse-step-label font-mono">Day 90</span>
                  <span className="pse-step-caption">Settlement</span>
                </div>
              </div>
            </div>

            <div className="pse-lifecycle-footer">
              <span>90-Day Fixed Campaign</span>
              <span>Automated BNB Payout</span>
            </div>
          </section>
        </div>
      </div>

      {/* ═══ SECTION D: MINING EQUIPMENT FLEET ═══ */}
      <section className="pse-equipment-section" aria-label="Mining Equipment Fleet">
        <div className="pse-section-head">
          <div className="flex items-center gap-2.5">
            <h2 className="pse-section-title">Mining Equipment Fleet</h2>
            <span className="pse-badge font-mono">
              {activeUnitsCount} Active Units
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Rate: <strong className="text-amber-400 font-semibold">{gbpHour(toolCapacity)}</strong>
            </span>
            <Link
              to="/mine/tools"
              className="pse-btn-action"
            >
              <span>+ Deploy Miner</span>
            </Link>
          </div>
        </div>

        {/* Bespoke Equipment Family Row (Starter, Builder, Advanced, Elite) */}
        <div className="pse-tier-family-grid">
          {ALL_TIERS.map(tier => {
            const count = tierCounts[tier.id] ?? 0;
            const maxUnits = tier.maxPerUser;
            const isFull = count >= maxUnits;
            const isContinuous = tier.operating.model === 'continuous';

            return (
              <div
                key={tier.id}
                className="pse-tier-cell"
                data-tier={tier.id}
              >
                <div className="pse-tier-cell-top">
                  <div>
                    <h4 className="pse-tier-name">{tier.name}</h4>
                    <span className="pse-tier-duty font-mono">
                      {isContinuous ? '24/7 Continuous' : '24h Duty Session'}
                    </span>
                  </div>
                  <span className="pse-tier-price font-mono">
                    {gbp(tier.purchasePriceGBP)}
                  </span>
                </div>

                <div className="pse-tier-cell-mid">
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="text-slate-400 font-mono">
                      Owned: <strong className="text-slate-100">{count}/{maxUnits}</strong>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      +{gbpHour(tier.hourlyRateGBP)}
                    </span>
                  </div>
                  {/* Progress indicator */}
                  <div className="pse-tier-progress-track">
                    <div
                      className="pse-tier-progress-bar"
                      style={{ width: `${(count / maxUnits) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="pse-tier-cell-bot">
                  {isFull ? (
                    <span className="text-xs text-slate-400 font-mono">Max Capacity Reached</span>
                  ) : (
                    <Link
                      to="/mine/tools"
                      className="pse-tier-deploy-link"
                    >
                      <span>Deploy ({maxUnits - count} left)</span>
                      <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Individual Deployed Units Register */}
        {tools.length === 0 ? (
          <div className="mt-4">
            <PseEmptyNote
              glyph="activate"
              title="No active mining hardware deployed"
              action={
                <Link to="/mine/tools" className="pse-btn-action">
                  Deploy Starter Miner (£10 in BNB)
                </Link>
              }
            >
              Select from Starter (£10), Builder (£50), Advanced (£200), or Elite (£1,000) to begin passive hourly mining.
            </PseEmptyNote>
          </div>
        ) : (
          <div className="pse-deployed-units-box">
            <div className="pse-deployed-units-header">
              <span className="text-xs font-semibold text-slate-300">Active Hardware Registry</span>
              <span className="text-xs text-slate-400 font-mono">{tools.length} Deployed</span>
            </div>

            <div className="pse-units-table-wrap">
              <table className="pse-units-table">
                <thead>
                  <tr>
                    <th>Hardware Rig</th>
                    <th>Hourly Yield</th>
                    <th>Operating Mode</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map(tool => {
                    const def = toolDef(tool);
                    const isContinuous = (tool.operatingModel || def?.operating?.model) === 'continuous';
                    const isRunning = (tool.cycleState === 'active' || tool.status === 'active') && isMiningLive;
                    const cycleRemaining = isRunning && !isContinuous ? remainingFrom(tool.cycleEndsAt, nowMs()) : null;
                    const restartEta = tool.cycleState === 'restarting' ? remainingFrom(tool.restartResumesAt, nowMs()) : null;
                    const canMaintain = isMiningLive && (
                      tool.maintenanceRequired === true
                      || tool.cycleState === 'cycle_complete'
                      || tool.cycleState === 'maintenance_required'
                    );

                    const statusText = isContinuous
                      ? '24/7 Continuous'
                      : cycleRemaining
                        ? `Session active · ${cycleRemaining.text} left`
                        : restartEta && restartEta.ms > 0
                          ? `Restarting · ${restartEta.text} ETA`
                          : cycleStateView(tool.cycleState || tool.status).label;

                    return (
                      <tr key={tool.id}>
                        <td>
                          <div className="font-medium text-slate-100">{toolName(tool)}</div>
                          <div className="text-[11px] text-slate-400 font-mono">#{tool.id.slice(0, 8)}</div>
                        </td>
                        <td>
                          <span className="font-mono font-bold text-amber-400">
                            +{gbpHour(toolRate(tool))}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-slate-300">
                            {isContinuous ? 'Continuous (Auto)' : '24h Duty Session'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {isRunning ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-500" />
                            )}
                            <span className="text-xs font-mono text-slate-200">
                              {statusText}
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
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
                            <span className="text-xs font-mono text-emerald-400">
                              {isContinuous ? 'Nominal' : 'Operating'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ═══ SECTION G: RECENT ACTIVITY LEDGER ═══ */}
      <RecentActivitySection />

      <footer className="pse-foot">PulseEarn © 2026</footer>
    </div>
  );
};

const RecentActivitySection: React.FC = () => {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const recent = useMemo(() => activities.slice(0, 5), [activities]);

  return (
    <section className="pse-activity-section" aria-label="Recent Account Activity">
      <div className="pse-section-head">
        <div className="flex items-center gap-2">
          <h2 className="pse-section-title">Recent Activity</h2>
          <span className="pse-badge font-mono">Real Ledger</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="pse-btn-refresh"
            onClick={() => void refreshFeed('activities')}
            disabled={refreshing}
            aria-label="Refresh activity feed"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {feedErrors.activities && (
        <PseFeedNotice
          message="Activity feed could not be refreshed from the ledger."
          onRetry={() => void refreshFeed('activities')}
          retrying={refreshing}
        />
      )}

      {recent.length === 0 ? (
        <PseEmptyNote glyph="audit" title="No transaction records yet">
          Your mining rewards, hardware deployments, and referral bonuses will be logged here in chronological order.
        </PseEmptyNote>
      ) : (
        <div className="pse-activity-table-box">
          <div className="pse-activity-list">
            {recent.map(a => {
              const amountMinor = typeof a.amountMinor === 'number' ? a.amountMinor : null;
              const amountGBP = typeof a.amountGBP === 'number' ? a.amountGBP : null;
              const displayAmount = amountMinor !== null ? amountMinor / 100 : amountGBP;

              return (
                <div className="pse-activity-item" key={a.id}>
                  <div className="pse-activity-info">
                    <span className="pse-activity-title font-medium text-slate-200">
                      {a.title || 'Account event'}
                    </span>
                    <span className="pse-activity-meta text-xs text-slate-400">
                      {a.description ? `${a.description} · ` : ''}{timeAgo(a.createdAt)}
                    </span>
                  </div>

                  <div className="pse-activity-amount font-mono">
                    {displayAmount !== null && displayAmount !== 0 ? (
                      <span className={displayAmount > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-300'}>
                        {displayAmount > 0 ? '+' : '−'}{gbp(Math.abs(displayAmount))}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-xs">Event Recorded</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pse-activity-footer">
            <Link to="/mine/activity" className="pse-link flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium">
              <span>View Full Activity Ledger</span>
              <ArrowUpRight size={13} />
            </Link>
            <span className="text-slate-500 font-mono text-[11px]">
              Cryptographically verified
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export default PSEMineDashboard;
