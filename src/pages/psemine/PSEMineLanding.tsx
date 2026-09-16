import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers, ArrowRight, ShieldCheck, Clock, Wallet, Cog, Users, Check,
  ChevronDown, CircleDot, Landmark, LineChart, Lock, Repeat, Wrench,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import { gbp, gbpHour, Chip } from '../../components/psemine/pse';
import { cn } from '../../utils';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);

const HOW_IT_WORKS = [
  { icon: Wallet, title: 'Purchase a tool with BNB', body: 'Pick a mining tool and pay its fixed GBP price in BNB on BNB Smart Chain. Every payment is verified on-chain before a tool is activated.' },
  { icon: LineChart, title: 'Capacity starts accruing', body: 'Each tool adds a fixed hourly rate to your capacity, denominated in GBP. Earnings accrue from server-verified operating time — never from estimates.' },
  { icon: Repeat, title: 'Keep tools in cycle', body: 'Tools run 24-hour operating cycles. When a cycle completes, one free maintenance action restarts it. Maintenance is always free.' },
  { icon: Landmark, title: 'Settlement after day 90', body: 'When the campaign ends, accrued balances are finalized and paid out to the BNB Smart Chain wallet you configured. Balances are not withdrawable mid-campaign.' },
];

const FAQS = [
  { q: 'What exactly is PSEmine?', a: 'PSEmine is a 90-day, campaign-based mining product. You buy mining tools with BNB, the tools provide hourly capacity denominated in GBP, and the campaign settles accrued earnings after it ends.' },
  { q: 'Do I need to run hardware?', a: 'No. Tools represent capacity operated by PSEmine. You never manage hardware, electricity, or hosting.' },
  { q: 'Why are prices fixed in GBP?', a: 'Tool prices and hourly rates are fixed in GBP so your capacity is predictable. You pay the fixed GBP price in BNB at the live exchange rate at the moment you request a quote.' },
  { q: 'How big can my capacity get?', a: 'Tool capacity is capped at £10.60/hour. Each qualified referral adds +£0.30/hour, up to 5 referrals (+£1.50/hour). The maximum total capacity is £12.10/hour.' },
  { q: 'When can I withdraw earnings?', a: 'Accrued earnings are campaign earnings: they settle after the campaign ends. Payout requests open at settlement and are paid to your configured BNB Smart Chain wallet after review.' },
  { q: 'What does maintenance cost?', a: 'Nothing. Maintenance is a free action that restarts a completed operating cycle. If a tool sits too long after its cycle completes, it needs the same free maintenance before it resumes accruing.' },
  { q: 'How are payments verified?', a: 'Every purchase is a server-generated quote bound to your account. After you send BNB, the backend verifies the transaction on BNB Smart Chain — sender, recipient, exact amount, and confirmation depth — before the tool activates.' },
  { q: 'Can I change my payout wallet?', a: 'Yes, before the campaign\u2019s wallet-change cutoff. Payout wallets are stored server-side and are separate from the wallet you connect to view the app.' },
];

