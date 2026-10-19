import '../../styles/psemine-dashboard.css';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import {
  cycleStateView, gbp, gbpHour, nowMs, remainingFrom, timeAgo,
  useCampaignClock, campaignStatusView,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseEmptyNote, PseErrorNotice,
  PseLoading,
} from '../../components/psemine/PseBasics';
import {
  Cpu, Wallet, Clock, Users, ArrowUpRight, CheckCircle2,
  AlertTriangle, RefreshCw, Layers, ChevronRight
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

/**
 * Rebuilt PSEMine Dashboard — visual layer only. Preserves all business logic,
 * hooks and actions supplied by the providers. Mobile-first, compact, and
 * intentionally restrained.
 */
export const PSEMineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const campaignDay = clock.dayNumber ?? null;
  const campaignProgress = campaignDay === null ? 0 : Math.min(100, Math.max(0, (campaignDay / clock.totalDays) * 100));

  const isMiningLive = campaignStatus === 'active';

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

  // Dashboard must not carry a Guide button — the shell does that.

  if (loading) return (
    <div className="pse-console-main">
      <div className="pse-loading-surface" role="status" aria-live="polite">
        <PseLoading label="Loading PSEmine account…" />
      </div>
    </div>
  );

  if (error || !state || !user) return (
    <div className="pse-console-main">
      <PseErrorNotice
        error={error ?? { kind: 'data', title: "Account unavailable", retryable: true, message: 'Please retry.' }}
        onRetry={() => void refresh()}
        retrying={refreshing}
      />
    </div>
  );

  return (
    <div className="pse-console-main">
      {/* STATUS STRIP: minimal, authoritative */}
      <div className="pse-status-strip">
        <div className="pse-status-strip-left">
          <span className="pse-chip" data-tone={isMiningLive ? 'good' : 'idle'}>
            <span className="pse-chip-dot" aria-hidden />
            <span className="pse-strip-label">{isMiningLive ? 'Active' : campaignStatus ?? 'Scheduled'}</span>
          </span>
          <span className="pse-status-strip-clock font-mono">{campaignDay !== null ? `Day ${campaignDay}` : 'Pre-launch'}</span>
        </div>

        <div className="pse-status-strip-right">
          <CapacityRing value={totalCapacity} label={`+${gbpHour(totalCapacity)}`} />
        </div>
      </div>

      {/* HERO: primary balance + compact metrics */}
      <section className="pse-hero-grid" aria-label="Primary workspace">
        <div className="pse-hero-left">
          <div className="pse-balance-card" aria-hidden={false}>
            <div className="pse-balance-head">
              <div>
                <div className="pse-kicker">Accrued balance</div>
                <div className="pse-balance-hero">
                  <div className="pse-balance-amount">{user.accruedGBP.toFixed(2)}</div>
                  <div className="pse-balance-sub">GBP — accrues hourly</div>
                </div>
                <div className="pse-mining-meta">
                  <span className="pse-status-indicator"><span className="pse-pulse-dot" />{isMiningLive ? 'Mining' : 'Standby'}</span>
                  <span className="pse-dot-sep" />
                  <span className="pse-hourly">{gbpHour(totalCapacity)} / hr</span>
                </div>
              </div>

              <div className="pse-hero-actions">
                <PseButton onClick={() => navigate('/mine/wallet')} variant="primary">Wallet</PseButton>
                <PseButton onClick={() => navigate('/mine/tools')} variant="secondary">Tools</PseButton>
              </div>
            </div>

            <div className="pse-hero-foot">
              <div className="pse-hero-metrics">
                <div className="pse-metric"><div className="pse-metric-label">Tool</div><div className="pse-metric-val">{gbpHour(toolCapacity)}/hr</div></div>
                <div className="pse-metric"><div className="pse-metric-label">Referral</div><div className="pse-metric-val">{gbpHour(referralCapacity)}/hr</div></div>
                <div className="pse-metric"><div className="pse-metric-label">Referrals</div><div className="pse-metric-val">{qualifiedCount}/{maxQualified}</div></div>
              </div>
              <div style={{ marginTop: 8 }}><MiniSparkline /></div>
            </div>
          </div>

          <div className="pse-timeline-card" aria-label="Campaign timeline">
            <div className="pse-timeline-head">
              <div className="pse-kicker">Campaign</div>
              <div className="pse-timeline-dates">{clock.startLabel} — {clock.endLabel}</div>
            </div>
            <div className="pse-timeline-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(campaignProgress)}>
              <div className="pse-timeline-progress" style={{ width: `${campaignProgress}%` }} />
            </div>
          </div>
        </div>

        <aside className="pse-hero-right" aria-label="Equipment and settlement">
          <div className="pse-equipment-grid" role="list">
            {ALL_TIERS.slice(0, 4).map(t => {
              const id = t.id;
              const count = ownedCountForTier(id as string);
              const hourly = (t.hourlyRateGBP || 0) * count;
              return (
                <div key={id} className="pse-equipment-tile" role="listitem" aria-label={t.name}>
                  <div className="pse-equipment-head">
                    <div className="pse-equipment-title">{t.name}</div>
                    <div className="pse-equipment-count">{count}</div>
                  </div>

                  <div className="pse-equipment-body">
                    <div className="pse-equipment-rate">{gbpHour(hourly)}</div>
                    <div className="pse-equipment-price">{gbp(t.purchasePriceGBP)}</div>
                  </div>

                  <div className="pse-equipment-foot">
                    <button className="pse-link" onClick={() => navigate('/mine/tools')}>Manage</button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pse-settlement-card">
            <div className="pse-settlement-row">
              <div>
                <div className="pse-kicker">Settlement</div>
                <div className="pse-settlement-status">{user.payoutWallet ? 'BEP-20 wallet connected' : 'No wallet'}</div>
              </div>
              <div>
                <PseButton onClick={() => navigate('/mine/wallet')} variant="secondary">Manage</PseButton>
              </div>
            </div>

            <div className="pse-recent-activity">
              <div className="pse-kicker">Recent activity</div>
              {state.activities && state.activities.length > 0 ? (
                <ul className="pse-ledger" aria-live="polite">
                  {state.activities.slice(0, 5).map(a => (
                    <li key={a.id} className="pse-ledger-row">
                      <div>
                        <div className="pse-ledger-desc">{a.title || a.type}</div>
                        <div className="pse-ledger-time">{timeAgo(a.createdAt || a.timestamp)}</div>
                      </div>
                      <div className={"pse-ledger-amt " + ((a.amountGBP ?? 0) > 0 ? 'pos' : 'neg')}>
                        {typeof a.amountGBP === 'number' ? (a.amountGBP > 0 ? '+' + gbp(a.amountGBP) : gbp(a.amountGBP)) : '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <PseEmptyNote title="No recent activity" />
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default PSEMineDashboard;
