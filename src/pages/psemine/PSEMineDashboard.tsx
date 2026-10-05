import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePseState, useAvailableGBP } from '../../components/psemine/PseStateProvider';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import type { PseStateTool } from '../../engines/psemine/pseMineApi';
import {
  campaignStatusView, cycleStateView, gbp, gbpHour, nowMs, remainingFrom, timeAgo, toDateSafe,
  useCampaignClock,
} from '../../components/psemine/pseCore';
import { CampaignRail } from '../../components/psemine/PseInstruments';
import {
  PseButton, PseEmptyNote, PseErrorNotice, PseFacts, PseFact, PseFeedNotice,
  PseLoading, PseNotice, PsePage, PseSection, PseSplit, PseStack,
} from '../../components/psemine/PseBasics';

/**
 * PSEMine Dashboard — High-density Financial Operations Console.
 */
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

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

function shortDate(value: unknown): string {
  const date = toDateSafe(value);
  return date ? date.toLocaleDateString('en-GB', DATE_FORMAT) : '—';
}

export const PSEMineDashboard: React.FC = () => {
  const { state, campaignStatus, loading, error, refresh, refreshing } = usePseState();
  const { maintainTool, pseUser, purchases, payouts } = usePSEMine();
  const availableStr = useAvailableGBP();

  const [maintaining, setMaintaining] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const tools = useMemo(() => state?.tools ?? [], [state?.tools]);

  const needsMaintenance = useMemo(
    () => tools.filter(t => t.maintenanceRequired === true || t.cycleState === 'maintenance_required' || t.cycleState === 'cycle_complete'),
    [tools],
  );
  const activeTools = useMemo(() => tools.filter(t => t.cycleState === 'active'), [tools]);
  const restartingTools = useMemo(() => tools.filter(t => t.cycleState === 'restarting'), [tools]);

  const clock = useCampaignClock(state?.campaign, campaignStatus);
  const campaignDay = clock.dayNumber
    ?? (clock.startMs !== null && clock.endMs !== null && nowMs() >= clock.endMs ? clock.totalDays : null);
  const campaignProgress = campaignDay === null
    ? null
    : Math.min(100, Math.max(0, (campaignDay / clock.totalDays) * 100));

  const handleMaintain = async (ownershipId: string) => {
    setMaintaining(prev => new Set(prev).add(ownershipId));
    try { await maintainTool(ownershipId); } finally {
      await refresh();
      setMaintaining(prev => { const n = new Set(prev); n.delete(ownershipId); return n; });
    }
  };

  if (loading) {
    return (
      <div className="pse-console-main">
        <PseLoading label="Loading your mining console" />
      </div>
    );
  }

  const user = state?.user;

  if (error || !state || !user) {
    return (
      <div className="pse-console-main">
        <PseErrorNotice
          error={error ?? {
            kind: 'data', title: "We couldn't load your mining account", retryable: true,
            message: 'The mining backend returned an incomplete account. Please retry.',
          }}
          onRetry={() => void refresh()}
          retrying={refreshing}
        />
      </div>
    );
  }

  const isMiningLive = campaignStatus === 'active';
  const toolCapacity = user.toolCapacityGBPPerHour ?? 0;
  const referralCapacity = user.referralCapacityGBPPerHour ?? 0;
  const totalCapacity = user.totalCapacityGBPPerHour ?? 0;
  const referralQualified = user.qualifiedReferralsCount ?? 0;
  const counts = pseUser?.toolOwnershipCounts;
  const view = campaignStatusView(campaignStatus);

  const miningState = (() => {
    if (isMiningLive && tools.length === 0) {
      return { label: 'No capacity yet', tone: 'hold' as const, detail: 'Nothing is accruing. Activate a tool to add hourly capacity.' };
    }
    if (isMiningLive && needsMaintenance.length > 0) {
      return {
        label: 'Partially interrupted',
        tone: 'hold' as const,
        detail: `${needsMaintenance.length} tool${needsMaintenance.length === 1 ? '' : 's'} finished session — restart to resume accrual.`,
      };
    }
    if (isMiningLive && restartingTools.length > 0 && activeTools.length === 0) {
      return {
        label: 'Restarting',
        tone: 'idle' as const,
        detail: `${restartingTools.length} tool${restartingTools.length === 1 ? '' : 's'} restarting on schedule.`,
      };
    }
    if (isMiningLive && activeTools.length > 0) {
      return { label: 'Mining active', tone: 'good' as const, detail: `${activeTools.length} of ${tools.length} tool${tools.length === 1 ? '' : 's'} operating and accruing on schedule.` };
    }
    if (isMiningLive) {
      return { label: 'Mining idle', tone: 'idle' as const, detail: 'No tool is currently mining.' };
    }
    return { label: view.label, tone: 'idle' as const, detail: view.detail };
  })();

  const purchaseOpen = state.campaign?.purchaseEnabled !== false;
  const awaitingPurchases = purchases.filter(p => p.status === 'awaiting_payment').length;
    const referralSlots = Math.max(0, PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS - referralQualified);
  const remaining = remainingFrom(state.campaign?.endAt, nowMs());

  const payoutStatuses = payouts.map(p => String(p.status));
  const payoutPosition = (() => {
    const latest = payouts[0] ?? null;
    const outstanding = payoutStatuses.some(s => s === 'pending' || s === 'under_review' || s === 'approved' || s === 'processing');
    if (outstanding) {
      return { label: 'In progress', note: latest ? `Payout ${latest.status.replace(/_/g, ' ')}` : 'Processing with backend', tone: 'hold' as const };
    }
    if (payoutStatuses.includes('paid')) {
      return { label: 'Paid', note: 'Sent to your payout wallet', tone: 'good' as const };
    }
    if (payoutStatuses.includes('failed')) {
      return { label: 'Failed', note: 'Last payout failed', tone: 'bad' as const };
    }
    return isMiningLive
      ? { label: 'Not opened', note: 'Settles after campaign ends', tone: undefined }
      : { label: 'Awaiting settlement', note: 'No payout finalised yet', tone: undefined };
  })();

  const settlementStages = [
    { num: '01', label: 'Mining Active', note: 'Accruing campaign earnings', active: isMiningLive, completed: (user.accruedGBP ?? 0) > 0 },
    { num: '02', label: 'Settlement Pending', note: 'Finalises after campaign end', active: campaignStatus === 'ended' || campaignStatus === 'settling', completed: payouts.length > 0 },
    { num: '03', label: 'Payout Processing', note: 'Converting to BNB quote', active: payoutStatuses.some(s => s === 'pending' || s === 'under_review' || s === 'approved' || s === 'processing'), completed: payoutStatuses.includes('paid') },
    { num: '04', label: 'Paid to Wallet', note: 'BEP-20 transfer executed', active: payoutStatuses.includes('paid'), completed: payoutStatuses.includes('paid') },
  ];

  const maxCap = PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR;
  const toolsPct = Math.min(100, (toolCapacity / maxCap) * 100);
  const refPct = Math.min(100 - toolsPct, (referralCapacity / maxCap) * 100);

  return (
    <PsePage
      title="Dashboard"
      objective="Campaign operating console & real-time telemetry."
      actions={
        <>
          <Link to="?guide=1" className="pse-btn pse-btn--secondary pse-btn--sm">Guide & Manual</Link>
          <PseButton variant="secondary" size="sm" onClick={() => void refresh()} busy={refreshing}>
            {refreshing ? 'Syncing…' : 'Sync'}
          </PseButton>
        </>
      }
    >
      {/* ═══ 1. PRIMARY OPERATIONAL VERDICT & HERO STATEMENT ═══ */}
      <section className="pse-verdict" aria-labelledby="pse-verdict-title">
        <div className="pse-verdict-head">
          <span className="pse-chip" data-tone={miningState.tone}>
            <span className="pse-chip-dot" aria-hidden="true" />
            {miningState.label}
          </span>
          <span className="pse-micro pse-verdict-meta">
            {view.label}
            {campaignDay !== null ? ` · Day ${campaignDay} of ${clock.totalDays}` : ''}
          </span>
        </div>
        <p className="pse-verdict-note">{miningState.detail}</p>

        <dl className="pse-verdict-facts">
          <div className="pse-verdict-fact" data-lead="true">
            <dt>Accrued campaign earnings</dt>
            <dd>{gbp(user.accruedGBP)}</dd>
            <dd>Accrued balance · Pending settlement</dd>
          </div>
          <div className="pse-verdict-fact">
            <dt>Settlement-available</dt>
            <dd>{availableStr}</dd>
            <dd>{user.payoutWallet ? 'Payout wallet configured' : 'Requires payout wallet'}</dd>
          </div>
          <div className="pse-verdict-fact">
            <dt>Total mining capacity</dt>
            <dd>
              {gbpHour(totalCapacity).replace('/hour', '')}
              <span className="pse-verdict-unit">/hr</span>
            </dd>
            <dd>{gbpHour(toolCapacity)} tools + {gbpHour(referralCapacity)} refs</dd>
          </div>
          <div className="pse-verdict-fact">
            <dt>Payout state</dt>
            <dd>{payoutPosition.label}</dd>
            <dd>{payoutPosition.note}</dd>
          </div>
        </dl>

        {(!purchaseOpen || awaitingPurchases > 0) && (
          <div className="pse-verdict-foot">
            {!purchaseOpen && (
              <PseNotice tone="attention">
                Purchases are closed while the campaign is {view.label.toLowerCase()}. Active equipment continues accruing on schedule.
              </PseNotice>
            )}
            {awaitingPurchases > 0 && (
              <PseNotice tone="attention">
                {awaitingPurchases} purchase{awaitingPurchases === 1 ? '' : 's'} awaiting payment.{' '}
                <Link to="/mine/tools" className="pse-link">Complete purchase</Link>.
              </PseNotice>
            )}
          </div>
        )}
      </section>

      {/* ═══ 2. CAPACITY ALLOCATION REGISTER ═══ */}
      <PseSection title="Capacity allocation register" meta={`Max theoretical: ${gbpHour(maxCap)}`}>
        <div className="pse-capacity-reg">
          <div className="pse-capacity-reg-head">
            <div className="pse-capacity-reg-eq">
              <span>Tool capacity: <strong className="pse-capacity-reg-val" data-tone="cyan">{gbpHour(toolCapacity)}</strong></span>
              <span>+</span>
              <span>Referral capacity: <strong className="pse-capacity-reg-val" data-tone="accent">{gbpHour(referralCapacity)}</strong></span>
              <span>=</span>
              <span>Total capacity: <strong className="pse-capacity-reg-val">{gbpHour(totalCapacity)}</strong></span>
            </div>
            <span className="pse-micro">{( (totalCapacity / maxCap) * 100 ).toFixed(1)}% Saturation</span>
          </div>
          <div className="pse-capacity-track" title="Capacity Breakdown">
            <div className="pse-capacity-seg" data-type="tools" style={{ width: `${toolsPct}%` }} />
            <div className="pse-capacity-seg" data-type="referrals" style={{ width: `${refPct}%` }} />
          </div>
        </div>
      </PseSection>

      {/* ═══ 3. AUTHORITATIVE CAMPAIGN TIMELINE ═══ */}
      <PseSection title="90-Day Campaign Window" meta={remaining.text ? `${remaining.text} remaining` : view.label}>
        <CampaignRail
          progress={campaignProgress}
          markers={[
            { key: 'start', label: 'Genesis', value: shortDate(state.campaign?.startAt) },
            { key: 'current', label: 'Current Day', value: campaignDay === null ? '—' : `Day ${campaignDay} / ${clock.totalDays}`, current: campaignDay !== null },
            { key: 'end', label: 'Settlement Target', value: shortDate(state.campaign?.endAt) },
          ]}
          note={
            <>
              {Number.isFinite(clock.endMs)
                ? <>Campaign completes {shortDate(state.campaign?.endAt)}. </>
                : <>Syncing campaign timeline with server. </>}
              Accounting operates strictly on backend UTC timestamps.
            </>
          }
        />
      </PseSection>

      {/* ═══ 4. EQUIPMENT REGISTER TABLE & REFERRALS ═══ */}
      <PseSplit>
        <PseStack>
          <PseSection
            title="Equipment Register"
            meta={`${activeTools.length} active units · ${gbpHour(toolCapacity)}`}
          >
            {tools.length === 0 ? (
              <PseEmptyNote
                glyph="activate"
                title="No equipment deployed"
                action={
                  purchaseOpen ? (
                    <Link to="/mine/tools" className="pse-btn pse-btn--secondary pse-btn--sm">
                      Open Tool Catalogue
                    </Link>
                  ) : undefined
                }
              >
                Deploy mining equipment using BNB to establish hourly capacity.
              </PseEmptyNote>
            ) : (
              <div className="pse-equip-table-wrap">
                <table className="pse-equip-table" aria-label="Equipment Register">
                  <thead>
                    <tr>
                      <th>Equipment Unit</th>
                      <th>Rate</th>
                      <th>Duty Cycle & Status</th>
                      <th>Action</th>
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
                        ? 'Continuous duty'
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
                              <span className="pse-equip-cell-sub">ID: {tool.id.slice(0, 8)}</span>
                            </div>
                          </td>
                          <td>
                            <span className="pse-equip-cell-rate">{gbpHour(toolRate(tool))}</span>
                          </td>
                          <td>
                            <div className="pse-equip-cell-title">
                              <span className="pse-chip" data-tone={canMaintain ? 'hold' : running ? 'good' : 'idle'}>
                                <span className="pse-chip-dot" aria-hidden="true" />
                                {cycle.label}
                              </span>
                              <span className="pse-equip-cell-sub">{statusDetail}</span>
                            </div>
                          </td>
                          <td>
                            {canMaintain ? (
                              <PseButton
                                variant="secondary"
                                size="sm"
                                onClick={() => void handleMaintain(tool.id)}
                                busy={maintaining.has(tool.id)}
                              >
                                {maintaining.has(tool.id) ? 'Restarting…' : 'Restart'}
                              </PseButton>
                            ) : (
                              <span className="pse-micro">{continuous ? 'Continuous' : 'Nominal'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ownership tier headcount */}
            <div className="pse-headroom mt-3">
              {Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder).map(t => (
                <div className="pse-headroom-cell" key={t.id}>
                  <span className="pse-headroom-key">{t.name}</span>
                  <span className="pse-headroom-val">{counts?.[t.id] ?? 0} / {t.maxPerUser} owned</span>
                </div>
              ))}
            </div>
          </PseSection>
        </PseStack>

        <PseStack>
          <PseSection
            title="Referral Pool"
            meta={`${referralQualified} / ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} Qualified`}
          >
            <PseFacts cols={1}>
              <PseFact label="Referral capacity" value={gbpHour(referralCapacity)} />
              <PseFact label="Bonus per referral" value={gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} />
              <PseFact label="Available slots" value={`${referralSlots}`} />
            </PseFacts>
            <p className="pse-block-note">
              Qualified referrals add +{gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR).replace('/hour', '/hr')} directly to mining capacity.{' '}
              <Link to="/mine/referrals" className="pse-link">Manage referrals</Link>.
            </p>
          </PseSection>

          <RecentRecords />
        </PseStack>
      </PseSplit>

      {/* ═══ 5. SETTLEMENT & PAYOUT PIPELINE ═══ */}
      <PseSection title="Settlement & Payout Lifecycle" meta="Programmatic Clearing">
        <PseFacts cols={2}>
          <PseFact label="Accrued earnings" value={gbp(user.accruedGBP)} />
          <PseFact label="Settlement available" value={availableStr} />
          <PseFact label="Payout wallet" value={user.payoutWallet ? 'Configured' : 'Not set'} text />
          <PseFact label="Clearing asset" value="BNB (BEP-20)" text />
        </PseFacts>

        <div className="pse-pipeline" aria-label="Settlement Pipeline">
          {settlementStages.map((st) => (
            <div
              className="pse-pipeline-stage"
              key={st.num}
              data-active={st.active ? 'true' : 'false'}
              data-completed={st.completed ? 'true' : 'false'}
            >
              <span className="pse-pipeline-num">{st.num}. {st.completed ? '✓' : ''}</span>
              <span className="pse-pipeline-title">{st.label}</span>
              <span className="pse-pipeline-note">{st.note}</span>
            </div>
          ))}
        </div>

        <p className="pse-block-note mt-3">
          Accrued earnings convert to BNB at settlement upon campaign completion.{' '}
          {user.payoutWallet
            ? <Link to="/mine/wallet" className="pse-link">View payout wallet settings</Link>
            : <Link to="/mine/wallet" className="pse-link">Set up payout wallet</Link>}.
        </p>
      </PseSection>
    </PsePage>
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
    <PseSection
      title="Recent Activity"
      meta={
        <button type="button" className="pse-meta-action" onClick={() => void refreshFeed('activities')} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      }
    >
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
      <p className="pse-block-note">
        <Link to="/mine/activity" className="pse-link">Full activity ledger</Link>
      </p>
    </PseSection>
  );
};

export default PSEMineDashboard;
