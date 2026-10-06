import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
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
  return tool.toolName || toolDef(tool)?.name || 'Mining tool';
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
    const id = window.setInterval(() => setTick(t => t + 1), 20_000);
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

  // Capacity calculations
  const toolCapacity = user?.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user?.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user?.totalCapacityGBPPerHour ?? (toolCapacity + referralCapacity);

  const toolPct = totalCapacity > 0 ? (toolCapacity / totalCapacity) * 100 : 100;
  const refPct = totalCapacity > 0 ? (referralCapacity / totalCapacity) * 100 : 0;

  // Compute tier ownership counts from user's tools list
  const counts = useMemo(() => {
    const res: Record<string, number> = {};
    for (const t of tools) {
      const tid = t.toolId || '';
      res[tid] = (res[tid] || 0) + 1;
    }
    return res;
  }, [tools]);

  const handleMaintain = async (ownershipId: string) => {
    setMaintaining(prev => new Set(prev).add(ownershipId));
    try {
      await maintainTool(ownershipId);
    } finally {
      await refresh();
      setMaintaining(prev => { const n = new Set(prev); n.delete(ownershipId); return n; });
    }
  };

  if (loading) {
    return (
      <div className="pse-console-main">
        <PseLoading label="Initializing financial operations console" />
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
      {/* ═══ 1. CAMPAIGN STATE & FINANCIAL ACCRUAL ═══ */}
      <div className="pse-verdict-grid">
        {/* Accrued Earnings Hero */}
        <div className="pse-verdict-hero">
          <div className="pse-verdict-hero-head">
            <span className="pse-lead-label">ACCRUED CAMPAIGN EARNINGS</span>
            <span className="pse-chip" data-tone={isMiningLive ? 'good' : 'idle'}>
              <span className="pse-chip-dot" />
              {isMiningLive ? 'ACCRUING LIVE' : 'CAMPAIGN STANDBY'}
            </span>
          </div>
          <div className="pse-lead-figure">
            {gbp(user.accruedGBP)}
            <span className="pse-lead-unit">GBP</span>
          </div>
          <div className="pse-lead-rate">
            Generating <b>+{gbpHour(totalCapacity)}</b> across active hardware & referral channels.
          </div>
        </div>

        {/* Campaign Timeline & Settlement Overview */}
        <div className="pse-verdict-settlement">
          <div className="pse-lead-label">CAMPAIGN HORIZON & SETTLEMENT</div>
          <div className="pse-settlement-row">
            <span className="pse-settlement-key">Campaign Progress:</span>
            <span className="pse-settlement-val text-cyan-400 font-mono font-semibold">
              {campaignDay !== null ? `Day ${campaignDay} / ${clock.totalDays}` : 'Scheduled'}
            </span>
          </div>
          <div className="pse-crail-box my-2">
            <div className="pse-crail-track">
              <div className="pse-crail-fill" style={{ width: `${campaignProgress}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
              <span>Genesis</span>
              <span className="text-cyan-300 font-medium">
                {clock.daysLeft !== null ? `${clock.daysLeft} days remaining` : 'Active'}
              </span>
              <span>Day {clock.totalDays} Settlement</span>
            </div>
          </div>
          <div className="pse-settlement-row pt-2 border-t border-slate-800/80">
            <span className="pse-settlement-key">Cleared Payout Target:</span>
            <span className="pse-settlement-val text-emerald-400 font-mono font-bold">{availableStr}</span>
          </div>
          <div className="pse-settlement-row">
            <span className="pse-settlement-key">Clearing Wallet:</span>
            <span className="pse-settlement-val font-mono text-xs text-slate-200">
              {user.payoutWallet ? `${user.payoutWallet.slice(0, 6)}...${user.payoutWallet.slice(-4)}` : 'Not Configured'}
            </span>
          </div>
          <div className="mt-3">
            <Link to="/mine/wallet" className="pse-btn pse-btn--secondary pse-btn--sm w-full text-center block">
              {user.payoutWallet ? 'Manage Wallet Settings' : 'Set Up BEP-20 Payout Wallet'}
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ 2. UNIFIED MINING CAPACITY ENGINE ═══ */}
      <section className="pse-console-block" aria-label="Capacity Allocation">
        <div className="pse-block-head">
          <h2 className="pse-block-title">Canonical Mining Capacity System</h2>
          <span className="pse-block-meta">Authoritative Accrual Throughput</span>
        </div>
        <div className="pse-capacity-reg">
          <div className="pse-capacity-reg-head">
            <div className="pse-capacity-reg-eq">
              <span className="text-slate-400">Tool Capacity:</span>
              <span className="pse-capacity-reg-val" data-tone="cyan">{gbpHour(toolCapacity)}</span>
              <span className="text-slate-500">+</span>
              <span className="text-slate-400">Referral Capacity:</span>
              <span className="pse-capacity-reg-val" data-tone="accent">{gbpHour(referralCapacity)}</span>
              <span className="text-slate-500">=</span>
              <span className="text-slate-300 font-bold">Total Capacity:</span>
              <span className="pse-capacity-reg-val text-white font-mono text-base">{gbpHour(totalCapacity)}</span>
            </div>
          </div>
          <div className="pse-capacity-track" title={`Hardware: ${toolPct.toFixed(1)}% | Referral: ${refPct.toFixed(1)}%`}>
            <div className="pse-capacity-seg" data-type="tools" style={{ width: `${toolPct}%` }} />
            <div className="pse-capacity-seg" data-type="referrals" style={{ width: `${refPct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-400 font-mono pt-1">
            <span>Hardware Contribution: {toolPct.toFixed(1)}%</span>
            <span>Referral Allocation: {refPct.toFixed(1)}%</span>
          </div>
        </div>
      </section>

      {/* ═══ 3. EQUIPMENT REGISTER & HARDWARE TIER ROSTER ═══ */}
      <section className="pse-console-block" aria-label="Equipment Ledger">
        <div className="pse-block-head">
          <h2 className="pse-block-title">Mining Equipment Register</h2>
          <span className="pse-block-meta">{tools.length} Deployed Units · {gbpHour(toolCapacity)}</span>
        </div>

        {/* Hardware Tier Roster Summary */}
        <div className="pse-headroom mb-4">
          {ALL_TIERS.map(t => (
            <div className="pse-headroom-cell" key={t.id}>
              <div className="flex justify-between items-center">
                <span className="pse-headroom-key font-semibold text-slate-200">{t.name}</span>
                <span className="text-xs text-cyan-400 font-mono">{gbp(t.purchasePriceGBP)}</span>
              </div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="pse-headroom-val">{counts[t.id] ?? 0} / {t.maxPerUser} Owned</span>
                <span className="text-xs text-slate-400 font-mono">+{gbpHour(t.hourlyRateGBP)}</span>
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
          <div className="pse-equip-table-wrap">
            <table className="pse-equip-table" aria-label="Deployed Equipment">
              <thead>
                <tr>
                  <th>Hardware Unit</th>
                  <th>Rate</th>
                  <th>Operating Status</th>
                  <th>Duty Cycle</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tools.map(tool => {
                  const def = toolDef(tool);
                  const cycle = cycleStateView(tool.cycleState || tool.status);
                  const continuous = (tool.operatingModel || def?.operating?.model) === 'continuous';
                  const running = tool.cycleState === 'active' && isMiningLive;
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
                      ? `Ends in ${cycleRemaining.text}`
                      : restartEta && restartEta.ms > 0
                        ? `Resumes in ${restartEta.text}`
                        : cycle.description;

                  return (
                    <tr key={tool.id}>
                      <td>
                        <div className="pse-equip-cell-title">
                          <span className="pse-equip-cell-name">{toolName(tool)}</span>
                          <span className="pse-equip-cell-sub font-mono">ID: {tool.id.slice(0, 10)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="pse-equip-cell-rate">{gbpHour(toolRate(tool))}</span>
                      </td>
                      <td>
                        <span className="pse-chip" data-tone={canMaintain ? 'hold' : running ? 'good' : 'idle'}>
                          <span className="pse-chip-dot" aria-hidden="true" />
                          {cycle.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-300">{statusDetail}</span>
                      </td>
                      <td>
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
                          <span className="text-xs text-slate-500 font-mono">
                            {continuous ? 'Nominal' : 'Active'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ═══ 4. RECENT ACTIVITY LEDGER ═══ */}
      <RecentRecords />
    </div>
  );
};

const RecentRecords: React.FC = () => {
  const { activities, feedErrors, refreshing, refreshFeed } = usePseState();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const recent = activities.slice(0, 5);

  return (
    <section className="pse-console-block" aria-label="Recent Account Records">
      <div className="pse-block-head">
        <h2 className="pse-block-title">Account Activity Ledger</h2>
        <span className="pse-block-meta">
          <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('activities')} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
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
                  <p className="pse-feed-title">{a.title || 'Account event'}</p>
                  <p className="pse-feed-meta">
                    {a.description ? `${a.description} · ` : ''}{timeAgo(a.createdAt)}
                  </p>
                </div>
                <span className="pse-feed-amount">
                  {displayAmount !== null && displayAmount !== 0
                    ? `${displayAmount > 0 ? '+' : '−'}${gbp(Math.abs(displayAmount))}`
                    : ''}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3">
        <Link to="/mine/activity" className="pse-link text-xs">View Complete Activity Ledger →</Link>
      </div>
    </section>
  );
};

export default PSEMineDashboard;
