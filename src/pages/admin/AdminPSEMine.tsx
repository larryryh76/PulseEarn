import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Play, 
  Pause, 
  Archive, 
  RefreshCw, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export const AdminPSEMine: React.FC = () => {
  const { campaign, isCampaignArchived, refreshData } = usePSEMine();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMiners: 0,
    totalMiners: 0,
    toolsSold: 0,
    totalCapacityGBPPerHour: 0,
    totalAccruedLiabilityGBP: 0,
    totalBNBCollected: 0,
    qualifiedReferrals: 0,
    campaignStatus: 'active'
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [recoveryCases, setRecoveryCases] = useState<Array<Record<string, unknown>>>([]);
  const [withdrawalQueue, setWithdrawalQueue] = useState<Array<Record<string, unknown>>>([]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const res = await fetch('/api/admin/mine/overview', {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.stats) {
            setStats(data.stats);
          }
        }
        // Real-data operational queues (moderator-readable, admin-resolvable)
        const [recRes, wdRes] = await Promise.all([
          fetch('/api/admin/mine/payment-recovery?status=open', { headers: { 'Authorization': `Bearer ${idToken}` } }),
          fetch('/api/admin/psemine/withdrawals', { headers: { 'Authorization': `Bearer ${idToken}` } }),
        ]);
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecoveryCases(Array.isArray(recData.cases) ? recData.cases : []);
        }
        if (wdRes.ok) {
          const wdData = await wdRes.json();
          const all: Array<Record<string, unknown>> = Array.isArray(wdData.withdrawals) ? wdData.withdrawals : [];
          setWithdrawalQueue(all.filter((w) => ['pending', 'under_review', 'processing'].includes(String(w.status))));
        }
      }
    } catch (e) {
      console.error('Error fetching admin mine data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [currentUser]);

  const handleCampaignAction = async (action: 'pause' | 'resume' | 'settle' | 'shutdown') => {
    if (!currentUser) return;
    const confirmMsg = action === 'shutdown'
      ? 'CRITICAL: Are you sure you want to execute the Emergency Kill Switch and permanently Archive the PSEmine campaign?'
      : `Are you sure you want to ${action} the campaign?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/admin/mine/campaign/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          action,
          reason: `Admin triggered ${action}`
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Campaign action '${action}' executed successfully!`);
        await refreshData();
        await fetchAdminData();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err?.message || 'Execution error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              PSEmine Protocol Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-red-950 text-red-300 border border-red-800">
              Admin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Authoritative controls for 90-day campaign status, liability monitoring, and settlement payouts.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-gray-300 hover:text-white transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Protocol Health & Liability Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-[#0a1122] border border-cyan-900/40 rounded-2xl">
          <div className="text-xs text-gray-400 font-medium">Active Miners</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {stats.activeMiners} <span className="text-xs text-gray-500 font-sans">/ {stats.totalMiners}</span>
          </div>
        </div>

        <div className="p-5 bg-[#0a1122] border border-cyan-900/40 rounded-2xl">
          <div className="text-xs text-gray-400 font-medium">Tools Deployed</div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            {stats.toolsSold} Units
          </div>
        </div>

        <div className="p-5 bg-[#0a1122] border border-cyan-900/40 rounded-2xl">
          <div className="text-xs text-gray-400 font-medium">Total Network Capacity</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            £{stats.totalCapacityGBPPerHour.toFixed(2)}/hr
          </div>
        </div>

        <div className="p-5 bg-[#0a1122] border border-cyan-900/40 rounded-2xl">
          <div className="text-xs text-gray-400 font-medium">Total Accrued Liability</div>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            £{stats.totalAccruedLiabilityGBP.toFixed(2)}
          </div>
        </div>

      </div>

      {/* Lifecycle & Kill Switch Controls */}
      <div className="p-6 bg-[#0c1426] border border-cyan-900/50 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span>Campaign Lifecycle Operations</span>
            </h2>
            <p className="text-xs text-gray-400">
              Current Campaign State: <strong className="text-cyan-300 font-mono uppercase">{campaign?.status || stats.campaignStatus}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          
          {campaign?.status === 'paused' ? (
            <button
              onClick={() => handleCampaignAction('resume')}
              disabled={actionLoading}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Resume Mining</span>
            </button>
          ) : (
            <button
              onClick={() => handleCampaignAction('pause')}
              disabled={actionLoading || isCampaignArchived}
              className="py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              <span>Pause Campaign</span>
            </button>
          )}

          <button
            onClick={() => handleCampaignAction('settle')}
            disabled={actionLoading || isCampaignArchived}
            className="py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>Lock & Settle Wallets</span>
          </button>

          <button
            onClick={() => handleCampaignAction('shutdown')}
            disabled={actionLoading || isCampaignArchived}
            className="py-3 px-4 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            <span>Kill Switch (Archive)</span>
          </button>

          <a
            href="/mine"
            target="_blank"
            rel="noreferrer"
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-gray-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
          >
            <span>View Live /mine</span>
            <ExternalLink className="w-4 h-4" />
          </a>

        </div>
      </div>

      {/* Payment Recovery Queue (real backend data) */}
      <div className="p-6 bg-[#0c1426] border border-amber-900/40 rounded-3xl space-y-4">
        <h2 className="text-base font-bold text-white">Payment Recovery Cases ({recoveryCases.length})</h2>
        {recoveryCases.length === 0 ? (
          <p className="text-xs text-gray-500">No open recovery cases.</p>
        ) : (
          <div className="space-y-2">
            {recoveryCases.map((c, i) => (
              <div key={String(c.id ?? i)} className="p-3 rounded-xl bg-[#0a1122] border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-amber-300">{String(c.reason || 'UNKNOWN_REASON')}</span>
                  <span className="text-gray-500">tx: {String(c.txHash || '—').slice(0, 18)}…</span>
                  <span className="text-gray-500">observed: {String(c.observedAmountWei ?? '—')} wei</span>
                  <span className="text-gray-500">sender: {String(c.sender || '—').slice(0, 10)}…</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!currentUser) return;
                      const notes = window.prompt('Review notes (required):') || '';
                      if (!notes) return;
                      const idToken = await currentUser.getIdToken();
                      const res = await fetch(`/api/admin/mine/payment-recovery/${String(c.id)}/resolve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({ action: 'mark_reviewed', notes })
                      });
                      if (res.ok) { toast.success('Marked reviewed'); fetchAdminData(); } else { toast.error('Failed'); }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-gray-200"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentUser) return;
                      const purchaseId = window.prompt('Purchase ID to attach (from verify-purchase retry):') || '';
                      if (!purchaseId) return;
                      const idToken = await currentUser.getIdToken();
                      const res = await fetch(`/api/admin/mine/payment-recovery/${String(c.id)}/resolve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({ action: 'attach_to_purchase', purchaseId, notes: 'Linked after verified re-activation' })
                      });
                      if (res.ok) { toast.success('Attached'); fetchAdminData(); } else { toast.error('Failed'); }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-700 hover:bg-blue-600 text-white"
                  >
                    Attach To Purchase
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentUser) return;
                      if (!window.confirm('Reject this recovery case? Evidence is retained.')) return;
                      const idToken = await currentUser.getIdToken();
                      const res = await fetch(`/api/admin/mine/payment-recovery/${String(c.id)}/resolve`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({ action: 'reject', notes: 'Rejected during review' })
                      });
                      if (res.ok) { toast.success('Rejected'); fetchAdminData(); } else { toast.error('Failed'); }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-red-800 hover:bg-red-700 text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Review Queue (real backend data) */}
      <div className="p-6 bg-[#0c1426] border border-emerald-900/40 rounded-3xl space-y-4">
        <h2 className="text-base font-bold text-white">Payout Review Queue ({withdrawalQueue.length})</h2>
        {withdrawalQueue.length === 0 ? (
          <p className="text-xs text-gray-500">No pending payout requests.</p>
        ) : (
          <div className="space-y-2">
            {withdrawalQueue.map((w, i) => (
              <div key={String(w.id ?? i)} className="p-3 rounded-xl bg-[#0a1122] border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs space-y-0.5">
                  <div className="font-mono font-bold text-emerald-300">£{String(w.amountGbp ?? '—')}</div>
                  <div className="text-gray-500">to {String(w.payoutAddress || '—').slice(0, 10)}…{String(w.payoutAddress || '').slice(-4)}</div>
                  <div className="text-gray-600">user {String(w.userId || '—').slice(0, 10)}… · status {String(w.status || '—')}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!currentUser) return;
                      const txHash = window.prompt('Payout transaction hash (required to approve):') || '';
                      if (!txHash) return;
                      const idToken = await currentUser.getIdToken();
                      const res = await fetch(`/api/admin/psemine/withdrawals/${String(w.id)}/review`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({ action: 'APPROVE', txHash, adminNotes: 'Approved with on-chain tx' })
                      });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.success) { toast.success('Payout completed'); fetchAdminData(); } else { toast.error(data.error || 'Failed'); }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    Approve (tx)
                  </button>
                  <button
                    onClick={async () => {
                      if (!currentUser) return;
                      const notes = window.prompt('Rejection reason:') || '';
                      if (!notes) return;
                      const idToken = await currentUser.getIdToken();
                      const res = await fetch(`/api/admin/psemine/withdrawals/${String(w.id)}/review`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                        body: JSON.stringify({ action: 'REJECT', adminNotes: notes })
                      });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.success) { toast.success('Rejected'); fetchAdminData(); } else { toast.error(data.error || 'Failed'); }
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-gray-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Protocol Verification & Architecture Info */}
      <div className="p-6 bg-[#080d19] border border-slate-800 rounded-3xl space-y-3 text-xs text-gray-400">
        <h3 className="text-sm font-bold text-white">PSEmine Accounting Safeguards</h3>
        <p>
          All mining capacity transactions require 3 BSC block confirmations (the ACTUAL observed depth is stored on each purchase). Quotes expire after 15 minutes to prevent exchange rate arbitrage. Referral boosts are capped at +£1.50/hr per user. Accrual is written ONLY by the canonical backend ledger (psemine_mining_ledger) with deterministic idempotent entries — frontend timers are never authoritative.
        </p>
      </div>

    </div>
  );
};
