import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Clock, Wallet, Cog, Users, Check, ChevronDown,
  Landmark, LineChart, Lock, Wrench, Layers, ServerCog, Gauge,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import { LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS } from '../../types/psemine';
import {
  gbp, gbpHour, Chip, Meter, campaignStatusView, usePseDocumentTitle,
  ChapterHead, ListGroup, ListRow,
} from '../../components/psemine/pse';
import { MinerArt } from '../../components/psemine/PSEBrand';
import { cn } from '../../utils';

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const MAX_TOOL = PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR;
const MAX_REF = PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR;
const MAX_ALL = PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR;

/** The full product journey, in the order a user actually experiences it. */
const JOURNEY = [
  { icon: Wallet, title: 'Connect', body: 'Link a BNB Smart Chain wallet — MetaMask, Trust Wallet, or any WalletConnect wallet.' },
  { icon: Layers, title: 'Choose a mining tool', body: 'Four tiers, from a compact entry unit to the flagship system. Fixed GBP prices.' },
  { icon: Landmark, title: 'Purchase with BNB', body: 'A server quote converts the fixed price to an exact BNB amount. You send exactly that.' },
  { icon: Cog, title: 'Tool activates', body: 'The backend verifies the transaction on-chain, then activates the tool on your account.' },
  { icon: Gauge, title: 'Capacity accrues earnings', body: 'Each tool holds a fixed hourly GBP rate while its 24-hour operating cycle runs.' },
  { icon: ServerCog, title: 'Campaign settles', body: 'At day 90 accrual stops and final balances are computed from the mining ledger.' },
  { icon: LineChart, title: 'Payout', body: 'Reviewed settlement requests are paid in BNB to your configured payout wallet.' },
];

const PHASES = [
  { icon: Clock, phase: 'Day 0', title: 'Campaign start', detail: 'Purchases open. Each tool begins its first 24-hour operating cycle.' },
  { icon: Cog, phase: 'Days 1–90', title: 'Operations', detail: 'Cycles run, free maintenance restarts them, capacity accrues hourly.' },
  { icon: ServerCog, phase: 'Day 90', title: 'Settlement', detail: 'Accrual stops. Final balances are computed from the mining ledger.' },
  { icon: Landmark, phase: 'After day 90', title: 'Payout', detail: 'Reviewed requests are paid to configured BNB Smart Chain wallets.' },
];

const PAYMENT_STEPS = [
  {
    title: 'The price is quoted, not estimated',
    body: `A tool costs ${gbp(3)}–${gbp(200)} in GBP. A server-generated quote converts that fixed price to an exact BNB amount at the live rate and binds it to your account for a short window.`,
  },
  {
    title: 'You send exactly that amount',
    body: `The transfer goes to the campaign receiving wallet on BNB Smart Chain (chain ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}) from the wallet you connected. Underpayment and wrong-recipient transfers are detected rather than accepted.`,
  },
  {
    title: 'The backend verifies on-chain, then activates',
    body: 'Sender, recipient, exact amount and confirmation depth are checked against the quote before the tool activates. Replay protection stops one transaction being claimed twice. The browser never confirms its own payment.',
  },
  {
    title: 'Earnings settle, then pay out',
    body: 'Mid-campaign balances are accruals, not withdrawable funds. At day 90 accrual stops, the ledger is finalised, and reviewed payout requests are paid in BNB to your configured payout wallet.',
  },
];

const TRUST = [
  { icon: Lock, t: 'Balances live in a ledger', d: 'Earnings are deterministic entries in an append-only mining ledger, not editable client fields.' },
  { icon: Wrench, t: 'Operating cycles are enforced server-side', d: 'Cycle state, maintenance and accrual windows are derived and validated on the server at every step. Maintenance is always free.' },
  { icon: Users, t: 'One referral qualification path', d: 'A referral qualifies once, through a single auditable backend path with anti-abuse checks, and adds +£0.30/hour for the rest of the campaign.' },
  { icon: ServerCog, t: 'Separate product, shared sign-in', d: 'A PSEmine session never triggers PulseEarn points, tasks or rewards. The account is shared; the product behaviour is not.' },
];

