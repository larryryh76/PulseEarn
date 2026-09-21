import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, Lock, Menu, ShieldCheck, X,
} from 'lucide-react';
import { usePSEMine } from '../../contexts/PSEMineContext';
import { usePSEMineAuth } from '../../contexts/usePSEMineAuth';
import {
  LOCKED_PSEMINE_TOOLS, PSEMINE_CONSTANTS, type PSEToolTierId,
} from '../../types/psemine';
import { campaignStatusView, gbp, gbpHour, PSELogo, usePseDocumentTitle } from '../../components/psemine/pse';
import {
  CampaignLifecycle, CapacityBuilder, ConnectWalletVisual, ConsolePreview, MiningStates,
  PaymentVisual, ReferralProgression, SettlementVisual, StatePill, ToolComparison, WalletZones,
  AccrualVisual, MarketplaceVisual, type MiningState,
} from '../../components/psemine/PseLandingVisuals';
import { MinerArt } from '../../components/psemine/PSEBrand';

/**
 * PSEMineLanding — the public product introduction at /mine.
 *
 * This is its own composition (OWNER-BRIEF §4): it renders outside the
 * authenticated console shell, with its own header, section rhythm and footer,
 * and it never borrows the dashboard's card grid. The only thing it shares with
 * the console is the design system and the domain model.
 *
 * Data rules (OWNER-BRIEF §23):
 *   • Campaign status, day, duration, chain, quote window and every price,
 *     hourly rate, ownership limit and capacity ceiling come from real fields
 *     (`PSEMineCampaign`, `LOCKED_PSEMINE_TOOLS`, `PSEMINE_CONSTANTS`).
 *   • No users, earnings, purchases, referrals, payouts, provider figures or
 *     campaign statistics are invented anywhere on this page.
 *   • The hero console preview is the single conceptual product visual. It uses
 *     documented example holdings and an example campaign day, and it says so in
 *     its own footer. Where the console has no data, sections show designed
 *     empty states instead of numbers.
 */

const TOOLS = Object.values(LOCKED_PSEMINE_TOOLS).sort((a, b) => a.displayOrder - b.displayOrder);
const TOOL_BY_ID = LOCKED_PSEMINE_TOOLS;

/* NOTE: `LOCKED_PSEMINE_TOOLS[tier].specs` (powerEfficiency / hashRateClass) is
   deliberately NOT rendered anywhere on this page. OWNER-BRIEF §9 forbids
   publishing invented hardware specifications, and those strings are exactly
   that. Only price, hourly capacity and ownership limits — the verified
   economics — are shown. */

/**
 * The hero preview shows the product in its true starting state (OWNER-BRIEF
 * §23). A visitor who has bought nothing holds nothing, so the preview renders
 * zero tools, £0.00/hour of capacity, £0.00 accrued and an empty activity feed
 * — the same figures the console shows on day 0. No example holdings, example
 * campaign day or example earnings are rendered anywhere on this page.
 */
const NO_HOLDINGS: Record<PSEToolTierId, number> = { starter: 0, builder: 0, advanced: 0, elite: 0 };
/** Real mining activity only — the public landing has none before a purchase. */
const NO_ACTIVITY: Array<{ title: string; detail: string; amount: string; tone: string }> = [];

const HOW_IT_WORKS: Array<{
  no: string; title: string; body: string; visual: React.ReactNode;
}> = [
  {
    no: '01',
    title: 'Connect your wallet',
    body: 'Connect the BNB Smart Chain wallet you will pay from. The connected address is recorded as the payer of your purchase — it is never set by the browser.',
    visual: <ConnectWalletVisual />,
  },
  {
    no: '02',
    title: 'Choose mining capacity',
    body: `Four fixed tiers, priced ${gbp(3)}–${gbp(200)}, providing ${gbp(0.10)}–${gbp(2.50)} of hourly capacity each. Ownership limits per tier cap how much one account can hold.`,
    visual: <MarketplaceVisual />,
  },
  {
    no: '03',
    title: 'Purchase with BNB',
    body: `The backend quotes the fixed GBP price in BNB at the live rate and binds it to your account for ${PSEMINE_CONSTANTS.QUOTE_EXPIRATION_MINUTES} minutes. You send exactly that amount.`,
    visual: <PaymentVisual />,
  },
  {
    no: '04',
    title: 'Mining begins',
    body: 'Once the transfer is verified on-chain the tool activates and starts a 24-hour operating cycle. Capacity accrues hourly while the cycle is active; free maintenance restarts a finished cycle.',
    visual: <AccrualVisual />,
  },
  {
    no: '05',
    title: 'The campaign settles',
    body: `At day ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS} accrual stops and final balances are computed from the mining ledger. Reviewed payout requests are paid in BNB to your payout wallet.`,
    visual: <SettlementVisual />,
  },
];

