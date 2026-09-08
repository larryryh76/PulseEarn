import React, { useCallback, useEffect, useState } from 'react';
import { usePsemineAuth } from '../../contexts/PsemineAuthContext';
import { usePsemineWallet } from '../../contexts/PsemineWalletContext';
import { PsemineLayout } from '../../components/mine/PsemineLayout';
import { BNBPaymentCheckout } from '../../components/mine/BNBPaymentCheckout';
import { PsemineTool, PsemineToolOwnership, PsemineMiningSession, PsemineActivity, PsemineNotification } from '../../types/psemine';
import { Activity, ArrowUpRight, Bell, CheckCircle2, Clock3, Coins, Cpu, Pickaxe, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export const PsemineDashboard: React.FC = () => {
  const { currentUser } = usePsemineAuth();
  const { isConnected, address, connectWallet, disconnectWallet } = usePsemineWallet();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{ campaign: any; ownedTools: PsemineToolOwnership[]; session: PsemineMiningSession | null; referrals: { qualifiedCount: number; bonusRateGbpPerHour: number }; recentActivity: PsemineActivity[]; notifications: PsemineNotification[] }>({ campaign: null, ownedTools: [], session: null, referrals: { qualifiedCount: 0, bonusRateGbpPerHour: 0 }, recentActivity: [], notifications: [] });
  const [availableTools, setAvailableTools] = useState<PsemineTool[]>([]);
  const [selectedToolToBuy, setSelectedToolToBuy] = useState<PsemineTool | null>(null);
  const [liveOutput, setLiveOutput] = useState(0);

  const fetchDashboard = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const token = await (window as any).psemineAuthToken?.();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const [dashRes, toolsRes] = await Promise.all([fetch('/api/psemine/dashboard', { headers }), fetch('/api/psemine/tools', { headers })]);
      const dashData = await dashRes.json(); const toolsData = await toolsRes.json();
      if (dashRes.ok && dashData.success) { setDashboardData({ campaign: dashData.campaign, ownedTools: dashData.ownedTools || [], session: dashData.session || null, referrals: dashData.referrals || { qualifiedCount: 0, bonusRateGbpPerHour: 0 }, recentActivity: dashData.recentActivity || [], notifications: dashData.notifications || [] }); if (dashData.session) setLiveOutput(dashData.session.accumulatedOutputGbp || 0); }
      else toast.error(dashData.message || 'Unable to load your mining account.');
      if (toolsRes.ok && toolsData.success) setAvailableTools(toolsData.tools || []); else toast.error(toolsData.message || 'Unable to load the tool catalog.');
    } catch (error) { console.error('[PSEmine Dashboard] load error', error); toast.error('We could not load your mining account.'); } finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { const session = dashboardData.session; if (!session || session.state !== 'active' || !session.totalMiningRateGbpPerHour) return; const interval = window.setInterval(() => { const start = session.lastCalculatedAt ? Date.parse(session.lastCalculatedAt) : Date.now(); const generated = Math.max(0, (Date.now() - start) / 1000) * (session.totalMiningRateGbpPerHour / 3600); setLiveOutput(Number((session.accumulatedOutputGbp + generated).toFixed(4))); }, 1000); return () => window.clearInterval(interval); }, [dashboardData.session]);

  const session = dashboardData.session;
  const baseRate = session?.baseMiningRateGbpPerHour || 0;
  const bonusRate = session?.referralBonusGbpPerHour || dashboardData.referrals.bonusRateGbpPerHour || 0;
  const combinedRate = session?.totalMiningRateGbpPerHour || baseRate + bonusRate;
  const campaignName = dashboardData.campaign?.name || 'Genesis Mining Campaign';
  const campaignEnds = dashboardData.campaign?.endsAt ? new Date(dashboardData.campaign.endsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '90-day campaign';
  const handleCheckoutSuccess = () => { setSelectedToolToBuy(null); fetchDashboard(); };

  return <PsemineLayout>
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-5 border-b border-[var(--pm-border)] pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3"><div className="psemine-kicker">{campaignName}</div><h1 className="max-w-2xl text-3xl font-semibold tracking-[-.04em] text-[var(--pm-text)] sm:text-5xl">Your mining position, at a glance.</h1><p className="max-w-xl text-sm leading-6 text-[var(--pm-muted)]">Buy a tool, activate your session, and track verified output from one clear control center.</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={fetchDashboard} className="pm-quiet-button" disabled={loading}><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Sync data</button><button onClick={isConnected ? disconnectWallet : connectWallet} className="psemine-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold"><Wallet size={15} /> {isConnected ? `${address?.slice(0, 6)}…${address?.slice(-4)}` : 'Connect wallet'}</button></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="pm-card relative overflow-hidden p-6 sm:p-8"><div className="absolute right-0 top-0 h-48 w-48 translate-x-1/3 -translate-y-1/3 rounded-full bg-[var(--pm-amber)]/10 blur-3xl" /><div className="relative flex flex-col gap-8"><div className="flex items-start justify-between gap-4"><div><div className="data-label">Accumulated output</div><div className="mt-2 font-mono text-4xl font-semibold tracking-[-.04em] text-[var(--pm-text)] sm:text-5xl">£{liveOutput.toFixed(4)}</div><p className="mt-2 text-xs text-[var(--pm-muted)]">GBP · calculated from verified session activity</p></div><span className={`pm-status ${session?.state === 'active' ? 'pm-status-live' : 'pm-status-neutral'}`}>{session?.state === 'active' ? 'Mining active' : 'Not mining'}</span></div><div className="grid gap-5 border-t border-[var(--pm-border)] pt-5 sm:grid-cols-3"><div><div className="data-label">Current rate</div><div className="mt-1 text-xl font-semibold text-[var(--pm-mint)]">£{combinedRate.toFixed(2)}<span className="text-xs font-normal text-[var(--pm-muted)]"> / hr</span></div></div><div><div className="data-label">Base rate</div><div className="mt-1 text-xl font-semibold text-[var(--pm-text)]">£{baseRate.toFixed(2)}<span className="text-xs font-normal text-[var(--pm-muted)]"> / hr</span></div></div><div><div className="data-label">Referral bonus</div><div className="mt-1 text-xl font-semibold text-[var(--pm-text)]">+£{bonusRate.toFixed(2)}<span className="text-xs font-normal text-[var(--pm-muted)]"> / hr</span></div></div></div></div></div>
        <div className="pm-card flex flex-col justify-between gap-6 p-6"><div className="flex items-center justify-between"><div><div className="data-label">Campaign</div><h2 className="mt-2 text-xl font-semibold text-[var(--pm-text)]">Genesis</h2></div><Coins className="text-[var(--pm-amber)]" size={22} /></div><div className="flex flex-col gap-3"><div className="flex items-center justify-between text-sm"><span className="text-[var(--pm-muted)]">Availability</span><span className="font-medium text-[var(--pm-text)]">{campaignEnds}</span></div><div className="flex items-center justify-between text-sm"><span className="text-[var(--pm-muted)]">Qualified referrals</span><span className="font-medium text-[var(--pm-text)]">{dashboardData.referrals.qualifiedCount} / 5</span></div><div className="mt-2 flex items-center gap-2 text-xs text-[var(--pm-mint)]"><ShieldCheck size={15} /> Backend-authoritative records</div></div></div>
      </section>

      <section className="flex flex-col gap-4"><div className="flex items-end justify-between"><div><div className="psemine-kicker">Portfolio</div><h2 className="mt-2 text-2xl font-semibold text-[var(--pm-text)]">Owned mining tools</h2></div><LinkArrow href="/mine/activity" label="View activity" /></div>{dashboardData.ownedTools.length === 0 ? <div className="pm-card-muted flex flex-col items-center gap-3 px-6 py-12 text-center"><div className="grid size-12 place-items-center rounded-xl bg-[var(--pm-amber)]/10 text-[var(--pm-amber)]"><Pickaxe size={22} /></div><h3 className="text-base font-semibold text-[var(--pm-text)]">No mining tools yet</h3><p className="max-w-sm text-sm leading-6 text-[var(--pm-muted)]">Purchase a Genesis tool below to activate your first mining session.</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{dashboardData.ownedTools.map((tool) => <div key={tool.id} className="pm-card p-5"><div className="flex items-start justify-between"><div className="grid size-9 place-items-center rounded-lg bg-[var(--pm-amber)]/10 text-[var(--pm-amber)]"><Cpu size={17} /></div><span className="pm-status pm-status-live">Active</span></div><div className="mt-6 text-xs uppercase tracking-wider text-[var(--pm-muted)]">{tool.toolId}</div><div className="mt-1 text-lg font-semibold text-[var(--pm-text)]">£{tool.miningRateGbpPerHour.toFixed(2)}<span className="text-xs font-normal text-[var(--pm-muted)]"> / hr</span></div><div className="mt-3 text-xs text-[var(--pm-muted)]">Acquired {new Date(tool.acquiredAt).toLocaleDateString()}</div></div>)}</div>}</section>

      <section className="flex flex-col gap-4"><div><div className="psemine-kicker">Genesis catalog</div><h2 className="mt-2 text-2xl font-semibold text-[var(--pm-text)]">Choose your next tool</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{availableTools.map((tool) => { const ownedCount = dashboardData.ownedTools.filter((owned) => owned.toolId === tool.id).length; const isMaxed = ownedCount >= tool.maxCopiesPerUser; return <div key={tool.id} className="pm-card flex flex-col justify-between gap-6 p-5 transition-colors hover:border-[rgba(240,171,72,.45)]"><div><div className="flex items-center justify-between"><span className="rounded-full bg-[var(--pm-amber)]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--pm-amber)]">{tool.tier}</span><span className="text-xs text-[var(--pm-muted)]">{ownedCount}/{tool.maxCopiesPerUser}</span></div><h3 className="mt-5 text-lg font-semibold text-[var(--pm-text)]">{tool.name}</h3><p className="mt-2 min-h-12 text-sm leading-5 text-[var(--pm-muted)]">{tool.description}</p><div className="mt-5 flex items-end justify-between border-t border-[var(--pm-border)] pt-4"><div><div className="text-xs text-[var(--pm-muted)]">Price</div><div className="mt-1 text-xl font-semibold text-[var(--pm-text)]">£{tool.priceGbp}</div></div><div className="text-right"><div className="text-xs text-[var(--pm-muted)]">Mining rate</div><div className="mt-1 text-sm font-semibold text-[var(--pm-mint)]">£{tool.miningRateGbpPerHour.toFixed(2)}/hr</div></div></div></div><button onClick={() => setSelectedToolToBuy(tool)} disabled={isMaxed} className={`w-full rounded-xl px-4 py-3 text-xs font-bold transition-colors ${isMaxed ? 'cursor-not-allowed bg-[var(--pm-surface-soft)] text-[var(--pm-muted)]' : 'psemine-button-primary'}`}>{isMaxed ? 'Maximum reached' : 'Review purchase'}</button></div>; })}</div>{availableTools.length === 0 && !loading && <div className="pm-card-muted p-8 text-center text-sm text-[var(--pm-muted)]">The tool catalog is not available right now.</div>}</section>

      <section className="grid gap-4 lg:grid-cols-2"><ActivityPanel icon={<Activity size={16} />} title="Recent activity" empty="No activity yet" items={dashboardData.recentActivity.map((item) => ({ id: item.id, title: item.title || item.type, detail: item.description || 'Verified account event', date: item.createdAt }))} /><ActivityPanel icon={<Bell size={16} />} title="Notifications" empty="You’re all caught up" items={dashboardData.notifications.map((item) => ({ id: item.id, title: item.title, detail: item.message, date: undefined }))} /></section>
    </div>
    {selectedToolToBuy && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"><BNBPaymentCheckout tool={selectedToolToBuy} onSuccess={handleCheckoutSuccess} onCancel={() => setSelectedToolToBuy(null)} /></div>}
  </PsemineLayout>;
};

function LinkArrow({ href, label }: { href: string; label: string }) { return <a href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--pm-muted)] hover:text-[var(--pm-text)]">{label}<ArrowUpRight size={14} /></a>; }
function ActivityPanel({ icon, title, empty, items }: { icon: React.ReactNode; title: string; empty: string; items: { id: string; title: string; detail: string; date?: string }[] }) { return <div className="pm-card p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[var(--pm-text)]">{icon}{title}</div>{items.length === 0 ? <div className="flex flex-col items-center gap-2 py-10 text-center"><Clock3 size={20} className="text-[var(--pm-muted)]" /><p className="text-sm text-[var(--pm-muted)]">{empty}</p></div> : <div className="mt-5 flex flex-col gap-1">{items.slice(0, 4).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-[var(--pm-surface-soft)]"><div className="flex min-w-0 items-center gap-3"><CheckCircle2 size={16} className="shrink-0 text-[var(--pm-mint)]" /><div className="min-w-0"><div className="truncate text-sm font-medium text-[var(--pm-text)]">{item.title}</div><div className="truncate text-xs text-[var(--pm-muted)]">{item.detail}</div></div></div>{item.date && <time className="shrink-0 text-[10px] text-[var(--pm-muted)]">{new Date(item.date).toLocaleDateString()}</time>}</div>)}</div>}</div>; }

export default PsemineDashboard;
