import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, Play, Pause, RefreshCcw, ExternalLink, Loader2,
  CheckCircle2, Ban, Wrench,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import toast from 'react-hot-toast';
import {
  gbp, gbpHour, shortHash, shortAddr, fmtDateTime,
  PSEEmpty, PSELoading, Stamp, StatementHeader, Verdict, RailBand, DutyRail,
  Ledger, LedgerRow, Attn,
  campaignStatusView, payoutStatusView, usePseDocumentTitle,
} from '../../components/psemine/pse';
import { ConfirmDialog } from '../../components/psemine/ConfirmDialog';

/* Admin surfaces use the pse tokens too, but scoped to a wrapper so the rest
 * of OpsLayout (PulseEarn admin chrome) stays untouched.
 *
 * Composition follows the same law as the miner console — VERDICT → RAILS →
 * LEDGERS → NOTES — because this screen answers operational questions about the
 * same instruments: what the campaign is worth, what is broken, what is owed.
 * Three bordered surfaces: campaign control, payment recovery, payout review. */
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
      setLoadedAt(Date.now());
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

  if (loading) return <div className="pse-scope"><PSELoading label="Loading PSEmine operations" /></div>;

  // The campaign state is whatever the backend reported. If neither the console
  // context nor the overview endpoint has it, this screen says so rather than
  // defaulting to "Scheduled" — an operator must never read a state we invented.
  const camp = (campaign?.status || (typeof stats.campaignStatus === 'string' ? stats.campaignStatus : '')) || '';
  const campaignView = camp ? campaignStatusView(camp) : null;
  const num = (k: string): number => typeof stats[k] === 'number' ? stats[k] as number : 0;
  const toolCount = num('toolsSold');

  return (
    <div className="pse-scope min-h-screen">
      <div className="pse-gut pse-stack" style={{ maxWidth: 'var(--pse-measure)', marginInline: 'auto', paddingTop: 26, paddingBottom: 72 }}>
        <StatementHeader
          routeKey="Operations · PSEmine"
          title="PSEmine operations"
          objective="Live campaign state and the two exception queues that require a human decision. Every figure here is read from the canonical PSEmine backend — nothing on this screen is computed in the browser."
          status={<Stamp tone="fail">Super admin</Stamp>}
          asOf={loadedAt ? fmtDateTime(loadedAt) : undefined}
          actions={
            <button onClick={() => void load(true)} disabled={refreshing} className="pse-btn pse-btn-2 pse-btn-sm">
              <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
          }
        />

        {error && (
          <Attn
            tone="fail"
            title="Operations data unavailable"
            body={error}
            action={<button onClick={() => void load(true)} className="pse-btn pse-btn-2 pse-btn-sm">Retry</button>}
          />
        )}

        {/* ══ VERDICT — the network's exposure, on the canvas ══
            The number ops actually owns: GBP already accrued across every
            operating tool. Secondary facts sit beside it, never above it. */}
        <Verdict
          label="Accrued liability · network"
          value={gbp(num('totalAccruedLiabilityGBP'))}
          status={campaignView
            ? <Stamp tone={campaignView.tone} pulse={campaignView.live} glyph="●">{campaignView.label}</Stamp>
            : <Stamp tone="idle">State unavailable</Stamp>}
          note={campaignView?.detail ?? 'The backend has not reported a campaign state yet. No state is assumed in the browser.'}
          side={
            <div className="pse-verdict-facts">
              <div>
                <p className="pse-np">Active miners</p>
                <p className="pse-fact-v pse-n">
                  {num('activeMiners')}{num('totalMiners') ? ` / ${num('totalMiners')}` : ''}
                </p>
              </div>
              <div>
                <p className="pse-np">Tools deployed</p>
                <p className="pse-fact-v pse-n">{toolCount}</p>
              </div>
              <div>
                <p className="pse-np">Network capacity</p>
                <p className="pse-fact-v pse-n">{gbpHour(num('totalCapacityGBPPerHour'))}</p>
              </div>
            </div>
          }
        />

        {/* ══ RAIL — the one canonical campaign clock ══
            Ops decides on the campaign's position, so it reads the same duty
            rail the miner console and the landing read — never a second
            rendering of the same 90 days. */}
        <RailBand
          label="Campaign duty"
          meta={campaign
            ? `${campaign.name || 'Active campaign'} · ${campaign.durationDays || 90}-day campaign`
            : 'Campaign configuration is not loaded'}
          legend={[{ kind: 'jade', text: 'Elapsed' }, { kind: 'ghost', text: 'Remaining' }]}
        >
          {campaign
            ? <DutyRail campaign={campaign} status={campaign.status} />
            : <p className="pse-meta pse-measure">The campaign configuration has not loaded, so the duty rail is not drawn — position is never estimated in the browser.</p>}
        </RailBand>

        {/* ══ LEDGER 1 — campaign control ══ */}
        <Ledger
          title="Campaign control"
          meta="psemine_campaigns/active_campaign · consequential actions are confirmed, then recorded in the audit trail"
          legend={['Control', 'State']}
          foot={
            <div className="flex flex-wrap items-center gap-2">
              {campaign?.status === 'paused' ? (
                <button onClick={() => void campaignAction('resume')} disabled={actionBusy !== null}
                  className="pse-btn pse-btn-sm">
                  {actionBusy === 'resume' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Resume
                </button>
              ) : (
                <button onClick={() => void campaignAction('pause')} disabled={actionBusy !== null || campaign?.status !== 'active'}
                  className="pse-btn pse-btn-2 pse-btn-sm">
                  {actionBusy === 'pause' ? <Loader2 size={13} className="animate-spin" /> : <Pause size={13} />} Pause
                </button>
              )}
              <button onClick={() => void campaignAction('settle')} disabled={actionBusy !== null}
                className="pse-btn pse-btn-2 pse-btn-sm">
                {actionBusy === 'settle' ? <Loader2 size={13} className="animate-spin" /> : <Wrench size={13} />} Begin settlement
              </button>
              <button onClick={() => void campaignAction('shutdown')} disabled={actionBusy !== null}
                className="pse-btn pse-btn-danger pse-btn-sm">
                {actionBusy === 'shutdown' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Shutdown &amp; archive
              </button>
            </div>
          }
        >
          <LedgerRow
            title="Payment recovery queue"
            sub="Verification failures awaiting a human decision"
            value={<span className="pse-n">{recoveryCases.length}</span>}
          />
          <LedgerRow
            title="Payout review queue"
            sub="Requests pending review or in processing"
            value={<span className="pse-n">{withdrawalQueue.length}</span>}
          />
        </Ledger>

        {/* ══ LEDGER 2 — payment recovery ══ */}
        <Ledger
          title="Payment recovery"
          meta="Evidence records for verification failures — review before resolving. No automatic assignment."
          legend={['Recovery case', 'On-chain transaction']}
        >
          {recoveryCases.length === 0 ? (
            <PSEEmpty icon={CheckCircle2} title="No open recovery cases" body="Verification failures appear here with full evidence for review." />
          ) : recoveryCases.map(c => {
            const id = String(c.id || c.recoveryId || '');
            const hash = (c.txHash || c.transactionHash) as string | undefined;
            return (
              <LedgerRow
                key={id}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {String(c.reason || 'unknown').replace(/_/g, ' ')}
                    <Stamp tone="attn">Recovery</Stamp>
                  </span>
                }
                sub={
                  <>
                    <span className="pse-mono">{shortHash(id, 8)}</span>
                    {' · '}{fmtDateTime(c.createdAt as string)}
                  </>
                }
                value={
                  hash
                    ? <a href={`https://bscscan.com/tx/${hash}`} target="_blank" rel="noreferrer"
                        className="pse-mono inline-flex items-center gap-1">{shortHash(hash)} <ExternalLink size={10} /></a>
                    : '—'
                }
              >
                {/* FIX 4: contract-accurate actions (backend: mark_reviewed |
                    attach_to_purchase | reject — none activate a tool).
                    Consequential ones go through the design-system dialog. */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setConfirm({
                      title: 'Complete purchase from recovery evidence?',
                      consequence: 'This re-runs purchase verification against the recorded on-chain transaction. A tool is activated ONLY if the backend verification passes — it can never be created from the browser. The outcome is recorded in the audit log.',
                      affected: `psemine_payment_recovery/${id}`,
                      confirmLabel: 'Re-verify & attempt purchase',
                      run: async () => { await resolveRecovery(id, 'attach_to_purchase', 'Resolved from operations console — re-verified purchase linkage.'); },
                    })}
                    disabled={resolving !== null} className="pse-btn pse-btn-sm">Complete purchase</button>
                  <button
                    onClick={() => setConfirm({
                      title: 'Dismiss this recovery case?',
                      consequence: 'The case is marked rejected and closed without linking the transaction. Evidence is retained in psemine_payment_recovery. Recorded in the audit log.',
                      affected: `psemine_payment_recovery/${id}`,
                      confirmLabel: 'Dismiss case',
                      danger: true,
                      run: async () => { await resolveRecovery(id, 'reject', 'Dismissed after review.'); },
                    })}
                    disabled={resolving !== null} className="pse-btn pse-btn-3 pse-btn-sm">Dismiss</button>
                </div>
              </LedgerRow>
            );
          })}
        </Ledger>

        {/* ══ LEDGER 3 — payout review ══ */}
        <Ledger
          title="Payout review"
          meta="Requests awaiting review or processing. Completion requires the on-chain transaction hash; duplicate hashes are rejected server-side."
          legend={['Payout request', 'Amount']}
        >
          {withdrawalQueue.length === 0 ? (
            <PSEEmpty icon={ShieldAlert} title="No payouts awaiting review" body="Withdrawal requests appear here once miners submit them at settlement." />
          ) : withdrawalQueue.map(w => {
            const id = String(w.id || '');
            const status = String(w.status || 'pending');
            const view = payoutStatusView(status);
            const amountMinor = typeof w.amountMinor === 'number' ? w.amountMinor
              : typeof w.amountGBP === 'number' ? Math.round(w.amountGBP * 100) : null;
            const dest = (w.destinationWallet || w.payoutWallet) as string | undefined;
            const busy = resolving === id + 'APPROVE' || resolving === id + 'REJECT';
            const reviewable = status === 'pending' || status === 'under_review';
            return (
              <LedgerRow
                key={id}
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="pse-mono">Payout {shortHash(id, 6)}</span>
                    <Stamp tone={view.tone}>{view.label}</Stamp>
                  </span>
                }
                sub={
                  <>
                    Requested {fmtDateTime(w.createdAt as string)}
                    {' · to '}<span className="pse-mono">{dest ? shortAddr(dest) : '—'}</span>
                    {' · '}<span className="pse-mono">{shortAddr(String(w.userId || w.uid || ''))}</span>
                  </>
                }
                value={amountMinor !== null ? gbp(amountMinor / 100) : '—'}
              >
                {reviewable && (
                  /* FIX 5: actions wrap vertically within the cell on mobile */
                  <div className="mt-2 flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
                    {/* D3: approve IS the completion — backend atomically
                        reserves the tx hash and marks the payout paid. */}
                    <ApprovePayoutButton busy={busy} onApprove={(hash) => void reviewWithdrawal(id, 'APPROVE', hash)} />
                    <button onClick={() => { void reviewWithdrawal(id, 'REJECT'); }}
                      disabled={busy} className="pse-btn pse-btn-danger pse-btn-sm">Reject</button>
                  </div>
                )}
              </LedgerRow>
            );
          })}
        </Ledger>

        {/* ══ NOTES — unframed ══ */}
        <p className="pse-meta pse-measure flex items-start gap-2">
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
      <button onClick={() => setOpen(true)} disabled={busy} className="pse-btn pse-btn-sm">
        Approve with tx hash…
      </button>
    );
  }
  return (
    /* FIX 5: full-width column on mobile, compact inline row on ≥sm.
       No API, validation, or state-machine changes. */
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:flex-row sm:items-center">
      <input
        value={hash}
        onChange={e => setHash(e.target.value)}
        placeholder="0x… transaction hash"
        className="pse-input pse-mono w-full sm:w-56"
        style={{ fontSize: 11, minHeight: 34, padding: '7px 11px' }}
        aria-label="Payout transaction hash"
      />
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => { if (/^0x[0-9a-fA-F]{64}$/.test(hash.trim())) { onApprove(hash.trim()); setOpen(false); } else toast.error('Enter the full 66-character transaction hash.'); }}
          disabled={busy}
          className="pse-btn pse-btn-sm"
        >
          Approve payout
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="pse-btn pse-btn-3 pse-btn-sm">Cancel</button>
      </div>
    </div>
  );
}

export { AdminPSEMine };
export default AdminPSEMine;
