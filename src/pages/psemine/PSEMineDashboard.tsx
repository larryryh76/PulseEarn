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
  const totalCapacity = toolCapacity + referralCapacity;

  const ownedCountForTier = (tierId: string) => tools.filter(t => (t.toolId || '') === tierId).length;

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
    // open as overlay without navigating away (query param convention)
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
            <span className="pse-status-strip-leftover">({clock.daysLeft}d remaining)</span>
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

      {/* Hero: primary balance + compact metrics */}
      <div className="pse-hero-grid">
        <section className="pse-hero-left" aria-label="Primary balance and status">
          <div className="pse-balance-card">
            <div className="pse-balance-head">
              <div>
                <div className="pse-kicker">Accrued balance</div>
                <div className="pse-balance-hero">
                  <div className="pse-balance-amount">{availableStr}</div>
                  <div className="pse-balance-sub">GBP available</div>
                </div>
                <div className="pse-mining-meta">
                  <span className="pse-status-indicator">
                    <span className="pse-pulse-dot" /> {isMiningLive ? 'Mining live' : statusView.label}
                  </span>
                  <span className="pse-dot-sep" />
                  <span className="pse-hourly">{gbpHour(totalCapacity)} / hr</span>
                </div>
              </div>

              <div className="pse-hero-actions">
                <PseButton onClick={() => navigate('/wallet')} variant="primary">Withdraw</PseButton>
                <PseButton onClick={() => navigate('/tasks')} variant="ghost">Earn</PseButton>
              </div>
            </div>

            <div className="pse-hero-foot">
              <div className="pse-hero-metrics">
                <div className="pse-metric">
                  <div className="pse-metric-label">Tool capacity</div>
                  <div className="pse-metric-val">{gbpHour(toolCapacity)} / hr</div>
                </div>
                <div className="pse-metric">
                  <div className="pse-metric-label">Referral capacity</div>
                  <div className="pse-metric-val">{gbpHour(referralCapacity)} / hr</div>
                </div>
                <div className="pse-metric">
                  <div className="pse-metric-label">Qualified referrals</div>
                  <div className="pse-metric-val">{qualifiedCount}/{maxQualified}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Compact campaign timeline */}
          <div className="pse-timeline-card" aria-hidden>
            <div className="pse-timeline-head">
              <div className="pse-kicker">Campaign</div>
              <div className="pse-timeline-dates">{clock.startLabel} — {clock.endLabel}</div>
            </div>
            <div className="pse-timeline-track">
              <div className="pse-timeline-progress" style={{ width: `${campaignProgress}%` }} />
              <div className="pse-timeline-pos" style={{ left: `${campaignProgress}%` }} aria-hidden />
            </div>
          </div>

        </section>

        <aside className="pse-hero-right" aria-label="Equipment and settlement">
          <div className="pse-equipment-grid">
            {ALL_TIERS.slice(0,4).map(t => {
              const id = t.id;
              const count = ownedCountForTier(id as string);
              const hourly = ((t.hourlyRateGBP || 0) * count);
              return (
                <div key={id} className="pse-equipment-tile" role="group" aria-label={t.name}>
                  <div className="pse-equipment-head">
                    <div className="pse-equipment-title">{t.name}</div>
                    <div className="pse-equipment-count">x{count}</div>
                  </div>
                  <div className="pse-equipment-body">
                    <div className="pse-equipment-rate">{gbpHour(hourly)}</div>
                    <div className="pse-equipment-price">{t.purchaseGBP ? `Buy ${gbp(t.purchaseGBP)}` : 'Not for sale'}</div>
                  </div>
                  <div className="pse-equipment-foot">
                    <button className="pse-link" onClick={() => navigate('/marketplace')}>Upgrade</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pse-settlement-card">
            <div className="pse-settlement-row">
              <div>
                <div className="pse-kicker">Settlement</div>
                <div className="pse-settlement-status">{user.walletConnected ? 'Wallet connected' : 'Wallet not connected'}</div>
              </div>
              <div>
                <PseButton onClick={() => navigate('/wallet')} variant="secondary">Manage</PseButton>
              </div>
            </div>
            <div className="pse-recent-activity">
              <div className="pse-kicker">Recent activity</div>
              {state.activities && state.activities.length > 0 ? (
                <ul className="pse-ledger">
                  {state.activities.slice(0,5).map(a => (
                    <li key={a.id} className="pse-ledger-row">
                      <div className="pse-ledger-left">
                        <div className="pse-ledger-desc">{a.title || a.type}</div>
                        <div className="pse-ledger-time">{timeAgo(a.timestamp)}</div>
                      </div>
                      <div className={"pse-ledger-amt " + (a.amount > 0 ? 'pos' : 'neg')}>{a.amount > 0 ? '+' + gbp(a.amount) : gbp(a.amount)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <PseEmptyNote title="No recent activity" />
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Keep the ConsoleFoot minimal — Footer duplicates are handled in shell */}
    </div>
  );
};

export default PSEMineDashboard;
