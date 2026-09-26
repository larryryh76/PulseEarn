import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import toast from 'react-hot-toast';
import {
  gbp, gbpHour, shortHash, shortAddr, fmtDateTime,
  campaignStatusView, payoutStatusView, usePseDocumentTitle,
} from '../../components/psemine/pse';
import { ConfirmDialog } from '../../components/psemine/ConfirmDialog';

const AdminPSEMine: React.FC = () => {
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
      setLoadedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load PSEmine operations data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => { void load(); }, [load]);

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

  const reviewWithdrawal = async (withdrawalId: string, action: 'APPROVE' | 'REJECT', txHash?: string) => {
    if (action === 'APPROVE' && !txHash) { toast.error('A transaction hash is required to approve a payout.'); return; }
    if (action === 'REJECT') {
      setConfirm({
        title: 'Reject this payout?',
        consequence: 'The debit is reversed exactly once and the request returns to the miner’s available balance. The decision is recorded in the audit log.',
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

  if (loading) return <main><p role="status">Loading PSEmine operations</p></main>;

  const camp = (campaign?.status || (typeof stats.campaignStatus === 'string' ? stats.campaignStatus : '')) || '';
  const campaignView = camp ? campaignStatusView(camp) : null;
  const num = (k: string): number => typeof stats[k] === 'number' ? stats[k] as number : 0;
  const toolCount = num('toolsSold');

  return (
    <main>
      <header>
        <p>Operations · PSEmine</p>
        <h1>PSEmine operations</h1>
        <p>Live campaign state and the two exception queues that require a human decision. Every figure here is read from the canonical PSEmine backend — nothing on this screen is computed in the browser.</p>
        <p>Super admin</p>
        {loadedAt && <p>Data as of {fmtDateTime(loadedAt)}</p>}
        <button type="button" onClick={() => void load(true)} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {error && (
        <section role="alert" aria-labelledby="operations-error-title">
          <h2 id="operations-error-title">Operations data unavailable</h2>
          <p>{error}</p>
          <button type="button" onClick={() => void load(true)}>Retry</button>
        </section>
      )}

      <section aria-labelledby="liability-title">
        <h2 id="liability-title">Accrued liability · network</h2>
        <p>{gbp(num('totalAccruedLiabilityGBP'))}</p>
        <p>Status: {campaignView ? campaignView.label : 'State unavailable'}</p>
        <p>{campaignView?.detail ?? 'The backend has not reported a campaign state yet. No state is assumed in the browser.'}</p>
        <dl>
          <div>
            <dt>Active miners</dt>
            <dd>{num('activeMiners')}{num('totalMiners') ? ` / ${num('totalMiners')}` : ''}</dd>
          </div>
          <div>
            <dt>Tools deployed</dt>
            <dd>{toolCount}</dd>
          </div>
          <div>
            <dt>Network capacity</dt>
            <dd>{gbpHour(num('totalCapacityGBPPerHour'))}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="campaign-duty-title">
        <h2 id="campaign-duty-title">Campaign duty</h2>
        <p>{campaign
          ? `${campaign.name || 'Active campaign'} · ${campaign.durationDays || 90}-day campaign`
          : 'Campaign configuration is not loaded'}</p>
        {campaign
          ? <p>Campaign status: {campaign.status}</p>
          : <p>The campaign configuration has not loaded, so campaign timing is not estimated in the browser.</p>}
      </section>

      <section aria-labelledby="campaign-control-title">
        <h2 id="campaign-control-title">Campaign control</h2>
        <p>psemine_campaigns/active_campaign · consequential actions are confirmed, then recorded in the audit trail</p>
        <div>
          {campaign?.status === 'paused' ? (
            <button type="button" onClick={() => void campaignAction('resume')} disabled={actionBusy !== null}>
              {actionBusy === 'resume' ? 'Working…' : 'Resume'}
            </button>
          ) : (
            <button type="button" onClick={() => void campaignAction('pause')} disabled={actionBusy !== null || campaign?.status !== 'active'}>
              {actionBusy === 'pause' ? 'Working…' : 'Pause'}
            </button>
          )}
          <button type="button" onClick={() => void campaignAction('settle')} disabled={actionBusy !== null}>
            {actionBusy === 'settle' ? 'Working…' : 'Begin settlement'}
          </button>
          <button type="button" onClick={() => void campaignAction('shutdown')} disabled={actionBusy !== null}>
            {actionBusy === 'shutdown' ? 'Working…' : 'Shutdown & archive'}
          </button>
        </div>
        <dl>
          <div>
            <dt>Payment recovery queue</dt>
            <dd>Verification failures awaiting a human decision: {recoveryCases.length}</dd>
          </div>
          <div>
            <dt>Payout review queue</dt>
            <dd>Requests pending review or in processing: {withdrawalQueue.length}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="payment-recovery-title">
        <h2 id="payment-recovery-title">Payment recovery</h2>
        <p>Evidence records for verification failures — review before resolving. No automatic assignment.</p>
        {recoveryCases.length === 0 ? (
          <p>No open recovery cases. Verification failures appear here with full evidence for review.</p>
        ) : (
          <ul>
            {recoveryCases.map(c => {
              const id = String(c.id || c.recoveryId || '');
              const hash = (c.txHash || c.transactionHash) as string | undefined;
              return (
                <li key={id}>
                  <h3>{String(c.reason || 'unknown').replace(/_/g, ' ')} — Recovery</h3>
                  <p>{shortHash(id, 8)} · {fmtDateTime(c.createdAt as string)}</p>
                  <p>On-chain transaction: {hash
                    ? <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer">{shortHash(hash)}</a>
                    : '—'}</p>
                  <button
                    type="button"
                    onClick={() => setConfirm({
                      title: 'Complete purchase from recovery evidence?',
                      consequence: 'This re-runs purchase verification against the recorded on-chain transaction. A tool is activated ONLY if the backend verification passes — it can never be created from the browser. The outcome is recorded in the audit log.',
                      affected: `psemine_payment_recovery/${id}`,
                      confirmLabel: 'Re-verify & attempt purchase',
                      run: async () => { await resolveRecovery(id, 'attach_to_purchase', 'Resolved from operations console — re-verified purchase linkage.'); },
                    })}
                    disabled={resolving !== null}
                  >Complete purchase</button>
                  <button
                    type="button"
                    onClick={() => setConfirm({
                      title: 'Dismiss this recovery case?',
                      consequence: 'The case is marked rejected and closed without linking the transaction. Evidence is retained in psemine_payment_recovery. Recorded in the audit log.',
                      affected: `psemine_payment_recovery/${id}`,
                      confirmLabel: 'Dismiss case',
                      danger: true,
                      run: async () => { await resolveRecovery(id, 'reject', 'Dismissed after review.'); },
                    })}
                    disabled={resolving !== null}
                  >Dismiss</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="payout-review-title">
        <h2 id="payout-review-title">Payout review</h2>
        <p>Requests awaiting review or processing. Completion requires the on-chain transaction hash; duplicate hashes are rejected server-side.</p>
        {withdrawalQueue.length === 0 ? (
          <p>No payouts awaiting review. Withdrawal requests appear here once miners submit them at settlement.</p>
        ) : (
          <ul>
            {withdrawalQueue.map(w => {
              const id = String(w.id || '');
              const status = String(w.status || 'pending');
              const view = payoutStatusView(status);
              const amountMinor = typeof w.amountMinor === 'number' ? w.amountMinor
                : typeof w.amountGBP === 'number' ? Math.round(w.amountGBP * 100) : null;
              const dest = (w.destinationWallet || w.payoutWallet) as string | undefined;
              const busy = resolving === id + 'APPROVE' || resolving === id + 'REJECT';
              const reviewable = status === 'pending' || status === 'under_review';
              return (
                <li key={id}>
                  <h3>Payout {shortHash(id, 6)} — {view.label}</h3>
                  <p>
                    Requested {fmtDateTime(w.createdAt as string)}
                    {' · to '}{dest ? shortAddr(dest) : '—'}
                    {' · '}{shortAddr(String(w.userId || w.uid || ''))}
                  </p>
                  <p>Amount: {amountMinor !== null ? gbp(amountMinor / 100) : '—'}</p>
                  {reviewable && (
                    <div>
                      <ApprovePayoutButton busy={busy} onApprove={(hash) => void reviewWithdrawal(id, 'APPROVE', hash)} />
                      <button type="button" onClick={() => { void reviewWithdrawal(id, 'REJECT'); }} disabled={busy}>Reject</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p>
        All actions are recorded in the admin audit trail. Payout completion validates the transaction hash atomically — a hash already attached to a completed payout is rejected (DUPLICATE_PAYOUT_TX).
      </p>

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
    </main>
  );
};

function ApprovePayoutButton({ busy, onApprove }: { busy: boolean; onApprove: (hash: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState('');

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} disabled={busy}>
        Approve with tx hash…
      </button>
    );
  }
  return (
    <form onSubmit={event => {
      event.preventDefault();
      if (/^0x[0-9a-fA-F]{64}$/.test(hash.trim())) { onApprove(hash.trim()); setOpen(false); }
      else toast.error('Enter the full 66-character transaction hash.');
    }}>
      <label>
        Payout transaction hash
        <input
          value={hash}
          onChange={e => setHash(e.target.value)}
          placeholder="0x… transaction hash"
          aria-label="Payout transaction hash"
        />
      </label>
      <button type="submit" disabled={busy}>Approve payout</button>
      <button type="button" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
    </form>
  );
}

export { AdminPSEMine };
export default AdminPSEMine;