const FAQS = [
  { q: 'What exactly is PSEmine?', a: 'PSEmine is a 90-day, campaign-based mining product. You buy mining tools with BNB, the tools provide hourly capacity denominated in GBP, and the campaign settles accrued earnings after it ends.' },
  { q: 'Do I need to run hardware?', a: 'No. Tools represent capacity operated by PSEmine. You never manage hardware, electricity or hosting.' },
  { q: 'Why are prices fixed in GBP?', a: 'Tool prices and hourly rates are fixed in GBP so your capacity is predictable. You pay the fixed GBP price in BNB at the live rate at the moment you request a quote.' },
  { q: 'How big can my capacity get?', a: `Tool capacity is capped at ${gbpHour(MAX_TOOL)}. Each qualified referral adds +£0.30/hour, up to 5 referrals (+${gbpHour(MAX_REF)}). The maximum total capacity is ${gbpHour(MAX_ALL)}.` },
  { q: 'When can I withdraw earnings?', a: 'Accrued earnings are campaign earnings: they settle after the campaign ends. Payout requests open at settlement and are paid to your configured BNB Smart Chain wallet after review.' },
  { q: 'What does maintenance cost?', a: 'Nothing. Maintenance is a free action that restarts a completed operating cycle. A tool that sits too long after its cycle completes needs the same free maintenance before it resumes accruing.' },
  { q: 'Is this the same as PulseEarn?', a: 'They share one sign-in identity and nothing else. PSEmine has its own tools, GBP accounting, activity, notifications and payouts; PulseEarn points, tasks and rewards never apply here.' },
];

/**
 * PSEMineLanding — the PUBLIC marketing surface.
 *
 * Boundary rules (enforced in code, not by convention):
 *   • No authenticated-app navigation and no deep links into /mine/* app
 *     routes. Every CTA leads to the auth entry (or back into the console for
 *     a signed-in visitor) or to a public informational destination.
 *   • The story follows the product: hero → the real product interface →
 *     the journey → the four tools (with their product identities) →
 *     capacity → campaign → money path → security → FAQ → final CTA.
 *   • Every figure is a fixed campaign constant or real backend state.
 */
