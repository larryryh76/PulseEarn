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
  const [withdrawalQueue, setWithdrawalQueue] = useState<Array<Record<string, unknown>>>([]);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
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
      const [ovRes, recRes, wdRes, ordersRes, pseRes] = await Promise.all([
        fetch('/api/admin/mine/overview', { headers }),
        fetch('/api/admin/mine/payment-recovery?status=open', { headers }),
        fetch('/api/admin/psemine/withdrawals', { headers }),
        fetch('/api/admin/psemine/orders', { headers }),
        fetch('/api/admin/psemine/overview', { headers }),
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
  const campaignAction = async (action: 'pause' | 'resume' | 'settle' | 'shutdown') => {
    if (!currentUser) return;
    const messages: Record<string, { title: string; detail: string; requireText?: string }> = {
      pause: { title: 'Pause the campaign?', detail: 'Accrual stops network-wide until resume. Tools and balances are untouched. This is recorded in the audit log.' },
      resume: { title: 'Resume the campaign?', detail: 'Operating tools resume accruing from the resume time. No retroactive accrual. This is recorded in the audit log.' },
      settle: { title: 'Begin settlement?', detail: 'Mining ends, purchases close, ownership states settle, and payout review opens. A settlement job is created and this is recorded in the audit log. Not casually reversible.' },
      shutdown: { title: 'SHUTDOWN — archive the campaign?', detail: 'Permanently archives the campaign: mining, purchases, and referrals close, and public mining interfaces close. This is recorded in the audit log.', requireText: 'shutdown' },
    };
    const m = messages[action];
    setConfirm({
      title: m.title,
      consequence: m.detail,
      affected: 'psemine_campaigns/active_campaign',
      confirmLabel: action === 'shutdown' ? 'Archive campaign' : action.charAt(0).toUpperCase() + action.slice(1) + ' campaign',
      danger: action === 'shutdown',
      requireText: m.requireText,
      run: async () => {
        setActionBusy(action);
        try {
          const token = await currentUser.getIdToken();
          const res = await fetch('/api/admin/mine/campaign/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ action, reason: `Admin console: ${action}` }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.success) {
            toast.success(`Campaign action "${action}" executed.`);
            await refreshCampaign();
            await load(true);
          } else {
            toast.error(data.error || data.message || `Action "${action}" failed.`);
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
        consequence: 'The debit is reversed exactly once and the request returns to the miner\u2019s available balance. The decision is recorded in the audit log.',
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

  const campaignPhase = useMemo(() => {
    const raw = (campaign?.status || (typeof stats.campaignStatus === 'string' ? stats.campaignStatus : '')) || '';
    return raw ? campaignStatusView(raw) : null;
  }, [campaign?.status, stats.campaignStatus]);

  if (loading) {
    return (
      <div className="pse pse-surface">
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
    <div className="pse pse-surface">
      <PsePage
        title="PSEmine operations"
        objective="Campaign lifecycle, the locked tool register, purchases, payment verification and payout review. Every control here is authorised, verified and audited by the backend."
        actions={
          <PseButton onClick={() => void load(true)} busy={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </PseButton>
        }
      >
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
            </PseFacts>

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
          <PseSection title="Purchases" meta="psemine_orders — the last 100 orders recorded by the backend">
            {orders.length === 0 ? (
              <PseEmptyNote title="No purchase orders recorded">
                A purchase appears here once a quote has been issued and an intent bound to a payer wallet. Activation
                still requires backend verification against BNB Smart Chain.
              </PseEmptyNote>
            ) : (
              <PseTable head={['Order', 'Tool', 'Status', 'Amount', 'Recorded', 'Transaction']}>
                {orders.map((o, i) => {
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
            meta="psemine_withdrawals — approving validates the transaction hash atomically; a hash already attached to a completed payout is rejected"
          >
            {withdrawalQueue.length === 0 ? (
              <PseEmptyNote title="No payouts awaiting review">
                A settled balance is paid in BNB to the payout wallet on the account. Requests enter this queue after
                settlement, and each one is reviewed here before anything is sent.
              </PseEmptyNote>
            ) : (
              <PseTable head={['Requested', 'Status', 'Amount', 'Destination', 'Requester', 'Transaction hash', 'Actions']}>
                {withdrawalQueue.map(w => {
                  const id = String(w.id || '');
                  const status = String(w.status || 'pending');
                  const view = payoutStatusView(status);
                  const amountMinor = typeof w.amountMinor === 'number' ? w.amountMinor
                    : typeof w.amountGBP === 'number' ? Math.round(w.amountGBP * 100) : null;
                  const dest = (w.destinationWallet || w.payoutWallet) as string | undefined;
                  const requester = String(w.userId || w.uid || '');
                  return (
                    <PseRow key={id}>
                      <PseCell>{w.createdAt ? fmtDateTime(w.createdAt as string) : '—'}</PseCell>
                      <PseCell>{view.label}</PseCell>
                      <PseCell numeric>{amountMinor !== null ? gbp(amountMinor / 100) : '—'}</PseCell>
                      <PseCell mono>{dest ? shortAddr(dest) : '—'}</PseCell>
                      <PseCell mono>{requester ? shortAddr(requester) : '—'}</PseCell>
                      <PseCell>
                        <PseField label="Tx hash" htmlFor={`pse-tx-${id}`}>
                          <PseInput
                            id={`pse-tx-${id}`}
                            value={txInputs[id] || ''}
                            onChange={e => setTxInputs(prev => ({ ...prev, [id]: e.target.value }))}
                            placeholder="0x…"
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
          <PseSection title="Audit" meta="admin_audit_logs — written by the backend, one entry per action">
            <PseEmptyNote title="Action history is recorded server-side">
              Every control on this page asks a backend route to perform the work, and each of those routes writes its own
              record (actor, action, target and outcome) to the audit log before it answers. There is no audit feed
              endpoint exposed to this console, so this section states the guarantee rather than showing a partial list
              that could be mistaken for the whole history.
            </PseEmptyNote>
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