export const PSEMineLanding: React.FC = () => {
  const { campaign } = usePSEMine();
  const { currentUser } = usePSEMineAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const status = campaign?.status ?? 'scheduled';
  const purchaseEnabled = campaign?.purchaseEnabled !== false;

  return (
    <div className="pb-24">
      {/* ═══════════ HERO ═══════════ */}
      <section className="pse-hero-surface border-b" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            {/* FIX 6: wrap cleanly at 320–430px instead of overflowing */}
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
              <Chip label={`Campaign ${status}`} chip={status === 'active' ? 'pse-chip pse-chip-success' : 'pse-chip pse-chip-purple'} pulse={status === 'active'} />
              <Chip label="90 days" chip="pse-chip pse-chip-neutral" dot={false} />
              <Chip label="BNB Smart Chain" chip="pse-chip pse-chip-neutral" dot={false} />
            </div>
            <h1 className="pse-h1">
              Campaign-based mining,<br />
              <span style={{ color: 'var(--pse-blue)' }} className="pse-num">measured in GBP.</span>
            </h1>
            <p className="pse-lead mx-auto mt-5 max-w-2xl">
              PSEmine is a 90-day mining campaign. Purchase mining tools with BNB, build hourly
              GBP capacity, and let the campaign settle your accrued earnings when it ends.
              Fixed rates. On-chain verification. Server-authoritative accounting.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={currentUser ? '/mine/dashboard' : '/mine/signup'} className="pse-btn pse-btn-primary pse-btn-lg w-full sm:w-auto">
                {currentUser ? 'Open your console' : 'Start the campaign'} <ArrowRight size={15} />
              </Link>
              <Link to="/mine/guide" className="pse-btn pse-btn-secondary pse-btn-lg w-full sm:w-auto">
                Read the guide
              </Link>
            </div>
            <p className="pse-micro mt-6">
              Tools from {gbp(3)} · Capacity up to {gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)} · Settlement in BNB
            </p>
          </div>

          {/* Verdict row: the three structural facts */}
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { k: 'Campaign', v: '90 days', s: 'Fixed duration, then settlement' },
              { k: 'Accounting', v: 'GBP (£)', s: 'Fixed hourly capacity rates' },
              { k: 'Payment', v: 'BNB', s: 'Verified on BNB Smart Chain' },
            ].map(x => (
              <div key={x.k} className="pse-card p-5 text-center">
                <p className="pse-eyebrow">{x.k}</p>
                <p className="pse-num mt-1.5 text-[22px] font-semibold">{x.v}</p>
                <p className="pse-micro mt-1">{x.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW PSEMINE WORKS ═══════════ */}
      <section className="pse-section py-16 md:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="pse-eyebrow">How PSEmine works</p>
          <h2 className="pse-h2 mt-2">Four steps from purchase to settlement</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {HOW_IT_WORKS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="pse-card pse-card-hover flex gap-4 p-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(46,144,250,0.10)', border: '1px solid rgba(46,144,250,0.25)' }}>
                  <Icon size={17} style={{ color: 'var(--pse-blue)' }} />
                </div>
                <div>
                  <p className="pse-micro mb-1">Step {i + 1}</p>
                  <p className="pse-h3">{s.title}</p>
                  <p className="pse-caption mt-1.5">{s.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ MINING TOOLS ═══════════ */}
      <section className="border-y py-16 md:py-20" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
        <div className="pse-section">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="pse-eyebrow">Mining tools</p>
              <h2 className="pse-h2 mt-2">Four tools. Fixed rates. Owned outright for the campaign.</h2>
              <p className="pse-caption mt-3">
                Every tool runs the same operating cycle: 24 hours of accrual, a completed-cycle window, and one free maintenance action to restart.
              </p>
            </div>
            <Link to="/mine/tools" className="pse-btn pse-btn-secondary shrink-0">
              Open marketplace <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map(t => (
              <div key={t.id} className="pse-card pse-card-hover flex flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="pse-eyebrow">Tier {t.tier}</span>
                  <Chip label={`Max ${t.maxPerUser}`} chip="pse-chip pse-chip-neutral" dot={false} />
                </div>
                <p className="pse-h3 mt-3">{t.name}</p>
                <p className="pse-micro mt-1.5 min-h-[32px]">{t.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="pse-num text-[26px] font-semibold" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP)}</span>
                </div>
                <div className="pse-micro mt-3 space-y-1.5" style={{ color: 'var(--pse-text-2)' }}>
                  <div className="flex justify-between"><span>Price</span><span className="pse-num font-semibold">{gbp(t.purchasePriceGBP)}</span></div>
                  <div className="flex justify-between"><span>Cycle</span><span>24h operating</span></div>
                  <div className="flex justify-between"><span>Maintenance</span><span>Free</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CAPACITY SYSTEM ═══════════ */}
      <section className="pse-section py-16 md:py-20">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="pse-eyebrow">Capacity system</p>
            <h2 className="pse-h2 mt-2">Additive capacity, capped and predictable</h2>
            <p className="pse-caption mt-4">
              Your hourly capacity is the sum of your tools plus your qualified referrals — nothing else.
              The backend calculates every figure; the app only displays what the server reports.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Tool capacity: capped at £10.60/hour across all four tool tiers.',
                'Referral capacity: +£0.30/hour per qualified referral, up to 5.',
                'Total capacity: capped at £12.10/hour.',
              ].map(x => (
                <li key={x} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'var(--pse-text-2)' }}>
                  <Check size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
                  {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="pse-card p-6 md:p-8">
            <p className="pse-eyebrow mb-5">Peak capacity composition</p>
            <div className="space-y-3">
              <CompositionRow label="Tools (all tiers)" value="£10.60/hour" pct={87.6} color="var(--pse-blue)" />
              <CompositionRow label="Referrals (5 qualified)" value="+£1.50/hour" pct={12.4} color="var(--pse-purple)" />
              <div className="pse-divider my-4" />
              <div className="flex items-baseline justify-between">
                <span className="pse-body font-semibold" style={{ color: 'var(--pse-text)' }}>Maximum total capacity</span>
                <span className="pse-num text-[24px] font-semibold" style={{ color: 'var(--pse-cyan)' }}>£12.10/hour</span>
              </div>
            </div>
            <p className="pse-micro mt-5">
              Accrual depends on active operating cycles — a tool between cycles does not accrue until maintenance restarts it.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ REFERRAL CAPACITY ═══════════ */}
      <section className="border-y py-16 md:py-20" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
        <div className="pse-section grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="pse-card p-6 md:p-8">
              <p className="pse-eyebrow mb-5">Referral qualification path</p>
              <ol className="space-y-4">
                {[
                  ['Registered', 'Your invite signs up with your code.'],
                  ['Wallet Connected', 'They connect a BNB Smart Chain wallet.'],
                  ['Tool Purchased', 'They buy their first mining tool.'],
                  ['Mining Active', 'Their tool activates and starts operating.'],
                  ['Qualified', '+£0.30/hour is added to your capacity.'],
                ].map(([t, d], i, arr) => (
                  <li key={t} className="flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-bold"
                        style={i === arr.length - 1
                          ? { borderColor: 'var(--pse-success)', color: 'var(--pse-success)', background: 'rgba(46,206,132,0.1)' }
                          : { borderColor: 'var(--pse-line-strong)', color: 'var(--pse-text-3)' }}>
                        {i + 1}
                      </span>
                      {i < arr.length - 1 && <span className="mt-1 w-px flex-1" style={{ background: 'var(--pse-line)' }} />}
                    </div>
                    <div className="pb-1">
                      <p className="text-[14px] font-semibold" style={{ color: 'var(--pse-text)' }}>{t}</p>
                      <p className="pse-micro">{d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <p className="pse-eyebrow">Referral capacity</p>
            <h2 className="pse-h2 mt-2">+£0.30/hour per qualified referral</h2>
            <p className="pse-caption mt-4">
              A referral only counts once it is qualified on the backend — after your invite registers, connects a wallet,
              and activates their first tool. Five referral slots maximum, worth +£1.50/hour at full capacity.
              Capacity changes always apply from the qualification time forward, never retroactively.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════ CAMPAIGN TIMELINE ═══════════ */}
      <section className="pse-section py-16 md:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="pse-eyebrow">Campaign timeline</p>
          <h2 className="pse-h2 mt-2">One 90-day arc, four phases</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            { icon: Clock, t: 'Day 0', h: 'Campaign start', d: 'Purchases open and tools begin their operating cycles.' },
            { icon: Cog, t: 'Days 1–90', h: 'Operations', d: 'Cycles run, maintenance keeps tools active, capacity accrues hourly.' },
            { icon: Repeat, t: 'Day 90', h: 'Settlement', d: 'Accrual stops. Final balances are calculated from the mining ledger.' },
            { icon: Landmark, t: 'After day 90', h: 'Payout', d: 'Reviewed payouts are sent to configured BNB Smart Chain wallets.' },
          ].map((p, i) => {
            const Icon = p.icon;
            return (
              <div key={p.h} className="pse-card relative p-6">
                <span className="pse-eyebrow">{p.t}</span>
                <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(139,124,246,0.10)', border: '1px solid rgba(139,124,246,0.25)' }}>
                  <Icon size={16} style={{ color: 'var(--pse-purple)' }} />
                </div>
                <p className="pse-h3 mt-3">{p.h}</p>
                <p className="pse-caption mt-1.5">{p.d}</p>
                {i < 3 && <CircleDot size={12} className="absolute right-4 top-6 hidden md:block" style={{ color: 'var(--pse-text-3)' }} />}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ WALLET / BNB PAYMENT ═══════════ */}
      <section className="border-y py-16 md:py-20" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
        <div className="pse-section">
          <div className="mb-10 max-w-2xl">
            <p className="pse-eyebrow">Paying with BNB</p>
            <h2 className="pse-h2 mt-2">Quotes, exact amounts, on-chain verification</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              { icon: Wallet, h: 'Live quote', d: 'Every purchase starts with a server-generated quote: the fixed GBP price converted to an exact BNB amount at the live rate. Quotes expire in 15 minutes.' },
              { icon: Layers, h: 'Exact transfer', d: 'You send the quoted BNB amount to the campaign\u2019s receiving wallet on BNB Smart Chain from your connected wallet. Underpayments are caught by verification.' },
              { icon: ShieldCheck, h: 'Backend verification', d: 'The backend verifies the transaction hash on-chain — sender, recipient, amount, and confirmation depth — before activating anything. The app never self-confirms a payment.' },
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
        </div>
      </section>

      {/* ═══════════ SECURITY / VERIFICATION ═══════════ */}
      <section className="pse-section py-16 md:py-20">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="pse-eyebrow">Security & verification</p>
            <h2 className="pse-h2 mt-2">Server-authoritative by design</h2>
            <p className="pse-caption mt-4">
              PSEmine is built so that no value in the app can be claimed, forged, or double-counted from the client side.
              The browser displays state; the backend computes it.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: Lock, t: 'Ledger-based balances', d: 'Earnings live in an append-only mining ledger with deterministic entries — not in editable client fields.' },
              { icon: ShieldCheck, t: 'On-chain payment proofs', d: 'Purchases activate only after the backend verifies the BNB transaction on BNB Smart Chain, with replay protection.' },
              { icon: Wrench, t: 'Enforced operating cycles', d: 'Cycle state, maintenance, and accrual windows are derived and validated on the server at every step.' },
              { icon: Users, t: 'Single qualification path', d: 'Referrals qualify once, through one auditable backend path, with anti-abuse checks.' },
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
      <section className="border-t py-16 md:py-20" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section max-w-3xl">
          <div className="mb-10">
            <p className="pse-eyebrow">FAQ</p>
            <h2 className="pse-h2 mt-2">Frequently asked questions</h2>
          </div>
          <div className="space-y-2.5">
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
        <div className="pse-section py-16 text-center md:py-20">
          <h2 className="pse-h2 mx-auto max-w-xl">The campaign runs for 90 days. Capacity accrues every operating hour.</h2>
          <p className="pse-caption mx-auto mt-3 max-w-md">
            {purchaseEnabled
              ? 'Purchase a tool, keep it in cycle, and let the campaign settle your earnings at the end.'
              : 'Purchases are currently closed. The guide explains how the campaign works while you wait.'}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={currentUser ? '/mine/dashboard' : '/mine/signup'} className="pse-btn pse-btn-primary pse-btn-lg w-full sm:w-auto">
              {currentUser ? 'Open your console' : 'Create your account'} <ArrowRight size={15} />
            </Link>
            <Link to="/mine/tools" className="pse-btn pse-btn-secondary pse-btn-lg w-full sm:w-auto">Browse tools</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

function CompositionRow({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="pse-caption">{label}</span>
        <span className="pse-num text-[14px] font-semibold">{value}</span>
      </div>
      <div className="pse-meter">
        <div className="pse-meter-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default PSEMineLanding;
