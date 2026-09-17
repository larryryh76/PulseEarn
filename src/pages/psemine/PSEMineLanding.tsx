import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Clock, Wallet, Cog, Users, Check, ChevronDown,
  Landmark, LineChart, Lock, Repeat, Wrench, Layers, Route, ServerCog, Gauge,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, Chip, Meter, campaignStatusView, SectionHeading } from '../../components/psemine/pse';
import { cn } from '../../utils';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const MAX_TOOL = PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR;
const MAX_REF = PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR;
const MAX_ALL = PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR;

/** The campaign model, in the order money actually moves. */
const MODEL_STEPS = [
  { icon: Layers, label: 'Tools', detail: `${gbp(3)}–${gbp(200)} per tool, owned for the campaign` },
  { icon: Gauge, label: 'Capacity', detail: `Fixed hourly rate, capped at ${gbpHour(MAX_TOOL)}` },
  { icon: LineChart, label: 'GBP earnings', detail: 'Accrued hourly against active capacity' },
  { icon: Landmark, label: 'Settlement', detail: 'Day 90 — balances finalised from the ledger' },
  { icon: Wallet, label: 'BNB payout', detail: 'Reviewed, then paid to your payout wallet' },
];

const PHASES = [
  { icon: Clock, phase: 'Day 0', title: 'Campaign start', detail: 'Purchases open. Each tool begins its first 24-hour operating cycle.' },
  { icon: Cog, phase: 'Days 1–90', title: 'Operations', detail: 'Cycles run, free maintenance restarts them, capacity accrues hourly.' },
  { icon: ServerCog, phase: 'Day 90', title: 'Settlement', detail: 'Accrual stops. Final balances are computed from the mining ledger.' },
  { icon: Landmark, phase: 'After day 90', title: 'Payout', detail: 'Reviewed requests are paid to configured BNB Smart Chain wallets.' },
];

const FAQS = [
  { q: 'What exactly is PSEmine?', a: 'PSEmine is a 90-day, campaign-based mining product. You buy mining tools with BNB, the tools provide hourly capacity denominated in GBP, and the campaign settles accrued earnings after it ends.' },
  { q: 'Do I need to run hardware?', a: 'No. Tools represent capacity operated by PSEmine. You never manage hardware, electricity or hosting.' },
  { q: 'Why are prices fixed in GBP?', a: 'Tool prices and hourly rates are fixed in GBP so your capacity is predictable. You pay the fixed GBP price in BNB at the live rate at the moment you request a quote.' },
  { q: 'How big can my capacity get?', a: `Tool capacity is capped at ${gbpHour(MAX_TOOL)}. Each qualified referral adds +£0.30/hour, up to 5 referrals (+${gbpHour(MAX_REF)}). The maximum total capacity is ${gbpHour(MAX_ALL)}.` },
  { q: 'When can I withdraw earnings?', a: 'Accrued earnings are campaign earnings: they settle after the campaign ends. Payout requests open at settlement and are paid to your configured BNB Smart Chain wallet after review.' },
  { q: 'What does maintenance cost?', a: 'Nothing. Maintenance is a free action that restarts a completed operating cycle. A tool that sits too long after its cycle completes needs the same free maintenance before it resumes accruing.' },
  { q: 'How are payments verified?', a: 'Every purchase is a server-generated quote bound to your account. After you send BNB, the backend verifies the transaction on BNB Smart Chain — sender, recipient, exact amount and confirmation depth — before the tool activates.' },
  { q: 'Is this the same as PulseEarn?', a: 'They share one sign-in identity and nothing else. PSEmine has its own tools, GBP accounting, activity, notifications and payouts; PulseEarn points, tasks and rewards never apply here.' },
];

