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

  // Capacity metrics & breakdown
  const toolCapacity = user?.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user?.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user?.totalCapacityGBPPerHour ?? (toolCapacity + referralCapacity);

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
        <PseLoading label="Connecting to Binance Smart Chain & PSEmine financial engine" />
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
      {/* ═══ 1. TOP FINANCIAL VERDICT: ACCRUED EARNINGS & SETTLEMENT CLEARANCE ═══ */}
      <div className="pse-verdict-grid">
        {/* Accrued Campaign Earnings Hero */}
        <div className="pse-verdict-hero">
          <div>
            <div className="pse-verdict-hero-head">
              <span className="pse-lead-label">ACCRUED CAMPAIGN EARNINGS (GBP)</span>
              <span className="pse-chip" data-tone={isMiningLive ? 'good' : 'idle'}>
                <span className="pse-chip-dot" />
                {isMiningLive ? 'ACCRUING LIVE' : 'CAMPAIGN STANDBY'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="pse-lead-figure font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {gbp(user.accruedGBP)}
              </span>
              <span className="pse-lead-unit text-sm font-bold text-amber-400">GBP</span>
            </div>

            <div className="pse-lead-rate mt-3 text-sm text-slate-300 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Generating <b className="text-emerald-400 font-mono">+{gbpHour(totalCapacity)}</b> across {activeUnitsCount} active units</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Accounting Denomination: <strong className="text-slate-200">British Pounds (GBP)</strong></span>
            <span>Settlement Network: <strong className="text-amber-400 font-mono">BNB Smart Chain</strong></span>
          </div>
        </div>

        {/* Payout & Settlement Clearance Box */}
        <div className="pse-verdict-settlement">
          <div>
            <div className="pse-verdict-hero-head">
              <span className="pse-lead-label">SETTLEMENT & PAYOUT CLEARANCE</span>
              <span className="text-xs font-mono text-amber-400 font-semibold px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                BEP-20
              </span>
            </div>

            <div className="pse-settlement-row">
              <span className="pse-settlement-key">Available for Payout:</span>
              <span className="pse-settlement-val text-emerald-400 font-mono font-bold text-lg">{availableStr}</span>
            </div>

            <div className="text-xs text-slate-400 mt-1 mb-3 leading-relaxed">
              Earnings accrue server-side in GBP and programmatically lock until Day {clock.totalDays} BNB settlement.
            </div>

            <div className="pse-settlement-row pt-2 border-t border-slate-800/80">
              <span className="pse-settlement-key">Clearing Destination:</span>
              <span className="pse-settlement-val font-mono text-xs text-slate-200">
                {user.payoutWallet
                  ? `${user.payoutWallet.slice(0, 6)}...${user.payoutWallet.slice(-4)}`
                  : <span className="text-amber-400">Wallet Not Configured</span>}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Link
              to="/mine/wallet"
              className="pse-btn pse-btn--secondary pse-btn--sm w-full text-center block text-xs font-semibold uppercase tracking-wider"
            >
              {user.payoutWallet ? 'Manage Payout Wallet' : 'Configure BEP-20 Wallet'}
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ 2. UNIFIED CAPACITY ENGINE SYSTEM RAIL ═══ */}
      <section className="pse-console-block" aria-label="Capacity Allocation">
        <div className="pse-block-head">
          <div className="flex items-center gap-2">
            <h2 className="pse-block-title">Canonical Mining Capacity Engine</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              NET HOURLY ACCRUAL
            </span>
          </div>
          <span className="pse-block-meta font-mono text-slate-400">
            Max Limit: {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}
          </span>
        </div>

        <div className="pse-capacity-reg">
          <div className="pse-capacity-reg-head">
            <div className="pse-capacity-reg-eq text-xs sm:text-sm">
              <span className="text-slate-400">Tool Capacity:</span>
              <span className="pse-capacity-reg-val text-amber-400 font-mono font-bold">{gbpHour(toolCapacity)}</span>
              <span className="text-slate-500 font-bold">+</span>
              <span className="text-slate-400">Referral Capacity:</span>
              <span className="pse-capacity-reg-val text-cyan-400 font-mono font-bold">{gbpHour(referralCapacity)}</span>
              <span className="text-slate-500 font-bold">=</span>
              <span className="text-slate-200 font-bold">Total Net Capacity:</span>
              <span className="pse-capacity-reg-val text-emerald-400 font-mono font-bold text-base">{gbpHour(totalCapacity)}</span>
            </div>
          </div>

          <div className="pse-capacity-track" title={`Hardware: ${toolPct.toFixed(1)}% | Referral: ${refPct.toFixed(1)}%`}>
            <div className="pse-capacity-seg bg-amber-400" style={{ width: `${toolPct}%` }} />
            <div className="pse-capacity-seg bg-cyan-400" style={{ width: `${refPct}%` }} />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
              Hardware Contribution: <strong className="text-slate-200">{toolPct.toFixed(1)}%</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400" />
              Referral Allocation: <strong className="text-slate-200">{refPct.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        {/* Referral Multiplier Matrix Strip */}
        <div className="pse-ref-matrix">
          <div className="pse-ref-matrix-cell">
            <span className="pse-ref-matrix-title">Qualified Referrals</span>
            <span className="pse-ref-matrix-value font-mono">
              {qualifiedCount} <span className="text-slate-500 text-xs font-normal">/ {maxQualified} max</span>
            </span>
            <span className="text-[11px] text-slate-400">Referred users actively mining</span>
          </div>

          <div className="pse-ref-matrix-cell">
            <span className="pse-ref-matrix-title">Referral Capacity Bonus</span>
            <span className="pse-ref-matrix-value text-cyan-400 font-mono">
              +{gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}
            </span>
            <span className="text-[11px] text-slate-400">Accrued per qualified referral</span>
          </div>

          <div className="pse-ref-matrix-cell">
            <span className="pse-ref-matrix-title">Active Referral Yield</span>
            <span className="pse-ref-matrix-value text-emerald-400 font-mono">
              +{gbpHour(referralCapacity)}
            </span>
            <Link to="/mine/referrals" className="text-[11px] text-cyan-400 hover:underline">
              Manage Referrals & Link →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ 3. CANONICAL CAMPAIGN HORIZON RAIL ═══ */}
      <section className="pse-console-block" aria-label="Campaign Timeline">
        <div className="pse-block-head">
          <h2 className="pse-block-title">Campaign Horizon Timeline</h2>
          <span className="pse-block-meta font-mono">
            {campaignDay !== null ? `Day ${campaignDay} of ${clock.totalDays}` : 'Scheduled Launch'}
          </span>
        </div>

        <div className="pse-crail-box">
          <div className="pse-crail-track">
            <div className="pse-crail-fill" style={{ width: `${campaignProgress}%` }} />
          </div>
          <div className="pse-crail-labels">
            <div className="pse-crail-mark">
              <span className="pse-crail-day">DAY 01</span>
              <span className="pse-crail-sub">Genesis Lock</span>
            </div>
            <div
              className="pse-crail-mark text-center"
              style={{ left: `${Math.min(92, Math.max(8, campaignProgress))}%`, transform: 'translateX(-50%)' }}
            >
              <span className="pse-crail-day text-amber-400 font-bold">
                {campaignDay !== null ? `DAY ${campaignDay}` : 'TODAY'}
              </span>
              <span className="pse-crail-sub text-amber-300">
                {clock.daysLeft !== null ? `${clock.daysLeft} days remaining` : 'Active'}
              </span>
            </div>
            <div className="pse-crail-mark text-right">
              <span className="pse-crail-day">DAY {clock.totalDays}</span>
              <span className="pse-crail-sub">BNB Clearing Settlement</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. BESPOKE MINING HARDWARE FLEET & PULSE CARDS ═══ */}
      <section className="pse-console-block" aria-label="Hardware Fleet">
        <div className="pse-block-head">
          <div className="flex items-center gap-2">
            <h2 className="pse-block-title">Deployed Mining Hardware Fleet</h2>
            <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20">
              {activeUnitsCount} Active Units
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="pse-block-meta font-mono">{gbpHour(toolCapacity)} Net Tool Rate</span>
            <Link to="/mine/tools" className="pse-btn pse-btn--primary pse-btn--sm text-xs font-semibold">
              + Deploy Hardware
            </Link>
          </div>
        </div>

        {/* Hardware Tier Roster Summary Chips */}
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
            title="No mining hardware deployed"
            action={
              <Link to="/mine/tools" className="pse-btn pse-btn--primary pse-btn--sm">
                Deploy Mining Hardware
              </Link>
            }
          >
            Deploy hardware units using BNB on BNB Smart Chain to establish hourly capacity.
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
                ? 'Continuous Duty'
                : cycleRemaining
                  ? `Cycle ends in ${cycleRemaining.text}`
                  : restartEta && restartEta.ms > 0
                    ? `Resumes in ${restartEta.text}`
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
                      <div className="pse-hardware-id">ID: {tool.id.slice(0, 12)}</div>
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
                        {cycle.label}
                      </span>
                    </div>
                  </div>

                  <div className="pse-hardware-metrics">
                    <div className="pse-hardware-metric-cell">
                      <span className="pse-hardware-metric-lbl">Capacity Rate</span>
                      <span className="pse-hardware-metric-val" data-tone="gold">
                        +{gbpHour(toolRate(tool))}
                      </span>
                    </div>

                    <div className="pse-hardware-metric-cell">
                      <span className="pse-hardware-metric-lbl">Duty Cycle</span>
                      <span className="pse-hardware-metric-val" data-tone={running ? 'green' : undefined}>
                        {continuous ? 'Continuous' : 'Finite Session'}
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
                        {maintaining.has(tool.id) ? 'Restarting…' : 'Restart Cycle'}
                      </PseButton>
                    ) : (
                      <span className="text-xs font-mono text-slate-500">
                        {continuous ? 'Nominal' : 'Active Duty'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ 5. COMPACT ACCOUNT ACTIVITY LEDGER ═══ */}
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
    <section className="pse-console-block" aria-label="Account Activity Ledger">
      <div className="pse-block-head">
        <div className="flex items-center gap-3">
          <h2 className="pse-block-title">Account Activity Ledger</h2>
          <div className="flex items-center gap-1">
            {(['all', 'earnings', 'tools', 'referrals'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                className={`text-xs px-2 py-0.5 rounded capitalize transition-colors ${
                  filter === tab
                    ? 'bg-amber-400 text-black font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                onClick={() => setFilter(tab)}
              >
                {tab}
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
            {refreshing ? 'Refreshing…' : '↻ Refresh Ledger'}
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
          Account events will appear here as they occur on-chain and in backend records.
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
          View Complete Financial Activity Ledger →
        </Link>
        <span className="text-slate-500 font-mono">Immutable audit records</span>
      </div>
    </section>
  );
};

export default PSEMineDashboard;
