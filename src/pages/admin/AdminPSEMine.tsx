import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePseDocumentTitle } from '../../components/psemine/pseCore';
import { LOCKED_PSEMINE_TOOLS } from '../../types/psemine';
import toast from 'react-hot-toast';

type Row = Record<string, any>;
type ApiState = 'loading' | 'ready' | 'partial' | 'error';

const money = (value: unknown, currency = 'GBP') => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try { return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n); }
  catch { return String(n); }
};
const formatLockedBnb = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'No locked BNB quote';
  const amountBnb = Number(value);
  return Number.isFinite(amountBnb) ? amountBnb.toFixed(8) + ' BNB' : 'No locked BNB quote';
};
const dateText = (value: unknown) => {
  if (!value) return '—';
  const d = new Date(value as any);
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' }).format(d) + ' UK' : String(value);
};
const short = (value: unknown, n = 10) => {
  const s = String(value || '');
  return s.length > n * 2 ? s.slice(0, n) + '…' + s.slice(-n) : s || '—';
};
const statusTone = (value: unknown) => {
  const s = String(value || '').toLowerCase();
  if (['active', 'confirmed', 'paid', 'completed', 'ready', 'approved'].includes(s)) return 'good';
  if (['failed', 'rejected', 'error', 'expired', 'archived'].includes(s)) return 'bad';
  if (['pending', 'paused', 'scheduled', 'under_review', 'processing', 'settling'].includes(s)) return 'warn';
  return 'neutral';
};
const londonIso = (date: string, time: string) => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = time.split(':').map(Number);
  const target = Date.UTC(y, m - 1, d, h, min);
  let candidate = target;
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(fmt.formatToParts(new Date(candidate)).map(x => [x.type, x.value]));
    const represented = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    const correction = target - represented;
    candidate += correction;
    if (!correction) break;
  }
  return new Date(candidate).toISOString();
};

