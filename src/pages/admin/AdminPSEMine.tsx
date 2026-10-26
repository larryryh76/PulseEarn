import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import {
  campaignStatusView, fmtDateTime, gbp, gbpHour, payoutStatusView, shortAddr, shortHash, usePseDocumentTitle,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseConfirm, PseEmptyNote, PseFact, PseFacts, PseField, PseInput, PseLoading,
  PseNotice, PsePage, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import toast from 'react-hot-toast';

/**
 * ════════════════════════════════════════════════════════════════════════════
 * PSEmine Operations — the campaign's own console.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * WHAT THIS IS. The operations surface for one PSEmine campaign: its lifecycle,
 * the tool economics it is running under, the purchases it has taken, the
 * payments that failed verification, and the payouts awaiting review. It is not
 * a generic admin dashboard and it shows no metric it cannot read from the
 * backend.
 *
 * WHAT FIXED THE PREVIOUS VERSION. Three concrete defects, not taste:
 *
 *   1. IT RENDERED OUTSIDE ITS OWN PLANE. Every primitive below (`pse-facts`,
 *      `pse-ledger`, `pse-block`) styles itself from the `--pse-*` tokens, which
 *      are declared on `.pse`. This component is mounted inside the operations
 *      shell, which does not carry that class, so the tokens were undefined and
 *      the console rendered as unstyled markup — the "weak layout / generic
 *      components" symptom. It is now rooted in `.pse pse-surface`, so it wears
 *      the same surface as the rest of PSEmine.
 *   2. IT INVENTED ZEROES. A stat the backend had not reported printed as `0`,
 *      which is a metric the page made up. Absent data is now `—`, and the page
 *      says so instead of stating a figure.
 *   3. IT OMITTED SYSTEMS THAT EXIST. The tool register, purchases and the
 *      campaign's ownership/session counts are all readable from endpoints the
 *      backend already exposes, so they are here now.
 *
 * WHAT IT MUST NEVER DO. Invent a row, print a placeholder figure, or activate
 * anything from the browser. Every consequential control calls a backend route
 * that authorises, verifies and audits the action itself; the confirmations
 * below state exactly what each one writes.
 */

/** One locked campaign tier, flattened for the register. */
const TIERS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const CAMPAIGN_TIME_ZONE = 'Europe/London';

function localDateInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAMPAIGN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return [part('year'), part('month'), part('day')].join('-');
}

/** Convert a Europe/London wall-clock time to UTC, applying GMT/BST for that date. */
function londonDateTimeToIso(dateValue: string, timeValue: string): string {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = targetAsUtc;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPAIGN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (let i = 0; i < 3; i += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map(p => [p.type, p.value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    const correction = targetAsUtc - representedAsUtc;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate).toISOString();
}

function nextTuesdayDateValue(): string {
  const [year, month, day] = localDateInputValue(new Date()).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const daysUntilTuesday = (2 - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilTuesday);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function fmtUKDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  // Do not combine dateStyle/timeStyle with timeZoneName: browsers reject that
  // Intl.DateTimeFormat option combination and crash the entire admin module.
  // Explicit fields are broadly supported on mobile Chrome and preserve UK time.
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CAMPAIGN_TIME_ZONE,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
  }).format(date) + ' UK time';
}

type ScreenSection = 'campaign' | 'payments' | 'tools' | 'purchases' | 'payouts' | 'audit';

const SECTIONS: ReadonlyArray<{ id: ScreenSection; label: string }> = [
  { id: 'campaign', label: 'Campaign' },
  { id: 'payments', label: 'Payment verification' },
  { id: 'tools', label: 'Tool register' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'audit', label: 'Audit' },
];

