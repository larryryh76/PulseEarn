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

type ScreenSection = 'campaign' | 'lifecycle' | 'tools' | 'payments' | 'purchases' | 'payouts' | 'audit' | 'settings';

const SECTIONS: ReadonlyArray<{ id: ScreenSection; label: string }> = [
  { id: 'campaign', label: 'Overview' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'payments', label: 'Payment verification' },
  { id: 'tools', label: 'Tool register' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'audit', label: 'Audit' },
  { id: 'settings', label: 'Configuration' },
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
  const [verifiedPayments, setVerifiedPayments] = useState<Array<Record<string, unknown>>>([]);
  const [purchaseView, setPurchaseView] = useState<'payments' | 'orders'>('payments');
  const [orderFilter, setOrderFilter] = useState('all');
  const [activeSection, setActiveSection] = useState<ScreenSection>('campaign');
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [withdrawalQueue, setWithdrawalQueue] = useState<Array<Record<string, unknown>>>([]);
  const [auditRows, setAuditRows] = useState<Array<Record<string, unknown>>>([]);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(nextTuesdayDateValue());
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [resolving, setResolving] = useState<string | null>(null);
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});
  const [receiverWalletInput, setReceiverWalletInput] = useState('');
  const [receiverWalletCurrent, setReceiverWalletCurrent] = useState('');
  const [walletSaveBusy, setWalletSaveBusy] = useState(false);
  const [walletAcknowledged, setWalletAcknowledged] = useState(false);

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
      const [ovRes, recRes, wdRes, ordersRes, paymentsRes, pseRes, auditRes] = await Promise.all([
        fetch('/api/admin/mine/overview', { headers }),
        fetch('/api/admin/mine/payment-recovery?status=open', { headers }),
        fetch('/api/admin/psemine/withdrawals', { headers }),
        fetch('/api/admin/psemine/orders', { headers }),
        fetch('/api/admin/psemine/payments', { headers }),
        fetch('/api/admin/psemine/overview', { headers }),
        fetch('/api/admin/mine/audit', { headers }),
      ]);
      if (!ovRes.ok) throw new Error(`Campaign overview unavailable (${ovRes.status})`);
      const ov = await ovRes.json().catch(() => ({}));
      setStats(ov?.stats || {});
      const unavailable: string[] = [];

      if (pseRes.ok) {
        const d = await pseRes.json().catch(() => ({}));
        setMineOverview(d?.stats || {});
      } else { setMineOverview({}); unavailable.push('tool/session metrics'); }

      if (recRes.ok) {
        const d = await recRes.json().catch(() => ({}));
        setRecoveryCases(Array.isArray(d?.cases) ? d.cases : []);
      } else { setRecoveryCases([]); unavailable.push('payment recovery'); }

      if (ordersRes.ok) {
        const d = await ordersRes.json().catch(() => ({}));
        setOrders(Array.isArray(d?.orders) ? d.orders : []);
      } else { setOrders([]); unavailable.push('order intents'); }

      if (paymentsRes.ok) {
        const d = await paymentsRes.json().catch(() => ({}));
        setVerifiedPayments(Array.isArray(d?.payments) ? d.payments : []);
      } else { setVerifiedPayments([]); unavailable.push('verified payments'); }

      if (wdRes.ok) {
        const d = await wdRes.json().catch(() => ({}));
        const all: Array<Record<string, unknown>> = Array.isArray(d?.withdrawals) ? d.withdrawals : [];
        setWithdrawalQueue(all.filter(w => ['pending', 'under_review', 'approved', 'processing'].includes(String(w.status))));
      } else { setWithdrawalQueue([]); unavailable.push('payout queue'); }

      if (auditRes.ok) {
        const d = await auditRes.json().catch(() => ({}));
        setAuditRows(Array.isArray(d?.records) ? d.records : []);
      } else {
        setAuditRows([]);
        unavailable.push('audit feed');
      }
      setPartialErrors(unavailable);
      setLoadedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PSEmine operations data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const configured = String(campaign?.receiverWalletAddress || '');
    setReceiverWalletCurrent(configured);
    setReceiverWalletInput(configured);
  }, [campaign?.receiverWalletAddress]);

  /** Require a second, typed confirmation before changing where future purchases are paid. */
  const saveReceiverWallet = () => {
    const address = receiverWalletInput.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || /^0x0{40}$/i.test(address)) {
      toast.error('Enter a valid, non-zero BNB Smart Chain wallet address.');
      return;
    }
    if (address.toLowerCase() === receiverWalletCurrent.toLowerCase()) {
      toast('This is already the configured receiving address.');
      return;
    }
    if (!walletAcknowledged) {
      toast.error('Confirm that you have verified ownership and network before saving.');
      return;
    }
    setConfirm({
      title: 'Change tool purchase receiving wallet?',
      consequence: `New PSEmine tool purchase quotes will direct BNB to the new address. Existing quotes retain their original destination. Verify the entire address independently before proceeding. Current: ${receiverWalletCurrent || 'not reported'}. New: ${address}.`,
      affected: 'psemine_campaigns/active_campaign.receiverWalletAddress',
      confirmLabel: 'Change receiving wallet',
      danger: true,
      requireText: 'CHANGE WALLET',
      run: async () => { await commitReceiverWalletChange(address); },
    });
  };

  /** Persist the confirmed change. The server validates, persists and audits it. */
  const commitReceiverWalletChange = async (address: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || /^0x0{40}$/i.test(address)) {
      toast.error('Enter a valid, non-zero BNB Smart Chain wallet address.');
      return;
    }
    if (address.toLowerCase() === receiverWalletCurrent.toLowerCase()) {
      toast('This is already the configured receiving address.');
      return;
    }
    if (!walletAcknowledged) {
      toast.error('Confirm that you have verified ownership and network before saving.');
      return;
    }
    setWalletSaveBusy(true);
    try {
      const token = await currentUser?.getIdToken();
      if (!token) throw new Error('Your admin session is unavailable. Sign in again.');
      const res = await fetch('/api/admin/mine/campaign/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'set_receiver_wallet',
          receiverWalletAddress: address,
          reason: 'Updated from PSEmine admin configuration',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Receiving wallet update failed.');
      toast.success('PSEmine receiving wallet updated for new quotes.');
      setReceiverWalletCurrent(address);
      setReceiverWalletInput(address);
      setWalletAcknowledged(false);
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Receiving wallet update failed.');
    } finally { setWalletSaveBusy(false); }
  };

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

  const numOrDash = (value: number | string | null | undefined, format?: (n: number) => string): string => {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return '—';
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numericValue)) return '—';
    return format ? format(numericValue) : String(numericValue);
  };

  const visibleOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();
    return orders.filter(order => {
      const status = String(order.status || '').toLowerCase();
      const matchesFilter = orderFilter === 'all' || (orderFilter === 'confirmed' ? status === 'confirmed' : orderFilter === 'pending' ? ['quoted', 'pending', 'awaiting_payment', 'submitted', 'processing', 'awaiting payment'].includes(status) : ['failed', 'rejected', 'expired', 'under_review', 'recovery'].includes(status));
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
    <div className="pse pse-surface pse-console-shell pse-admin-operations">
      <PsePage
        title="PSEmine operations"
        objective="Live campaign operations · verified records only."
        actions={
          <PseButton onClick={() => void load(true)} busy={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </PseButton>
        }
      >
        <section className="pse-ops-hero" aria-label="PSEmine operational summary">
          <div className="pse-ops-hero-copy">
            <span className="pse-ops-eyebrow"><span className={`pse-ops-live-dot ${error || partialErrors.length > 0 ? 'is-error' : loadedAt ? 'is-connected' : ''}`} /> CAMPAIGN CONTROL CENTRE</span>
            <h2>Campaign overview.<br /><em>Evidence, not estimates.</em></h2>
            <div className="pse-ops-hero-meta">
              <span className={campaignPhase?.label?.toLowerCase().includes('active') ? 'is-positive' : 'is-neutral'}>{campaignPhase?.label || 'Campaign state unavailable'}</span>
              
            </div>
          </div>
          <div className="pse-ops-hero-mark" aria-hidden="true"><span>PSE</span><strong>{campaign?.durationDays ?? '—'}</strong><small>DAY WINDOW</small></div>
        </section>
        <section className="pse-ops-kpis" aria-label="Campaign key performance indicators">
          <article className="pse-ops-kpi pse-ops-kpi-primary"><span className="pse-ops-kpi-label">Accrued liability</span><strong>{numOrDash(stat('totalAccruedLiabilityGBP'), gbp)}</strong><small>Earned balances recorded by backend</small></article>
          <article className="pse-ops-kpi"><span className="pse-ops-kpi-label">Active miners</span><strong>{numOrDash(stat('activeMiners'))}</strong><small>{numOrDash(stat('totalMiners'))} total registered accounts</small></article>
          <article className="pse-ops-kpi pse-ops-kpi-primary"><span className="pse-ops-kpi-label">Total tool income</span><strong>{numOrDash(mineOverview.totalToolIncomeGbp, gbp)}</strong><small>Real on-chain confirmed tool payments only</small></article>
          <article className="pse-ops-kpi"><span className="pse-ops-kpi-label">Verified activations</span><strong>{numOrDash(stat('toolsSold'))}</strong><small>Backend-reported activated purchases</small></article>
          <article className="pse-ops-kpi"><span className="pse-ops-kpi-label">Needs investigation</span><strong>{numOrDash(stat('openRecoveryCases'))}</strong><small>Open payment-recovery cases</small></article>
        </section>

        <section className="pse-ops-wallet-shortcut" aria-label="Tool purchase payment destination">
          <div className="pse-ops-wallet-shortcut-copy">
            <span className="pse-ops-kpi-label">Tool purchase receiving wallet</span>
            <code>{receiverWalletCurrent || 'Receiving wallet not reported'}</code>
            <small>BNB Smart Chain · new quotes use this destination</small>
          </div>
          <PseButton size="sm" variant="secondary" onClick={() => setActiveSection('settings')}>Configure wallet</PseButton>
        </section>

        {/* Section rail — in-page, because this is one console with six
            registers rather than six routes. */}
        <nav className="pse-ops-register-nav" aria-label="Operations registers">
          <div className="pse-ops-tabs" role="tablist" aria-label="PSEmine operations">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeSection === s.id}
                aria-controls={`ops-${s.id}`}
                onClick={() => setActiveSection(s.id)}
                className={`pse-ops-tab ${activeSection === s.id ? 'is-active' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="pse-ops-asof">
            {loadedAt ? `Synced ${fmtDateTime(new Date(loadedAt))}` : 'Awaiting first sync'}
          </span>
        </nav>

        {error && <PseNotice tone="danger">{error}</PseNotice>}
        {partialErrors.length > 0 && (
          <PseNotice tone="attention">
            Unavailable registers: {partialErrors.join(', ')}. Their empty results are not evidence that no records exist; refresh after the service recovers.
          </PseNotice>
        )}
        {!campaignPhase && (
          <PseNotice tone="attention">
            The backend did not report a campaign state. Every figure below is read from the API; nothing is inferred.
          </PseNotice>
        )}

        {/* ── 01 · CAMPAIGN ───────────────────────────────────────────────── */}
        {activeSection === 'campaign' && (
        <div id="ops-campaign" className="scroll-mt-24">
          <PseSection title="Campaign" meta="psemine_campaigns/active_campaign">
            <PseFacts cols={3}>
              <PseFact
                label="Active mining sessions"
                value={numOrDash(overviewStat('activeMiningSessions'))}
                hint="Sessions whose backend state is active"
              />
              <PseFact
                label="Active tools owned"
                value={numOrDash(overviewStat('activeToolOwnerships'))}
                hint="Active ownership records"
              />
              <PseFact
                label="Confirmed tool payments"
                value={numOrDash(overviewStat('totalConfirmedPayments'))}
                hint="Verified on-chain purchases"
              />
              <PseFact
                label="Total tool income"
                value={numOrDash(overviewStat('totalToolIncomeGbp'), gbp)}
                hint="Lifetime GBP value of confirmed tool purchases only"
              />
            </PseFacts>
            <PseFacts cols={3}>
              <PseFact label="Status" text value={campaignPhase ? campaignPhase.label : '—'} hint={campaignPhase ? campaignPhase.detail : 'Not reported by the backend'} />
              <PseFact label="Capacity" value={numOrDash(stat('totalCapacityGBPPerHour'), gbpHour)} />
              <PseFact label="Campaign duration" value={campaign?.durationDays ? `${campaign.durationDays} days` : '—'} />
              <PseFact label="Starts (UK time)" value={campaign?.startAt ? fmtUKDateTime(campaign.startAt) : '—'} />
              <PseFact label="Ends (UK time)" value={campaign?.endAt ? fmtUKDateTime(campaign.endAt) : '—'} />
            </PseFacts>
            <details className="pse-ops-details">
              <summary>Additional campaign metrics</summary>
              <PseFacts cols={3}>
                <PseFact label="Qualified referrals" value={numOrDash(stat('qualifiedReferrals'))} />
                <PseFact label="BNB collected" value={numOrDash(stat('totalBNBCollected'))} />
                <PseFact label="Accrued · debited" value={stat('totalAccruedMinor') === null && stat('totalDebitedMinor') === null ? '—' : `${numOrDash(stat('totalAccruedMinor'), n => gbp(n / 100))} · ${numOrDash(stat('totalDebitedMinor'), n => gbp(n / 100))}`} hint="Accrued · paid out" />
              </PseFacts>
            </details>
          </PseSection>
        </div>
        )}


        {activeSection === 'lifecycle' && (
          <div id="ops-lifecycle" className="scroll-mt-24">
            <PseSection title="Campaign lifecycle" meta="Schedule, pause, resume or settle the campaign">


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
                Times use Europe/London. Scheduling changes the campaign window immediately, preserves existing balances and records, and sets a new 90-day end date.
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
        )}

        {/* ── 02 · PAYMENT VERIFICATION ───────────────────────────────────── */}
        {activeSection === 'payments' && (
        <div id="ops-payments" className="scroll-mt-24">
          <PseSection
            title="Payment verification"
            meta="Failed on-chain payments · review evidence"
          >
            {recoveryCases.length === 0 ? (
              <PseEmptyNote title={partialErrors.includes('payment recovery') ? "Payment recovery unavailable" : "No payments awaiting verification review"}>
                {partialErrors.includes('payment recovery')
                  ? 'The recovery endpoint could not be read. This is not an empty queue; refresh after the service recovers.'
                  : 'Cases with amount, chain, sender or expiry mismatches appear here with recorded evidence.'}
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
        )}

        {/* ── 03 · TOOL REGISTER ──────────────────────────────────────────── */}
        {activeSection === 'tools' && (
        <div id="ops-tools" className="scroll-mt-24">
          <PseSection
            title="Tool register"
            meta="Locked campaign tiers and economics"
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
        )}

        {/* ── 04 · PURCHASES ──────────────────────────────────────────────── */}
        {activeSection === 'purchases' && (
        <div id="ops-purchases" className="scroll-mt-24">
          <PseSection title="Payments & order intents" meta="Confirmed payments are separate from order intents">
            <div className="pse-ops-subtabs" role="tablist" aria-label="Payment records">
              <button type="button" role="tab" aria-selected={purchaseView === 'payments'} className={`pse-ops-subtab ${purchaseView === 'payments' ? 'is-active' : ''}`} onClick={() => setPurchaseView('payments')}>
                Verified payments <span>{verifiedPayments.length}</span>
              </button>
              <button type="button" role="tab" aria-selected={purchaseView === 'orders'} className={`pse-ops-subtab ${purchaseView === 'orders' ? 'is-active' : ''}`} onClick={() => setPurchaseView('orders')}>
                Order intents <span>{orders.length}</span>
              </button>
            </div>
            {purchaseView === 'payments' ? (
              partialErrors.includes('verified payments') ? (
                <PseEmptyNote title="Verified payment ledger unavailable">
                  The payment endpoint failed. No conclusion can be drawn about whether confirmed payments exist.
                </PseEmptyNote>
              ) : verifiedPayments.length === 0 ? (
                <PseEmptyNote title="No confirmed payments recorded">
                  Only backend-confirmed on-chain payments appear here. Quotes and unverified hashes are excluded.
                </PseEmptyNote>
              ) : (
                <PseTable head={['Confirmed', 'Tool', 'Amount', 'Block', 'Order', 'On-chain transaction']}>
                  {verifiedPayments.map((p, i) => {
                    const id = String(p.id || '');
                    const hash = String(p.txHash || p.transactionHash || '');
                    const amount = p.paidBnbAmount ?? p.amountBnb;
                    const amountNumber = amount !== undefined && amount !== null && Number.isFinite(Number(amount)) ? Number(amount) : null;
                    return (
                      <PseRow key={id || hash || `payment_${i}`}>
                        <PseCell>{p.confirmedAt || p.createdAt ? fmtDateTime(String(p.confirmedAt || p.createdAt)) : '—'}</PseCell>
                        <PseCell>{String(p.toolId || '—')}</PseCell>
                        <PseCell numeric>{amountNumber === null ? '—' : `${amountNumber.toLocaleString('en-GB', { maximumFractionDigits: 8 })} BNB`}</PseCell>
                        <PseCell mono>{p.blockNumber === undefined || p.blockNumber === null ? '—' : String(p.blockNumber)}</PseCell>
                        <PseCell mono>{p.orderId ? shortHash(String(p.orderId), 10) : '—'}</PseCell>
                        <PseCell mono>{hash ? <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer" className="underline">{shortHash(hash)}</a> : '—'}</PseCell>
                      </PseRow>
                    );
                  })}
                </PseTable>
              )
            ) : (
              <>
            <p className="pse-ops-register-note">These are order/quote records, not a payment ledger. An order is counted as paid only when its separate confirmed-payment record exists.</p>
            <div className="pse-ops-ledger-tools">
              <label className="pse-ops-search"><span>Search order intents</span><input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Order ID, user, tool or transaction hash" /></label>
              <label className="pse-ops-filter"><span>Order state</span><select value={orderFilter} onChange={e => setOrderFilter(e.target.value)}><option value="all">All order intents</option><option value="confirmed">Confirmed on-chain</option><option value="pending">Awaiting payment</option><option value="attention">Needs attention</option></select></label>
              <span className="pse-ops-record-count">{visibleOrders.length} of {orders.length} intents</span>
            </div>
            {partialErrors.includes('order intents') ? (
              <PseEmptyNote title="Order intents unavailable">
                The order endpoint failed. This view cannot confirm whether orders exist.
              </PseEmptyNote>
            ) : orders.length === 0 ? (
              <PseEmptyNote title="No order intents recorded">
                An order intent appears after a quote is issued. It is not proof of payment; successful on-chain verification creates a separate confirmed-payment record.
              </PseEmptyNote>
            ) : visibleOrders.length === 0 ? (
              <PseEmptyNote title="No matching purchase records">Change the payment-state filter or search term. No records have been added to fill this view.</PseEmptyNote>
            ) : (
              <PseTable head={['Order intent', 'Tool', 'Order state', 'Quoted amount', 'Created', 'Submitted hash / verification']}>
                {visibleOrders.map((o, i) => {
                  const id = String(o.id || o.orderId || '');
                  const hash = (o.txHash || o.transactionHash) as string | undefined;
                  const orderStatus = String(o.status || '').toLowerCase();
                  const amountValue = o.priceGbp ?? o.amountGbp ?? o.amount;
                  const amountGbp = amountValue !== undefined && amountValue !== null && Number.isFinite(Number(amountValue)) ? Number(amountValue) : null;
                  return (
                    <PseRow key={id || `order_${i}`}>
                      <PseCell mono>{id ? shortHash(id, 10) : '—'}</PseCell>
                      <PseCell>{String(o.toolName || o.toolId || '—')}</PseCell>
                      <PseCell>{String(o.status || '—').replace(/_/g, ' ')}</PseCell>
                      <PseCell numeric>{amountGbp === null ? '—' : gbp(amountGbp)}</PseCell>
                      <PseCell>{o.createdAt ? fmtDateTime(o.createdAt as string) : '—'}</PseCell>
                      <PseCell mono>
                        {hash ? orderStatus === 'confirmed' ? (
                          <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer" className="underline">
                            {shortHash(hash)} · confirmed
                          </a>
                        ) : (
                          <span title="Hash is recorded on the order but is not confirmed as a payment">{shortHash(hash)} · unverified</span>
                        ) : 'No hash'}
                      </PseCell>
                    </PseRow>
                  );
                })}
              </PseTable>
            )}
              </>
            )}
          </PseSection>
        </div>
        )}

        {/* ── 05 · PAYOUTS ────────────────────────────────────────────────── */}
        {activeSection === 'payouts' && (
        <div id="ops-payouts" className="scroll-mt-24">
          <PseSection
            title="Payout review"
            meta="Verify recipient, locked amount and on-chain receipt before marking paid"
          >
            {withdrawalQueue.length === 0 ? (
              <PseEmptyNote title={partialErrors.includes('payout queue') ? "Payout queue unavailable" : "No payouts awaiting review"}>
                {partialErrors.includes('payout queue')
                  ? 'The payout endpoint failed. This is not evidence that the queue is empty.'
                  : 'A hash alone is not proof of payment. Requests without a locked BNB amount remain blocked until reconciled.'}
              </PseEmptyNote>
            ) : (
              <PseTable head={['Requested', 'Status', 'Amount', 'Destination', 'Requester', 'Transaction hash', 'Actions']}>
                {withdrawalQueue.map(w => {
                  const id = String(w.id || '');
                  const status = String(w.status || 'pending');
                  const view = payoutStatusView(status);
                  const amountMinor = typeof w.amountMinor === 'number' ? w.amountMinor
                    : typeof w.amountGBP === 'number' ? Math.round(w.amountGBP * 100) : null;
                  const amountBnb = w.amountBnb !== undefined && w.amountBnb !== null && Number.isFinite(Number(w.amountBnb))
                    ? Number(w.amountBnb) : null;
                  const dest = (w.destinationWallet || w.payoutWallet || w.payoutAddress) as string | undefined;
                  const requester = String(w.userId || w.uid || '');
                  return (
                    <PseRow key={id}>
                      <PseCell>{w.createdAt ? fmtDateTime(w.createdAt as string) : '—'}</PseCell>
                      <PseCell>{view.label}</PseCell>
                      <PseCell numeric>
                        <div>{amountMinor !== null ? gbp(amountMinor / 100) : '—'}</div>
                        <div className="text-xs text-white/55">
                          {amountBnb !== null ? `${amountBnb.toFixed(8)} BNB · locked` : 'No locked BNB quote'}
                        </div>
                      </PseCell>
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
        )}

        {/* ── 06 · AUDIT ──────────────────────────────────────────────────── */}
        {activeSection === 'audit' && (
        <div id="ops-audit" className="scroll-mt-24">
          <PseSection title="Administrative audit trail" meta="Latest 50 server-written records · read-only">
            {auditRows.length === 0 ? (
              <PseEmptyNote title={partialErrors.includes('audit feed') ? "Audit feed unavailable" : "No audit records returned"}>
                {partialErrors.includes('audit feed')
                  ? 'The audit endpoint failed. No conclusion can be drawn about prior administrative actions.'
                  : 'The audit feed returned no records. This is not proof that no actions occurred; check backend audit-write health and access permissions.'}
              </PseEmptyNote>
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
        )}

        {/* ── 08 · CONFIGURATION ─────────────────────────────────────────── */}
        {activeSection === 'settings' && (
        <div id="ops-settings" className="scroll-mt-24 pse-ops-settings">
          <PseSection title="Payment configuration" meta="Campaign-level receiving destination · super-admin only">
            <div className="pse-ops-wallet-panel">
              <div className="pse-ops-wallet-heading">
                <div>
                  <span className="pse-ops-kpi-label">Tool purchase receiving wallet</span>
                  <h3>BNB Smart Chain · BNB</h3>
                  <p>Funds from new PSEmine tool purchase quotes are sent to this address. This is not a user's personal payout wallet.</p>
                </div>
                <span className="pse-ops-config-badge">Sensitive setting</span>
              </div>
              <div className="pse-ops-current-destination">
                <span>Currently configured</span>
                <code>{receiverWalletCurrent || 'Not reported by campaign API'}</code>
              </div>
              <PseField label="New receiving wallet address" htmlFor="pse-receiver-wallet">
                <PseInput id="pse-receiver-wallet" value={receiverWalletInput}
                  onChange={e => { setReceiverWalletInput(e.target.value); setWalletAcknowledged(false); }}
                  placeholder="0x… (42-character BNB Smart Chain address)" autoComplete="off" spellCheck={false} />
              </PseField>
              <label className="pse-ops-wallet-confirm">
                <input type="checkbox" checked={walletAcknowledged} onChange={e => setWalletAcknowledged(e.target.checked)} />
                <span>I have independently verified this destination address and confirmed that I control or am authorised to receive funds there on BNB Smart Chain.</span>
              </label>
              <div className="pse-ops-wallet-actions">
                <PseButton disabled={walletSaveBusy || !walletAcknowledged || !/^0x[a-fA-F0-9]{40}$/.test(receiverWalletInput.trim()) || receiverWalletInput.trim().toLowerCase() === receiverWalletCurrent.toLowerCase()}
                  busy={walletSaveBusy} onClick={() => void saveReceiverWallet()}>
                  {walletSaveBusy ? 'Saving destination…' : 'Save receiving wallet'}
                </PseButton>
                <PseButton variant="secondary" disabled={walletSaveBusy} onClick={() => { setReceiverWalletInput(receiverWalletCurrent); setWalletAcknowledged(false); }}>Reset</PseButton>
              </div>
              <div className="pse-ops-wallet-warning" role="note">
                <strong>Important:</strong> this affects new quotes only. Existing quotes and purchase intents retain their recorded destination and amount. Never change the address based on an unsolicited message; verify it independently before saving. Every change is recorded in the admin audit trail.
              </div>
            </div>
          </PseSection>
          <PseSection title="Configuration boundaries" meta="What this console can and cannot change">
            <PseFacts cols={2}>
              <PseFact label="Payment network" value="BNB Smart Chain" text />
              <PseFact label="Payment asset" value="BNB" text />
              <PseFact label="Chain ID" value={String(campaign?.paymentChainId ?? '—')} text />
              <PseFact label="Tool prices and rates" value="Locked campaign economics" text hint="Not editable here; backend remains authoritative." />
            </PseFacts>
            <PseNotice tone="attention">The receiving wallet is distinct from payout destinations used when paying users. This setting does not transfer funds, move collected assets, or modify existing purchase records.</PseNotice>
          </PseSection>
        </div>
        )}

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