export const PSEMineLanding: React.FC = () => {
  const { campaign } = usePSEMine();
  const { currentUser } = usePSEMineAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const status = campaign?.status ?? 'scheduled';
  const statusView = campaignStatusView(status);
  const purchaseEnabled = campaign?.purchaseEnabled !== false;

  const primaryHref = currentUser ? '/mine/dashboard' : '/mine/signup';
  const primaryLabel = currentUser ? 'Open your console' : 'Start the campaign';

  return (
    <div className="pb-16">
      {/* ═══════════ HERO ═══════════ */}
      <section className="pse-hero-surface border-b" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section py-14 md:py-20">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
            {/* Narrative */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip label={`Campaign ${statusView.label.trim()}`} chip={statusView.chip} pulse={statusView.live} />
                <Chip label="90 days" chip="pse-chip pse-chip-neutral" dot={false} />
                <Chip label="GBP accounting" chip="pse-chip pse-chip-neutral" dot={false} />
              </div>

              <h1 className="pse-h1 mt-6">
                Mine with capacity.<br />
                <span style={{ color: 'var(--pse-blue)' }}>Settle in GBP.</span>
              </h1>

              <p className="pse-lead mt-5 max-w-xl">
                PSEmine is a 90-day mining campaign. Purchase tools with BNB, build a fixed hourly GBP capacity, and let
                the campaign settle your accrued earnings when it ends. Fixed rates, on-chain verification,
                server-authoritative accounting.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={primaryHref} className="pse-btn pse-btn-primary pse-btn-lg justify-center">
                  {primaryLabel} <ArrowRight size={15} />
                </Link>
                <Link to="/mine/guide" className="pse-btn pse-btn-secondary pse-btn-lg justify-center">
                  How the campaign works
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2">
                <span className="pse-micro">Tools from {gbp(3)}</span>
                <span className="pse-micro">Peak capacity {gbpHour(MAX_ALL)}</span>
                <span className="pse-micro">Settlement in BNB</span>
              </div>
            </div>

            {/* Campaign model — the structural story in one panel */}
            <div className="pse-card overflow-hidden">
              <div className="border-b px-5 py-4" style={{ borderColor: 'var(--pse-line)' }}>
                <p className="pse-eyebrow">The campaign model</p>
                <p className="pse-micro mt-1">From purchase to payout, in the order money actually moves.</p>
              </div>
              <ol className="divide-y" style={{ borderColor: 'var(--pse-line)' }}>
                {MODEL_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.label} className="flex items-center gap-3.5 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: 'var(--pse-inset)', border: '1px solid var(--pse-line)' }}>
                        <Icon size={16} style={{ color: i === 2 ? 'var(--pse-cyan)' : 'var(--pse-blue)' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{step.label}</p>
                        <p className="pse-micro mt-0.5">{step.detail}</p>
                      </div>
                      <span className="pse-num pse-micro shrink-0" style={{ color: 'var(--pse-text-3)' }}>{i + 1}</span>
                    </li>
                  );
                })}
              </ol>
              <div className="border-t px-5 py-3.5" style={{ borderColor: 'var(--pse-line)' }}>
                <p className="pse-micro">
                  {statusView.live
                    ? 'The campaign is live — capacity is accruing now.'
                    : statusView.detail}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="pse-section py-14 md:py-20">
        <SectionHeading
          title="How PSEmine works"
          meta="Four steps, no hardware, no hosting — the campaign runs the operations."
        />
        <h2 className="pse-h2 mt-2 max-w-2xl">A 90-day arc with one operating discipline</h2>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { icon: Wallet, title: 'Purchase a tool with BNB', body: 'Pick a tool and pay its fixed GBP price in BNB on BNB Smart Chain. The backend verifies the payment on-chain before the tool activates.' },
            { icon: LineChart, title: 'Capacity starts accruing', body: 'Each tool adds a fixed hourly rate to your capacity, denominated in GBP. Earnings accrue from server-verified operating time — never from estimates.' },
            { icon: Repeat, title: 'Keep tools in cycle', body: 'Tools run 24-hour operating cycles. When a cycle completes, one free maintenance action restarts it. Maintenance is always free.' },
            { icon: Landmark, title: 'Settlement after day 90', body: 'Accrued balances are finalised and paid out to the BNB Smart Chain wallet you configured. Balances are not withdrawable mid-campaign.' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="pse-card flex gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(76,158,248,0.10)', border: '1px solid rgba(76,158,248,0.25)' }}>
                  <Icon size={17} style={{ color: 'var(--pse-blue)' }} />
                </div>
                <div>
                  <p className="pse-h3">{s.title}</p>
                  <p className="pse-caption mt-1.5">{s.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ TOOLS ═══════════ */}
      <section className="border-y py-14 md:py-20" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
        <div className="pse-section">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <SectionHeading title="Mining tools" meta="Fixed economics for the whole campaign — no dynamic pricing" />
              <h2 className="pse-h2 mt-2">Four tiers. One 24-hour operating cycle.</h2>
            </div>
            <Link to="/mine/tools" className="pse-btn pse-btn-secondary shrink-0">
              Open the marketplace <ArrowRight size={14} />
            </Link>
          </div>

          <div className="pse-card mt-8 overflow-hidden">
            <div className="hidden md:block">
              <table className="pse-table">
                <thead>
                  <tr>
                    <th>Tier</th><th>Tool</th>
                    <th className="pse-num-cell">Price</th>
                    <th className="pse-num-cell">Hourly capacity</th>
                    <th className="pse-num-cell">Ownership limit</th>
                    <th className="pse-num-cell">Capacity at limit</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOLS.map(t => (
                    <tr key={t.id}>
                      <td><span className="pse-step">{t.tier}</span></td>
                      <td>
                        <span className="font-medium">{t.name}</span>
                        <span className="pse-micro block">{t.tagline}</span>
                      </td>
                      <td className="pse-num-cell font-semibold">{gbp(t.purchasePriceGBP)}</td>
                      <td className="pse-num-cell" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP)}</td>
                      <td className="pse-num-cell">{t.maxPerUser}</td>
                      <td className="pse-num-cell" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td />
                    <td className="font-semibold">Maximum tool capacity</td>
                    <td className="pse-num-cell" />
                    <td className="pse-num-cell" />
                    <td className="pse-num-cell" />
                    <td className="pse-num-cell font-semibold" style={{ color: 'var(--pse-cyan)' }}>{gbpHour(MAX_TOOL)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Mobile: stacked rows, no clipped table */}
            <ul className="divide-y md:hidden" style={{ borderColor: 'var(--pse-line)' }}>
              {TOOLS.map(t => (
                <li key={t.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>
                      <span className="pse-step mr-2">{t.tier}</span>{t.name}
                    </span>
                    <span className="pse-num pse-caption font-semibold">{gbp(t.purchasePriceGBP)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="pse-micro">Capacity <span className="pse-num" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP)}</span></span>
                    <span className="pse-micro">Limit <span className="pse-num">{t.maxPerUser}</span></span>
                    <span className="pse-micro">At limit <span className="pse-num">{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</span></span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="pse-micro flex items-center gap-1.5"><Clock size={12} /> 24-hour operating cycles</span>
            <span className="pse-micro flex items-center gap-1.5"><Wrench size={12} /> Maintenance always free</span>
            <span className="pse-micro flex items-center gap-1.5"><ShieldCheck size={12} /> Activation only after on-chain verification</span>
          </div>
        </div>
      </section>

      {/* ═══════════ CAPACITY & REFERRALS ═══════════ */}
      <section className="pse-section py-14 md:py-20">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHeading title="Capacity system" meta="Additive, capped and predictable" />
            <h2 className="pse-h2 mt-2">Your hourly rate is the sum of exactly two things</h2>
            <p className="pse-caption mt-4">
              Tool capacity plus qualified referral capacity. The backend calculates every figure; the app only displays
              what the server reports.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                `Tool capacity: capped at ${gbpHour(MAX_TOOL)} across all four tiers.`,
                `Referral capacity: +£0.30/hour per qualified referral, up to 5.`,
                `Total capacity: capped at ${gbpHour(MAX_ALL)}.`,
              ].map(x => (
                <li key={x} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'var(--pse-text-2)' }}>
                  <Check size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
                  {x}
                </li>
              ))}
            </ul>

            {/* Referral path, compact */}
            <div className="pse-card mt-7 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>
                  <Users size={14} className="mr-2 inline" style={{ color: 'var(--pse-purple)' }} />
                  How a referral qualifies
                </p>
                <Chip label="+£0.30/hour" chip="pse-chip pse-chip-success" dot={false} />
              </div>
              <div className="mt-4 flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2, 3, 4].map(i => <span key={i} className="h-1 flex-1 rounded-full" style={{ background: 'var(--pse-purple)' }} />)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-5">
                {['Registered', 'Wallet connected', 'Tool purchased', 'Mining active', 'Qualified'].map((s, i) => (
                  <span key={s} className="pse-micro">
                    <span className="pse-num" style={{ color: 'var(--pse-text-3)' }}>{i + 1}.</span> {s}
                  </span>
                ))}
              </div>
              <p className="pse-micro mt-3.5">
                Qualification settles once on the backend, from the qualification moment forward — never retroactively.
                Five slots maximum, worth {gbpHour(MAX_REF)} at full capacity.
              </p>
            </div>
          </div>

          <div className="pse-card p-6 md:p-8">
            <p className="pse-eyebrow mb-5">Peak capacity composition</p>
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="pse-caption">Tools (all tiers at limit)</span>
                  <span className="pse-num pse-caption font-semibold">{gbpHour(MAX_TOOL)}</span>
                </div>
                <Meter value={(MAX_TOOL / MAX_ALL) * 100} label="Tool capacity share" />
              </div>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="pse-caption">Referrals (5 qualified)</span>
                  <span className="pse-num pse-caption font-semibold">+{gbpHour(MAX_REF)}</span>
                </div>
                <Meter value={(MAX_REF / MAX_ALL) * 100} tone="purple" label="Referral capacity share" />
              </div>
              <div className="pse-divider my-2" />
              <div className="flex items-baseline justify-between">
                <span className="pse-body font-semibold" style={{ color: 'var(--pse-text)' }}>Maximum total capacity</span>
                <span className="pse-num text-[24px] font-semibold" style={{ color: 'var(--pse-cyan)' }}>{gbpHour(MAX_ALL)}</span>
              </div>
            </div>
            <p className="pse-micro mt-5">
              Accrual depends on active operating cycles — a tool between cycles does not accrue until maintenance restarts it.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ CAMPAIGN TIMELINE ═══════════ */}
      <section className="border-y py-14 md:py-20" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
        <div className="pse-section">
          <SectionHeading title="Campaign timeline" meta="One 90-day arc, four phases" />
          <h2 className="pse-h2 mt-2 max-w-2xl">The phase you are in is always visible in the console</h2>
          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-4">
            {PHASES.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="pse-card relative p-6">
                  <span className="pse-eyebrow">{p.phase}</span>
                  <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: 'rgba(139,124,246,0.10)', border: '1px solid rgba(139,124,246,0.25)' }}>
                    <Icon size={16} style={{ color: 'var(--pse-purple)' }} />
                  </div>
                  <p className="pse-h3 mt-3">{p.title}</p>
                  <p className="pse-caption mt-1.5">{p.detail}</p>
                  <span className="pse-micro mt-4 block" style={{ color: 'var(--pse-text-3)' }}>Phase {i + 1} of 4</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ PAYMENTS ═══════════ */}
      <section className="pse-section py-14 md:py-20">
        <SectionHeading title="Paying with BNB" meta="Quoted, exact, verified on-chain" />
        <h2 className="pse-h2 mt-2 max-w-2xl">Quotes, exact amounts, on-chain verification</h2>

        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { icon: Wallet, h: 'Server-generated quote', d: 'The fixed GBP price is converted to an exact BNB amount at the live rate and bound to your account. The quoted amount is fixed for that window.' },
            { icon: Layers, h: 'Exact transfer', d: 'You send the quoted amount to the campaign receiving wallet on BNB Smart Chain from your connected wallet. Underpayments are detected by verification.' },
            { icon: ShieldCheck, h: 'Backend verification', d: 'The backend checks sender, recipient, amount and confirmation depth before activating anything. The app never self-confirms a payment.' },
          ].map(x => {
            const Icon = x.icon;
            return (
              <div key={x.h} className="pse-card p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(34,211,238,0.09)', border: '1px solid rgba(34,211,238,0.25)' }}>
                  <Icon size={17} style={{ color: 'var(--pse-cyan)' }} />
                </div>
                <p className="pse-h3 mt-4">{x.h}</p>
                <p className="pse-caption mt-1.5">{x.d}</p>
              </div>
            );
          })}
        </div>
        <p className="pse-micro mt-4">
          Network: BNB Smart Chain (chain {PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}) only. Accounting stays in GBP;
          settlement is paid in crypto.
        </p>
      </section>

      {/* ═══════════ TRUST ═══════════ */}
      <section className="border-t py-14 md:py-20" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHeading title="Security model" meta="Server-authoritative by design" />
            <h2 className="pse-h2 mt-2">The browser displays state. The backend owns it.</h2>
            <p className="pse-caption mt-4">
              PSEmine is built so that no value in the app can be claimed, forged or double-counted from the client side.
              Product access is an explicit, backend-enforced entitlement — separate from PulseEarn, even though both
              products share one sign-in identity.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/mine/guide" className="pse-btn pse-btn-secondary pse-btn-sm">
                <Route size={13} /> Read the full guide
              </Link>
              <Link to="/help" className="pse-btn pse-btn-ghost pse-btn-sm">Contact support</Link>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: Lock, t: 'Ledger-based balances', d: 'Earnings live in an append-only mining ledger with deterministic entries — not in editable client fields.' },
              { icon: ShieldCheck, t: 'On-chain payment proofs', d: 'Purchases activate only after the backend verifies the BNB transaction, with replay protection.' },
              { icon: Wrench, t: 'Enforced operating cycles', d: 'Cycle state, maintenance and accrual windows are derived and validated on the server at every step.' },
              { icon: Users, t: 'One qualification path', d: 'Referrals qualify once, through one auditable backend path, with anti-abuse checks.' },
              { icon: ServerCog, t: 'Isolated product behaviour', d: 'A PSEmine session never triggers PulseEarn rewards, points or tasks — shared infrastructure, separate products.' },
            ].map(x => {
              const Icon = x.icon;
              return (
                <div key={x.t} className="pse-card flex gap-4 p-5">
                  <Icon size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-blue)' }} />
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: 'var(--pse-text)' }}>{x.t}</p>
                    <p className="pse-caption mt-0.5">{x.d}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section className="pse-section py-14 md:py-20">
        <div className="max-w-3xl">
          <SectionHeading title="FAQ" meta="Everything operators ask before their first purchase" />
          <div className="mt-6 space-y-2.5">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="pse-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--pse-text)' }}>{f.q}</span>
                    <ChevronDown size={16} className={cn('shrink-0 transition-transform', open && 'rotate-180')} style={{ color: 'var(--pse-text-3)' }} />
                  </button>
                  {open && <p className="pse-caption px-5 pb-5">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="pse-hero-surface border-t" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section py-14 text-center md:py-20">
          <h2 className="pse-h2 mx-auto max-w-xl">
            The campaign runs for 90 days. Capacity accrues every operating hour.
          </h2>
          <p className="pse-caption mx-auto mt-3 max-w-md">
            {purchaseEnabled
              ? 'Purchase a tool, keep it in cycle, and let the campaign settle your earnings at the end.'
              : 'Purchases are currently closed. The guide explains how the campaign works while you wait.'}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={primaryHref} className="pse-btn pse-btn-primary pse-btn-lg w-full justify-center sm:w-auto">
              {primaryLabel} <ArrowRight size={15} />
            </Link>
            <Link to="/mine/tools" className="pse-btn pse-btn-secondary pse-btn-lg w-full justify-center sm:w-auto">
              Browse tools
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PSEMineLanding;