export const AdminPSEMine: React.FC = () => {
  usePseDocumentTitle('Operations');

  const { currentUser } = useAuth();
  const { campaign, refreshData: refreshCampaign } = usePSEMine();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [mineOverview, setMineOverview] = useState<Record<string, number | string>>({});
  const [recoveryCases, setRecoveryCases] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [withdrawalQueue, setWithdrawalQueue] = useState<Array<Record<string, unknown>>>([]);
  const [auditRows, setAuditRows] = useState<Array<Record<string, unknown>>>([]);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(nextTuesdayDateValue());
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [resolving, setResolving] = useState<string | null>(null);
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});

  const [confirm, setConfirm] = useState<{
    title: string; consequence: string; affected: string;
    confirmLabel: string; danger?: boolean; requireText?: string;
    run: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!currentUser) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const token = await currentUser.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      const [ovRes, recRes, wdRes, ordersRes, pseRes, auditRes] = await Promise.all([
        fetch('/api/admin/mine/overview', { headers }),
        fetch('/api/admin/mine/payment-recovery?status=open', { headers }),
        fetch('/api/admin/psemine/withdrawals', { headers }),
        fetch('/api/admin/psemine/orders', { headers }),
        fetch('/api/admin/psemine/overview', { headers }),
        fetch('/api/admin/mine/audit', { headers }),
      ]);
      if (!ovRes.ok) throw new Error(`Campaign overview unavailable (${ovRes.status})`);
      const ov = await ovRes.json().catch(() => ({}));
      setStats(ov?.stats || {});

      if (pseRes.ok) {
        const d = await pseRes.json().catch(() => ({}));
        setMineOverview(d?.stats || {});
      } else setMineOverview({});

      if (recRes.ok) {
        const d = await recRes.json().catch(() => ({}));
        setRecoveryCases(Array.isArray(d?.cases) ? d.cases : []);
      } else setRecoveryCases([]);

      if (ordersRes.ok) {
        const d = await ordersRes.json().catch(() => ({}));
        setOrders(Array.isArray(d?.orders) ? d.orders : []);
      } else setOrders([]);

      if (wdRes.ok) {
        const d = await wdRes.json().catch(() => ({}));
        const all: Array<Record<string, unknown>> = Array.isArray(d?.withdrawals) ? d.withdrawals : [];
        setWithdrawalQueue(all.filter(w => ['pending', 'under_review', 'approved', 'processing'].includes(String(w.status))));
      } else setWithdrawalQueue([]);

      if (auditRes.ok) {
        const d = await auditRes.json().catch(() => ({}));
        setAuditRows(Array.isArray(d?.records) ? d.records : []);
      } else {
        setAuditRows([]);
      }
      setLoadedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PSEmine operations data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => { void load(); }, [load]);

  /** Campaign lifecycle actions, confirmed before execution. */
  const campaignAction = async (action: 'pause' | 'resume' | 'schedule' | 'settle' | 'shutdown') => {
    if (!currentUser) return;
    let startAtIso: string | undefined;
    if (action === 'schedule') {
      if (!scheduleDate || !scheduleTime) {
        toast.error('Choose a campaign start date and time first.');
        return;
      }
      // Schedule in Europe/London time, independent of the admin device timezone.
      try { startAtIso = londonDateTimeToIso(scheduleDate, scheduleTime); }
      catch { startAtIso = undefined; }
      const parsed = new Date(startAtIso || '');
      if (!startAtIso || !Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        toast.error('The scheduled start must be a valid future date and time.');
        return;
      }
    }
    const messages: Record<string, { title: string; detail: string; requireText?: string }> = {
      pause: { title: 'Pause the campaign?', detail: 'Accrual stops network-wide until resume. Tools and balances are untouched. This is recorded in the audit log.' },
      resume: { title: 'Resume the campaign?', detail: 'Operating tools resume accruing from the resume time. No retroactive accrual. This is recorded in the audit log.' },
      schedule: { title: 'Schedule a fresh 90-day window?', detail: `The current mining window will stop immediately and the campaign will become Scheduled until ${fmtUKDateTime(startAtIso!)}. The next window will run for 90 days from that time. Existing balances, purchases, tool ownership and history are preserved; this does not settle or erase previous accrual. Purchases and referrals stay closed while scheduled and reopen when the backend starts the campaign.` },
      settle: { title: 'Begin settlement?', detail: 'Mining ends, purchases close, ownership states settle, and payout review opens. A settlement job is created and this is recorded in the audit log. Not casually reversible.' },
      shutdown: { title: 'SHUTDOWN — archive the campaign?', detail: 'Permanently archives the campaign: mining, purchases, and referrals close, and public mining interfaces close. This is recorded in the audit log.', requireText: 'shutdown' },
    };
    const m = messages[action];
    setConfirm({
      title: m.title,
      consequence: m.detail,
      affected: 'psemine_campaigns/active_campaign',
      confirmLabel: action === 'shutdown' ? 'Archive campaign' : action === 'schedule' ? 'Schedule campaign' : action.charAt(0).toUpperCase() + action.slice(1) + ' campaign',
      danger: action === 'shutdown' || action === 'schedule',
      requireText: m.requireText,
      run: async () => {
        setActionBusy(action);
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch('/api/admin/mine/campaign/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action, reason: `Admin console: ${action}`, ...(startAtIso ? { startAt: startAtIso } : {}) }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            toast.success(action === 'schedule'
              ? `Campaign scheduled for ${fmtUKDateTime(data.startAt || startAtIso!)}.`
              : `Campaign action "${action}" executed.`);
            await refreshCampaign();
            await load(true);
          } else {
            toast.error(data.message || data.error || `Action "${action}" failed.`);
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'Execution error.');
        } finally { setActionBusy(null); }
      },
    });
  };

  /** Recovery resolution. Backend contract: mark_reviewed | attach_to_purchase |
   *  reject — none activates a tool from the browser. */
  const resolveRecovery = async (recoveryId: string, action: 'mark_reviewed' | 'attach_to_purchase' | 'reject', notes: string, purchaseId?: string) => {
    setResolving(recoveryId + action);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`/api/admin/mine/payment-recovery/${encodeURIComponent(recoveryId)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action, notes, ...(purchaseId ? { purchaseId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(`Recovery case ${action.replace(/_/g, ' ')}d.`);
        await load(true);
      } else {
        toast.error(data.error || 'Resolution failed (super admin required).');
      }
    } finally { setResolving(null); }
  };

  /** Payout review: { action: 'APPROVE', txHash } or { action: 'REJECT' }. */
  const reviewWithdrawal = async (withdrawalId: string, action: 'APPROVE' | 'REJECT', txHash?: string) => {
    if (action === 'APPROVE' && !txHash) { toast.error('A transaction hash is required to approve a payout.'); return; }
    if (action === 'REJECT') {
      setConfirm({
        title: 'Reject this payout?',
        consequence: 'The request is rejected and its reserved debit is reversed exactly once. The decision is recorded by the backend.',
        affected: `psemine_withdrawals/${withdrawalId}`,
        confirmLabel: 'Reject payout',
        danger: true,
        run: async () => { await submitWithdrawalReview(withdrawalId, 'REJECT'); },
      });
      return;
    }
    await submitWithdrawalReview(withdrawalId, action, txHash);
  };

  /** Shared reviewer call — contract unchanged: {action:'APPROVE', txHash} or
   *  {action:'REJECT'}; success only on backend confirmation. */
  const submitWithdrawalReview = async (withdrawalId: string, action: 'APPROVE' | 'REJECT', txHash?: string) => {
    setResolving(withdrawalId + action);
    try {
      const token = await currentUser?.getIdToken();
      const res = await fetch(`/api/admin/psemine/withdrawals/${encodeURIComponent(withdrawalId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(action === 'APPROVE' ? { action, txHash } : { action }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast.success(action === 'APPROVE' ? 'Payout approved and marked paid.' : 'Payout rejected and debit reversed.');
        await load(true);
      } else {
        toast.error(data.error || data.message || `Payout ${action.toLowerCase()} failed.`);
      }
    } catch (error) {
      // A network/parse failure must surface as a failed review, not silence.
      toast.error(error instanceof Error && error.message ? error.message : `Payout ${action.toLowerCase()} failed.`);
    } finally {
      setResolving(null);
    }
  };

  /**
   * A campaign figure, or `—`.
   *
   * A statistic the backend has not reported is NOT zero, and printing it as `0`
   * is the page stating a number that nothing measured. Absent is rendered as
   * absent.
   */
  const stat = useCallback((key: string): number | null => {
    const v = stats[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }, [stats]);
  const overviewStat = useCallback((key: string): number | null => {
    const v = mineOverview[key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }, [mineOverview]);

  const numOrDash = (v: number | null, format?: (n: number) => string): string =>
    v === null ? '—' : format ? format(v) : String(v);

  const visibleOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return orders.filter(order => {
      const status = String(order.status || '').toLowerCase();
      const matchesFilter = orderFilter === 'all' || (orderFilter === 'verified' ? ['verified', 'activated', 'completed', 'paid', 'confirmed'].includes(status) : orderFilter === 'pending' ? ['quoted', 'pending', 'awaiting_payment', 'submitted', 'processing', 'awaiting payment'].includes(status) : ['failed', 'rejected', 'expired', 'under_review', 'recovery'].includes(status));
      const haystack = [order.id, order.orderId, order.toolName, order.toolId, order.status, order.txHash, order.transactionHash, order.userId].map(value => String(value || '')).join(' ').toLowerCase();
      return matchesFilter && (!query || haystack.includes(query));
    });
  }, [orders, orderFilter, orderSearch]);
  const campaignPhase = useMemo(() => {
    const raw = (campaign?.status || (typeof stats.campaignStatus === 'string' ? stats.campaignStatus : '')) || '';
    return raw ? campaignStatusView(raw) : null;
  }, [campaign?.status, stats.campaignStatus]);

  if (loading) {
    return (
      <div className="pse pse-surface pse-console-shell pse-admin-operations">
        <div className="pse-console-main">
          <PseLoading label="Loading PSEmine operations" />
        </div>
      </div>
    );
  }

  return (
    /* ROOTED IN THE PRODUCT'S OWN PLANE. `.pse` declares the tokens every
       primitive below reads; without it the console renders unstyled (the defect
       this rebuild exists to fix). */
    <div className="pse pse-surface pse-admin-operations">
      <PsePage
        title="PSEmine operations"
        objective="Campaign lifecycle, tool register, purchase evidence, payment verification and payout review. A payout is marked paid only after an already-sent BNB transfer is verified on-chain; this screen does not send funds."
        actions={
          <PseButton onClick={() => void load(true)} busy={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </PseButton>
        }
      >
        <section className="pse-ops-hero" aria-label="PSEmine operational summary">
          <div className="pse-ops-hero-copy">
            <span className="pse-ops-eyebrow"><span className="pse-ops-live-dot" /> CAMPAIGN CONTROL CENTRE</span>
            <h2>Know what is happening.<br /><em>Act on verified evidence.</em></h2>
            <p>Live operational data from PSEmine's backend. No sample payments, simulated activity, or inferred balances.</p>
            <div className="pse-ops-hero-meta">
              <span className={campaignPhase?.label?.toLowerCase().includes('active') ? 'is-positive' : 'is-neutral'}>{campaignPhase?.label || 'Campaign state unavailable'}</span>
              <span>{loadedAt ? `Last synced ${fmtDateTime(new Date(loadedAt))}` : 'Waiting for first sync'}</span>
            </div>
          </div>
          <div className="pse-ops-hero-mark" aria-hidden="true"><span>PSE</span><strong>90</strong><small>DAY OPERATIONS</small></div>
        </section>
        <section className="pse-ops-kpis" aria-label="Campaign key performance indicators">
          <article className="pse-ops-kpi pse-ops-kpi-primary"><span className="pse-ops-kpi-label">Accrued liability</span><strong>{numOrDash(stat('totalAccruedLiabilityGBP'), gbp)}</strong><small>Earned balances recorded by backend</small></article>
          <article className="pse-ops-kpi"><span className="pse-ops-kpi-label">Active miners</span><strong>{numOrDash(stat('activeMiners'))}</strong><small>{numOrDash(stat('totalMiners'))} total registered accounts</small></article>
          <article className="pse-ops-kpi"><span className="pse-ops-kpi-label">Verified activations</span><strong>{numOrDash(stat('toolsSold'))}</strong><small>Backend-reported activated purchases</small></article>
          <article className="pse-ops-kpi"><span className="pse-ops-kpi-label">Needs investigation</span><strong>{numOrDash(stat('openRecoveryCases'))}</strong><small>Open payment-recovery cases</small></article>
        </section>
        <section className="pse-ops-trust-note" role="note">
          <span className="pse-ops-trust-icon" aria-hidden="true">✓</span>
          <div><strong>Evidence-first mode</strong><p>Only backend-returned records are shown. A transaction is not considered paid merely because a hash was entered; payout status and chain evidence must agree.</p></div>
          <span className="pse-ops-sync-state">{error ? 'SYNC ISSUE' : refreshing ? 'SYNCING' : loadedAt ? 'CONNECTED' : 'CONNECTING'}</span>
        </section>
        {/* Section rail — in-page, because this is one console with six
            registers rather than six routes. */}
        <nav className="pse-block" aria-label="Operations sections">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#ops-${s.id}`}
                className="inline-flex min-h-[44px] items-center px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary transition-colors hover:text-text-primary"
              >
                {s.label}
              </a>
            ))}
            {loadedAt && (
              <span className="ml-auto px-3 text-[11px] text-text-tertiary">
                As of <span className="tabular-nums">{fmtDateTime(new Date(loadedAt))}</span>
              </span>
            )}
          </div>
        </nav>

        {error && <PseNotice tone="danger">{error}</PseNotice>}
        {!campaignPhase && (
          <PseNotice tone="attention">
            The backend did not report a campaign state. Every figure below is read from the API; nothing is inferred.
          </PseNotice>
        )}

        {/* ── 01 · CAMPAIGN ───────────────────────────────────────────────── */}
        <div id="ops-campaign" className="scroll-mt-24">
          <PseSection title="Campaign" meta="psemine_campaigns/active_campaign">
            <PseFacts cols={3}>
              <PseFact
                label="Status"
                text
                value={campaignPhase ? campaignPhase.label : '—'}
                hint={campaignPhase ? campaignPhase.detail : 'Not reported by the backend'}
              />
              <PseFact label="Tools sold" value={numOrDash(stat('toolsSold'))} />
              <PseFact
                label="Active miners"
                value={
                  stat('activeMiners') === null
                    ? '—'
                    : `${stat('activeMiners')}${stat('totalMiners') ? ` / ${stat('totalMiners')}` : ''}`
                }
                hint="Operating / total accounts"
              />
              <PseFact label="Total capacity" value={numOrDash(stat('totalCapacityGBPPerHour'), gbpHour)} />
              <PseFact label="Accrued liability" value={numOrDash(stat('totalAccruedLiabilityGBP'), gbp)} />
              <PseFact label="BNB collected" value={numOrDash(stat('totalBNBCollected'))} />
              <PseFact label="Qualified referrals" value={numOrDash(stat('qualifiedReferrals'))} />
              <PseFact label="Open recovery cases" value={numOrDash(stat('openRecoveryCases'))} />
              <PseFact
                label="Settled · debited"
                value={
                  stat('totalAccruedMinor') === null && stat('totalDebitedMinor') === null
                    ? '—'
                    : `${numOrDash(stat('totalAccruedMinor'), n => gbp(n / 100))} · ${numOrDash(stat('totalDebitedMinor'), n => gbp(n / 100))}`
                }
                hint="Accrued · paid out"
              />
              <PseFact label="Campaign duration" value={campaign?.durationDays ? `${campaign.durationDays} days` : '—'} />
              <PseFact label="Campaign start (UK time)" value={campaign?.startAt ? fmtUKDateTime(campaign.startAt) : '—'} />
              <PseFact label="Campaign end (UK time)" value={campaign?.endAt ? fmtUKDateTime(campaign.endAt) : '—'} />
            </PseFacts>

            <div className="pse-block">
              <div className="grid gap-3 sm:grid-cols-2">
                <PseField label="Start date (Tuesday preselected)" htmlFor="pse-campaign-start-date">
                  <PseInput
                    id="pse-campaign-start-date"
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    min={localDateInputValue(new Date())}
                    autoComplete="off"
                  />
                </PseField>
                <PseField label="Start time (UK time · Europe/London)" htmlFor="pse-campaign-start-time">
                  <PseInput
                    id="pse-campaign-start-time"
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </PseField>
              </div>
              <p className="pse-prose--sm">
                Default start time is 9:00 AM UK time (Europe/London), regardless of the device timezone. Confirm or change it before scheduling. Scheduling stops the current mining window immediately, preserves existing account balances and records, and sets the next end date 90 days after the selected start.
              </p>
              <div className="flex flex-wrap gap-2">
                <PseButton
                  variant="secondary"
                  tone="danger"
                  onClick={() => void campaignAction('schedule')}
                  disabled={actionBusy !== null || !scheduleDate || !scheduleTime}
                  busy={actionBusy === 'schedule'}
                >
                  {actionBusy === 'schedule' ? 'Scheduling…' : 'Schedule 90-day campaign'}
                </PseButton>
              </div>
            </div>



            <div className="flex flex-wrap gap-2">
              {(['pause', 'resume', 'settle', 'shutdown'] as const).map(action => (
                <PseButton
                  key={action}
                  tone={action === 'shutdown' ? 'danger' : 'default'}
                  variant={action === 'resume' ? 'primary' : 'secondary'}
                  onClick={() => void campaignAction(action)}
                  disabled={actionBusy !== null}
                  busy={actionBusy === action}
                >
                  {actionBusy === action ? 'Working…' : action.charAt(0).toUpperCase() + action.slice(1)}
                </PseButton>
              ))}
            </div>
          </PseSection>
        </div>

        {/* ── 02 · PAYMENT VERIFICATION ───────────────────────────────────── */}
        <div id="ops-payments" className="scroll-mt-24">
          <PseSection
            title="Payment verification"
            meta="psemine_payment_recovery — evidence for payments that failed on-chain verification"
          >
            {recoveryCases.length === 0 ? (
              <PseEmptyNote title="No payments awaiting verification review">
                A payment that is underpaid, sent on the wrong chain, sent from an unexpected wallet, or received after
                its quote lapsed is recorded here with its on-chain evidence. Nothing is assigned automatically.
              </PseEmptyNote>
            ) : (
              <PseTable head={['Case', 'Reason', 'Recorded', 'On-chain transaction', 'Actions']}>
                {recoveryCases.map(c => {
                  const id = String(c.id || c.recoveryId || '');
                  const hash = (c.txHash || c.transactionHash) as string | undefined;
                  return (
                    <PseRow key={id}>
                      <PseCell mono>{shortHash(id, 8)}</PseCell>
                      <PseCell>{String(c.reason || 'unknown').replace(/_/g, ' ')}</PseCell>
                      <PseCell>{c.createdAt ? fmtDateTime(c.createdAt as string) : '—'}</PseCell>
                      <PseCell mono>
                        {hash ? (
                          <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer" className="underline">
                            {shortHash(hash)}
                          </a>
                        ) : '—'}
                      </PseCell>
                      <PseCell>
                        <div className="flex flex-wrap gap-1.5">
                          <PseButton
                            size="sm"
                            variant="secondary"
                            disabled={resolving !== null}
                            onClick={() => setConfirm({
                              title: 'Complete purchase from recovery evidence?',
                              consequence: 'This re-runs purchase verification against the recorded on-chain transaction. A tool is activated ONLY if the backend verification passes — it can never be created from the browser. The outcome is recorded in the audit log.',
                              affected: `psemine_payment_recovery/${id}`,
                              confirmLabel: 'Re-verify & attempt purchase',
                              run: async () => { await resolveRecovery(id, 'attach_to_purchase', 'Resolved from operations console — re-verified purchase linkage.'); },
                            })}
                          >
                            Complete purchase
                          </PseButton>
                          <PseButton
                            size="sm"
                            tone="danger"
                            variant="secondary"
                            disabled={resolving !== null}
                            onClick={() => setConfirm({
                              title: 'Dismiss this recovery case?',
                              consequence: 'The case is marked rejected and closed without linking the transaction. Evidence is retained in psemine_payment_recovery. Recorded in the audit log.',
                              affected: `psemine_payment_recovery/${id}`,
                              confirmLabel: 'Dismiss case',
                              danger: true,
                              run: async () => { await resolveRecovery(id, 'reject', 'Dismissed after review.'); },
                            })}
                          >
                            Dismiss
                          </PseButton>
                        </div>
                      </PseCell>
                    </PseRow>
                  );
                })}
              </PseTable>
            )}
          </PseSection>
        </div>

        {/* ── 03 · TOOL REGISTER ──────────────────────────────────────────── */}
        <div id="ops-tools" className="scroll-mt-24">
          <PseSection
            title="Tool register"
            meta="The locked campaign economics — unit prices, hourly capacity and ownership caps"
          >
            <PseFacts cols={2}>
              <PseFact label="Active tool ownerships" value={numOrDash(overviewStat('activeToolOwnerships'))} />
              <PseFact label="Active mining sessions" value={numOrDash(overviewStat('activeMiningSessions'))} />
            </PseFacts>
            <PseTable
              head={['Tier', 'Unit', 'Price', 'Capacity', 'Ownership cap', 'Duty']}
              numeric={[2, 3, 4]}
              caption="PSEmine tool tiers and their locked campaign values"
            >
              {TIERS.map(t => (
                <PseRow key={t.tier}>
                  <PseCell mono>{`T${String(t.tier).padStart(2, '0')}`}</PseCell>
                  <PseCell>
                    {t.name}
                    <span className="pse-ledger-sub">{t.operating?.model === 'continuous' ? 'Continuous duty' : 'Session duty'}</span>
                  </PseCell>
                  <PseCell numeric>{gbp(t.purchasePriceGBP)}</PseCell>
                  <PseCell numeric>{gbpHour(t.hourlyRateGBP)}</PseCell>
                  <PseCell numeric>{`×${t.maxPerUser}`}</PseCell>
                  <PseCell numeric>
                    {t.operating?.model === 'continuous' ? 'Continuous' : `${t.operating?.restartDelayMinutes ?? 0}m restart`}
                  </PseCell>
                </PseRow>
              ))}
            </PseTable>
          </PseSection>
        </div>

        {/* ── 04 · PURCHASES ──────────────────────────────────────────────── */}
        <div id="ops-purchases" className="scroll-mt-24">
          <PseSection title="Purchase ledger" meta="Backend order records · payment state must be supported by verification evidence">
            <div className="pse-ops-ledger-tools">
              <label className="pse-ops-search"><span>Search orders</span><input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Order, wallet, tool or transaction hash" /></label>
              <label className="pse-ops-filter"><span>Payment state</span><select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}><option value="all">All records</option><option value="verified">Verified / completed</option><option value="pending">Awaiting payment</option><option value="attention">Needs attention</option></select></label>
              <span className="pse-ops-record-count">{visibleOrders.length} of {orders.length} records</span>
            </div>
            {orders.length === 0 ? (
              <PseEmptyNote title="No purchase orders recorded">
                A purchase appears here once a quote has been issued and an intent bound to a payer wallet. Activation
                still requires backend verification against BNB Smart Chain.
              </PseEmptyNote>
            ) : visibleOrders.length === 0 ? (
              <PseEmptyNote title="No matching purchase records">Change the payment-state filter or search term. No records have been added to fill this view.</PseEmptyNote>
            ) : (
              <PseTable head={['Order', 'Tool', 'Payment state', 'Amount', 'Recorded', 'On-chain evidence']}>
                {visibleOrders.map((o, i) => {
                  const id = String(o.id || o.orderId || '');
                  const hash = (o.txHash || o.transactionHash) as string | undefined;
                  const amountGbp = typeof o.priceGbp === 'number' ? o.priceGbp
                    : typeof o.amountGbp === 'number' ? o.amountGbp
                    : typeof o.amount === 'number' ? o.amount : null;
                  return (
                    <PseRow key={id || `order_${i}`}>
                      <PseCell mono>{id ? shortHash(id, 10) : '—'}</PseCell>
                      <PseCell>{String(o.toolName || o.toolId || '—')}</PseCell>
                      <PseCell>{String(o.status || '—').replace(/_/g, ' ')}</PseCell>
                      <PseCell numeric>{amountGbp === null ? '—' : gbp(amountGbp)}</PseCell>
                      <PseCell>{o.createdAt ? fmtDateTime(o.createdAt as string) : '—'}</PseCell>
                      <PseCell mono>
                        {hash ? (
                          <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer" className="underline">
                            {shortHash(hash)}
                          </a>
                        ) : '—'}
                      </PseCell>
                    </PseRow>
                  );
                })}
              </PseTable>
            )}
          </PseSection>
        </div>

        {/* ── 05 · PAYOUTS ────────────────────────────────────────────────── */}
        <div id="ops-payouts" className="scroll-mt-24">
          <PseSection
            title="Payout review"
            meta="A payout is completed only when BSC confirms success, recipient and exact locked BNB amount; records missing that amount remain blocked"
          >
            {withdrawalQueue.length === 0 ? (
              <PseEmptyNote title="No payouts awaiting review">
                Requests are reviewed here against the recorded destination and exact BNB amount. A transaction hash alone is never accepted as proof of payment; requests without a locked BNB amount must be reconciled before approval.
              </PseEmptyNote>
            ) : (
              <PseTable head={['Requested', 'Status', 'Amount', 'Destination', 'Requester', 'Transaction hash', 'Actions']}>
                {withdrawalQueue.map(w => {
                  const id = String(w.id || '');
                  const status = String(w.status || 'pending');
                  const view = payoutStatusView(status);
                  const amountMinor = typeof w.amountMinor === 'number' ? w.amountMinor
                    : typeof w.amountGBP === 'number' ? Math.round(w.amountGBP * 100) : null;
                  const dest = (w.destinationWallet || w.payoutWallet || w.payoutAddress) as string | undefined;
                  const requester = String(w.userId || w.uid || '');
                  return (
                    <PseRow key={id}>
                      <PseCell>{w.createdAt ? fmtDateTime(w.createdAt as string) : '—'}</PseCell>
                      <PseCell>{view.label}</PseCell>
                      <PseCell numeric>{amountMinor !== null ? gbp(amountMinor / 100) : '—'}</PseCell>
                      <PseCell mono>{dest ? shortAddr(dest) : '—'}</PseCell>
                      <PseCell mono>{requester ? shortAddr(requester) : '—'}</PseCell>
                      <PseCell>
                        <PseField label="On-chain payout transaction hash" htmlFor={`pse-tx-${id}`}>
                          <PseInput
                            id={`pse-tx-${id}`}
                            value={txInputs[id] || ''}
                            onChange={e => setTxInputs(prev => ({ ...prev, [id]: e.target.value }))}
                            placeholder="0x… (successful BNB Chain transfer)"
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </PseField>
                      </PseCell>
                      <PseCell>
                        <div className="flex flex-wrap gap-1.5">
                          <PseButton
                            size="sm"
                            disabled={resolving !== null}
                            busy={resolving === id + 'APPROVE'}
                            onClick={() => void reviewWithdrawal(id, 'APPROVE', (txInputs[id] || '').trim())}
                          >
                            {resolving === id + 'APPROVE' ? 'Approving…' : 'Approve'}
                          </PseButton>
                          <PseButton
                            size="sm"
                            tone="danger"
                            variant="secondary"
                            disabled={resolving !== null}
                            busy={resolving === id + 'REJECT'}
                            onClick={() => void reviewWithdrawal(id, 'REJECT')}
                          >
                            {resolving === id + 'REJECT' ? 'Rejecting…' : 'Reject'}
                          </PseButton>
                        </div>
                      </PseCell>
                    </PseRow>
                  );
                })}
              </PseTable>
            )}
          </PseSection>
        </div>

        {/* ── 06 · AUDIT ──────────────────────────────────────────────────── */}
        <div id="ops-audit" className="scroll-mt-24">
          <PseSection title="Administrative audit trail" meta="Latest 50 server-written records · read-only">
            {auditRows.length === 0 ? (
              <PseEmptyNote title="No audit records returned">The audit feed returned no records. This is not proof that no actions occurred; check backend audit-write health and access permissions.</PseEmptyNote>
            ) : (
              <PseTable head={["Time", "Action", "Target", "Actor", "Outcome"]}>
                {auditRows.map(row => (
                  <PseRow key={String(row.id || "")}>
                    <PseCell>{row.timestamp ? fmtDateTime(String(row.timestamp)) : "Time unavailable"}</PseCell>
                    <PseCell><span className="pse-ops-audit-action">{String(row.action || "ADMIN_ACTION").replace(/_/g, " ")}</span></PseCell>
                    <PseCell>{String(row.targetEntity || "Target not recorded")}</PseCell>
                    <PseCell mono>{row.adminId ? shortAddr(String(row.adminId)) : "Actor not recorded"}</PseCell>
                    <PseCell>{String(row.outcome || "recorded")}</PseCell>
                  </PseRow>
                ))}
              </PseTable>
            )}
          </PseSection>
        </div>

        <PseConfirm
          open={confirm !== null}
          title={confirm?.title || ''}
          consequence={confirm?.consequence || ''}
          affected={confirm?.affected}
          confirmLabel={confirm?.confirmLabel}
          danger={confirm?.danger}
          requireText={confirm?.requireText}
          busy={confirmBusy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (!confirm) return;
            setConfirmBusy(true);
            void confirm.run().finally(() => { setConfirmBusy(false); setConfirm(null); });
          }}
        />
      </PsePage>
    </div>
  );
};

export default AdminPSEMine;
