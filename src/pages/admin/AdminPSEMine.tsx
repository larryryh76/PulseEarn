import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import {
  campaignStatusView, fmtDateTime, gbp, gbpHour, payoutStatusView, shortAddr, shortHash, usePseDocumentTitle,
} from '../../components/psemine/pseCore';
import {
  PseButton, PseCell, PseConfirm, PseEmptyNote, PseField, PseInput, PseLoading,
  PseNotice, PseRow, PseSection, PseTable,
} from '../../components/psemine/PseBasics';
import toast from 'react-hot-toast';

/**
 * PSEmine operations console — MINIMAL FUNCTIONAL PRESENTATION.
 *
 * The designed admin surface was purged in
 * `refactor(psemine): purge legacy design implementation`. Authorisation, the API
 * contracts and every consequential action are unchanged:
 *
 *   • campaign lifecycle: pause / resume / settle / shutdown (shutdown requires
 *     the typed token), each confirmed first and audited by the backend;
 *   • payment recovery: the backend contract is exactly mark_reviewed |
 *     attach_to_purchase | reject — none activates a tool from the browser;
 *   • payout review: exactly { action: 'APPROVE', txHash } (which atomically
 *     completes the payout and reserves the hash) or { action: 'REJECT' } (which
 *     reverses the debit).
 */