const CAPACITY_FLOW = [
  { label: 'Owned tools', value: 'per tier', note: 'Each tool contributes its fixed hourly rate for as long as it holds an active cycle.' },
  { label: 'Tool capacity', value: gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR), note: 'The ceiling across all four tiers at their ownership limits.' },
  { label: 'Qualified referrals', value: `+${gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}`, note: `${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} × ${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)} added once each referral qualifies.` },
  { label: 'Total capacity', value: gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR), note: `Tools ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)} plus up to ${gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)} from qualified referrals.` },
  { label: 'Hourly earnings', value: 'GBP ledger', note: 'Accrual is written to the mining ledger by the backend, hourly, against active capacity.' },
];

const SECURITY_ITEMS = [
  { t: 'Balances live in a server-side ledger', d: 'Earnings are deterministic entries in an append-only mining ledger. No client field can be edited into a balance.' },
  { t: 'Payments are verified, not asserted', d: 'Sender, recipient, exact amount and confirmation depth are checked against the server quote before a tool activates. Replay protection stops one transaction being claimed twice.' },
  { t: 'The browser cannot price or approve', d: 'It may request a quote, display the amount to send and show verification status. It cannot set a price, approve a payment or activate a tool.' },
  { t: 'Operating cycles are enforced server-side', d: 'Cycle state, maintenance and accrual windows are derived and validated on the server at every step. Maintenance is always free.' },
  { t: 'One qualification path for referrals', d: 'A referral qualifies once, through a single auditable backend path with anti-abuse checks — never retroactively.' },
  { t: 'Separate product, shared sign-in', d: 'A PSEmine session never triggers PulseEarn points, tasks or rewards. The account is shared; the product behaviour is not.' },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'What exactly is PSEmine?',
    a: `PSEmine is a ${PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS}-day, campaign-based mining product. You buy mining tools with BNB, each tool provides a fixed hourly capacity denominated in GBP, and the campaign settles accrued earnings after it ends.`,
  },
  {
    q: 'Do I run hardware myself?',
    a: 'No. Tools represent capacity operated for the campaign. You never manage hardware, electricity or hosting — the campaign runs the operations.',
  },
  {
    q: 'Why are prices fixed in GBP?',
    a: 'Tool prices and hourly rates are fixed in GBP so your capacity is predictable. You pay the fixed GBP price in BNB at the live rate quoted when you request a purchase.',
  },
  {
    q: 'How is my hourly capacity calculated?',
    a: `Tool capacity is the sum of your owned tools, capped at ${gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}. Each qualified referral adds ${gbpHour(PSEMINE_CONSTANTS.REFERRAL_BONUS_GBP_PER_HOUR)}/hour, up to ${PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} referrals (+${gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}). The maximum total capacity is ${gbpHour(PSEMINE_CONSTANTS.MAX_THEORETICAL_CAPACITY_GBP_PER_HOUR)}.`,
  },
  {
    q: 'When can I withdraw earnings?',
    a: 'Accrued earnings are campaign earnings: they settle after the campaign ends. Payout requests open at settlement and are paid to your configured BNB Smart Chain wallet after review.',
  },
  {
    q: 'What does maintenance cost?',
    a: 'Nothing. Maintenance is a free action that restarts a completed operating cycle. A tool that sits idle after its cycle completes needs the same free maintenance before it resumes accruing.',
  },
  {
    q: 'Which network are payments made on?',
    a: `Payments and payouts are made on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} in BNB (chain ${PSEMINE_CONSTANTS.DEFAULT_BSC_CHAIN_ID}). Campaign balances stay in GBP until a payout is executed.`,
  },
  {
    q: 'Is this the same product as PulseEarn?',
    a: 'They share one sign-in identity and nothing else. PSEmine has its own tools, GBP accounting, ledger, activity and payouts; PulseEarn points, tasks and rewards never apply here.',
  },
];

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#marketplace', label: 'Mining tools' },
  { href: '#capacity', label: 'Capacity' },
  { href: '#referrals', label: 'Referrals' },
  { href: '#campaign', label: 'Campaign' },
  { href: '#security', label: 'Security' },
];

const STATE_BY_STATUS: Record<string, MiningState> = {
  active: 'active',
  paused: 'paused',
  settling: 'settling',
  payout: 'settling',
  closed: 'ended',
  archived: 'ended',
};

