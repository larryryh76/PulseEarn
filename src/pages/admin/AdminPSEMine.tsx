import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, Play, Pause, Flag, RefreshCcw, ExternalLink, Lock, Loader2,
  AlertTriangle, CheckCircle2, Ban, Wrench,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import toast from 'react-hot-toast';
import { gbp, shortHash, shortAddr, fmtDateTime, Chip, PSEEmpty, PSELoading } from '../../components/psemine/pse';
import { ConfirmDialog } from '../../components/psemine/ConfirmDialog';

/* Admin surfaces use the pse tokens too, but scoped to a wrapper so the rest
 * of OpsLayout (PulseEarn admin chrome) stays untouched. */
const AdminPSEMine: React.FC = () => {
  const { currentUser } = useAuth();
  const { campaign, refreshData: refreshCampaign } = usePSEMine();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [recoveryCases, setRecoveryCases] = useState<Array<Record<string, unknown>>>([]);
  const [withdrawalQueue, setWithdrawalQueue] = useState<Array<Record<string, unknown>>>([]);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // FIX 3: design-system confirmation for consequential campaign actions.
  // Same copy contract as before (action + consequence + affected entity),
  // same backend endpoint/authorization — presentation only.
  const [confirm, setConfirm] = useState<{
    title: string; consequence: string; affected: string;
    confirmLabel: string; danger?: boolean; requireText?: string;
    run: () => Promise<void>;
  } | null>(null);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PSEmine operations data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => { void load(); }, [load]);

  /** Campaign lifecycle actions with design-system confirmation (FIX 3). */
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

  /** FIX 4: recovery resolution now goes through the same confirmation
   * discipline. Backend contract (traced in psemine_engine.py
   * admin_resolve_payment_recovery): valid actions are mark_reviewed,
   * attach_to_purchase, reject — none activate a tool. The UI copy below
   * reflects that contract and asks for purchaseId when attaching. */
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

  /** Payout review — D3 fix: backend contract is exactly { action: 'APPROVE',
   * txHash } (atomically completes the payout, reserving the hash) or
   * { action: 'REJECT' } (reverses the debit). Any other shape returns 400. */
  const reviewWithdrawal = async (withdrawalId: string, action: 'APPROVE' | 'REJECT', txHash?: string) => {
    if (action === 'APPROVE' && !txHash) { toast.error('A transaction hash is required to approve a payout.'); return; }
    if (action === 'REJECT') {
      // FIX 3: rejection reverses the debit — confirm with the design system.
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
   * {action:'REJECT'}; success only on backend confirmation. */
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
    } finally { setResolving(null); }
  };

  if (loading) return <div className="p-10"><PSELoading label="Loading PSEmine operations" /></div>;

  const camp = (campaign?.status || String(stats.campaignStatus || '—')) as string;
  const num = (k: string): number => typeof stats[k] === 'number' ? stats[k] as number : 0;

  return (
    <div className="pse-scope min-h-screen">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="pse-h2">PSEmine operations</h1>
              <Chip label="Admin" chip="pse-chip pse-chip-danger" dot={false} />
            </div>
            <p className="pse-micro mt-1">Real operational data from the canonical PSEmine backend.</p>
          </div>
          <button onClick={() => void load(true)} disabled={refreshing} className="pse-btn pse-btn-secondary pse-btn-sm self-start sm:self-auto">
            <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="pse-card flex items-start gap-3 p-4" style={{ borderColor: 'rgba(240,68,56,0.35)' }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-danger)' }} />
            <div className="flex-1">
              <p className="pse-caption">{error}</p>
              <button onClick={() => void load(true)} className="pse-btn pse-btn-secondary pse-btn-sm mt-2">Retry</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Active miners', `${num('activeMiners')}${num('totalMiners') ? ` / ${num('totalMiners')}` : ''}`, null],
            ['Tools deployed', `${num('toolsSold')}`, null],
            ['Network capacity', `£${num('totalCapacityGBPPerHour').toFixed(2)}/hr`, 'var(--pse-cyan)'],
            ['Accrued liability', gbp(num('totalAccruedLiabilityGBP')), 'var(--pse-warning)'],
          ].map(([label, value, accent]) => (
            <div key={String(label)} className="pse-card p-5">
              <p className="pse-eyebrow">{label}</p>
              <p className="pse-num mt-1.5 text-[22px] font-semibold" style={{ color: (accent as string) || 'var(--pse-text)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Campaign lifecycle */}
        <section className="pse-card p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="pse-h3">Campaign lifecycle</p>
              <p className="pse-micro mt-0.5">
                Current state: <span className="pse-mono font-semibold" style={{ color: 'var(--pse-blue)' }}>{camp.toUpperCase()}</span>
                {' · '}Open recovery cases: <strong>{recoveryCases.length}</strong>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {campaign?.status === 'paused' ? (
                <button onClick={() => void campaignAction('resume')} disabled={actionBusy !== null}
                  className="pse-btn pse-btn-primary pse-btn-sm justify-center">
                  {actionBusy === 'resume' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Resume
                </button>
              ) : (
                <button onClick={() => void campaignAction('pause')} disabled={actionBusy !== null || campaign?.status !== 'active'}
                  className="pse-btn pse-btn-secondary pse-btn-sm justify-center">
                  {actionBusy === 'pause' ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />} Pause
                </button>
              )}
              <button onClick={() => void campaignAction('settle')} disabled={actionBusy !== null}
                className="pse-btn pse-btn-secondary pse-btn-sm justify-center">
                {actionBusy === 'settle' ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />} Settle
              </button>
              <button onClick={() => void campaignAction('shutdown')} disabled={actionBusy !== null}
                className="pse-btn pse-btn-danger pse-btn-sm justify-center sm:col-span-2">
                {actionBusy === 'shutdown' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Shutdown & archive
              </button>
            </div>
          </div>
        </section>

        {/* Payment recovery queue */}
        <section className="pse-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
            <div>
              <p className="pse-h3">Payment recovery ({recoveryCases.length})</p>
              <p className="pse-micro mt-0.5">Evidence records for verification failures — review before resolving. No automatic assignment.</p>
            </div>
            <Flag size={16} style={{ color: 'var(--pse-warning)' }} />
          </div>
          {recoveryCases.length === 0 ? (
            <PSEEmpty icon={CheckCircle2} title="No open recovery cases" body="Verification failures appear here with full evidence for review." />
          ) : (
            <div className="overflow-x-auto">
              <table className="pse-table">
                <thead>
                  <tr><th>Case</th><th>Reason</th><th>Transaction</th><th>Created</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {recoveryCases.map(c => {
                    const id = String(c.id || c.recoveryId || '');
                    const hash = (c.txHash || c.transactionHash) as string | undefined;
                    return (
                      <tr key={id}>
                        <td className="pse-mono">{shortHash(id, 8)}</td>
                        <td><Chip label={String(c.reason || 'unknown').replace(/_/g, ' ')} chip="pse-chip pse-chip-warning" dot={false} /></td>
                        <td>{hash ? <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer" className="pse-hash inline-flex items-center gap-1 hover:underline">{shortHash(hash)} <ExternalLink size={10} /></a> : '—'}</td>
                        <td className="pse-caption" style={{ color: 'var(--pse-text-2)' }}>{fmtDateTime((c.createdAt) as string)}</td>
                        <td>
                          <div className="flex justify-end gap-1.5">
                            {/* FIX 4: contract-accurate actions (backend: mark_reviewed | attach_to_purchase | reject — none activate a tool). Consequential ones go through the design-system dialog. */}
                            <button
                              onClick={() => setConfirm({
                                title: 'Complete purchase from recovery evidence?',
                                consequence: 'This re-runs purchase verification against the recorded on-chain transaction. A tool is activated ONLY if the backend verification passes — it can never be created from the browser. The outcome is recorded in the audit log.',
                                affected: `psemine_payment_recovery/${id}`,
                                confirmLabel: 'Re-verify & attempt purchase',
                                run: async () => { await resolveRecovery(id, 'attach_to_purchase', 'Resolved from operations console — re-verified purchase linkage.'); },
                              })}
                              disabled={resolving !== null} className="pse-btn pse-btn-primary pse-btn-sm">Complete purchase</button>
                            <button
                              onClick={() => setConfirm({
                                title: 'Dismiss this recovery case?',
                                consequence: 'The case is marked rejected and closed without linking the transaction. Evidence is retained in psemine_payment_recovery. Recorded in the audit log.',
                                affected: `psemine_payment_recovery/${id}`,
                                confirmLabel: 'Dismiss case',
                                danger: true,
                                run: async () => { await resolveRecovery(id, 'reject', 'Dismissed after review.'); },
                              })}
                              disabled={resolving !== null} className="pse-btn pse-btn-ghost pse-btn-sm">Dismiss</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Payout review queue */}
        <section className="pse-card overflow-hidden">
          <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--pse-line)' }}>
            <div>
              <p className="pse-h3">Payout review ({withdrawalQueue.length})</p>
              <p className="pse-micro mt-0.5">Requests awaiting review or processing. Completion requires the on-chain transaction hash; duplicate hashes are rejected server-side.</p>
            </div>
            <Lock size={16} style={{ color: 'var(--pse-cyan)' }} />
          </div>
          {withdrawalQueue.length === 0 ? (
            <PSEEmpty icon={ShieldAlert} title="No payouts awaiting review" body="Withdrawal requests appear here once miners submit them at settlement." />
          ) : (
            <div className="overflow-x-auto">
              <table className="pse-table">
                <thead>
                  <tr><th>Requested</th><th>User</th><th className="pse-num-cell">Amount</th><th>Status</th><th>Destination</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {withdrawalQueue.map(w => {
                    const id = String(w.id || '');
                    const status = String(w.status || 'pending');
                    const amountMinor = typeof w.amountMinor === 'number' ? w.amountMinor
                      : typeof w.amountGBP === 'number' ? Math.round(w.amountGBP * 100) : null;
                    const dest = (w.destinationWallet || w.payoutWallet) as string | undefined;
                    const busy = resolving === id + 'APPROVE' || resolving === id + 'REJECT';
                    return (
                      <tr key={id}>
                        <td className="pse-caption" style={{ color: 'var(--pse-text-2)' }}>{fmtDateTime(w.createdAt as string)}</td>
                        <td className="pse-mono">{shortAddr(String(w.userId || w.uid || ''))}</td>
                        <td className="pse-num-cell font-semibold">{amountMinor !== null ? gbp(amountMinor / 100) : '—'}</td>
                        <td><Chip label={status.replace(/_/g, ' ')} chip={status === 'pending' ? 'pse-chip pse-chip-warning' : 'pse-chip pse-chip-cyan'} dot={false} /></td>
                        <td><span className="pse-mono">{dest ? shortAddr(dest) : '—'}</span></td>
                        <td>
                          {/* FIX 5: actions wrap vertically within the cell on mobile */}
                          <div className="flex flex-col items-stretch justify-end gap-1.5 sm:flex-row sm:items-center">
                            {status === 'pending' || status === 'under_review' ? (
                              <>
                                {/* D3: approve IS the completion — backend atomically
                                    reserves the tx hash and marks the payout paid. */}
                                <ApprovePayoutButton busy={busy} onApprove={(hash) => void reviewWithdrawal(id, 'APPROVE', hash)} />
                                <button onClick={() => { void reviewWithdrawal(id, 'REJECT'); }}
                                  disabled={busy} className="pse-btn pse-btn-danger pse-btn-sm">Reject</button>
                              </>
                            ) : (
                              <span className="pse-micro">Resolved</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="pse-micro flex items-start gap-2">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          All actions are recorded in the admin audit trail. Payout completion validates the transaction hash atomically — a hash already attached to a completed payout is rejected (DUPLICATE_PAYOUT_TX).
        </p>
      </div>

      {/* FIX 3/4: design-system confirmation for all consequential actions */}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title || ''}
        consequence={confirm?.consequence || ''}
        affected={confirm?.affected}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        requireText={confirm?.requireText}
        busy={confirm?.confirmLabel === 'Archive campaign' ? actionBusy === 'shutdown' : false}
        onConfirm={() => { const run = confirm?.run; setConfirm(null); if (run) void run(); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
};

/** D3: Approve form — one action, one tx hash. The backend reserves the hash
 * atomically and marks the payout paid in the same transaction. */
function ApprovePayoutButton({ busy, onApprove }: { busy: boolean; onApprove: (hash: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState('');

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} disabled={busy} className="pse-btn pse-btn-primary pse-btn-sm">
        Approve with tx hash…
      </button>
    );
  }
  return (
    /* FIX 5: full-width column on mobile, compact inline row on ≥sm.
       No API, validation, or state-machine changes. */
    <div className="flex w-full flex-col items-stretch justify-end gap-1.5 sm:w-auto sm:flex-row sm:items-center">
      <input
        value={hash}
        onChange={e => setHash(e.target.value)}
        placeholder="0x… transaction hash"
        className="pse-input w-full py-1.5 pse-mono sm:w-56"
        style={{ fontSize: 11 }}
        aria-label="Payout transaction hash"
      />
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => { if (/^0x[0-9a-fA-F]{64}$/.test(hash.trim())) { onApprove(hash.trim()); setOpen(false); } else toast.error('Enter the full 66-character transaction hash.'); }}
          disabled={busy}
          className="pse-btn pse-btn-primary pse-btn-sm"
        >
          Approve payout
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="pse-btn pse-btn-ghost pse-btn-sm">Cancel</button>
      </div>
    </div>
  );
}

export { AdminPSEMine };
export default AdminPSEMine;