export const AdminPSEMine: React.FC = () => {
  usePseDocumentTitle('Operations');

  const { currentUser } = useAuth();
  const { campaign, refreshData: refreshCampaign } = usePSEMine();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [recoveryCases, setRecoveryCases] = useState<Array<Record<string, unknown>>>([]);
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
      const [ovRes, recRes, wdRes] = await Promise.all([
        fetch('/api/admin/mine/overview', { headers }),
        fetch('/api/admin/mine/payment-recovery?status=open', { headers }),
        fetch('/api/admin/psemine/withdrawals', { headers }),
      ]);
      if (!ovRes.ok) throw new Error(`Overview unavailable (${ovRes.status})`);
      const ov = await ovRes.json().catch(() => ({}));
      setStats(ov?.stats || {});
      if (recRes.ok) {
        const d = await recRes.json().catch(() => ({}));
        setRecoveryCases(Array.isArray(d?.cases) ? d.cases : []);
      } else setRecoveryCases([]);
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
    setResolving(withdrawalId + action);
    try {
      await submitWithdrawalReview(withdrawalId, action, txHash);
    } finally { setResolving(null); }
  };

  /** Shared reviewer call — contract unchanged: {action:'APPROVE', txHash} or
   *  {action:'REJECT'}; success only on backend confirmation. */
  const submitWithdrawalReview = async (withdrawalId: string, action: 'APPROVE' | 'REJECT', txHash?: string) => {
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
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <PseLoading label="Loading PSEmine operations" />
      </div>
    );
  }

  // The campaign state is whatever the backend reported. If neither the console
  // context nor the overview endpoint has it, this screen says so rather than
  // defaulting to "Scheduled" — an operator must never read a state we invented.
  const camp = (campaign?.status || (typeof stats.campaignStatus === 'string' ? stats.campaignStatus : '')) || '';
  const campaignView = camp ? campaignStatusView(camp) : null;
  const num = (k: string): number => typeof stats[k] === 'number' ? stats[k] as number : 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-4 pb-16 sm:p-6">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">PSEmine operations</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Campaign controls, payment recovery and payout review. Every action here is authorised and audited by the
            backend.
            {loadedAt && ` As of ${fmtDateTime(new Date(loadedAt))}.`}
          </p>
        </div>
        <PseButton onClick={() => void load(true)} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</PseButton>
      </header>

      {error && <PseNotice tone="danger">{error}</PseNotice>}
      {!campaignView && <PseNotice tone="attention">The backend did not report a campaign state.</PseNotice>}

      <PseSection title="Campaign" meta="psemine_campaigns/active_campaign">
        <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {[
            ['Status', campaignView ? campaignView.label : '—'],
            ['Tools sold', `${num('toolsSold')}`],
            ['Active miners', `${num('activeMiners')}${num('totalMiners') ? ` / ${num('totalMiners')}` : ''}`],
            ['Total capacity', gbpHour(num('totalCapacityGBPPerHour'))],
            ['Accrued liability', gbp(num('totalAccruedLiabilityGBP'))],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-1.5">
              <dt className="text-sm text-text-secondary">{k}</dt>
              <dd className="text-sm text-text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        {campaignView && <p className="text-xs text-text-tertiary">{campaignView.detail}</p>}
        <div className="flex flex-wrap gap-2">
          {(['pause', 'resume', 'settle', 'shutdown'] as const).map(action => (
            <PseButton
              key={action}
              tone={action === 'shutdown' ? 'danger' : 'default'}
              onClick={() => void campaignAction(action)}
              disabled={actionBusy !== null}
            >
              {actionBusy === action ? 'Working…' : action.charAt(0).toUpperCase() + action.slice(1)}
            </PseButton>
          ))}
        </div>
      </PseSection>

      <PseSection title="Payment recovery" meta="Evidence records for verification failures — review before resolving. No automatic assignment.">
        {recoveryCases.length === 0 ? (
          <PseEmptyNote>No open recovery cases. Verification failures appear here with full evidence for review.</PseEmptyNote>
        ) : (
          <PseTable head={['Case', 'Reason', 'Recorded', 'On-chain transaction', 'Actions']}>
            {recoveryCases.map(c => {
              const id = String(c.id || c.recoveryId || '');
              const hash = (c.txHash || c.transactionHash) as string | undefined;
              return (
                <PseRow key={id}>
                  <PseCell mono>{shortHash(id, 8)}</PseCell>
                  <PseCell>{String(c.reason || 'unknown').replace(/_/g, ' ')}</PseCell>
                  <PseCell>{fmtDateTime(c.createdAt as string)}</PseCell>
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
                        tone="danger"
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

      <PseSection title="Payout review" meta="Actions are recorded in the admin audit trail. Payout completion validates the transaction hash atomically — a hash already attached to a completed payout is rejected (DUPLICATE_PAYOUT_TX).">
        {withdrawalQueue.length === 0 ? (
          <PseEmptyNote>No payouts awaiting review.</PseEmptyNote>
        ) : (
          <PseTable head={['Requested', 'Status', 'Amount', 'Destination', 'Requester', 'Transaction hash', 'Actions']}>
            {withdrawalQueue.map(w => {
              const id = String(w.id || '');
              const status = String(w.status || 'pending');
              const view = payoutStatusView(status);
              const amountMinor = typeof w.amountMinor === 'number' ? w.amountMinor
                : typeof w.amountGBP === 'number' ? Math.round(w.amountGBP * 100) : null;
              const dest = (w.destinationWallet || w.payoutWallet) as string | undefined;
              return (
                <PseRow key={id}>
                  <PseCell>{fmtDateTime(w.createdAt as string)}</PseCell>
                  <PseCell>{view.label}</PseCell>
                  <PseCell>{amountMinor !== null ? gbp(amountMinor / 100) : '—'}</PseCell>
                  <PseCell mono>{dest ? shortAddr(dest) : '—'}</PseCell>
                  <PseCell mono>{shortAddr(String(w.userId || w.uid || ''))}</PseCell>
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
                        disabled={resolving !== null}
                        onClick={() => void reviewWithdrawal(id, 'APPROVE', (txInputs[id] || '').trim())}
                      >
                        {resolving === id + 'APPROVE' ? 'Approving…' : 'Approve'}
                      </PseButton>
                      <PseButton tone="danger" disabled={resolving !== null} onClick={() => void reviewWithdrawal(id, 'REJECT')}>
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
    </div>
  );
};

export default AdminPSEMine;