const Panel: React.FC<{ id?: string; title: string; detail?: string; right?: React.ReactNode; children: React.ReactNode }> = ({ id, title, detail, right, children }) => (
  <section id={id} className="rounded-2xl border border-white/10 bg-[#0c1220] p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,.18)]">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-white">{title}</h2>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}</div>
      {right}
    </div>
    {children}
  </section>
);
const Pill: React.FC<{ value: unknown }> = ({ value }) => {
  const tone = statusTone(value);
  const colors: Record<string, string> = { good: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200', bad: 'border-rose-400/20 bg-rose-400/10 text-rose-200', warn: 'border-amber-400/20 bg-amber-400/10 text-amber-200', neutral: 'border-white/10 bg-white/5 text-slate-300' };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${colors[tone]}`}>{String(value || 'Not reported').replace(/_/g, ' ')}</span>;
};
const Stat: React.FC<{ label: string; value: React.ReactNode; note?: string; emphasis?: boolean }> = ({ label, value, note, emphasis }) => (
  <div className={`rounded-xl border p-4 ${emphasis ? 'border-cyan-400/20 bg-cyan-400/[.06]' : 'border-white/10 bg-white/[.025]'}`}>
    <div className="text-xs text-slate-400">{label}</div><div className="mt-2 break-words text-2xl font-semibold tracking-tight text-white">{value}</div>{note && <div className="mt-1 text-[11px] text-slate-500">{note}</div>}
  </div>
);
const Empty: React.FC<{ text: string }> = ({ text }) => <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">{text}</div>;
const Table: React.FC<{ columns: string[]; rows: Row[]; render: (row: Row, index: number) => React.ReactNode; empty: string }> = ({ columns, rows, render, empty }) => (
  rows.length ? <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-white/[.04] text-slate-400"><tr>{columns.map(c => <th key={c} className="px-3 py-3 font-medium">{c}</th>)}</tr></thead><tbody className="divide-y divide-white/[.07]">{rows.map((r, i) => <React.Fragment key={String(r.id || r.orderId || r.withdrawalId || i)}>{render(r, i)}</React.Fragment>)}</tbody></table></div> : <Empty text={empty} />
);

export const AdminPSEMine: React.FC = () => {
  usePseDocumentTitle('PSEmine Operations');
  const { currentUser, userData } = useAuth();
  const { campaign, refreshData: refreshCampaign } = usePSEMine();
  const role = String(userData?.role || '').trim().toLowerCase().replace(/-/g, '_');
  const [busy, setBusy] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [loadState, setLoadState] = useState<ApiState>('loading');
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [stats, setStats] = useState<Row>({});
  const [mineStats, setMineStats] = useState<Row>({});
  const [config, setConfig] = useState<Row | null>(null);
  // Permissions are read from the authenticated admin API, not inferred from a
  // potentially stale client-side profile snapshot.
  const canConfigureReceiverWallet = config?.canConfigureReceiverWallet === true;
  const isAdmin = config?.canManageCampaign === true;
  const [orders, setOrders] = useState<Row[]>([]);
  const [payments, setPayments] = useState<Row[]>([]);
  const [recovery, setRecovery] = useState<Row[]>([]);
  const [withdrawals, setWithdrawals] = useState<Row[]>([]);
  const [audit, setAudit] = useState<Row[]>([]);
  const [walletInput, setWalletInput] = useState('');
  const [walletAck, setWalletAck] = useState(false);
  const [walletPhrase, setWalletPhrase] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [orderQuery, setOrderQuery] = useState('');
  const [actionReason, setActionReason] = useState('Admin console action');

  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!currentUser) throw new Error('Admin session unavailable. Sign in again.');
    const token = await currentUser.getIdToken();
    const response = await fetch(path, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || data.error || `Request failed (${response.status})`);
      (error as any).status = response.status;
      throw error;
    }
    return data;
  }, [currentUser]);

  const load = useCallback(async (quiet = false) => {
    if (!currentUser) return;
    if (!quiet) setLoadState('loading');
    setLoadErrors([]);
    const jobs = [
      ['campaign metrics', '/api/admin/mine/overview', (d: Row) => setStats(d.stats || {})],
      ['payment configuration and tool metrics', '/api/admin/psemine/overview', (d: Row) => { setMineStats(d.stats || {}); setConfig(d.campaign || null); }],
      ['purchase orders', '/api/admin/psemine/orders', (d: Row) => setOrders(Array.isArray(d.orders) ? d.orders : [])],
      ['verified payments', '/api/admin/psemine/payments', (d: Row) => setPayments(Array.isArray(d.payments) ? d.payments : [])],
      ['payment recovery cases', '/api/admin/mine/payment-recovery?status=open', (d: Row) => setRecovery(Array.isArray(d.cases) ? d.cases : [])],
      ['payout queue', '/api/admin/psemine/withdrawals', (d: Row) => setWithdrawals(Array.isArray(d.withdrawals) ? d.withdrawals : [])],
      ['audit history', '/api/admin/mine/audit', (d: Row) => setAudit(Array.isArray(d.records) ? d.records : [])],
    ] as const;
    const failures: string[] = [];
    await Promise.all(jobs.map(async ([label, path, apply]) => {
      try { const data = await request(path); apply(data); }
      catch (e) { failures.push(`${label}: ${e instanceof Error ? e.message : 'unavailable'}`); }
    }));
    setLoadErrors(failures);
    setLoadState(failures.length === jobs.length ? 'error' : failures.length ? 'partial' : 'ready');
    setLoadedAt(Date.now());
  }, [currentUser, request]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setWalletInput(String(config?.receiverWalletAddress || '')); }, [config?.receiverWalletAddress]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    if (!q) return orders;
    const verifiedOrderIds = new Set(payments.map(payment => String(payment.orderId || '')).filter(Boolean));
    return orders.filter(order => {
      const status = String(order.status || '').toLowerCase();
      // A legacy order marked "paid" is not payment evidence. It is shown as
      // paid only when the independent BSC receipt ledger contains its order ID.
      if (['paid', 'confirmed', 'completed', 'verified', 'success'].includes(status)
          && !verifiedOrderIds.has(String(order.id || order.orderId || ''))) return false;
      return [order.id, order.orderId, order.userId, order.toolId, order.toolName, order.status, order.txHash, order.transactionHash]
        .some(value => String(value || '').toLowerCase().includes(q));
    });
  }, [orders, orderQuery, payments]);

  const runCampaignAction = async (action: string) => {
    if (!isAdmin) { toast.error('Your account does not have PSEmine admin permissions.'); return; }
    let startAt: string | undefined;
    if (action === 'schedule') {
      if (!scheduleDate || !scheduleTime) { toast.error('Choose a future campaign start date and time.'); return; }
      try { startAt = londonIso(scheduleDate, scheduleTime); } catch { toast.error('Invalid UK date/time.'); return; }
      if (new Date(startAt).getTime() <= Date.now()) { toast.error('The selected UK start time must be in the future.'); return; }
    }
    const phrase = action === 'shutdown' ? 'ARCHIVE' : action === 'settle' ? 'SETTLE' : action.toUpperCase();
    if (window.prompt(`Type ${phrase} to confirm this campaign action. This action is recorded.`) !== phrase) return;
    setBusy(true);
    try {
      await request('/api/admin/mine/campaign/action', { method: 'POST', body: JSON.stringify({ action, reason: actionReason, ...(startAt ? { startAt } : {}) }) });
      toast.success(`Campaign ${action} request completed.`);
      await refreshCampaign();
      await load(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Campaign action failed.'); }
    finally { setBusy(false); }
  };

  const saveWallet = async () => {
    if (!canConfigureReceiverWallet) { toast.error('Your account needs platform admin permission to configure the campaign receiver.'); return; }
    const address = walletInput.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address) || /^0x0{40}$/i.test(address)) { toast.error('Enter a valid, non-zero BNB Smart Chain address.'); return; }
    if (!walletAck) { toast.error('Confirm that you verified the receiving wallet and network.'); return; }
    if (walletPhrase !== 'CONFIRM RECEIVER') { toast.error('Type CONFIRM RECEIVER to save the payment destination.'); return; }
    setBusy(true);
    try {
      await request('/api/admin/mine/campaign/action', { method: 'POST', body: JSON.stringify({ action: 'set_receiver_wallet', receiverWalletAddress: address, reason: 'PSEmine operations configuration' }) });
      toast.success('Campaign receiving wallet saved. New purchase quotes can now be issued.');
      setWalletAck(false); setWalletPhrase('');
      await load(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Wallet configuration failed.'); }
    finally { setBusy(false); }
  };

  const resolveCase = async (id: string, action: 'mark_reviewed' | 'reject' | 'attach_to_purchase', purchaseId?: string) => {
    const notes = window.prompt('Add an audit note explaining this decision:');
    if (!notes?.trim()) return;
    setBusy(true);
    try {
      await request(`/api/admin/mine/payment-recovery/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: JSON.stringify({ action, notes, ...(purchaseId ? { purchaseId } : {}) }) });
      toast.success('Recovery case updated.');
      await load(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Recovery action failed.'); }
    finally { setBusy(false); }
  };

  const attachRecovery = async (row: Row) => {
    const purchaseId = typeof row.purchaseId === 'string' ? row.purchaseId : undefined;
    if (!purchaseId) { toast.error('This recovery case has no canonical purchase ID; it cannot be attached safely.'); return; }
    await resolveCase(String(row.id || row.recoveryId), 'attach_to_purchase', purchaseId);
  };

  const reviewPayout = async (id: string, action: 'APPROVE' | 'REJECT') => {
    let txHash: string | undefined;
    if (action === 'APPROVE') {
      txHash = window.prompt('Enter the BNB Smart Chain transaction hash for this payout:') || undefined;
      if (!txHash) return;
    } else if (!window.confirm('Reject this payout and reverse its reserved debit?')) return;
    setBusy(true);
    try {
      await request(`/api/admin/psemine/withdrawals/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify(action === 'APPROVE' ? { action, txHash } : { action }) });
      toast.success(action === 'APPROVE' ? 'Payout review submitted.' : 'Payout rejected.');
      await load(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Payout review failed.'); }
    finally { setBusy(false); }
  };

  const deprecateTool = async (toolId: string) => {
    const reason = window.prompt(`Reason for deprecating ${toolId}:`);
    if (!reason?.trim()) return;
    setBusy(true);
    try {
      await request(`/api/admin/mine/tools/${encodeURIComponent(toolId)}/deprecate`, { method: 'POST', body: JSON.stringify({ reason }) });
      toast.success('Tool deprecation recorded.');
      await load(true);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Tool update failed.'); }
    finally { setBusy(false); }
  };

  const campaignStatus = campaign?.status || stats.campaignStatus || 'Not reported';
  const income = mineStats.totalToolIncomeGbp;
  const incomeReady = mineStats.toolIncomeComplete !== false && income !== null && income !== undefined && income !== '' && Number.isFinite(Number(income));
  const tools = Object.values(LOCKED_PSEMINE_TOOLS as Record<string, any>).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)) as Row[];
  const fmtStat = (v: unknown) => v === null || v === undefined || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString('en-GB') : String(v);

  return (
    <main className="min-h-screen bg-[#070b14] px-3 py-5 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="overflow-hidden rounded-3xl border border-cyan-400/15 bg-[radial-gradient(ellipse_at_top_left,rgba(36,115,190,.22),transparent_55%),linear-gradient(135deg,#101a2c,#090e19_70%)] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><div className="text-[10px] font-bold tracking-[.24em] text-cyan-300">PULSE EARN / PSEMINE</div><h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Operations command centre</h1><p className="mt-2 max-w-3xl text-sm text-slate-400">Campaign controls, receiving wallet, tool capacity, verified purchases, payment recovery, payouts and audit history — all visible on one page.</p></div>
            <div className="flex items-center gap-3"><div className="text-right"><Pill value={loadState === 'ready' ? 'Connected' : loadState === 'partial' ? 'Partial data' : loadState === 'error' ? 'Unavailable' : 'Loading'} /><div className="mt-1 text-[10px] text-slate-500">{loadedAt ? `Updated ${dateText(loadedAt)}` : 'Waiting for first sync'}</div></div><button onClick={() => void load()} disabled={busy || loadState === 'loading'} className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50">Refresh data</button></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs"><Pill value={campaignStatus} /><span className="text-slate-500">Campaign timezone: Europe/London</span><span className="text-slate-500">·</span><span className="text-slate-500">Signed-in role: {role || 'not reported'}</span></div>
        </header>

        {loadErrors.length > 0 && <div className="rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-4"><div className="font-medium text-amber-200">Some operational data could not be loaded</div><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/80">{loadErrors.map(x => <li key={x}>{x}</li>)}</ul><p className="mt-2 text-xs text-slate-400">Unavailable data is not treated as zero. The error for each register is shown above.</p></div>}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Stat label="Total tool income" value={incomeReady ? money(income) : 'Unavailable'} note={incomeReady ? "Real on-chain confirmed tool payments only" : "Reconciliation incomplete — total withheld"} emphasis />
          <Stat label="Confirmed tool payments" value={fmtStat(mineStats.totalConfirmedPayments ?? stats.totalConfirmedPayments)} note="Successful on-chain verification" />
          <Stat label="Active tool ownerships" value={fmtStat(mineStats.activeToolOwnerships ?? stats.activeToolOwnerships)} />
          <Stat label="Active mining sessions" value={fmtStat(mineStats.activeMiningSessions ?? stats.activeMiningSessions)} />
          <Stat label="Accrued liability" value={money(stats.totalAccruedLiabilityGBP)} note="Recorded eligible earnings" />
        </section>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Active miners" value={fmtStat(stats.activeMiners)} />
          <Stat label="Registered miners" value={fmtStat(stats.totalMiners)} />
          <Stat label="Open recovery cases" value={fmtStat(stats.openRecoveryCases ?? recovery.length)} />
          <Stat label="Payout requests" value={fmtStat(withdrawals.length)} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,.7fr)]">
          <Panel id="ops-campaign" title="Campaign configuration" detail="The actual campaign document and purchase readiness returned by the backend.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-slate-500">Campaign status</div><div className="mt-1 text-lg font-semibold text-white">{String(campaignStatus)}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-slate-500">Campaign duration</div><div className="mt-1 text-lg font-semibold text-white">{campaign?.durationDays ?? stats.durationDays ?? '—'} days</div></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-slate-500">Start (UK time)</div><div className="mt-1 text-sm font-medium text-white">{dateText(campaign?.startAt || stats.startAt)}</div></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="text-xs text-slate-500">End (UK time)</div><div className="mt-1 text-sm font-medium text-white">{dateText(campaign?.endAt || stats.endAt)}</div></div>
            </div>
            <details className="mt-3 rounded-xl border border-white/10 p-3"><summary className="cursor-pointer text-xs font-medium text-cyan-200">Show every backend campaign metric</summary><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(stats).map(([key, value]) => <div key={key} className="rounded-lg bg-white/[.03] p-2"><div className="break-all text-[10px] text-slate-500">{key}</div><div className="mt-1 break-all text-sm text-white">{fmtStat(value)}</div></div>)}</div></details>
          </Panel>
          <Panel id="ops-settings" title="Purchase receiving wallet" detail="Campaign receiving destination — not a user's personal payout wallet and distinct from payout destinations.">
            <div className="flex flex-wrap items-center justify-between gap-2"><Pill value={config?.purchaseReady ? 'Purchases enabled' : 'Purchases blocked'} /><span className="text-[11px] text-slate-500">Network ID: {config?.paymentChainId ?? 56}</span></div>
            <div className="mt-3 break-all rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-cyan-100">{config?.receiverWalletAddress || 'No receiving address is configured'}</div>
            <div className="mt-2 text-xs text-slate-400">{config?.receiverWalletConfigured ? `Confirmed ${dateText(config.receiverWalletConfiguredAt)}` : 'The address has not been confirmed by a admin. New tool purchase quotes are blocked.'}</div>
            {!canConfigureReceiverWallet && <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[.06] p-3 text-xs text-amber-100"><strong>Admin permission required.</strong> Your current profile role is “{role || 'not reported'}”. The backend only permits role super_admin or isRoot=true to change the campaign receiving wallet. A page redesign cannot override this security rule; the account must be granted the correct role by an authorised identity administrator.</div>}
            <label className="mt-4 block text-xs font-medium text-slate-300">BNB Smart Chain receiving address</label>
            <input value={walletInput} onChange={e => setWalletInput(e.target.value)} placeholder="0x…" disabled={!canConfigureReceiverWallet || busy} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d17] px-3 py-3 font-mono text-xs text-white outline-none focus:border-cyan-400/50 disabled:opacity-50" />
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-400"><input type="checkbox" checked={walletAck} onChange={e => setWalletAck(e.target.checked)} disabled={!canConfigureReceiverWallet || busy} className="mt-0.5 accent-cyan-400" />I have independently checked the complete address and confirmed it is the intended BNB Smart Chain receiving wallet.</label>
            <label className="mt-3 block text-xs font-medium text-slate-300">Type CONFIRM RECEIVER</label>
            <input value={walletPhrase} onChange={e => setWalletPhrase(e.target.value)} placeholder="CONFIRM RECEIVER" disabled={!canConfigureReceiverWallet || busy} className="mt-1 w-full rounded-xl border border-white/10 bg-[#080d17] px-3 py-2.5 text-sm text-white disabled:opacity-50" />
            <button onClick={() => void saveWallet()} disabled={!canConfigureReceiverWallet || busy || !walletAck || walletPhrase !== 'CONFIRM RECEIVER'} className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-[#06101c] hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Saving…' : config?.receiverWalletConfigured ? 'Save receiving wallet' : 'Confirm receiving wallet & enable purchases'}</button>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Saving is performed by the authenticated backend and audited. It applies to new purchase quotes; existing quotes keep their original destination.</p>
          </Panel>
        </div>

        <Panel id="ops-lifecycle" title="Campaign lifecycle controls" detail="Actions affect the live campaign and are written to the audit log.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-slate-400">New start date (UK)<input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080d17] px-3 py-2 text-white" /></label>
            <label className="text-xs text-slate-400">New start time (UK)<input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080d17] px-3 py-2 text-white" /></label>
            <label className="text-xs text-slate-400 sm:col-span-2">Reason / audit note<input value={actionReason} onChange={e => setActionReason(e.target.value)} className="mt-1 block w-full rounded-lg border border-white/10 bg-[#080d17] px-3 py-2 text-white" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">{(['pause', 'resume', 'schedule', 'settle', 'shutdown'] as const).map(action => <button key={action} onClick={() => void runCampaignAction(action)} disabled={busy || !isAdmin} className={`rounded-lg border px-4 py-2.5 text-xs font-semibold capitalize disabled:opacity-40 ${action === 'shutdown' || action === 'settle' ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : action === 'resume' ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100' : 'border-white/15 bg-white/5 text-slate-200'}`}>{action}</button>)}</div>
          {!isAdmin && <p className="mt-3 text-xs text-amber-200">Admin or admin role required for lifecycle actions.</p>}
        </Panel>

        <Panel id="ops-tools" title="Tool register" detail="Published locked tool prices and capacity. Economics are read-only in this console.">
          <Table columns={['Tool', 'Price', 'Hourly capacity', 'Operating rule', 'Max per user', 'Availability']} rows={tools} empty="No locked tool definitions are available." render={(tool) => <tr className="bg-transparent"><td className="px-3 py-3 font-medium text-white">{tool.name || tool.id || tool.toolId}</td><td className="px-3 py-3 text-slate-300">{money(tool.purchasePriceGBP)}</td><td className="px-3 py-3 text-slate-300">{money(tool.hourlyRateGBP) + ' / hr'}</td><td className="px-3 py-3 text-slate-300">{tool.operating?.model === 'continuous' ? 'Continuous while campaign is active' : `${tool.operating?.sessionDurationHours ?? 24}h session · ${tool.operating?.restartDelayMinutes ?? 10}m restart delay`}</td><td className="px-3 py-3 text-slate-300">{tool.maxPerUser ?? '—'}</td><td className="px-3 py-3"><span className={tool.enabled ? 'text-cyan-200' : 'text-amber-200'}>{tool.enabled ? 'Enabled' : 'Disabled'}</span><button onClick={() => void deprecateTool(String(tool.id || tool.toolId || tool.key || ''))} disabled={!isAdmin || busy} className="ml-3 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 disabled:opacity-40">Deprecate</button></td></tr>} />
        </Panel>

        <Panel id="ops-purchases" title="Purchase orders" detail="Order intents are not counted as income until an on-chain payment is verified." right={<input value={orderQuery} onChange={e => setOrderQuery(e.target.value)} placeholder="Search user, order, tx hash…" className="w-full rounded-lg border border-white/10 bg-[#080d17] px-3 py-2 text-xs text-white sm:w-64" />}>
          <Table columns={['Order', 'User', 'Tool', 'Amount', 'Status', 'Transaction']} rows={filteredOrders} empty="No order intents have been returned by the backend." render={row => <tr><td className="px-3 py-3 font-mono text-slate-300">{short(row.id || row.orderId)}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.userId)}</td><td className="px-3 py-3 text-white">{row.toolName || row.toolId || '—'}</td><td className="px-3 py-3 text-slate-300">{money(row.priceGbp ?? row.amountGbp ?? row.gbpPrice)}</td><td className="px-3 py-3"><Pill value={row.status} /></td><td className="px-3 py-3 font-mono text-slate-400">{short(row.txHash || row.transactionHash)}</td></tr>} />
        </Panel>

        <Panel id="ops-payments" title="Verified tool payments" detail="Only backend-confirmed BNB Smart Chain receipt records belong here.">
          <Table columns={['Confirmed', 'Payment', 'Order', 'User', 'GBP value', 'BNB received', 'Transaction']} rows={payments} empty="No genuine verified tool payments recorded yet." render={row => <tr><td className="px-3 py-3 text-slate-400">{dateText(row.confirmedAt)}</td><td className="px-3 py-3 font-mono text-slate-300">{short(row.id)}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.orderId)}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.userId)}</td><td className="px-3 py-3 text-white">{money(row.priceGbp ?? row.purchasePriceGbp ?? row.amountGbp)}</td><td className="px-3 py-3 text-slate-300">{row.paidBnbAmount ?? row.amountBnb ?? '—'} BNB</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.txHash || row.transactionHash)}</td></tr>} />
        </Panel>

        <Panel id="ops-recovery" title="Payment recovery" detail="Review failed or ambiguous payment evidence. Never ask a user to pay again until the existing transaction is reconciled.">
          <Table columns={['Case', 'User', 'Reason', 'Transaction', 'Created', 'Actions']} rows={recovery} empty="No open payment-recovery cases." render={row => <tr><td className="px-3 py-3 font-mono text-slate-300">{short(row.id || row.recoveryId)}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.userId)}</td><td className="px-3 py-3 text-slate-300">{String(row.reason || 'unknown').replace(/_/g, ' ')}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.txHash || row.transactionHash)}</td><td className="px-3 py-3 text-slate-400">{dateText(row.createdAt)}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-1"><button onClick={() => void resolveCase(String(row.id || row.recoveryId), 'mark_reviewed')} disabled={!isAdmin || busy} className="rounded border border-white/10 px-2 py-1 text-[10px] text-slate-300 disabled:opacity-40">Mark reviewed</button><button onClick={() => void attachRecovery(row)} disabled={!isAdmin || busy || typeof row.purchaseId !== 'string'} className="rounded border border-cyan-400/20 px-2 py-1 text-[10px] text-cyan-100 disabled:opacity-40">Attach to purchase</button><button onClick={() => void resolveCase(String(row.id || row.recoveryId), 'reject')} disabled={!isAdmin || busy} className="rounded border border-rose-400/20 px-2 py-1 text-[10px] text-rose-200 disabled:opacity-40">Reject</button></div></td></tr>} />
        </Panel>

        <Panel id="ops-payouts" title="Payout queue" detail="Approvals require a BNB Smart Chain transaction hash; the backend validates the transfer before finalising.">
          <Table columns={['Request', 'User', 'GBP requested', 'BNB locked', 'Destination', 'Status', 'Review']} rows={withdrawals} empty="No payout requests returned by the backend." render={row => <tr><td className="px-3 py-3 font-mono text-slate-300">{short(row.id)}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.userId)}</td><td className="px-3 py-3 text-white">{money(row.amountGbp)}</td><td className="px-3 py-3 text-slate-300">{formatLockedBnb(row.amountBnb ?? row.lockedBnbAmount)}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.payoutAddress || row.walletAddress)}</td><td className="px-3 py-3"><Pill value={row.status} /></td><td className="px-3 py-3"><div className="flex gap-1"><button onClick={() => void reviewPayout(String(row.id), 'APPROVE')} disabled={!isAdmin || busy || !['pending', 'under_review'].includes(String(row.status))} className="rounded border border-cyan-400/20 px-2 py-1 text-[10px] text-cyan-100 disabled:opacity-40">Approve + tx</button><button onClick={() => void reviewPayout(String(row.id), 'REJECT')} disabled={!isAdmin || busy || !['pending', 'under_review'].includes(String(row.status))} className="rounded border border-rose-400/20 px-2 py-1 text-[10px] text-rose-200 disabled:opacity-40">Reject</button></div></td></tr>} />
        </Panel>

        <Panel id="ops-audit" title="Audit history" detail="Backend audit events; newest records are shown first according to the API response.">
          <Table columns={['Time', 'Action', 'Target', 'Actor', 'Outcome']} rows={audit} empty="No audit records returned." render={row => <tr><td className="px-3 py-3 text-slate-400">{dateText(row.timestamp)}</td><td className="px-3 py-3 text-white">{String(row.action || 'ADMIN_ACTION').replace(/_/g, ' ')}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.targetEntity || row.target)}</td><td className="px-3 py-3 font-mono text-slate-400">{short(row.adminId || row.actorId)}</td><td className="px-3 py-3"><Pill value={row.outcome || row.status || 'recorded'} /></td></tr>} />
        </Panel>

        <footer className="rounded-xl border border-white/10 bg-white/[.02] p-4 text-[11px] leading-relaxed text-slate-500">Financial integrity: tool income is derived only from verified on-chain purchase receipts. Order intents, sample/demo data, failed attempts and payout transfers are not tool income. Missing backend data is shown as unavailable, never silently replaced with a fabricated zero. Locked tool economics and user balances cannot be edited from this screen.</footer>
      </div>
    </main>
  );
};

export default AdminPSEMine;