export const PSEMineLanding: React.FC = () => {
  const { campaign } = usePSEMine();
  const { currentUser } = usePSEMineAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stuck, setStuck] = useState(false);

  usePseDocumentTitle('90-day mining campaign');

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const rawStatus = campaign?.status ?? 'scheduled';
  const miningState: MiningState = STATE_BY_STATUS[rawStatus] ?? 'ended';
  /* Campaign status wording comes from the same shared view every PSEmine
     surface uses, so the landing and the console cannot disagree about it. */
  const statusView = campaignStatusView(campaign?.status);
  const stateLabel = statusView.label.trim();
  const durationDays = campaign?.durationDays ?? PSEMINE_CONSTANTS.CAMPAIGN_DURATION_DAYS;

  /** Real campaign day when one is running; otherwise the documented example. */
  const realDay = useMemo(() => {
    if (!campaign?.startAt) return null;
    if (!['active', 'paused', 'settling', 'payout'].includes(rawStatus)) return null;
    const start = new Date(campaign.startAt).getTime();
    if (!Number.isFinite(start)) return null;
    const days = Math.floor((Date.now() - start) / 86400000);
    return Math.max(0, Math.min(durationDays, days));
  }, [campaign?.startAt, rawStatus, durationDays]);

  /* Day 0 is the honest value before the campaign window opens. */
  const dayIndex = realDay ?? 0;

  const primaryHref = currentUser ? '/mine/dashboard' : '/mine/signup';
  const primaryLabel = currentUser ? 'Open your console' : 'Start Mining';
  const purchaseHref = currentUser ? '/mine/tools' : '/mine/signup';
  const purchaseEnabled = campaign?.purchaseEnabled !== false;

  const featured = TOOL_BY_ID.starter;
  const flagship = TOOL_BY_ID.elite;
  /** Row 2 carries the third tier beside the flagship — the second tier is
      already presented in row 1, so it is never repeated. */
  const row2Tiers: PSEToolTierId[] = ['advanced'];

  return (
    <div className="pse-scope pse-land">
      {/* ═══════════ Header — the landing's own chrome, not the console's ═══════════ */}
      <header className="pse-land-head" data-stuck={stuck} data-pse-section="header">
        <div className="pse-wrap-x">
          <div className="pse-land-head-row">
            <Link to="/mine" className="pse-land-brand">
              <PSELogo size={28} />
              <span>
                <span className="pse-land-brand-name">PSEMine</span>
                <span className="pse-land-brand-sub">90-day campaign</span>
              </span>
            </Link>

            <nav className="pse-land-nav" aria-label="PSEmine landing">
              {NAV.map(n => (
                <a key={n.href} href={n.href}>{n.label}</a>
              ))}
            </nav>

            <div className="pse-land-head-actions">
              <Link to="/mine/login" className="pse-btn pse-btn-quiet pse-btn-sm hidden sm:inline-flex">
                Sign in
              </Link>
              <Link to={primaryHref} className="pse-btn pse-btn-primary pse-btn-sm">
                {primaryLabel}
              </Link>
              <button
                type="button"
                className="pse-land-burger"
                aria-expanded={menuOpen}
                aria-controls="pse-land-sheet"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen(v => !v)}
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="pse-land-sheet" id="pse-land-sheet">
            <nav aria-label="PSEmine landing sections">
              {[...NAV, { href: '#faq', label: 'FAQ' }].map(n => (
                <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)}>{n.label}</a>
              ))}
            </nav>
            <div className="pse-wrap-x flex flex-col gap-2.5 pt-4">
              <Link to={primaryHref} className="pse-btn pse-btn-primary pse-btn-lg justify-center">
                {primaryLabel} <ArrowRight size={15} />
              </Link>
              <Link to="/mine/login" className="pse-btn pse-btn-outline pse-btn-lg justify-center">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ═══════════ HERO ═══════════ */}
        <section className="pse-land-hero-bg" data-pse-section="hero">
          <div className="pse-wrap-x">
            <div className="pse-land-hero">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatePill state={miningState} label={stateLabel} />
                  <span className="pse-pill">{durationDays}-day campaign</span>
                  <span className="pse-pill">GBP accounting</span>
                </div>

                <h1 className="pse-t-display mt-6">
                  Buy mining capacity.<br />
                  Hold it for {durationDays} days.<br />
                  <span style={{ color: 'var(--pse-blue)' }}>Settle in GBP.</span>
                </h1>

                <p className="pse-t-body pse-limit mt-5">
                  PSEmine is a campaign-based mining product. Buy mining tools with BNB, hold a fixed hourly GBP
                  capacity for the campaign, and let the settlement ledger decide what those operating hours earned.
                  Fixed rates, on-chain verification, server-authoritative accounting.
                </p>

                <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                  <Link to={primaryHref} className="pse-btn pse-btn-primary pse-btn-lg justify-center">
                    Start Mining <ArrowRight size={15} />
                  </Link>
                  <a href="#how-it-works" className="pse-btn pse-btn-outline pse-btn-lg justify-center">
                    How it works
                  </a>
                </div>

                <dl className="pse-land-hero-facts">
                  {[
                    { k: 'Entry price', v: gbp(3) },
                    { k: 'Peak tool capacity', v: gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR) },
                    { k: 'Campaign', v: `${durationDays} days` },
                    { k: 'Network', v: 'BNB Smart Chain' },
                  ].map(f => (
                    <div key={f.k}>
                      <dt className="pse-eyebrow">{f.k}</dt>
                      <dd className="pse-num mt-1.5 text-[15px] font-semibold" style={{ color: 'var(--pse-text)' }}>{f.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* The product, as a product screenshot. */}
              <div className="min-w-0">
                <ConsolePreview
                  counts={NO_HOLDINGS}
                  dayIndex={dayIndex}
                  durationDays={durationDays}
                  state={miningState}
                  stateLabel={stateLabel}
                  activity={NO_ACTIVITY}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS — five-step visual flow ═══════════ */}
        <section id="how-it-works" className="pse-anchor pse-band" data-pse-section="how-it-works">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>01</b> Product flow</p>
                <h2 className="pse-t-sec mt-3">Five steps from wallet to settlement</h2>
                <p className="pse-t-body pse-limit mt-4">
                  No hardware, no hosting, no dynamic pricing. You choose capacity, pay in BNB, keep your tools in
                  cycle, and the campaign settles what those hours earned.
                </p>
              </div>
              <Link to="/mine/guide" className="pse-btn pse-btn-outline pse-btn-sm shrink-0">
                Read the full guide <ArrowUpRight size={13} />
              </Link>
            </div>

            <ol className="pse-flow mt-8">
              {HOW_IT_WORKS.map(s => (
                <li key={s.no} className="pse-flowstep">
                  <div className="pse-flowstep-rail" aria-hidden="true">
                    <span className="pse-step-no is-active">{s.no}</span>
                    <span className="pse-flowstep-line" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="pse-step-no is-active pse-flowstep-inline">{s.no}</span>
                      <p className="pse-t-sub">{s.title}</p>
                    </div>
                    <p className="pse-t-body mt-3" style={{ maxWidth: '46ch' }}>{s.body}</p>
                  </div>
                  <div className="pse-step-visual">{s.visual}</div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══════════ MINING MARKETPLACE ═══════════ */}
        <section id="marketplace" className="pse-anchor pse-band pse-band-alt" data-pse-section="marketplace">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>02</b> Mining marketplace</p>
                <h2 className="pse-t-sec mt-3">Four tiers. One 24-hour operating cycle.</h2>
                <p className="pse-t-body pse-limit mt-4">
                  Each tier is a fixed price and a fixed hourly capacity, additive up to{' '}
                  {gbpHour(PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR)}. Ownership limits per account keep one
                  operator from owning the whole campaign.
                </p>
              </div>
              <Link to={purchaseHref} className="pse-btn pse-btn-outline pse-btn-sm shrink-0">
                Open the marketplace <ArrowUpRight size={13} />
              </Link>
            </div>

            {/* Row 1 — the featured unit, presented large, beside the second tier. */}
            <div className="pse-mkt pse-mkt-feat mt-8">
              <div className="pse-panel">
                <div className="pse-mkt-visual">
                  <span className="pse-tag" style={{ position: 'absolute', top: 14, left: 14 }}>Featured</span>
                  <span className="pse-tag" style={{ position: 'absolute', top: 14, right: 14 }}>Tier 1 of 4</span>
                  <div style={{ maxWidth: 520, width: '100%' }}>
                    <MinerArt tier={1} size={200} className="h-auto w-full" />
                  </div>
                </div>
                <div className="pse-panel-body">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="pse-t-sub">{featured.name}</h3>
                      <p className="pse-tiny mt-1.5">{featured.tagline}</p>
                    </div>
                    <p className="pse-fig-2 shrink-0" style={{ color: 'var(--pse-text)' }}>
                      {gbp(featured.purchasePriceGBP)}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="pse-plate p-3">
                      <p className="pse-tiny">Hourly capacity</p>
                      <p className="pse-num pse-fig-3 mt-1.5" style={{ color: 'var(--pse-blue-ink)' }}>
                        {gbpHour(featured.hourlyRateGBP)}
                      </p>
                    </div>
                    <div className="pse-plate p-3">
                      <p className="pse-tiny">Maximum per account</p>
                      <p className="pse-num pse-fig-3 mt-1.5">{featured.maxPerUser}</p>
                    </div>
                  </div>
                </div>
                <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Capacity held at the ownership limit</span>
                    <span className="pse-spec-v">{gbpHour(featured.hourlyRateGBP * featured.maxPerUser)}</span>
                  </div>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Operating cycle</span>
                    <span className="pse-spec-v">24 hours · free maintenance</span>
                  </div>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Activation</span>
                    <span className="pse-spec-v">After on-chain verification</span>
                  </div>
                </div>
                <div className="pse-panel-body" style={{ paddingTop: 0 }}>
                  <Link
                    to={purchaseHref}
                    className="pse-btn pse-btn-primary pse-btn-lg w-full justify-center"
                    aria-disabled={!purchaseEnabled}
                  >
                    Purchase {featured.name} <ArrowRight size={15} />
                  </Link>
                  <p className="pse-tiny mt-2.5 text-center">
                    {purchaseEnabled
                      ? `Paid in BNB on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME} · ${gbp(featured.purchasePriceGBP)}`
                      : 'Purchases are currently closed for this campaign.'}
                  </p>
                </div>
              </div>

              <div className="pse-panel">
                <div className="pse-mkt-visual" style={{ paddingBlock: 20 }}>
                  <span className="pse-tag" style={{ position: 'absolute', top: 14, right: 14 }}>Tier 2 of 4</span>
                  <div style={{ maxWidth: 300, width: '100%' }}>
                    <MinerArt tier={2} size={140} className="h-auto w-full" />
                  </div>
                </div>
                <div className="pse-panel-body">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="pse-t-sub">{TOOL_BY_ID.builder.name}</h3>
                      <p className="pse-tiny mt-1.5">{TOOL_BY_ID.builder.tagline}</p>
                    </div>
                    <p className="pse-fig-2 shrink-0">{gbp(TOOL_BY_ID.builder.purchasePriceGBP)}</p>
                  </div>
                </div>
                <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Hourly capacity</span>
                    <span className="pse-spec-v" style={{ color: 'var(--pse-blue-ink)' }}>
                      {gbpHour(TOOL_BY_ID.builder.hourlyRateGBP)}
                    </span>
                  </div>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Maximum per account</span>
                    <span className="pse-spec-v">{TOOL_BY_ID.builder.maxPerUser}</span>
                  </div>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Capacity at limit</span>
                    <span className="pse-spec-v">
                      {gbpHour(TOOL_BY_ID.builder.hourlyRateGBP * TOOL_BY_ID.builder.maxPerUser)}
                    </span>
                  </div>
                </div>
                <div className="pse-panel-body" style={{ paddingTop: 0 }}>
                  <Link to={purchaseHref} className="pse-btn pse-btn-outline w-full justify-center">
                    Purchase {TOOL_BY_ID.builder.name}
                  </Link>
                </div>
              </div>
            </div>

            {/* Row 2 — the third tier beside the flagship, which reads larger. */}
            <div className="pse-mkt pse-mkt-flagship mt-4">
              {row2Tiers.map(id => {
                const t = TOOL_BY_ID[id];
                return (
                  <div key={id} className="pse-panel">
                    <div className="pse-mkt-visual" style={{ paddingBlock: 20 }}>
                      <span className="pse-tag" style={{ position: 'absolute', top: 14, right: 14 }}>
                        Tier {t.tier} of 4
                      </span>
                      <div style={{ maxWidth: 300, width: '100%' }}>
                        <MinerArt tier={(TOOL_BY_ID[id].tier || 1) as 1 | 2 | 3 | 4} size={140} className="h-auto w-full" />
                      </div>
                    </div>
                    <div className="pse-panel-body">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="pse-t-sub">{t.name}</h3>
                          <p className="pse-tiny mt-1.5">{t.tagline}</p>
                        </div>
                        <p className="pse-fig-2 shrink-0">{gbp(t.purchasePriceGBP)}</p>
                      </div>
                    </div>
                    <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
                      <div className="pse-spec">
                        <span className="pse-spec-k">Hourly capacity</span>
                        <span className="pse-spec-v" style={{ color: 'var(--pse-purple-ink)' }}>
                          {gbpHour(t.hourlyRateGBP)}
                        </span>
                      </div>
                      <div className="pse-spec">
                        <span className="pse-spec-k">Maximum per account</span>
                        <span className="pse-spec-v">{t.maxPerUser}</span>
                      </div>
                      <div className="pse-spec">
                        <span className="pse-spec-k">Capacity at limit</span>
                        <span className="pse-spec-v">{gbpHour(t.hourlyRateGBP * t.maxPerUser)}</span>
                      </div>
                    </div>
                    <div className="pse-panel-body" style={{ paddingTop: 0 }}>
                      <Link to={purchaseHref} className="pse-btn pse-btn-outline w-full justify-center">
                        Purchase {t.name}
                      </Link>
                    </div>
                  </div>
                );
              })}

              {/* Flagship presentation: bigger object, denser specification. */}
              <div className="pse-panel pse-panel-flagship">
                <div className="pse-mkt-visual pse-mkt-visual-flagship">
                  <span className="pse-tag pse-tag-flagship" style={{ position: 'absolute', top: 14, left: 14 }}>
                    Flagship
                  </span>
                  <span className="pse-tag" style={{ position: 'absolute', top: 14, right: 14 }}>Tier 4 of 4</span>
                  <div style={{ maxWidth: 460, width: '100%' }}>
                    <MinerArt tier={4} size={200} className="h-auto w-full" />
                  </div>
                </div>
                <div className="pse-panel-body">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="pse-t-sec" style={{ fontSize: 'clamp(20px, 2.4vw, 26px)' }}>{flagship.name}</h3>
                      <p className="pse-t-small mt-2">{flagship.tagline}</p>
                    </div>
                    <p className="pse-fig-1 shrink-0">{gbp(flagship.purchasePriceGBP)}</p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="pse-plate p-3">
                      <p className="pse-tiny">Hourly capacity</p>
                      <p className="pse-num pse-fig-3 mt-1.5" style={{ color: 'var(--pse-cyan-ink)' }}>
                        {gbpHour(flagship.hourlyRateGBP)}
                      </p>
                    </div>
                    <div className="pse-plate p-3">
                      <p className="pse-tiny">Maximum per account</p>
                      <p className="pse-num pse-fig-3 mt-1.5">{flagship.maxPerUser}</p>
                    </div>
                    <div className="pse-plate p-3">
                      <p className="pse-tiny">Capacity at limit</p>
                      <p className="pse-num pse-fig-3 mt-1.5" style={{ color: 'var(--pse-text-2)' }}>
                        {gbpHour(flagship.hourlyRateGBP * flagship.maxPerUser)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="pse-specs border-t" style={{ borderColor: 'var(--pse-edge)' }}>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Share of maximum tool capacity</span>
                    <span className="pse-spec-v">
                      {Math.round(
                        ((flagship.hourlyRateGBP * flagship.maxPerUser)
                          / PSEMINE_CONSTANTS.MAX_TOOL_CAPACITY_GBP_PER_HOUR) * 100,
                      )}%
                    </span>
                  </div>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Operating cycle</span>
                    <span className="pse-spec-v">24 hours · free maintenance</span>
                  </div>
                  <div className="pse-spec">
                    <span className="pse-spec-k">Activation</span>
                    <span className="pse-spec-v">After on-chain verification</span>
                  </div>
                </div>
                <div className="pse-panel-body" style={{ paddingTop: 0 }}>
                  <Link
                    to={purchaseHref}
                    className="pse-btn pse-btn-primary pse-btn-lg w-full justify-center"
                    aria-disabled={!purchaseEnabled}
                  >
                    Purchase {flagship.name} <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ COMPARISON — price against capacity, with the product ═══════════ */}
        <section id="comparison" className="pse-anchor pse-band" data-pse-section="comparison">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>03</b> Comparison</p>
                <h2 className="pse-t-sec mt-3">What you buy, and what capacity it holds</h2>
                <p className="pse-t-body pse-limit mt-4">
                  Each tier drawn at a comparable scale, with its price and its hourly capacity on the same axis. The
                  tool is the product; the bars are what the campaign pays for it.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="pse-tiny flex items-center gap-2">
                  <span className="pse-bar" style={{ width: 26 }} aria-hidden="true">
                    <span className="pse-bar-fill pse-bar-fill-neutral" style={{ width: '100%', display: 'block' }} />
                  </span>
                  Price
                </span>
                <span className="pse-tiny flex items-center gap-2">
                  <span className="pse-bar" style={{ width: 26 }} aria-hidden="true">
                    <span className="pse-bar-fill" style={{ width: '100%', display: 'block' }} />
                  </span>
                  Capacity / hour
                </span>
              </div>
            </div>

            <div className="mt-8">
              <ToolComparison />
            </div>
          </div>
        </section>

        {/* ═══════════ CAPACITY SYSTEM ═══════════ */}
        <section id="capacity" className="pse-anchor pse-band pse-band-alt" data-pse-section="capacity">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>04</b> Capacity system</p>
                <h2 className="pse-t-sec mt-3">Your hourly rate is the sum of exactly two things</h2>
                <p className="pse-t-body pse-limit mt-4">
                  Tool capacity plus qualified referral capacity. The backend computes every figure; the app only
                  displays what the server reports.
                </p>
              </div>
            </div>

            <div className="pse-cap mt-8">
              <CapacityBuilder />

              <div className="pse-panel">
                <div className="pse-panel-head">
                  <p className="pse-eyebrow">How capacity is built</p>
                  <span className="pse-tiny">Tools → capacity → accrual</span>
                </div>
                <div>
                  {CAPACITY_FLOW.map((row, i) => (
                    <div key={row.label} className="pse-flow-row">
                      <span className="pse-step-no">{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <p className="pse-t-small font-semibold" style={{ color: 'var(--pse-text)' }}>{row.label}</p>
                        <p className="pse-tiny mt-1">{row.note}</p>
                      </div>
                      <span className="pse-num pse-t-small shrink-0 font-semibold" style={{ color: 'var(--pse-cyan-ink)' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Designed empty state: the landing has no personal capacity. */}
                <div className="pse-panel-foot">
                  <div className="flex items-start gap-3">
                    <span className="pse-empty-mark" style={{ width: 26, height: 26 }} aria-hidden="true">
                      <Lock size={12} />
                    </span>
                    <p className="pse-tiny">
                      Your own capacity appears here only after you own a tool: the console shows your registered
                      capacity, the operating state of every tool, and the accrual the ledger has written. This page
                      explains the model — it never shows a number you have not earned.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ REFERRAL SYSTEM ═══════════ */}
        <section id="referrals" className="pse-anchor pse-band" data-pse-section="referrals">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>05</b> Referral system</p>
                <h2 className="pse-t-sec mt-3">Referrals pay capacity, not bonuses in cash</h2>
                <p className="pse-t-body pse-limit mt-4">
                  A referral qualifies through five verifiable stages. Each qualified referral adds a fixed hourly rate
                  to your mining capacity for the rest of the campaign.
                </p>
              </div>
            </div>

            <div className="pse-cap mt-8">
              <ReferralProgression qualified={0} />
              <div className="pse-panel">
                <div className="pse-panel-head">
                  <p className="pse-eyebrow">What a referral must do</p>
                  <span className="pse-tiny">Verified on the backend</span>
                </div>
                <div className="pse-specs">
                  {[
                    { k: 'Registered with your referral', v: 'Stage 1' },
                    { k: 'Connected a BNB Smart Chain wallet', v: 'Stage 2' },
                    { k: 'Purchased a mining tool', v: 'Stage 3' },
                    { k: 'Mining active on their account', v: 'Stage 4' },
                    { k: 'Qualified — capacity added', v: 'Stage 5' },
                  ].map(s => (
                    <div key={s.k} className="pse-spec">
                      <span className="pse-spec-k flex items-center gap-2.5">
                        <Check size={13} style={{ color: 'var(--pse-success)' }} />
                        {s.k}
                      </span>
                      <span className="pse-spec-v" style={{ color: 'var(--pse-text-2)' }}>{s.v}</span>
                    </div>
                  ))}
                  <div className="pse-spec" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="pse-spec-k font-semibold" style={{ color: 'var(--pse-text)' }}>
                      Maximum referral capacity
                    </span>
                    <span className="pse-spec-v" style={{ color: 'var(--pse-purple-ink)' }}>
                      +{gbpHour(PSEMINE_CONSTANTS.MAX_REFERRAL_CAPACITY_GBP_PER_HOUR)}
                    </span>
                  </div>
                </div>
                <div className="pse-panel-body">
                  <p className="pse-tiny">
                    Qualification is decided by a single auditable backend path with anti-abuse checks, applies from
                    the qualification moment forward, and is capped at{' '}
                    {PSEMINE_CONSTANTS.MAX_QUALIFIED_REFERRALS} referrals per account.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ CAMPAIGN LIFECYCLE ═══════════ */}
        <section id="campaign" className="pse-anchor pse-band pse-band-alt" data-pse-section="campaign">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>06</b> Campaign lifecycle</p>
                <h2 className="pse-t-sec mt-3">One {durationDays}-day arc: launch to closed</h2>
                <p className="pse-t-body pse-limit mt-4">
                  The phase you are in is always visible in the console, derived from backend campaign state — not from
                  a browser clock.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <CampaignLifecycle
                campaign={campaign}
                dayIndex={realDay}
                state={miningState}
                stateLabel={stateLabel}
              />
              {realDay === null && (
                <p className="pse-tiny">
                  No campaign window has been opened by the backend yet, so this panel shows the campaign exactly as
                  the console would: not started, no day counted. The console preview at the top of this page shows
                  that same starting state — no tools held, £0.00/hour of capacity and £0.00 accrued — not an
                  illustration of earnings.
                </p>
              )}
              <MiningStates />
            </div>
          </div>
        </section>

        {/* ═══════════ WALLET & PAYOUT ═══════════ */}
        <section id="wallet" className="pse-anchor pse-band" data-pse-section="wallet">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>07</b> Wallet &amp; payout</p>
                <h2 className="pse-t-sec mt-3">Quoted in GBP, paid in BNB, locked until settlement</h2>
                <p className="pse-t-body pse-limit mt-4">
                  The campaign keeps GBP accounting and BNB settlement strictly apart: a balance you have accrued is
                  not a balance you can withdraw before the ledger is finalised.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <WalletZones
                accruedGBP={0}
                capacityGBPPerHour={0}
                payoutWallet={null}
                connectedWallet={null}
              />
            </div>

            <div className="pse-panel mt-4">
              <div className="pse-panel-head">
                <p className="pse-eyebrow">Purchase &amp; payout path</p>
                <span className="pse-tiny">Nothing here is estimated by the browser</span>
              </div>
              <div className="pse-grid pse-grid-4 pse-panel-body">
                {[
                  { n: '01', t: 'Quote', d: `The fixed GBP price is converted to an exact BNB amount and bound to your account for ${PSEMINE_CONSTANTS.QUOTE_EXPIRATION_MINUTES} minutes.` },
                  { n: '02', t: 'Send', d: `You send exactly that amount to the campaign wallet on ${PSEMINE_CONSTANTS.PAYMENT_NETWORK_NAME}.` },
                  { n: '03', t: 'Verify', d: 'Sender, recipient, amount and confirmation depth are checked against the quote before the tool activates.' },
                  { n: '04', t: 'Accrue', d: 'The activated tool accrues hourly. Accrual stops at day ' + durationDays + ' and the ledger is finalised.' },
                ].map(s => (
                  <div key={s.n} className="pse-plate p-4">
                    <span className="pse-step-no">{s.n}</span>
                    <p className="pse-t-sub mt-3">{s.t}</p>
                    <p className="pse-tiny mt-2">{s.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ SECURITY & TRANSPARENCY ═══════════ */}
        <section id="security" className="pse-anchor pse-band pse-band-alt" data-pse-section="security">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>08</b> Security &amp; transparency</p>
                <h2 className="pse-t-sec mt-3">The browser displays state. The backend owns it.</h2>
                <p className="pse-t-body pse-limit mt-4">
                  Every value that matters — price, payment verification, capacity, accrual, qualification — is
                  decided server-side. The app is a window onto that state, not a participant in it.
                </p>
              </div>
              <Link to="/mine/guide" className="pse-btn pse-btn-outline pse-btn-sm shrink-0">
                <ShieldCheck size={13} /> Full campaign guide
              </Link>
            </div>

            <div className="pse-grid pse-grid-3 mt-8">
              {SECURITY_ITEMS.map(item => (
                <div key={item.t} className="pse-panel">
                  <div className="pse-panel-body">
                    <p className="pse-t-sub flex items-start gap-2.5">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--pse-success)' }} />
                      {item.t}
                    </p>
                    <p className="pse-tiny mt-2.5">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section id="faq" className="pse-anchor pse-band" data-pse-section="faq">
          <div className="pse-wrap-x">
            <div className="pse-sec-head">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>09</b> Questions</p>
                <h2 className="pse-t-sec mt-3">What operators ask before their first purchase</h2>
              </div>
            </div>

            <div className="pse-faq mt-6" style={{ maxWidth: 860 }}>
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className="pse-faq-item">
                    <button
                      type="button"
                      className="pse-faq-q"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : i)}
                    >
                      <span>{f.q}</span>
                      <ChevronDown
                        size={16}
                        className="shrink-0 transition-transform"
                        style={{ color: 'var(--pse-text-3)', transform: open ? 'rotate(180deg)' : undefined }}
                      />
                    </button>
                    {open && <p className="pse-t-body pse-limit-s pse-faq-a">{f.a}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════ FINAL CTA ═══════════ */}
        <section className="pse-land-cta" data-pse-section="cta">
          <div className="pse-wrap-x pse-band">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="min-w-0">
                <p className="pse-sec-no"><b>10</b> Start</p>
                <h2 className="pse-t-sec mt-3">
                  The campaign runs for {durationDays} days. Capacity accrues every operating hour.
                </h2>
                <p className="pse-t-body pse-limit mt-4">
                  {purchaseEnabled
                    ? 'Buy a tool, keep it in cycle, and let the campaign settle your earnings at the end.'
                    : 'Purchases are currently closed. The guide explains the campaign while you wait.'}
                </p>
                <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                  <Link to={primaryHref} className="pse-btn pse-btn-primary pse-btn-lg justify-center">
                    Start Mining <ArrowRight size={15} />
                  </Link>
                  <a href="#how-it-works" className="pse-btn pse-btn-outline pse-btn-lg justify-center">
                    How it works
                  </a>
                </div>
              </div>

              {/* The four tiers as an object row — the product, one last time. */}
              <div className="pse-panel">
                <div className="pse-panel-head">
                  <p className="pse-eyebrow">The four tiers</p>
                  <span className="pse-tiny">At a glance</span>
                </div>
                <div className="pse-specs">
                  {TOOLS.map(t => (
                    <div key={t.id} className="pse-spec">
                      <span className="pse-spec-k flex items-center gap-2.5">
                        <span className="pse-tier" aria-hidden="true">{t.tier}</span>
                        {t.name}
                      </span>
                      <span className="pse-spec-v flex items-center gap-3">
                        <span className="pse-num" style={{ color: 'var(--pse-blue-ink)' }}>
                          {gbpHour(t.hourlyRateGBP)}
                        </span>
                        <span className="pse-num" style={{ color: 'var(--pse-text)' }}>{gbp(t.purchasePriceGBP)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════ Footer — the landing's own ═══════════ */}
      <footer className="pse-land-foot" data-pse-section="footer">
        <div className="pse-wrap-x">
          <div className="pse-land-foot-cols">
            <div>
              <div className="pse-land-brand">
                <PSELogo size={26} />
                <span className="pse-land-brand-name">PSEMine</span>
              </div>
              <p className="pse-tiny mt-3" style={{ maxWidth: '34ch' }}>
                A {durationDays}-day campaign-based mining product with GBP accounting, BNB settlement and
                server-authoritative accrual.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="pse-net"><span className="pse-net-mark" aria-hidden="true" />BNB Smart Chain</span>
                <span className="pse-pill">GBP campaign</span>
              </div>
            </div>

            <div>
              <p className="pse-eyebrow">Product</p>
              <div className="pse-foot-list mt-3.5">
                <a href="#how-it-works">How it works</a>
                <a href="#marketplace">Mining tools</a>
                <a href="#capacity">Capacity system</a>
                <a href="#campaign">Campaign lifecycle</a>
              </div>
            </div>

            <div>
              <p className="pse-eyebrow">Account</p>
              <div className="pse-foot-list mt-3.5">
                <Link to="/mine/signup">Create an account</Link>
                <Link to="/mine/login">Sign in</Link>
                <Link to="/mine/dashboard">Console dashboard</Link>
                <Link to="/mine/wallet">Wallet &amp; payouts</Link>
              </div>
            </div>

            <div>
              <p className="pse-eyebrow">Resources</p>
              <div className="pse-foot-list mt-3.5">
                <Link to="/mine/guide">Campaign guide</Link>
                <a href="#faq">FAQ</a>
                <Link to="/help">Support</Link>
                <Link to="/verification-policy">Verification policy</Link>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t pt-5" style={{ borderColor: 'var(--pse-edge)' }}>
            <p className="pse-tiny">
              No user statistics, campaign totals, earnings, purchases, referrals or payouts are displayed on this
              page. Every figure is either a fixed campaign parameter from the product's own economics, or — in the
              single labelled console preview at the top — a documented example used to illustrate the interface.
            </p>
            <p className="pse-tiny mt-3">
              PSEmine shares a sign-in identity with PulseEarn and nothing else: points, tasks and rewards do not apply
              to this campaign.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PSEMineLanding;