export const PSEMineLanding: React.FC = () => {
  const { campaign } = usePSEMine();
  const { currentUser } = usePSEMineAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  usePseDocumentTitle('90-day mining campaign');

  const status = campaign?.status ?? 'scheduled';
  const statusView = campaignStatusView(status);
  const purchaseEnabled = campaign?.purchaseEnabled !== false;

  const primaryHref = currentUser ? '/mine/dashboard' : '/mine/signup';
  const primaryLabel = currentUser ? 'Open your console' : 'Start Mining';

  return (
    <div>
      {/* ═══════════ HERO ═══════════ */}
      <section className="pse-hero-surface border-b" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section pse-band-lg">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip label={`Campaign ${statusView.label.trim()}`} chip={statusView.chip} pulse={statusView.live} />
                <Chip label="90 days" chip="pse-chip pse-chip-neutral" dot={false} />
                <Chip label="GBP accounting" chip="pse-chip pse-chip-neutral" dot={false} />
              </div>

              <h1 className="pse-h1 mt-7" style={{ fontSize: 'clamp(32px, 4.6vw, 52px)' }}>
                Mine with capacity.<br />
                <span style={{ color: 'var(--pse-blue)' }}>Settle in GBP.</span>
              </h1>

              <p className="pse-lead pse-measure mt-5">
                PSEmine is a 90-day mining campaign. Buy tools with BNB, hold a fixed hourly GBP capacity, and let the
                campaign settle your accrued earnings when it ends. Fixed rates, on-chain verification,
                server-authoritative accounting.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={primaryHref} className="pse-btn pse-btn-primary pse-btn-lg justify-center">
                  {primaryLabel} <ArrowRight size={15} />
                </Link>
                <a href="#how-it-works" className="pse-btn pse-btn-secondary pse-btn-lg justify-center">
                  How It Works
                </a>
              </div>

              <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-6 sm:grid-cols-3"
                style={{ borderColor: 'var(--pse-line)' }}>
                {[
                  { k: 'Entry price', v: gbp(3) },
                  { k: 'Peak capacity', v: gbpHour(MAX_ALL) },
                  { k: 'Campaign length', v: '90 days' },
                ].map(f => (
                  <div key={f.k}>
                    <dt className="pse-eyebrow">{f.k}</dt>
                    <dd className="pse-num mt-1.5 text-[17px] font-semibold" style={{ color: 'var(--pse-text)' }}>{f.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* PRODUCT VISUAL — the actual operator console, rendered from the
                same primitives the app uses. Real constants, no mock metrics. */}
            <div className="pse-surface-accent">
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--pse-line)' }}>
                <div>
                  <p className="pse-eyebrow">Mining console</p>
                  <p className="pse-caption mt-1">The operator workspace you get inside.</p>
                </div>
                <Chip label={statusView.label.trim()} chip={statusView.chip} pulse={statusView.live} />
              </div>

              <div className="px-5 pt-5">
                <p className="pse-eyebrow">Accrued campaign earnings</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="pse-fig-hero">£0.00</span>
                  <span className="pse-micro" style={{ color: 'var(--pse-text-3)' }}>at day 0</span>
                </div>
              </div>

              <div className="px-5 pt-5 pb-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="pse-eyebrow">Capacity composition</p>
                  <p className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{gbpHour(MAX_TOOL)}</p>
                </div>
                <div className="mt-2.5"><Meter value={(MAX_TOOL / MAX_ALL) * 100} label="Tool capacity against the campaign maximum" /></div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="pse-micro">Tools <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(MAX_TOOL)}</span></span>
                  <span className="pse-micro">Referrals <span className="pse-num" style={{ color: 'var(--pse-text-2)' }}>+{gbpHour(MAX_REF)}</span></span>
                </div>
              </div>

              <div className="border-t px-2.5 py-2.5" style={{ borderColor: 'var(--pse-line)' }}>
                {TOOLS.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-2.5 py-2">
                    <MinerArt tier={t.tier as 1 | 2 | 3 | 4} size={34} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="pse-section-sm">{t.name}</p>
                      <p className="pse-micro mt-0.5">Limit {t.maxPerUser} · {gbpHour(t.hourlyRateGBP)}/hr</p>
                    </div>
                    <span className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-text)' }}>{gbp(t.purchasePriceGBP)}</span>
                  </div>
                ))}
              </div>

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

      {/* ═══════════ HOW IT WORKS — the full journey ═══════════ */}
      <section id="how-it-works" className="pse-section pse-band-lg scroll-mt-20">
        <ChapterHead
          no="01"
          size="xl"
          title="From wallet to payout, in seven steps"
          meta="No hardware, no hosting, no electricity. The campaign operates the tools; you hold the capacity."
        />

        <ListGroup className="mt-10 max-w-3xl">
          {JOURNEY.map((step, i) => {
            const Icon = step.icon;
            return (
              <ListRow
                key={step.title}
                n={i + 1}
                icon={Icon}
                title={step.title}
                body={step.body}
                right={i === JOURNEY.length - 1
                  ? <Check size={15} style={{ color: 'var(--pse-success)' }} />
                  : <ArrowRight size={14} style={{ color: 'var(--pse-text-3)' }} />}
              />
            );
          })}
        </ListGroup>
      </section>

      {/* ═══════════ MINING TOOLS — the four product identities ═══════════ */}
      <section id="tools" className="border-y pse-band-lg scroll-mt-20" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
        <div className="pse-section">
          <ChapterHead
            no="02"
            size="xl"
            title="Four tiers. One 24-hour operating cycle."
            meta="Fixed economics for the whole campaign — no dynamic pricing, no auctions, no hardware to run."
          />

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map(t => (
              <div key={t.id} className="pse-card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <MinerArt tier={t.tier as 1 | 2 | 3 | 4} size={84} className="shrink-0" />
                  <span className="pse-num pse-fig-lg" style={{ color: 'var(--pse-text)' }}>{gbp(t.purchasePriceGBP)}</span>
                </div>
                <p className="pse-section-sm mt-3">{t.name}</p>
                <p className="pse-micro mt-1 flex-1">{t.tagline}</p>
                <div className="mt-4 flex items-baseline justify-between border-t pt-3" style={{ borderColor: 'var(--pse-line)' }}>
                  <span className="pse-micro">Hourly capacity</span>
                  <span className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP)}</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="pse-micro">Ownership limit</span>
                  <span className="pse-num pse-caption">{t.maxPerUser} per account</span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="pse-micro">At limit</span>
                  <span className="pse-num pse-caption" style={{ color: 'var(--pse-text-2)' }}>{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pse-quiet mt-3 overflow-hidden">
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
                      <td><span className="pse-tier" aria-hidden="true">{t.tier}</span></td>
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
            {/* Mobile: one row per tool, no clipped table. */}
            <ul className="md:hidden">
              {TOOLS.map(t => (
                <li key={t.id} className="border-t px-5 py-4 first:border-t-0" style={{ borderColor: 'var(--pse-line)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="pse-section-sm flex items-center gap-2.5">
                      <MinerArt tier={t.tier as 1 | 2 | 3 | 4} size={30} className="shrink-0" />
                      {t.name}
                    </span>
                    <span className="pse-num pse-caption font-semibold">{gbp(t.purchasePriceGBP)}</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="pse-micro">Capacity <span className="pse-num" style={{ color: 'var(--pse-blue)' }}>{gbpHour(t.hourlyRateGBP)}</span></span>
                    <span className="pse-micro">Limit <span className="pse-num">{t.maxPerUser}</span></span>
                    <span className="pse-micro">At limit <span className="pse-num">{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</span></span>
                  </div>
                </li>
              ))}
              <li className="border-t px-5 py-4" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-inset)' }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="pse-section-sm">Maximum tool capacity</span>
                  <span className="pse-num pse-fig-md" style={{ color: 'var(--pse-cyan)' }}>{gbpHour(MAX_TOOL)}</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="pse-micro flex items-center gap-1.5"><Clock size={12} /> 24-hour operating cycles</span>
            <span className="pse-micro flex items-center gap-1.5"><Wrench size={12} /> Maintenance always free</span>
            <span className="pse-micro flex items-center gap-1.5"><ShieldCheck size={12} /> Activation only after on-chain verification</span>
          </div>
        </div>
      </section>

      {/* ═══════════ CAPACITY ═══════════ */}
      <section className="pse-section pse-band-lg">
        <ChapterHead
          no="03"
          size="lg"
          title="Your hourly rate is the sum of exactly two things"
          meta="Tool capacity plus qualified referral capacity. The backend computes every figure; the app only displays what the server reports."
        />

        <div className="mt-9 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-14">
          <div className="space-y-6">
            <ListGroup>
              <ListRow
                n="A"
                title={`Tool capacity — capped at ${gbpHour(MAX_TOOL)}`}
                body="The four tiers are additive. Your own purchase limits per tier bound how much of that cap one account can reach."
                right={<Check size={15} style={{ color: 'var(--pse-success)' }} />}
              />
              <ListRow
                n="B"
                title={`Referral capacity — +£0.30/hour each, up to 5`}
                body={`Every qualified referral adds a fixed £0.30/hour for the remainder of the campaign, worth ${gbpHour(MAX_REF)} at full occupancy.`}
                right={<Check size={15} style={{ color: 'var(--pse-success)' }} />}
              />
            </ListGroup>

            <div className="pse-quiet p-5">
              <p className="pse-eyebrow">How a referral qualifies</p>
              <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {['Registered', 'Wallet connected', 'Tool purchased', 'Mining active', 'Qualified'].map((s, i) => (
                  <li key={s} className="pse-micro flex items-baseline gap-1.5">
                    <span className="pse-num" style={{ color: 'var(--pse-text-3)' }}>{i + 1}.</span> {s}
                  </li>
                ))}
              </ol>
              <p className="pse-micro mt-4">
                Qualification settles once on the backend, from the qualification moment forward — never retroactively.
                Five slots maximum.
              </p>
            </div>
          </div>

          <div className="pse-quiet p-6">
            <p className="pse-eyebrow">Peak capacity composition</p>
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="pse-caption">Tools (all tiers at limit)</span>
                  <span className="pse-num pse-caption font-semibold">{gbpHour(MAX_TOOL)}</span>
                </div>
                <div className="mt-2"><Meter value={(MAX_TOOL / MAX_ALL) * 100} label="Tool capacity share" /></div>
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="pse-caption">Referrals (5 qualified)</span>
                  <span className="pse-num pse-caption font-semibold">+{gbpHour(MAX_REF)}</span>
                </div>
                <div className="mt-2"><Meter value={(MAX_REF / MAX_ALL) * 100} tone="purple" label="Referral capacity share" /></div>
              </div>
            </div>
            <div className="pse-verdict mt-7">
              <p className="pse-eyebrow">Maximum total capacity</p>
              <p className="pse-fig-hero mt-2">{gbpHour(MAX_ALL)}</p>
              <p className="pse-micro mt-2">
                Accrual depends on active operating cycles — a tool between cycles does not accrue until maintenance
                restarts it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CAMPAIGN TIMELINE ═══════════ */}
      <section className="border-y pse-band-lg" style={{ borderColor: 'var(--pse-line)', background: 'var(--pse-surface)' }}>
        <div className="pse-section">
          <ChapterHead
            no="04"
            size="lg"
            title="One 90-day arc, four phases"
            meta="The phase you are in is always visible in the console, derived from backend campaign state."
          />

          <ol className="mt-9 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4"
            style={{ background: 'var(--pse-line)' }}>
            {PHASES.map((p, i) => {
              const Icon = p.icon;
              return (
                <li key={p.title} className="p-5" style={{ background: 'var(--pse-surface)' }}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="pse-eyebrow">{p.phase}</span>
                    <Icon size={15} style={{ color: 'var(--pse-purple)' }} />
                  </div>
                  <p className="pse-section-sm mt-3">{p.title}</p>
                  <p className="pse-caption mt-2">{p.detail}</p>
                  <span className="pse-micro mt-4 block" style={{ color: 'var(--pse-text-3)' }}>Phase {i + 1} of 4</span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ═══════════ WALLET / PAYOUT — the money path ═══════════ */}
      <section className="pse-section pse-band-lg">
        <ChapterHead
          no="05"
          size="xl"
          title="Quoted in GBP, paid in BNB, verified on-chain"
          meta="This is the whole money path. It is the same sequence every time you buy a tool or receive a payout — nothing here is estimated by the browser."
        />

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:gap-14">
          <ListGroup>
            {PAYMENT_STEPS.map((s, i) => (
              <ListRow key={s.title} n={i + 1} title={s.title} body={s.body} />
            ))}
          </ListGroup>

          <div className="space-y-5">
            <div className="pse-quiet p-5">
              <p className="pse-eyebrow">Currency boundary</p>
              <dl className="mt-4 space-y-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="pse-caption">Campaign accounting</dt>
                  <dd className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-blue)' }}>GBP</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="pse-caption">Payment and payout asset</dt>
                  <dd className="pse-num pse-caption font-semibold" style={{ color: 'var(--pse-cyan)' }}>BNB</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="pse-caption">Network</dt>
                  <dd className="pse-caption font-semibold">BNB Smart Chain</dd>
                </div>
              </dl>
              <p className="pse-micro mt-4">
                Your earnings are GBP campaign balances. They are never a crypto balance until a payout is executed, and
                the wallet screen keeps those two apart.
              </p>
            </div>

            <div className="pse-quiet p-5">
              <p className="pse-eyebrow">What the browser is allowed to do</p>
              <ul className="mt-4 space-y-2.5">
                {[
                  'Request a quote from the backend',
                  'Display the exact amount to send',
                  'Show verification status after the backend checks the chain',
                ].map(x => (
                  <li key={x} className="pse-caption flex items-start gap-2.5">
                    <Check size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} /> {x}
                  </li>
                ))}
                <li className="pse-caption flex items-start gap-2.5">
                  <Lock size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-text-3)' }} />
                  It cannot set a price, approve a payment or activate a tool.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ SECURITY ═══════════ */}
      <section className="border-t pse-band-lg" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <ChapterHead
              no="06"
              size="lg"
              title="The browser displays state. The backend owns it."
              meta="No value in the app can be claimed, forged or double-counted from the client. Product access is an explicit, backend-enforced entitlement — separate from PulseEarn, even though both products share one sign-in identity."
            />
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link to={primaryHref} className="pse-btn pse-btn-secondary pse-btn-sm">
                <ShieldCheck size={13} /> {primaryLabel}
              </Link>
              <Link to="/help" className="pse-btn pse-btn-ghost pse-btn-sm">Contact support</Link>
            </div>
          </div>

          <ListGroup>
            {TRUST.map(x => (
              <ListRow key={x.t} icon={x.icon} title={x.t} body={x.d} />
            ))}
          </ListGroup>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="faq" className="pse-section pse-band-lg scroll-mt-20">
        <ChapterHead
          no="07"
          size="lg"
          title="Questions operators ask before their first purchase"
          meta="If something here is unclear, support can help — and the guide inside the product goes deeper."
        />

        <div className="pse-list-group mt-9 max-w-3xl">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="border-t first:border-t-0" style={{ borderColor: 'var(--pse-line)' }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
                  aria-expanded={open}
                >
                  <span className="pse-section-sm">{f.q}</span>
                  <ChevronDown size={16} className={cn('shrink-0 transition-transform', open && 'rotate-180')}
                    style={{ color: 'var(--pse-text-3)' }} />
                </button>
                {open && <p className="pse-caption pse-measure px-5 pb-5">{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ FINAL CTA — back to the auth entry ═══════════ */}
      <section className="pse-hero-surface border-t" style={{ borderColor: 'var(--pse-line)' }}>
        <div className="pse-section pse-band text-center">
          <h2 className="pse-section-lg mx-auto max-w-xl">
            The campaign runs for 90 days. Capacity accrues every operating hour.
          </h2>
          <p className="pse-caption pse-measure mx-auto mt-3 max-w-md">
            {purchaseEnabled
              ? 'Buy a tool, keep it in cycle, and let the campaign settle your earnings at the end.'
              : 'Purchases are currently closed. You can still create an account and explore the campaign while you wait.'}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {currentUser ? (
              <Link to="/mine/dashboard" className="pse-btn pse-btn-primary pse-btn-lg w-full justify-center sm:w-auto">
                Open your console <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link to="/mine/signup" className="pse-btn pse-btn-primary pse-btn-lg w-full justify-center sm:w-auto">
                  Create account <ArrowRight size={15} />
                </Link>
                <Link to="/mine/login" className="pse-btn pse-btn-secondary pse-btn-lg w-full justify-center sm:w-auto">
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default PSEMineLanding;
